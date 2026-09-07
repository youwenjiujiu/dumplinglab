// Local interaction QA only; no submitted orders or staff calls.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const output=await mkdtemp(join(tmpdir(),'dumpling-browse-efficiency-'));
const browser=await chromium.launch({headless:true,channel:'chrome'});
try {
  for(const width of [320,390,768]) for(const lang of ['zh','en']) {
    const context=await browser.newContext({viewport:{width,height:844},reducedMotion:'reduce'});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:7898/');
    await page.locator('[data-fulfilment="dinein"]').click();
    await page.locator('.recommendation-card').first().waitFor();
    if(lang==='en')await page.locator('#languageButton').click();
    await page.evaluate(()=>document.fonts.ready);
    assert(await page.locator('.section-suggestion').isVisible());
    if(width<761) {
      const first=await page.locator('.recommendation-card').first().boundingBox();
      const second=await page.locator('.recommendation-card').nth(1).boundingBox();
      assert(Math.abs(first.y-second.y)<1&&second.x>first.x+first.width,'two cards per row in both languages');
      const spacing=await page.locator('.recommendation-card').evaluateAll(es=>es.map(e=>e.querySelector('.dish-name').getBoundingClientRect().top-e.querySelector('.dish-image').getBoundingClientRect().bottom));
      assert(spacing.every(gap=>gap>=12),'restore original image/title breathing room');
      const overflow=await page.locator('.recommendation-card .dish-name').evaluateAll(es=>es.some(e=>e.scrollWidth>e.clientWidth+1));
      assert.equal(overflow,false,'full titles wrap without overflow');
      const target=await page.locator('.recommendation-card .dish-add').first().boundingBox();
      assert(target.width>=30&&target.height>=30,'original visible button retained');
    }
    await page.screenshot({path:join(output,`menu-${lang}-${width}.png`)});
    await page.locator('.section-suggestion').click();
    assert.equal(await page.locator('#sheet').getAttribute('data-mode'),'planner');
    assert(await page.locator('.planner-item').count()>0);
    await page.locator('#closeSheet').click();
    await page.locator('.dish-add[data-recommendation="chicken-fried"]').click();
    assert.equal(await page.locator('#detailPreparation').innerText(),lang==='zh'?'煎':'Pan-fried');
    await page.locator('[data-lunch-option="pieces"][data-value="9"]').click();
    assert.equal(await page.locator('.detail-price').innerText(),'$10.03');
    assert.equal(await page.locator('.dish-action strong').innerText(),'$10.03');
    await page.locator('[data-detail-delta="1"]').click();
    assert.equal(await page.locator('.dish-action strong').innerText(),'$20.06');
    assert.equal(await page.locator('.detail-image img').evaluate(e=>getComputedStyle(e).transform),'none');
    await page.screenshot({path:join(output,`detail-${lang}-${width}.png`)});
    await page.locator('[data-action="add-detail"]').click();
    await page.locator('#tray').click();
    assert.equal(await page.locator('.shared-dish').count(),1);
    assert.equal(await page.locator('.cart-quantity b').innerText(),'2');
    await page.locator('[data-cart-delta="-1"]').click();
    await page.locator('[data-cart-delta="-1"]').click();
    await page.locator('.empty-ticket').waitFor();
    await page.locator('#closeSheet').click();
    await page.locator('#searchButton').click();
    assert.equal(await page.locator('.search-result').count(),0);
    await page.locator('#cancelSearch').click();
    assert.equal(await page.locator('#searchPanel').isVisible(),false);
    await page.locator('[data-lunch-prep="tossed"]').click();
    await page.locator('#section-dumplings .dish-add').first().click();
    await page.locator('[data-lunch-option="noodles"][data-value="true"]').click();
    assert((await page.locator('.ingredient-list').innerText()).includes(lang==='zh'?'面条':'Noodles'));
    await page.locator('[data-lunch-option="sesame"][data-value="true"]').click();
    assert((await page.locator('.ingredient-list').innerText()).includes(lang==='zh'?'芝麻酱':'Sesame sauce'));
    await page.locator('#closeSheet').click();
    assert(await page.locator('body').evaluate(e=>e.scrollWidth<=innerWidth));
    assert.deepEqual(errors,[]);
    await context.close();
    console.log(`PASS ${width} ${lang}: original menu spacing, suggestions, portion/quantity totals, cart, search, preparation and extras`);
  }
  console.log(`Screenshots: ${output}`);
} finally {await browser.close();}
