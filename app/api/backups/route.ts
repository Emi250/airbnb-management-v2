import {createClient} from '@/lib/supabase/server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET() {
  const db=await createClient();
  const {data:{user}}=await db.auth.getUser();
  if(!user)return new Response('No autenticado',{status:401});
  const {data:role}=await db.from('user_roles').select('role').eq('user_id',user.id).maybeSingle();
  if(role?.role!=='admin')return new Response('Acceso restringido',{status:403});
  const {data,error}=await db.rpc('export_business_backup');
  if(error)return new Response('No se pudo generar el respaldo',{status:500});
  return new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json; charset=utf-8',
    'Content-Disposition':`attachment; filename="respaldo-refugio-${new Date().toISOString().slice(0,10)}.json"`,
    'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
