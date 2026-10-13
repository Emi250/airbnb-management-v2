'use client';
import {useState,useTransition} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import type {NotionJob} from '@/types/supabase';
import {formatDateShort} from '@/lib/format';
import {retryNotionAction} from './actions';
const STATE={pending:'Pendiente',processing:'En curso',synced:'Sincronizado',error:'Error',review_required:'Revisar creación'};
type Row=NotionJob & {title?:string;date?:string;pageId?:string|null};
export function IntegrationList({rows}:{rows:Row[]}) {
  const [all,setAll]=useState(false);const [search,setSearch]=useState('');const [pending,start]=useTransition();const router=useRouter();
  const filtered=rows.filter(r=>(all||r.state!=='synced')&&`${r.title??''} ${r.date??''}`.toLowerCase().includes(search.toLowerCase()));
  function retry(id:string,absent=false){start(async()=>{const r=await retryNotionAction(id,absent);if(!r.success)toast.error(r.error);else if(r.warning)toast.warning(r.warning);else toast.success('Estado de sincronización actualizado');router.refresh();});}
  return <div><div className="mb-4 flex flex-wrap items-center gap-3"><Input className="max-w-sm" aria-label="Buscar sincronización" placeholder="Huésped, propiedad o fecha" value={search} onChange={e=>setSearch(e.target.value)}/>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={all} onChange={e=>setAll(e.target.checked)}/>Mostrar sincronizadas</label><Button variant="outline" onClick={()=>router.refresh()}>Actualizar estado</Button></div>
    <p className="mb-3 text-sm text-muted-foreground">{rows.filter(r=>r.state!=='synced').length} pendientes de {rows.length} reservas.</p>
    {filtered.length===0?<p className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">Sin sincronizaciones para mostrar.</p>:<ul className="divide-y divide-border">{filtered.map(r=><li className="space-y-3 py-5" key={r.reservation_id}>
      <div className="flex flex-wrap justify-between gap-3"><div><Link className="font-medium hover:underline" href={`/reservations/${r.reservation_id}`}>{r.title??'Reserva'}</Link><p className="text-sm text-muted-foreground">{r.date?formatDateShort(r.date):''} · {r.attempts} intentos</p></div><span className="text-sm font-medium">{r.state==='synced'&&!r.synced_at?'Estado previo; sin verificación reciente':STATE[r.state]}</span></div>
      {r.last_error&&<p className="break-words text-sm text-amber-700 dark:text-amber-300">{r.last_error}</p>}
      {r.last_attempt_at&&<p className="text-xs text-muted-foreground">Último intento: {new Date(r.last_attempt_at).toLocaleString('es-AR',{timeZone:'America/Argentina/Cordoba'})}</p>}
      <div className="flex flex-wrap gap-3"><Button variant="outline" disabled={pending||r.state==='processing'} onClick={()=>retry(r.reservation_id)}>{r.state==='synced'?'Verificar vínculo':'Reintentar / reconciliar'}</Button>
      {r.pageId&&<Button asChild variant="link"><a href={`https://www.notion.so/${r.pageId.replaceAll('-','')}`} target="_blank" rel="noreferrer">Abrir en Notion</a></Button>}
      {r.state==='review_required'&&<Button variant="outline" disabled={pending} onClick={()=>{if(window.confirm('Revisá el calendario de Notion y su papelera. Habilitar otra creación puede duplicar la reserva si ya existe una página. ¿Confirmás que no existe ninguna página de esta reserva?'))retry(r.reservation_id,true);}}>Confirmar ausencia y crear</Button>}</div>
    </li>)}</ul>}
  </div>;
}
