import {after} from 'next/server';
import {createAdminClient} from '@/lib/supabase/admin';
import {syncReservationToNotion} from './sync-reservation';
export function scheduleNotionSync(id:string) {
  after(async()=>{try{await syncReservationToNotion(createAdminClient(),id);}catch{console.error('[notion] La reserva queda en la cola de sincronización',id);}});
}
