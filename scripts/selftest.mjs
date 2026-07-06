/* Dumpling Lab self-test: drives the real ordering flow in Playwright on
   phone + desktop viewports, captures console/page errors, and screenshots
   every stage into OUT (default: ./selftest-out).

   Usage: node scripts/selftest.mjs [baseURL] */

import { chromium, devices } from "playwright";
import { mkdirSync } from "fs";

const BASE = process.argv[2] || "http://localhost:8377/?table=12&lang=zh";
const OUT = process.env.OUT || "selftest-out";
mkdirSync(OUT, { recursive: true });

const PROFILES = [
  ["iphone", devices["iPhone 13"]],
  ["desktop", { viewport: { width: 1280, height: 800 } }],
];

let failures = 0;

for (const [name, opts] of PROFILES) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push("pageerror: " + e.message));
  page.on("console", m => { if (m.type() === "error") errors.push("console: " + m.text()); });
  page.on("requestfailed", r => errors.push("request: " + r.url().split("/").pop() + " " + r.failure().errorText));

  const shot = async label => page.screenshot({ path: `${OUT}/${name}-${label}.png` });
  const step = async (label, fn) => {
    try { await fn(); await shot(label); console.log(`  ✓ ${label}`); }
    catch (e) { failures++; console.log(`  ✗ ${label}: ${e.message.split("\n")[0]}`); await shot(label + "-FAIL"); }
  };

  console.log(`\n=== ${name} ===`);
  await page.goto(BASE + "&r=" + Date.now());
  await page.waitForTimeout(1500);
  await shot("01-landing");

  await step("02-voyage-mid", async () => {
    await page.evaluate(() => scrollTo(0, document.querySelector("#voyage").offsetHeight * 0.32));
    await page.waitForTimeout(900);
    const cap = await page.locator("#vCaption h2").textContent();
    if (!cap) throw new Error("no caption in focus");
  });

  await step("03-voyage-deep", async () => {
    await page.evaluate(() => scrollTo(0, document.querySelector("#voyage").offsetHeight * 0.62));
    await page.waitForTimeout(900);
  });

  await step("04-menu", async () => {
    await page.evaluate(() => document.querySelector("#menu").scrollIntoView({ block: "start" }));
    await page.waitForTimeout(800);
    const tiles = await page.locator(".tile:visible").count();
    if (tiles < 10) throw new Error(`only ${tiles} tiles visible`);
  });

  await step("05-rail-jump", async () => {
    await page.locator("#railInner .chip").nth(6).click({ force: true });
    await page.waitForTimeout(1400);
    const top = await page.locator("#menu .chapter").nth(6).evaluate(el => el.getBoundingClientRect().top);
    const rail = await page.locator("#rail").evaluate(el => el.offsetHeight);
    if (Math.abs(top - rail) > 60) throw new Error(`chapter landed at ${Math.round(top)}, rail is ${rail}`);
  });

  await step("06-filter-veg", async () => {
    await page.locator("#filters .f-chip").nth(1).click({ force: true });
    await page.waitForTimeout(500);
    const meaty = await page.evaluate(() =>
      [...document.querySelectorAll(".tile")].filter(t =>
        t.style.display !== "none" && !MENU.find(d => d.id === t.dataset.id).veg).length);
    if (meaty) throw new Error(`${meaty} non-veg tiles still visible`);
    await page.locator("#filters .f-chip").nth(1).click({ force: true });  // clear
  });

  await step("07-search", async () => {
    await page.fill("#searchBox", "云吞");
    await page.waitForTimeout(500);
    const n = await page.evaluate(() =>
      [...document.querySelectorAll(".tile")].filter(t => t.style.display !== "none").length);
    if (n < 1 || n > 6) throw new Error(`search returned ${n} tiles`);
    await page.fill("#searchBox", "");
    await page.waitForTimeout(400);
  });

  await step("08-open-dish", async () => {
    // Tiles float perpetually; skip Playwright's stability wait.
    await page.locator(".tile .stage").first().click({ force: true });
    await page.waitForTimeout(1600);
    if (!await page.locator("#detail").isVisible()) throw new Error("detail did not open");
    const t = await page.locator("#detailCaption h2").textContent();
    if (!t) throw new Error("no dish title");
  });

  await step("09-add-to-cart", async () => {
    await page.locator("#qPlus").click();
    await page.locator("#addBtn").click();
    await page.waitForTimeout(1400);
    if (!await page.locator("#cart").isVisible()) throw new Error("cart did not open");
    const badge = await page.locator("#cartBadge").textContent();
    if (badge !== "2") throw new Error(`badge is ${badge}, expected 2`);
  });

  await step("10-send-order", async () => {
    await page.fill("#orderNote", "少辣，多谢");
    await page.locator("#sendOrder").click();
    await page.waitForTimeout(1200);
    if (!await page.locator("#ordered").isVisible()) throw new Error("confirmation did not show");
  });

  await step("11-back-and-history", async () => {
    await page.locator("#orderedDone").click();
    await page.waitForTimeout(500);
    await page.locator("#dockCart").click();
    await page.waitForTimeout(700);
    const hist = await page.locator("#history .h-order").count();
    if (hist < 1) throw new Error("no order history");
  });

  await step("12-lang-toggle", async () => {
    await page.locator("#cartScrim").click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(700);
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(700);
    await page.locator("#langToggle").click({ force: true });
    await page.waitForTimeout(600);
    const tag = await page.locator("#heroTagline").textContent();
    if (!/modern dumpling house/i.test(tag)) throw new Error(`tagline after toggle: ${tag}`);
  });

  if (errors.length) {
    failures += errors.length;
    console.log("  JS/console errors:");
    errors.forEach(e => console.log("   !", e));
  } else {
    console.log("  no JS errors");
  }
  await browser.close();
}

console.log(failures ? `\nFAILURES: ${failures}` : "\nALL PASS");
process.exit(failures ? 1 : 0);
