-- ============================================================================
-- Fixed Expenses — Checklist mensual de pagos recurrentes
-- ============================================================================

-- Extender el enum de categoría de gastos para incluir "fixed" (Gasto Fijo)
alter table expenses drop constraint expenses_category_check;
alter table expenses add constraint expenses_category_check
  check (category in ('cleaning','maintenance','utilities','supplies','tax','other','fixed'));

-- Catálogo de gastos fijos (lista configurable por el usuario)
create table fixed_expense_items (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  position int not null default 0,
  active boolean not null default true,
  created_at timestamptz default now()
);

-- Estado de pago por (item, periodo). period es el primer día del mes.
create table fixed_expense_checks (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references fixed_expense_items(id) on delete cascade,
  period date not null,
  expense_id uuid references expenses(id) on delete set null,
  paid_at timestamptz default now(),
  unique(item_id, period)
);

create index idx_fixed_checks_period on fixed_expense_checks(period);
create index idx_fixed_items_active on fixed_expense_items(active, position);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table fixed_expense_items enable row level security;
alter table fixed_expense_checks enable row level security;

create policy "admin_all_fixed_items" on fixed_expense_items
  for all using (current_user_role() = 'admin') with check (current_user_role() = 'admin');

create policy "admin_all_fixed_checks" on fixed_expense_checks
  for all using (current_user_role() = 'admin') with check (current_user_role() = 'admin');

-- ============================================================================
-- SEED — 9 ítems iniciales por defecto
-- ============================================================================
insert into fixed_expense_items (label, position) values
  ('Abono celular', 10),
  ('Préstamo Banco Nación', 20),
  ('Municipalidad', 30),
  ('Internet WiFi', 40),
  ('Tarjeta Naranja', 50),
  ('Comisión Booking', 60),
  ('Emoss', 70),
  ('Monotributo', 80),
  ('EPEC', 90);
