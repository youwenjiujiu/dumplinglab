/* Dumpling Lab regression test for the current ordering flow.
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

for (const [name, options] of PROFILES) {
  const browser = await chromium.launch();
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(`pageerror: ${error.message}`));
  page.on("console", message => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("requestfailed", request => errors.push(`request: ${request.url()} ${request.failure()?.errorText || "failed"}`));

  const shot = label => page.screenshot({ path: `${OUT}/${name}-${label}.png`, fullPage: false });
  const step = async (label, task) => {
    try {
      await task();
      await shot(label);
      console.log(`  ✓ ${label}`);
    } catch (error) {
      failures += 1;
      console.log(`  ✗ ${label}: ${error.message.split("\n")[0]}`);
      await shot(`${label}-FAIL`);
    }
  };

  console.log(`\n=== ${name} ===`);
  await page.goto(`${BASE}&r=${Date.now()}`);
  await page.waitForTimeout(700);

  await step("01-menu-layout", async () => {
    const layout = await page.evaluate(() => {
      const menu = document.querySelector("#menu").getBoundingClientRect();
      return {
        cards: document.querySelectorAll(".card").length,
        overflow: document.documentElement.scrollWidth - innerWidth,
        left: menu.left,
        right: innerWidth - menu.right,
      };
    });
    if (layout.cards !== 61) throw new Error(`expected 61 cards, got ${layout.cards}`);
    if (layout.overflow > 1) throw new Error(`horizontal overflow ${layout.overflow}px`);
    if (name === "desktop" && Math.abs(layout.left - layout.right) > 2) {
      throw new Error(`asymmetric desktop gutter ${layout.left}/${layout.right}`);
    }
    const brand=page.locator('#brandLogo[src="brand/dumpling-lab-primary.png"]');
    if (!await brand.isVisible()) throw new Error("official Dumpling Lab logo is not visible");
    if (/Dumplings Lab/.test(await page.locator("body").innerText())) throw new Error("obsolete plural brand name is visible");
  });

  await step("02-search", async () => {
    await page.locator("#search").fill("云吞");
    await page.waitForTimeout(220);
    const visible = await page.locator(".card:visible").count();
    if (visible < 1 || visible > 5) throw new Error(`unexpected search result count ${visible}`);
    await page.locator("#search").fill("");
    await page.waitForTimeout(220);
  });

  await step("03-vegetarian-filter", async () => {
    await page.locator("#filters .fchip").nth(1).click();
    const invalid = await page.evaluate(() => [...document.querySelectorAll(".card")].filter(card => {
      if (card.style.display === "none") return false;
      return !MENU.find(dish => dish.id === card.dataset.id)?.veg;
    }).length);
    if (invalid) throw new Error(`${invalid} non-vegetarian cards visible`);
    await page.locator("#filters .fchip").nth(1).click();
  });

  await step("04-source-photo-fidelity", async () => {
    await page.locator('.card[data-id="hk-crab-roe-wonton"] .cap').click();
    await page.locator("#threeStage[data-source='original-photo'] canvas").waitFor({state:"visible"});
    if (!/wonton-soup\.png$/.test(await page.locator("#threeStage").getAttribute("data-image") || "")) {
      throw new Error("3D stage is not textured with the restaurant source photo");
    }
    if (!/原图/.test(await page.locator(".three-badge").textContent() || "")) {
      throw new Error("source-photo spatial preview is not labelled clearly");
    }
    if (/千卡|kcal/i.test(await page.locator("#sheetBody").innerText())) {
      throw new Error("calorie information is still visible in the dish detail");
    }
  });

  await step("05-add-to-cart", async () => {
    await page.locator("#dAdd").click();
    await page.waitForTimeout(500);
    if (await page.locator("#cartCount").textContent() !== "1") throw new Error("cart count is not 1");
    if (!await page.locator("#cartBar").isVisible()) throw new Error("cart bar is hidden");
    await page.locator("#cartBar").click();
    if (/千卡|kcal|预估热量|Est\. calories/i.test(await page.locator("#cart").innerText())) {
      throw new Error("calorie information is still visible in the cart");
    }
    await page.locator("#cartClose").click();
    await page.waitForTimeout(500);
  });

  await step("06-all-real-photos-use-source-texture", async () => {
    for (const id of ["xian-hot-oil-noodles", "yunnan-lava-tofu"]) {
      await page.locator(`.card[data-id="${id}"] .cap`).click();
      await page.locator("#threeStage[data-source='original-photo'] canvas").waitFor({state:"visible"});
      if (!await page.locator("#threeStage").getAttribute("data-image")) throw new Error(`${id} has no source image attached`);
      await page.locator("#sheetClose").click();
      await page.waitForTimeout(500);
    }
  });

  await step("07-generated-models-are-real-3d", async () => {
    for (const id of ["red-oil-wontons", "minced-pork-egg-noodles", "wonton-soup-noodles", "dry-wonton-noodles"]) {
      const coverSrc = await page.locator(`.card[data-id="${id}"] .art-object img`).getAttribute("src");
      if (coverSrc !== `img/3d-covers/${id}.webp`) {
        throw new Error(`${id} card is not rendered from its production GLB cover: ${coverSrc}`);
      }
      await page.locator(`.card[data-id="${id}"] .cap`).click();
      const stage = page.locator("#threeStage[data-source='generated-glb']");
      await stage.locator("canvas").waitFor({state:"visible"});
      const box = await stage.boundingBox();
      if (!box) throw new Error(`${id} model stage has no bounds`);
      await page.mouse.move(box.x + box.width * .65, box.y + box.height * .5);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * .35, box.y + box.height * .5, {steps:5});
      await page.mouse.up();
      await page.waitForTimeout(120);
      const rotation = Number(await stage.getAttribute("data-rotation-y"));
      if (!Number.isFinite(rotation) || Math.abs(rotation) < .1) throw new Error(`${id} did not rotate`);
      if (!/真实 3D/.test(await page.locator(".three-badge").textContent() || "")) {
        throw new Error(`${id} is not labelled as a true 3D asset`);
      }
      await page.locator("#sheetClose").click();
      await page.waitForTimeout(450);
    }
  });

  await step("08-language", async () => {
    await page.evaluate(() => scrollTo(0, 0));
    await page.locator("#langBtn").click();
    const subtitle = await page.locator("#heroSub").textContent();
    if (!/cooked to order/i.test(subtitle || "")) throw new Error(`unexpected English subtitle: ${subtitle}`);
  });

  if (errors.length) {
    failures += errors.length;
    console.log("  browser errors:");
    errors.forEach(error => console.log("   !", error));
  } else {
    console.log("  no browser errors");
  }
  await browser.close();
}

console.log(failures ? `\nFAILURES: ${failures}` : "\nALL PASS");
process.exit(failures ? 1 : 0);
