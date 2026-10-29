// Immutable refund data only. These helpers never initiate a payment or refund.
export function refundReceipts(order) {
  const records=[...Object.entries(order.cardRefunds||{}).filter(([,r])=>r.status==='succeeded').map(([id,r])=>({id,...r,method:'original'})),
    ...Object.entries(order.refundRequests||{}).filter(()=>order.refundCompleted).map(([id,r])=>({id,...r,method:order.paymentMethod==='wallet'?'wallet':order.counterMethod==='cash'?'cash':'terminal'}))];
  return records.map(r=>{
    const foodCents=(r.items||[]).reduce((sum,x)=>sum+Math.round(Number(order.items[x.line]?.price||0)*100)*x.qty,0);
    const fullFood=Math.round(Number(order.foodTotal??order.subtotal??0)*100),total=Math.round(Number(order.total||0)*100);
    const split=foodCents>0&&fullFood>0&&!order.discount&&!order.loyalty?.discountCents&&Math.round(foodCents*total/fullFood)===r.amountCents&&r.amountCents>=foodCents;
    return { ...(split?{itemRefundCents:foodCents,serviceRefundCents:r.amountCents-foodCents}:{}),refundId:r.id,orderId:order.id,orderNo:order.no||order.id.slice(0,8),table:order.table||null,pickupNumber:order.pickup?.number||null,
    at:r.receiptAt||r.at,autoAt:r.receiptAt||null,amountCents:r.amountCents,method:r.method,reason:r.reason,
    reference:r.stripeRefundId||r.id,counterConfirmed:r.counterConfirmed===true,
    items:(r.items||[]).map(x=>{const i=order.items[x.line];return {name:i.name,englishName:i.englishName||globalThis.MENU?.find(d=>d.id===i.id)?.name||'',style:i.style||'',qty:x.qty};})};});
}
export function refundPrintJobs(order) {
  const receipts=refundReceipts(order), jobs=receipts.filter(r=>r.autoAt).map(r=>({...r,id:`refund:${order.id}:${r.refundId}`,createdAt:r.autoAt,reprint:false}));
  for(const [id,copy] of Object.entries(order.refundReceiptCopies||{})){
    const r=receipts.find(r=>r.refundId===copy.refundId);
    if(r)jobs.push({...r,id:`refund:${order.id}:${copy.refundId}:${id}`,createdAt:copy.at,reprint:true});
  }
  return jobs;
}
