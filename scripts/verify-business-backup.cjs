/* eslint-disable @typescript-eslint/no-require-imports */
// Solo restaura en PGlite en memoria. No acepta URL ni credenciales de una base remota.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { PGlite } = require('@electric-sql/pglite');
const { btree_gist } = require('@electric-sql/pglite/contrib/btree_gist');

async function main() {
  const snapshot = JSON.parse(Buffer.from(fs.readFileSync(0, 'utf8').trim(), 'base64').toString('utf8'));
  assert.equal(snapshot.project, 'hdapnhttahaifkhvepbc');
  assert.ok(['0010','0014'].includes(snapshot.schema_through));
  const tables = ['properties','guests','reservations','expenses','exchange_rates','user_roles','fixed_expense_items','fixed_expense_checks','monthly_targets'];
  if(snapshot.schema_through==='0014')tables.push('reservation_payments','audit_events','notion_sync_jobs');
  assert.deepEqual(Object.keys(snapshot.tables).sort(), [...tables].sort());
  const db = new PGlite({ extensions: { btree_gist } });
  try {
    await db.exec(`create schema auth; create table auth.users(id uuid primary key); create role authenticated;
      create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;`);
    const dir = path.join(__dirname, '../supabase/migrations');
    const migrations = fs.readdirSync(dir).filter(f=>f.endsWith('.sql')).sort();
    const apply = async file => db.exec(fs.readFileSync(path.join(dir,file),'utf8').replace('create extension if not exists "pgcrypto";',''));
    for (const file of migrations.filter(f=>f.slice(0,4)<=snapshot.schema_through)) await apply(file);
    // Solo en memoria: excluir triggers durante la carga conserva fechas y columnas originales.
    await db.exec('set session_replication_role=replica');
    for (const table of [...tables].reverse()) await db.exec(`delete from public.${table}`);
    for (const row of snapshot.tables.user_roles) await db.query('insert into auth.users(id) values($1)',[row.user_id]);
    const report = {};
    for (const table of tables) {
      const rows = snapshot.tables[table];
      const columns = (await db.query("select column_name from information_schema.columns where table_schema='public' and table_name=$1 and is_generated='NEVER' order by ordinal_position",[table])).rows.map(r=>r.column_name);
      if (rows.length) {
        const names = columns.map(c=>'"'+c+'"').join(',');
        await db.query(`insert into public.${table} (${names}) select ${names} from jsonb_populate_recordset(null::public.${table},$1::jsonb)`,[JSON.stringify(rows)]);
      }
      // PostgreSQL normaliza timestamps, números y columnas generadas para una comparación exacta.
      const result = (await db.query(`select
        (select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]') from public.${table} t) as actual,
        (select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]') from jsonb_populate_recordset(null::public.${table},$1::jsonb) t) as expected`,[JSON.stringify(rows)])).rows[0];
      assert.deepEqual(result.actual,result.expected,`Diferencias al restaurar ${table}`);
      report[table] = { rows:rows.length, sha256:createHash('sha256').update(JSON.stringify(result.actual)).digest('hex') };
    }
    await db.exec('set session_replication_role=origin');
    // Revalidar las relaciones después de la carga con triggers suspendidos.
    const fks=(await db.query("select conrelid::regclass::text as tbl,conname,pg_get_constraintdef(oid) as def from pg_constraint where contype='f' and connamespace='public'::regnamespace")).rows;
    for(const fk of fks) await db.exec(`alter table ${fk.tbl} drop constraint "${fk.conname}"; alter table ${fk.tbl} add constraint "${fk.conname}" ${fk.def}`);
    for (const file of migrations.filter(f=>f.slice(0,4)>snapshot.schema_through)) await apply(file);
    const balances=(await db.query(`select count(*)::int as mismatches from reservations r where amount_paid_ars is distinct from
      (select coalesce(sum(case when kind='refund' then -amount_ars else amount_ars end),0) from reservation_payments where reservation_id=r.id)`)).rows[0];
    assert.equal(balances.mismatches,0);
    const opening=(await db.query("select count(*)::int as n from reservation_payments where kind='opening_balance' and (paid_on is not null or method<>'legacy')")).rows[0];
    assert.equal(opening.n,0);
    console.log(JSON.stringify({restored:true,migrationsVerified:migrations.at(-1),balancesPreserved:true,report},null,2));
  } finally { await db.close(); }
}
main().catch(error=>{ console.error('Restauración fallida:',error.message);process.exitCode=1; });
