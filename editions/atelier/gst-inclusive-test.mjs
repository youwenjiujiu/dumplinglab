import assert from 'node:assert/strict';
import '../../web/order-pricing.js';
const { quote, cents, inclusive } = globalThis.OrderPricing;
for (const [menu, net, gst] of [[5.8,5.32,.48],[6.8,6.24,.56],[10.8,9.91,.89],[11.6,10.64,.96],[27.03,24.8,2.23]]) {
  for (const mode of ['dinein','takeaway']) {
    const q = quote(menu,mode);
    assert.equal(q.subtotal,net); assert.equal(q.gst,gst);
    assert.equal(q.total,menu); assert.equal(inclusive(menu),menu);
  }
}
for (let amount=0;amount<=50000;amount++) {
  for (const mode of ['dinein','takeaway','delivery']) {
    const q=quote(amount/100,mode);
    assert.equal(cents(q.subtotal)+cents(q.deliveryFee)+cents(q.gst),cents(q.total),'breakdown balances to the cent');
    assert.equal(cents(q.subtotal)+cents(q.foodGst),amount,'food tax extracted without surcharge');
    assert.equal(cents(q.foodGst),Math.round(amount*9/109));
    if(mode!=='delivery')assert.equal(cents(q.total),amount,'menu total unchanged');
    else {
      assert.equal(cents(q.deliveryFee),Math.round(cents(q.subtotal)*.09),'delivery policy unchanged');
      assert.equal(cents(q.total),amount+cents(q.deliveryFee)+cents(q.deliveryGst));
    }
  }
}
for (const bad of [-1,NaN,Infinity])assert.throws(()=>quote(bad));
console.log('PASS GST-inclusive pricing: menu examples and every cent through $500, all three modes, balanced rounding and unchanged delivery fee policy.');
