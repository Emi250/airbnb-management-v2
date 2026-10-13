import {PageHeader} from '@/components/page-header';
import {ensureDashboardAdmin} from '../dashboard/_admin';
import {readAll} from '@/lib/queries/read-all';
import {IntegrationList} from './integration-list';
export default async function IntegrationsPage() {
  const db=await ensureDashboardAdmin();
  const [jobs,reservations]=await Promise.all([
    readAll(()=>db.from('notion_sync_jobs').select('*').order('reservation_id'),'el estado de Notion'),
    readAll(()=>db.from('reservations').select('id,check_in,status,notion_page_id,guest:guests(name),property:properties(name)').order('id'),'las reservas'),
  ]);
  const labels=new Map(reservations.data.map(r=>[r.id,{title:`${r.guest?.name??'Sin huésped'} · ${r.property?.name??'Sin propiedad'}`,date:r.check_in,pageId:r.notion_page_id}]));
  return <div><PageHeader title="Integraciones" description="Seguimiento de la sincronización de reservas con Notion"/>
    <p className="mb-5 text-sm text-muted-foreground">Los cambios se envían después de guardar. Los pendientes tienen un reintento diario automático; también podés reintentar acá. Una creación incierta requiere revisión para evitar duplicados.</p>
    {(!process.env.NOTION_TOKEN||!process.env.NOTION_DATABASE_ID)&&<p role="alert" className="mb-4 rounded-lg border border-border p-4">Falta configurar la conexión con Notion. Las reservas se conservan en el sitio.</p>}
    <IntegrationList rows={jobs.data.map(j=>({...j,...labels.get(j.reservation_id)}))}/></div>;
}
