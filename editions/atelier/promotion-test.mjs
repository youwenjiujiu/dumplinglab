import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createCatalogService} from '../../web/server/catalog-core.js';
import {cleanItems} from '../../web/server/order-core.js';
let record=null,clock=new Date('2026-10-21T10:00:00Z');
const svc=createCatalogService({async read(){return structuredClone(record)},async write(value,etag){record={value:structuredClone(value),etag:String(Number(etag||0)+1)}},isConflict(){return false}},{now:()=>clock});
const drink='lunch-v2-soft-drink',dumpling='lunch-v2-pork-chive-shrimp';
const save=async(id,patch)=>svc.save({id,revision:(await svc.admin()).revision,patch});
const get=async id=>(await svc.menu()).find(d=>d.id===id);
const flavours={label:{cn:'口味',en:'Flavour'},items:[
 {key:'grapefruit',cn:'海盐西柚',en:'Grapefruit',price:null,active:true,imageUrl:''},
 {key:'bayberry',cn:'杨梅',en:'Bayberry',price:null,active:true,imageUrl:''},
 {key:'premium',cn:'限定款',en:'Limited',price:18,active:true,imageUrl:''}]};
await save(drink,{price:15,choiceOptions:flavours});

// 打折: every option and every portion price comes down; the list price stays in the admin.
await save(drink,{promo:{type:'percent',value:15}});
let d=await get(drink);
assert.equal(lunchPrice(d,'海盐西柚'),12.75);assert.equal(lunchPrice(d,'限定款'),15.3);assert.equal(d.listPrice,15);
assert.equal((await svc.admin()).items.find(x=>x.id===drink).price,15,'the back office keeps the list price');
assert.equal((await svc.public()).items.find(x=>x.id===drink).promo.type,'percent','customers see the promotion');
await save(dumpling,{promo:{type:'percent',value:20}});
const dm=await get(dumpling),style=Object.keys(dm.variants)[0];
assert.equal(dm.variants[style].price,Math.round(dm.variants[style].listPrice*80)/100,'portions are discounted too');
await save(dumpling,{promo:null});

// 特价 is for one-price dishes only, and must be below the list price.
await assert.rejects(save(drink,{promo:{type:'price',value:12}}),/各选项价格不同/);
await assert.rejects(save(dumpling,{promo:{type:'price',value:5}}),/份量规格/);
await save(drink,{choiceOptions:{...flavours,items:flavours.items.slice(0,2)}});
await assert.rejects(save(drink,{promo:{type:'price',value:15}}),/低于原价/);
await save(drink,{promo:{type:'price',value:12}});
assert.equal(lunchPrice(await get(drink),'杨梅'),12);
for(const bad of [{type:'percent',value:0},{type:'percent',value:100},{type:'percent',value:12.5},{type:'gift'},{type:'bogo',endsAt:'tomorrow'}])
 await assert.rejects(save(drink,{promo:bad}),e=>e.status===400,JSON.stringify(bad));

// 买一赠一: flavours mix, the cheaper unit of each pair is free, odd units are paid.
await save(drink,{choiceOptions:flavours,promo:{type:'bogo',endsAt:'2026-10-21T15:59:00.000Z'}});
let menu=await svc.menu();
const lines=cleanItems([{id:drink,style:'限定款',qty:1},{id:drink,style:'海盐西柚',qty:2}],menu);
assert.deepEqual(lines.map(i=>[i.style,i.qty,i.price,i.promo||null]),[['限定款',1,18,null],['海盐西柚',1,15,null],['海盐西柚',1,0,'bogo']]);
assert.equal(lines.reduce((s,i)=>s+i.price*i.qty,0),33);
assert.deepEqual(cleanItems([{id:drink,style:'杨梅',qty:5}],menu).map(i=>[i.qty,i.price]),[[3,15],[2,0]]);
assert.deepEqual(cleanItems([{id:drink,style:'杨梅',qty:1}],menu).map(i=>[i.qty,i.price]),[[1,15]],'one unit is full price');

// A stored order (already split) reserves cleanly and counts every unit of stock.
await save(drink,{choiceOptions:{...flavours,items:flavours.items.map(o=>({...o,stock:10}))}});
menu=await svc.menu();
const order={id:randomUUID(),tokenHash:'promo',inventoryManaged:true,items:cleanItems([{id:drink,style:'海盐西柚',qty:3}],menu)};
await svc.reserve(order);
assert.equal((await get(drink)).choiceOptions.items[0].available,7,'free units still take stock');
await svc.settle(order,'paid');assert.equal((await get(drink)).choiceOptions.items[0].stock,7);

// At the end time the promotion stops on its own; the stored setting remains visible to staff.
clock=new Date('2026-10-21T16:00:00Z');
d=await get(drink);
assert.equal(d.promo,undefined);assert.deepEqual(cleanItems([{id:drink,style:'杨梅',qty:2}],await svc.menu()).map(i=>[i.qty,i.price]),[[2,15]]);
assert.equal((await svc.admin()).items.find(x=>x.id===drink).promo.type,'bogo');
const stale={id:randomUUID(),tokenHash:'promo-late',inventoryManaged:true,items:order.items};
await assert.rejects(svc.reserve(stale),/价格已更新/,'an order priced during the promotion is re-quoted after it ends');

// Client-side cart maths matches the server split.
assert.deepEqual(OrderPricing.bogoFree([{id:'a',price:15,qty:2,bogo:true},{id:'a',price:18,qty:1,bogo:true},{id:'b',price:3,qty:2,bogo:false}]),[1,0,0]);
console.log('PASS promotions: percent across options/portions, special price rules, 买一赠一 split with mixed flavours, stock, end time and re-quote.');
