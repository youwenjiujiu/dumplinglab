import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const scratch = await mkdtemp(resolve(tmpdir(), "dl-rewards-browser-"));
const output = resolve(root, ".local/rewards-qa");
await mkdir(output, { recursive: true });
const server = spawn(process.execPath, ["editions/atelier/preview.mjs"], {
  cwd: root,
  env: {
    ...process.env,
    PORT: "0",
    DL_PREVIEW_TEST_MEMBER: "1",
    DL_PREVIEW_DATA: scratch,
    TELEGRAM_BOT_TOKEN: "",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
const base = await new Promise((resolve, reject) => {
  let out = "";
  const timer = setTimeout(() => reject(new Error("Preview timeout")), 10000);
  server.stdout.on("data", (chunk) => {
    out += chunk;
    const match = out.match(/http:\/\/127\.0\.0\.1:\d+/);
    if (match) {
      clearTimeout(timer);
      resolve(match[0]);
    }
  });
  server.on("exit", () => reject(new Error("Preview stopped")));
});
process.on("exit", () => server.kill());
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const req = async (path, body) => {
  const r = await context.request.fetch(base + path, {
    method: body ? "POST" : "GET",
    headers: { origin: base },
    data: body,
  });
  const o = await r.json();
  assert(r.ok(), JSON.stringify(o));
  return o;
};
await req("/api/member", { action: "preview-login" });
const a = await context.request.get(base + "/api/rewards?admin=1", {
  headers: {
    authorization:
      "Basic " + Buffer.from("staff:preview-only").toString("base64"),
  },
});
const ad = await a.json();
assert(a.ok());
await context.request.post(base + "/api/rewards", {
  headers: {
    authorization:
      "Basic " + Buffer.from("staff:preview-only").toString("base64"),
  },
  data: {
    revision: ad.revision,
    pointsPerDollar: 1,
    rewards: [{ dishId: "lunch-v2-barley", points: 10, active: true }],
  },
});
const credentials = {
  requestId: randomUUID(),
  token: randomBytes(32).toString("hex"),
  mode: "takeaway",
  pickupLocation: "preview-store",
  items: [{ id: "lunch-v2-barley", qty: 10 }],
};
await req("/api/online", { ...credentials, action: "checkout" });
await req("/api/online", { ...credentials, action: "preview-pay" });
await page.goto(base);
await page.waitForLoadState("networkidle");
await page.locator('[data-fulfilment="takeaway"]').click();
await page.locator("[data-rewards-account]").click();
await page.locator("[data-account-rewards]").click();
await page.locator(".rewards-dialog").waitFor();
await page.waitForTimeout(400);
await page.screenshot({ path: output + "/rewards-account.png" });
await page.locator('[data-reward-choice="0"]').click();
await page.locator(".rewards-dialog").waitFor({ state: "detached" });
await page.evaluate(() => CheckoutUI.open({ skipAddons: true }));
await page.locator("[data-checkout-pay]:enabled").waitFor();
assert.match(await page.locator("[data-checkout-pay]").innerText(), /确认兑换/);
await page.screenshot({ path: output + "/rewards-checkout.png" });
assert.match(await page.locator(".checkout-rewards").innerText(), /薏米水/);
await page.locator("[data-checkout-pay]").click();
await page.locator(".reward-earned").waitFor();
await page.screenshot({ path: output + "/rewards-receipt.png" });
assert.match(await page.locator(".reward-earned").innerText(), /使用.*10/);
// Start a regular payment, then change to a reward after its session exists.
await page.goto(base);
await page.waitForLoadState("networkidle");
if (await page.locator("#sheet[open]").count())
  await page.locator("#closeSheet").click();
await page.locator('#categoryScroll [data-category="sides"]').click();
await page.locator('[data-add="lunch-v2-soft-egg"]').click();
await page.evaluate(() => CheckoutUI.open({ skipAddons: true }));
await page.locator("[data-checkout-pay]:enabled").waitFor();
await page.locator("[data-checkout-rewards]").click();
await page.locator('[data-reward-choice="0"]').click();
await page.locator(".rewards-dialog").waitFor({ state: "detached" });
await page.locator("[data-checkout-pay]:enabled").waitFor();
assert.match(await page.locator(".checkout-rewards").innerText(), /薏米水/);
assert.match(await page.locator("[data-stripe-total]").innerText(), /1.90/);
await page.locator(".checkout-rewards").scrollIntoViewIfNeeded();
await page.screenshot({ path: output + "/rewards-discount.png" });
await page.locator("[data-checkout-pay]").click();
await page.locator(".reward-earned").waitFor();
assert.match(await page.locator(".reward-earned").innerText(), /\+1/);
// A guest sees an inline login form and can dismiss it without leaving the menu.
await req("/api/member", { action: "logout" });
await page.goto(base);
await page.waitForLoadState("networkidle");
if (await page.locator("#sheet[open]").count())
  await page.locator("#closeSheet").click();
await page.locator("[data-rewards-account]").click();
await page.locator(".rewards-login").waitFor();
await page
  .locator(".rewards-login input[name=email]")
  .fill("fixture@example.test");
// Transport-only OTP fixture: the real provider contract is covered by member-selftest.
await page.route("**/api/member", async (route) => {
  const input = route.request().postDataJSON();
  if (input.action === "send-code")
    return route.fulfill({ json: { ok: true } });
  if (input.action === "verify") {
    await req("/api/member", { action: "preview-login" });
    return route.fulfill({ json: { ok: true } });
  }
  return route.continue();
});
await page.locator(".rewards-login button[type=submit]").click();
await page.locator("input[name=code]").fill("123456");
await page.locator(".rewards-login button[type=submit]").click();
await page.locator(".rewards-balance").waitFor();
await page.waitForTimeout(400);
await page.screenshot({ path: output + "/rewards-account.png" });
await page.locator("[data-rewards-close]").click();
await page.unroute("**/api/member");
await page.goto(base + "/catalog-admin.html#rewards");
await page.locator("input[name=password]").fill("preview-only");
await page.locator("#loginButton").click();
await page.locator("#rewardSettings").waitFor();
assert(await page.locator("#rewardsPanel").isVisible());
await page.locator("#rewardSettings input[name=pointsPerDollar]").fill("2");
const mainRow=page.locator('[data-reward-dish]').filter({has:page.locator('[data-style]')}).first();
const mainId=await mainRow.getAttribute('data-reward-dish');
await mainRow.locator('[data-cost]').fill('80');await mainRow.locator('[data-active]').check();
const mainStyle=await mainRow.locator('[data-style]').inputValue();
await page.locator("#rewardSettings button[type=submit]").click();
await page
  .getByText("积分设置已保存。顾客下次查看或结账时生效。", { exact: true })
  .waitFor();
const currentRules=await req('/api/rewards');assert.equal(currentRules.pointsPerDollar,2);
assert.equal(currentRules.rewards.find(r=>r.dishId===mainId).points,80);
assert.equal(currentRules.rewards.find(r=>r.dishId===mainId).style,mainStyle);
await page.screenshot({
  path: output + "/rewards-admin-phone.png",
  fullPage: true,
});
for (const width of [390, 768, 1280]) {
  await page.setViewportSize({ width, height: 900 });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
}
await page.screenshot({ path: output + "/rewards-admin.png" });
assert.deepEqual(errors, []);
console.log(
  "PASS real local browser: menu account, add reward to order, explicit free order confirmation, receipt earned/spent points, admin settings, responsive widths.",
);
await browser.close();
server.kill();
