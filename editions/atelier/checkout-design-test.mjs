// Render/source contract checks only. No browser, Stripe, or live order calls.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const read = file => readFile(new URL(file, import.meta.url), 'utf8');
const [ui, fulfilment, css, app] = await Promise.all(['checkout-ui.js','fulfilment.js','shared-table.css','app.js'].map(read));
const escapeHTML = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const catalog = [
  {id:'noodles', cn:'肉末葱油面', name:'Minced pork & scallion noodles', img:'noodles.webp'},
  {id:'lunch-v2-barley',cn:'薏米水',name:'House-made barley',price:3.5,img:'barley.webp'},
  {id:'lunch-v2-sour-plum',cn:'酸梅汁',name:'Sour plum drink',price:3.5,img:'plum.webp'},
];
const order = {id:'order-id',no:'001',status:'paid',paidAt:'2026-09-08T09:00:00Z',mode:'takeaway',table:'A1',group:'A',
  items:[{id:'noodles',name:'肉末葱油面 <script>',englishName:'Minced pork & scallion noodles <script>',style:'soup',price:10.8,qty:2}],
  subtotal:19.82,gst:1.78,total:21.6,pricingVersion:'sg-inclusive-gst9-delivery9-v2',note:'<img src=x onerror=alert(1)>',
  fulfilment:{pickupName:'Dumpling Lab',pickupAddress:'49 Circular Rd, Singapore 049404'},pickup:{number:'T0061',qr:'/qr.png',date:'2026-09-08'}};
for (const language of ['zh','en']) {
  const body = {}; let opened;
  const ctx = {language,store:{progressSync:{'order-id':'synced'}},TableCart:class{},setInterval(){},
    document:{addEventListener(){}},tr:(zh,en)=>language==='zh'?zh:en,bi:(zh,en)=>escapeHTML(language==='zh'?zh:en),escapeHTML,
    money:n=>`$${Number(n).toFixed(2)}`,dish:id=>catalog.find(d=>d.id===id),name:d=>language==='zh'?d.cn:d.name,
    photo:d=>d.img,itemPrice:d=>d.price,styleName:s=>s,openModal:(mode,title)=>opened={mode,title},
    $:selector=>selector==='#sheetBody'?body:{focus(){}},view:{node:{},config:{preview:false},enabled:true,order},order,
  };
  vm.createContext(ctx);
  vm.runInContext(ui.replace('return { open, refresh, dispose, itemsHTML };', 'return { open, refresh, dispose, itemsHTML, draw };'),ctx);
  vm.runInContext(fulfilment,ctx);
  for (const mode of ['takeaway','dinein']) {
    ctx.view.order={...order,mode};
    vm.runInContext('CheckoutUI.draw(view)',ctx);
    const html=ctx.view.node.innerHTML;
    const tokens=['class="checkout-location"','class="checkout-lines"','checkout-addons','checkout-totals','checkout-payment','checkout-paybar'];
    for(let i=1;i<tokens.length;i++)assert(html.indexOf(tokens[i])>html.indexOf(tokens[i-1]),'Order information follows the agreed sequence');
    assert.equal((html.match(/data-checkout-pay disabled/g)||[]).length,1,'Only one pay action, disabled before Stripe readiness');
    assert.equal((html.match(/data-stripe-total/g)||[]).length,1,'Only one provider total in the dock');
    assert.equal((html.match(/id="sheetTitle"/g)||[]).length,1);
    assert(html.includes('data-checkout-email')&&html.includes('autocomplete="email"'));
    assert(html.includes('data-checkout-edit')&&html.includes('data-checkout-addon'));
    assert(!html.includes('<script>')&&!html.includes('<img src=x'));
    assert(html.includes('&lt;script&gt;')&&html.includes('&lt;img'));
    if(mode==='takeaway')assert(html.includes('49 Circular Rd'));
    else assert(html.includes('A1')&&!html.includes('49 Circular Rd'));
    assert(!/5 minutes|13 cups|Estimated waiting|折扣|优惠券|Apple Pay<|ShopBack/.test(html),'No invented ETA, discounts, or unsupported payment button');
  }
  for (const stage of ['received','preparing','ready','collected']) {
    ctx.order={...order,...(stage!=='received'?{preparingAt:1}:{}),...(['ready','collected'].includes(stage)?{readyAt:2}:{}),...(stage==='collected'?{collectedAt:3}:{})};
    vm.runInContext('Fulfilment.showPaidOrder(order)',ctx);
    assert.equal(opened.mode,'pickup');
    assert(body.innerHTML.includes(`data-stage="${stage}"`));
    assert(body.innerHTML.indexOf('pickup-number')<body.innerHTML.indexOf('checkout-lines'));
    assert(body.innerHTML.includes(language==='zh'?'实付金额':'Total paid'));
    assert(!body.innerHTML.includes(language==='zh'?'应付总额':'Total to pay'));
    assert(!body.innerHTML.includes('<script>'));
    assert.equal(body.innerHTML.includes('class="pickup-qr"'),stage!=='collected');
    assert(body.innerHTML.includes('data-action="ordered"'));
  }
  ctx.order={...order,mode:'dinein'};
  vm.runInContext('Fulfilment.showPaidOrder(order)',ctx);
  assert.equal(opened.mode,'success');
  assert(body.innerHTML.includes('dinein-paid')&&body.innerHTML.includes('A1'));
  assert(!body.innerHTML.includes('pickup-progress'),'Do not fabricate a preparation timeline for dine-in');
  const previous=body.innerHTML;
  ctx.order.status='awaiting_payment';vm.runInContext('Fulfilment.showPaidOrder(order)',ctx);
  assert.equal(body.innerHTML,previous,'Unpaid snapshots cannot render paid confirmation');
}
assert(css.includes('height: 100dvh; max-height: 100dvh; margin: 0; border-radius: 0;'));
assert(css.includes('.checkout-scroll, .order-result-scroll { flex: 1; min-height: 0; overflow-y: auto;'));
assert(css.includes('.checkout-paybar { flex: none;'),'Dock is outside the scrolling content');
assert(css.includes('env(safe-area-inset-bottom)')&&css.includes('prefers-reduced-motion'));
assert(css.includes('.checkout-addon button { flex: none; width: 44px; height: 44px;'));
assert(app.includes('input.closest(".cart-scroll, .checkout-scroll")'));
console.log('PASS checkout design: bilingual ordering, safe snapshot rendering, single payment dock, full-height small-screen contract, real progress stages and no fictional estimates. Not browser QA.');
