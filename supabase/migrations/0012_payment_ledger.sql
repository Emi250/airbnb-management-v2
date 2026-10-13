begin;

create table public.reservation_payments (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete restrict,
  kind text not null check (kind in ('payment','refund','opening_balance')),
  amount_ars numeric(14,2) not null check (amount_ars > 0 and amount_ars <> 'NaN'::numeric and amount_ars <> 'Infinity'::numeric),
  paid_on date,
  method text not null check (method in ('cash','transfer','card','platform','other','legacy')),
  reference text,
  receipt_url text check (receipt_url is null or receipt_url ~ '^https://'),
  notes text,
  actor_id uuid,
  actor_name text not null,
  created_at timestamptz not null default clock_timestamp(),
  check (kind='opening_balance' or paid_on is not null)
);
create index idx_payments_reservation on public.reservation_payments(reservation_id,created_at);
alter table public.reservation_payments enable row level security;
create policy admin_read_payments on public.reservation_payments for select using (public.current_user_role()='admin');
create policy admin_add_payments on public.reservation_payments for insert with check (public.current_user_role()='admin');

-- No se inventan fecha, medio de cobro ni responsable de los importes históricos.
insert into public.reservation_payments(reservation_id,kind,amount_ars,method,actor_name,notes)
  select id,'opening_balance',amount_paid_ars,'legacy','Migración de saldo previo',
    'Importe acumulado anterior al registro de movimientos; fecha y medio no documentados.'
  from public.reservations where amount_paid_ars>0;

create function public.validate_payment() returns trigger language plpgsql set search_path = public as $$
declare r public.reservations;
begin
  select * into r from public.reservations where id=new.reservation_id for update;
  if not found then raise exception 'Reserva no encontrada'; end if;
  if new.kind='opening_balance' then raise exception 'El saldo previo solo se crea durante la migración'; end if;
  if new.method='legacy' then raise exception 'Seleccione el medio de pago'; end if;
  if new.kind='payment' and r.status='cancelled' then raise exception 'No se pueden cobrar reservas canceladas'; end if;
  if new.kind='payment' and r.amount_paid_ars+new.amount_ars>r.total_amount_ars then raise exception 'El cobro supera el saldo pendiente'; end if;
  if new.kind='refund' and new.amount_ars>r.amount_paid_ars then raise exception 'La devolución supera el importe cobrado'; end if;
  new.actor_id:=auth.uid();
  select coalesce(nullif(display_name,''),role) into new.actor_name from public.user_roles where user_id=auth.uid();
  new.actor_name:=coalesce(new.actor_name,'Proceso automático');
  return new;
end;
$$;
create trigger payments_validate before insert on public.reservation_payments for each row execute function public.validate_payment();

create function public.derive_paid_balance() returns trigger language plpgsql security definer set search_path=public as $$
begin
  update public.reservations set amount_paid_ars=(select coalesce(sum(case when kind='refund' then -amount_ars else amount_ars end),0)
    from public.reservation_payments where reservation_id=new.reservation_id) where id=new.reservation_id;
  return new;
end;
$$;
revoke all on function public.derive_paid_balance() from public;
create trigger payments_balance after insert on public.reservation_payments for each row execute function public.derive_paid_balance();
create trigger payments_audit after insert on public.reservation_payments for each row execute function public.record_business_audit();

create function public.guard_paid_balance() returns trigger language plpgsql set search_path=public as $$
declare ledger numeric;
begin
  select coalesce(sum(case when kind='refund' then -amount_ars else amount_ars end),0) into ledger
    from public.reservation_payments where reservation_id=new.id;
  if new.amount_paid_ars is distinct from ledger then raise exception 'Registre los cobros y devoluciones en Movimientos de pago'; end if;
  if new.total_amount_ars < ledger then raise exception 'El total no puede ser menor al importe cobrado; registre primero la devolución'; end if;
  return new;
end;
$$;
create trigger reservations_paid_balance before insert or update of amount_paid_ars,total_amount_ars on public.reservations
  for each row execute function public.guard_paid_balance();

create function public.record_payment(p_reservation_id uuid,p_version bigint,p_input jsonb) returns uuid
language plpgsql security invoker set search_path=public as $$
declare r public.reservations; existing public.reservation_payments; payment_id uuid := (p_input->>'id')::uuid;
begin
  if public.current_user_role() is distinct from 'admin' then raise exception 'Acceso restringido'; end if;
  if payment_id is null then raise exception 'Identificador de movimiento requerido'; end if;
  select * into r from public.reservations where id=p_reservation_id for update;
  if not found then raise exception 'Reserva no encontrada'; end if;
  select * into existing from public.reservation_payments where id=payment_id;
  if found then
    if existing.reservation_id=p_reservation_id and existing.kind=p_input->>'kind'
      and existing.amount_ars=(p_input->>'amount_ars')::numeric and existing.paid_on=(p_input->>'paid_on')::date
      and existing.method=p_input->>'method' and coalesce(existing.reference,'')=coalesce(p_input->>'reference','')
      and coalesce(existing.receipt_url,'')=coalesce(p_input->>'receipt_url','') and coalesce(existing.notes,'')=coalesce(p_input->>'notes','') then
      return payment_id;
    end if;
    raise exception 'Este identificador ya corresponde a otro movimiento';
  end if;
  if p_version is distinct from r.version then raise exception 'La reserva cambió. Recargá la página antes de registrar el movimiento.'; end if;
  insert into public.reservation_payments(id,reservation_id,kind,amount_ars,paid_on,method,reference,receipt_url,notes,actor_name)
    values(payment_id,p_reservation_id,p_input->>'kind',(p_input->>'amount_ars')::numeric,(p_input->>'paid_on')::date,
      p_input->>'method',nullif(p_input->>'reference',''),nullif(p_input->>'receipt_url',''),nullif(p_input->>'notes',''),'');
  return payment_id;
end;
$$;

create or replace function public.save_reservation(p_id uuid, p_input jsonb)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v public.reservations;
  old_row public.reservations;
  prop public.properties;
  saved_id uuid;
begin
  if public.current_user_role() is distinct from 'admin' then
    raise exception 'Acceso restringido';
  end if;
  v := jsonb_populate_record(null::public.reservations, p_input);
  if p_id is not null then
    select * into old_row from public.reservations where id = p_id for update;
    if not found then raise exception 'Reserva no encontrada'; end if;
    if (p_input->>'expected_version')::bigint is distinct from old_row.version then
      raise exception 'La reserva cambió. Recargá la página antes de guardar.';
    end if;
    if v.amount_paid_ars is distinct from old_row.amount_paid_ars then
      raise exception 'Registre los cobros y devoluciones en Movimientos de pago';
    end if;
  end if;
  select * into prop from public.properties where id = v.property_id for share;
  if not found then raise exception 'Propiedad no encontrada'; end if;
  if not prop.active and (p_id is null or old_row.property_id is distinct from v.property_id) then
    raise exception 'La propiedad está inactiva';
  end if;
  v.bed_setup := case when prop.has_split_beds then coalesce(v.bed_setup, 'together') else null end;
  if v.guest_id is not null then
    perform 1 from public.guests where id=v.guest_id and merged_into is null for share;
    if not found then raise exception 'La ficha del huésped fue unificada. Seleccione la ficha vigente.'; end if;
  end if;
  if v.guest_id is null then
    if nullif(btrim(p_input->>'new_guest_name'), '') is null then
      raise exception 'Seleccione o cree un huésped';
    end if;
    insert into public.guests(name, phone, email, country)
      values (btrim(p_input->>'new_guest_name'), nullif(p_input->>'new_guest_phone', ''),
        nullif(p_input->>'new_guest_email', ''), nullif(p_input->>'new_guest_country', ''))
      returning id into v.guest_id;
  end if;
  if p_id is null then
    insert into public.reservations(property_id, guest_id, check_in, check_out, num_guests,
      total_amount_ars, amount_paid_ars, source, platform_fee_ars, cleaning_fee_ars, status, bed_setup, notes)
    values (v.property_id, v.guest_id, v.check_in, v.check_out, v.num_guests,
      v.total_amount_ars, 0, v.source, v.platform_fee_ars, v.cleaning_fee_ars,
      v.status, v.bed_setup, nullif(v.notes, '')) returning id into saved_id;
  else
    update public.reservations set property_id = v.property_id, guest_id = v.guest_id,
      check_in = v.check_in, check_out = v.check_out, num_guests = v.num_guests,
      total_amount_ars = v.total_amount_ars, amount_paid_ars = v.amount_paid_ars,
      source = v.source, platform_fee_ars = v.platform_fee_ars, cleaning_fee_ars = v.cleaning_fee_ars,
      status = v.status, bed_setup = v.bed_setup, notes = nullif(v.notes, ''),
      checkin_reminder_sent_at = case when check_in is distinct from v.check_in
        then null else checkin_reminder_sent_at end
    where id = p_id returning id into saved_id;
  end if;
  if p_id is null and v.amount_paid_ars>0 then
    insert into public.reservation_payments(reservation_id,kind,amount_ars,paid_on,method,reference,actor_name)
      values(saved_id,'payment',v.amount_paid_ars,coalesce((p_input->>'initial_payment_date')::date,(now() at time zone 'America/Argentina/Cordoba')::date),
        coalesce(nullif(p_input->>'initial_payment_method',''),'other'),nullif(p_input->>'initial_payment_reference',''),'');
  end if;
  return saved_id;
end;
$$;


commit;
