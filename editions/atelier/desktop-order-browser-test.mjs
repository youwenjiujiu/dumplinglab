// Local preview only. Exercise selection/navigation without sending an order.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

const url = 'http://127.0.0.1:7903/order?lang=';
const out = 'output/desktop-order-layout';
await mkdir(out, {recursive: true});
const browser = await chromium.launch({channel: 'chrome'});
const errors = [], writes = [];
const open = async (width, lang = 'en', baseline = false) => {
  const page = await browser.newPage({viewport: {width, height: 950}, reducedMotion: 'reduce'});
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (!['GET', 'HEAD'].includes(r.method())) writes.push(r.url()); });
  if (baseline) {
    const css = execFileSync('git', ['show', 'HEAD:editions/atelier/shared-table.css'], {encoding: 'utf8'});
    // Flatten the new paper-shadow wrapper to reproduce the original grid.
    await page.route('**/shared-table.css*', route => route.fulfill({contentType: 'text/css', body: css + '\n.desktop-ticket-frame { display: contents; }'}));
  }
  await page.goto(url + lang);
  await page.locator('[data-fulfilment="takeaway"]').click();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(120);
  return page;
};
const overflow = page => page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
const geometry = page => page.evaluate(() => Object.fromEntries(
  ['.masthead', '.workspace', '.menu-toolbar', '.dish-card', '.dish-name', '.table-tray', '.desktop-ticket'].map(selector => {
    const el = document.querySelector(selector), r = el.getBoundingClientRect(), s = getComputedStyle(el);
    return [selector, {x:r.x, y:r.y, width:r.width, height:r.height, display:s.display, font:s.fontSize, background:s.backgroundColor}];
  })
));

try {
  for (const width of [320, 390, 760, 1024, 1150]) {
    const before = await open(width, 'en', true), after = await open(width);
    assert.deepEqual(await geometry(after), await geometry(before), `${width}: mobile/tablet layout unchanged`);
    assert(await after.locator('.table-tray').isVisible());
    assert(!await after.locator('.desktop-ticket').isVisible());
    assert(!await overflow(after));
    if (width === 390) await after.screenshot({path: `${out}/phone-390.png`});
    await before.close(); await after.close();
    console.log(`PASS ${width}: identical mobile/tablet geometry, bottom cart retained`);
  }
  for (const width of [1151, 1280, 1440, 1920]) {
    for (const lang of ['en', 'zh']) {
      const p = await open(width, lang);
      assert(!await p.locator('.table-tray').isVisible());
      assert(await p.locator('.desktop-ticket').isVisible());
      const paper = await p.locator('.desktop-ticket').evaluate(x => ({clip:getComputedStyle(x).clipPath, radius:getComputedStyle(x).borderRadius}));
      assert(paper.clip.startsWith('polygon('), 'Receipt retains the torn-paper bottom edge');
      assert.equal(paper.radius, '0px', 'Receipt has square corners');
      assert(!await p.locator('#categoryScroll').isVisible());
      assert(!await p.locator('#categoryButton').isVisible());
      assert(await p.locator('#searchButton').isVisible());
      assert.equal(await p.locator('body > #brandFooter').count(), 1);
      assert(!await p.locator('.menu-toolbar').isVisible(), 'No redundant desktop toolbar');
      assert.equal(await p.locator('.header-actions > #searchButton').count(), 1);
      const menuTop = await p.locator('#menuList').boundingBox();
      const orderTop = await p.locator('#desktopTicket').boundingBox();
      assert(Math.abs(menuTop.y - orderTop.y) < 2, 'Menu starts level with order summary');
      assert(!await overflow(p));
      const g = await geometry(p);
      assert(g['.masthead'].height <= 70);
      assert.equal(g['.dish-name'].font, '17px');
      const clipped = await p.locator('.dish-name').evaluateAll(xs => xs.filter(x => x.scrollWidth > x.clientWidth + 1).map(x => x.textContent));
      assert.deepEqual(clipped, [], 'Full dish names fit without truncation');
      await p.screenshot({path: `${out}/desktop-${width}-${lang}.png`});
      await p.locator('.side-category[data-category="noodles"]').click();
      await p.waitForTimeout(100);
      const heading = await p.locator('#section-noodles').boundingBox();
      assert(heading.y >= 68 && heading.y < 180, 'Category lands below sticky header');
      const ticket = await p.locator('#desktopTicket').boundingBox();
      assert(ticket.y >= 68 && ticket.y < 110, 'Desktop order stays below the header while scrolling');
      await p.locator('#searchButton').click();
      await p.locator('#searchInput').fill(lang === 'en' ? 'chicken' : '鸡');
      await p.waitForTimeout(250);
      assert(await p.locator('#menuList .search-result').count() > 0);
      await p.locator('#cancelSearch').click();
      assert(!await p.locator('#searchPanel').isVisible());
      await p.locator('.side-category').first().click();
      await p.evaluate(() => {
        const fly = TableMotion.fly;
        TableMotion.fly = (...args) => { window.lastFlyTarget = args[2]?.closest('#desktopTicket')?.id; return fly(...args); };
      });
      await p.locator('.dish-add[data-recommendation="chicken-fried"]').click();
      await p.locator('[data-action="add-detail"]').click();
      await p.waitForFunction(() => document.querySelectorAll('#desktopTicket .ticket-line').length === 1);
      await p.waitForFunction(() => window.lastFlyTarget === 'desktopTicket');
      assert(!await p.locator('#sheet').isVisible());
      await p.locator('#desktopTicket [data-action="cart"]').click();
      assert(await p.locator('#sheet').isVisible(), 'Desktop summary opens the existing cart');
      await p.locator('#closeSheet').click();
      if(width === 1440 && lang === 'en') await p.screenshot({path: `${out}/desktop-cart-filled.png`});
      if(width === 1440 && lang === 'en') {
        await p.locator('#brandFooter').scrollIntoViewIfNeeded();
        const footer = await p.locator('#brandFooter').boundingBox();
        const workspace = await p.locator('.workspace').boundingBox();
        assert(footer.y >= workspace.y + workspace.height, 'Footer is after the whole workspace');
        assert(footer.width > workspace.width * .95);
        assert(footer.height < 240, 'Compact desktop footer');
        await p.screenshot({path: `${out}/desktop-footer.png`});
      }
      assert(!await overflow(p));
      await p.close();
      console.log(`PASS ${width}/${lang}: desktop layout, category, sticky order, search, add, cart`);
    }
  }
  const resizePage = await open(1440);
  for (const width of [390, 1151, 1150, 1920]) {
    await resizePage.setViewportSize({width, height: 950});
    const selector = width >= 1151 ? '.header-actions > #searchButton' : '.menu-toolbar > #searchButton';
    await resizePage.waitForSelector(selector, {state: 'visible'});
    assert.equal(await resizePage.locator(width >= 1151 ? 'body > #brandFooter' : '#main > #brandFooter').count(), 1);
    assert.equal(await resizePage.locator('#searchButton').count(), 1);
    await resizePage.locator('#searchButton').click();
    assert(await resizePage.locator('#searchInput').evaluate(x => x === document.activeElement));
    await resizePage.locator('#cancelSearch').click();
    assert(await resizePage.locator('#searchButton').evaluate(x => x === document.activeElement));
    // The existing bilingual fitter settles card widths on animation frames.
    await resizePage.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth + 1);
    assert(!await overflow(resizePage));
  }
  await resizePage.close();
  console.log('PASS responsive search: one control, correct parent, open/cancel, focus return');
  assert.deepEqual(errors, []);
  assert.deepEqual(writes, [], 'No orders or other server writes');
} finally { await browser.close(); }
