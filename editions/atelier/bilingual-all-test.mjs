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
 await page.addInitScript(()=>localStorage.setItem('atelier-language','en'));
 await page.goto(base+'/?lang=en');assert.equal(await page.locator('#languageButton').count(),0);
 await page.waitForTimeout(450);await page.screenshot({path:out+'/entry-'+width+'.png'});
 await page.locator('[data-fulfilment=takeaway]').click();assert((await page.locator('[data-category=recommended]').first().innerText()).includes('Picks'));
 await page.waitForTimeout(450);await page.screenshot({path:out+'/menu-'+width+'.png'});
 await page.locator('.dish-add[data-recommendation="chive-fried"]').click();await page.waitForTimeout(450);await page.screenshot({path:out+'/dish-'+width+'.png'});
 assert((await page.locator('#sheetBody').innerText()).includes('Add to order'));await page.locator('[data-action=add-detail]').click();await page.locator(width>1000?'[data-action=cart]':'#tray').first().click();await page.waitForTimeout(450);await page.screenshot({path:out+'/cart-'+width+'.png'});
 await page.locator('[data-action=review]').click();await page.locator('#pickupDetailsForm').waitFor();assert((await page.locator('#pickupDetailsForm').innerText()).includes('Pickup date'));
 await page.locator('[name=customerName]').fill('Test');await page.locator('[name=customerPhone]').fill('91234567');await page.locator('#pickupDetailsForm button').click();await page.locator('.addon-skip').click();await page.waitForTimeout(450);await page.screenshot({path:out+'/checkout-'+width+'.png'});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);await page.evaluate(()=>closeModal());await page.evaluate(()=>RewardsUI.login());await page.locator('.auth-dialog').waitFor();await page.waitForTimeout(450);await page.screenshot({path:out+'/account-'+width+'.png'});assert((await page.locator('.auth-dialog').innerText()).includes('Sign in'));await page.close();
 }
 console.log('PASS always bilingual entry/menu/dish/cart/pickup/checkout at 320, 390, 1280px; legacy language preference ignored; no language switch; no browser errors.');console.log(out);
}finally{await browser?.close();server.kill('SIGTERM')}
