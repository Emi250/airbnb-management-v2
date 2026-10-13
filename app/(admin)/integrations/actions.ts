'use server';
import {revalidatePath} from 'next/cache';
import {z} from 'zod';
import {ensureDashboardAdmin} from '../dashboard/_admin';
import {syncReservationToNotion} from '@/lib/notion/sync-reservation';
export async function retryNotionAction(id:string,confirmedAbsent=false) {
  try {
    z.string().uuid().parse(id);const db=await ensureDashboardAdmin();
    if(confirmedAbsent){const {error}=await db.rpc('reset_notion_creation',{p_id:id});if(error)throw error;}
    const warning=await syncReservationToNotion(db,id,true);
    revalidatePath('/integrations');revalidatePath(`/reservations/${id}`);
    return {success:true as const,warning};
  }catch(error){return {success:false as const,error:error instanceof Error?error.message:'No se pudo reintentar'};}
}
