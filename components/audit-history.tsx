import type { AuditEvent, Json } from '@/types/supabase';
import Link from 'next/link';

const LABELS: Record<string,string> = {
  name:'Nombre',phone:'Teléfono',email:'Email',country:'País',notes:'Notas',merged_into:'Ficha unificada',
  check_in:'Ingreso',check_out:'Salida',num_guests:'Huéspedes',total_amount_ars:'Total',amount_paid_ars:'Cobrado',
  status:'Estado',source:'Origen',bed_setup:'Camas',guest_id:'Huésped',property_id:'Propiedad',
  platform_fee_ars:'Comisión',cleaning_fee_ars:'Limpieza',amount_ars:'Importe',kind:'Movimiento',paid_on:'Fecha de pago',
  method:'Medio',reference:'Referencia',receipt_url:'Comprobante',date:'Fecha',category:'Categoría',description:'Descripción',
};
const value = (v: Json | undefined) => v == null || v === '' ? '—' : typeof v==='string' ? v : JSON.stringify(v);
export function AuditHistory({events,showEntity=false}:{events:AuditEvent[];showEntity?:boolean}) {
  return <section className="mt-8 border-t border-border pt-6" aria-label="Historial de cambios">
    <h2 className="text-lg font-semibold">Historial de cambios</h2>
    <p className="mt-1 text-sm text-muted-foreground">Cambios registrados desde la activación del historial.</p>
    {events.length===0 ? <p className="py-4 text-sm text-muted-foreground">Todavía no hay cambios registrados.</p> :
      <ol className="mt-4 divide-y divide-border">{events.map(e=>{
        const before=(e.before_data??{}) as Record<string,Json>; const after=(e.after_data??{}) as Record<string,Json>;
        const keys=Object.keys(LABELS).filter(k=>JSON.stringify(before[k])!==JSON.stringify(after[k]));
        return <li key={e.id} className="py-3"><details><summary className="cursor-pointer text-sm">
          <strong>{e.actor_name}</strong> · {e.action==='insert'?'Registro creado':e.action==='delete'?'Registro eliminado':'Modificación'} ·{' '}
          {new Intl.DateTimeFormat('es-AR',{dateStyle:'short',timeStyle:'short',timeZone:'America/Argentina/Cordoba'}).format(new Date(e.occurred_at))}
        </summary>{showEntity&&<p className="mt-2 text-sm text-muted-foreground">{({guests:'Huésped',reservations:'Reserva',expenses:'Gasto',reservation_payments:'Movimiento de pago'} as Record<string,string>)[e.entity_type]??'Registro'}
          {e.action!=='delete'&&['guests','reservations'].includes(e.entity_type)&&<> · <Link className="underline" href={`/${e.entity_type}/${e.entity_id}`}>Abrir ficha</Link></>}
          {e.entity_type==='reservation_payments'&&typeof after.reservation_id==='string'&&<> · <Link className="underline" href={`/reservations/${after.reservation_id}`}>Abrir reserva</Link></>}
        </p>}<dl className="mt-3 space-y-2 pl-4 text-sm">{keys.map(k=><div key={k} className="grid gap-1 sm:grid-cols-[160px_1fr]">
          <dt className="text-muted-foreground">{LABELS[k]}</dt><dd className="break-words">{e.action==='insert'?value(after[k]):`${value(before[k])} → ${value(after[k])}`}</dd>
        </div>)}</dl></details></li>;
      })}</ol>}
  </section>;
}
