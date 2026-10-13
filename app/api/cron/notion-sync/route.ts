import {createAdminClient} from '@/lib/supabase/admin';
import {syncReservationToNotion} from '@/lib/notion/sync-reservation';
export const runtime='nodejs';
export const maxDuration=60;
export const dynamic='force-dynamic';
export async function GET(request:Request) {
  const secret=process.env.CRON_SECRET;
  if(!secret||request.headers.get('authorization')!==`Bearer ${secret}`)return new Response('No autorizado',{status:401});
  if(!process.env.NOTION_TOKEN||!process.env.NOTION_DATABASE_ID)return Response.json({configured:false});
  const db=createAdminClient();
  const {data,error}=await db.from('notion_sync_jobs').select('reservation_id').in('state',['pending','error','processing']).lte('next_attempt_at',new Date().toISOString()).order('next_attempt_at').limit(10);
  if(error)return new Response('No se pudo leer la cola',{status:500});
  const started=Date.now();let attempted=0;
  for(const job of data??[]){if(attempted>0&&Date.now()-started>5000)break;await syncReservationToNotion(db,job.reservation_id);attempted++;}
  return Response.json({attempted});
}
