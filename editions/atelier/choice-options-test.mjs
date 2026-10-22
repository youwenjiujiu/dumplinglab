import assert from 'node:assert/strict';
import {createCatalogService} from '../../web/server/catalog-core.js';
import {cleanItems} from '../../web/server/order-core.js';
import {cleanCartOperation,reduceCartOperations} from '../../web/server/cart-core.js';
import {randomUUID} from 'node:crypto';
let record=null;const svc=createCatalogService({async read(){return structuredClone(record)},async write(value,etag){record={value:structuredClone(value),etag:String(Number(etag||0)+1)}},isConflict(){return false}});
const id='lunch-v2-soft-drink',save=async patch=>svc.save({id,revision:(await svc.admin()).revision,patch}),get=async()=>(await svc.menu()).find(d=>d.id===id);
const options={label:{cn:'饮品',en:'Drink'},items:[
  {key:'cola',cn:'可乐',en:'Cola',price:null,active:true,imageUrl:'https://example.test/cola.png'},
  {key:'singha',cn:'气泡水',en:'Sparkling water',price:3.5,active:true,imageUrl:''},
  {key:'oolong',cn:'乌龙茶',en:'Oolong tea',price:null,active:false,imageUrl:''}]};
assert.equal((await get()).styles,undefined,'no options by default');
await save({choiceOptions:options});
let d=await get();
assert.deepEqual(d.styles,['可乐','气泡水'],'only offered options become order styles');
assert.equal(lunchPrice(d,'可乐'),3,'blank price uses the base price');assert.equal(lunchPrice(d,'气泡水'),3.5);
const menu=await svc.menu();
assert.deepEqual(cleanItems([{id,style:'气泡水',qty:2}],menu).map(i=>[i.name,i.style,i.price]),[['软饮','气泡水',3.5]]);
for(const style of [null,'乌龙茶','雪碧'])assert.throws(()=>cleanItems([{id,style,qty:1}],menu),undefined,String(style));
const op=cleanCartOperation({opId:randomUUID(),deviceId:randomUUID(),table:'A1',group:'A',kind:'delta',dishId:id,style:'可乐',delta:1},menu);
assert.equal(reduceCartOperations([op],menu).items[0].style,'可乐');
assert.throws(()=>cleanCartOperation({opId:randomUUID(),deviceId:randomUUID(),table:'A1',group:'A',kind:'delta',dishId:id,delta:1},menu),/做法/,'a style must be chosen');
for(const bad of [{label:{cn:'饮品',en:'Drink'},items:[]},{label:{cn:'饮品',en:'Drink'},items:[{...options.items[0],active:false}]},{label:{cn:'饮品',en:'Drink'},items:[options.items[0],{...options.items[1],cn:'可乐'}]},{label:{cn:'饮品',en:'Drink'},items:[{...options.items[0],imageUrl:'javascript:alert(1)'}]}])await assert.rejects(save({choiceOptions:bad}),e=>e.status===400);
await save({choiceOptions:{label:{cn:'',en:''},items:[{...options.items[0],cn:'赤耳 · 海盐西柚',en:'Redears · Grapefruit Gin Fizz'}]}});
assert.deepEqual((await get()).choiceOptions.label,{cn:'选项',en:'Option'},'a blank category falls back to a plain heading');
assert.deepEqual((await get()).styles,['赤耳 · 海盐西柚'],'names may contain the middle dot');
await assert.rejects(save({choiceOptions:{label:{cn:'口味',en:'Flavour'},items:[options.items[0],{...options.items[1],en:''}]}}),/第 2 项的英文名称/,'the message names the field');
await assert.rejects(svc.save({id:'lunch-v2-pork-chive-shrimp',revision:(await svc.admin()).revision,patch:{choiceOptions:options}}),/饺子/,'dumplings keep preparations and portions');
await save({choiceOptions:null});d=await get();assert.equal(d.styles,undefined);assert.equal(cleanItems([{id,qty:1}],await svc.menu())[0].price,3,'removing options restores a plain dish');
// Per-option stock: each drink / flavour has its own count; blank stays unlimited.
const order=(...lines)=>({id:randomUUID(),tokenHash:'option-stock',inventoryManaged:true,items:lines.map(([st,qty])=>({id,style:st,qty,price:lunchPrice(drink,st)}))});
await save({choiceOptions:{label:{cn:'饮品',en:'Drink'},items:[{...options.items[0],stock:2},{...options.items[1],stock:null}]}});
let drink=await get();
assert.deepEqual(drink.choiceOptions.items.map(o=>[o.cn,o.stock,o.available]),[['可乐',2,2],['气泡水',null,null]]);
const two=order(['可乐',2],['气泡水',5]);await svc.reserve(two);drink=await get();
assert.deepEqual(drink.styles,['气泡水'],'a sold-out option cannot be ordered');assert.equal(drink.choiceOptions.items[0].soldOut,true);assert.equal(drink.soldOut,false);
await assert.rejects(svc.reserve(order(['可乐',1])),/软饮 · 可乐」已售罄/);
await assert.rejects(save({choiceOptions:{label:{cn:'饮品',en:'Drink'},items:[{...options.items[0],stock:1},{...options.items[1],stock:null}]}}),/正在付款/,'stock cannot drop below a payment in progress');
await svc.settle(two,'expired');assert.equal((await get()).choiceOptions.items[0].available,2,'expiry releases the option');
const paid=order(['可乐',1]);await svc.reserve(paid);await svc.settle(paid,'paid');assert.equal((await get()).choiceOptions.items[0].stock,1,'payment deducts the option count');
await save({choiceOptions:{label:{cn:'饮品',en:'Drink'},items:[{...options.items[0],stock:0},{...options.items[1],stock:0}]}});drink=await get();
assert.equal(drink.soldOut,true,'every option sold out makes the dish sold out');assert.throws(()=>cleanItems([{id,style:'可乐',qty:1}],[drink]));
await assert.rejects(save({choiceOptions:{label:{cn:'饮品',en:'Drink'},items:[{...options.items[0],stock:-1}]}}),/第 1 项的库存/);
console.log('PASS choice options: offered options become validated order styles, per-option or base price, cart and checkout validation, input/URL validation with field-specific messages, optional category label, dumplings excluded, removal restores a plain dish; per-option stock reserves, sells out, releases, deducts and guards payments in progress.');
