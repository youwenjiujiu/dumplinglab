import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { randomUUID } from "node:crypto";
import { cleanOrder } from "../../web/server/order-core.js";
import { cleanCartOperation, reduceCartOperations } from "../../web/server/cart-core.js";
import "../../web/lunch-archive.js";

// Merged 2026-10-20 menu: her catalogue model + the owner's latest price sheet.
const active = MENU.filter(d => d.active !== false);
assert.equal(active.length, 41);
assert.deepEqual(SECTIONS, ["lunchsets","recommended","dumplings","noodles","sides","cold","drinks"]);
assert.equal(MENU_SERVICE, "lunch");
assert.deepEqual(active.filter(d => !d.img).map(d => d.cn), [], "Every dish on sale has a photo");
assert.deepEqual([...new Set(active.filter(d => d.sizeGroup).map(d => d.groupCn))], ["卤肉饭","卤豆腐","卤五花肉","炸秘制猪排","炸秘制鸡翅","炸云吞"], "Sizes of one dish share one card");
for (const d of active.filter(d => d.sizeGroup)) {
  assert.equal(d.sizeGroup.length, 2);
  const [small, large] = d.sizeGroup.map(id => MENU.find(x => x.id === id));
  assert(small.price < large.price, d.groupCn);
}
const singles = active.filter(d => d.singleChoice === true);
for (const d of singles) for (const v of Object.values(d.variants)) {
  assert.equal(v.price, d.portionPrices[v.pieces], `${d.cn}: no preparation surcharge`);
  assert.notEqual(v.prep, "fried", `${d.cn}: no single fried`);
}
console.log("PASS 1: 41 dishes on sale, all photographed, six sized sides grouped, single dumplings priced by portion only.");

const envelope=()=>({requestId:randomUUID(),table:"QLUNCH",group:"A",no:"6001"});
let configurations=0;
for (const d of active) for (const [style,v] of d.variants?Object.entries(d.variants):[[null,{price:d.price}]]) for (const qty of [1,2,20]) {
  const order=cleanOrder({...envelope(),items:[{id:d.id,style,qty,price:.01}]});
  assert.equal(order.foodTotal,Math.round(v.price*100)*qty/100);
  assert.equal(Math.round(order.serviceCharge*100),Math.round(order.foodTotal*10));
  assert.equal(Math.round((order.subtotal+order.serviceCharge)*100),Math.round(order.total*100));
  assert.equal(order.items[0].price,v.price); assert.equal(order.items[0].style,style);
  if (qty===1) configurations++;
}
for (const d of MENU.filter(d => d.active === false)) assert.throws(()=>cleanOrder({...envelope(),items:[{id:d.id,style:d.styles?.[0]||null,qty:1}]}), undefined, `${d.cn} is retired`);
console.log(`PASS 2: authoritative checkout prices with 10% service for all ${configurations} configurations × 3 quantities; retired dishes rejected.`);

for (const old of RETIRED_LUNCH_MENU) {
  assert(!isLunchItem(old.id,old.styles?.[0]));
  assert.throws(()=>cleanOrder({...envelope(),items:[{id:old.id,style:old.styles?.[0],qty:1}]}));
}
const legacy={id:randomUUID(),deviceId:randomUUID(),kind:"delta",dishId:"lunch-pork-chive",style:"煎 · 5颗",delta:2,at:new Date().toISOString()};
const current=cleanCartOperation({...envelope(),opId:randomUUID(),deviceId:randomUUID(),kind:"delta",dishId:singles[0].id,style:singles[0].styles[0],delta:1});
const before=JSON.stringify(legacy); const reduced=reduceCartOperations([legacy,current]);
assert.equal(reduced.items.length,1); assert.equal(reduced.items[0].id,singles[0].id);
assert.equal(reduced.unavailableItems[0].id,legacy.dishId); assert.deepEqual(reduced.opIds,[current.id]);
assert.equal(JSON.stringify(legacy),before);
console.log("PASS 3: all retired IDs rejected for new orders; old selections quarantined, never silently repriced.");
