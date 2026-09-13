// Local-only visual exploration; fresh headless Chrome, no user profile or kitchen orders.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const origin = "http://127.0.0.1:7898";
const output = await mkdtemp(join(tmpdir(), "dumpling-chromatic-"));
const browser = await chromium.launch({ channel: "chrome", headless: true });
const errors = [];
const luminance = color => {
  const c = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => {
    v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
  });
  return c[0] * .2126 + c[1] * .7152 + c[2] * .0722;
};
const contrast = (a, b) => { a = luminance(a); b = luminance(b); return (Math.max(a,b)+.05)/(Math.min(a,b)+.05); };
try {
  for (const palette of ["punch", "cobalt", "alloy"]) for (const width of [320, 390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 860 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    page.on("pageerror", e => errors.push(e.message));
    await page.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    await page.goto(`${origin}/design?palette=${palette}`);
    await page.locator('.recommendation-card').first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('html').getAttribute('data-palette'), palette);
    for (const language of ["zh", "en"]) {
      if (language === "en") await page.locator('#languageButton').click();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${palette}/${width}/${language}: page fits`);
      const rows = await page.locator('.recommendation-card').evaluateAll(cards => cards.map(card => Object.fromEntries(['dish-name','dish-english','dish-price'].map(c => [c,card.querySelector('.'+c).getBoundingClientRect().y]))));
      for(let i=0;i<rows.length;i+=2) for(const k of Object.keys(rows[i])) assert(Math.abs(rows[i][k]-rows[i+1][k])<1, `${palette}/${width}/${language}: ${k} alignment`);
    }
    await page.locator('#languageButton').click();
    const color = await page.evaluate(() => ({ paper: getComputedStyle(document.body).backgroundColor, text: getComputedStyle(document.querySelector('.dish-english')).color, button: getComputedStyle(document.querySelector('.dish-add')).backgroundColor, label: getComputedStyle(document.querySelector('.dish-add')).color }));
    assert(contrast(color.text,color.paper)>=4.5, `${palette}: secondary text contrast ${contrast(color.text,color.paper)}`);
    assert(contrast(color.label,color.button)>=4.5, `${palette}: action contrast ${contrast(color.label,color.button)}`);
    if (width===390) await page.screenshot({path:join(output,`${palette}-menu.png`)});
    await page.locator('.dish-add[data-recommendation="red-oil-chaoshou"]').click();
    await page.locator('[data-lunch-option="pieces"][data-value="9"]').click();
    assert.equal((await page.locator('.detail-price').innerText()).trim(),'$9.20');
    assert(await page.locator('#sheet').evaluate(e=>e.scrollWidth<=e.clientWidth), `${palette}/${width}: detail fits`);
    const cta=await page.locator('[data-action="add-detail"]').evaluate(e=>({foreground:getComputedStyle(e).color,background:getComputedStyle(e).backgroundColor}));
    assert(contrast(cta.foreground,cta.background)>=4.5, `${palette}: detail action contrast`);
    if (width===390) await page.screenshot({path:join(output,`${palette}-detail.png`)});
    await page.locator('[data-action="add-detail"]').click();
    await page.locator('#sheet').waitFor({state:'hidden'});
    if(width>1150) await page.locator('#desktopTicket button').last().click();
    else await page.locator('#tray').click();
    await page.locator('#sheet[data-mode="cart"]').waitFor();
    assert((await page.locator('.cart-checkout').innerText()).includes('$9.20'));
    assert(await page.locator('#sheet').evaluate(e=>e.scrollWidth<=e.clientWidth), `${palette}/${width}: cart fits`);
    console.log(`PASS ${palette}/${width}: bilingual alignment, text/action contrast, 9-piece selection, local draft cart; no order submitted.`);
    await context.close();
  }
  const comparison = await browser.newPage({viewport:{width:1400,height:1080},deviceScaleFactor:1});
  await comparison.goto(`${origin}/directions`);
  assert.equal(await comparison.locator('iframe').count(),3);
  for (const frame of comparison.frames().filter(f=>f.parentFrame())) {
    await frame.locator('.recommendation-card').first().waitFor();
    await frame.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(i=>i.loading!=='lazy').map(i=>i.decode().catch(()=>{})));});
  }
  await comparison.screenshot({path:join(output,'comparison.png'),fullPage:true});
  assert.deepEqual(errors,[]);
  const root=await fetch(origin).then(r=>r.text());
  assert(!root.includes('chromatic.css'));
  const invalid=await fetch(`${origin}/design?palette=invalid`).then(r=>r.text());
  assert(!invalid.includes('chromatic.css'));
  console.log(`Screenshots: ${output}`);
  console.log('PASS: three working directions, production entry unaffected, unknown palette rejected.');
} finally { await browser.close(); }
