// DOM-boundary doubles, not browser/visual QA. No network or actual Stripe SDK.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('checkout-ui.js',import.meta.url),'utf8');
const listeners={};let root, paid=false, confirmed=0, cancelled=0, created=0, apiCalls=[], decline=true;
class Node {
  constructor(){this.isConnected=true;this.nodes=new Map();this.textContent='';this.disabled=false;this.dataset={};this.value='guest@example.test';}
  reportValidity(){return true;}
  querySelector(key){if(!this.nodes.has(key))this.nodes.set(key,new Node());return this.nodes.get(key);}
  replaceChildren(){}
  hasAttribute(key){return key===this.attr;}
}
const body={set innerHTML(s){if(root)root.isConnected=false;root=new Node();root.innerHTML=s;},get firstElementChild(){return root;}};
const catalog=[{id:'lunch-v2-barley',cn:'薏米水',name:'Barley',price:3.5,img:'barley.webp'},{id:'lunch-v2-sour-plum',cn:'酸梅汁',name:'Plum',price:4.2,img:'plum.webp'}];
let saved;
const owner={table:'A1',group:'A',nickname:'Test',remote:{opIds:['op']},items:[{id:catalog[0].id,qty:1}],note:'',order:null,storageAvailable:true,
  async flush(){},async poll(){},persist(){},emit(){},
  mutate(op){this.items.push({id:op.dishId,qty:1});},
  async api(path,input){
    apiCalls.push({path,action:input?.action});
    if(path.startsWith('/api/cart?'))return {cart:{...this.remote,items:this.items,paymentPending:false}};
    if(!input)return {config:{dineinEnabled:true,preview:false,publishableKey:'pk_test_fixture'}};
    const items=input.items?.map(i=>({...i,name:catalog.find(d=>d.id===i.id).cn,englishName:'Item',price:catalog.find(d=>d.id===i.id).price}));
    const order={...input,id:input.requestId,items,fulfilment:{},total:items?.reduce((n,i)=>n+i.price*i.qty,0),subtotal:3.21,gst:.29,status:paid?'paid':'awaiting_payment',fulfilmentCommitted:paid};
    if(input.action==='quote')return {order};
    if(input.action==='cancel'){cancelled++;return {cancelled:true};}
    saved=order;created++;return {order,clientSecret:'cs_fixture_secret'};
  },
};
const ctx={console,crypto,URLSearchParams,URL,AbortSignal,structuredClone,store:owner,language:'zh',production:true,noteTimer:null,noteDraft:null,
  clearTimeout(){},setInterval(){},document:{hidden:false,addEventListener:(event,fn)=>listeners[event]=fn},
  $:s=>s==='#sheetBody'?body:null,
  tr:(a,b)=>a,bi:(a,b)=>a,money:n=>`$${Number(n).toFixed(2)}`,escapeHTML:s=>String(s??'').replaceAll('<','&lt;'),errorText:e=>e.message,
  dish:id=>catalog.find(d=>d.id===id),name:d=>d.cn,photo:d=>d.img,itemPrice:d=>d.price,styleName:s=>s,
  openModal(){},showCart(){root.isConnected=false;},toast(){},
  Fulfilment:{mode:()=> 'dinein',summary:()=>'<div>金额已含 GST</div>'},SharedTable:{confirm(order){confirmed++;assert.equal(order.status,'paid');}},
  fetch:async()=>({ok:true,json:async()=>({ok:true,order:{...saved,status:paid?'paid':'awaiting_payment',fulfilmentCommitted:paid}})}),
  Stripe:()=>({initCheckoutElementsSdk(options){
    assert.equal(options.clientSecret,'cs_fixture_secret');
    return {async loadActions(){return {type:'success',actions:{getSession:()=>({total:{total:{amount:'SGD 3.50'}}}),async confirm(opts){assert.equal(opts.redirect,'if_required');assert.equal(opts.email,'guest@example.test');if(decline)return {type:'error',error:{message:'Card declined'}};paid=true;return {type:'success'};}}};},
      createPaymentElement(options){assert.equal(options.layout.radios,'always');return {mount(){},destroy(){},on(event,fn){if(event==='ready')fn();}};}
    };
  }}),
};
vm.createContext(ctx);vm.runInContext(source,ctx);
await vm.runInContext('CheckoutUI.open()',ctx);
assert(root.innerHTML.includes('搭配加点'));assert(root.innerHTML.includes('酸梅汁'));assert(!root.innerHTML.includes('data-checkout-addon="lunch-v2-barley"'));
assert.equal(root.querySelector('[data-stripe-total]').textContent,'SGD 3.50');
assert.equal(root.querySelector('[data-checkout-pay]').disabled,false);
assert.equal(created,1);
const add=new Node();add.dataset.checkoutAddon='lunch-v2-sour-plum';
await listeners.click({target:{closest:()=>add}});
assert.equal(cancelled,1,'Cancel the previous Session before changing its amount');
assert.equal(created,2);assert.equal(owner.items.length,2);
const pay=root.querySelector('[data-checkout-pay]');pay.attr='data-checkout-pay';
await listeners.click({target:{closest:()=>pay}});
assert.equal(confirmed,0);assert(owner.order);assert.equal(pay.disabled,false,'A declined payment can be retried');
decline=false;
await listeners.click({target:{closest:()=>pay}});
assert.equal(created,2,'A declined payment retry must not create a different session');
assert.equal(confirmed,1,'Show success only after protected server read confirms paid');
assert.equal(owner.order,null);
assert(!apiCalls.some(c=>c.path==='/api/order'),'Never invoke unpaid order API');
assert(!source.includes('location.assign'),'No extra hosted payment-method selection page');
console.log('PASS checkout UI boundaries: in-page Stripe form, provider total, add-on cancellation/requote, direct confirm, server-confirmed success, and no unpaid submission. Not browser visual QA.');
