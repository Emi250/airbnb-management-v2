/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { businessDateISO, overlappingReservations, overlapNights } = require('../lib/dates.ts');
const { readAll, checkQueryErrors } = require('../lib/queries/read-all.ts');
const { comparisonPeriod } = require('../lib/dashboard-periods.ts');
const { parseISO, format } = require('date-fns');

test('la fecha argentina no cambia a las 21:00 ni en el cambio de año UTC', () => {
  assert.equal(businessDateISO(new Date('2027-01-01T01:30:00Z')), '2026-12-31');
  assert.equal(businessDateISO(new Date('2027-01-01T03:00:00Z')), '2027-01-01');
});
test('reportes incluyen noches de una llegada del mes anterior', () => {
  const stays = overlappingReservations([
    { check_in: '2026-09-30', check_out: '2026-10-03', status: 'confirmed' },
    { check_in: '2026-09-25', check_out: '2026-10-01', status: 'confirmed' },
    { check_in: '2026-10-02', check_out: '2026-10-05', status: 'cancelled' },
  ], '2026-10-01', '2026-10-31');
  assert.equal(stays.length, 1);
  assert.equal(stays.reduce((n, r) => n + overlapNights(r.check_in, r.check_out, '2026-10-01', '2026-10-31'), 0), 2);
});
test('las comparaciones anuales no usan un único mes anterior', () => {
  const ytd = comparisonPeriod(parseISO('2026-01-01'), parseISO('2026-10-12'), 'ytd');
  assert.equal(format(ytd.from, 'yyyy-MM-dd'), '2025-01-01');
  assert.equal(format(ytd.to, 'yyyy-MM-dd'), '2025-10-12');
  const annual = comparisonPeriod(parseISO('2025-10-13'), parseISO('2026-10-12'), 'last12');
  assert.equal(format(annual.from, 'yyyy-MM-dd'), '2024-10-13');
  assert.equal(format(annual.to, 'yyyy-MM-dd'), '2025-10-12');
});
test('la paginación recupera más de 1000 registros aun con un límite de servidor menor', async () => {
  const source = Array.from({ length: 1205 }, (_, id) => ({ id }));
  const calls = [];
  const { data } = await readAll(() => ({ range: async (from, to) => {
    calls.push(from);
    return { data: source.slice(from, Math.min(from + 137, to + 1)), error: null };
  } }));
  assert.deepEqual(data, source);
  assert.equal(calls.at(-1), 1205);
});
test('un fallo intermedio rechaza toda la carga en vez de entregar cifras parciales', async () => {
  const original = console.error;
  console.error = () => {};
  try {
    await assert.rejects(readAll(() => ({ range: async (from) => from === 0
      ? { data: [{ id: 1 }], error: null }
      : { data: null, error: { message: 'Fallo simulado' } } })), /No se pudieron cargar/);
    assert.throws(() => checkQueryErrors([{ error: null }, { error: { message: 'Fallo' } }]), /No se pudieron cargar/);
  } finally { console.error = original; }
});
