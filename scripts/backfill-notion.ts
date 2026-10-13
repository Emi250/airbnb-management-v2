// Reintenta la cola persistente. Nunca repite una creación incierta.
// Uso: node --require ./tests/register.cjs scripts/backfill-notion.ts
import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {createClient} from '@supabase/supabase-js';
import type {Database} from '../types/supabase';
import {syncReservationToNotion} from '../lib/notion/sync-reservation';
import {readAll} from '../lib/queries/read-all';
async function main() {
  for(const [key,value] of Object.entries(parseEnv(readFileSync('.env.local','utf8'))))process.env[key]??=value;
  if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY)throw Error('Falta configurar Supabase');
  const db=createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
  const {data}=await readAll(()=>db.from('notion_sync_jobs').select('reservation_id').in('state',['pending','error','processing']).order('reservation_id'),'los pendientes de Notion');
  let pending=0;
  for(const job of data)if(await syncReservationToNotion(db,job.reservation_id,true))pending++;
  console.log(JSON.stringify({revisadas:data.length,pendientes:pending}));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
