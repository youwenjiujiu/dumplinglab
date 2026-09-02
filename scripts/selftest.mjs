/* Dumpling Lab regression test — the printed-menu (zine) front end.
   Usage: node scripts/selftest.mjs [baseURL] */
import { chromium, devices } from "playwright";
import { mkdirSync } from "fs";

const BASE = process.argv[2] || "http://localhost:8377/?table=12&lang=zh";
const OUT = process.env.OUT || "selftest-out";
mkdirSync(OUT, { recursive: true });
const PROFILES = [["iphone", devices["iPhone 13"]], ["desktop", { viewport: { width: 1280, height: 800 } }]];
let failures = 0;

for (const [name, options] of PROFILES) {
  const browser = await chromium.launch();
  const page = await (await browser.newContext(options)).newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(`pageerror: ${e.message}`));
  page.on("console", m => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });
  page.on("requestfailed", r => errors.push(`request: ${r.url()} ${r.failure()?.errorText || "failed"}`));
  const shot = label => page.screenshot({ path: `${OUT}/${name}-${label}.png` });
  const step = async (label, task) => {
    try { await task(); await shot(label); console.log(`  ✓ ${label}`); }
    catch (error) { failures += 1; console.log(`  ✗ ${label}: ${error.message.split("\n")[0]}`); await shot(`${label}-FAIL`); }
  };
  const click = sel => page.evaluate(s => document.querySelector(s).click(), sel);
  const stageOnScreen = async () => {
    await page.waitForFunction(() => { const r = document.querySelector("#threeStage")?.getBoundingClientRect(); return r && r.top >= 0 && r.bottom <= innerHeight; });
    await page.waitForTimeout(350);
  };

  console.log(`\n=== ${name} ===`);
  await page.goto(`${BASE}&r=${Date.now()}`);
  await page.waitForTimeout(900);

  await step("01-book", async () => {
    const info = await page.evaluate(() => ({
      dishes: new Set([...document.querySelectorAll(".dish")].map(e => e.dataset.id)).size,
      pages: document.querySelectorAll(".page").length,
      overflow: document.documentElement.scrollWidth - innerWidth,
      spine: document.querySelectorAll("#spine button").length,
    }));
    if (info.dishes !== 61) throw new Error(`expected 61 dishes, got ${info.dishes}`);
    if (info.pages !== 12) throw new Error(`expected cover + 11 chapters, got ${info.pages} pages`);
    if (info.overflow > 1) throw new Error(`document overflows ${info.overflow}px`);
    if (info.spine !== 12) throw new Error(`spine has ${info.spine} entries`);
    if (!await page.locator('#brandLogo[src="brand/dumpling-lab-primary.png"]').isVisible()) throw new Error("logo missing");
    if (/Dumplings Lab/.test(await page.locator("body").innerText())) throw new Error("obsolete plural brand name is visible");
  });

  await step("02-flip-to-chapter", async () => {
    await click('#spine button[data-page="3"]');
    await page.waitForFunction(() => document.querySelector('#spine button[data-page="3"]').classList.contains("on"), null, { timeout: 5000 });
    const sec = await page.evaluate(() => document.querySelector("#p3").dataset.sec);
    if (sec !== "noodles") throw new Error(`page 3 is ${sec}`);
  });

  await step("03-find-and-filter", async () => {
    await click("#findBtn");
    await page.locator("#search").fill("云吞");
    await page.waitForFunction(() => document.querySelectorAll("#findList .dish").length > 0, null, { timeout: 5000 });
    const hits = await page.locator("#findList .dish").count();
    if (hits < 1 || hits > 6) throw new Error(`unexpected hit count ${hits}`);
    await page.locator("#search").fill("");
    await click('#filters .fchip[data-m="veg"]');
    await page.waitForTimeout(150);
    const bad = await page.evaluate(() => [...document.querySelectorAll("#findList .dish")].filter(e => !MENU.find(d => d.id === e.dataset.id)?.veg).length);
    if (bad) throw new Error(`${bad} non-vegetarian results`);
    await click('#filters .fchip[data-m="veg"]');
    await click("#findClose"); await page.waitForTimeout(500);
  });

  await step("04-photo-dish-opens-on-its-photo", async () => {
    await click('.dish[data-id="hk-crab-roe-wonton"]');
    await page.locator("#threeStage[data-source='original-photo'] canvas").waitFor({ state: "visible" });
    if (!/wonton-soup\.png$/.test(await page.locator("#threeStage").getAttribute("data-image") || "")) throw new Error("stage is not textured with the source photo");
    if (!/实拍|REAL PHOTO/.test(await page.locator(".drag-hint").textContent() || "")) throw new Error("photo hint missing");
  });

  await step("05-add-and-ticket", async () => {
    await click("#dAdd"); await page.waitForTimeout(500);
    if (await page.locator("#cartCount").textContent() !== "1") throw new Error("ticket count is not 1");
    await click("#cartBar"); await page.waitForTimeout(500);
    if (!await page.locator("#cart.open").count()) throw new Error("ticket did not open");
    if (!/S\$10\.80/.test(await page.locator("#cartTotals").innerText())) throw new Error("total missing");
    await click("#cartClose"); await page.waitForTimeout(500);
  });

  await step("06-models-rotate-behind-the-photo", async () => {
    for (const id of ["red-oil-wontons", "minced-pork-egg-noodles", "wonton-soup-noodles", "dry-wonton-noodles"]) {
      const d = await page.evaluate(i => MENU.find(x => x.id === i).section, id);
      await click(`#spine button[data-page="${["signature","diy","noodles","buns","tangzi","rice","soup","sides","fried","veg","dessert"].indexOf(d) + 1}"]`);
      await page.waitForTimeout(400);
      await click(`.dish[data-id="${id}"]`);
      const stage = page.locator("#threeStage[data-source='generated-glb']");
      await stage.locator("canvas").waitFor({ state: "visible" });
      if (await page.locator(".d-pic.showing-3d").count()) throw new Error(`${id}: 3D took over before touch`);
      await stageOnScreen();
      const box = await stage.boundingBox();
      await page.mouse.move(box.x + box.width * .65, box.y + box.height * .5); await page.mouse.down();
      await page.mouse.move(box.x + box.width * .35, box.y + box.height * .5, { steps: 5 });
      const rot = Number(await stage.getAttribute("data-rotation-y"));
      if (!Number.isFinite(rot) || Math.abs(rot) < .1) throw new Error(`${id} did not rotate`);
      await page.mouse.up();
      if (Number(await stage.getAttribute("data-rotation-x")) < 0) throw new Error(`${id} tilted below the rim`);
      if (!await page.locator(".d-pic.showing-3d").count()) throw new Error(`${id}: 3D did not take over after touch`);
      await click("#sheetClose"); await page.waitForTimeout(450);
    }
  });

  await step("07-order", async () => {
    await click("#cartBar"); await page.waitForTimeout(400);
    await click("#placeOrder"); await page.waitForTimeout(600);
    if (await page.locator("#done").isHidden()) throw new Error("done slip not shown");
    await click("#doneBack");
    if (await page.locator("#cartCount").textContent() !== "0") throw new Error("ticket not cleared");
  });

  await step("08-language", async () => {
    await click("#langBtn"); await page.waitForTimeout(400);
    const sub = await page.locator("#heroSub").textContent();
    if (!/cooked to order/i.test(sub || "")) throw new Error(`unexpected English subtitle: ${sub}`);
    if (await page.evaluate(() => document.querySelectorAll(".dish").length) < 61) throw new Error("dishes lost on language switch");
  });

  if (errors.length) { failures += errors.length; console.log("  browser errors:"); errors.forEach(e => console.log("   !", e)); }
  else console.log("  no browser errors");
  await browser.close();
}
console.log(failures ? `\nFAILURES: ${failures}` : "\nALL PASS");
process.exit(failures ? 1 : 0);
