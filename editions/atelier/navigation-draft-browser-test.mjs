// Local-only draft/navigation test: fake contact details, no payment or order.
import assert from 'node:assert/strict';
import {launchBrowser} from './browser-test-runtime.mjs';
const browser=await launchBrowser();
try {
  for(const lang of ['zh','en']) {
    const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
    const page=await context.newPage(), errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:7898/?lang=${lang}`);
    await page.locator('[data-fulfilment="delivery"]').click();
    await page.locator('.dish-add[data-recommendation="chicken-fried"]').click();
    await page.locator('[data-action="add-detail"]').click();
    const checkout=async()=>{await page.locator('#tray').click();await page.locator('[data-action="review"]').click();await page.locator('#onlineForm').waitFor();};
    await checkout();
    await page.locator('#customerName').fill('Draft QA');
    await page.locator('#customerPhone').fill('91234567');
    await page.locator('#postalCode').fill('059911');
    await page.locator('#address').fill('Local test address');
    await page.locator('#unit').fill('#01-02');
    await page.locator('[name="date"]').selectOption({index:1});
    await page.locator('[name="slot"]').selectOption({index:1});
    const values=await page.locator('#onlineForm').evaluate(form=>Object.fromEntries(new FormData(form)));
    assert.equal(await page.evaluate(()=>localStorage.getItem('atelier:checkout-draft:delivery')),null,'contact draft is not written to long-lived localStorage');
    const check=async()=>assert.deepEqual(await page.locator('#onlineForm').evaluate(form=>Object.fromEntries(new FormData(form))),values,'unfinished delivery draft survives navigation');
    await page.locator('#closeSheet').click();await checkout();await check();
    await page.goBack();await page.locator('#sheet').waitFor({state:'hidden'});
    await page.goForward();await page.locator('#onlineForm').waitFor();await check();
    await page.locator('#closeSheet').click();await page.locator('#fulfilmentButton').click();
    await page.locator('[data-fulfilment="takeaway"]').click();
    await page.locator('#fulfilmentButton').click();await page.locator('[data-fulfilment="delivery"]').click();
    await checkout();await check();
    await page.reload();await page.locator('[data-fulfilment="delivery"]').click();
    await checkout();await check();
    await page.locator('#closeSheet').click();
    await page.locator('#fulfilmentButton').click();
    await page.goBack();await page.locator('#sheet').waitFor({state:'hidden'});
    await page.goForward();await page.locator('.entry-choices').waitFor();
    assert.equal(await page.locator('#sheet').getAttribute('data-mode'),'fulfilment','Forward restores the chooser, not the cart');
    assert.deepEqual(errors,[]);
    await context.close();
    console.log(`PASS ${lang}: incomplete form, Back/Forward, mode roundtrip, refresh, correct chooser restoration`);
  }
  // Privacy/storage settings can deny sessionStorage. The current visit still
  // retains the draft in memory, without blocking editing or throwing errors.
  const context=await browser.newContext({viewport:{width:390,height:844}});
  await context.addInitScript(()=>Object.defineProperty(window,'sessionStorage',{get(){throw new DOMException('Blocked','SecurityError');}}));
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:7898/');
  await page.locator('[data-fulfilment="delivery"]').click();
  await page.locator('.dish-add[data-recommendation="chicken-fried"]').click();
  await page.locator('[data-action="add-detail"]').click();
  const checkout=async()=>{await page.locator('#tray').click();await page.locator('[data-action="review"]').click();await page.locator('#onlineForm').waitFor();};
  await checkout();await page.locator('#customerName').fill('Memory-only draft');
  await page.locator('#closeSheet').click();await checkout();
  assert.equal(await page.locator('#customerName').inputValue(),'Memory-only draft');
  assert.deepEqual(errors,[]);await context.close();
  console.log('PASS sessionStorage denied: memory-only draft remains usable');
} finally {await browser.close();}
