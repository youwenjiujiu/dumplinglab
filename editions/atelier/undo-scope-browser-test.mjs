// Local cart operations only. No orders, staff calls or payments.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser=await chromium.launch({channel:'chrome'});
try {
  for(const lang of ['zh','en']) for(const [from,to] of [['takeaway','dinein'],['dinein','takeaway']]) {
    const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:7898/?lang=${lang}`);
    await page.locator(`[data-fulfilment="${from}"]`).click();
    await page.locator('.dish-add[data-recommendation="chicken-fried"]').click();
    await page.locator('[data-action="add-detail"]').click();
    await page.locator('#tray').click();
    await page.locator('[data-cart-delta="-1"]').click();
    assert.equal(await page.locator('[data-action="undo-remove"]').count(),0);
    await page.locator('#closeSheet').click();
    await page.locator('#fulfilmentButton').click();
    await page.locator(`[data-fulfilment="${to}"]`).click();
    await page.locator('#tray').click();
    // An old toast used to resurface in the new modal, and its Undo mutated the
    // destination cart. Even if a stale control exists, it must never cross scopes.
    const undo=page.locator('[data-action="undo-remove"]');
    if(await undo.isVisible())await undo.click();
    assert.equal(await page.locator('.shared-dish').count(),0,'old Undo cannot add a dish to a different ordering mode');
    assert(await page.locator('[data-action="undo-remove"]').isHidden(),'stale Undo is retired');
    await page.locator('#closeSheet').click();
    await page.locator('#fulfilmentButton').click();
    await page.locator(`[data-fulfilment="${from}"]`).click();
    await page.locator('#tray').click();
    assert.equal(await page.locator('.shared-dish').count(),0,'source removal remains intact on return');
    assert.deepEqual(errors,[]);
    await context.close();
    console.log(`PASS scoped Undo ${lang}: ${from} -> ${to} -> ${from}`);
  }
} finally {await browser.close();}
