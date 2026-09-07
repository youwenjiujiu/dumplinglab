import assert from 'node:assert/strict';
import { launchBrowser, browserEngine } from './browser-test-runtime.mjs';
import { mkdir } from 'node:fs/promises';
const output = new URL(`./test-output/entry-brand/${browserEngine}/`, import.meta.url).pathname;
await mkdir(output, { recursive: true });
const browser = await launchBrowser();
try {
  for (const width of [320, 390, 724]) for (const lang of ['zh', 'en']) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`http://127.0.0.1:7898/?lang=${lang}`);
    await page.locator('.entry-art').first().waitFor();
    await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.querySelectorAll('.entry-art')].map(img => img.decode())); });
    await page.waitForTimeout(350);
    const dialog = await page.locator('#sheet').boundingBox();
    assert(Math.abs(dialog.x + dialog.width / 2 - width / 2) < 2, 'dialog horizontally centered');
    assert(Math.abs(dialog.y + dialog.height / 2 - 844 / 2) < 2, 'dialog vertically centered');
    assert(dialog.x >= 15 && dialog.y >= 15, 'dialog has breathing room on all sides');
    const heading=await page.locator('#sheetTitle').boundingBox();
    const close=await page.locator('#closeSheet').boundingBox();
    assert(heading.y-dialog.y>=20 && heading.y-dialog.y<=28,'title uses compact top spacing');
    assert(close.width>=44 && close.height>=44,'close retains touch target');
    assert(heading.x+heading.width-44<=close.x,'title text reserves space for close');
    const geometry = await page.locator('.entry-choices button').evaluateAll(nodes => nodes.map(node => {
      const rect = el => { const b = el.getBoundingClientRect(); return { x:b.x, y:b.y, right:b.right, bottom:b.bottom, width:b.width }; };
      return { button:rect(node), image:rect(node.querySelector('img')), title:rect(node.querySelector('strong')) };
    }));
    assert.equal(geometry.length, 3);
    assert.equal(await page.locator('.entry-choices small').count(), 0, 'no explanatory subtitles');
    assert.equal(await page.locator('.fulfilment-entry').getAttribute('translate'), 'no');
    for (const text of ['选择用餐方式','Choose your order type','堂食','Dine-in','打包外带','Takeaway','外送','Delivery']) {
      assert(await page.locator('.fulfilment-entry').getByText(text,{exact:true}).isVisible(), `always bilingual: ${text}, ${lang}`);
    }
    assert.equal(await page.locator('#closeSheet').getAttribute('aria-label'),'关闭 / Close');
    assert.equal(await page.locator('#taxNotice').count(), 0);
    assert.equal(await page.locator('.delivery-entry').count(), 0);
    assert(Math.abs(geometry[0].image.y - geometry[1].image.y) < 1);
    for (const item of geometry) {
      assert(item.image.bottom <= item.title.y, 'image never overlaps title');
      assert(item.title.bottom <= item.button.bottom, 'bilingual title stays inside the option');
      assert(item.image.x >= item.button.x && item.image.right <= item.button.right);
    }
    assert.equal(await page.locator('.mode-symbol').count(), 0);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path:`${output}entry-${lang}-${width}.png` });
    await page.locator('[data-fulfilment="takeaway"]').click();
    assert.equal(await page.locator('#sheet').evaluate(el => el.open), false);
    assert(await page.locator('#tableButton').isHidden());
    assert(await page.locator('#dineinControls').isHidden());
    const headerBoxes = await page.locator('.masthead').evaluate(header => {
      const box = selector => { const r=header.querySelector(selector).getBoundingClientRect(); return {left:r.left,right:r.right,top:r.top,bottom:r.bottom}; };
      return {brand:box('.brand'),mode:box('#fulfilmentButton'),language:box('#languageButton')};
    });
    assert(headerBoxes.brand.right <= headerBoxes.mode.left, 'logo and mode button stay separate');
    assert(headerBoxes.mode.right <= headerBoxes.language.left, 'mode and language controls stay separate');
    assert(headerBoxes.language.right <= width, 'header fits narrow phones');
    await page.locator('#fulfilmentButton').click();
    await page.locator('[data-fulfilment="dinein"]').click();
    assert(await page.locator('#tableButton').isVisible());
    await page.locator('#fulfilmentButton').click();
    await page.locator('[data-fulfilment="delivery"]').click();
    assert(await page.locator('#tableButton').isHidden());
    await page.screenshot({path:`${output}header-delivery-${lang}-${width}.png`});
    assert.deepEqual(errors, []);
    console.log(`PASS entry artwork and all modes: ${width} ${lang}`);
    await context.close();
  }
} finally { await browser.close(); }
console.log(output);
