import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const {chromium}=createRequire(import.meta.url)('playwright'),root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const state=await mkdtemp(resolve(tmpdir(),'dumpling-method-photos-')),out=resolve(root,'editions/atelier/test-output/preparation-photos');await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['editions/atelier/preview.mjs'],{cwd:root,env:{...process.env,PORT:'0',DL_PREVIEW_DATA:state},stdio:['ignore','pipe','pipe']});let browser;
try{
 const origin=await new Promise((yes,no)=>{const t=setTimeout(()=>no(Error('Preview timeout')),10000);server.once('error',no);server.stdout.on('data',chunk=>{const m=chunk.toString().match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(t);yes(m[0])}})});
 browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext({viewport:{width:1400,height:1000}});await context.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
 const admin=await context.newPage(),errors=[];admin.on('pageerror',e=>errors.push(e.message));await admin.goto(origin+'/catalog-admin.html');await admin.locator('[name=password]').fill('preview-only');await admin.locator('#loginButton').click();
 const id='lunch-v2-pork-chive-shrimp';await admin.locator(`[data-edit="${id}"][data-mode=image]`).click();assert.equal(await admin.locator('.preparation-photo-card').count(),5);
 const upload=async(prep,file)=>{await admin.locator(`[data-preparation-file="${prep}"]`).setInputFiles(resolve(root,'web/img/l/'+file));await admin.locator('#formMessage').filter({hasText:'图片已预览'}).waitFor();const card=admin.locator('.preparation-photo-card').filter({has:admin.locator(`[data-preparation-file="${prep}"]`)});await card.locator('small').filter({hasText:'已单独配图'}).waitFor();return card.locator('img').getAttribute('src')};
 const boiled=await upload('boiled','filling-pork-chive-shrimp-boiled-cutaway-v1.webp');
 const peanut=await upload('peanut','filling-pork-chive-shrimp-tossed-cutaway-v1.webp');assert.notEqual(boiled,peanut);
 const methodBefore=await admin.locator('.preparation-photo-card>img').evaluateAll(ns=>ns.map(n=>n.getAttribute('src')));
 await admin.locator('#photoFile').setInputFiles(resolve(root,'web/img/l/filling-pork-chive-shrimp-boiled-cutaway-v1.webp'));
 await admin.locator('#formMessage').filter({hasText:'照片已上传并预览'}).waitFor();
 const cover=await admin.locator('[name=imageUrl]').inputValue();
 assert.deepEqual(await admin.locator('.preparation-photo-card>img').evaluateAll(ns=>ns.map(n=>n.getAttribute('src'))),methodBefore,'Uploading the cover cannot change configured or default method previews');

 await admin.locator('#preparationPhotos').scrollIntoViewIfNeeded();await admin.screenshot({path:resolve(out,'admin-methods.png')});await admin.locator('#save').click();await admin.locator('#editor').waitFor({state:'hidden'});
 await admin.reload();await admin.locator(`[data-edit="${id}"][data-mode=image]`).click();assert.equal(await admin.locator('[data-clear-preparation=boiled]').isEnabled(),true);assert.equal(await admin.locator('[data-clear-preparation=peanut]').isEnabled(),true);await admin.locator('#cancelEdit').click();
 const customer=await context.newPage();customer.on('pageerror',e=>errors.push(e.message));await customer.goto(origin+'/?table=A1&lang=zh');assert((await customer.locator(`#section-dumplings [data-dish="${id}"] .dish-image img`).getAttribute('src')).endsWith(cover),'Card uses its independent cover');await customer.locator(`#section-dumplings [data-dish="${id}"]`).click();assert((await customer.locator('.detail-image img').getAttribute('src')).endsWith(boiled));
 await customer.locator('[data-lunch-option=prep][data-value=soup]').click();assert(!(await customer.locator('.detail-image img').getAttribute('src')).endsWith(cover),'Unconfigured method does not inherit the cover');await customer.locator('[data-lunch-option=prep][data-value=peanut]').click();assert((await customer.locator('.detail-image img').getAttribute('src')).endsWith(peanut));await customer.locator('.detail-image img').evaluate(i=>i.decode());await customer.screenshot({path:resolve(out,'customer-peanut.png')});await customer.keyboard.press('Escape');await customer.locator('#sheet').waitFor({state:'hidden'});
 await admin.locator(`[data-edit="${id}"][data-mode=image]`).click();await admin.locator('[data-clear-preparation=boiled]').click();await admin.locator('#save').click();await admin.locator('#editor').waitFor({state:'hidden'});
 await customer.evaluate(()=>CatalogClient.refresh());await customer.locator(`#section-dumplings [data-dish="${id}"]`).click();assert(!(await customer.locator('.detail-image img').getAttribute('src')).endsWith(boiled));await customer.locator('[data-lunch-option=prep][data-value=peanut]').click();assert((await customer.locator('.detail-image img').getAttribute('src')).endsWith(peanut));await customer.keyboard.press('Escape');await customer.locator('#sheet').waitFor({state:'hidden'});
 const corn='lunch-v5-pork-corn';await admin.locator(`[data-edit="${corn}"][data-mode=image]`).click();const cornPhoto=await upload('boiled','filling-pork-chive-shrimp-boiled-cutaway-v1.webp');await admin.locator('#save').click();await admin.locator('#editor').waitFor({state:'hidden'});await customer.evaluate(()=>CatalogClient.refresh());
 await customer.locator(`#section-dumplings [data-dish="${corn}"]`).click();assert((await customer.locator('.detail-image img').getAttribute('src')).endsWith(cornPhoto));
 assert.deepEqual(errors,[]);console.log('PASS real browser: per-method upload, repeated uploads, save/reload, customer photo switching, independent reset/default fallback, and a recipe with no default photo. Isolated local data.');
}finally{await browser?.close();server.kill('SIGTERM');await new Promise(yes=>server.exitCode!==null?yes():server.once('exit',yes));await rm(state,{recursive:true,force:true})}
