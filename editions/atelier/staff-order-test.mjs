import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createCatalogService} from '../../web/server/catalog-core.js';
import {createOnlineService} from '../../web/server/online-core.js';
let record=null;const catalog=createCatalogService({async read(){return structuredClone(record)},async write(value,etag){record={value:structuredClone(value),etag:String(Number(etag||0)+1)}},isConflict:()=>false});
const dish=(await catalog.menu()).find(d=>d.section==='drinks'&&!d.styles);
await catalog.save({id:dish.id,revision:(await catalog.admin()).revision,patch:{stock:3}});
const records=new Map();let stripeCalls=0;
const online=createOnlineService({inventory:catalog,config:{origin:'https://example.test',locations:[]},
 storage:{async read(id){return structuredClone(records.get(id)||null)},async write(id,value,etag){if(records.get(id)?.etag!==etag)throw Object.assign(new Error('Conflict'),{conflict:true});records.set(id,{value:structuredClone(value),etag:randomUUID()})},isConflict:e=>e.conflict,async all(){return [...records.values()].map(r=>structuredClone(r.value))}},
 payment:{ensureReady(){},async create(){stripeCalls++;return {id:'cs_x'}},async expire(){stripeCalls++;return {status:'expired'}}}});
const available=async()=>(await catalog.menu()).find(d=>d.id===dish.id).available;

// Takeaway at the counter: paid at once, gets a pickup number, stock consumed, prints.
const quote=await online.staffQuote({mode:'takeaway',customer:{name:'Pickup QA',phone:'91234567'},pickupDate:new Date(Date.now()+86400000+8*3600000).toISOString().slice(0,10),pickupTime:'11:30',items:[{id:dish.id,qty:2}]});
const take={requestId:randomUUID(),mode:'takeaway',customer:{name:'Pickup QA',phone:'91234567'},pickupDate:new Date(Date.now()+86400000+8*3600000).toISOString().slice(0,10),pickupTime:'11:30',counterMethod:'cash',items:[{id:dish.id,qty:2}],note:'少冰',expectedTotal:quote.total};
const a=await online.staffOrder(take);
assert.equal(a.status,'paid');assert.equal(a.paymentMethod,'counter');assert.equal(a.counterMethod,'cash');assert.ok(a.pickup?.number);assert.equal(a.total,quote.total);
assert.equal(await available(),1);
assert.equal((await online.staffOrder(take)).id,a.id);assert.equal(await available(),1,'a retry does not take stock twice');
// More than is left: refused, nothing printed.
const none={requestId:randomUUID(),mode:'takeaway',customer:{name:'Pickup QA',phone:'91234567'},pickupDate:new Date(Date.now()+86400000+8*3600000).toISOString().slice(0,10),pickupTime:'11:30',counterMethod:'cash',items:[{id:dish.id,qty:2}]};
await assert.rejects(online.staffOrder(none),/库存不足/);
assert.equal(records.get(none.requestId).value.status,'expired');assert.equal(await available(),1);
// Dine-in at the counter: service charge like any dine-in order, and it reaches the kitchen feed.
const dine=await online.staffOrder({requestId:randomUUID(),mode:'dinein',table:'a3',counterMethod:'card',items:[{id:dish.id,qty:1}]});
assert.equal(dine.table,'A3');assert.ok(dine.serviceCharge>0);assert.equal(await available(),0);
const feed=await online.feed();assert.deepEqual(feed.map(o=>o.id).sort(),[a.id,dine.id].sort());assert.ok(feed.every(o=>o.items.every(i=>i.printStation)));
await assert.rejects(online.staffOrder({requestId:randomUUID(),mode:'takeaway',customer:{name:'Pickup QA',phone:'91234567'},pickupDate:new Date(Date.now()+86400000+8*3600000).toISOString().slice(0,10),pickupTime:'11:30',counterMethod:'cash',items:[{id:dish.id,qty:1}]}),/售罄/);
assert.equal((await online.feed()).length,2);assert.equal(stripeCalls,0,'never touches Stripe');
await assert.rejects(online.staffOrder({...take,requestId:randomUUID(),counterMethod:'wechat'}),/收款方式/);
await assert.rejects(online.staffOrder({requestId:randomUUID(),mode:'dinein',counterMethod:'cash',items:[{id:dish.id,qty:1}]}),/桌号/);
// The staff screen's 已完成 clears a counter dine-in order too.
assert.equal(await online.resolve(dine.id),true);assert.deepEqual((await online.feed()).map(o=>o.id),[a.id]);
// The report counts them with the rest.
assert.equal((await online.report({})).totals.orders,2);
// A counter order can be refunded from the report; it is only recorded, never sent to Stripe.
const dineCents=Math.round(dine.total*100),rid=randomUUID();
assert.equal((await online.report({})).orders.find(o=>o.id===dine.id).canRefund,true);
assert.equal((await online.staffRefund({id:dine.id,refundId:rid,amountCents:dineCents,reason:'顾客取消'})).refundedCents,dineCents);
assert.equal((await online.staffRefund({id:dine.id,refundId:rid,amountCents:dineCents,reason:'顾客取消'})).refundedCents,dineCents,'repeat is a no-op');
await assert.rejects(online.staffRefund({id:a.id,refundId:randomUUID(),amountCents:Math.round(a.total*100)+1,reason:'x'}),/超过可退金额/);
const r=await online.report({});assert.equal(r.orders.find(o=>o.id===dine.id).refundCents,dineCents);assert.equal(r.totals.refundCents,dineCents);
assert.equal(stripeCalls,0,'refund never touches Stripe');
console.log('PASS staff order: counter cash/card orders print at once, priced like guest orders, stock held once, out-of-stock refused, refundable without Stripe.');
