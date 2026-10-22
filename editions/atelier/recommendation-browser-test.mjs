import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const {chromium}=createRequire(import.meta.url)('playwright'),root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const state=await mkdtemp(resolve(tmpdir(),'dumpling-recommended-')),out=resolve(root,'editions/atelier/test-output/recommendations');await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['editions/atelier/preview.mjs'],{cwd:root,env:{...process.env,PORT:'0',DL_PREVIEW_DATA:state},stdio:['ignore','pipe','pipe']});let browser;
try{
 const origin=await new Promise((yes,no)=>{const t=setTimeout(()=>no(Error('Preview timeout')),10000);server.once('error',no);server.stdout.on('data',chunk=>{const m=chunk.toString().match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(t);yes(m[0])}})});
 browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext({viewport:{width:1400,height:1000}});await context.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
 const errors=[],admin=await context.newPage();admin.on('pageerror',e=>errors.push(e.message));await admin.goto(origin+'/catalog-admin.html');await admin.locator('[name=password]').fill('preview-only');await admin.locator('#loginButton').click();
 const tofu='lunch-v2-braised-tofu',corn='lunch-v5-pork-corn';
 await admin.locator(`[data-recommend="${tofu}"]`).waitFor();assert.equal(await admin.locator(`[data-recommend="${tofu}"]`).getAttribute('aria-pressed'),'false');
 await admin.locator(`[data-recommend="${tofu}"]`).click();await admin.locator(`[data-recommend="${tofu}"][aria-pressed=true]`).waitFor();
 await admin.locator('#search').fill('卤豆腐');await admin.screenshot({path:resolve(out,'admin-quick-toggle.png')});
 await admin.locator(`[data-edit="${tofu}"]:not([data-mode])`).click();assert.equal(await admin.locator('[name=recommended]').isChecked(),true);await admin.screenshot({path:resolve(out,'admin-setting.png')});await admin.locator('#cancelEdit').click();
 const customer=await context.newPage();customer.on('pageerror',e=>errors.push(e.message));await customer.goto(origin+'/?table=A1&lang=zh');
 await customer.locator(`[data-recommendation="merchant-${tofu}"]`).first().waitFor();assert.equal(await customer.locator('.dish-recommended').count(),0,'recommended dishes carry no tag; the 推荐 section is the signal');
 
 await customer.locator(`[data-recommendation="merchant-${tofu}"]`).first().click();await customer.locator('#sheetTitle').waitFor();await customer.keyboard.press('Escape');
 await admin.locator(`[data-edit="${tofu}"]:not([data-mode])`).click();await admin.locator('[name=recommended]').uncheck();await admin.locator('#save').click();await admin.locator('#editor').waitFor({state:'hidden'});
 await customer.evaluate(()=>CatalogClient.refresh());assert.equal(await customer.locator(`[data-recommendation="merchant-${tofu}"]`).count(),0);
 await admin.locator('#search').fill('猪肉玉米');await admin.locator(`[data-recommend="${corn}"]`).click();await admin.locator(`[data-recommend="${corn}"][aria-pressed=true]`).waitFor();
 await customer.evaluate(()=>CatalogClient.refresh());await customer.locator(`[data-recommendation="merchant-${corn}"]`).first().waitFor();await customer.locator(`[data-recommendation="merchant-${corn}"]`).first().click();await customer.locator('#sheetTitle').waitFor();assert((await customer.locator('#sheetTitle').innerText()).includes('猪肉玉米'));assert.equal(await customer.locator('[data-lunch-option="noodles"]').count(),0);await customer.keyboard.press('Escape');
 await customer.evaluate(()=>scrollTo(0,0));await customer.screenshot({path:resolve(out,'customer-recommendations.png')});
 await admin.reload();await admin.locator(`[data-recommend="${corn}"][aria-pressed=true]`).waitFor();
 assert.deepEqual(errors,[]);console.log('PASS browser recommendations: quick toggle, editable switch, save/reload persistence, live add/remove, no name badges, no-photo variant recommendation and unchanged configuration. Isolated local data.');
}finally{await browser?.close();server.kill('SIGTERM');await new Promise(yes=>server.exitCode!==null?yes():server.once('exit',yes));await rm(state,{recursive:true,force:true})}
