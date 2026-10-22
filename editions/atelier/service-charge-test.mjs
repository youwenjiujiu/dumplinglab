import assert from 'node:assert/strict';
import '../../web/order-pricing.js';
const { quote, cents, inclusive } = globalThis.OrderPricing;
for (const [menu, service, total] of [[5.8,.58,6.38],[6.8,.68,7.48],[10.8,1.08,11.88],[11.6,1.16,12.76],[27.03,2.7,29.73]]) {
  const q = quote(menu,'dinein');
  assert.equal(q.subtotal,menu); assert.equal(q.serviceCharge,service); assert.equal(q.total,total);
  assert.equal(q.gst,undefined,'no GST on new orders'); assert.equal(inclusive(menu),menu);
  const t = quote(menu,'takeaway');
  assert.equal(t.serviceCharge,0); assert.equal(t.total,menu,'pickup pays menu price');
}
// Discount comes off the food first; service charge is on what is left.
let q = quote(200,'dinein',{type:'percent',value:20});
assert.deepEqual([q.foodTotal,q.discount,q.subtotal,q.serviceCharge,q.total],[200,40,160,16,176]);
q = quote(200,'dinein',{type:'amount',value:50});
assert.deepEqual([q.discount,q.subtotal,q.serviceCharge,q.total],[50,150,15,165]);
q = quote(30,'dinein',{type:'amount',value:50});
assert.deepEqual([q.discount,q.subtotal,q.total],[30,0,0],'discount never exceeds the food');
q = quote(200,'takeaway',{type:'percent',value:20});
assert.equal(q.discount,undefined,'table discount is dine-in only'); assert.equal(q.total,200);
assert.equal(quote(200,'dinein',{type:'percent',value:0}).discount,undefined);
for (let amount=0;amount<=50000;amount++) {
  for (const mode of ['dinein','takeaway','delivery']) for (const discount of [null,{type:'percent',value:15},{type:'amount',value:3.5}]) {
    const q=quote(amount/100,mode,discount);
    assert.equal(cents(q.subtotal)+cents(q.serviceCharge)+cents(q.deliveryFee),cents(q.total),'breakdown balances to the cent');
    assert.equal(cents(q.foodTotal)-cents(q.discount||0),cents(q.subtotal));
    if(mode==='dinein')assert.equal(cents(q.serviceCharge),Math.round(cents(q.subtotal)*.1));
    if(mode==='takeaway')assert.equal(cents(q.total),amount,'pickup total is the menu price');
    if(mode==='delivery')assert.equal(cents(q.deliveryFee),Math.round(amount*.09),'delivery policy unchanged');
  }
}
for (const bad of [-1,NaN,Infinity])assert.throws(()=>quote(bad));
console.log('PASS service-charge pricing: dine-in +10% service on food after table discount (percent or amount, capped at food), pickup at menu price, every cent through $500 balanced.');
