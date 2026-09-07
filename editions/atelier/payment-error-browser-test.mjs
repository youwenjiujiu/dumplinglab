// Local mocked payment failures: no order created and no payment-provider access.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({channel:'chrome'});
try {
  for(const lang of ['zh','en']) {
    const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
    const page=await context.newPage(), attempts=[], errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/api/online',async route=>{
      const input=route.request().method()==='POST'?route.request().postDataJSON():null;
      if(input?.action!=='checkout')return route.continue();
      attempts.push(input);
      await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,error:'付款服务暂时不可用，请重试'})});
    });
    await page.goto(`http://127.0.0.1:7898/?lang=${lang}`);
    await page.locator('[data-fulfilment="takeaway"]').click();
    await page.locator('.dish-add[data-recommendation="chicken-fried"]').click();
    await page.locator('[data-action="add-detail"]').click();
    await page.locator('#tray').click();await page.locator('[data-action="review"]').click();
    await page.locator('[data-online-pay]').click();
    const expected=lang==='zh'?'付款服务暂时不可用，请重试':'Payment is temporarily unavailable. Check your order status before retrying.';
    await page.waitForFunction(text=>document.querySelector('#onlineError')?.textContent===text,expected);
    assert(await page.locator('[data-online-pay]').isEnabled());
    await page.locator('#closeSheet').click();
    await page.locator('#tray').click();await page.locator('[data-action="review"]').click();
    await page.locator('[data-online-retry]').click();
    await page.waitForFunction(text=>document.querySelector('#onlineError')?.textContent===text,expected);
    assert.equal(attempts.length,2);
    assert.equal(attempts[0].requestId,attempts[1].requestId,'retry keeps original request');
    assert.equal(attempts[0].token,attempts[1].token,'retry keeps private order access');
    assert.deepEqual(attempts[0].items,attempts[1].items);
    assert.equal(attempts[0].expectedTotal,5.8);
    assert.equal(await page.locator('.pickup-ticket').count(),0,'failure never shows a paid pickup ticket');
    assert.deepEqual(errors,[]);
    await context.close();
    console.log(`PASS ${lang}: localized payment failure, enabled retry, unchanged request and total, no false success`);
  }
} finally {await browser.close();}
