'use client';
import {useRef,useState,useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {toast} from 'sonner';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import type {Payment} from '@/types/supabase';
import type {PaymentInput} from '@/lib/schemas';
import {PAYMENT_METHODS,PAYMENT_KINDS} from '@/lib/payment-options';
import {businessDateISO} from '@/lib/dates';
import {formatCurrency,formatDateShort} from '@/lib/format';
import {recordPaymentAction} from './payment-actions';

export function PaymentLedger({reservationId,version,payments,balance,paid,cancelled}:{reservationId:string;version:number;payments:Payment[];balance:number;paid:number;cancelled:boolean}) {
  const router=useRouter();const [pending,start]=useTransition();const [kind,setKind]=useState<'payment'|'refund'>(cancelled?'refund':'payment');
  const requestId=useRef<string|null>(null);const formRef=useRef<HTMLFormElement>(null);
  return <section className="mt-8 border-t border-border pt-6" aria-label="Movimientos de pago">
    <h2 className="text-lg font-semibold">Movimientos de pago</h2>
    <p className="mt-1 text-sm text-muted-foreground">Cada cobro o devolución conserva su fecha y responsable. Para corregir un cobro, registrá su devolución y el importe correcto.</p>
    <div className="my-4 space-y-3">{payments.length===0?<p className="text-sm text-muted-foreground">Todavía no hay movimientos.</p>:payments.map(p=><article key={p.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border p-4">
      <div className="min-w-0 space-y-1"><p className="font-medium">{PAYMENT_KINDS[p.kind]} · {formatCurrency(p.amount_ars)}</p>
        <p className="text-sm text-muted-foreground">{p.paid_on?formatDateShort(p.paid_on):'Fecha no documentada'} · {p.method==='legacy'?'Medio no documentado':PAYMENT_METHODS[p.method as keyof typeof PAYMENT_METHODS]} · {p.actor_name}</p>
        {p.reference&&<p className="text-sm">Referencia: {p.reference}</p>}{p.notes&&<p className="max-w-xl whitespace-pre-wrap break-words text-sm text-muted-foreground">{p.notes}</p>}
      </div><div className="flex gap-3 text-sm">{p.receipt_url&&<a className="underline" href={p.receipt_url} target="_blank" rel="noreferrer">Adjunto</a>}
        {p.kind!=='opening_balance'&&<a className="underline" href={`/reservations/${reservationId}/recibo?payment=${p.id}`} download>Comprobante PDF</a>}</div>
    </article>)}</div>
    <form ref={formRef} className="space-y-4 rounded-xl border border-border bg-card p-5" onSubmit={e=>{e.preventDefault();const form=new FormData(e.currentTarget);requestId.current??=crypto.randomUUID();
      const data:PaymentInput={id:requestId.current,kind,amount_ars:Number(form.get('amount_ars')),paid_on:String(form.get('paid_on')),method:String(form.get('method')) as PaymentInput['method'],reference:String(form.get('reference')),receipt_url:String(form.get('receipt_url')),notes:String(form.get('notes'))};
      start(async()=>{const r=await recordPaymentAction(reservationId,version,data);if(!r.success){toast.error(r.error);return;}toast.success('Movimiento registrado');requestId.current=null;formRef.current?.reset();router.refresh();});
    }}>
      <h3 className="font-medium">Registrar movimiento</h3><div className="grid gap-4 sm:grid-cols-2">
      <label className="space-y-2 text-sm"><span>Tipo</span><select className="h-10 w-full rounded-md border border-input bg-background px-3" value={kind} onChange={e=>{setKind(e.target.value as typeof kind);requestId.current=null;}}>
        {!cancelled&&<option value="payment">Cobro</option>}<option value="refund">Devolución</option></select></label>
      <label className="space-y-2 text-sm"><span>Importe en pesos</span><Input name="amount_ars" type="number" min="0.01" step="0.01" max={kind==='refund'?paid:Math.max(balance,0)} required/><span className="text-xs text-muted-foreground">Máximo: {formatCurrency(kind==='refund'?paid:Math.max(balance,0))}</span></label>
      <label className="space-y-2 text-sm"><span>Fecha del movimiento</span><Input name="paid_on" type="date" required defaultValue={businessDateISO()}/></label>
      <label className="space-y-2 text-sm"><span>Medio</span><select name="method" className="h-10 w-full rounded-md border border-input bg-background px-3" defaultValue="transfer">{Object.entries(PAYMENT_METHODS).map(([k,label])=><option value={k} key={k}>{label}</option>)}</select></label>
      <label className="space-y-2 text-sm"><span>Referencia o número de comprobante</span><Input name="reference" maxLength={200}/></label>
      <label className="space-y-2 text-sm"><span>Enlace al comprobante (opcional)</span><Input name="receipt_url" type="url" placeholder="https://…"/></label>
      <label className="space-y-2 text-sm sm:col-span-2"><span>{kind==='refund'?'Motivo de la devolución':'Notas (opcional)'}</span><Textarea name="notes" maxLength={2000} required={kind==='refund'}/></label>
      </div><Button disabled={pending||(kind==='payment'?balance<=0:paid<=0)}>{pending?'Registrando…':kind==='refund'?'Registrar devolución':'Registrar cobro'}</Button>
    </form>
  </section>;
}
