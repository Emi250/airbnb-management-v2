-- Integridad operativa. No modifica políticas RLS ni roles.
-- Si hay reservas superpuestas existentes, la restricción falla y toda la
-- migración se revierte: resolver esos casos explícitamente antes de reintentar.
begin;

create extension if not exists btree_gist;

alter table public.reservations add constraint reservations_no_overlap_excl
  exclude using gist (
    property_id with =,
    daterange(check_in, check_out, '[)') with &&
  ) where (status <> 'cancelled');

drop trigger reservations_no_overlap on public.reservations;
drop function public.check_reservation_overlap();

-- NOT VALID permite conservar datos históricos inválidos para revisión, pero
-- impide guardar nuevos valores inválidos o volver a guardarlos en una edición.
alter table public.exchange_rates add constraint exchange_rates_positive
  check (ars_per_usd > 0 and ars_per_eur > 0
    and ars_per_usd <> 'NaN'::numeric and ars_per_eur <> 'NaN'::numeric) not valid;

-- La marca de pago no puede sobrevivir al borrado de su movimiento.
alter table public.fixed_expense_checks drop constraint fixed_expense_checks_expense_id_fkey;
alter table public.fixed_expense_checks add constraint fixed_expense_checks_expense_id_fkey
  foreign key (expense_id) references public.expenses(id) on delete cascade;
-- Marcas sin movimiento ya no representan un pago registrado.
delete from public.fixed_expense_checks where expense_id is null;

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
  end if;
  select * into prop from public.properties where id = v.property_id for share;
  if not found then raise exception 'Propiedad no encontrada'; end if;
  if not prop.active and (p_id is null or old_row.property_id is distinct from v.property_id) then
    raise exception 'La propiedad está inactiva';
  end if;
  v.bed_setup := case when prop.has_split_beds then coalesce(v.bed_setup, 'together') else null end;
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
      v.total_amount_ars, v.amount_paid_ars, v.source, v.platform_fee_ars, v.cleaning_fee_ars,
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
  return saved_id;
end;
$$;

create or replace function public.mark_fixed_paid(p_item_id uuid, p_period date, p_amount numeric, p_property_id uuid)
returns void language plpgsql security invoker set search_path = public as $$
declare
  item public.fixed_expense_items;
  expense_id uuid;
begin
  select * into item from public.fixed_expense_items where id = p_item_id and active for update;
  if not found then raise exception 'Ítem no encontrado'; end if;
  if p_period is null or extract(day from p_period) <> 1 then raise exception 'Período inválido'; end if;
  if p_amount is null or p_amount <= 0 or p_amount = 'NaN'::numeric then raise exception 'Importe inválido'; end if;
  if exists(select 1 from public.fixed_expense_checks where item_id = p_item_id and period = p_period) then
    raise exception 'Ya está marcado como pagado este mes';
  end if;
  insert into public.expenses(property_id, date, category, amount_ars, description)
    values (p_property_id, p_period, 'fixed', p_amount, item.label) returning id into expense_id;
  insert into public.fixed_expense_checks(item_id, period, expense_id) values (p_item_id, p_period, expense_id);
end;
$$;

create or replace function public.unmark_fixed_paid(p_item_id uuid, p_period date)
returns void language plpgsql security invoker set search_path = public as $$
declare
  payment public.fixed_expense_checks;
begin
  perform 1 from public.fixed_expense_items where id = p_item_id for update;
  select * into payment from public.fixed_expense_checks where item_id = p_item_id and period = p_period for update;
  if not found then return; end if;
  if payment.expense_id is not null then
    delete from public.expenses where id = payment.expense_id;
    if not found then raise exception 'No se pudo eliminar el gasto'; end if;
  else
    delete from public.fixed_expense_checks where id = payment.id;
  end if;
end;
$$;

-- Se añade solo información operativa, conservando la definición de acceso actual.
create or replace view public.caretaker_agenda as
select r.id, r.check_in, r.check_out, r.num_guests, r.notes,
  p.name as property_name, p.address as property_address, p.color_hex as property_color,
  g.name as guest_name, g.phone as guest_phone, r.bed_setup
from public.reservations r
join public.properties p on p.id = r.property_id
left join public.guests g on g.id = r.guest_id
where r.status <> 'cancelled' and r.check_out >= (current_date - interval '1 day');

commit;
