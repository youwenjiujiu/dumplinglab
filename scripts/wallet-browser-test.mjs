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

const staff={authorization:'Basic '+Buffer.from('staff:preview-only').toString('base64'),origin:base};
async function admin(input){const r=await context.request.post(base+'/api/wallet',{headers:staff,data:input}),o=await r.json();assert(r.ok(),JSON.stringify(o));return o;}
await page.goto(base+'/?preview_member=1');await page.waitForLoadState('networkidle');await page.locator('[data-fulfilment="takeaway"]').click();
await page.locator('[data-rewards-account]').click();await page.locator('[data-account-wallet]').click();await page.locator('[data-wallet-topup]').click();await page.locator('.wallet-dialog input[name=amount]').fill('20');await page.locator('.wallet-dialog button[type=submit]').click();await page.locator('[data-wallet-simulate]').click();await page.locator('[data-wallet-done]').waitFor();
assert.equal((await req('/api/wallet')).balanceCents,2000);assert.equal((await req('/api/rewards')).points,0);await page.waitForTimeout(400);await page.screenshot({path:output+'/topup-success.png'});await page.locator('[data-wallet-done]').click();
await page.locator('#categoryScroll [data-category="drinks"]').click();await page.locator('[data-add="lunch-v2-barley"]').click();await page.evaluate(()=>CheckoutUI.open({skipAddons:true}));await page.locator('[data-checkout-pay]:enabled').waitFor();await page.locator('[data-checkout-wallet]').click();await page.getByRole('button',{name:/余额支付并下单/}).waitFor();await page.locator('[data-checkout-pay]:enabled').waitFor();assert.match(await page.locator('[data-checkout-pay]').innerText(),/余额支付/);await page.locator('.checkout-payment').scrollIntoViewIfNeeded();await page.screenshot({path:output+'/wallet-checkout.png'});await page.locator('[data-checkout-pay]').click();await page.locator('.reward-earned').waitFor();assert.equal((await req('/api/wallet')).balanceCents,1650);assert.equal((await req('/api/rewards')).points,3);await page.locator('#closeSheet').click();
// The account entry leads to real, member-owned order history and details.
const history = await req('/api/online?history=1');assert(history.orders.length>=1);assert.equal(history.orders[0].total,3.5);assert.equal(history.orders[0].tokenHash,undefined);
await page.locator('[data-rewards-account]').click();await page.locator('[data-account-orders]').waitFor();assert.equal(await page.locator('.loyalty-savings.is-saving').count(),1);assert.match(await page.locator('.savings-growth').innerText(),/\+3/);await page.locator('[data-account-orders]').click();await page.locator('[data-account-order="0"]').click();assert.match(await page.locator('.rewards-content').innerText(),/薏米水/);assert.match(await page.locator('.rewards-content').innerText(),/3.50/);await page.locator('.account-back').click();await page.locator('[data-account-profile]').click();await page.locator('[data-profile-logout]').waitFor();assert.match(await page.locator('.rewards-content').innerText(),/登录邮箱[\s\S]*已验证/);await page.locator('[data-rewards-close]').click();
// Simulate issuance on the external CanCan source, never through the DL customer API.
const issuer=async input=>{const r=await context.request.fetch(base+'/__preview/cancan-issuer',{method:input?'POST':'GET',headers:staff,...(input?{data:input}:{})});assert(r.ok());return r.json();};
await issuer({offerId:'demo-free-egg',requestId:randomUUID()});assert.equal((await issuer()).points,200);
await issuer({offerId:'demo-barley',requestId:randomUUID()});assert.equal((await issuer()).points,150);
const rejected=await context.request.post(base+'/api/cancan',{data:{offerId:'demo-barley',requestId:randomUUID()}});assert.equal(rejected.status(),405);
await page.locator('[data-rewards-account]').click();
assert.equal(await page.locator('.loyalty-savings.is-saving').count(),0);await page.locator('[data-rewards-close]').click();await page.locator('[data-rewards-account]').click();assert.equal(await page.locator('.loyalty-savings.is-saving').count(),0);

await page.locator('[data-account-coupons]').click();await page.getByText('CanCan 薏米水券',{exact:true}).waitFor();assert.equal(await page.locator('[data-cancan-claim],.cancan-rewards').count(),0);assert.equal((await req('/api/cancan')).points,undefined);
assert.equal((await req('/api/rewards')).points,3);assert.equal((await req('/api/wallet')).balanceCents,1650);await page.waitForTimeout(400);await page.screenshot({path:output+'/account.png'});

const vouchers=(await req('/api/rewards')).vouchers,barley=vouchers.find(v=>v.dishId==='lunch-v2-barley');assert(barley);const choice=page.locator('.loyalty-gallery .reward-item').filter({hasText:'CanCan 薏米水券'}).locator('[data-reward-choice]');await choice.click();await page.locator('.rewards-dialog').waitFor({state:'detached'});await page.evaluate(()=>CheckoutUI.open({skipAddons:true}));await page.locator('[data-checkout-pay]:enabled').waitFor();await page.locator('[data-checkout-pay]').click();await page.locator('.reward-earned').waitFor();assert.equal((await req('/api/wallet')).balanceCents,1650);assert.equal((await issuer()).points,150);assert.equal((await req('/api/rewards')).vouchers.find(v=>v.id===barley.id).status,'used');
const records=await context.request.get(base+'/api/wallet?admin=1',{headers:staff}).then(r=>r.json());const paid=records.orders.find(o=>o.total===3.5),free=records.orders.find(o=>o.total===0);assert(paid&&free);
await admin({action:'refund-order',id:paid.id,refundId:randomUUID(),amountCents:350,reason:'浏览器测试退还餐费'});assert.equal((await req('/api/wallet')).balanceCents,2000);assert.equal((await req('/api/rewards')).points,0);
await admin({action:'refund-order',id:free.id,refundId:randomUUID(),amountCents:0,reason:'浏览器测试退还兑换券'});assert.equal((await req('/api/rewards')).vouchers.find(v=>v.id===barley.id).status,'available');assert.equal((await issuer()).points,150);
await page.goto(base+'/catalog-admin.html#wallet');await page.locator('input[name=password]').fill('preview-only');await page.locator('#loginButton').click();await page.locator('#walletPanel h2').waitFor();await page.locator('[data-wallet-refund="topup"]').evaluate(f=>f.parentElement.open=true);await page.locator('[data-wallet-refund="topup"] input[name=reason]').fill('浏览器测试原路退还充值');await page.locator('[data-wallet-refund="topup"] button').click();await page.waitForFunction(()=>document.querySelector('#walletPanel')?.textContent.includes('余额合计 S$0.00'));assert.equal((await req('/api/wallet')).balanceCents,0);await page.screenshot({path:output+'/admin-refunds.png',fullPage:true});
for(const width of [390,768,1280]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
assert.deepEqual(errors,[]);await browser.close();server.kill();console.log('PASS browser: top-up, wallet payment, independent DL/CanCan points, free claim, CanCan point redemption, food voucher use, order/refund points reversal, voucher return, cash top-up refund, responsive admin. Local simulation only.');
