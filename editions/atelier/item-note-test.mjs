import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {cleanItems} from '../../web/server/order-core.js';
import {cleanCartOperation,reduceCartOperations} from '../../web/server/cart-core.js';
import {createCatalogService} from '../../web/server/catalog-core.js';
import {createTableStore} from '../../web/server/table-state.js';
let record=null;const catalog=createCatalogService({async read(){return structuredClone(record)},async write(value,etag){record={value:structuredClone(value),etag:String(Number(etag||0)+1)}},isConflict:()=>false});
const menu=await catalog.menu(),d=menu.find(x=>x.variants),style=d.styles[0];
// A per-portion note is cleaned, kept on the line, and splits lines of the same dish.
assert.equal(cleanItems([{id:d.id,style,qty:1,note:'  少辣<script>  '}],menu)[0].note,'少辣script');
assert.equal(cleanItems([{id:d.id,style,qty:1,note:'x'.repeat(90)}],menu)[0].note.length,60);
assert.equal('note' in cleanItems([{id:d.id,style,qty:1,note:'   '}],menu)[0],false);
let clock=Date.now();const op=(note,delta=1)=>({...cleanCartOperation({opId:randomUUID(),deviceId:randomUUID(),table:'A1',kind:'delta',dishId:d.id,style,delta,...(note?{note}:{})},menu),storedAt:++clock});
const cart=reduceCartOperations([op('少辣'),op(null),op(null),op('少辣')],menu);
assert.deepEqual(cart.items.map(i=>[i.qty,i.note||null]).sort(),[[2,'少辣'],[2,null]].sort());
assert.equal(reduceCartOperations([op('少辣'),op('少辣',-1),op(null)],menu).items.length,1,'removing the noted line leaves the plain one');
// Dine-in order: the noted line must match the cart exactly.
const records=new Map();
const tables=createTableStore({async read(p){return structuredClone(records.get(p)||null)},async write(p,v,etag){if((records.get(p)?.etag||null)!==etag)throw Object.assign(new Error('c'),{conflict:true});records.set(p,{value:structuredClone(v),etag:randomUUID()})},isConflict:e=>e.conflict,async all(){return [...records.values()].map(r=>r.value)}},
 {menu:()=>catalog.menu(),async read(){return {operations:[],orders:[]}},async feed(){return {events:[],activeIds:[]}},async resolve(){}});
let c=await tables.mutate({opId:randomUUID(),deviceId:randomUUID(),table:'A1',group:'A',kind:'delta',dishId:d.id,style,delta:1,note:'不要葱'});
c=await tables.mutate({opId:randomUUID(),deviceId:randomUUID(),table:'A1',group:'A',kind:'delta',dishId:d.id,style,delta:1});
await assert.rejects(tables.order({requestId:randomUUID(),table:'A1',group:'A',no:'1234',cartOpIds:c.opIds,items:[{id:d.id,style,qty:2}]}),/购物车已更新/,'dropping the note is a different order');
const {order}=await tables.order({requestId:randomUUID(),table:'A1',group:'A',no:'1234',cartOpIds:c.opIds,items:c.items});
assert.deepEqual(order.items.map(i=>i.note||null).sort(),[null,'不要葱'].sort());
console.log('PASS item notes: cleaned per-portion notes split cart lines, survive into dine-in orders, and must match the cart.');
