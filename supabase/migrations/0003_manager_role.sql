-- ============================================================================
-- Manager role — acceso operativo limitado a Calendario (lectura) y Gastos (CRUD)
-- ============================================================================

-- 1. Extender el check del rol para aceptar 'manager'
alter table user_roles drop constraint user_roles_role_check;
alter table user_roles add constraint user_roles_role_check
  check (role in ('admin','caretaker','manager'));

-- ============================================================================
-- 2. Lectura para mostrar el calendario (read-only)
-- ============================================================================
create policy "manager_read_properties" on properties
  for select using (current_user_role() = 'manager');

create policy "manager_read_guests" on guests
  for select using (current_user_role() = 'manager');

create policy "manager_read_reservations" on reservations
  for select using (current_user_role() = 'manager');

create policy "manager_read_exchange_rates" on exchange_rates
  for select using (current_user_role() = 'manager');

-- ============================================================================
-- 3. CRUD completo en gastos y checklist de fijos
-- ============================================================================
create policy "manager_all_expenses" on expenses
  for all using (current_user_role() = 'manager') with check (current_user_role() = 'manager');

create policy "manager_all_fixed_items" on fixed_expense_items
  for all using (current_user_role() = 'manager') with check (current_user_role() = 'manager');

create policy "manager_all_fixed_checks" on fixed_expense_checks
  for all using (current_user_role() = 'manager') with check (current_user_role() = 'manager');
