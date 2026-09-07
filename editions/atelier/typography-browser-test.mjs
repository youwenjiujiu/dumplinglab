// Local UI checks only: never submit an order.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { readFile } from 'node:fs/promises';
for (const mode of ['dinein', 'takeaway', 'delivery']) {
  const source = await readFile(new URL(`../../web/brand/entry-${mode}-v1.svg`, import.meta.url), 'utf8');
  const header = await readFile(new URL(`../../web/brand/header-${mode}-v1.svg`, import.meta.url), 'utf8');
  assert.equal(header.trim(), source.replaceAll('#e51b00', '#983f32').trim(), 'header uses identical artwork, recolored only');
}
const output = new URL('./test-output/typography/', import.meta.url).pathname;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
try {
  for (const width of [320, 390, 724]) for (const lang of ['zh', 'en']) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:7898/?lang=${lang}`);
    await page.locator('.entry-art').first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    const family = await page.locator('body').evaluate(el => getComputedStyle(el).fontFamily);
    async function sameFont(selector) {
      for (const font of await page.locator(selector).evaluateAll(nodes => nodes.map(el => getComputedStyle(el).fontFamily))) {
        assert.equal(font, family, `shared font stack: ${selector}`);
      }
    }
    await sameFont('.fulfilment-entry h2, .entry-choices strong, .entry-en');
    await page.locator('[data-fulfilment="takeaway"]').click();
    await sameFont('.section-heading h2, .dish-name, .dish-price, .category-button, #fulfilmentButton');
    await page.locator('.dish-add[data-recommendation="chicken-fried"]').click();
    await sameFont('.detail-top h1, .detail-price, .ingredient-list, .chip');
    await page.locator('[data-action="add-detail"]').click();
    for (const mode of ['takeaway', 'dinein', 'delivery']) {
      if (mode !== 'takeaway') {
        await page.locator('#fulfilmentButton').click();
        await page.locator(`[data-fulfilment="${mode}"]`).click();
      }
      const icon = page.locator('#fulfilmentButton img');
      assert.equal(await icon.getAttribute('src'), `/brand/header-${mode}-v1.svg`);
      await icon.evaluate(img => img.decode());
      await page.locator('#fulfilmentButton').screenshot({ path: `${output}icon-${mode}-${lang}-${width}.png` });
      await page.locator('#tray').click();
      await page.locator('.our-table-head').waitFor();
      await sameFont('.our-table-head h2, .eyebrow, .table-members, .receipt-tabs button, .cart-dish-copy strong');
      const geometry = await page.evaluate(() => {
        const box = selector => {
          const r = document.querySelector(selector).getBoundingClientRect();
          return { top:r.top, bottom:r.bottom, left:r.left, right:r.right, width:r.width, height:r.height };
        };
        return { sheet:box('#sheet'), head:box('.our-table-head'), title:box('.our-table-head h2'), close:box('#closeSheet'), font:getComputedStyle(document.querySelector('.our-table-head h2')).fontSize };
      });
      assert(geometry.head.top - geometry.sheet.top >= 20 && geometry.head.top - geometry.sheet.top <= 28, 'cart starts 24px below edge');
      assert(geometry.title.right <= geometry.close.left, 'close has a reserved column');
      assert(geometry.close.width >= 44 && geometry.close.height >= 44, 'close touch target');
      assert.equal(geometry.font, width <= 360 ? '24px' : '26px');
      assert(await page.locator('#sheet').evaluate(el => el.scrollWidth <= el.clientWidth), 'no horizontal overflow');
      await page.screenshot({ path: `${output}cart-${mode}-${lang}-${width}.png` });
      // Close remains operable even after scrolling a populated cart.
      await page.locator('.cart-scroll').evaluate(el => { el.scrollTop = el.scrollHeight; });
      await page.locator('#closeSheet').click();
      assert(await page.locator('#sheet').isHidden());
    }
    assert.deepEqual(errors, []);
    console.log(`PASS typography, compact cart and icons: ${width} ${lang}`);
    await context.close();
  }
} finally { await browser.close(); }
console.log(output);
