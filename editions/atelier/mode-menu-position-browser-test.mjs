// Local-only browsing. Selecting an order type starts at Recommended; ordinary
// dialog dismissal must still preserve the guest's reading position.
import assert from 'node:assert/strict';
import {launchBrowser,browserEngine} from './browser-test-runtime.mjs';
const browser=await launchBrowser();
try {
  for(const width of [320,390,430]) for(const lang of ['zh','en']) {
    const context=await browser.newContext({viewport:{width,height:844},hasTouch:true,reducedMotion:'no-preference'});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:7898/?lang=${lang}`);
    await page.locator('[data-fulfilment="dinein"]').tap();
    for(const next of ['delivery','delivery','takeaway','takeaway','dinein','dinein']) {
      await page.locator('#categoryScroll [data-category="noodles"]').tap();
      await page.waitForFunction(()=>scrollY>500&&document.querySelector('#categoryScroll [data-category="noodles"]').getAttribute('aria-current')==='true');
      await page.waitForTimeout(450);
      await page.locator('#fulfilmentButton').tap();
      await page.locator(`[data-fulfilment="${next}"]`).tap();
      await page.locator('#sheet').waitFor({state:'hidden'});
      await page.waitForTimeout(550); // Native Back restoration and scroll observers settle.
      const state=await page.evaluate(()=>({y:scrollY,rail:document.querySelector('#categoryScroll').scrollLeft,active:document.querySelector('#categoryScroll [aria-current="true"]')?.dataset.category,mode:Fulfilment.mode()}));
      assert.equal(state.mode,next);
      assert(state.y<2&&state.rail<2&&state.active==='recommended',`${browserEngine} ${width}/${lang}/${next}: mode selection must start at Recommended, got ${JSON.stringify(state)}`);
    }
    // Closing the picker without selecting is cancellation, not a new start.
    await page.locator('#categoryScroll [data-category="noodles"]').tap();
    await page.waitForTimeout(550);
    await page.locator('#fulfilmentButton').tap();
    // Capture at modal opening; an in-flight smooth category scroll may advance
    // between an earlier measurement and the actual pointer event.
    const before=await page.locator('body').evaluate(el=>-parseFloat(el.style.top));
    await page.locator('#closeSheet').tap();
    await page.waitForTimeout(250);
    const after=await page.evaluate(()=>scrollY);
    assert(Math.abs(after-before)<2,`cancel keeps the previous reading position: ${before} -> ${after}`);
    assert.deepEqual(errors,[]);
    await context.close();
    console.log(`PASS ${browserEngine} ${width} ${lang}: all three selections/reselections reset page and category rail; cancel preserves scroll`);
  }
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await page.goto('http://127.0.0.1:7898/');
  await page.locator('[data-fulfilment="delivery"]').click();
  await page.locator('.dish-add[data-recommendation="chicken-fried"]').click();
  await page.locator('[data-detail-delta="1"]').click();
  await page.locator('[data-action="add-detail"]').click();
  const selection=await page.evaluate(()=>JSON.stringify(store.items));
  await page.locator('#searchButton').click();
  await page.locator('#searchInput').fill('薏米水');
  await page.locator('.search-result').first().waitFor();
  await page.locator('#cancelSearch').click();
  await page.locator('#fulfilmentButton').click();
  await page.locator('[data-fulfilment="delivery"]').click();
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(()=>search),'','a stale search cannot hide Recommended after mode confirmation');
  assert.equal(await page.evaluate(()=>JSON.stringify(store.items)),selection,'same-mode confirmation preserves dishes and portions');
  for(const mode of ['takeaway','delivery']) {
    await page.locator('#fulfilmentButton').click();
    await page.locator(`[data-fulfilment="${mode}"]`).click();
  }
  assert.equal(await page.evaluate(()=>JSON.stringify(store.items)),selection,'mode roundtrip preserves delivery selections');
  await page.locator('#categoryScroll [data-category="noodles"]').click();
  await page.reload();
  await page.locator('[data-fulfilment="delivery"]').click();
  await page.waitForTimeout(350);
  assert.equal(await page.evaluate(()=>JSON.stringify(store.items)),selection,'refresh preserves the saved cart');
  assert(await page.evaluate(()=>scrollY<2&&document.querySelector('#categoryScroll').scrollLeft<2&&document.querySelector('#categoryScroll [aria-current="true"]').dataset.category==='recommended'),'restored-mode entry starts at Recommended after reload');
  await page.close();
  console.log(`PASS ${browserEngine}: search cleared, cart preserved across reselection/mode roundtrip/refresh, restored entry starts at Recommended`);
}finally{await browser.close();}
