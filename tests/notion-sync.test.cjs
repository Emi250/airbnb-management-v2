/* eslint-disable @typescript-eslint/no-require-imports */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { syncReservationToNotion } = require('../lib/notion/sync-reservation.ts');
const originalFetch = global.fetch;
const originalError = console.error;
const oldToken = process.env.NOTION_TOKEN;
const oldDatabase = process.env.NOTION_DATABASE_ID;
before(() => {
  process.env.NOTION_TOKEN = 'test-token';
  process.env.NOTION_DATABASE_ID = 'test-database';
  console.error = () => {};
});
after(() => {
  global.fetch = originalFetch;
  console.error = originalError;
  if (oldToken === undefined) delete process.env.NOTION_TOKEN; else process.env.NOTION_TOKEN = oldToken;
  if (oldDatabase === undefined) delete process.env.NOTION_DATABASE_ID; else process.env.NOTION_DATABASE_ID = oldDatabase;
});
function client(notionPageId, status = 'confirmed') {
  const writes = [];
  const row = { notion_page_id: notionPageId, status,
    check_in: '2026-10-01', check_out: '2026-10-03', num_guests: 2,
    total_amount_ars: 100000, amount_paid_ars: 30000, bed_setup: 'separate',
    guest: { name: 'Prueba', phone: null }, property: { name: 'Unidad de prueba' } };
  return { writes, from: () => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row, error: null }) }) }),
    update: (value) => ({ eq: async () => { writes.push(value); return { error: null }; } }),
  }) };
}
test('un error al actualizar Notion conserva el vínculo y no crea una página nueva', async () => {
  for (const status of [404, 429, 500]) {
    const calls = [];
    global.fetch = async (url, options) => {
      calls.push({ url, method: options.method });
      assert.ok(options.signal);
      return new Response(JSON.stringify({ message: 'Error simulado' }), { status });
    };
    const db = client('existing-page');
    assert.match(await syncReservationToNotion(db, 'r'), /Notion no se actualizó/);
    assert.deepEqual(calls.map((c) => c.method), ['PATCH']);
    assert.deepEqual(db.writes, []);
  }
});
test('un timeout no impide guardar localmente ni provoca recreación', async () => {
  let calls = 0;
  global.fetch = async () => { calls++; throw new DOMException('Timeout', 'TimeoutError'); };
  const db = client('existing-page');
  assert.match(await syncReservationToNotion(db, 'r'), /Notion no se actualizó/);
  assert.equal(calls, 1);
  assert.deepEqual(db.writes, []);
});
test('crear y cancelar guardan o liberan el vínculo solo tras éxito en Notion', async () => {
  const methods = [];
  global.fetch = async (_url, options) => {
    methods.push(options.method);
    return new Response(JSON.stringify({ id: 'new-page' }), { status: 200 });
  };
  const created = client(null);
  assert.equal(await syncReservationToNotion(created, 'r'), undefined);
  assert.deepEqual(created.writes, [{ notion_page_id: 'new-page' }]);
  const cancelled = client('new-page', 'cancelled');
  assert.equal(await syncReservationToNotion(cancelled, 'r'), undefined);
  assert.deepEqual(cancelled.writes, [{ notion_page_id: null }]);
  assert.deepEqual(methods, ['POST', 'PATCH']);
});
