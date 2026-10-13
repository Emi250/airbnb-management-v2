import {Document,Page,Text,View} from '@react-pdf/renderer';
import type {Payment} from '@/types/supabase';
import {PAYMENT_METHODS} from '@/lib/payment-options';
import {formatCurrency,formatDateShort} from '@/lib/format';
export function PaymentReceipt({payment,guest,property}:{payment:Payment;guest:string;property:string}) {
  const lines=[['Huésped',guest],['Alojamiento',property],['Fecha',payment.paid_on?formatDateShort(payment.paid_on):'No documentada'],
    ['Importe',formatCurrency(payment.amount_ars)],['Medio',PAYMENT_METHODS[payment.method as keyof typeof PAYMENT_METHODS]??payment.method],
    ['Referencia',payment.reference||'—'],['Registrado por',payment.actor_name]];
  return <Document><Page size="A4" style={{padding:48,fontFamily:'Helvetica',color:'#28231f'}}>
    <Text style={{fontSize:13,marginBottom:26,color:'#906549'}}>REFUGIO DEL CORAZÓN</Text>
    <Text style={{fontSize:25,marginBottom:8}}>Comprobante de {payment.kind==='refund'?'devolución':'cobro'}</Text>
    <Text style={{fontSize:9,marginBottom:30}}>Movimiento {payment.id}</Text>
    {lines.map(([label,value])=><View key={label} style={{flexDirection:'row',paddingVertical:10,borderBottomWidth:0.5,borderBottomColor:'#ded7cd'}}><Text style={{width:145,fontSize:10,color:'#73685f'}}>{label}</Text><Text style={{flex:1,fontSize:11}}>{value}</Text></View>)}
    {payment.notes&&<Text style={{fontSize:10,marginTop:25,lineHeight:1.5}}>{payment.notes}</Text>}
    <Text style={{fontSize:9,marginTop:36,color:'#73685f'}}>Este documento corresponde únicamente al movimiento indicado.</Text>
  </Page></Document>;
}
