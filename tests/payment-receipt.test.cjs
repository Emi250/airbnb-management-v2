/* eslint-disable @typescript-eslint/no-require-imports */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const React=require('react');
const {PaymentReceipt}=require('../lib/pdf/payment-receipt.tsx');
test('genera comprobantes PDF para cobros y devoluciones con acentos',async()=>{
  const {renderToBuffer}=await import('@react-pdf/renderer');
  for(const kind of ['payment','refund']) {
    const payment={id:'11111111-1111-4111-8111-111111111111',reservation_id:'22222222-2222-4222-8222-222222222222',
      kind,amount_ars:12345.67,paid_on:'2026-10-12',method:'transfer',reference:'Transferencia Nº 12',receipt_url:null,
      notes:'Verificación de generación; datos ficticios.',actor_id:null,actor_name:'Operación de prueba',created_at:'2026-10-12T15:00:00Z'};
    const pdf=await renderToBuffer(React.createElement(PaymentReceipt,{payment,guest:'Huésped de prueba',property:'Departamento de prueba'}));
    assert.equal(pdf.subarray(0,4).toString(),'%PDF');assert.ok(pdf.length>1500);
  }
});
