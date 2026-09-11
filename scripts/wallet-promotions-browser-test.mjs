import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const scratch = await mkdtemp(resolve(tmpdir(), "dl-wallet-browser-"));
const output = resolve(root, ".local/wallet-qa");
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

const staff = {
  authorization:
    "Basic " + Buffer.from("staff:preview-only").toString("base64"),
  origin: base,
};
async function admin(input) {
  const r = await context.request.post(base + "/api/wallet", {
      headers: staff,
      data: input,
    }),
    o = await r.json();
  assert(r.ok(), JSON.stringify(o));
  return o;
}
// Configure the live preview APIs via the real administrator form.
await page.goto(base + "/catalog-admin.html#wallet");
await page.locator("input[name=password]").fill("preview-only");
await page.locator("#loginButton").click();
await page.getByRole("button", { name: "新增充值档位" }).click();
await page.locator("[data-tier] [data-points]").fill("100");
await page.locator("[data-tier] [data-enabled]").check();
await page.getByRole("button", { name: "保存充值规则", exact: true }).click();
await page
  .getByText("充值规则已保存，新充值立即生效。", { exact: true })
  .waitFor();
await page.screenshot({
  path: output + "/promotion-admin.png",
  fullPage: true,
});
const noStaff = await context.request.post(base + "/api/wallet", {
  headers: { origin: base },
  data: { action: "settings", revision: 1, tiers: [], bonusEarnsPoints: false },
});
assert.equal(noStaff.status(), 401);
await page.goto(base + "/?preview_member=1");
await page.waitForLoadState("networkidle");
await page.locator('[data-fulfilment="takeaway"]').click();
await page.locator("[data-rewards-account]").click();
await page.locator("[data-account-wallet]").click();
await page.locator("[data-wallet-topup]").click();
await page.locator('[data-topup-tier="20000"]').click();
assert.match(await page.locator("[data-topup-summary]").innerText(), /220.00/);
await page.screenshot({ path: output + "/promotion-topup.png" });
await page.locator(".wallet-dialog button[type=submit]").click();
await page.locator("[data-wallet-simulate]").click();
await page.locator("[data-wallet-done]").waitFor();
assert.equal((await req("/api/wallet")).principalCents, 20000);
assert.equal((await req("/api/wallet")).bonusCents, 2000);
assert.equal((await req("/api/rewards")).points, 100);
await page.locator("[data-wallet-done]").click();
await page.evaluate(async () => {
  store.mutate({ kind: "delta", dishId: "lunch-v2-barley", delta: 10 });
  await store.flush();
  await CheckoutUI.open({ skipAddons: true });
});
await page.locator("[data-checkout-pay]:enabled").waitFor();
await page.locator("[data-checkout-wallet]").click();
await page.getByRole("button", { name: /余额支付并下单/ }).waitFor();
await page.locator("[data-checkout-pay]:enabled").click();
await page.locator(".reward-earned").waitFor();
assert.equal((await req("/api/rewards")).points, 131);
const balance = await req("/api/wallet");
assert.equal(balance.principalCents, 16818);
assert.equal(balance.bonusCents, 1682);
const records = await context.request
    .get(base + "/api/wallet?admin=1", { headers: staff })
    .then((r) => r.json()),
  paid = records.orders[0],
  topup = records.topups[0];
await admin({
  action: "refund-order",
  id: paid.id,
  refundId: randomUUID(),
  amountCents: 3500,
  reason: "Promotion browser refund",
});
assert.equal((await req("/api/wallet")).balanceCents, 22000);
assert.equal((await req("/api/rewards")).points, 100);
await admin({
  action: "refund-topup",
  topupId: topup.id,
  requestId: randomUUID(),
  amountCents: 10000,
  reason: "Promotion browser topup refund",
});
assert.equal((await req("/api/wallet")).balanceCents, 11000);
assert.equal((await req("/api/rewards")).points, 50);
await page.goto(base + "/");
await page.waitForLoadState("networkidle");
for (const width of [320, 390, 768, 1280]) {
  await page.setViewportSize({ width, height: 900 });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "page width " + width,
  );
  assert(
    await page.evaluate(() => {
      const h = document.querySelector(".masthead");
      return h.scrollWidth <= h.clientWidth;
    }),
    "header width " + width,
  );
}
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: output + "/member-header.png" });
assert.equal(await page.locator(".masthead [data-rewards-account]").count(), 1);
assert.equal(await page.locator(".masthead").getByText(/余额/).count(), 0);
assert.deepEqual(errors, []);
await browser.close();
server.kill();
console.log(
  "PASS promotion browser: admin configuration, member offer confirmation, 200+20+100, proportional wallet payment and earnings, order/topup refunds, staff-only writes, compact responsive header. Local simulation.",
);
