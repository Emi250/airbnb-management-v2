import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database,NotionJob} from '@/types/supabase';
import {archiveNotionReservation,createNotionReservation,updateNotionReservation,type NotionReservationData} from './reservations';
import {ensureNotionIdentity,findNotionReservation} from './identity';

/** Un solo trabajador por reserva; una creación incierta se reconcilia, nunca se repite a ciegas. */
export async function syncReservationToNotion(db:SupabaseClient<Database>,id:string,force=false):Promise<string|undefined> {
  if(!process.env.NOTION_TOKEN||!process.env.NOTION_DATABASE_ID)return 'Notion no está configurado. La sincronización queda pendiente.';
  const claimed=await db.rpc('claim_notion_sync',{p_id:id,p_force:force});
  if(claimed.error)return 'No se pudo iniciar la sincronización. Queda pendiente.';
  if(!claimed.data)return;
  const job=claimed.data as unknown as NotionJob;
  let pageId:string|null=null;let createStarted=job.create_started;
  async function finish(state:'synced'|'error'|'review_required',error:string|null=null) {
    const result=await db.rpc('finish_notion_sync',{p_id:id,p_token:job.lock_token!,p_generation:job.generation,p_state:state,p_error:error,p_page_id:pageId});
    if(result.error||!result.data)throw Error('No se pudo confirmar la sincronización; revisar el estado antes de reintentar.');
  }
  try {
    const {data:r,error}=await db.from('reservations').select('*,property:properties(name),guest:guests(name,phone)').eq('id',id).maybeSingle();
    if(error||!r)throw Error('No se pudo leer la reserva');
    pageId=r.notion_page_id;
    if(r.status==='cancelled'&&!pageId&&!createStarted){await finish('synced');return;}
    await ensureNotionIdentity();
    if(!pageId)pageId=await findNotionReservation(id);
    if(!pageId&&createStarted){await finish('review_required','El resultado de una creación anterior es incierto. Revisá Notion antes de habilitar otra creación.');return 'Notion requiere revisión para evitar una página duplicada.';}
    if(r.status==='cancelled'){
      if(pageId){const result=await archiveNotionReservation(pageId);if(!result.ok)throw Error(result.error);}
      await finish('synced');return;
    }
    const data:NotionReservationData={reservationId:id,guestName:r.guest?.name??null,guestPhone:r.guest?.phone??null,propertyName:r.property?.name??null,
      checkIn:r.check_in,checkOut:r.check_out,numGuests:r.num_guests,totalAmountArs:r.total_amount_ars,amountPaidArs:r.amount_paid_ars,bedSetup:r.bed_setup};
    if(pageId){const result=await updateNotionReservation(pageId,data);if(!result.ok)throw Error(result.error);}
    else {
      const gate=await db.rpc('begin_notion_create',{p_id:id,p_token:job.lock_token!});
      if(gate.error||!gate.data)throw Error('No se pudo reservar la creación de la página');
      createStarted=true;
      const result=await createNotionReservation(data);
      if(!result.ok)throw Error(result.error);
      pageId=result.pageId;
    }
    await finish('synced');
  }catch(error){
    const message=error instanceof Error?error.message:'Error de sincronización';
    try {await finish(createStarted&&!pageId?'review_required':'error',message.slice(0,500));}
    catch {console.error('[notion] No se pudo confirmar el resultado de la reserva',id);}
    return 'La reserva está guardada. Notion quedó pendiente; revisá Integraciones para reintentar.';
  }
}
