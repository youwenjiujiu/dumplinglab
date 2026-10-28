import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {randomUUID,randomBytes} from 'node:crypto';
import {launchBrowser} from './browser-test-runtime.mjs';
const data=await mkdtemp(tmpdir()+'/dl-end-dining-');
const child=spawn(process.execPath,[new URL('preview.mjs',import.meta.url).pathname],{env:{...process.env,PORT:'0',DL_PREVIEW_DATA:data},stdio:['ignore','pipe','pipe']});
let browser;
try{
 const base=await new Promise((resolve,reject)=>{let logs='';const timer=setTimeout(()=>reject(Error('Preview timeout')),10000);child.stdout.on('data',b=>{logs+=b;const m=logs.match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(timer);resolve(m[0])}});child.once('exit',c=>reject(Error('Preview exited '+c)))});
 const staff={authorization:'Basic '+Buffer.from('staff:preview-only').toString('base64')};
 async function api(path,body,headers={},expected=200){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{...headers,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const out=await r.json();assert.equal(r.status,expected,JSON.stringify(out));return out;}
 const cart=async(table='C2',group='A')=>(await api(`/api/cart?table=${table}&group=${group}`)).cart;
 const add=async(table='C2',group='A')=>{const c=await cart(table,group);return (await api('/api/cart',{table,group,tableSession:c.tableSession,opId:randomUUID(),deviceId:randomUUID(),kind:'delta',dishId:'lunch-v2-barley',delta:1})).cart;};
 const start=async(table='C2',group='A')=>{const c=await add(table,group),p={requestId:randomUUID(),token:randomBytes(32).toString('hex')};await api('/api/online',{...p,mode:'dinein',table,group,tableSession:c.tableSession,items:c.items,cartOpIds:c.opIds});return p;};
 const pay=async(table='C2',group='A')=>{const p=await start(table,group);await api('/api/online',{...p,action:'preview-pay'});return p;};
 const first=await pay();await pay();await pay('D3');await pay('C2','B');
 const counter=(await api('/api/online',{action:'staff-order',requestId:randomUUID(),mode:'dinein',table:'C2',group:'A',counterMethod:'cash',items:[{id:'lunch-v2-water',qty:1}]},staff)).order;
 // Previously completed orders still belong to this party and remain on its table card.
 await api('/api/resolve',{id:first.requestId},staff);
 const before=await cart(),end={action:'end-table-session',table:'C2',group:'A',tableSession:before.tableSession};
 await api('/api/online',end,{},401);
 const pending=await start();await api('/api/online',end,staff,409);
 assert.equal((await cart()).tableSession,before.tableSession);
 await api('/api/online',{...pending,action:'preview-pay'});
 browser=await launchBrowser();const page=await browser.newPage({viewport:{width:1280,height:950}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>sessionStorage.setItem('dl-staff-password','preview-only'));
 await page.goto(base+'/staff.html');await page.locator('.dining').first().waitFor();
 const c2=page.locator('.dining').filter({has:page.locator('.table',{hasText:/^C2 号桌$/})});
 assert.equal(await c2.count(),1);assert.equal(await c2.locator('.dining-order').count(),4);
 assert.equal(await c2.locator('button').count(),1);assert.equal(await c2.locator('button').innerText(),'结束就餐');
 await page.screenshot({path:data+'/desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.reload();await c2.waitFor();await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:data+'/phone.png'});
 await c2.scrollIntoViewIfNeeded();await page.screenshot({path:data+'/phone-table.png'});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await c2.locator('button').click();await c2.waitFor({state:'detached'});
 const fresh=await cart();assert.notEqual(fresh.tableSession,before.tableSession);assert.equal(fresh.items.length,0);assert.equal(fresh.orders.length,0);
 await api('/api/cart',{table:'C2',group:'A',tableSession:before.tableSession,opId:randomUUID(),deviceId:randomUUID(),kind:'delta',dishId:'lunch-v2-water',delta:1},{},409);
 assert.equal((await cart('D3')).orders.length,1);assert.equal((await cart('C2','B')).orders.length,1);
 const raw=await api('/api/feed',null,staff);assert(!raw.events.some(e=>e.table==='C2'&&(e.group||'A')==='A'));
 const report=(await api('/api/online?report=1',null,staff)).report;assert(report.orders.some(o=>o.id===counter.id));
 await pay();const next=await cart();await api('/api/online',end,staff);assert.equal((await cart()).orders.length,1,'retry old end cannot erase new party');assert.equal((await cart()).tableSession,next.tableSession);
 await page.reload();await page.locator('.dining').first().waitFor();assert.equal(await c2.locator('.dining-order').count(),1);
 assert.deepEqual(errors,[]);
 console.log('PASS: multiple orders + counter order grouped; previous completed order visible; one end button; pending-payment/auth guards; old devices rejected; next party empty; other tables/groups preserved; history retained; repeated end cannot close next party; desktop/mobile no overflow.');console.log(data);
}finally{await browser?.close();child.kill('SIGTERM');}
