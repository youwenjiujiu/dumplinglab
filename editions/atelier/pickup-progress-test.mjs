// In-memory service + fresh VM customer sessions; no real orders or credentials.
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import {createOnlineService} from '../../web/server/online-core.js';
import statusEndpoint from '../../web/api/order-status.js';
const records=new Map();let clock=new Date('2026-09-07T04:00:00Z');
const config={locations:[{id:'test',name:'Test pickup',address:'Test address'}],origin:'https://example.test'};
const dependencies={config,now:()=>clock,storage:{
  async read(id){return structuredClone(records.get(id)||null);},
  async write(id,value,etag){const prior=records.get(id);if(prior?.etag!==etag){const e=new Error('CAS');e.conflict=true;throw e;}records.set(id,{value:structuredClone(value),etag:String(Number(prior?.etag||0)+1)});},
  isConflict:e=>e.conflict,async all(){return [...records.values()].map(r=>r.value);},
},payment:{ensureReady(){},async create(o){return {id:'test-'+o.id,url:'https://checkout.stripe.com/test'};}},checkAddress(){throw Error('Delivery out of scope');}};
let service=createOnlineService(dependencies);
const input={requestId:randomUUID(),token:randomBytes(32).toString('hex'),mode:'takeaway',pickupLocation:'test',items:[{id:globalThis.MENU.find(d=>!d.styles&&!d.soldOut&&d.price>=5).id,qty:1}]};
const pending=await service.checkout(input);
await assert.rejects(service.advance(input.requestId,'preparing'),e=>e.status===409);
await assert.rejects(service.progress(input.requestId,'0'.repeat(32)),e=>e.status===404);
const payment={id:'test-'+input.requestId,metadata:{dumpling_order_id:input.requestId},currency:'sgd',amount_total:Math.round(pending.order.total*100),payment_status:'paid'};
await service.paymentEvent(payment);
const placed=await service.get(input.requestId,input.token),id=placed.id,code=placed.pickup.code;
assert.equal(placed.preparationStatus,'received');
await assert.rejects(service.progress(id,'f'.repeat(32)),e=>e.status===404);
const progress=await service.progress(id,code);
assert.deepEqual(Object.keys(progress).sort(),['id','preparationStatus','preparingAt','readyAt','collectedAt','resolvedAt'].sort(),'credential returns status only');
await assert.rejects(service.advance(id,'ready'),e=>e.status===409,'cannot skip into ready by mistake');
clock=new Date('2026-09-07T04:01:00Z');
await Promise.all([service.advance(id,'preparing'),service.advance(id,'preparing')]);
const preparing=await service.progress(id,code);
assert.equal(preparing.preparationStatus,'preparing');
clock=new Date('2026-09-07T04:02:00Z');
assert.equal((await service.advance(id,'preparing')).preparingAt,preparing.preparingAt,'duplicate preserves time');
assert.equal((await service.feed()).length,1,'preparing remains on kitchen queue');
await service.advance(id,'ready');
await assert.rejects(service.advance(id,'preparing'),e=>e.status===409);
await service.paymentEvent(payment);
service=createOnlineService(dependencies); // A new server instance sees persisted progress.
assert.equal((await service.get(id,input.token)).preparationStatus,'ready');
assert.deepEqual((await service.get(id,input.token)).pickup,placed.pickup);
assert.equal((await service.feed()).length,1,'ready is not handed over');

const files=await Promise.all(['cart-store.js','fulfilment.js'].map(f=>readFile(new URL(f,import.meta.url),'utf8')));
const local=new Map([['atelier-mode','takeaway'],['atelier:online:takeaway',JSON.stringify({remote:{items:[],orders:[placed],opIds:[]},pending:[]})]]);
let offline=false;const requests=[];
function customer(){
  const elements=new Map();
  const ctx={EventTarget,Event,structuredClone,AbortSignal,crypto:{randomUUID},URLSearchParams,
    addEventListener(){},setInterval(){return 0;},clearInterval(){},clearTimeout(){},
    document:{hidden:false,addEventListener(){}},
    localStorage:{getItem:k=>local.get(k)||null,setItem:(k,v)=>local.set(k,v)},sessionStorage:{getItem:()=>null},
    isLunchItem:()=>true,q:new URLSearchParams(),table:null,group:'A',modal:null,noteTimer:null,noteDraft:null,submitting:false,
    language:'zh',money:n=>`$${Number(n).toFixed(2)}`,CheckoutUI:{dispose(){},itemsHTML:()=>''},
    tr:(a,b)=>a,bi:(a,b)=>a,escapeHTML:s=>String(s),onCartChange(){},renderChrome(){},renderMenu(){},renderTray(){},
    openModal(type){ctx.modal=type;},closeModal(){ctx.modal=null;},
    $:s=>{if(!elements.has(s))elements.set(s,{focus(){}});return elements.get(s);},
    async fetch(url,options){
      requests.push({url,headers:options.headers});
      if(offline)throw Error('Offline');
      assert.equal(new URL(url,'https://example.test').searchParams.get('progress'),'1');
      const p=await service.progress(new URL(url,'https://example.test').searchParams.get('id'),options.headers['x-pickup-code']);
      return {ok:true,json:async()=>({ok:true,progress:p})};
    },
  };
  vm.createContext(ctx);vm.runInContext(files.join('\n')+'\nstore = new TableCart(null,"A"); Fulfilment.init();',ctx);
  return {ctx,elements};
}
let c=customer();
assert.equal(c.ctx.modal,'pickup','reopening takes customer to their saved ticket, not mode chooser');
assert(c.elements.get('#sheetBody').innerHTML.includes(placed.pickup.number));
for(let n=0;n<10&&c.ctx.store.polling;n++)await new Promise(resolve=>setImmediate(resolve));
await c.ctx.store.poll();
assert.equal(c.ctx.store.orders[0].preparationStatus,'ready');
assert(vm.runInContext('Fulfilment.pickupTicket(store.orders[0])',c.ctx).includes('餐已备好'));
assert.equal(c.ctx.store.progressSync[id],'synced');
assert(!requests.some(r=>r.url.includes(code)),'pickup secret never goes in URL');
offline=true;await c.ctx.store.poll();
assert.equal(c.ctx.store.progressSync[id],'offline');
assert.equal(c.ctx.store.orders[0].preparationStatus,'ready','network failure does not erase the receipt');
assert(vm.runInContext('Fulfilment.pickupTicket(store.orders[0])',c.ctx).includes('显示上次记录'));
offline=false;
await service.pickup(id,code,true);
await service.paymentEvent(payment);
c=customer();
for(let n=0;n<10&&c.ctx.store.polling;n++)await new Promise(resolve=>setImmediate(resolve));
await c.ctx.store.poll();
assert.equal(c.ctx.store.orders[0].preparationStatus,'collected');
assert(!vm.runInContext('Fulfilment.pickupTicket(store.orders[0])',c.ctx).includes('class="pickup-qr"'),'collected receipt stops presenting a valid-looking pickup QR');
await assert.rejects(service.advance(id,'ready'),e=>e.status===409);
assert.equal((await service.feed()).length,0);
await service.resolve(id);assert.equal((await service.progress(id,code)).preparationStatus,'collected');
const oldPassword=process.env.DL_STAFF_PASSWORD;process.env.DL_STAFF_PASSWORD='unit-test-only';
try{
  const res={setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
  await statusEndpoint({method:'POST',headers:{'x-pickup-code':code},body:{id,status:'ready'}},res);
  assert.equal(res.code,401,'a customer pickup code cannot advance an order');
}finally{if(oldPassword===undefined)delete process.env.DL_STAFF_PASSWORD;else process.env.DL_STAFF_PASSWORD=oldPassword;}
console.log('PASS pickup status: persistence, close/reopen, stale/offline copy, transition CAS, webhook replay, credential scope and staff authorization');
