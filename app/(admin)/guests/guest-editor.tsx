'use client';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { Guest } from '@/types/supabase';
import { matchingGuests } from '@/lib/guest-matches';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter } from '@/components/ui/dialog';
import { updateGuestAction,mergeGuestsAction } from './actions';

export function GuestEditor({guest,guests,reservationCount}:{guest:Guest;guests:Guest[];reservationCount:number}) {
  const router=useRouter();const [pending,start]=useTransition();const [targetId,setTargetId]=useState('');
  const [confirm,setConfirm]=useState(false);const [search,setSearch]=useState('');
  const [form,setForm]=useState({name:guest.name,phone:guest.phone??'',email:guest.email??'',country:guest.country??'',notes:guest.notes??''});
  const matches=useMemo(()=>matchingGuests(guests,form.phone,form.email,guest.id),[guests,form.phone,form.email,guest.id]);
  const target=guests.find(g=>g.id===targetId);
  const candidates=guests.filter(g=>g.id!==guest.id && !g.merged_into && `${g.name} ${g.email??''} ${g.phone??''}`.toLowerCase().includes(search.toLowerCase()));
  return <section className="my-6 space-y-6 rounded-xl border border-border bg-card p-5">
    <form onSubmit={e=>{e.preventDefault();start(async()=>{const r=await updateGuestAction(guest.id,guest.version,form);if(!r.success){toast.error(r.error);return;}toast.success('Datos actualizados');router.refresh();});}}>
      <h2 className="mb-4 text-lg font-semibold">Datos del huésped</h2>
      <div className="grid gap-4 sm:grid-cols-2">{(['name','phone','email','country'] as const).map(key=><label key={key} className="space-y-2 text-sm">
        <span>{({name:'Nombre',phone:'Teléfono',email:'Email',country:'País'})[key]}</span>
        <Input required={key==='name'} type={key==='email'?'email':'text'} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})}/>
      </label>)}<label className="space-y-2 text-sm sm:col-span-2"><span>Notas</span><Textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label></div>
      {matches.length>0 && <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">El contacto coincide con: {matches.map(g=>g.name).join(', ')}. Revisá las fichas antes de unificarlas.</p>}
      <Button className="mt-4" disabled={pending}>{pending?'Guardando…':'Guardar datos'}</Button>
    </form>
    <details className="border-t border-border pt-4"><summary className="cursor-pointer font-medium">Unificar una ficha duplicada</summary>
      <p className="my-3 text-sm text-muted-foreground">Las {reservationCount} reservas de esta ficha pasarán a la ficha que elijas. Se conservan los datos de la principal; sus campos vacíos se completan con esta ficha. Las notas se combinan y el original queda archivado.</p>
      <label className="block space-y-2 text-sm"><span>Buscar ficha principal</span><Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Nombre, teléfono o email"/></label>
      <label className="mt-3 block space-y-2 text-sm"><span>Ficha que se conservará</span><select className="h-10 w-full rounded-md border border-input bg-background px-3" value={targetId} onChange={e=>setTargetId(e.target.value)}>
        <option value="">Seleccionar ficha</option>{candidates.map(g=><option key={g.id} value={g.id}>{g.name} · {g.phone||g.email||'Sin contacto'}</option>)}
      </select></label>
      <Button type="button" variant="outline" className="mt-4" disabled={!target||pending} onClick={()=>setConfirm(true)}>Revisar unificación</Button>
    </details>
    <Dialog open={confirm} onOpenChange={setConfirm}><DialogContent><DialogHeader><DialogTitle>Confirmar unificación</DialogTitle><DialogDescription>
      Se archivará la ficha de {guest.name} y sus reservas quedarán en {target?.name}. No se eliminará el historial.
    </DialogDescription></DialogHeader><div className="space-y-2 text-sm"><p>Contacto principal: {target?.phone||'Sin teléfono'} · {target?.email||'Sin email'}</p><p>Revisá que ambas fichas correspondan a la misma persona.</p></div>
      <DialogFooter><Button variant="outline" onClick={()=>setConfirm(false)}>Volver</Button><Button disabled={pending||!target} onClick={()=>start(async()=>{
        if(!target)return;const r=await mergeGuestsAction(guest.id,target.id,guest.version,target.version);if(!r.success){toast.error(r.error);return;}
        toast.success('Fichas unificadas');setConfirm(false);router.push(`/guests/${r.id}`);router.refresh();
      })}>{pending?'Unificando…':'Unificar fichas'}</Button></DialogFooter></DialogContent></Dialog>
  </section>;
}
