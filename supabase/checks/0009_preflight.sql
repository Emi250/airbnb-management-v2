-- Solo lectura. Ejecutar antes de 0009_data_integrity.sql.
-- El primer resultado debe estar vacío para instalar la exclusión de fechas.
select a.id as reservation_a, b.id as reservation_b, a.property_id,
  a.check_in as a_check_in, a.check_out as a_check_out,
  b.check_in as b_check_in, b.check_out as b_check_out
from public.reservations a
join public.reservations b on a.id < b.id and a.property_id = b.property_id
where a.status <> 'cancelled' and b.status <> 'cancelled'
  and daterange(a.check_in, a.check_out, '[)') && daterange(b.check_in, b.check_out, '[)');

-- La migración retira estas marcas sin movimiento, no elimina gastos.
select id, item_id, period, paid_at
from public.fixed_expense_checks where expense_id is null;

-- Estas cotizaciones históricas se conservan; registrar una válida si la última
-- es incorrecta. La interfaz no convierte montos con tasas inválidas.
select id, ars_per_usd, ars_per_eur, updated_at
from public.exchange_rates
where ars_per_usd <= 0 or ars_per_eur <= 0
  or ars_per_usd = 'NaN'::numeric or ars_per_eur = 'NaN'::numeric;
