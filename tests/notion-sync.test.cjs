/* eslint-disable @typescript-eslint/no-require-imports */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { syncReservationToNotion } = require('../lib/notion/sync-reservation.ts');
const originalFetch=global.fetch;
const originalEnv={token:process.env.NOTION_TOKEN,database:process.env.NOTION_DATABASE_ID};
before(()=>{process.env.NOTION_TOKEN='test-token';process.env.NOTION_DATABASE_ID='test-database';});
after(()=>{global.fetch=originalFetch;for(const [key,value] of Object.entries({NOTION_TOKEN:originalEnv.token,NOTION_DATABASE_ID:originalEnv.database})) {if(value===undefined)delete process.env[key];else process.env[key]=value;}});
function client(pageId,status='confirmed',createStarted=false) {
  const finishes=[];let begins=0;
  const row={notion_page_id:pageId,status,check_in:'2026-10-01',check_out:'2026-10-03',num_guests:2,total_amount_ars:100000,amount_paid_ars:30000,bed_setup:'separate',guest:{name:'Prueba',phone:null},property:{name:'Unidad'}};
  return {finishes,get begins(){return begins;},rpc:async(name,args)=>{
    if(name==='claim_notion_sync')return {data:{generation:1,lock_token:'token',create_started:createStarted},error:null};
    if(name==='begin_notion_create'){begins++;return {data:true,error:null};}
    if(name==='finish_notion_sync'){finishes.push(args);return {data:true,error:null};}
    throw Error(name);
  },from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:row,error:null})})})})};
}
function stub(handler) {
  const calls=[];
  global.fetch=async(url,options)=>{
    calls.push({url,method:options.method,body:options.body?JSON.parse(options.body):null});assert.ok(options.signal);
    if(options.method==='GET')return Response.json({properties:{'Reserva ID':{type:'rich_text'}}});
    if(url.endsWith('/query'))return Response.json({results:[],has_more:false});
    return handler(url,options);
  };
  return calls;
}
test('un error de actualización queda registrado y nunca crea otra página',async()=>{
  for(const status of [404,429,500]) {
    const calls=stub(()=>new Response(JSON.stringify({message:'Error simulado'}),{status}));
    const db=client('existing-page');assert.match(await syncReservationToNotion(db,'r'),/pendiente/);
    assert.equal(db.finishes.at(-1).p_state,'error');assert.equal(db.finishes.at(-1).p_page_id,'existing-page');
    assert.equal(calls.filter(c=>c.url.endsWith('/pages')).length,0);assert.equal(db.begins,0);
  }
});
test('timeout de creación exige revisión; el reintento sin hallazgo no vuelve a crear',async()=>{
  const calls=stub(()=>{throw new DOMException('Timeout','TimeoutError');});
  const db=client(null);assert.match(await syncReservationToNotion(db,'r'),/pendiente/);
  assert.equal(db.finishes.at(-1).p_state,'review_required');assert.equal(db.begins,1);
  const retry=client(null,'confirmed',true);assert.match(await syncReservationToNotion(retry,'r',true),/revisión/);
  assert.equal(calls.filter(c=>c.url.endsWith('/pages')).length,1);assert.equal(retry.begins,0);
});
test('reconcilia una creación previa mediante el identificador estable',async()=>{
  const calls=[];global.fetch=async(url,options)=>{calls.push(options.method+' '+url);
    if(options.method==='GET')return Response.json({properties:{'Reserva ID':{type:'rich_text'}}});
    if(url.endsWith('/query'))return Response.json({results:[{id:'found-page'}],has_more:false});
    return Response.json({id:'found-page'});
  };
  const db=client(null,'confirmed',true);assert.equal(await syncReservationToNotion(db,'r',true),undefined);
  assert.equal(db.begins,0);assert.equal(db.finishes.at(-1).p_page_id,'found-page');assert.equal(db.finishes.at(-1).p_state,'synced');
  assert.ok(calls.at(-1).includes('PATCH'));assert.ok(!calls.some(c=>c==='POST https://api.notion.com/v1/pages'));
});
test('cancelar conserva el vínculo y reactivar restaura esa misma página',async()=>{
  const calls=stub(()=>Response.json({id:'existing-page'}));
  const cancelled=client('existing-page','cancelled');await syncReservationToNotion(cancelled,'r');
  const active=client('existing-page');await syncReservationToNotion(active,'r');
  assert.equal(cancelled.finishes.at(-1).p_page_id,'existing-page');
  assert.deepEqual(calls.filter(c=>c.method==='PATCH').map(c=>c.body.archived),[true,false]);
});
test('crear envía identidad y rechaza una respuesta sin ID',async()=>{
  let calls=stub(()=>Response.json({id:'new-page'}));let db=client(null);
  assert.equal(await syncReservationToNotion(db,'r'),undefined);
  assert.equal(calls.find(c=>c.url.endsWith('/pages')).body.properties['Reserva ID'].rich_text[0].text.content,'r');
  assert.equal(db.finishes.at(-1).p_page_id,'new-page');
  calls=stub(()=>Response.json({}));db=client(null);await syncReservationToNotion(db,'r');
  assert.equal(db.finishes.at(-1).p_state,'review_required');
});
