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
const input={requestId:randomUUID(),token:randomBytes(32).toString('hex'),mode:'takeaway',customer:{name:'Pickup QA',phone:'91234567'},pickupDate:new Date(Date.now()+86400000+8*3600000).toISOString().slice(0,10),pickupTime:'11:30',pickupLocation:'shop',items:[{id:dish.id,qty:2}]};
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

// Item quantities are reserved atomically, including uncertain provider results.
const itemId=randomUUID();
const itemOrder={...structuredClone(order),id:itemId,inventoryManaged:false,status:'paid',paymentIntentId:'pi_items',total:19.8,discount:2,items:[{id:'a',name:'面',price:10,qty:2}],cardRefunds:{},refundedCents:0};
records.set(itemId,{value:itemOrder,etag:randomUUID()});
const itemRequest={id:itemId,refundId:randomUUID(),reason:'售罄',amountCents:990,items:[{line:0,qty:1}]};
stripe='down';await assert.rejects(online.staffRefund(itemRequest),/未确认/);
await assert.rejects(online.staffRefund({...itemRequest,refundId:randomUUID(),amountCents:1980,items:[{line:0,qty:2}]}),/份数不足/);
stripe='ok';await online.staffRefund(itemRequest);
const callCount=calls.length;await online.staffRefund(itemRequest);assert.equal(calls.length,callCount);
await assert.rejects(online.staffRefund({...itemRequest,items:[{line:0,qty:2}]}),/请求不一致/);
await assert.rejects(online.staffRefund({...itemRequest,refundId:randomUUID(),amountCents:1000}),/金额已变化/);
await online.staffRefund({...itemRequest,refundId:randomUUID()});
await assert.rejects(online.staffRefund({...itemRequest,refundId:randomUUID()}),/份数不足/);
const {refundItems}=await import('../../web/server/refund-items.js');
assert.equal(refundItems(records.get(itemId).value).rows[0].used,2);
assert.equal(refundItems(records.get(id).value).unavailable,'此单已有按金额退款，请继续按金额退款');
const allocation=refundItems({total:10.01,items:[{id:'a',price:5,qty:3},{id:'b',price:0,qty:1}]});
assert.equal(allocation.rows.flatMap(r=>r.unitCents).reduce((s,c)=>s+c,0),1001);
assert.deepEqual(allocation.rows[1].unitCents,[0]);
console.log('PASS item refunds: service/discount allocation, quantities reserved, uncertain retry, duplicate prevention, amount tampering, rounding, free items.');
// Receipt printing is independent from refund execution; it cannot refund money again.
const {refundReceipts,refundPrintJobs}=await import('../../web/server/refund-receipt.js');
const saved=records.get(id).value, receipts=refundReceipts(saved);
assert(receipts.length>0);assert(receipts.every(r=>r.method==='original'));
assert.equal(refundPrintJobs(saved).length,receipts.length);
const attemptsBefore=calls.length, copyId=randomUUID(), print={id,refundId:receipts[0].refundId,copyId};
assert.equal((await online.reprintRefund(print)).queued,true);
await online.reprintRefund(print);
assert.equal(calls.length,attemptsBefore,'printing never calls Stripe');
assert.equal(Object.keys(records.get(id).value.refundReceiptCopies).length,1,'uncertain retry queues one copy');
assert.equal(publicOrder(records.get(id).value).refundReceiptCopies,undefined);
await assert.rejects(online.reprintRefund({...print,refundId:randomUUID(),copyId:randomUUID()}),/尚未确认/);
const printerFeed=await online.feed(true);
assert(printerFeed.refundPrintJobs.some(j=>j.reprint));
assert(printerFeed.refundPrintJobs.every(j=>j.method==='original'));
assert.deepEqual(refundReceipts({...saved,cardRefunds:{pending:{status:'reserved',amountCents:100},failed:{status:'failed',amountCents:100}}}),[]);
assert.equal(refundReceipts({id:'cash',paymentMethod:'counter',counterMethod:'cash',refundCompleted:false,refundRequests:{r:{amountCents:100}}}).length,0);
console.log('PASS refund receipts: confirmed-only, durable auto jobs, reprint idempotency, no additional refund call, private copies hidden, pending/failed excluded.');
