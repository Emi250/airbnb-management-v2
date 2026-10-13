import Link from 'next/link';
import {PageHeader} from '@/components/page-header';
import {Button} from '@/components/ui/button';
import {AuditHistory} from '@/components/audit-history';
import {ensureDashboardAdmin} from '../dashboard/_admin';

export default async function ActivityPage({searchParams}:{searchParams:Promise<{page?:string;entity?:string}>}) {
  const params=await searchParams;
  const page=Math.max(1,Math.min(100000,Math.floor(Number(params.page)||1)));
  const allowed=['guests','reservations','reservation_payments','expenses'];
  const entity=allowed.includes(params.entity??'')?params.entity:'';
  const db=await ensureDashboardAdmin();
  let query=db.from('audit_events').select('*').order('occurred_at',{ascending:false}).order('id');
  if(entity)query=query.eq('entity_type',entity);
  const {data,error}=await query.range((page-1)*50,page*50);
  if(error)throw Error('No se pudo cargar el historial');
  const url=(p:number)=>`/activity?page=${p}${entity?`&entity=${entity}`:''}`;
  return <div className="max-w-4xl"><PageHeader title="Actividad" description="Quién creó, modificó o eliminó registros, con el detalle de cada cambio"/>
    <nav aria-label="Filtrar actividad" className="flex flex-wrap gap-3">{[['','Todo'],['guests','Huéspedes'],['reservations','Reservas'],['reservation_payments','Pagos'],['expenses','Gastos']].map(([key,label])=>
      <Button key={key} asChild variant={entity===key?'default':'outline'}><Link href={`/activity${key?`?entity=${key}`:''}`}>{label}</Link></Button>)}</nav>
    <AuditHistory events={(data??[]).slice(0,50)} showEntity/>
    <div className="mt-5 flex items-center gap-4">{page>1&&<Button asChild variant="outline"><Link href={url(page-1)}>Anterior</Link></Button>}<span className="text-sm">Página {page}</span>{(data?.length??0)>50&&<Button asChild variant="outline"><Link href={url(page+1)}>Siguiente</Link></Button>}</div>
  </div>;
}
