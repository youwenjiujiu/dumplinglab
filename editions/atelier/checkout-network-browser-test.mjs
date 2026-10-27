// Isolated local preview only: exercise real fetch deadlines and checkout recovery.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { launchBrowser, browserEngine } from './browser-test-runtime.mjs';

const data = await mkdtemp(`${tmpdir()}/dumpling-network-test-`);
const output = new URL(`test-output/checkout-network-${browserEngine}-${Date.now()}/`, import.meta.url);
await mkdir(output, { recursive: true });
const child = spawn(process.execPath, [fileURLToPath(new URL('preview.mjs', import.meta.url))], {
  env: { ...process.env, PORT: '0', DL_PREVIEW_DATA: data }, stdio: ['ignore', 'pipe', 'pipe'],
});
let browser;
try {
  const base = await new Promise((resolve, reject) => {
    let log = '';
    const timer = setTimeout(() => reject(Error('Preview startup timed out')), 10000);
    child.stdout.on('data', chunk => {
      log += chunk;
      const match = log.match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) { clearTimeout(timer); resolve(match[0]); }
    });
    child.once('exit', code => { clearTimeout(timer); reject(Error(`Preview exited: ${code}`)); });
  });
  assert.equal((await fetch(base + '/api/online').then(r => r.json())).config.preview, true);
  browser = await launchBrowser();
  const scenarios = (process.env.CHECKOUT_NETWORK_SCENARIOS || 'cart-read,cart-write,config,payment-read,lost-checkout,offline,account-outage').split(',');
  for (const [index, scenario] of scenarios.entries()) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const page = await context.newPage(), errors = [], checkoutRequests = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    await page.goto(`${base}/?table=QN${index}&lang=zh`);
    await page.waitForFunction(() => typeof CheckoutUI !== 'undefined' && typeof store !== 'undefined');
    await page.evaluate(async () => {
      clearInterval(store.timer);
      await store.poll();
      store.mutate({ kind: 'delta', dishId: 'lunch-v2-barley', delta: 1 });
      await store.flush();
      // Prevent background payment polling from masking an explicit resume failure.
      store.paymentPolling = true;
    });
    if (scenario === 'payment-read') await page.evaluate(() => CheckoutUI.open({ skipAddons: true }));
    if (scenario === 'account-outage') await page.evaluate(() => {
      window.accountRefreshes = 0;
      RewardsUI.refresh = async () => { window.accountRefreshes++; throw Error('Account service unavailable'); };
    });
    if (scenario === 'cart-write') await page.evaluate(() => {
      store.pending.push({ opId: crypto.randomUUID(), deviceId: store.device, table: store.table,
        group: store.group, kind: 'note', note: 'Keep this note' });
      store.emit();
    });
    let held = false, offline = scenario === 'offline';
    await page.route('**/api/**', async route => {
      const request = route.request(), url = new URL(request.url());
      const body = request.method() === 'POST' ? request.postDataJSON() : null;
      if (body?.action === 'checkout') checkoutRequests.push(body);
      if (offline && url.pathname === '/api/cart') return route.abort('internetdisconnected');
      const match = scenario === 'cart-read' ? url.pathname === '/api/cart' && !body
        : scenario === 'cart-write' ? url.pathname === '/api/cart' && body
        : scenario === 'config' ? url.pathname === '/api/online' && !url.search && !body
        : scenario === 'payment-read' ? url.pathname === '/api/online' && url.searchParams.has('id')
        : scenario === 'lost-checkout' ? body?.action === 'checkout' : false;
      if (!held && match) {
        held = true;
        const response = await route.fetch();
        if (scenario === 'lost-checkout') return route.abort('connectionreset');
        // Real elapsed time beyond the previous nine-second deadline.
        await new Promise(resolve => setTimeout(resolve, 10500));
        await route.fulfill({ response }).catch(() => {});
        return;
      }
      return route.fallback();
    });
    await page.evaluate(() => CheckoutUI.open({ skipAddons: true }));
    if (scenario === 'lost-checkout' || scenario === 'offline') {
      assert.match(await page.locator('.checkout-recovery').innerText(), /网络连接中断/);
      const original = await page.evaluate(() => structuredClone(store.order));
      await page.screenshot({ path: fileURLToPath(new URL(`${scenario}-recovery.png`, output)) });
      assert.equal(Boolean(original), scenario === 'lost-checkout');
      offline = false;
      await page.evaluate(() => CheckoutUI.open({ skipAddons: true }));
      if (original) {
        assert.equal(checkoutRequests.length, 2);
        assert(checkoutRequests.every(r => r.requestId === original.requestId && r.token === original.token));
        assert.equal(await page.evaluate(() => store.order.requestId), original.requestId);
      }
    } else if (scenario === 'account-outage') assert.equal(await page.evaluate(() => window.accountRefreshes), 0, 'Checkout does not wait for account/wallet panels');
    else assert(held, `${scenario}: delayed request was exercised`);
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.querySelectorAll('.checkout-page img')].map(img => img.decode().catch(() => {})));
    });
    await page.screenshot({ path: fileURLToPath(new URL(`${scenario}.png`, output)) });
    assert.equal(await page.locator('.checkout-recovery').count(), 0, `${scenario}: slow valid response must not become a network error`);
    assert.equal(await page.locator('[data-checkout-pay]').isEnabled(), true, `${scenario}: payment ready`);
    assert.equal(await page.evaluate(() => store.items[0].qty), 1, 'No duplicated servings');
    await page.locator('.checkout-scroll').evaluate(node => { node.scrollTop = node.scrollHeight; });
    await page.screenshot({ path: fileURLToPath(new URL(`${scenario}-payment.png`, output)) });
    assert.deepEqual(errors, []);
    console.log(`PASS ${browserEngine} ${scenario}: payment ready, selection retained, no duplicate order identity`);
    await context.close();
  }
  assert.equal((await fetch(base + '/api/feed').then(r => r.json())).events.length, 0, 'No paid orders or staff events');
  console.log(`Screenshots: ${fileURLToPath(output)}`);
} finally {
  await browser?.close();
  child.kill('SIGTERM');
}
