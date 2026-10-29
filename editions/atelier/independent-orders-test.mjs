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
 browser=await launchBrowser();const page=await browser.newPage({viewport:{width:1100,height:900}});
 await page.addInitScript(()=>sessionStorage.setItem('dl-staff-password','preview-only'));
 await page.goto(base+'/staff.html');await page.waitForFunction(()=>document.querySelectorAll('.dining').length===5);
 assert.equal(await page.locator('.dining-order').count(),5);
 assert.equal(await page.locator('.dining[data-ended=true]').count(),1);
 const active=page.locator('.dining[data-ended=false]');
 const times=await active.evaluateAll(es=>es.map(e=>Number(e.dataset.orderTime)));assert.deepEqual(times,[...times].sort((a,b)=>b-a));
 const oldSession=(await cart()).tableSession;
 const target=active.filter({has:page.locator('.table',{hasText:/^C2 号桌$/})}).first();
 const response=page.waitForResponse(r=>r.url().endsWith('/api/resolve')&&r.request().method()==='POST');
 await target.locator('button').click();assert.equal((await response).status(),200);
 await page.waitForFunction(()=>document.querySelectorAll('.dining[data-ended=true]').length===2);
 assert.equal((await cart()).tableSession,oldSession,'ending one order does not clear table session');
 assert.equal((await cart('D3')).orders.length,1);
 await page.reload();await page.waitForFunction(()=>document.querySelectorAll('.dining[data-ended=true]').length===2);
 assert.equal(await page.locator('.dining').count(),5);
 assert.equal(await page.locator('.dining[data-ended=false]').count(),3);
 assert.equal(await page.locator('.dining').last().getAttribute('data-ended'),'true');
 await page.screenshot({path:data+'/independent-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:data+'/independent-phone.png',fullPage:true});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 console.log('PASS independent orders: five cards; latest first; ending one order preserves other four and table session; ended last after reload; mobile no overflow.');console.log(data);
}finally{await browser?.close();child.kill('SIGTERM');}
