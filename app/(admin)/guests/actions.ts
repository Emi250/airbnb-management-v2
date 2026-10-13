'use server';
import { revalidatePath } from 'next/cache';
import { ensureDashboardAdmin } from '../dashboard/_admin';
import { guestSchema, type GuestInput } from '@/lib/schemas';
import { z } from 'zod';

export async function updateGuestAction(id:string,version:number,input:GuestInput) {
  try {
    const parsed=guestSchema.parse(input);
    z.string().uuid().parse(id); z.number().int().positive().parse(version);
    const db=await ensureDashboardAdmin();
    const {error}=await db.rpc('update_guest',{p_id:id,p_version:version,p_input:parsed});
    if(error) return {success:false as const,error:error.message};
    revalidatePath('/','layout'); return {success:true as const};
  } catch(error) {return {success:false as const,error:error instanceof Error?error.message:'No se pudo guardar'};}
}
export async function mergeGuestsAction(source:string,target:string,sourceVersion:number,targetVersion:number) {
  try {
    [source,target].forEach(id=>z.string().uuid().parse(id));
    [sourceVersion,targetVersion].forEach(v=>z.number().int().positive().parse(v));
    const db=await ensureDashboardAdmin();
    const {error,data}=await db.rpc('merge_guests',{p_source:source,p_target:target,p_source_version:sourceVersion,p_target_version:targetVersion});
    if(error) return {success:false as const,error:error.message};
    revalidatePath('/','layout');return {success:true as const,id:data};
  } catch(error) {return {success:false as const,error:error instanceof Error?error.message:'No se pudieron unificar las fichas'};}
}
