import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { cleanOrder } from "../../web/server/order-core.js";
import { cleanCartOperation, reduceCartOperations } from "../../web/server/cart-core.js";

const expected = [
  ["韭菜猪肉",5.5],["鸡肉包菜",4.5],["芹菜猪肉",5.5],["鸡肉玉米",4.5],["西葫芦鸡蛋",4.5],["西红柿鸡蛋",4.5],
  ["鲜虾蟹籽云吞",6.5],["鲜肉抄手",4.5],["菜肉馄饨",4.5],
  ["肉末葱油面",11.8],["肉末辣椒面",10.8],["甘榜鸡肉拌面",12.5],["甘榜鸡汤拉面",12.5],["干拌葱油面",7.8],
  ["Mini 卤肉饭",5.5],["卤豆腐",4.5],["卤五花肉",6.2],["炸云吞",5.5],["秘制猪排",6.2],["秘制鸡翅",6.2],
  ["凉拌蔬菜丝",4.5],["酱油菜心",6.5],["蚝油生菜",6.5],["皮蛋豆腐",4.5],["溏心卤蛋",1.9],["腌萝卜",1.5],["黄瓜",4.5],
  ["薏米水",3.5],["柠檬茶",4.2],["酸梅汁",4.2],["软饮",2.8],["水",1],
];
assert.deepEqual(MENU.map(d => [d.cn,d.price]), expected);
assert.deepEqual(SECTIONS, ["dumplings","noodles","sides","drinks"]);
assert.equal(MENU_SERVICE, "lunch");
assert.equal(new Set(MENU.map(d=>d.id)).size, 32);
assert.deepEqual(MENU.filter(d=>d.portion).map(d=>[d.cn,d.portion]), [["炸云吞","5个"],["秘制猪排","1块"],["秘制鸡翅","3个"]]);
console.log("ROUND 1 PASS — all 32 names, prices, 4 categories and declared portions match the supplied lunch menu.");

const fillings = MENU.filter(d=>d.variants);
assert.deepEqual(fillings.map(d=>d.portionPrices[10]), [9.8,8.8,9.8,8.8,8.8,8.8,10.8,8.8,8.8]);
for (const p of LUNCH_PREPARATIONS) {
  assert.equal(fillings.filter(d=>d.preparations.includes(p.id)).length, ["soup","tossed"].includes(p.id) ? 9 : 6);
}
let checked = 0;
for (const d of fillings) for (const [style,v] of Object.entries(d.variants)) {
  assert(d.preparations.includes(v.prep));
  assert([5,10].includes(v.pieces));
  if (v.prep !== "tossed") assert(!v.spicy && !v.sesame);
  if (!["soup","tossed"].includes(v.prep)) assert(!v.noodles);
  assert.equal(d.styles.filter(s=>s===style).length,1);
  checked++;
}
assert.equal(checked, 204);
console.log("ROUND 2 PASS — all 204 combinations; soup/tossed 9 fillings, boiled/fried 6; sauce/spice/noodle restrictions.");

const envelope = () => ({ requestId:randomUUID(),table:"QLUNCH",group:"A",no:"6001" });
for (const d of MENU) for (const [style,v] of d.variants ? Object.entries(d.variants) : [[null,{ price:d.price }]]) {
  for (const qty of [1,2,20]) {
    const order = cleanOrder({...envelope(),items:[{id:d.id,style,qty,price:.01}]});
    const expectedCents = d.variants ? Math.round(d.portionPrices[v.pieces]*100)+(v.prep==="fried"?100:0)+(v.noodles?250:0) : Math.round(d.price*100);
    assert.equal(order.total,expectedCents*qty/100);
    assert.equal(order.items[0].price,expectedCents/100);
    assert.equal(order.items[0].style,style);
  }
}
for (const style of [null,"水煮","煎 · 5颗 · 加面","高汤 · 5颗 · 加芝麻酱"]) {
  assert.throws(()=>cleanOrder({...envelope(),items:[{id:fillings[0].id,style,qty:1}]}));
}
assert.throws(()=>cleanOrder({...envelope(),items:[{id:"beijing-pork-guotie",qty:1}]}));
assert.throws(()=>cleanOrder({...envelope(),items:[{id:fillings[6].id,style:"水煮 · 5颗",qty:1}]}));
console.log("ROUND 3 PASS — authoritative prices for 227 purchasable configurations × 3 quantities; forged prices and invalid options rejected.");

const legacy = { id:randomUUID(),deviceId:randomUUID(),kind:"delta",dishId:"beijing-pork-guotie",delta:2,at:new Date().toISOString() };
const current = cleanCartOperation({...envelope(),opId:randomUUID(),deviceId:randomUUID(),kind:"delta",dishId:fillings[0].id,style:fillings[0].styles[0],delta:1});
const before = JSON.stringify(legacy);
const reduced = reduceCartOperations([legacy,current]);
assert.equal(reduced.items.length,1);assert.equal(reduced.items[0].id,fillings[0].id);
assert.equal(reduced.unavailableItems[0].id,legacy.dishId);
assert.deepEqual(reduced.opIds,[current.id]);
assert.equal(JSON.stringify(legacy),before);
console.log("ROUND 6 PASS — old selections quarantined and reported, not silently renamed/repriced; historical operations remain intact.");
