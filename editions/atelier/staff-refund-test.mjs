import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {createCatalogService} from '../../web/server/catalog-core.js';
import {createOnlineService,publicOrder} from '../../web/server/online-core.js';
let record=null;const catalog=createCatalogService({async read(){return structuredClone(record)},async write(value,etag){record={value:structuredClone(value),etag:String(Number(etag||0)+1)}},isConflict:()=>false});
const dish=(await catalog.menu()).find(d=>d.section==='drinks'&&!d.styles);
const records=new Map(),calls=[];let stripe='ok';
const online=createOnlineService({inventory:catalog,config:{origin:'https://example.test',locations:[{id:'shop',name:'Shop',address:'1 Road'}]},
 storage:{async read(id){return structuredClone(records.get(id)||null)},async write(id,value,etag){if(records.get(id)?.etag!==etag)throw Object.assign(new Error('Conflict'),{conflict:true});records.set(id,{value:structuredClone(value),etag:randomUUID()})},isConflict:e=>e.conflict,async all(){return [...records.values()].map(r=>structuredClone(r.value))}},
 payment:{ensureReady(){},async create(o){return {id:'cs_'+o.id.replaceAll('-',''),client_secret:'secret'}},async expire(){return {status:'expired',payment_status:'unpaid'}},
  async refund(r){calls.push(r);if(stripe==='down')throw new Error('timeout');if(stripe==='reject')throw Object.assign(new Error('Refund exceeds charge'),{rejected:true});return {id:'re_'+calls.length,status:'succeeded'}}}});
const input={requestId:randomUUID(),token:randomBytes(32).toString('hex'),mode:'takeaway',pickupLocation:'shop',items:[{id:dish.id,qty:2}]};
await online.checkout(input);const id=input.requestId,order=records.get(id).value,total=Math.round(order.total*100);
await online.paymentEvent({id:'cs_'+id.replaceAll('-',''),metadata:{dumpling_order_id:id},currency:'sgd',amount_total:total,payment_status:'paid',payment_intent:'pi_'+id});
const refund=(amountCents,refundId=randomUUID())=>online.staffRefund({id,refundId,amountCents,reason:'售罄'});

// Partial refund goes straight to Stripe and shows on the order at once.
const first=await refund(100);
assert.equal(first.refundedCents,100);assert.equal(calls.length,1);assert.equal(calls[0].paymentIntentId,'pi_'+id);assert.equal(calls[0].amountCents,100);
assert.equal(first.cardRefunds,undefined,'refund records stay private');
// Never more than was paid.
await assert.rejects(refund(total),/超过可退金额/);assert.equal(calls.length,1,'over-refund never reaches Stripe');
// Unconfirmed result keeps the reservation; retrying the same request reuses its id, so Stripe cannot refund twice.
stripe='down';const retryId=randomUUID();
await assert.rejects(refund(50,retryId),/未确认/);
await assert.rejects(refund(total-100-49),/超过可退金额/,'the unconfirmed 0.50 is still held');
stripe='ok';const again=await refund(50,retryId);
assert.equal(calls.at(-1).id,retryId,'same idempotency id on retry');assert.equal(again.refundedCents,150);
assert.equal(await refund(50,retryId).then(o=>o.refundedCents),150,'repeating a finished refund is a no-op');
assert.equal(calls.length,3);
// A definite Stripe rejection releases the hold.
stripe='reject';await assert.rejects(refund(10),/退款失败/);stripe='ok';
const rest=await refund(total-150);assert.equal(rest.refundedCents,total);
// The webhook afterwards keeps the larger, exact figure.
await online.refundEvent({metadata:{dumpling_order_id:id},payment_intent:'pi_'+id,currency:'sgd',amount:total,amount_refunded:total});
assert.equal(records.get(id).value.refundedCents,total);
// Wallet-paid and unpaid orders are refused here.
await assert.rejects(online.staffRefund({id:randomUUID(),refundId:randomUUID(),amountCents:100,reason:'x'}),/付款成功/);
console.log('PASS staff refund: straight to Stripe, partial refunds, no over-refund, retries reuse one idempotency id, rejections release the hold, webhook reconciles.');
