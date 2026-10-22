import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createCatalogService} from '../../web/server/catalog-core.js';
let record=null;const svc=createCatalogService({async read(){return structuredClone(record)},async write(value,etag){record={value:structuredClone(value),etag:String(Number(etag||0)+1)}},isConflict(){return false}});
const save=async(id,patch)=>svc.save({id,revision:(await svc.admin()).revision,patch});
const item=async id=>(await svc.menu()).find(d=>d.id===id);
const style=(d,prep,pieces)=>d.styles.find(s=>d.variants[s].prep===prep&&d.variants[s].pieces===pieces);
const order=(...lines)=>({id:randomUUID(),tokenHash:'stock-test',inventoryManaged:true,items:lines.map(([d,st,qty])=>({id:d.id,style:st,qty,price:lunchPrice(d,st)}))});
// 1. Wonton noodles draw from the wonton count (5 per bowl).
const wonton='lunch-v2-prawn-roe-wonton',noodles='lunch-v7-prawn-roe-wonton-noodles';
await save(wonton,{stock:20});
let n=await item(noodles);assert.equal(n.stock,20);assert.equal(n.stockUnit,'颗');
await assert.rejects(save(noodles,{stock:5}),/共用库存/);
const bowl=order([n,n.styles[0],2]);await svc.reserve(bowl);
assert.equal((await item(wonton)).available,10,'two bowls hold 10 wontons');assert.equal((await item(noodles)).available,10);
const w=await item(wonton);await assert.rejects(svc.reserve(order([w,style(w,'soup',10),2])),/库存不足/,'20 wontons cannot cover 10 left');
await svc.settle(bowl,'paid');assert.equal((await item(wonton)).stock,10,'paid bowls deduct wontons');
// 2. Sized sides share stock; wings count pieces.
const small='lunch-v2-chicken-wings',large='lunch-v5-chicken-wings-large';
await save(small,{stock:12});
let L=await item(large),S=await item(small);assert.equal(L.stock,12);assert.equal(S.stockUnit,'个');
const wings=order([L,null,1],[S,null,1]);await svc.reserve(wings);assert.equal((await item(small)).available,3,'6 + 3 wings held');
assert.equal((await item(large)).soldOut,true,'3 wings left cannot make a 6-piece plate');assert.equal((await item(small)).soldOut,false);
await svc.settle(wings,'expired');assert.equal((await item(small)).available,12,'expiry releases shared stock');
// 3. Fried chive dumplings use the potsticker stock, not the boiled-dumpling stock.
const chive='lunch-v2-pork-chive-shrimp',fried='lunch-v10-pork-chive-shrimp-fried';
await save(chive,{stock:30,enabledPreparations:['boiled','fried'],preparationExtras:{boiled:0,soup:0,'red-oil':0,peanut:0,fried:0}});await save(fried,{stock:9});
const c=await item(chive);const f=order([c,style(c,'fried',9),1]);await svc.reserve(f);
assert.equal((await item(fried)).available,0,'fried portion drew potstickers');assert.equal((await item(chive)).available,30,'boiled stock untouched');
await assert.rejects(svc.reserve(order([c,style(c,'fried',5),1])),/库存不足/);
console.log('PASS shared stock: wonton noodles use wonton count (5 per bowl), sized sides share one count (wings by piece), fried chive dumplings use potsticker stock, member stock edits refused, expiry releases and payment deducts the shared count.');
