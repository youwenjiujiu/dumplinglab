import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {randomUUID,randomBytes} from 'node:crypto';
import {launchBrowser} from './browser-test-runtime.mjs';
import {DEFAULT_PICKUP_HOURS,cleanPickupHours,pickupAvailability,checkPickupTime} from '../../web/server/pickup-hours.js';
const fixed=new Date('2026-10-28T06:31:00Z');
assert.equal(pickupAvailability(DEFAULT_PICKUP_HOURS,fixed).open,false);
for(const [time,open] of [['03:29:59',false],['03:30:00',true],['06:29:59',true],['06:30:00',false],['09:30:00',true],['13:00:00',false]])assert.equal(pickupAvailability(DEFAULT_PICKUP_HOURS,new Date('2026-10-28T'+time+'Z')).open,open);
assert.deepEqual(pickupAvailability(DEFAULT_PICKUP_HOURS,new Date('2026-10-28T04:00:00Z')).activeWindow,['11:30','14:30']);
assert.deepEqual(pickupAvailability(DEFAULT_PICKUP_HOURS,new Date('2026-10-28T10:00:00Z')).activeWindow,['17:30','21:00']);
assert.deepEqual(checkPickupTime({},DEFAULT_PICKUP_HOURS,new Date('2026-10-28T04:00:00Z')),{timing:'asap'});
assert.throws(()=>checkPickupTime({pickupDate:'2026-10-28',pickupTime:'16:00'},DEFAULT_PICKUP_HOURS,fixed),/自提/);
assert.throws(()=>cleanPickupHours({daily:[['17:00','16:00']],exceptions:{}}));
assert.throws(()=>cleanPickupHours({daily:[['11:30','14:30'],['14:00','21:00']],exceptions:{}}));
const closed=cleanPickupHours({...DEFAULT_PICKUP_HOURS,exceptions:{'2026-10-28':[]}});assert.equal(pickupAvailability(closed,new Date('2026-10-28T04:00:00Z')).open,false);
const data=await mkdtemp(tmpdir()+'/dl-pickup-details-');
const child=spawn(process.execPath,[new URL('preview.mjs',import.meta.url).pathname],{env:{...process.env,PORT:'0',DL_PREVIEW_DATA:data,DL_PREVIEW_TRACE:'1'},stdio:['ignore','pipe','pipe']});let browser;
try{
 const base=await new Promise((resolve,reject)=>{let logs='';const timer=setTimeout(()=>reject(Error('Preview timeout')),10000);child.stdout.on('data',b=>{logs+=b;const m=logs.match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(timer);resolve(m[0])}});child.once('exit',c=>reject(Error('Preview exited '+c)))});
 const staff={authorization:'Basic '+Buffer.from('staff:preview-only').toString('base64')};
 async function api(path,body,headers={},status=200){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{...headers,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const out=await r.json();assert.equal(r.status,status,JSON.stringify(out));return out;}
 await api('/api/catalog',{action:'pickup-hours',pickupHours:{daily:[['00:00','23:59']],exceptions:{}}},staff);
 let cfg=(await api('/api/online')).config;
 const today=cfg.pickupAvailability.date;
 const input={requestId:randomUUID(),token:randomBytes(32).toString('hex'),mode:'takeaway',pickupLocation:cfg.locations[0].id,items:[{id:'lunch-v2-barley',qty:1}]};
 await api('/api/online',{...input,action:'quote'},{},400);
 await api('/api/online',{...input,customer:{name:'Test',phone:'abc'},action:'quote'},{},400);

 const ready={...input,customer:{name:'林 小姐',phone:'+65 9123 4567'}};
 const q=(await api('/api/online',{...ready,action:'quote'})).order;assert.deepEqual(q.customer,{name:'林 小姐',phone:'+6591234567'});assert.equal(q.fulfilment.timing,'asap');assert.equal(q.fulfilment.slot,undefined);assert.equal(q.fulfilment.date,undefined);
 await api('/api/online',ready);await api('/api/online',{...ready,action:'preview-pay'});
 const feed=await api('/api/feed',null,staff);const order=feed.events.find(o=>o.id===input.requestId);assert.deepEqual(order.customer,q.customer);assert.equal(order.fulfilment.date,undefined);
 await writeFile(data+'/paid-pickup.json',JSON.stringify(order));
 browser=await launchBrowser();const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/?lang=zh');await page.locator('[data-fulfilment=takeaway]').click();await page.locator('.dish-add[data-recommendation="chive-fried"]').click();await page.locator('[data-action=add-detail]').click();await page.locator('#tray').click();await page.locator('[data-action=review]').click();await page.locator('#pickupDetailsForm').waitFor();
 assert.equal(await page.locator('[name=pickupDate],[name=pickupTime]').count(),0);assert((await page.locator('.pickup-hours-hint').innerText()).includes('00:00–23:59'));
 await page.locator('#pickupDetailsForm [type=submit]').click();assert.equal(await page.locator('[data-checkout-pay]').count(),0);
 await page.locator('[name=customerName]').fill('林 小姐');await page.locator('[name=customerPhone]').fill('+65 9123 4567');await page.screenshot({path:data+'/pickup-phone.png'});
 await page.locator('#pickupDetailsForm [type=submit]').click();await page.locator('[data-checkout-pay]').waitFor();assert((await page.locator('.pickup-contact').innerText()).includes('+6591234567'));await page.locator('.addon-skip').click();await page.screenshot({path:data+'/review-phone.png'});await page.locator('[data-checkout-pay]').click();await page.waitForFunction(()=>!document.querySelector('[data-checkout-pay]'));

 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const admin=await browser.newPage({viewport:{width:1280,height:950}});admin.on('pageerror',e=>errors.push(e.message));await admin.addInitScript(()=>sessionStorage.setItem('dl-staff-password','preview-only'));
 await admin.goto(base+'/catalog-admin.html#settings');await admin.locator('#pickupHoursForm').waitFor();await admin.locator('#pickupHoursForm [name=end1]').fill('14:30');await admin.locator('#pickupHoursForm [name=start2]').fill('18:00');await admin.locator('#pickupHoursForm [name=end2]').fill('21:00');await admin.locator('#pickupHoursForm button').click();await admin.waitForFunction(()=>document.querySelector('#pickupHoursStatus').textContent.includes('已保存'));
 cfg=(await api('/api/online')).config;assert.equal(cfg.pickupHours.daily[1][0],'18:00');
 await admin.locator('#pickupExceptionForm [name=date]').fill(today);await admin.locator('#pickupExceptionForm [name=closed]').check();await admin.locator('#pickupExceptionForm button').click();await admin.waitForFunction(()=>document.querySelector('#pickupExceptionStatus').textContent.includes('已保存'));
 cfg=(await api('/api/online')).config;assert.equal(cfg.pickupAvailability.open,false);
 await api('/api/online',{...ready,requestId:randomUUID(),action:'quote'},{},400);
 const paid=(await api('/api/online?id='+input.requestId,null,{authorization:'Bearer '+input.token})).order;assert.equal(paid.fulfilment.timing,'asap','setting changes do not rewrite paid pickups');
 const closedPage=await browser.newPage({viewport:{width:390,height:844}});await closedPage.goto(base+'/?lang=zh');
 await closedPage.waitForFunction(()=>document.querySelector('[data-fulfilment=takeaway]')?.dataset.pickupOpen==='false');
 assert(await closedPage.locator('[data-fulfilment=takeaway]').isDisabled());assert((await closedPage.locator('.pickup-availability-note').innerText()).includes('今日暂停自提'));assert((await closedPage.locator('[data-fulfilment=takeaway]').innerText()).includes('暂不可自提'));
 await closedPage.waitForTimeout(450);await closedPage.screenshot({path:data+'/pickup-closed-entry.png'});
 await closedPage.route('**/api/online',async route=>{const response=await route.fetch();const body=await response.json();if(body.config)body.config.pickupAvailability={open:false,windows:[['11:30','14:30'],['17:30','21:00']]};await route.fulfill({response,json:body});});
 for(const lang of ['zh','en']){await closedPage.goto(base+'/?lang='+lang);await closedPage.waitForFunction(()=>document.querySelector('[data-fulfilment=takeaway]')?.dataset.pickupOpen==='false');assert((await closedPage.locator('.pickup-availability-note').innerText()).includes('11:30–14:30 / 17:30–21:00'));await closedPage.waitForTimeout(450);await closedPage.screenshot({path:data+'/pickup-hours-notice-'+lang+'.png'});}
 await closedPage.unroute('**/api/online');
 await api('/api/catalog',{action:'pickup-hours',pickupHours:{daily:[['00:00','23:59']],exceptions:{}}},staff);
 await closedPage.reload();await closedPage.waitForFunction(()=>document.querySelector('[data-fulfilment=takeaway]')?.dataset.pickupOpen==='true');
 assert(await closedPage.locator('[data-fulfilment=takeaway]').isEnabled());await closedPage.waitForTimeout(450);await closedPage.screenshot({path:data+'/pickup-open-entry.png'});

 await admin.screenshot({path:data+'/settings-desktop.png',fullPage:true});await admin.setViewportSize({width:390,height:844});await admin.locator('#pickupHoursForm').scrollIntoViewIfNeeded();await admin.screenshot({path:data+'/settings-phone.png'});
 assert(await admin.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await admin.locator('[data-view=counter]').click();await admin.locator('[data-mode=takeaway]').click();await admin.locator('[name=counterName]').fill('林 小姐');await admin.locator('[name=counterPhone]').fill('91234567');await admin.screenshot({path:data+'/counter-phone.png'});assert.deepEqual(errors,[]);
 console.log('PASS pickup contact required/normalized; saved and fed to printer; closed hours rejected; daily and exceptional hours editable; paid orders preserved; no date/time selectors; mobile/desktop UI checked.');console.log(data);
}finally{await browser?.close();child.kill('SIGTERM')}
