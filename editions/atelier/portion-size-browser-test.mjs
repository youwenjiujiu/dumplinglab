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
 const id='lunch-v2-pork-chive-shrimp';
 await admin.locator(`[data-edit="${id}"]:not([data-mode])`).first().click();
 assert.equal(await admin.locator('[name=pieces_9]').inputValue(),'9');
 await admin.locator('[name=pieces_5]').fill('6');await admin.locator('[name=pieces_9]').fill('12');
 await admin.locator('#save').click();await admin.locator('#editor').waitFor({state:'hidden'});
 await admin.reload();await admin.locator(`[data-edit="${id}"]:not([data-mode])`).first().click();assert.equal(await admin.locator('[name=pieces_12]').inputValue(),'12');
 const customer=await context.newPage();await customer.goto(origin+'/?table=A1&lang=zh');
 await customer.locator(`#section-dumplings [data-dish="${id}"]`).click();
 assert.deepEqual(await customer.locator('[data-lunch-option=pieces]').evaluateAll(ns=>ns.map(n=>n.dataset.value)),['6','12']);
 await customer.locator('[data-lunch-option=pieces][data-value="12"]').click();assert((await customer.locator('.detail-price').innerText()).includes('10.80'));
 assert.deepEqual(errors,[]);console.log('PASS browser: admin edits counts, saves/reloads and customer sees 6/12 with unchanged price.');
}finally{await browser?.close();server.kill('SIGTERM');await new Promise(yes=>server.exitCode!==null?yes():server.once('exit',yes));await rm(state,{recursive:true,force:true})}
