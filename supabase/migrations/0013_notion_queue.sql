begin;
create table public.notion_sync_jobs (
  reservation_id uuid primary key references public.reservations(id) on delete cascade,
  generation bigint not null default 1,
  state text not null default 'pending' check(state in ('pending','processing','synced','error','review_required')),
  attempts integer not null default 0,
  last_error text,
  last_attempt_at timestamptz,
  synced_at timestamptz,
  next_attempt_at timestamptz not null default now(),
  lock_token uuid,
  locked_at timestamptz,
  create_started boolean not null default false
);
alter table public.notion_sync_jobs enable row level security;
create policy admin_manage_notion_jobs on public.notion_sync_jobs for all
  using(public.current_user_role()='admin') with check(public.current_user_role()='admin');
create index idx_notion_jobs_due on public.notion_sync_jobs(state,next_attempt_at);
-- Las reservas anteriores sin vínculo pueden tener una página creada cuya respuesta se perdió.
-- Se revisan antes de crear otra; las reservas nuevas entran pendientes mediante el trigger.
insert into public.notion_sync_jobs(reservation_id,state,create_started,last_error)
  select id,case when notion_page_id is not null or status='cancelled' then 'synced' else 'review_required' end,
    notion_page_id is null and status<>'cancelled',
    case when notion_page_id is null and status<>'cancelled' then 'Reserva anterior sin vínculo: revisar el calendario y la papelera de Notion antes de crear una página.' end
  from public.reservations;

create function public.enqueue_reservation_sync() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if tg_op='UPDATE' and (to_jsonb(new)-array['version','updated_at','notion_page_id','checkin_reminder_sent_at'])
    is not distinct from (to_jsonb(old)-array['version','updated_at','notion_page_id','checkin_reminder_sent_at']) then return new; end if;
  insert into public.notion_sync_jobs(reservation_id) values(new.id)
  on conflict(reservation_id) do update set generation=notion_sync_jobs.generation+1,
    state=case when notion_sync_jobs.state='processing' then 'processing'
      when notion_sync_jobs.create_started and new.notion_page_id is null then 'review_required' else 'pending' end,
    next_attempt_at=now();
  return new;
end;
$$;
revoke all on function public.enqueue_reservation_sync() from public;
create trigger reservations_sync_queue after insert or update on public.reservations
  for each row execute function public.enqueue_reservation_sync();

create function public.enqueue_guest_sync() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if new.name is not distinct from old.name and new.phone is not distinct from old.phone then return new; end if;
  insert into public.notion_sync_jobs(reservation_id) select id from public.reservations where guest_id=new.id
  on conflict(reservation_id) do update set generation=notion_sync_jobs.generation+1,
    state=case when notion_sync_jobs.state='processing' then 'processing'
      when notion_sync_jobs.create_started then 'review_required' else 'pending' end,next_attempt_at=now();
  return new;
end;
$$;
revoke all on function public.enqueue_guest_sync() from public;
create trigger guests_sync_queue after update on public.guests for each row execute function public.enqueue_guest_sync();

create function public.claim_notion_sync(p_id uuid,p_force boolean default false) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare j public.notion_sync_jobs;
begin
  select * into j from public.notion_sync_jobs where reservation_id=p_id for update skip locked;
  if not found or (j.state='synced' and not p_force) then return null; end if;
  if j.state='processing' and j.locked_at>now()-interval '2 minutes' then return null; end if;
  if not p_force and (j.next_attempt_at>now() or j.state='review_required') then return null; end if;
  update public.notion_sync_jobs set state='processing',attempts=attempts+1,last_attempt_at=now(),
    lock_token=gen_random_uuid(),locked_at=now() where reservation_id=p_id returning * into j;
  return to_jsonb(j);
end;
$$;

create function public.begin_notion_create(p_id uuid,p_token uuid) returns boolean
language plpgsql security invoker set search_path=public as $$
begin
  update public.notion_sync_jobs set create_started=true where reservation_id=p_id and lock_token=p_token
    and state='processing' and not create_started;
  return found;
end;
$$;

create function public.finish_notion_sync(p_id uuid,p_token uuid,p_generation bigint,p_state text,p_error text,p_page_id text)
returns boolean language plpgsql security invoker set search_path=public as $$
declare j public.notion_sync_jobs;
begin
  if p_state not in ('synced','error','review_required') then raise exception 'Estado inválido'; end if;
  perform 1 from public.reservations where id=p_id for update;
  select * into j from public.notion_sync_jobs where reservation_id=p_id for update;
  if not found or j.lock_token is distinct from p_token then return false; end if;
  if p_page_id is not null then update public.reservations set notion_page_id=p_page_id where id=p_id; end if;
  update public.notion_sync_jobs set
    state=case when generation<>p_generation and p_state='synced' then 'pending' else p_state end,
    last_error=left(p_error,500),synced_at=case when p_state='synced' then now() else synced_at end,
    next_attempt_at=case when generation<>p_generation then now() else now()+make_interval(mins=>least(360,power(2,least(attempts,8))::int)) end,
    create_started=case when p_page_id is not null then false else create_started end,
    lock_token=null,locked_at=null where reservation_id=p_id;
  return true;
end;
$$;

create function public.reset_notion_creation(p_id uuid) returns void
language plpgsql security invoker set search_path=public as $$
begin
  if public.current_user_role() is distinct from 'admin' then raise exception 'Acceso restringido'; end if;
  update public.notion_sync_jobs set create_started=false,state='pending',next_attempt_at=now(),last_error=null
    where reservation_id=p_id and state='review_required';
  if not found then raise exception 'La sincronización cambió; recargá la página'; end if;
end;
$$;
commit;
