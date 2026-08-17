/* Render menu-card covers from the exact production GLB and initial camera.
   The card therefore matches the first frame of the detail viewer.

   Usage: node scripts/render-model-covers.mjs
*/

import { mkdirSync, unlinkSync } from "node:fs";
import { execFileSync, spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "web/img/3d-covers");
const PORT = 8489;
const DISHES = [
  "red-oil-wontons",
  "minced-pork-egg-noodles",
  "wonton-soup-noodles",
  "dry-wonton-noodles",
];

mkdirSync(OUT, { recursive: true });
const server = spawn("python3", ["-m", "http.server", String(PORT), "-d", "web"], {
  cwd: ROOT,
  stdio: "ignore",
});

const waitForServer = async () => {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/model-qa.html`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error("Thumbnail render server did not start");
};

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 640, height: 620 },
    deviceScaleFactor: 2,
  });
  for (const id of DISHES) {
    await page.goto(`http://127.0.0.1:${PORT}/model-qa.html?dish=${id}&model=production`, {
      waitUntil: "networkidle",
    });
    const stage = page.locator(".stage[data-source='generated-glb']");
    await stage.locator("canvas").waitFor({ state: "visible" });
    await page.evaluate(() => {
      document.documentElement.style.background = "transparent";
      document.body.style.background = "transparent";
      const activeStage = document.querySelector(".stage");
      if (activeStage) {
        activeStage.style.background = "transparent";
        activeStage.style.border = "0";
      }
    });
    const png = join(OUT, `${id}.png`);
    const webp = join(OUT, `${id}.webp`);
    await stage.locator("canvas").screenshot({
      path: png,
      omitBackground: true,
    });
    execFileSync("cwebp", ["-quiet", "-q", "88", "-alpha_q", "95", "-m", "6", png, "-o", webp]);
    unlinkSync(png);
    console.log(`✓ web/img/3d-covers/${id}.webp`);
  }
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
