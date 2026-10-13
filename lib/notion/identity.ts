const VERSION='2022-06-28';
type NotionObject={id?:string;properties?:Record<string,{type:string}>;results?:{id:string}[];has_more?:boolean};
async function request(path:string,method:string,body?:unknown):Promise<NotionObject> {
  const token=process.env.NOTION_TOKEN;if(!token)throw Error('Notion no está configurado');
  const response=await fetch('https://api.notion.com/v1'+path,{method,headers:{Authorization:`Bearer ${token}`,'Notion-Version':VERSION,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw Error(`Notion respondió HTTP ${response.status}`);
  return response.json();
}
export async function ensureNotionIdentity() {
  const id=process.env.NOTION_DATABASE_ID;if(!id)throw Error('Falta configurar el calendario de Notion');
  const database=await request(`/databases/${id}`,'GET');
  if(database.properties?.['Reserva ID']) {
    if(database.properties['Reserva ID'].type!=='rich_text')throw Error('La columna Reserva ID de Notion debe ser de texto');
    return;
  }
  await request(`/databases/${id}`,'PATCH',{properties:{'Reserva ID':{rich_text:{}}}});
}
export async function findNotionReservation(id:string):Promise<string|null> {
  const result=await request(`/databases/${process.env.NOTION_DATABASE_ID}/query`,'POST',{filter:{property:'Reserva ID',rich_text:{equals:id}},page_size:2});
  if(!Array.isArray(result.results))throw Error('Respuesta de Notion incompleta');
  if(result.results.length>1 || result.has_more)throw Error('Hay varias páginas con el mismo identificador. Revisar en Notion.');
  return result.results[0]?.id??null;
}
