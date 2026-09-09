// Local-only QA: no submitted orders or staff calls.
import assert from 'node:assert/strict';
import { launchBrowser, browserEngine } from './browser-test-runtime.mjs';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const origin='http://127.0.0.1:7898';
const output=await mkdtemp(join(tmpdir(),'dumpling-empty-cart-'));
const browser=await launchBrowser();
try {
  for(const width of [320,390,768]) {
    for(const lang of ['zh','en']) {
    for(const mode of ['dinein','takeaway']) {
      const context=await browser.newContext({viewport:{width,height:844},deviceScaleFactor:2,reducedMotion:'reduce'});
      const page=await context.newPage(),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.route('**/*',r=>new URL(r.request().url()).origin===origin && r.request().method()==='GET'?r.continue():r.abort());
      await page.goto(origin);
      await page.locator(`[data-fulfilment="${mode}"]`).click();
      await page.locator('.recommendation-card').first().waitFor();
      if(lang==='en')await page.locator('#languageButton').click();
      await page.locator('#tray').click();
      assert.equal(await page.locator('.table-empty svg, .table-empty img').count(),0);
      assert.equal(await page.locator('.table-empty h3').innerText(),lang==='zh'?'还没有选菜':'No dishes selected');
      assert.equal(await page.locator('.cart-viewbar').isVisible(),false,'no zero-count tabs');
      assert.equal(await page.locator('.table-members').isVisible(),mode==='dinein','retain shared identity only');
      assert.equal(await page.locator('.empty-ticket-zero').count(),0);
      assert((await page.locator('.empty-ticket-action').boundingBox()).height>=48);
      assert.equal(await page.locator('.cart-checkout').isVisible(),false);
      assert.equal(await page.locator('.table-empty button').count(),1);
      assert((await page.locator('#sheet').boundingBox()).height<530,'compact empty state');
      assert(await page.locator('#sheet').evaluate(e=>e.scrollWidth<=e.clientWidth));
      await page.locator('#sheet').screenshot({path:join(output,`empty-${browserEngine}-${mode}-${lang}-${width}.png`)});
      // Synthetic local state only: empty order-history entry remains supported.
      await page.evaluate(()=>SharedTable.open('ordered'));
      assert.equal(await page.locator('.empty-ticket h3').innerText(),lang==='zh'?'暂无订单':'No orders yet');
      assert.equal(await page.locator('.cart-checkout').isVisible(),false,'history empty has no duplicate action');
      assert((await page.locator('#sheet').boundingBox()).height<530,'history empty is content-sized');
      await page.locator('.table-empty [data-action="close"]').click();
      assert.equal(await page.locator('#sheet').isVisible(),false);
      await page.locator('.dish-add[data-recommendation="chicken-fried"]').click();
      await page.locator('[data-action="add-detail"]').click();
      await page.locator('#tray').click();
      assert.equal(await page.locator('.shared-dish').count(),1);
      assert.equal(await page.locator('.table-empty').count(),0);
      assert.equal(await page.locator('.cart-checkout').isVisible(),true);
      await page.locator('.receipt-tabs [data-cart-tab="ordered"]').click();
      assert.equal(await page.locator('.empty-ticket-action').textContent(),lang==='zh'?'查看待下单':'View selected dishes');
      assert.equal(await page.locator('.cart-checkout').isVisible(),false);
      await page.locator('.empty-ticket-action').click();
      assert.equal(await page.locator('.shared-dish').count(),1,'history action returns to pending, not menu');
      assert.equal(await page.locator('.cart-checkout').isVisible(),true);
      await page.locator('[data-cart-delta="-1"]').focus();
      await page.locator('[data-cart-delta="-1"]').press('Enter');
      await page.locator('.table-empty').waitFor();
      assert.equal(await page.locator('.cart-viewbar').isVisible(),false);
      assert.equal(await page.locator('.empty-ticket-copy h3').evaluate(e=>e===document.activeElement),true,'last removal focuses neutral heading');
      assert.equal(await page.locator('.table-empty svg').count(),0);
      assert.equal(await page.locator('.cart-checkout').isVisible(),false);
      await page.evaluate(()=>{
        store.remote.orders=[{id:'empty-ui-fixture',no:'TEST',at:Date.now(),mode:'dinein',table:'TEST',group:'A',items:[],total:0}];
        SharedTable.render();
      });
      assert.equal(await page.locator('.cart-viewbar').isVisible(),true,'existing history remains reachable');
      await page.locator('[data-cart-tab="ordered"]').click();
      assert.equal(await page.locator('.paper-receipt').count(),1);
      await page.evaluate(()=>{
        store.remote.orders=[];
        store.order={token:'local-fixture',requestId:'local-fixture'};
        SharedTable.open('pending');
      });
      assert.equal(await page.locator('.cart-checkout').isVisible(),true,'unresolved payment keeps checkout access');
      assert.equal(await page.locator('[data-checkout-cancel]').isVisible(),true);
      assert.deepEqual(errors,[]);
      await context.close();
      console.log(`PASS ${browserEngine} ${mode} ${width} ${lang}: compact empty state, add/remove/focus, history and payment preserved`);
    }
    }
  }
  console.log(`Screenshots: ${output}`);
} finally {await browser.close();}
