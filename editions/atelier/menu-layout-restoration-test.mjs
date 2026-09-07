// Read-only browser check: no orders or kitchen calls. Restores the original
// card geometry instead of asserting the rejected compact layout's density.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const output = await mkdtemp(join(tmpdir(), 'dumpling-menu-restored-'));
const browser = await chromium.launch({ channel: 'chrome' });
try {
  for (const width of [320,375,390,430,724]) for (const lang of ['zh','en']) {
    const context = await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`http://127.0.0.1:7898/?lang=${lang}`);
    await page.locator('[data-fulfilment="dinein"]').click();
    await page.locator('.recommendation-card').first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);
    const cards = await page.locator('.recommendation-card').evaluateAll(nodes => nodes.map(node => {
      const box = selector => { const b = node.querySelector(selector).getBoundingClientRect(); return {x:b.x,y:b.y,w:b.width,h:b.height,bottom:b.bottom}; };
      return { image:box('.dish-image'), name:box('.dish-name'), price:box('.dish-price'), add:box('.dish-add') };
    }));
    assert(cards.length >= 4);
    assert(Math.abs(cards[0].image.y-cards[1].image.y)<2,'two cards on the same row');
    assert(cards[1].image.x>cards[0].image.x+cards[0].image.w,'columns stay apart');
    for (const card of cards) {
      assert(card.name.y-card.image.bottom>=12,`image/name breathing room: ${width}/${lang}`);
      assert(card.price.y>=card.name.bottom,`name/price do not overlap: ${width}/${lang}`);
      assert(card.add.w>=30&&card.add.h>=30,'original visible add button retained');
    }
    assert(cards[2].image.y>=cards[0].price.bottom+20,'original row spacing restored');
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal overflow');
    assert.deepEqual(errors,[]);
    await page.screenshot({path:join(output,`menu-${lang}-${width}.png`)});
    await page.locator('.recommendation-card .dish-open').first().click();
    await page.locator('#sheet[data-mode="dish"]').waitFor();
    assert(await page.locator('.detail-title').isVisible(),'dish details remain usable');
    await page.locator('#closeSheet').click();
    console.log(`PASS original layout ${width} ${lang}`);
    await context.close();
  }
} finally { await browser.close(); }
console.log(output);
