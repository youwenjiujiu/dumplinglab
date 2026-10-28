import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {launchBrowser} from './browser-test-runtime.mjs';
const out=await mkdtemp(tmpdir()+'/dl-bilingual-');
const server=spawn(process.execPath,['editions/atelier/preview.mjs'],{env:{...process.env,PORT:'0',DL_PREVIEW_DATA:out},stdio:['ignore','pipe','pipe']});let browser;
try{
 const base=await new Promise((resolve,reject)=>{let logs='';server.stdout.on('data',b=>{logs+=b;const m=logs.match(/http:\/\/127\.0\.0\.1:\d+/);if(m)resolve(m[0])});server.on('exit',c=>reject(Error('preview '+c)))});
 browser=await launchBrowser();
 for(const width of [390,320,1280]){
 const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/?lang=zh');await page.locator('[data-fulfilment=takeaway]').click();
 assert.equal(await page.locator('#languageButton').innerText(),'EN');
 const card=page.locator('.dish-open[data-recommendation="chive-fried"]');
 assert(!(await card.innerText()).includes('Potstickers'));assert((await card.innerText()).includes('韭菜虾仁猪肉煎饺'));
 await page.waitForTimeout(450);await page.screenshot({path:out+'/menu-'+width+'.png'});
 await page.locator('.dish-add[data-recommendation="chive-fried"]').click();await page.waitForTimeout(450);await page.screenshot({path:out+'/dish-'+width+'.png'});
 assert.equal(await page.locator('[data-action=add-detail] .bilingual').count(),0);
 await page.locator('[data-action=add-detail]').click();await page.locator(width>1000?'[data-action=cart]':'#tray').first().click();await page.waitForTimeout(450);await page.screenshot({path:out+'/cart-'+width+'.png'});
 assert.equal(await page.locator('#cartNote').getAttribute('placeholder'),'例如：不要香菜');
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
 await page.evaluate(()=>closeModal());await page.locator('#languageButton').click();assert.equal(await page.locator('#languageButton').innerText(),'中文');
 assert((await card.innerText()).includes('Potstickers'));assert(!(await card.innerText()).includes('韭菜虾仁猪肉煎饺'));await page.screenshot({path:out+'/english-'+width+'.png'});await page.evaluate(()=>{const first=MENU.find(d=>d.section==='drinks'&&d.active!==false);first.soldOut=true;renderMenu();});
 const statuses=await page.locator('#section-drinks .dish-card').evaluateAll(cards=>cards.map(c=>c.classList.contains('sold')));
 assert(statuses.includes(true));assert.equal(statuses.at(-1),true);assert(!statuses.slice(statuses.indexOf(true)).includes(false));
 await page.close();
 }
 console.log('PASS separate Chinese/English menus; sold-out dishes last; 320/390/1280px menu/detail/cart; no browser errors.');console.log(out);
}finally{await browser?.close();server.kill('SIGTERM')}
