/* Dumpling Lab regression test — the instrument-panel front end.
   Usage: node scripts/selftest.mjs [baseURL] */
import { chromium, devices } from "playwright";
import { mkdirSync } from "fs";
const BASE = process.argv[2] || "http://localhost:8377/?table=12&lang=zh";
const OUT = process.env.OUT || "selftest-out"; mkdirSync(OUT, { recursive: true });
const PROFILES = [["iphone", devices["iPhone 13"]], ["desktop", { viewport: { width: 1280, height: 900 } }]];
let failures = 0;
for (const [name, options] of PROFILES) {
  const browser = await chromium.launch();
  const page = await (await browser.newContext(options)).newPage();
  const errors = [];
  let expectedOrderFailure = false;
  page.on("pageerror", e => errors.push(`pageerror: ${e.message}`));
  page.on("console", m => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`); });
  page.on("response", r => { if (r.status() >= 400 && !(expectedOrderFailure && /\/api\/order(?:\?|$)/.test(r.url()))) errors.push(`http ${r.status()}: ${r.url()}`); });
  page.on("requestfailed", r => errors.push(`request: ${r.url()} ${r.failure()?.errorText || "failed"}`));
  const shot = label => page.screenshot({ path: `${OUT}/${name}-${label}.png` });
  const step = async (label, task) => { try { await task(); await shot(label); console.log(`  ✓ ${label}`); } catch (e) { failures++; console.log(`  ✗ ${label}: ${e.message.split("\n")[0]}`); await shot(`${label}-FAIL`); } };
  const click = sel => page.evaluate(s => document.querySelector(s).click(), sel);
  const visibleDishes = () => page.evaluate(() => document.querySelectorAll("#list .dish").length);

  console.log(`\n=== ${name} ===`);
  await page.goto(`${BASE}&r=${Date.now()}`); await page.waitForTimeout(900);

  await step("01-cover-then-shop", async () => {
    if (await page.locator("#cover").isHidden()) throw new Error("cover not shown first");
    if (!await page.locator('#brandLogo[src="brand/dumpling-lab-primary.png"]').isVisible()) throw new Error("logo missing");
    await click("#enterBtn"); await page.waitForTimeout(600);
    const info = await page.evaluate(() => ({ dishes: document.querySelectorAll("#list .dish").length, overflow: document.documentElement.scrollWidth - innerWidth, kinds: document.querySelectorAll("#kinds button").length }));
    if (info.dishes !== 61) throw new Error(`expected 61 dishes, got ${info.dishes}`);
    if (info.overflow > 1) throw new Error(`document overflows ${info.overflow}px`);
    if (info.kinds !== 11) throw new Error(`kinds has ${info.kinds} entries`);
    if (/Dumplings Lab/.test(await page.locator("body").innerText())) throw new Error("obsolete plural brand name is visible");
  });
  await step("02-search-and-diet", async () => {
    await click("#findBtn"); await page.waitForTimeout(200);
    await page.locator("#search").fill("云吞");
    await page.waitForFunction(() => document.querySelectorAll("#list .dish").length <= 6, null, { timeout: 5000 });
    if (await visibleDishes() < 1) throw new Error("search found nothing");
    await page.locator("#search").fill(""); await page.waitForFunction(() => document.querySelectorAll("#list .dish").length === 61, null, { timeout: 5000 });
    await click('#diet button[data-d="veg"]'); await page.waitForTimeout(150);
    const bad = await page.evaluate(() => [...document.querySelectorAll("#list .dish")].filter(e => !MENU.find(d => d.id === e.dataset.id)?.veg).length);
    if (bad) throw new Error(`${bad} non-vegetarian tiles under the vegetarian diet`);
    await click('#diet button[data-d="all"]'); await page.waitForTimeout(150);
    await click("#findBtn"); await page.waitForTimeout(150);
  });
  await step("03-photo-dish-opens-on-its-photo", async () => {
    await click('.dish[data-id="hk-crab-roe-wonton"]');
    await page.locator("#threeStage[data-source='original-photo'] canvas").waitFor({ state: "visible" });
    if (!/wonton-soup\.(png|webp)$/.test(await page.locator("#threeStage").getAttribute("data-image") || "")) throw new Error("stage is not textured with the source photo");
  });
  await step("04-add-and-ticket", async () => {
    await click("#dAdd"); await page.waitForTimeout(600);
    if (await page.locator("#cartCount").textContent() !== "1") throw new Error("ticket count is not 1");
    if (!await page.locator("#rail").isVisible()) throw new Error("order rail hidden");
    await click("#rail"); await page.waitForTimeout(500);
    if (!/S\$10\.80/.test(await page.locator("#cartTotals").innerText())) throw new Error("total missing");
    await click("#cartClose"); await page.waitForTimeout(500);
  });
  await step("05-photo-dishes-tilt-in-the-hand", async () => {
    for (const id of ["xian-hot-oil-noodles", "wonton-soup-noodles", "dry-wonton-noodles"]) {
      await page.evaluate(i => document.querySelector(`.dish[data-id="${i}"]`).scrollIntoView({ block: "center" }), id); await page.waitForTimeout(200);
      await click(`.dish[data-id="${id}"]`);
      const stage = page.locator("#threeStage[data-source='original-photo']");
      await stage.locator("canvas").waitFor({ state: "visible" });
      await page.waitForFunction(() => { const r = document.querySelector("#threeStage")?.getBoundingClientRect(); return r && r.top >= 0 && r.bottom <= innerHeight; }); await page.waitForTimeout(350);
      const box = await stage.boundingBox();
      await page.mouse.move(box.x + box.width * .65, box.y + box.height * .5); await page.mouse.down();
      await page.mouse.move(box.x + box.width * .35, box.y + box.height * .5, { steps: 5 });
      const rot = Number(await stage.getAttribute("data-rotation-y"));
      if (!Number.isFinite(rot) || Math.abs(rot) < .05) throw new Error(`${id} did not tilt`);
      await page.mouse.up(); await page.waitForTimeout(500);
      if (Math.abs(Number(await stage.getAttribute("data-rotation-y"))) > .05) throw new Error(`${id} did not settle back to the photograph`);
      await click("#sheetClose"); await page.waitForTimeout(450);
    }
    if (await page.evaluate(() => MENU.some(d => d.model))) throw new Error("a generated model is still published");
  });
  await step("06-order", async () => {
    await click("#rail"); await page.waitForTimeout(400); await click("#placeOrder"); await page.waitForTimeout(600);
    if (await page.locator("#done").isHidden()) throw new Error("done slip not shown");
    const received = await page.evaluate(async () => {
      const no = JSON.parse(localStorage.getItem("dl-orders") || "[]").at(-1)?.no;
      const table = new URL(location.href).searchParams.get("table");
      const feed = await (await fetch("/api/feed", { cache: "no-store" })).json();
      const event = feed.events.find(e => e.type === "order" && e.table === table && e.no === no);
      if (event) await fetch("/api/resolve", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: event.id }) });
      return Boolean(event);
    });
    if (!received) throw new Error("order was not received by the staff feed");
    await click("#doneBack");
    if (await page.locator("#cartCount").textContent() !== "0") throw new Error("ticket not cleared");
  });
  await step("07-failed-order-keeps-ticket", async () => {
    await click('.dish[data-id="beijing-pork-guotie"]'); await click("#dAdd"); await page.waitForTimeout(250); await click("#rail"); await page.waitForTimeout(300);
    expectedOrderFailure = true;
    await page.route("**/api/order", route => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "test outage" }) }));
    await click("#placeOrder"); await page.waitForTimeout(350);
    expectedOrderFailure = false; await page.unroute("**/api/order");
    if (await page.locator("#cartCount").textContent() !== "1") throw new Error("failed order cleared the ticket");
    if (!await page.locator("#done").isHidden()) throw new Error("failed order showed a success slip");
    await click('#cartItems .stepper button[data-d="-1"]'); await click("#cartClose"); await page.waitForTimeout(450);
  });
  await step("08-language", async () => {
    await click("#langBtn"); await page.waitForTimeout(400);
    if (!/cooked to order/i.test(await page.locator("#heroSub").textContent() || "")) throw new Error("English tagline missing");
    if (await visibleDishes() !== 61) throw new Error("dishes lost on language switch");
    if (!/Order/.test(await page.evaluate(() => document.querySelector("#enterBtn").textContent))) throw new Error("cover not translated");
  });
  if (errors.length) { failures += errors.length; console.log("  browser errors:"); errors.forEach(e => console.log("   !", e)); } else console.log("  no browser errors");
  await browser.close();
}

console.log("\n=== shared cart ===");
{
  const browser = await chromium.launch();
  const contextA = await browser.newContext(), contextB = await browser.newContext();
  const pageA = await contextA.newPage(), pageB = await contextB.newPage();
  const table = `T${Date.now().toString(36).slice(-8)}`;
  try {
    for (const page of [pageA, pageB]) { await page.goto(`${BASE.split("?")[0]}?table=${table}&lang=zh`); await page.locator("#enterBtn").click(); }
    await Promise.all([
      pageA.locator('.dish[data-id="beijing-pork-guotie"] [data-add]').click(),
      pageB.locator('.dish[data-id="beijing-pork-guotie"] [data-add]').click(),
    ]);
    for (const page of [pageA, pageB]) await page.waitForFunction(() => document.querySelector("#cartCount")?.textContent === "2", null, { timeout: 6000 });
    await pageA.locator("#rail").click(); await pageA.locator('.cart-line .stepper button[data-d="-1"]').click();
    for (const page of [pageA, pageB]) await page.waitForFunction(() => document.querySelector("#cartCount")?.textContent === "1", null, { timeout: 6000 });
    await pageA.locator("#note").fill("少盐"); await pageB.locator("#rail").click();
    await pageB.waitForFunction(() => document.querySelector("#note")?.value === "少盐", null, { timeout: 6000 });
    await pageA.locator("#placeOrder").click(); await pageA.locator("#done:not([hidden])").waitFor({ timeout: 6000 });
    await pageB.waitForFunction(() => document.querySelector("#cartCount")?.textContent === "0", null, { timeout: 6000 });
    await pageB.locator("#orderHistory article").waitFor({ timeout: 6000 });
    if (!/锅贴|Potstickers/.test(await pageB.locator("#orderHistory").innerText())) throw new Error("placed order was not visible to the other device");
    const contextC = await browser.newContext(), pageC = await contextC.newPage();
    await pageC.goto(`${BASE.split("?")[0]}?table=${table}&group=PTEST&lang=zh`); await pageC.locator("#enterBtn").click();
    await pageC.locator('.dish[data-id="beijing-pork-guotie"] [data-add]').click();
    await pageC.waitForFunction(() => document.querySelector("#cartCount")?.textContent === "1", null, { timeout: 6000 });
    await pageB.waitForTimeout(1500);
    if (await pageB.locator("#cartCount").textContent() !== "0") throw new Error("separate dining group leaked into the main cart");
    if (await pageC.locator("#orderHistory article").count()) throw new Error("separate dining group could see another group's orders");
    await pageC.locator("#rail").click(); await pageC.locator('.cart-line .stepper button[data-d="-1"]').click(); await contextC.close();
    const received = await pageA.evaluate(async table => {
      const feed = await (await fetch("/api/feed", { cache: "no-store" })).json();
      const order = feed.events.find(event => event.type === "order" && event.table === table);
      if (order) await fetch("/api/resolve", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: order.id }) });
      return Boolean(order && order.items[0]?.qty === 1 && order.note === "少盐");
    }, table);
    if (!received) throw new Error("shared checkout snapshot was not received");
    console.log("  ✓ same-group devices share cart/history; table-sharing groups stay isolated");
  } catch (error) {
    failures++; console.log(`  ✗ ${error.message.split("\n")[0]}`);
  } finally { await browser.close(); }
}
console.log(failures ? `\nFAILURES: ${failures}` : "\nALL PASS"); process.exit(failures ? 1 : 0);
