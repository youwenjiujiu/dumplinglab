import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {createCatalogService} from '../../web/server/catalog-core.js';
import {createOnlineService,PAYMENT_WINDOW_MS} from '../../web/server/online-core.js';
let clock=Date.parse('2026-10-21T10:00:00Z');const now=()=>new Date(clock);
let record=null;const catalog=createCatalogService({async read(){return structuredClone(record)},async write(value,etag){record={value:structuredClone(value),etag:String(Number(etag||0)+1)}},isConflict:()=>false},{now});
const dish=(await catalog.menu()).find(d=>d.section==='drinks'&&!d.styles);
await catalog.save({id:dish.id,revision:(await catalog.admin()).revision,patch:{stock:3}});
const records=new Map(),expired=[];let stripeState='expired';
const online=createOnlineService({inventory:catalog,now,config:{origin:'https://example.test',locations:[{id:'shop',name:'Shop',address:'1 Road'}]},
 storage:{async read(id){return structuredClone(records.get(id)||null)},async write(id,value,etag){if(records.get(id)?.etag!==etag)throw Object.assign(new Error('Conflict'),{conflict:true});records.set(id,{value:structuredClone(value),etag:randomUUID()})},isConflict:e=>e.conflict,async all(){return [...records.values()].map(r=>structuredClone(r.value))}},
 payment:{ensureReady(){},async create(o){return {id:'cs_'+o.id.replaceAll('-',''),client_secret:'secret'}},async expire(id){expired.push(id);return stripeState==='complete'?{status:'complete',payment_status:'paid'}:{status:'expired',payment_status:'unpaid'}}}});
const start=async()=>{const input={requestId:randomUUID(),token:randomBytes(32).toString('hex'),mode:'takeaway',pickupLocation:'shop',items:[{id:dish.id,qty:2}]};await online.checkout(input);return input.requestId};
const available=async()=>(await catalog.menu()).find(d=>d.id===dish.id).available;

const first=await start();
assert.equal(await available(),1,'checkout holds the stock');
let pending=await online.pendingPayments();
assert.equal(Date.parse(pending[0].expiresAt)-Date.parse(pending[0].at),15*60000,'the back office shows a 15-minute expiry');
clock+=14*60000;await online.feed();
assert.equal(records.get(first).value.status,'awaiting_payment','still payable at 14 minutes');assert.equal(expired.length,0);
clock+=60000;await online.feed();
assert.equal(records.get(first).value.status,'expired','released at 15 minutes');
assert.equal(records.get(first).value.cancelledBy,'timeout');
assert.equal(expired.length,1,'the Stripe link is voided first');
assert.equal(await available(),3,'stock comes back');
assert.equal((await online.pendingPayments()).length,0);

// A customer who completes payment at the last moment keeps the order.
const second=await start();clock+=PAYMENT_WINDOW_MS;stripeState='complete';
await online.pendingPayments();
assert.equal(records.get(second).value.status,'awaiting_payment','a paid link is not released');
assert.equal(await available(),1,'its stock stays held for the payment webhook');

// Stripe's own expiry stays above its 30-minute minimum for any link we create in our window.
process.env.DL_ORDER_ORIGIN||='https://example.test';
const {stripeCheckoutParams}=await import('../../web/server/online-production.js');
const at='2026-10-21T10:00:00.000Z',expiresAt=Number(stripeCheckoutParams({id:'x',no:'1',mode:'takeaway',at,total:3,subtotal:3,deliveryFee:0}).get('expires_at'));
assert(expiresAt-Date.parse(at)/1000-PAYMENT_WINDOW_MS/1000>=30*60,'Stripe minimum respected');
console.log('PASS payment timeout: 15-minute hold, Stripe link voided before release, last-moment payments kept, Stripe expiry above its minimum.');
