-- ============================================================================
-- Airbnb Management Platform — Initial Schema
-- ============================================================================

-- Extensions
create extension if not exists "pgcrypto";

-- ============================================================================
-- TABLES
-- ============================================================================

-- properties
create table properties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  base_price_ars numeric(12,2),
  cleaning_fee_ars numeric(12,2) default 0,
  color_hex text default '#A47148',
  active boolean default true,
  created_at timestamptz default now()
);

-- guests
create table guests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  country text,
  notes text,
  created_at timestamptz default now()
);

-- reservations
create table reservations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete restrict,
  guest_id uuid references guests(id) on delete set null,
  check_in date not null,
  check_out date not null,
  num_guests int not null default 1,
  total_amount_ars numeric(12,2) not null default 0,
  amount_paid_ars numeric(12,2) not null default 0,
  source text check (source in ('airbnb','booking','direct','other')) default 'airbnb',
  platform_fee_ars numeric(12,2) default 0,
  cleaning_fee_ars numeric(12,2) default 0,
  status text check (status in ('confirmed','pending','cancelled','completed')) default 'confirmed',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint check_dates check (check_out > check_in)
);

alter table reservations
  add column nights int generated always as (check_out - check_in) stored;

-- expenses
create table expenses (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  date date not null,
  category text check (category in ('cleaning','maintenance','utilities','supplies','tax','other')) not null,
  amount_ars numeric(12,2) not null,
  description text,
  created_at timestamptz default now()
);

-- exchange_rates
create table exchange_rates (
  id uuid primary key default gen_random_uuid(),
  ars_per_usd numeric(12,4) not null,
  ars_per_eur numeric(12,4) not null,
  updated_at timestamptz default now()
);

-- user_roles
create table user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text check (role in ('admin','caretaker')) not null,
  display_name text
);

-- ============================================================================
-- INDEXES
-- ============================================================================
create index idx_reservations_property on reservations(property_id);
create index idx_reservations_dates on reservations(check_in, check_out);
create index idx_reservations_status on reservations(status);
create index idx_expenses_date on expenses(date);
create index idx_expenses_property on expenses(property_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger reservations_updated_at
  before update on reservations
  for each row execute function set_updated_at();

-- Conflict prevention at DB level (no overlap on same property for active reservations)
create or replace function check_reservation_overlap()
returns trigger as $$
begin
  if new.status in ('cancelled') then
    return new;
  end if;
  if exists (
    select 1 from reservations r
    where r.property_id = new.property_id
      and r.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
      and r.status <> 'cancelled'
      and daterange(r.check_in, r.check_out, '[)') && daterange(new.check_in, new.check_out, '[)')
  ) then
    raise exception 'Conflicto de fechas: ya existe una reserva activa en esta propiedad para el rango indicado';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger reservations_no_overlap
  before insert or update on reservations
  for each row execute function check_reservation_overlap();

-- ============================================================================
-- HELPER FUNCTION: get role for a user
-- ============================================================================
create or replace function public.current_user_role()
returns text
language sql
security definer
stable
as $$
  select role from public.user_roles where user_id = auth.uid();
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table properties enable row level security;
alter table guests enable row level security;
alter table reservations enable row level security;
alter table expenses enable row level security;
alter table exchange_rates enable row level security;
alter table user_roles enable row level security;

-- Admin: full access on every table
create policy "admin_all_properties" on properties
  for all using (current_user_role() = 'admin') with check (current_user_role() = 'admin');

create policy "admin_all_guests" on guests
  for all using (current_user_role() = 'admin') with check (current_user_role() = 'admin');

create policy "admin_all_reservations" on reservations
  for all using (current_user_role() = 'admin') with check (current_user_role() = 'admin');

create policy "admin_all_expenses" on expenses
  for all using (current_user_role() = 'admin') with check (current_user_role() = 'admin');

create policy "admin_all_exchange_rates" on exchange_rates
  for all using (current_user_role() = 'admin') with check (current_user_role() = 'admin');

create policy "admin_all_user_roles" on user_roles
  for all using (current_user_role() = 'admin') with check (current_user_role() = 'admin');

-- Caretaker: read-only, restricted columns are filtered at the view level
create policy "caretaker_read_properties" on properties
  for select using (current_user_role() = 'caretaker');

create policy "caretaker_read_guests" on guests
  for select using (current_user_role() = 'caretaker');

create policy "caretaker_read_reservations" on reservations
  for select using (
    current_user_role() = 'caretaker'
    and check_out >= (current_date - interval '7 days')
    and status <> 'cancelled'
  );

-- Self-read of role
create policy "self_read_role" on user_roles
  for select using (user_id = auth.uid());

-- ============================================================================
-- CARETAKER VIEW (financial-data-free projection)
-- ============================================================================
create or replace view caretaker_agenda as
select
  r.id,
  r.check_in,
  r.check_out,
  r.num_guests,
  r.notes,
  p.name as property_name,
  p.address as property_address,
  p.color_hex as property_color,
  g.name as guest_name,
  g.phone as guest_phone
from reservations r
join properties p on p.id = r.property_id
left join guests g on g.id = r.guest_id
where r.status <> 'cancelled'
  and r.check_out >= (current_date - interval '1 day');

grant select on caretaker_agenda to authenticated;
