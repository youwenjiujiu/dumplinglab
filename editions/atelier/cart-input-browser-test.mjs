// Fresh local contexts; selecting/removing dishes only, no submitted orders.
import assert from 'node:assert/strict';
import {launchBrowser,browserEngine} from './browser-test-runtime.mjs';
import {mkdir} from 'node:fs/promises';
const output=new URL(`./test-output/cart-input/${browserEngine}/`,import.meta.url).pathname;
await mkdir(output,{recursive:true});
const browser=await launchBrowser();
try {
  for(const width of [320,390,724]) for(const lang of ['zh','en']) for(const mode of ['dinein','takeaway','delivery']) {
    const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',hasTouch:true});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:7898/?lang=${lang}`);
    await page.locator(`[data-fulfilment="${mode}"]`).click();
    const menuAdd=page.locator('.dish-add[data-recommendation="chicken-fried"]');
    await menuAdd.scrollIntoViewIfNeeded();
    const target=await menuAdd.evaluate(el=>{
      const r=el.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;
      return {width:r.width,height:r.height,edges:[[x-21,y],[x+21,y],[x,y-21],[x,y+21]].map(([a,b])=>document.elementFromPoint(a,b)?.closest('button')===el)};
    });
    assert.equal(target.width,30,'preserve the accepted small visible plus');
    assert(target.edges.every(Boolean),`44px hit region must belong to the plus, not the dish behind it: ${JSON.stringify(target)}`);
    const r=await menuAdd.boundingBox();
    await page.touchscreen.tap(r.x+r.width/2+21,r.y+r.height/2);
    assert.equal(await page.locator('#sheetTitle').innerText(),lang==='zh'?'鸡肉包菜':'Chicken & Cabbage Dumplings','tap just outside the visible circle opens the intended dish');
    await page.locator('#closeSheet').click();
    await menuAdd.press('Enter');
    await page.locator('[data-detail-delta="1"]').press('Enter');
    await page.locator('[data-action="add-detail"]').press('Enter');
    await page.locator('.dish-add[data-recommendation="chive-fried"]').press('Enter');
    await page.locator('[data-action="add-detail"]').press('Enter');
    await page.locator('#tray').press('Enter');
    for(const box of await page.locator('.cart-quantity button, #closeSheet').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {w:r.width,h:r.height};})))assert(box.w>=44&&box.h>=44);
    const focused=selector=>page.locator(selector).evaluate(el=>el===document.activeElement);
    for(const tab of ['ordered','pending']) {
      const selector=`.receipt-tabs [data-cart-tab="${tab}"]`;
      await page.locator(selector).press('Enter');
      assert(await focused(selector),'changing tabs must keep focus on the selected tab');
    }
    // Both visual cart layouts share the same keyboard rules.
    for(const layout of ['table','list']) {
      if(layout==='list')await page.locator('[data-table-layout]').press('Enter');
      const plus=page.locator('[data-cart-delta="1"]').first();
      await plus.press('Enter');
      assert(await plus.evaluate(el=>el===document.activeElement),'quantity focus survives render');
      await page.locator('[data-cart-delta="-1"]').first().press('Enter');
      assert(await page.locator('[data-cart-delta="-1"]').first().evaluate(el=>el===document.activeElement));
      await page.locator('.cart-dish-open').first().press('Enter');
      assert.equal(await page.locator('#closeSheet').getAttribute('aria-label'),mode==='dinein'?(lang==='zh'?'返回本桌':'Back to our table'):(lang==='zh'?'返回订单':'Back to order'));
      await page.locator('#closeSheet').press('Enter');
      assert(await page.locator('.cart-dish-open').first().evaluate(el=>el===document.activeElement),'return from detail keeps the originating dish focused');
    }
    // Reaching the limit must not strand focus on body or move it to another action.
    for(let n=2;n<20;n++)await page.locator('[data-cart-delta="1"]').first().press('Enter');
    assert(await page.locator('[data-cart-delta="1"]').first().isDisabled());
    assert(await page.locator('.cart-quantity').first().evaluate(el=>el===document.activeElement),'limit focuses the quantity group, not a destructive action');
    if(width===390&&mode==='takeaway')await page.screenshot({path:`${output}limit-${lang}.png`});
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('.cart-quantity b').first().innerText(),'20','repeated Enter at limit does not decrement or submit');
    // Deleting a row must preserve a nearby, non-action focus target.
    await page.locator('[data-cart-delta="-1"]').nth(1).press('Enter');
    assert.equal(await page.locator('.shared-dish').count(),1);
    assert(await page.locator('.cart-quantity').evaluate(el=>el===document.activeElement),'removed row focuses surviving quantity group');
    for(let n=20;n>0;n--)await page.locator('[data-cart-delta="-1"]').press('Enter');
    assert(await page.locator('.empty-ticket-copy h3').evaluate(el=>el===document.activeElement),'empty state is announced without focus returning to page body');
    assert.deepEqual(errors,[]);
    await context.close();
    console.log(`PASS ${width} ${lang} ${mode}: plus hit region, tabs, both cart layouts, detail return, quantity limit and removal focus`);
  }
}finally{await browser.close();}
