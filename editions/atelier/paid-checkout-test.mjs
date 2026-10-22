import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createTableStore } from '../../web/server/table-state.js';
import { createOnlineService } from '../../web/server/online-core.js';
import orderEndpoint from '../../web/api/order.js';

const records = new Map(), sessions = new Map(); let seq = 0, payments = 0, providerDown = false;
const storage = {
  async read(id) { return structuredClone(records.get(id) || null); },
  async write(id, value, etag) {
    if ((records.get(id)?.etag || null) !== (etag || null)) throw Object.assign(new Error('CAS'), { conflict: true });
    records.set(id, { value: structuredClone(value), etag: String(++seq) });
  },
  isConflict: e => e.conflict,
  async all(prefix = '') { return [...records].filter(([id]) => id.startsWith(prefix)).map(([,r]) => structuredClone(r.value)); },
};
const dining = createTableStore(storage, { async read() { return {operations:[],orders:[]}; }, async feed() { return {events:[],activeIds:[]}; }, async resolve() {} });
const payment = {
  ensureReady() {},
  async create(order) {
    if (!sessions.has(order.id)) { payments++; sessions.set(order.id, { id: `cs_${order.id.replaceAll('-','')}`, client_secret: 'secret_fixture', status: 'open' }); }
    if (providerDown) throw new Error('Provider response lost');
    return structuredClone(sessions.get(order.id));
  },
  async expire(id) { const session = [...sessions.values()].find(s => s.id === id); if (session.status === 'paid') return { status: 'complete', payment_status: 'paid' }; session.status = 'expired'; return { ...session, payment_status: 'unpaid' }; },
};
const online = createOnlineService({ storage, payment, dining, config: {locations:[],origin:'https://restaurant.example'}, checkAddress: async () => ({distanceKm:0}) });
const add = (table, qty=1) => dining.mutate({ table, group:'A', opId:randomUUID(), deviceId:randomUUID(), kind:'delta', dishId:'lunch-v2-barley', delta:qty });
async function input(table) { const cart = await dining.cart(table, 'A'); return { requestId:randomUUID(), token:'a'.repeat(64), mode:'dinein', table, group:'A', items:cart.items, cartOpIds:cart.opIds, note:cart.note }; }
await add('A1');
const first = await input('A1'), rival = { ...first, requestId:randomUUID(), token:'b'.repeat(64) };
const results = await Promise.allSettled([online.checkout(first), online.checkout(rival)]);
assert.equal(results.filter(r=>r.status==='fulfilled').length,1, results.map(r=>r.reason?.message).join(' / '));
const chosen = results[0].status === 'fulfilled' ? first : rival;
const response = results.find(r=>r.status==='fulfilled').value;
assert.equal(payments,1,'One shared basket cannot generate competing charges');
assert.equal(response.clientSecret,'secret_fixture');
assert.equal('clientSecret' in response.order,false,'Never expose client secret in public receipts');
assert.equal((await dining.feed()).events.length,0,'Unpaid table order is not sent to staff');
assert.equal((await dining.cart('A1','A')).paymentPending,true);
await assert.rejects(add('A1'), e=>e.status===409 && e.code==='PAYMENT_PENDING');
assert.equal(results.find(r=>r.status==='rejected').reason.code,'PAYMENT_PENDING');
assert.equal((await online.checkout(chosen)).clientSecret,'secret_fixture');
assert.equal(payments,1,'Retry reuses original session');
const session = sessions.get(chosen.requestId);
const paid = {id:session.id,metadata:{dumpling_order_id:chosen.requestId},currency:'sgd',amount_total:385,payment_status:'paid'};
await assert.rejects(online.paymentEvent({...paid,amount_total:1}),e=>e.status===409);
await assert.rejects(online.paymentEvent({...paid,id:'cs_wrong'}),e=>e.status===409);
await online.paymentEvent({...paid,payment_status:'unpaid'});
assert.equal((await dining.feed()).events.length,0);
await Promise.all([online.paymentEvent(paid),online.paymentEvent(paid)]);
assert.equal((await dining.feed()).events.length,1,'Duplicate callbacks produce one staff order');
assert.equal((await online.feed()).length,0,'Dine-in is not duplicated in online staff feed');
assert.equal((await dining.cart('A1','A')).items.length,0);
assert.equal((await online.get(chosen.requestId,chosen.token)).fulfilmentCommitted,true);
const receipt=(await dining.cart('A1','A')).orders[0];
for(const field of ['tokenHash','sessionId','clientSecret','fingerprint','requestFingerprint']) assert.equal(field in receipt,false);
await assert.rejects(online.cancel(chosen),e=>e.status===409);
await add('A1');
const next=await input('A1');await online.checkout(next);
await online.cancel(next);
assert.equal((await dining.cart('A1','A')).items.length,1,'Cancel retains unpaid dishes');
assert.equal((await dining.cart('A1','A')).paymentPending,false);
const newer=await input('A1');await online.checkout(newer);
await online.cancel(next); // Old cancellation replay must not unlock newer payment.
assert.equal((await dining.cart('A1','A')).paymentPending,true);
await online.cancel(newer);
await add('B1');const lost=await input('B1');providerDown=true;
await assert.rejects(online.checkout(lost),/Provider response lost/);
assert.equal((await dining.cart('B1','A')).paymentPending,true);
providerDown=false;await online.cancel(lost);
assert.equal((await dining.cart('B1','A')).paymentPending,false,'Cancellation recovers a lost create response before expiring');
const bypass={setHeader(){},status(n){this.code=n;return this;},json(body){this.body=body;return this;}};
await orderEndpoint({method:'POST',body:{}},bypass);assert.equal(bypass.code,402);
assert.equal(await online.resolve(chosen.requestId),false,'Table staff resolution routes to the table store');
await dining.resolve(chosen.requestId);assert.equal((await dining.feed()).events.length,0);
console.log('PASS paid checkout: table reservation races, immutable basket, server totals, unpaid exclusion, retry/duplicate protection, secret redaction, cancel/recover, late cancellation isolation, and direct unpaid API rejection.');
