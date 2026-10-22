import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {createCatalogService} from '../../web/server/catalog-core.js';
import {createTableStore} from '../../web/server/table-state.js';
import {createOnlineService} from '../../web/server/online-core.js';
let record=null;const catalog=createCatalogService({async read(){return structuredClone(record)},async write(value,etag){record={value:structuredClone(value),etag:String(Number(etag||0)+1)}},isConflict:()=>false});
const drink='lunch-v2-soft-drink';
await catalog.save({id:drink,revision:(await catalog.admin()).revision,patch:{choiceOptions:{label:{cn:'口味',en:'Flavour'},items:[{key:'cola',cn:'可乐',en:'Cola',price:null,active:true,imageUrl:''}]},promo:{type:'bogo'}}});
const tableRecords=new Map();
const tables=createTableStore({async read(path){return structuredClone(tableRecords.get(path)||null)},async write(path,value,etag){if((tableRecords.get(path)?.etag||null)!==etag)throw Object.assign(new Error('Conflict'),{conflict:true});tableRecords.set(path,{value:structuredClone(value),etag:randomUUID()})},isConflict:e=>e.conflict,async all(){return [...tableRecords.values()].map(r=>r.value)}},
 {menu:()=>catalog.menu(),async read(){return {operations:[],orders:[]}},async feed(){return {events:[],activeIds:[]}},async resolve(){}});
const orders=new Map(),expired=[];let stripe='expired';
const online=createOnlineService({inventory:catalog,dining:tables,config:{origin:'https://example.test',locations:[]},
 storage:{async read(id){return structuredClone(orders.get(id)||null)},async write(id,value,etag){if(orders.get(id)?.etag!==etag)throw Object.assign(new Error('Conflict'),{conflict:true});orders.set(id,{value:structuredClone(value),etag:randomUUID()})},isConflict:e=>e.conflict,async all(){return [...orders.values()].map(r=>structuredClone(r.value))}},
 payment:{ensureReady(){},async create(o){return {id:'cs_'+o.id.replaceAll('-',''),client_secret:'secret'}},async expire(id){expired.push(id);return stripe==='complete'?{status:'complete',payment_status:'paid'}:{status:'expired',payment_status:'unpaid'}}}});
const table='UNLOCK',group='A',device=randomUUID();
let cart=await tables.mutate({opId:randomUUID(),deviceId:device,table,group,kind:'delta',dishId:drink,style:'可乐',delta:2});
const pay=async()=>{const o={requestId:randomUUID(),token:randomBytes(32).toString('hex'),mode:'dinein',table,group,cartOpIds:cart.opIds,items:cart.items};await online.checkout(o);return o};

// 买一赠一 at a table: the free unit is split into its own line, and the table hold still matches.
const first=await pay();
assert.deepEqual(orders.get(first.requestId).value.items.map(i=>[i.qty,i.price]),[[1,3],[1,0]]);
assert.equal((await tables.cart(table,group)).paymentPending,true);
await assert.rejects(tables.mutate({opId:randomUUID(),deviceId:randomUUID(),table,group,kind:'delta',dishId:drink,style:'可乐',delta:1}),e=>e.code==='PAYMENT_PENDING');

// Another phone at the table cancels the unfinished payment; Stripe is asked first.
assert.deepEqual(await online.cancelForTable({table,group}),{cancelled:true});
assert.equal(orders.get(first.requestId).value.status,'expired');assert.equal(orders.get(first.requestId).value.cancelledBy,'table');
assert.equal(expired.length,1);
cart=await tables.mutate({opId:randomUUID(),deviceId:randomUUID(),table,group,kind:'delta',dishId:drink,style:'可乐',delta:1});
assert.equal(cart.paymentPending,false);assert.equal(cart.items[0].qty,3,'the cart is editable again and keeps every dish');
assert.deepEqual(await online.cancelForTable({table,group}),{cancelled:true},'nothing to cancel is fine');

// A payment Stripe already completed is never released.
const second=await pay();stripe='complete';
await assert.rejects(online.cancelForTable({table,group}),/已经付款/);
assert.equal(orders.get(second.requestId).value.status,'awaiting_payment');
assert.equal((await tables.cart(table,group)).paymentPending,true);
console.log('PASS table unlock: 买一赠一 dine-in checkout, any phone cancels an unfinished payment after Stripe confirms it is void, cart stays intact, completed payments refused.');
