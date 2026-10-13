/* eslint-disable @typescript-eslint/no-require-imports */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { PGlite } = require('@electric-sql/pglite');
const { btree_gist } = require('@electric-sql/pglite/contrib/btree_gist');
let db;

before(async () => {
  db = new PGlite({ extensions: { btree_gist } });
  await db.exec(`
    create schema auth;
    create table auth.users(id uuid primary key);
    create role authenticated;
    create function auth.uid() returns uuid language sql as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  `);
  const directory = path.join(__dirname, '../supabase/migrations');
  for (const file of fs.readdirSync(directory).filter((f) => f.endsWith('.sql')).sort()) {
    // gen_random_uuid es nativa en PostgreSQL moderno. PGlite no necesita pgcrypto.
    const sql = fs.readFileSync(path.join(directory, file), 'utf8')
      .replace('create extension if not exists "pgcrypto";', '');
    await db.exec(sql);
  }
  const admin = randomUUID();
  await db.query('insert into auth.users(id) values ($1)', [admin]);
  await db.query("insert into user_roles(user_id, role) values ($1, 'admin')", [admin]);
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [admin]);
});
after(async () => { if (db) await db.close(); });

async function property(active = true) {
  const id = randomUUID();
  await db.query('insert into properties(id, name, active, has_split_beds) values ($1, $2, $3, true)', [id, 'Unidad de prueba', active]);
  return id;
}
function input(propertyId, extra = {}) {
  return { property_id: propertyId, new_guest_name: 'Huésped de prueba',
    check_in: '2026-10-01', check_out: '2026-10-03', num_guests: 2,
    total_amount_ars: 100000, amount_paid_ars: 30000, source: 'direct', status: 'confirmed',
    platform_fee_ars: 0, cleaning_fee_ars: 0, ...extra };
}
async function save(data, id = null) {
  if (id && data.expected_version === undefined) data = { ...data, expected_version: (await db.query('select version from reservations where id=$1',[id])).rows[0].version };
  const result = await db.query('select save_reservation($1, $2::jsonb) as id', [id, JSON.stringify(data)]);
  return result.rows[0].id;
}
async function count(table) { return (await db.query(`select count(*)::int as n from ${table}`)).rows[0].n; }
async function item() {
  const id = randomUUID();
  await db.query('insert into fixed_expense_items(id, label) values ($1, $2)', [id, 'Prueba']);
  return id;
}
async function mark(id) { await db.query("select mark_fixed_paid($1, '2026-10-01', 5000, null)", [id]); }

test('la migración instala una restricción de exclusión y permite fechas contiguas', async () => {
  const p = await property();
  await save(input(p));
  await assert.rejects(save(input(p)), (e) => e.code === '23P01');
  await save(input(p, { check_in: '2026-10-03', check_out: '2026-10-05' }));
  await save(input(p, { status: 'cancelled', amount_paid_ars: 0 }));
  const result = await db.query("select contype from pg_constraint where conname = 'reservations_no_overlap_excl'");
  assert.equal(result.rows[0].contype, 'x');
});
test('un conflicto revierte el huésped nuevo tanto al crear como al editar', async () => {
  const p = await property();
  await save(input(p));
  const id = await save(input(p, { check_in: '2026-10-05', check_out: '2026-10-07' }));
  const beforeGuests = await count('guests');
  await assert.rejects(save(input(p)), (e) => e.code === '23P01');
  await assert.rejects(save(input(p, { new_guest_name: 'No debe quedar' }), id), (e) => e.code === '23P01');
  assert.equal(await count('guests'), beforeGuests);
  assert.equal((await db.query('select check_in::text from reservations where id = $1', [id])).rows[0].check_in, '2026-10-05');
});
test('propiedades inactivas rechazan altas pero permiten editar su historial', async () => {
  const inactive = await property(false);
  await assert.rejects(save(input(inactive)), /inactiva/);
  const p = await property();
  const id = await save(input(p));
  await db.query('update properties set active = false where id = $1', [p]);
  await save(input(p, { notes: 'Edición histórica' }), id);
  await assert.rejects(save(input(inactive), id), /inactiva/);
});
test('borrar el movimiento desmarca el gasto fijo y permite volver a registrarlo', async () => {
  const i = await item();
  await mark(i);
  const beforeExpenses = await count('expenses');
  await assert.rejects(mark(i), /Ya está marcado/);
  assert.equal(await count('expenses'), beforeExpenses);
  await db.query('delete from expenses where id = (select expense_id from fixed_expense_checks where item_id = $1)', [i]);
  assert.equal((await db.query('select id from fixed_expense_checks where item_id = $1', [i])).rows.length, 0);
  await mark(i);
  await db.query("select unmark_fixed_paid($1, '2026-10-01')", [i]);
  assert.equal(await count('expenses'), beforeExpenses - 1);
});
test('si falla el alta de la marca, el movimiento también se revierte', async () => {
  const i = await item();
  const n = await count('expenses');
  await db.exec(`create function reject_check() returns trigger language plpgsql as $$
    begin raise exception 'Fallo de prueba'; end $$;
    create trigger reject_check before insert on fixed_expense_checks for each row execute function reject_check();`);
  try {
    await assert.rejects(mark(i), /Fallo de prueba/);
    assert.equal(await count('expenses'), n);
  } finally { await db.exec('drop trigger reject_check on fixed_expense_checks; drop function reject_check();'); }
});
test('si falla el borrado del gasto, se conserva la marca de pago', async () => {
  const i = await item();
  await mark(i);
  await db.exec(`create function reject_delete() returns trigger language plpgsql as $$
    begin raise exception 'Fallo de prueba'; end $$;
    create trigger reject_delete before delete on expenses for each row execute function reject_delete();`);
  try {
    await assert.rejects(db.query("select unmark_fixed_paid($1, '2026-10-01')", [i]), /Fallo de prueba/);
    assert.equal((await db.query('select id from fixed_expense_checks where item_id = $1', [i])).rows.length, 1);
  } finally { await db.exec('drop trigger reject_delete on expenses; drop function reject_delete();'); }
});
test('reprogramar el check-in vuelve a habilitar el recordatorio y expone las camas', async () => {
  const p = await property();
  const id = await save(input(p, { bed_setup: 'separate' }));
  await db.query('update reservations set checkin_reminder_sent_at = now() where id = $1', [id]);
  await save(input(p, { check_in: '2026-10-02', bed_setup: 'separate' }), id);
  const row = (await db.query('select checkin_reminder_sent_at, bed_setup from reservations where id = $1', [id])).rows[0];
  assert.equal(row.checkin_reminder_sent_at, null);
  assert.equal(row.bed_setup, 'separate');
  await db.query('select bed_setup from caretaker_agenda limit 0');
});
test('la base rechaza una cotización cero', async () => {
  await assert.rejects(db.query('insert into exchange_rates(ars_per_usd, ars_per_eur) values (0, 1200)'), (e) => e.code === '23514');
});

test('rechaza una edición obsoleta y conserva el historial con responsable', async () => {
  const p=await property(); const id=await save(input(p));
  const version=(await db.query('select version from reservations where id=$1',[id])).rows[0].version;
  await save(input(p,{expected_version:version,notes:'Primera edición'}),id);
  await assert.rejects(save(input(p,{expected_version:version,notes:'Edición obsoleta'}),id),/cambió/);
  assert.equal((await db.query('select notes from reservations where id=$1',[id])).rows[0].notes,'Primera edición');
  const events=(await db.query("select actor_id,after_data from audit_events where entity_type='reservations' and entity_id=$1 order by occurred_at",[id])).rows;
  assert.ok(events.length>=2); assert.ok(events.at(-1).actor_id);
  assert.equal(events.at(-1).after_data.notes,'Primera edición');
});

test('los movimientos son idempotentes, actualizan el saldo y limitan las devoluciones', async () => {
  const p=await property();const id=await save(input(p));
  let version=(await db.query('select version from reservations where id=$1',[id])).rows[0].version;
  const payment={id:randomUUID(),kind:'payment',amount_ars:20000,paid_on:'2026-10-12',method:'transfer',reference:'Comprobante 1'};
  const pay=(v,data)=>db.query('select record_payment($1,$2,$3::jsonb)',[id,v,JSON.stringify(data)]);
  await pay(version,payment);await pay(version,payment);
  assert.equal(Number((await db.query('select amount_paid_ars from reservations where id=$1',[id])).rows[0].amount_paid_ars),50000);
  await assert.rejects(pay(version,{...payment,id:randomUUID()}),/cambió/);
  version=(await db.query('select version from reservations where id=$1',[id])).rows[0].version;
  await assert.rejects(pay(version,{...payment,id:randomUUID(),kind:'refund',amount_ars:50001}),/supera/);
  await pay(version,{...payment,id:randomUUID(),kind:'refund',amount_ars:10000});
  assert.equal(Number((await db.query('select amount_paid_ars from reservations where id=$1',[id])).rows[0].amount_paid_ars),40000);
  await assert.rejects(db.query('update reservations set amount_paid_ars=0 where id=$1',[id]),/Movimientos/);
});

test('unificar conserva contactos, ficha original y todas las reservas', async () => {
  const p=await property();const id=await save(input(p));
  const source=(await db.query('select guest_id from reservations where id=$1',[id])).rows[0].guest_id;
  await db.query("update guests set phone='123456789',notes='Dato original' where id=$1",[source]);
  const target=(await db.query("insert into guests(name,email) values('Ficha principal','principal@example.test') returning id,version")).rows[0];
  const s=(await db.query('select version from guests where id=$1',[source])).rows[0];
  await db.query('select merge_guests($1,$2,$3,$4)',[source,target.id,s.version,target.version]);
  assert.equal((await db.query('select guest_id from reservations where id=$1',[id])).rows[0].guest_id,target.id);
  assert.equal((await db.query('select merged_into from guests where id=$1',[source])).rows[0].merged_into,target.id);
  const result=(await db.query('select * from guests where id=$1',[target.id])).rows[0];
  assert.equal(result.phone,'123456789'); assert.match(result.notes,/Dato original/);
  await assert.rejects(db.query('select merge_guests($1,$2,$3,$4)',[source,target.id,s.version,result.version]),/disponible/);
});

test('Notion bloquea trabajadores simultáneos y no pierde una edición durante el envío', async () => {
  const id=await save(input(await property()));
  const claim=async()=> (await db.query('select claim_notion_sync($1,true) as job',[id])).rows[0].job;
  const first=await claim();assert.ok(first.lock_token);assert.equal(await claim(),null);
  await db.query("update reservations set notes='Cambió durante el envío' where id=$1",[id]);
  await db.query("select finish_notion_sync($1,$2,$3,'synced',null,'page-id')",[id,first.lock_token,first.generation]);
  assert.equal((await db.query('select state from notion_sync_jobs where reservation_id=$1',[id])).rows[0].state,'pending');
  const next=await claim();
  assert.equal((await db.query("select finish_notion_sync($1,$2,$3,'synced',null,'stale-page') as ok",[id,first.lock_token,first.generation])).rows[0].ok,false);
  await db.query("select finish_notion_sync($1,$2,$3,'synced',null,'page-id')",[id,next.lock_token,next.generation]);
  assert.equal((await db.query('select state from notion_sync_jobs where reservation_id=$1',[id])).rows[0].state,'synced');
});

test('un trabajador vencido conserva la marca de creación incierta', async () => {
  const id=await save(input(await property()));
  const first=(await db.query('select claim_notion_sync($1,true) as job',[id])).rows[0].job;
  await db.query('select begin_notion_create($1,$2)',[id,first.lock_token]);
  await db.query("update notion_sync_jobs set locked_at=now()-interval '3 minutes' where reservation_id=$1",[id]);
  const next=(await db.query('select claim_notion_sync($1,true) as job',[id])).rows[0].job;
  assert.equal(next.create_started,true);assert.notEqual(next.lock_token,first.lock_token);
  assert.equal((await db.query('select begin_notion_create($1,$2) as ok',[id,next.lock_token])).rows[0].ok,false);
});

test('una edición obsoleta de huésped se rechaza y Notion no cambia su versión de negocio', async () => {
  const id=await save(input(await property()));
  const r=(await db.query('select * from reservations where id=$1',[id])).rows[0];
  const guest=(await db.query('select * from guests where id=$1',[r.guest_id])).rows[0];
  await db.query('select update_guest($1,$2,$3)',[guest.id,guest.version,JSON.stringify({name:'Nombre actualizado'})]);
  await assert.rejects(db.query('select update_guest($1,$2,$3)',[guest.id,guest.version,JSON.stringify({name:'Nombre obsoleto'})]),/cambió/);
  await db.query("update reservations set notion_page_id='external-page' where id=$1",[id]);
  assert.equal((await db.query('select version from reservations where id=$1',[id])).rows[0].version,r.version);
});

test('una reserva cancelada admite devolución pero no nuevos cobros', async () => {
  const id=await save(input(await property()));
  const r=(await db.query("update reservations set status='cancelled' where id=$1 returning version",[id])).rows[0];
  const movement={id:randomUUID(),kind:'payment',amount_ars:1000,paid_on:'2026-10-12',method:'cash'};
  await assert.rejects(db.query('select record_payment($1,$2,$3)',[id,r.version,JSON.stringify(movement)]),/canceladas/);
  await db.query('select record_payment($1,$2,$3)',[id,r.version,JSON.stringify({...movement,kind:'refund',notes:'Cancelación'})]);
  assert.equal(Number((await db.query('select amount_paid_ars from reservations where id=$1',[id])).rows[0].amount_paid_ars),29000);
});
