-- ============================================================================
-- Monthly targets — objetivo de ingresos por propiedad y mes
-- ============================================================================
-- Sustenta la lectura "vs. expected" del dashboard rediseñado: cada KPI hero
-- compara el real del mes contra la suma de objetivos de las propiedades
-- activas en el filtro. Edición inline desde el dashboard via popover.
-- ============================================================================

create table monthly_targets (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  month date not null,
  target_revenue_ars numeric(12,2) not null,
  target_occupancy numeric(5,2),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint monthly_targets_month_first_day check (extract(day from month) = 1),
  constraint monthly_targets_revenue_nonneg check (target_revenue_ars >= 0),
  constraint monthly_targets_occupancy_range check (
    target_occupancy is null or (target_occupancy >= 0 and target_occupancy <= 100)
  )
);

create unique index monthly_targets_property_month_uidx
  on monthly_targets(property_id, month);

create index idx_monthly_targets_month
  on monthly_targets(month);

-- ============================================================================
-- TRIGGER: updated_at
-- ============================================================================
create trigger monthly_targets_updated_at
  before update on monthly_targets
  for each row execute function set_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY — admin-only (el dashboard es admin-only)
-- ============================================================================
alter table monthly_targets enable row level security;

create policy "admin_all_monthly_targets" on monthly_targets
  for all using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
