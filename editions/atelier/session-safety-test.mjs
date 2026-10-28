import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createTableStore} from '../../web/server/table-state.js';
import {createOnlineService} from '../../web/server/online-core.js';
let clock=Date.now(),failOrderWrite=false;
const rows=new Map(),sessions=new Map();
const storage={async read(id){return structuredClone(rows.get(id)||null)},async write(id,value,etag){if(failOrderWrite&&!id.startsWith('dumplinglab-tables/'))throw Error('Injected order storage outage');if((rows.get(id)?.etag||null)!==(etag||null))throw Object.assign(Error('Conflict'),{conflict:true});rows.set(id,{value:structuredClone(value),etag:randomUUID()})},isConflict:e=>e.conflict,async all(prefix=''){return [...rows].filter(([k])=>k.startsWith(prefix)).map(([,r])=>structuredClone(r.value))}};
const dining=createTableStore(storage,{async read(){return {operations:[],orders:[]}},async feed(){return {events:[],activeIds:[]}}});
const payment={ensureReady(){},async create(o){if(!sessions.has(o.id))sessions.set(o.id,{id:'cs_'+o.id.replaceAll('-',''),client_secret:'fixture'});return sessions.get(o.id)},async expire(){return {status:'expired',payment_status:'unpaid'}}};
const online=createOnlineService({storage,dining,payment,config:{locations:[],origin:'https://example.test'},now:()=>new Date(clock)});
const add=(table,group='A')=>dining.mutate({table,group,opId:randomUUID(),deviceId:randomUUID(),kind:'delta',dishId:'lunch-v2-barley',delta:1});
async function input(table,group='A'){const c=await dining.cart(table,group);return {requestId:randomUUID(),token:'a'.repeat(64),mode:'dinein',table,group,items:c.items,cartOpIds:c.opIds,note:c.note}}
// Lost connection between the table reservation and separate online-order write.
await add('ORPHAN');const orphan=await input('ORPHAN');failOrderWrite=true;
await assert.rejects(online.checkout(orphan),/Injected/);failOrderWrite=false;
assert.equal(await storage.read(orphan.requestId),null);assert.equal((await dining.cart('ORPHAN','A')).paymentPending,true);
clock+=86400000;await online.pendingPayments();
assert.equal((await dining.cart('ORPHAN','A')).paymentPending,true);
await online.recoverTablePayment('ORPHAN','A');
assert.equal((await dining.cart('ORPHAN','A')).paymentPending,false);
assert.equal((await storage.read(orphan.requestId)).value.status,'expired');
await assert.rejects(online.checkout(orphan),e=>e.status===410);
console.log('PASS orphan hold: missing order safely tombstoned before release; delayed retry cannot resurrect payment.');
// Expiry relies on staff feed polling; customer reads do not expire card sessions.
clock=Date.now();await add('TIMEOUT');const timeout=await input('TIMEOUT');await online.checkout(timeout);clock+=60*60000;
assert.equal((await online.get(timeout.requestId,timeout.token)).status,'expired');
assert.equal((await dining.cart('TIMEOUT','A')).paymentPending,false);
console.log('PASS customer expiry: stale card session expires safely without staff polling.');
// New party, same day, same permanent QR code: no seating boundary.
clock=Date.now();await add('TURNOVER');const paid=await input('TURNOVER');await online.checkout(paid);const session=sessions.get(paid.requestId);
await online.paymentEvent({id:session.id,metadata:{dumpling_order_id:paid.requestId},currency:'sgd',amount_total:385,payment_status:'paid'});
await dining.resolve(paid.requestId);
assert.equal((await dining.cart('TURNOVER','A')).orders.length,1);
const previous=await dining.cart('TURNOVER','A');
await online.endTableSession({table:'TURNOVER',group:'A',tableSession:previous.tableSession});
const fresh=await dining.cart('TURNOVER','A');assert.equal(fresh.orders.length,0);assert.equal(fresh.items.length,0);
assert.notEqual(fresh.tableSession,previous.tableSession);
await assert.rejects(dining.cart('TURNOVER','A','',previous.tableSession),e=>e.code==='TABLE_SESSION_ENDED');
await assert.rejects(add('TURNOVER'),e=>e.code==='TABLE_SESSION_ENDED');
await dining.mutate({table:'TURNOVER',group:'A',tableSession:fresh.tableSession,opId:randomUUID(),deviceId:randomUUID(),kind:'delta',dishId:'lunch-v2-barley',delta:1});
const next={...await input('TURNOVER'),tableSession:fresh.tableSession};await online.checkout(next);
await assert.rejects(online.endTableSession({table:'TURNOVER',group:'A',tableSession:fresh.tableSession}),e=>e.code==='PAYMENT_PENDING');
assert.equal((await online.get(paid.requestId,paid.token)).status,'paid');
console.log('PASS dining isolation: clear hides old receipt/cart, blocks old phones and unversioned writes, preserves paid ledger, active payment blocks clear.');
// Public API treats mixed-case table strings as separate carts while checkout uppercases.
await add('c2');assert.equal((await dining.cart('c2','A')).items.length,1);assert.equal((await dining.cart('C2','A')).items.length,1);
await online.checkout(await input('c2'));
console.log('PASS table normalization: c2/C2 share one cart and checkout succeeds.');
// Same table with deliberately separate group codes remains isolated.
await add('GROUPS','A');await add('GROUPS','B');const a=await input('GROUPS','A'),b=await input('GROUPS','B');
await Promise.all([online.checkout(a),online.checkout(b)]);assert.notEqual(sessions.get(a.requestId).id,sessions.get(b.requestId).id);
assert.equal((await dining.cart('GROUPS','A')).orders.length,0);
console.log('PASS: same-table A/B codes isolate carts and payments; each pays only its own group.');
clock=Date.now();await add('RECOVER');const recovering=await input('RECOVER');await online.checkout(recovering);
const verified={id:sessions.get(recovering.requestId).id,metadata:{dumpling_order_id:recovering.requestId},currency:'sgd',amount_total:385,payment_status:'paid',status:'complete'};
payment.retrieve=async()=>verified;payment.expire=async()=>{throw Error('Must not expire verified payment')};clock+=16*60000;
assert.equal((await online.get(recovering.requestId,recovering.token)).status,'paid');
assert.equal((await dining.cart('RECOVER','A')).orders.length,1);assert.equal((await dining.cart('RECOVER','A')).paymentPending,false);
await online.get(recovering.requestId,recovering.token);assert.equal((await dining.cart('RECOVER','A')).orders.length,1);
console.log('PASS delayed webhook: verified provider payment commits once; never cancelled or charged again.');
