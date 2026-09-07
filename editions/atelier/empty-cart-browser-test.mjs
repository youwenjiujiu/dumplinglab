// Local-only QA: no submitted orders or staff calls.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const origin='http://127.0.0.1:7898';
const output=await mkdtemp(join(tmpdir(),'dumpling-empty-cart-'));
const browser=await chromium.launch({headless:true,channel:'chrome'});
try {
  for(const width of [320,390,768]) {
    for(const lang of ['zh','en']) {
      const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
      const page=await context.newPage(),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
      await page.goto(origin);
      await page.locator('[data-fulfilment="dinein"]').click();
      await page.locator('.recommendation-card').first().waitFor();
      if(lang==='en')await page.locator('#languageButton').click();
      await page.locator('#tray').click();
      assert.equal(await page.locator('.table-empty svg, .table-empty img').count(),0);
      assert.equal(await page.locator('.table-empty h3').innerText(),lang==='zh'?'尚未选菜':'No dishes selected');
      assert.equal(await page.locator('.cart-checkout').isVisible(),false);
      assert.equal(await page.locator('.table-empty button').count(),1);
      assert((await page.locator('#sheet').boundingBox()).height<530,'compact empty state');
      assert(await page.locator('#sheet').evaluate(e=>e.scrollWidth<=e.clientWidth));
      await page.screenshot({path:join(output,`empty-${lang}-${width}.png`)});
      await page.locator('.receipt-tabs [data-cart-tab="ordered"]').click();
      assert.equal(await page.locator('.empty-ticket h3').innerText(),lang==='zh'?'暂无订单':'No orders yet');
      assert.equal(await page.locator('.cart-checkout').isVisible(),false,'history empty has no duplicate action');
      assert((await page.locator('#sheet').boundingBox()).height<530,'history empty is content-sized');
      await page.screenshot({path:join(output,`history-empty-${lang}-${width}.png`)});
      await page.locator('.table-empty [data-action="close"]').click();
      assert.equal(await page.locator('#sheet').isVisible(),false);
      await page.locator('.dish-add[data-recommendation="chicken-fried"]').click();
      await page.locator('[data-action="add-detail"]').click();
      await page.locator('#tray').click();
      assert.equal(await page.locator('.shared-dish').count(),1);
      assert.equal(await page.locator('.table-empty').count(),0);
      assert.equal(await page.locator('.cart-checkout').isVisible(),true);
      await page.locator('.receipt-tabs [data-cart-tab="ordered"]').click();
      assert.equal(await page.locator('.empty-ticket-action').textContent(),lang==='zh'?'查看待下单↗':'View selected dishes↗');
      assert.equal(await page.locator('.cart-checkout').isVisible(),false);
      await page.screenshot({path:join(output,`history-with-selection-${lang}-${width}.png`)});
      await page.locator('.empty-ticket-action').click();
      assert.equal(await page.locator('.shared-dish').count(),1,'history action returns to pending, not menu');
      assert.equal(await page.locator('.cart-checkout').isVisible(),true);
      await page.locator('[data-cart-delta="-1"]').click();
      await page.locator('.table-empty').waitFor();
      assert.equal(await page.locator('.table-empty svg').count(),0);
      assert.equal(await page.locator('.cart-checkout').isVisible(),false);
      assert.deepEqual(errors,[]);
      await context.close();
      console.log(`PASS ${width} ${lang}: both empty tabs, correct action with/without selection, add/remove, no duplicate action or overflow`);
    }
  }
  console.log(`Screenshots: ${output}`);
} finally {await browser.close();}
