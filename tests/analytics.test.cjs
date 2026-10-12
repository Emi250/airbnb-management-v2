/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseISO, endOfMonth } = require('date-fns');
const { occupancyRate, outstandingBalance } = require('../lib/analytics.ts');
const { exchangeRateSchema } = require('../lib/schemas.ts');
const { formatCurrency } = require('../lib/format.ts');

const property = { id: 'p', name: 'Departamento', color_hex: null };
const reservation = {
  property_id: 'p', check_in: '2026-10-01', check_out: '2026-11-01',
  total_amount_ars: 100000, amount_paid_ars: 30000, source: 'direct',
  status: 'confirmed', nights: 31, guest_id: 'g',
};
const from = parseISO('2026-10-01');
const to = endOfMonth(from);

test('una deuda permanece después del check-in y del check-out', () => {
  for (const status of ['confirmed', 'completed']) {
    assert.equal(outstandingBalance([{ ...reservation, status, check_in: '2020-01-01', check_out: '2020-01-03' }]), 70000);
  }
  assert.equal(outstandingBalance([{ ...reservation, status: 'cancelled' }]), 0);
  assert.equal(outstandingBalance([{ ...reservation, amount_paid_ars: 100000 }]), 0);
});
test('ocupación incluye la última noche del mes', () => {
  assert.equal(occupancyRate([reservation], [property], from, to), 1);
  assert.equal(occupancyRate([{ ...reservation, check_in: '2026-10-31', nights: 1 }], [property], from, to), 1 / 31);
});
test('ocupación recorta estadías y no cuenta cancelaciones ni otras propiedades', () => {
  const stays = [
    { ...reservation, check_in: '2026-09-30', check_out: '2026-10-03' },
    { ...reservation, status: 'cancelled' },
    { ...reservation, property_id: 'otra' },
  ];
  assert.equal(occupancyRate(stays, [property], from, to), 2 / 31);
  assert.equal(occupancyRate(stays, [], from, to), 0);
  assert.equal(occupancyRate(stays, [property], to, from), 0);
});
test('las cotizaciones deben ser positivas y finitas', () => {
  for (const value of [0, -1, Infinity, NaN]) {
    assert.equal(exchangeRateSchema.safeParse({ ars_per_usd: value, ars_per_eur: 1200 }).success, false);
  }
  assert.equal(exchangeRateSchema.safeParse({ ars_per_usd: 1000, ars_per_eur: 1200 }).success, true);
  assert.equal(formatCurrency(100000, 'USD', { ars_per_usd: 0, ars_per_eur: 1200 }), 'Cotización no disponible');
});
