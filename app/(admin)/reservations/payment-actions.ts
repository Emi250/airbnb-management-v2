'use server';
import { scheduleNotionSync } from '@/lib/notion/schedule';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ensureDashboardAdmin } from '../dashboard/_admin';
import { paymentSchema,type PaymentInput } from '@/lib/schemas';

export async function recordPaymentAction(reservationId:string,version:number,input:PaymentInput) {
  try {
    const parsed=paymentSchema.parse(input);z.string().uuid().parse(reservationId);z.number().int().positive().parse(version);
    const db=await ensureDashboardAdmin();
    const {data,error}=await db.rpc('record_payment',{p_reservation_id:reservationId,p_version:version,p_input:parsed});
    if(error)return {success:false as const,error:error.message};
    scheduleNotionSync(reservationId);
    revalidatePath('/','layout');return {success:true as const,id:data};
  }catch(error){return {success:false as const,error:error instanceof Error?error.message:'No se pudo registrar el movimiento'};}
}
