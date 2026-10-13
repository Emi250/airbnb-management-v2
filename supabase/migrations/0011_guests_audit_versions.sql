begin;

alter table public.guests add column version bigint not null default 1;
alter table public.guests add column merged_into uuid references public.guests(id) on delete restrict;
alter table public.guests add column merged_at timestamptz;
alter table public.reservations add column version bigint not null default 1;
create index idx_guests_merged_into on public.guests(merged_into);
create index if not exists idx_reservations_guest_id on public.reservations(guest_id);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  actor_id uuid,
  actor_name text not null,
  occurred_at timestamptz not null default clock_timestamp(),
  before_data jsonb,
  after_data jsonb
);
create index idx_audit_entity_time on public.audit_events(entity_type, entity_id, occurred_at desc);
alter table public.audit_events enable row level security;
create policy admin_read_audit on public.audit_events for select
  using (public.current_user_role() = 'admin');

create function public.bump_business_version() returns trigger
language plpgsql set search_path = public as $$
begin
  -- Las columnas generadas aún no están calculadas en BEFORE UPDATE.
  if (to_jsonb(new) - array['version','updated_at','notion_page_id','checkin_reminder_sent_at','nights'])
     is distinct from
     (to_jsonb(old) - array['version','updated_at','notion_page_id','checkin_reminder_sent_at','nights']) then
    new.version := old.version + 1;
  else
    new.version := old.version;
  end if;
  return new;
end;
$$;
create trigger guests_business_version before update on public.guests
  for each row execute function public.bump_business_version();
create trigger reservations_business_version before update on public.reservations
  for each row execute function public.bump_business_version();

create function public.record_business_audit() returns trigger
language plpgsql security definer set search_path = public as $$
declare b jsonb; a jsonb; actor text;
begin
  if tg_op <> 'INSERT' then b := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then a := to_jsonb(new); end if;
  if tg_op = 'UPDATE' and (a - array['updated_at','notion_page_id','checkin_reminder_sent_at'])
    is not distinct from (b - array['updated_at','notion_page_id','checkin_reminder_sent_at']) then
    return new;
  end if;
  select coalesce(nullif(display_name,''),role) into actor from public.user_roles where user_id=auth.uid();
  insert into public.audit_events(entity_type,entity_id,action,actor_id,actor_name,before_data,after_data)
    values(tg_table_name,coalesce((a->>'id')::uuid,(b->>'id')::uuid),lower(tg_op),auth.uid(),
      coalesce(actor,'Proceso automático'),b,a);
  return coalesce(new,old);
end;
$$;
revoke all on function public.record_business_audit() from public;
create trigger guests_audit after insert or update or delete on public.guests
  for each row execute function public.record_business_audit();
create trigger reservations_audit after insert or update or delete on public.reservations
  for each row execute function public.record_business_audit();
create trigger expenses_audit after insert or update or delete on public.expenses
  for each row execute function public.record_business_audit();

create function public.update_guest(p_id uuid,p_version bigint,p_input jsonb) returns void
language plpgsql security invoker set search_path = public as $$
declare g public.guests;
begin
  if public.current_user_role() is distinct from 'admin' then raise exception 'Acceso restringido'; end if;
  select * into g from public.guests where id=p_id for update;
  if not found or g.merged_into is not null then raise exception 'Huésped no disponible'; end if;
  if p_version is distinct from g.version then raise exception 'La ficha cambió. Recargá la página antes de guardar.'; end if;
  if nullif(btrim(p_input->>'name'),'') is null then raise exception 'Nombre requerido'; end if;
  update public.guests set name=btrim(p_input->>'name'),phone=nullif(btrim(p_input->>'phone'),''),
    email=nullif(btrim(p_input->>'email'),''),country=nullif(btrim(p_input->>'country'),''),
    notes=nullif(btrim(p_input->>'notes'),'') where id=p_id;
end;
$$;

create function public.merge_guests(p_source uuid,p_target uuid,p_source_version bigint,p_target_version bigint)
returns uuid language plpgsql security invoker set search_path = public as $$
declare s public.guests; t public.guests;
begin
  if public.current_user_role() is distinct from 'admin' then raise exception 'Acceso restringido'; end if;
  if p_source = p_target then raise exception 'Seleccione dos fichas distintas'; end if;
  perform id from public.guests where id in (p_source,p_target) order by id for update;
  select * into s from public.guests where id=p_source;
  select * into t from public.guests where id=p_target;
  if s.id is null or t.id is null or s.merged_into is not null or t.merged_into is not null then
    raise exception 'Una de las fichas ya no está disponible';
  end if;
  if s.version is distinct from p_source_version or t.version is distinct from p_target_version then
    raise exception 'Una ficha cambió. Recargá la página antes de unificar.';
  end if;
  update public.guests set phone=coalesce(nullif(t.phone,''),s.phone),email=coalesce(nullif(t.email,''),s.email),
    country=coalesce(nullif(t.country,''),s.country),
    notes=nullif(concat_ws(E'\n\n',nullif(t.notes,''),case when nullif(s.notes,'') is not null
      then 'Notas de ' || s.name || ': ' || s.notes end),'') where id=p_target;
  update public.reservations set guest_id=p_target where guest_id=p_source;
  update public.guests set merged_into=p_target,merged_at=clock_timestamp() where id=p_source;
  return p_target;
end;
$$;

commit;
