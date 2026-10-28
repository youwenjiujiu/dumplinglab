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
 browser=await launchBrowser();const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
 await page.goto(base+'/?table=D3&lang=zh');
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
 await page.screenshot({path:fileURLToPath(new URL('recovery.png',output))});
 await page.locator('[data-checkout-retry]').click();
 await page.waitForFunction(()=>document.querySelector('[data-checkout-pay]')?.disabled===false);
 assert.equal(await page.evaluate(()=>store.order.note),'不要冰');
 if(await page.locator('.addon-skip').isVisible())await page.locator('.addon-skip').click();
 await page.screenshot({path:fileURLToPath(new URL('payment-ready.png',output))});
 assert.deepEqual(errors,[]);
 console.log(`PASS ${browserEngine}: yesterday cache hidden; real stale checkout rejected before reservation; retry reaches enabled payment with current dishes/note. Screenshots: ${fileURLToPath(output)}`);
}finally{await browser?.close();child.kill('SIGTERM');}
