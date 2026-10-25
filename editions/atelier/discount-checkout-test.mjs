import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {createCatalogService} from '../../web/server/catalog-core.js';
import {createTableStore} from '../../web/server/table-state.js';
import {createOnlineService} from '../../web/server/online-core.js';
let record=null;const catalog=createCatalogService({async read(){return structuredClone(record)},async write(value,etag){record={value:structuredClone(value),etag:String(Number(etag||0)+1)}},isConflict:()=>false});
const menu=await catalog.menu(),dumpling=menu.find(d=>d.section==='dumplings'&&!d.promo),drink=menu.find(d=>d.section==='drinks'&&!d.promo);
const tableRecords=new Map();
const tables=createTableStore({async read(path){return structuredClone(tableRecords.get(path)||null)},async write(path,value,etag){if((tableRecords.get(path)?.etag||null)!==etag)throw Object.assign(new Error('Conflict'),{conflict:true});tableRecords.set(path,{value:structuredClone(value),etag:randomUUID()})},isConflict:e=>e.conflict,async all(){return [...tableRecords.values()].map(r=>r.value)}},
 {menu:()=>catalog.menu(),async read(){return {operations:[],orders:[]}},async feed(){return {events:[],activeIds:[]}},async resolve(){}});
const orders=new Map();
const online=createOnlineService({inventory:catalog,dining:tables,config:{origin:'https://example.test',locations:[]},
 storage:{async read(id){return structuredClone(orders.get(id)||null)},async write(id,value,etag){if(orders.get(id)?.etag!==etag)throw Object.assign(new Error('Conflict'),{conflict:true});orders.set(id,{value:structuredClone(value),etag:randomUUID()})},isConflict:e=>e.conflict,async all(){return [...orders.values()].map(r=>structuredClone(r.value))}},
 payment:{ensureReady(){},async create(o){return {id:'cs_'+o.id.replaceAll('-',''),client_secret:'secret'}},async expire(){return {status:'expired',payment_status:'unpaid'}}}});
const style=d=>d.styles?.[0];
async function pay(table){
  const device=randomUUID();let cart;
  for(const d of [dumpling,drink])cart=await tables.mutate({opId:randomUUID(),deviceId:device,table,group:'A',kind:'delta',dishId:d.id,style:style(d),delta:1});
  const o={requestId:randomUUID(),token:randomBytes(32).toString('hex'),mode:'dinein',table,group:'A',cartOpIds:cart.opIds,items:cart.items};
  await online.checkout(o);return orders.get(o.requestId).value;
}
const price=d=>globalThis.lunchPrice(d,style(d)),cents=globalThis.OrderPricing.cents;
// A whole-day discount with drinks left out: only the dumplings are discounted.
await catalog.saveSettings({action:'day-discount',date:globalThis.OrderPricing.shopDate(),discount:{type:'percent',value:20,sections:{drinks:0}}});
const order=await pay('D1');
assert.equal(cents(order.discount),Math.round(cents(price(dumpling))*20/100),'drinks are not discounted');
assert.equal(order.discountRule.scope,'day');assert.deepEqual(order.discountRule.sections,{drinks:0});
assert.equal(cents(order.total),Math.round((cents(price(dumpling))+cents(price(drink))-cents(order.discount))*1.1),'service charge on the discounted food');
// The table's own discount still wins over the day discount.
await catalog.saveSettings({action:'table-discount',table:'D2',discount:{type:'percent',value:50}});
assert.equal(cents((await pay('D2')).discount),Math.round((cents(price(dumpling))+cents(price(drink)))/2));
console.log('PASS discount checkout: day discount with drinks left out, category rates applied by the server, table discount wins.');
