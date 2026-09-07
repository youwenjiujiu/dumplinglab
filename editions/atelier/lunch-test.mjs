import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { cleanOrder } from "../../web/server/order-core.js";
import { cleanCartOperation, reduceCartOperations } from "../../web/server/cart-core.js";
import "../../web/lunch-archive.js";

const expected = [
  ["韭菜虾仁猪肉",6.8],["鸡肉包菜",5.8],["芹菜虾仁猪肉",6.8],["白菜猪肉",5.8],["猪肉大葱",5.8],
  ["鲜虾蟹籽云吞",7.2],["鸡肉玉米云吞",5.8],["鲜肉云吞",5.8],
  ["肉末葱油面",10.8],["肉末辣椒拌面",10.8],["甘榜鸡汤拉面",13.8],["陕西油泼面",11.8],["销魂皮蛋面",12.8],["肉末红油燃面",10.8],
  ["卤肉饭",5.8],["卤豆腐",5.2],["卤五花肉",6.2],["鱼丸汤",4.8],["秘制猪排",6.2],["秘制鸡翅",6.2],
  ["凉拌蔬菜丝",4.8],["酱油菜心",6.8],["口水鸡",6.8],["蚝油生菜",6.8],["皮蛋豆腐",4.8],["溏心卤蛋",1.9],["腌萝卜",1.5],["黄瓜",4.5],
  ["薏米水",3.5],["柠檬茶",4.2],["酸梅汁",4.2],["软饮",3],["水",1],["桂花乌龙茶",3],
  ["红油抄手",5.8],
];
assert.deepEqual(MENU.map(d => [d.cn,d.price]), expected);
assert.deepEqual(SECTIONS, ["recommended","dumplings","noodles","sides","drinks"]);
assert.equal(MENU_SERVICE, "lunch");
assert.equal(new Set(MENU.map(d=>d.id)).size,35);
assert.deepEqual(MENU.filter(d=>d.portion).map(d=>[d.cn,d.portion]), [["秘制猪排","1块"],["秘制鸡翅","3个"]]);
assert.deepEqual(MENU.filter(d=>d.best).map(d=>d.cn), ["肉末辣椒拌面","销魂皮蛋面"]);
console.log("PASS 1: 35 exact names/prices, five sections, two noodle recommendations, declared portions.");

const fillings = MENU.filter(d=>d.section==="dumplings");
assert.deepEqual(fillings.map(d=>d.portionPrices[9]), [10.8,9.2,10.8,9.2,9.2,11.5,9.2,9.2]);
for (const p of LUNCH_PREPARATIONS) {
  assert.equal(p.extra,0,"No surcharge, including fried");
  assert.equal(fillings.filter(d=>d.preparations.includes(p.id)).length, {soup:3,tossed:8,boiled:5,fried:5}[p.id]);
}
let checked=0;
for (const d of fillings) for (const [style,v] of Object.entries(d.variants)) {
  assert(d.preparations.includes(v.prep)); assert([5,9].includes(v.pieces));
  assert.equal(v.price,Math.round((d.portionPrices[v.pieces]+(v.noodles?3:0))*100)/100);
  assert.equal(typeof v.noodles,"boolean");
  if (v.prep!=="tossed") assert(!v.spicy && !v.sesame);
  if (!["soup","tossed"].includes(v.prep)) assert(!v.noodles);
  assert.equal(d.styles.filter(s=>s===style).length,1); checked++;
}
assert.equal(checked,176);
assert.equal(fillings.flatMap(d=>Object.values(d.variants)).filter(v=>!v.legacy).length,160);
assert.equal(LUNCH_NOODLE_EXTRA,3);
assert(Object.values(LUNCH_PENDING).every(v=>v===false));
for(const d of fillings) for(const p of d.preparations) for(const pieces of [5,9]) {
  const prep=LUNCH_PREPARATIONS.find(v=>v.id===p);
  assert.equal(d.variants[`${prep.cn} · ${pieces}颗`].price,d.portionPrices[pieces],"Saved v2 base keys/prices survive");
}
console.log("PASS 2: 160 explicit variants + 16 compatible v2 keys; exact +S$3 noodles; boiled excludes wontons; frying remains free.");

const envelope=()=>({requestId:randomUUID(),table:"QLUNCH",group:"A",no:"6001"});
for (const d of MENU) for (const [style,v] of d.variants?Object.entries(d.variants):[[null,{price:d.price}]]) for (const qty of [1,2,20]) {
  const order=cleanOrder({...envelope(),items:[{id:d.id,style,qty,price:.01}]});
  assert.equal(order.foodTotal,Math.round(v.price*100)*qty/100);
  assert.equal(order.total,order.foodTotal);
  assert.equal(Math.round((order.subtotal+order.gst)*100),Math.round(order.total*100));
  assert.equal(order.items[0].price,v.price); assert.equal(order.items[0].style,style);
}
for (const style of [null,"水煮","高汤 · 5颗","煎 · 10颗","干拌 · 5颗 · 加面","干拌 · 5颗 · 加芝麻酱","干拌 · 5颗 · 辣"]) {
  assert.throws(()=>cleanOrder({...envelope(),items:[{id:fillings[0].id,style,qty:1}]}));
}
for (const d of fillings.filter(d=>d.kind==="wonton")) for (const style of ["水煮 · 5颗","煎 · 9颗"]) {
  assert.throws(()=>cleanOrder({...envelope(),items:[{id:d.id,style,qty:1}]}));
}
console.log("PASS 3: authoritative checkout prices for all 204 configurations × 3 quantities; invalid options rejected.");

assert.deepEqual(LUNCH_RECOMMENDATIONS.map(r=>r.cn),["韭菜虾仁猪肉煎饺","鸡肉包菜煎饺","红油抄手","清汤鲜肉云吞","鲜虾蟹籽云吞面","白灼饺子"]);
for (const r of LUNCH_RECOMMENDATIONS) {
  assert(!MENU.some(d=>d.id===r.id),"Shortcuts are not duplicate SKUs");
  if (r.dishId) assert(MENU.find(d=>d.id===r.dishId).preparations.includes(r.prep));
  else assert(r.pending || r.chooseFilling);
}
const chaoshou=LUNCH_RECOMMENDATIONS.find(r=>r.id==="red-oil-chaoshou");
assert(!chaoshou.pending && chaoshou.dishId === "lunch-v4-red-oil-chaoshou");
const product=MENU.find(d=>d.id===chaoshou.dishId);
assert.equal(product.kind,"chaoshou");
assert.equal(product.section,"recommended");
assert.deepEqual(product.styles,["红油 · 5颗","红油 · 9颗"]);
assert.deepEqual(product.portionPrices,{5:5.8,9:9.2});
for (const style of [null,"高汤 · 5颗","干拌 · 5颗","水煮 · 5颗","红油 · 10颗"]) assert.throws(()=>cleanOrder({...envelope(),items:[{id:product.id,style,qty:1}]}));
const pair=cleanOrder({...envelope(),items:[{id:product.id,style:product.styles[0],qty:1},{id:"lunch-v2-pork-wonton",style:"高汤 · 5颗",qty:1}]});
assert.equal(pair.subtotal,10.64);
assert.equal(pair.gst,0.96);
assert.equal(pair.total,11.6);
assert.notEqual(pair.items[0].id,pair.items[1].id);
assert.equal(pair.items[0].name,"红油抄手");
assert(!MENU.some(d=>/西红柿鸡蛋|菜肉云吞/.test(d.cn)));
console.log("PASS 4: independent chaoshou enabled at S$5.80/9.20, fixed red-oil portions, no wonton alias, invalid methods rejected.");

for (const old of RETIRED_LUNCH_MENU) {
  assert(!isLunchItem(old.id,old.styles?.[0]));
  assert.throws(()=>cleanOrder({...envelope(),items:[{id:old.id,style:old.styles?.[0],qty:1}]}));
}
const legacy={id:randomUUID(),deviceId:randomUUID(),kind:"delta",dishId:"lunch-pork-chive",style:"煎 · 5颗",delta:2,at:new Date().toISOString()};
const current=cleanCartOperation({...envelope(),opId:randomUUID(),deviceId:randomUUID(),kind:"delta",dishId:fillings[0].id,style:fillings[0].styles[0],delta:1});
const before=JSON.stringify(legacy); const reduced=reduceCartOperations([legacy,current]);
assert.equal(reduced.items.length,1); assert.equal(reduced.items[0].id,fillings[0].id);
assert.equal(reduced.unavailableItems[0].id,legacy.dishId); assert.deepEqual(reduced.opIds,[current.id]);
assert.equal(JSON.stringify(legacy),before);
console.log("PASS 5: all retired IDs rejected for new orders; old selections quarantined, never silently repriced.");
