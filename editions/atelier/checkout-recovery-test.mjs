// Pure VM/service-boundary fixtures. Never open a browser or contact live APIs.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { fail } from '../../web/server/http.js';
import { RequestError } from '../../web/server/order-core.js';
const ui = await readFile(new URL('checkout-ui.js', import.meta.url), 'utf8');
const copy = await readFile(new URL('error-copy.js', import.meta.url), 'utf8');
const cartSource = await readFile(new URL('cart-store.js', import.meta.url), 'utf8');
const lock = () => Object.assign(new Error('本组正在付款，请完成或取消付款后再修改菜品。'), {status:409,code:'PAYMENT_PENDING'});
function fixture(options = {}) {
  let root;
  const handlers = {}, calls = [];
  const state = {locked:false,conflict:false,offline:false,paid:false,expired:false,flushes:0,cancelled:0,confirmed:0,...options};
  class Node {
    constructor(){this.isConnected=true;this.nodes=new Map();this.disabled=false;this.dataset={};this.textContent='';}
    querySelector(key){if(!this.nodes.has(key))this.nodes.set(key,new Node());return this.nodes.get(key);}
    hasAttribute(key){return this.attr===key;}
    replaceChildren(){}
  }
  const body = {set innerHTML(text){if(root)root.isConnected=false;root=new Node();root.innerHTML=text;},get firstElementChild(){return root;}};
  const draft={opId:'draft',kind:'delta',dishId:'barley',delta:1};
  const original={requestId:'11111111-1111-4111-8111-111111111111',token:'a'.repeat(64),action:'checkout',mode:'dinein',table:'A1',group:'A',items:[{id:'barley',qty:1}],cartOpIds:['op'],note:'original note'};
  const owner={table:'A1',group:'A',nickname:'',note:'local note',items:[{id:'barley',qty:1}],remote:{opIds:['op']},pending:options.draft?[draft]:[],order:options.own?structuredClone(original):null,storageAvailable:true,
    emit(){},persist(){},poll:async()=>{},
    async flush(){state.flushes++;if(state.locked)throw lock();this.pending=[];},
    mutate(){throw Error('Unexpected draft mutation');},
    async api(path,input){
      calls.push({path,input});
      if(state.offline)throw Object.assign(new Error('Failed to fetch'),{name:'TypeError'});
      if(path.startsWith('/api/cart?'))return {cart:{items:this.items,opIds:['op'],paymentPending:state.locked}};
      if(!input)return {config:{preview:false,dineinEnabled:true,publishableKey:'pk_live_fixture'}};
      if(input.action==='checkout'&&state.conflict)throw lock();
      if(input.action==='cancel'){state.cancelled++;state.locked=false;return {cancelled:true};}
      return {order:order(input),clientSecret:'cs_fixture_secret'};
    },
  };
  function order(input=original){return {...input,id:input.requestId,items:[{id:'barley',qty:1,name:'薏米水',englishName:'Barley',price:3.5}],fulfilment:{},total:3.5,status:state.expired?'expired':state.paid?'paid':'awaiting_payment',fulfilmentCommitted:state.paid};}
  const context={console,crypto,URL,URLSearchParams,AbortSignal,structuredClone,store:owner,language:'zh',production:true,noteTimer:null,noteDraft:null,clearTimeout(){},setInterval(){},
    document:{hidden:false,addEventListener:(name,fn)=>handlers[name]=fn},$:s=>s==='#sheetBody'?body:null,
    tr:a=>a,bi:a=>a,escapeHTML:s=>String(s??'').replaceAll('<','&lt;'),money:n=>'$'+Number(n).toFixed(2),
    dish:()=>null,name:()=>'',photo:()=>'',styleName:s=>s,
    openModal(){},closeModal(){root.isConnected=false;},showCart(){root.isConnected=false;},toast(){},
    Fulfilment:{mode:()=> 'dinein',summary:()=>''},SharedTable:{confirm(){state.confirmed++;}},
    async fetch(){if(state.offline)throw Error('Failed to fetch');return {ok:true,json:async()=>({ok:true,order:order()})};},
    Stripe:()=>({initCheckoutElementsSdk:()=>({loadActions:async()=>({type:'success',actions:{getSession:()=>({total:{total:{amount:'SGD 3.50'}}}),confirm:async()=>{throw Error('No real or simulated payment in this test');}}}),createPaymentElement:()=>({mount(){},destroy(){},on(event,fn){if(event==='ready')fn();}})})}),
  };
  vm.createContext(context);vm.runInContext(copy,context);vm.runInContext('const errorText = e => OrderErrors.message(e, language);',context);vm.runInContext(ui,context);
  return {state,owner,calls,original,get root(){return root;},open:()=>vm.runInContext('CheckoutUI.open()',context),click:async attr=>{const button=new Node();button.attr=attr;await handlers.click({target:{closest:()=>button}});}};
}

// Another device sees a meaningful lock before flushing local changes.
const other=fixture({locked:true,draft:true});
await other.open();
assert.match(other.root.innerHTML,/本组有待付款订单/);
assert.match(other.root.innerHTML,/原设备和浏览器/);
assert(!other.root.innerHTML.includes('正在核对订单'));
assert(other.root.innerHTML.includes('data-checkout-retry'));
assert(!other.root.innerHTML.includes('data-checkout-edit'));
assert.equal(other.state.flushes,0);
assert.equal(other.owner.pending.length,1);
assert(!other.calls.some(c=>c.input));
assert.equal(other.owner.order,null);
await other.click('data-checkout-retry');
assert.equal(other.owner.pending.length,1);
other.state.locked=false;
await other.click('data-checkout-retry');
assert(other.root.innerHTML.includes('支付方式'));
assert.equal(other.root.querySelector('[data-checkout-pay]').disabled,false);

// Original payer resumes from credentials, even with blocked unsent drafts.
const own=fixture({own:true,locked:true,draft:true});
await own.open();
assert.equal(own.state.flushes,0);
assert.equal(own.owner.pending.length,1);
assert(own.root.innerHTML.includes('支付方式'));
const resumed=own.calls.find(c=>c.input?.action==='checkout').input;
assert.equal(resumed.requestId,own.original.requestId);
assert.equal(resumed.token,own.original.token);
assert.equal(resumed.note,'original note');
assert.equal(own.state.cancelled,0);

// Race after preflight must not retain a losing request or cancel a rival.
const race=fixture({conflict:true});
await race.open();
assert.equal(race.owner.order,null);
assert.match(race.root.innerHTML,/本组有待付款订单/);
assert(!race.root.innerHTML.includes('data-checkout-edit'));
assert.equal(race.state.cancelled,0);

// Network failures stop loading; retry keeps the original access credentials.
const offline=fixture({own:true,offline:true,draft:true});
await offline.open();
assert(!offline.root.innerHTML.includes('正在核对订单'));
assert.match(offline.root.innerHTML,/网络连接中断/);
assert(offline.root.innerHTML.includes('data-checkout-retry'));
assert.equal(offline.owner.order.token,offline.original.token);
offline.state.offline=false;
await offline.click('data-checkout-retry');
assert.equal(offline.owner.order.requestId,offline.original.requestId);

// An already paid or expired session must not reopen payment entry.
const paid=fixture({own:true,paid:true});await paid.open();
assert.equal(paid.state.confirmed,1);assert.equal(paid.owner.order,null);
assert(!paid.calls.some(c=>c.input?.action==='checkout'));
const expired=fixture({own:true,expired:true,draft:true});await expired.open();
assert.equal(expired.owner.order,null);assert.equal(expired.owner.pending.length,1);
assert(!expired.calls.some(c=>c.input?.action==='checkout'));
const expiring=fixture({own:true,expired:true});expiring.owner.paymentPolling=true;await expiring.open();
assert.match(expiring.root.innerHTML,/付款已过期/);assert(!expiring.root.innerHTML.includes('付款已完成'));

// A blocked flush must not suppress GET polling forever (real TableCart code).
const cache=new Map();let isLocked=true,gets=0;
const ctx={EventTarget,Event,crypto,console,AbortSignal,URLSearchParams,addEventListener(){},document:{addEventListener(){}},localStorage:{getItem:k=>cache.get(k)||null,setItem:(k,v)=>cache.set(k,v)},isLunchItem:()=>true};
vm.createContext(ctx);vm.runInContext(cartSource,ctx);
const cart=vm.runInContext('new TableCart("A1","A")',ctx);
cart.pending=[{opId:'draft',kind:'delta',dishId:'barley',delta:1}];
cart.api=async(path,input)=>{
  if(input&&isLocked)throw lock();
  if(!input)gets++;
  return {cart:{items:[],orders:[],opIds:[],paymentPending:isLocked,version:String(gets)}};
};
await cart.poll();assert.equal(gets,1);assert.equal(cart.pending.length,1);assert.equal(cart.remote.paymentPending,true);
assert.throws(()=>cart.mutate({kind:'delta',dishId:'barley',delta:1}),e=>e.code==='PAYMENT_PENDING');
isLocked=false;await cart.poll();assert.equal(gets,2);assert.equal(cart.pending.length,0);assert.equal(cart.remote.paymentPending,false);

// The real HTTP error envelope exposes only the safe lock code, not credentials.
let response;
const res={setHeader(){},status(code){this.code=code;return this;},json(body){response=body;return body;}};
fail(res,Object.assign(new RequestError('本组正在付款，请等待付款确认。',409),{code:'PAYMENT_PENDING',cart:{token:'must-not-leak'}}));
assert.equal(res.code,409);assert.equal(response.code,'PAYMENT_PENDING');assert(!response.cart);
console.log('PASS checkout recovery: original-payer resume, cross-device locks, preserved drafts, safe race handling, retry, stopped loading, paid/expired recovery and polling after blocked edits. No live calls.');
