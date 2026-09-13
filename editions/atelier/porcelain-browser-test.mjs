// Fresh headless Chrome context, local preview only. Never uses a user profile.
// Run: node editions/atelier/porcelain-browser-test.mjs
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const origin = "http://127.0.0.1:7898";
const output = await mkdtemp(join(tmpdir(), "dumpling-porcelain-qa-"));
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const errors = [];
try {
  for (const width of [320, 360, 390, 430, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
    const page = await context.newPage();
    page.on("pageerror", e => errors.push(e.message));
    await page.route("**/*", route => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) { errors.push(`Unexpected external request: ${url.origin}`); return route.abort(); }
      return route.continue();
    });
    await page.goto(`${origin}/design?table=QP${crypto.randomUUID().slice(0, 7).toUpperCase()}`);
    await page.locator(".recommendation-card").first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    for (const language of ["zh", "en"]) {
      if (language === "en") await page.locator("#languageButton").click();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}/${language}: no horizontal page overflow`);
      const rows = await page.locator(".recommendation-card").evaluateAll(cards => cards.map(card => {
        const rect = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom }; };
        return { name: rect(card.querySelector(".dish-name")), english: rect(card.querySelector(".dish-english")), price: rect(card.querySelector(".dish-price")), add: rect(card.querySelector(".dish-add")) };
      }));
      for (let i = 0; i < rows.length; i += 2) for (const field of ["name", "english", "price"]) {
        assert(Math.abs(rows[i][field].y - rows[i+1][field].y) < 1, `${width}/${language}: aligned ${field}, row ${i/2}`);
      }
      for (const row of rows) assert(row.add.y >= row.english.bottom - 1, `${width}/${language}: add does not cover translation`);
    }
    await page.locator("#languageButton").click();
    if ([390,1440].includes(width)) await page.screenshot({ path: join(output, `menu-${width}.png`) });
    await page.locator('.dish-add[data-recommendation="red-oil-chaoshou"]').click();
    await page.locator('#sheet[data-mode="dish"]').waitFor();
    await page.locator('[data-lunch-option="pieces"][data-value="9"]').click();
    assert.equal((await page.locator('.detail-price').innerText()).trim(), "$9.20");
    const cta = await page.locator('[data-action="add-detail"]').boundingBox();
    assert(cta.x >= 0 && cta.x + cta.width <= width && cta.width >= 100, `${width}: detail CTA fits`);
    if (width === 390) await page.screenshot({ path: join(output, "detail-390.png") });
    await page.locator('[data-action="add-detail"]').click();
    await page.locator('#sheet').waitFor({ state: "hidden" });
    await page.locator('#toast').waitFor({ state: "hidden" });
    if (width > 1150) await page.locator('#desktopTicket button').last().click();
    else await page.locator('#tray').click();
    await page.locator('#sheet[data-mode="cart"]').waitFor();
    assert(await page.locator('#sheet').evaluate(e=>e.scrollWidth<=e.clientWidth), `${width}: cart has no horizontal overflow`);
    assert((await page.locator('.cart-dish-copy').first().innerText()).includes('红油抄手'));
    assert((await page.locator('.cart-checkout').innerText()).includes('$9.20'));
    if (width === 390) await page.screenshot({ path: join(output, "cart-390.png") });
    await page.locator('[data-action="nickname"]').click();
    await page.locator('#sheet[data-mode="profile"]').waitFor();
    if (width === 390) await page.screenshot({ path: join(output, "profile-390.png") });
    assert(await page.locator('[data-action="save-nickname"]').isVisible(), `${width}: optional profile CTA visible`);
    await page.locator('#closeSheet').click();
    await page.locator('#sheet').waitFor({ state: "hidden" });
    await page.locator('[data-lunch-prep="tossed"]').click();
    await page.locator('[data-lunch-flavor="spicy"][data-value="true"]').click();
    await page.locator('[data-lunch-flavor="sesame"][data-value="true"]').click();
    await page.locator('[data-lunch-flavor="noodles"][data-value="true"]').click();
    if (width === 390) await page.screenshot({ path: join(output, "preparation-390.png") });
    await page.locator('[data-lunch-next]').click();
    await page.locator('[data-add="lunch-v2-pork-chive-shrimp"]').click();
    assert.equal((await page.locator('.detail-price').innerText()).trim(), "$9.80");
    await page.locator('[data-action="add-detail"]').click();
    await page.locator('#sheet').waitFor({ state: "hidden" });
    await page.locator('#toast').waitFor({ state: "hidden" });
    if (width > 1150) await page.locator('#desktopTicket button').last().click();
    else await page.locator('#tray').click();
    await page.locator('#sheet[data-mode="cart"]').waitFor();
    assert.equal(await page.locator('.shared-dish').count(), 2);
    assert((await page.locator('.cart-checkout').innerText()).includes('$19.00'));
    assert(await page.locator('#sheet').evaluate(e=>e.scrollWidth<=e.clientWidth), `${width}: multi-item cart fits`);
    if (width === 390) await page.screenshot({ path: join(output, "cart-pair-390.png") });
    await page.locator('.layout-switch').click();
    await page.locator('.cart-dishes[data-layout="list"]').waitFor();
    assert.equal(await page.locator('.shared-dish').count(), 2);
    await page.locator('.layout-switch').click();
    await page.locator('#closeSheet').click();
    await page.locator('#section-noodles').evaluate(e=>e.scrollIntoView({block:"start"}));
    if (width === 390) await page.screenshot({ path: join(output, "noodles-390.png") });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}: custom menu still fits`);
    console.log(`PASS ${width}px: bilingual row alignment, no overflow, chaoshou 9-piece add/cart, optional profile, preparation-first extras.`);
    await context.close();
  }
  assert.deepEqual(errors, []);
  const standard = await fetch(origin).then(r=>r.text());
  assert(!standard.includes("porcelain.css"), "Existing local/production entry remains unchanged");
  console.log(`Screenshots: ${output}`);
  console.log("PASS: isolated /design preview; no production requests and no orders submitted.");
} finally { await browser.close(); }
