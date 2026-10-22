import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const {chromium}=createRequire(import.meta.url)('playwright'),root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const state=await mkdtemp(resolve(tmpdir(),'dumpling-filling-first-')),out=resolve(root,'editions/atelier/test-output/filling-first');await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['editions/atelier/preview.mjs'],{cwd:root,env:{...process.env,PORT:'0',DL_PREVIEW_DATA:state},stdio:['ignore','pipe','pipe']});let browser;
try{
 const origin=await new Promise((yes,no)=>{const t=setTimeout(()=>no(Error('Preview timeout')),10000);server.once('error',no);server.stdout.on('data',chunk=>{const m=chunk.toString().match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(t);yes(m[0])}})});
 browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext({viewport:{width:1400,height:1000}});await context.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(origin+'/?table=A1&lang=zh');await page.locator('#section-dumplings [data-dish]').first().waitFor();
 assert.equal(await page.locator('#section-dumplings [data-dish]').count(),6);assert.equal(await page.locator('[data-lunch-prep]').count(),0);
 await page.locator('#section-dumplings').scrollIntoViewIfNeeded();await page.screenshot({path:resolve(out,'choose-filling.png')});
 await page.locator('#section-dumplings [data-dish="lunch-v2-pork-chive-shrimp"]').click();
 assert.deepEqual(await page.locator('[data-lunch-option="prep"]').evaluateAll(ns=>ns.map(n=>n.dataset.value)),['boiled','soup','red-oil','peanut','fried']);
 await page.locator('[data-lunch-option="prep"][data-value="peanut"]').click();assert((await page.locator('#detailIngredients').innerText()).includes('花生酱'));assert(!(await page.locator('#detailIngredients').innerText()).includes('芝麻酱'));
 await page.locator('[data-lunch-option="pieces"][data-value="9"]').click();assert((await page.locator('.detail-price').innerText()).includes('11.80'));
 assert.equal(await page.locator('[data-lunch-option="sesame"]').count(),0);assert.equal(await page.locator('[data-lunch-option="noodles"]').count(),0);
 await page.screenshot({path:resolve(out,'dumpling-preparation.png')});await page.keyboard.press('Escape');await page.locator('#sheet').waitFor({state:'hidden'});
 for(const id of ['lunch-v2-prawn-roe-wonton','lunch-v2-pork-wonton']){
  await page.locator(`#section-dumplings [data-dish="${id}"]`).click();assert.deepEqual(await page.locator('[data-lunch-option="prep"]').evaluateAll(ns=>ns.map(n=>n.dataset.value)),['soup','red-oil','peanut']);
  await page.locator('[data-lunch-option="prep"][data-value="red-oil"]').click();assert((await page.locator('#detailIngredients').innerText()).includes('四川红油'));
  await page.screenshot({path:resolve(out,id+'-preparation.png')});await page.keyboard.press('Escape');await page.locator('#sheet').waitFor({state:'hidden'});
 }
 for(const id of ['chicken-fried','chive-fried']){
  await page.locator(`[data-recommendation="${id}"]`).first().click();
  assert((await page.locator('#sheetTitle').innerText()).includes('煎饺'));
  assert.equal(await page.locator('#detailPreparation').isVisible(),false);
  assert.equal(await page.locator('[data-lunch-option="prep"]').count(),0);
  assert.equal(await page.locator('[data-lunch-option="pieces"]').count(),2);
  await page.locator('[data-lunch-option="pieces"][data-value="9"]').click();
  assert((await page.locator('#sheetTitle').innerText()).includes('煎饺'));
  assert.equal(await page.locator('#detailPreparation').isVisible(),false);
  await page.keyboard.press('Escape');await page.locator('#sheet').waitFor({state:'hidden'});
 }
 assert.equal((await page.locator('#section-recommended [data-recommendation="roe-wonton-noodles"] .dish-price').innerText()).trim(),'$10.20');
 await page.locator('[data-recommendation="roe-wonton-noodles"]').first().click();assert((await page.locator('#sheetTitle').innerText()).includes('云吞面'));assert.equal(await page.locator('[data-lunch-option="prep"]').count(),0);assert.equal(await page.locator('[data-lunch-option="pieces"]').count(),0);assert((await page.locator('#lunchOptions').innerText()).includes('5 颗云吞'));await page.locator('[data-detail-delta="1"]').click();assert((await page.locator('.dish-action .quantity b').innerText()).includes('2'));
 assert.deepEqual(errors,[]);console.log('PASS real browser filling-first: six immediately visible fillings, 5/3 preparation rules, peanut/chilli ingredients, 5/9 surcharge price, no sesame/add-noodles, fixed fried/noodle recommendations preserved. Isolated local data.');
}finally{await browser?.close();server.kill('SIGTERM');await new Promise(yes=>server.exitCode!==null?yes():server.once('exit',yes));await rm(state,{recursive:true,force:true})}
