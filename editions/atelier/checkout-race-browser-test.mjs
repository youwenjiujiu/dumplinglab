// Delay read-only quote/config responses locally. Never create orders or payments.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser=await chromium.launch({channel:'chrome'});
try {
  for(const lang of ['zh','en']) for(const scenario of ['old-quote','old-config-error','old-mode-error']) {
    const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
    const page=await context.newPage(), errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:7898/?lang=${lang}`);
    await page.locator('[data-fulfilment="takeaway"]').click();
    const add=async()=>{
      await page.locator('.dish-add[data-recommendation="chicken-fried"]').click();
      await page.locator('[data-action="add-detail"]').click();
    };
    const review=async()=>{
      await page.locator('#tray').click();
      await page.locator('[data-action="review"]').click();
    };
    await add();
    let release, reached, finished, held=false;
    const ready=new Promise(r=>reached=r), gate=new Promise(r=>release=r), done=new Promise(r=>finished=r);
    await page.route('**/api/online',async route=>{
      const request=route.request();
      const matches=scenario==='old-config-error'?request.method()==='GET':request.method()==='POST'&&request.postDataJSON()?.action==='quote';
      if(held||!matches)return route.continue();
      held=true;
      const response=scenario==='old-quote'?await route.fetch():null;
      reached(); await gate;
      if(response)await route.fulfill({response});
      else await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,error:'STALE_REQUEST_ERROR'})});
      finished();
    });
    await review(); await ready;
    await page.locator('#closeSheet').click();
    if(scenario==='old-mode-error') {
      await page.locator('#fulfilmentButton').click();
      await page.locator('[data-fulfilment="delivery"]').click();
    }
    await add(); await review();
    if(scenario==='old-mode-error') {
      await page.locator('#onlineForm').waitFor();
      await page.locator('#customerName').fill('Keep this draft');
    } else await page.locator('[data-online-pay]').waitFor();
    const before=await page.locator('#sheetBody').innerHTML();
    release(); await done;
    // Allow both fetch completion and DOM updates from the released response.
    await page.waitForTimeout(200);
    assert.equal(await page.locator('#sheetBody').innerHTML(),before,'late response cannot replace the current checkout');
    if(scenario==='old-mode-error')assert.equal(await page.locator('#customerName').inputValue(),'Keep this draft');
    else assert.equal(await page.locator('.payment-total dd').innerText(),'$11.60','new two-portion quote remains authoritative');
    assert.deepEqual(errors,[]);
    await context.close();
    console.log(`PASS ${lang} ${scenario}: stale success/error ignored, current checkout and draft preserved`);
  }
} finally { await browser.close(); }
