// Local mobile navigation only: no real orders, payments or shared-cart writes.
import {launchBrowser,browserEngine} from './browser-test-runtime.mjs';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const out=new URL('./test-output/takeaway-entry-scroll/',import.meta.url);
await mkdir(out,{recursive:true});
const browser=await launchBrowser();
try {
  for(const width of [390,430]) {
    const context=await browser.newContext({viewport:{width,height:760},isMobile:true,hasTouch:true,deviceScaleFactor:2,
      userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.64'});
    const page=await context.newPage(),errors=[],writes=[];
    await context.addInitScript(()=>{
      globalThis.entryHistoryBacks=0;
      const back=history.back.bind(history);
      history.back=()=>{entryHistoryBacks++;return back();};
    });
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/api/**',route=>{
      if(route.request().method()!=='GET'){writes.push(route.request().url());return route.abort();}
      return route.continue();
    });
    const top=async label=>{
      await page.locator('#sheet').waitFor({state:'hidden'});
      await page.waitForTimeout(700);
      const state=await page.evaluate(()=>({y:scrollY,rail:document.querySelector('#categoryScroll').scrollLeft,
        active:document.querySelector('#categoryScroll [aria-current="true"]')?.dataset.category}));
      assert(state.y<2&&state.rail<2&&state.active==='recommended',`${label}: ${JSON.stringify(state)}`);
    };
    await page.goto('http://127.0.0.1:7898/');
    await page.locator('[data-fulfilment="takeaway"]').tap();
    await top('first visit');
    assert.equal(await page.evaluate(()=>entryHistoryBacks),0,'Initial mode selection must not navigate Back in the host browser');
    for(const mode of ['takeaway','dinein','takeaway']) {
      await page.locator('#categoryScroll [data-category="sides"]').tap();
      await page.waitForFunction(()=>scrollY>500);
      await page.waitForTimeout(500);
      await page.locator('#fulfilmentButton').tap();
      await page.locator(`[data-fulfilment="${mode}"]`).tap();
      await top('select '+mode+' from sides');
    }
    // Reload a previously scrolled page, then choose the saved takeaway mode.
    await page.locator('#categoryScroll [data-category="sides"]').tap();
    await page.waitForTimeout(600);
    await page.reload();
    await page.locator('[data-fulfilment="takeaway"]').tap();
    await top('reloaded entry');
    assert.equal(await page.evaluate(()=>entryHistoryBacks),0,'Reloaded mode entry must not navigate Back either');
    await page.screenshot({path:new URL(`${browserEngine}-${width}-entry.png`,out).pathname});
    // Dismissing the chooser is not a request to restart the menu.
    await page.locator('#categoryScroll [data-category="sides"]').tap();
    await page.waitForTimeout(600);
    await page.locator('#fulfilmentButton').tap();
    const prior=await page.locator('body').evaluate(el=>-parseFloat(el.style.top));
    await page.locator('#closeSheet').tap();
    await page.waitForTimeout(600);
    assert(Math.abs(await page.evaluate(()=>scrollY)-prior)<2,'Cancel must retain reading position');
    assert.equal(await page.locator('#trayPictures img').count(),0,'Navigation cannot add a dish');
    await page.locator('#fulfilmentButton').tap();
    await page.goBack();
    await page.locator('#sheet').waitFor({state:'hidden'});
    await page.goForward();
    await page.locator('[data-fulfilment="takeaway"]').tap();
    await top('manual chooser Back/Forward');
    await page.locator('#categoryScroll [data-category="noodles"]').tap();
    await page.locator('.dish-add[data-add="lunch-v2-mince-scallion-noodles"]').tap();
    const selected=await page.evaluate(()=>JSON.stringify(store.items));
    assert.equal(await page.locator('#trayLabel').innerText(),'已选 1 份');
    await page.reload();
    await page.locator('[data-fulfilment="takeaway"]').tap();
    await top('entry with deliberately selected draft');
    assert.equal(await page.evaluate(()=>JSON.stringify(store.items)),selected,'Scroll reset cannot erase or duplicate chosen dishes');
    assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);
    await context.close();console.log(`PASS ${browserEngine} ${width}: fresh/reloaded entry, sides-to-mode, cancellation, Back/Forward, empty entry and saved cart`);
  }
}finally{await browser.close();}
