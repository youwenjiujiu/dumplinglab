import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const data = await mkdtemp(`${tmpdir()}/dumpling-checkout-test-`);
const child = spawn(process.execPath, [fileURLToPath(new URL('preview.mjs', import.meta.url))], { env: {...process.env, PORT:'0', DL_PREVIEW_DATA:data}, stdio:['ignore','pipe','pipe'] });
try {
  const base = await new Promise((resolve,reject) => {
    let output='';const timer=setTimeout(()=>reject(Error('Preview startup timed out')),10000);
    child.stdout.on('data', chunk=>{output+=chunk;const m=output.match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(timer);resolve(m[0]);}});
    child.once('exit',()=>{clearTimeout(timer);reject(Error('Preview exited'));});
  });
  async function api(path,body,token) {
    const res=await fetch(base+path,{method:body?'POST':'GET',headers:{...(body?{'content-type':'application/json'}:{}),...(token?{authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});
    return {status:res.status,...await res.json()};
  }
  assert.equal((await fetch(base+'/checkout-ui.js')).status,200);
  const cfg=(await api('/api/online')).config;assert.equal(cfg.preview,true);assert.equal(cfg.dineinEnabled,true);
  const added=await api('/api/cart',{table:'PAYTEST',group:'A',opId:randomUUID(),deviceId:randomUUID(),kind:'delta',dishId:'lunch-v2-barley',delta:1});
  assert.equal(added.status,200);
  const input={requestId:randomUUID(),token:'c'.repeat(64),mode:'dinein',table:'PAYTEST',group:'A',items:added.cart.items,cartOpIds:added.cart.opIds,note:added.cart.note};
  const quote=await api('/api/online',{...input,action:'quote'});assert.equal(quote.order.total,3.85,'dine-in adds 10% service charge');
  const pending=await api('/api/online',{...input,action:'checkout'});assert.equal(pending.status,200);
  assert.equal((await api('/api/feed')).events.length,0);
  assert.equal((await api('/api/order',input)).status,402);
  assert.equal((await api('/api/online?id='+input.requestId)).status,401);
  assert.equal((await api('/api/online?id='+input.requestId,null,input.token)).order.status,'awaiting_payment');
  await api('/api/online',{...input,action:'preview-pay'});
  await api('/api/online',{...input,action:'preview-pay'});
  const cart=(await api('/api/cart?table=PAYTEST&group=A')).cart;
  assert.equal(cart.items.length,0);assert.equal(cart.orders.length,1);assert.equal(cart.orders[0].status,'paid');
  assert.equal((await api('/api/feed')).events.length,1);
  await api('/api/resolve',{id:input.requestId});assert.equal((await api('/api/feed')).events.length,0);
  const pickup={requestId:randomUUID(),token:'d'.repeat(64),mode:'takeaway',customer:{name:'Pickup QA',phone:'91234567'},pickupDate:cfg.pickupDays[0].date,pickupTime:cfg.pickupDays[0].slots[0],pickupLocation:cfg.locations[0].id,items:[{id:'lunch-v5-onsen-egg',qty:1}]};
  await api('/api/online',{...pickup,action:'checkout'});
  await api('/api/online',{...pickup,action:'preview-pay'});
  assert((await api('/api/online?id='+pickup.requestId,null,pickup.token)).order.pickup.number);
  console.log('PASS isolated HTTP: checkout asset, server quote, dine-in prepay, no unpaid staff orders, auth, duplicate callback, table receipt, staff resolution and pickup credential. Local-only fixtures at '+data);
} finally { child.kill('SIGTERM'); }
