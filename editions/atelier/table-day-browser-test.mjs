import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {launchBrowser,browserEngine} from './browser-test-runtime.mjs';
const data=await mkdtemp(`${tmpdir()}/dumpling-day-test-`);
const output=new URL(`test-output/table-day-${browserEngine}/`,import.meta.url);
await mkdir(output,{recursive:true});
const child=spawn(process.execPath,[fileURLToPath(new URL('preview.mjs',import.meta.url))],{env:{...process.env,PORT:'0',DL_PREVIEW_DATA:data},stdio:['ignore','pipe','pipe']});
let browser;
try{
 const base=await new Promise((resolve,reject)=>{let log='';const timer=setTimeout(()=>reject(Error('Preview timeout')),10000);child.stdout.on('data',b=>{log+=b;const m=log.match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(timer);resolve(m[0]);}});child.once('exit',code=>reject(Error(`Preview exit ${code}`)));});
 browser=await launchBrowser();
 for(const table of ['C2','D3']) {
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
 await page.goto(base+`/?table=${table}&lang=zh`);
 await page.waitForFunction(()=>typeof CheckoutUI!=='undefined'&&typeof store!=='undefined');
 await page.evaluate(async()=>{
  clearInterval(store.timer);store.paymentPolling=true;await store.poll();
  store.mutate({kind:'delta',dishId:'lunch-v2-barley',delta:1});await store.flush();
  const pending={requestId:crypto.randomUUID(),token:'a'.repeat(64),mode:'dinein',table:store.table,group:store.group,items:structuredClone(store.items),cartOpIds:[...store.remote.opIds],note:store.note};
  store.mutate({kind:'note',note:'不要冰'});await store.flush();
  store.order=pending;store.emit();
  // Old browser caches must not flash yesterday's receipt before the next poll.
  store.remote.orders=[{id:'yesterday',at:new Date(Date.now()-86400000).toISOString()}];
  if(store.orders.length)throw Error('Yesterday cache is visible');
  await CheckoutUI.open({skipAddons:true});
 });
 await page.locator('[data-checkout-retry]').waitFor();
 assert.equal(await page.evaluate(()=>store.order),null);
 assert.match(await page.locator('[data-checkout-error]').innerText(),/同桌修改了菜品或备注/);
 await page.screenshot({path:fileURLToPath(new URL(`${table}-recovery.png`,output))});
 await page.locator('[data-checkout-retry]').click();
 await page.waitForFunction(()=>document.querySelector('[data-checkout-pay]')?.disabled===false);
 assert.equal(await page.evaluate(()=>store.order.note),'不要冰');
 if(await page.locator('.addon-skip').isVisible())await page.locator('.addon-skip').click();
 await page.screenshot({path:fileURLToPath(new URL(`${table}-payment-ready.png`,output))});
 // C2 also exercises the live reported pending-payment state on a second phone.
 if(table==='C2'){
  const other=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await other.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  await other.goto(base+`/?table=${table}&lang=zh`);
  await other.waitForFunction(()=>typeof CheckoutUI!=='undefined'&&typeof store!=='undefined');
  await other.evaluate(async()=>{await store.poll();await CheckoutUI.open({skipAddons:true});});
  await other.locator('[data-table-unlock]').waitFor();
  await other.screenshot({path:fileURLToPath(new URL('C2-other-phone-locked.png',output))});
  await other.locator('[data-table-unlock]').click();
  await other.locator('[data-cancel-confirm]').click();
  await other.waitForFunction(()=>document.querySelector('[data-checkout-pay]')?.disabled===false);
  await other.evaluate(()=>CheckoutUI.unlock());
  assert.equal(await other.evaluate(()=>store.order),null);
  await other.close();
  // The original phone observes the cancellation, preserves dishes and starts again.
  await page.evaluate(async()=>{store.paymentPolling=false;await CheckoutUI.refresh();await CheckoutUI.open({skipAddons:true});});
  await page.waitForFunction(()=>document.querySelector('[data-checkout-pay]')?.disabled===false);
 }
 const payment=await page.evaluate(()=>({requestId:store.order.requestId,token:store.order.token}));
 await page.evaluate(()=>{store.paymentPolling=false;});
 await page.locator('[data-checkout-pay]').click();
 await page.waitForFunction(()=>store.order===null&&store.orders.length===1);
 const paid=await page.evaluate(()=>({orders:store.orders,items:store.items}));
 assert.equal(paid.orders[0].status,'paid');assert.equal(paid.items.length,0);
 await page.screenshot({path:fileURLToPath(new URL(`${table}-paid.png`,output))});
 // Duplicate callback/confirmation cannot create a second receipt.
 const repeated=await page.request.post(base+'/api/online',{data:{...payment,action:'preview-pay'}});
 assert.equal(repeated.status(),200);
 await page.reload();
 await page.waitForFunction(()=>typeof store!=='undefined'&&store.orders.length===1);
 assert.equal(await page.evaluate(()=>store.orders.length),1);
 const cart=await page.request.get(base+`/api/cart?table=${table}&group=A`);
 assert.equal((await cart.json()).cart.paymentPending,false);
 if(table==='C2'){
  // One phone scans another table, then returns via case-varied QR URLs.
  for(const [query,expectedTable,expectedGroup,receipts] of [
   ['table=D3','D3','A',0],['table=c2&group=a','C2','A',1],['table=C2&group=b','C2','B',0],['table=C2&group=A','C2','A',1]
  ]){
   await page.goto(base+'/?'+query+'&lang=zh');
   await page.waitForFunction(()=>typeof store!=='undefined'&&store.status==='synced');
   const scope=await page.evaluate(()=>({table:store.table,group:store.group,orders:store.orders.length,items:store.items.length}));
   assert.deepEqual(scope,{table:expectedTable,group:expectedGroup,orders:receipts,items:0});
  }
  console.log(`PASS ${browserEngine}: same phone C2 → D3 → c2/group=a → C2/group=b → C2/group=A; no cross-table/group receipt or cart leakage`);
 }
 assert.deepEqual(errors,[]);
 console.log(`PASS ${browserEngine} ${table}: stale-request retry → simulated payment paid → one receipt after duplicate callback/reload; cart empty and payment lock released${table==='C2'?'; second-phone cancellation and original-phone recovery passed':''}`);
 await page.close();
 }
 console.log(`Screenshots: ${fileURLToPath(output)}`);
}finally{await browser?.close();child.kill('SIGTERM');}
