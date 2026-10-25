import assert from 'node:assert/strict';
import {cleanItems} from '../../web/server/order-core.js';
const fillings=MENU.filter(d=>d.active!==false&&d.singleChoice===true);assert.equal(fillings.length,6);assert.equal(LUNCH_CHOOSE_FILLING_FIRST,false);
for(const d of fillings){
 // 2026-10-20 最新菜单：单点不卖煎，饺子 5/9 颗、云吞 5/10 颗，做法不加价。
 const methods=d.kind==='wonton'?['soup','red-oil','peanut']:['boiled','soup','red-oil','peanut'];
 assert(!d.preparations.includes('fried'),`${d.cn} 单点不提供煎`);assert.equal(d.preparationExtras[methods[0]],0);
 for(const prep of methods)for(const pieces of (d.kind==='wonton'?[5,10]:[5,9])){
  const style=d.styles.find(s=>d.variants[s].prep===prep&&d.variants[s].pieces===pieces);assert(style,`${d.cn} ${prep} ${pieces}`);
  const item=cleanItems([{id:d.id,style,qty:1}])[0];assert.equal(item.price,Math.round((d.portionPrices[pieces]+d.preparationExtras[prep])*100)/100);assert.equal(item.style,style);
  const v=d.variants[style];assert.equal(v.sesame,false);assert.equal(v.noodles,false);assert.equal(v.peanut,prep==='peanut');assert.equal(v.spicy,prep==='red-oil');
 }
 assert(!Object.values(d.variants).some(v=>v.prep==='tossed'));
 if(d.kind==='wonton'){assert(!d.preparations.includes('boiled'));assert.throws(()=>cleanItems([{id:d.id,style:'水煮 · 5颗',qty:1}]),/做法/)}
}
console.log('PASS filling-first menu: six fillings, four dumpling methods/three wonton methods (no single fried), 5/9 and 5/10 portions, no preparation surcharge, explicit peanut/chilli preparation and invalid styles rejected.');
