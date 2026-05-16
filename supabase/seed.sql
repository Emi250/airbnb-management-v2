-- ============================================================================
-- Seed data — 4 properties, sample guests, ~30 reservations spanning ±12 months
-- ============================================================================

-- Properties
insert into properties (id, name, address, base_price_ars, cleaning_fee_ars, color_hex, active) values
  ('11111111-1111-1111-1111-111111111111', 'Airbnb 1', 'Av. Pueyrredón 100, Capilla del Monte, Córdoba', 35000, 8000, '#c06d4a', true),
  ('22222222-2222-2222-2222-222222222222', 'Airbnb 2', 'Diagonal Sarmiento 250, Capilla del Monte, Córdoba', 42000, 8000, '#3f6ea5', true),
  ('33333333-3333-3333-3333-333333333333', 'Airbnb 3', 'Calle Pública s/n, Barrio La Toma, Capilla del Monte, Córdoba', 38000, 9000, '#5a8f4e', true),
  ('44444444-4444-4444-4444-444444444444', 'Airbnb 4', 'Ruta 38 km 7, Capilla del Monte, Córdoba', 50000, 10000, '#9c5f86', true);

-- Exchange rates (placeholder — ARS/USD ~1000, ARS/EUR ~1100)
insert into exchange_rates (ars_per_usd, ars_per_eur) values (1000, 1100);

-- Guests
insert into guests (id, name, phone, email, country) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'María González', '+5491155551111', 'maria@example.com', 'Argentina'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'Carlos Méndez', '+5491155552222', 'carlos@example.com', 'Argentina'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'Lucía Fernández', '+5491155553333', 'lucia@example.com', 'Uruguay'),
  ('aaaaaaaa-0000-0000-0000-000000000004', 'John Smith', '+14155556666', 'john@example.com', 'USA'),
  ('aaaaaaaa-0000-0000-0000-000000000005', 'Elena Rossi', '+393331234567', 'elena@example.com', 'Italia'),
  ('aaaaaaaa-0000-0000-0000-000000000006', 'Diego López', '+5491166667777', 'diego@example.com', 'Argentina'),
  ('aaaaaaaa-0000-0000-0000-000000000007', 'Sofía Pérez', '+5491177778888', 'sofia@example.com', 'Argentina'),
  ('aaaaaaaa-0000-0000-0000-000000000008', 'Pierre Dubois', '+33612345678', 'pierre@example.com', 'Francia'),
  ('aaaaaaaa-0000-0000-0000-000000000009', 'Valentina Costa', '+5491188889999', 'valentina@example.com', 'Argentina'),
  ('aaaaaaaa-0000-0000-0000-000000000010', 'Juan Ramos', '+5491199990000', 'juan@example.com', 'Argentina');

-- Reservations: spanning past 12 months and next 6 months across 4 properties
-- Use current_date as the anchor so the seed always produces relevant data.
insert into reservations (property_id, guest_id, check_in, check_out, num_guests, total_amount_ars, amount_paid_ars, source, platform_fee_ars, cleaning_fee_ars, status, notes) values
  -- Past
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000001', current_date - 330, current_date - 325, 2, 280000, 280000, 'airbnb', 25000, 8000, 'completed', 'Cliente recurrente'),
  ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-0000-0000-0000-000000000002', current_date - 300, current_date - 293, 4, 420000, 420000, 'airbnb', 38000, 8000, 'completed', null),
  ('33333333-3333-3333-3333-333333333333', 'aaaaaaaa-0000-0000-0000-000000000003', current_date - 280, current_date - 273, 3, 380000, 380000, 'booking', 35000, 9000, 'completed', null),
  ('44444444-4444-4444-4444-444444444444', 'aaaaaaaa-0000-0000-0000-000000000004', current_date - 260, current_date - 250, 6, 600000, 600000, 'airbnb', 55000, 10000, 'completed', 'Familia con niños'),
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000005', current_date - 240, current_date - 235, 2, 285000, 285000, 'direct', 0, 8000, 'completed', null),
  ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-0000-0000-0000-000000000006', current_date - 210, current_date - 204, 3, 360000, 360000, 'airbnb', 32000, 8000, 'completed', null),
  ('33333333-3333-3333-3333-333333333333', 'aaaaaaaa-0000-0000-0000-000000000007', current_date - 180, current_date - 174, 2, 320000, 320000, 'booking', 28000, 9000, 'completed', null),
  ('44444444-4444-4444-4444-444444444444', 'aaaaaaaa-0000-0000-0000-000000000008', current_date - 150, current_date - 142, 4, 520000, 520000, 'airbnb', 47000, 10000, 'completed', 'Internacional'),
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000009', current_date - 120, current_date - 115, 2, 280000, 280000, 'airbnb', 25000, 8000, 'completed', null),
  ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-0000-0000-0000-000000000010', current_date - 90, current_date - 84, 4, 410000, 410000, 'direct', 0, 8000, 'completed', null),
  ('33333333-3333-3333-3333-333333333333', 'aaaaaaaa-0000-0000-0000-000000000001', current_date - 75, current_date - 70, 2, 300000, 300000, 'airbnb', 27000, 9000, 'completed', null),
  ('44444444-4444-4444-4444-444444444444', 'aaaaaaaa-0000-0000-0000-000000000002', current_date - 60, current_date - 53, 5, 555000, 555000, 'booking', 50000, 10000, 'completed', null),
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000003', current_date - 45, current_date - 40, 2, 280000, 280000, 'airbnb', 25000, 8000, 'completed', null),
  ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-0000-0000-0000-000000000004', current_date - 30, current_date - 23, 3, 420000, 420000, 'airbnb', 38000, 8000, 'completed', null),
  ('33333333-3333-3333-3333-333333333333', 'aaaaaaaa-0000-0000-0000-000000000005', current_date - 20, current_date - 14, 2, 350000, 350000, 'direct', 0, 9000, 'completed', null),
  -- Current / near future
  ('44444444-4444-4444-4444-444444444444', 'aaaaaaaa-0000-0000-0000-000000000006', current_date - 5, current_date + 2, 4, 520000, 260000, 'airbnb', 47000, 10000, 'confirmed', 'Pago parcial — saldo al check-in'),
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000007', current_date + 1, current_date + 6, 2, 290000, 290000, 'airbnb', 26000, 8000, 'confirmed', 'Llega 14:00'),
  ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-0000-0000-0000-000000000008', current_date + 3, current_date + 10, 5, 480000, 240000, 'booking', 43000, 8000, 'confirmed', null),
  ('33333333-3333-3333-3333-333333333333', 'aaaaaaaa-0000-0000-0000-000000000009', current_date + 8, current_date + 14, 3, 380000, 0, 'airbnb', 34000, 9000, 'confirmed', null),
  ('44444444-4444-4444-4444-444444444444', 'aaaaaaaa-0000-0000-0000-000000000010', current_date + 15, current_date + 22, 6, 600000, 300000, 'direct', 0, 10000, 'confirmed', null),
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000001', current_date + 20, current_date + 25, 2, 280000, 280000, 'airbnb', 25000, 8000, 'confirmed', 'Cliente VIP'),
  ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-0000-0000-0000-000000000002', current_date + 30, current_date + 37, 4, 420000, 0, 'airbnb', 38000, 8000, 'pending', 'Esperando seña'),
  ('33333333-3333-3333-3333-333333333333', 'aaaaaaaa-0000-0000-0000-000000000003', current_date + 45, current_date + 51, 2, 360000, 180000, 'booking', 32000, 9000, 'confirmed', null),
  ('44444444-4444-4444-4444-444444444444', 'aaaaaaaa-0000-0000-0000-000000000004', current_date + 60, current_date + 70, 4, 700000, 350000, 'airbnb', 63000, 10000, 'confirmed', null),
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000005', current_date + 75, current_date + 80, 2, 290000, 0, 'direct', 0, 8000, 'pending', null),
  ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-0000-0000-0000-000000000006', current_date + 90, current_date + 97, 3, 420000, 210000, 'airbnb', 38000, 8000, 'confirmed', null),
  ('33333333-3333-3333-3333-333333333333', 'aaaaaaaa-0000-0000-0000-000000000007', current_date + 105, current_date + 112, 2, 380000, 0, 'airbnb', 34000, 9000, 'pending', null),
  ('44444444-4444-4444-4444-444444444444', 'aaaaaaaa-0000-0000-0000-000000000008', current_date + 120, current_date + 130, 5, 700000, 350000, 'booking', 63000, 10000, 'confirmed', null),
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000009', current_date + 135, current_date + 140, 2, 290000, 0, 'airbnb', 26000, 8000, 'pending', null),
  ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-0000-0000-0000-000000000010', current_date + 150, current_date + 158, 4, 480000, 240000, 'direct', 0, 8000, 'confirmed', null);

-- Expenses
insert into expenses (property_id, date, category, amount_ars, description) values
  ('11111111-1111-1111-1111-111111111111', current_date - 25, 'cleaning', 8000, 'Limpieza post check-out'),
  ('22222222-2222-2222-2222-222222222222', current_date - 20, 'utilities', 15000, 'Luz + agua bimestral'),
  ('33333333-3333-3333-3333-333333333333', current_date - 15, 'maintenance', 32000, 'Reparación calefón'),
  ('44444444-4444-4444-4444-444444444444', current_date - 10, 'cleaning', 10000, 'Limpieza profunda'),
  ('11111111-1111-1111-1111-111111111111', current_date - 8, 'supplies', 5500, 'Sábanas y toallas nuevas'),
  ('22222222-2222-2222-2222-222222222222', current_date - 5, 'tax', 12000, 'Impuesto municipal trimestral'),
  ('33333333-3333-3333-3333-333333333333', current_date - 3, 'cleaning', 9000, 'Limpieza'),
  ('44444444-4444-4444-4444-444444444444', current_date - 1, 'utilities', 18000, 'Internet + electricidad'),
  ('11111111-1111-1111-1111-111111111111', current_date - 60, 'maintenance', 45000, 'Pintura interior'),
  ('22222222-2222-2222-2222-222222222222', current_date - 90, 'supplies', 8500, 'Vajilla'),
  ('33333333-3333-3333-3333-333333333333', current_date - 120, 'tax', 12000, 'Impuesto'),
  ('44444444-4444-4444-4444-444444444444', current_date - 150, 'maintenance', 65000, 'Reparación techo');
