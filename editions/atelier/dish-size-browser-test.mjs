import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {launchBrowser, browserEngine} from './browser-test-runtime.mjs';

const origin = process.env.DL_SIZE_TEST_URL || 'http://127.0.0.1:7898';
const output = resolve('editions/atelier/test-output/dish-size', browserEngine);
await mkdir(output, {recursive:true});
const browser = await launchBrowser();
try {
  const page = await browser.newPage({viewport:{width:390,height:1000},reducedMotion:'reduce'});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  // Production acceptance is read-only, including shared-cart traffic.
  await page.route('**/*', route => {
    const request = route.request();
    return request.url().startsWith(origin + '/') && request.method() === 'GET'
      ? route.continue() : route.abort();
  });
  await page.goto(origin + '/?table=A1&lang=en');
  await page.evaluate(() => CatalogClient.ready);
  await page.locator('.dish-image img').first().waitFor();
  async function loaded() {
    await page.evaluate(async () => {
      const images = [...document.querySelectorAll('.dish-image > img')];
      images.forEach(img => img.loading = 'eager');
      await Promise.all(images.map(img => img.decode()));
      await document.fonts.ready;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
  }
  async function check(label) {
    await loaded();
    const rows = await page.locator('.dish-image > img').evaluateAll(images => images
      .filter(img => img.parentElement.clientHeight)
      .map(img => {
        const frame = img.parentElement.getBoundingClientRect(), rect = img.getBoundingClientRect();
        const box = measureDish(img), ph = Math.min(rect.width / box.ratio, rect.height), pw = ph * box.ratio;
        const left = rect.left + (rect.width - pw) / 2 + box.x * pw;
        const top = rect.top + (rect.height - ph) / 2 + box.y * ph;
        return {
          name:img.closest('.dish-open').getAttribute('aria-label'),
          // Staff uploads may be portrait cutouts or landscape compositions,
          // even in Drinks. Match the limiting axis without distorting either.
          byHeight:box.w * box.ratio / box.h < (.9 / .97) * frame.width / frame.height,
          width:box.w * pw / frame.width, height:box.h * ph / frame.height,
          centerX:(left + box.w * pw / 2 - frame.left) / frame.width,
          centerY:(top + box.h * ph / 2 - frame.top) / frame.height,
          clipped:left < frame.left - 1 || top < frame.top - 1 || left + box.w * pw > frame.right + 1 || top + box.h * ph > frame.bottom + 1
        };
      }));
    assert(rows.length >= 35, 'entire menu, including recommendations, is loaded');
    for (const row of rows) {
      assert(Math.abs((row.byHeight ? row.height : row.width) - (row.byHeight ? .97 : .9)) < .005, `${label}: size ${JSON.stringify(row)}`);
      assert(row.width <= .905 && row.height <= .975, `${label}: preserves frame margins ${row.name}`);
      assert(Math.abs(row.centerX - .5) < .005 && Math.abs(row.centerY - .5) < .005, `${label}: centered ${row.name}`);
      assert(!row.clipped, `${label}: uncropped ${row.name}`);
    }
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no page overflow');
    console.log(`PASS ${browserEngine} ${label}: ${rows.length} images; uniform fit (90% width / 97% height), centered, no clipping/overflow`);
  }
  for (const width of [390,1440,1846,320,724,390]) {
    await page.setViewportSize({width,height:1000});
    await check(`${width}px resize without reload`);
    if ([1440,390].includes(width)) {
      await page.evaluate(() => document.querySelectorAll('*').forEach(el => {
        if (['fixed','sticky'].includes(getComputedStyle(el).position)) el.setAttribute('data-size-test-overlay','');
      }));
      for (const section of await page.locator('#menuList .menu-section').all()) {
        await section.screenshot({path:resolve(output, `${width}-${await section.getAttribute('data-section')}.png`),style:'[data-size-test-overlay]{visibility:hidden!important}'});
      }
    }
  }
  await page.locator('#languageButton').click();
  await check('Chinese menu rerender');
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
console.log(`Screenshots: ${output}`);
