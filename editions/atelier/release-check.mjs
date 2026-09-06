// Explicit opt-in: checks a staged PRODUCTION deployment using isolated QA tables.
// Run BEFORE promotion: its v2 test events are not visible to the previous v1 staff API.
// All created orders/calls are resolved before exit; no customer table is changed.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { randomUUID } from "node:crypto";
import vm from "node:vm";
const [deployment, envFile] = process.argv.slice(2);
assert.match(deployment || "", /^https:\/\/dumplinglab-menu-[a-z0-9]+-youwenjiujius-projects\.vercel\.app$/);
assert(envFile, "Provide a protected, temporary production env file");
const secret = parseEnv(await readFile(envFile, "utf8")).DL_STAFF_PASSWORD;
const cartOnly = process.argv.includes("--cart-only");
assert(secret || cartOnly, "Production staff password required");
const table = `QA${randomUUID().replaceAll("-", "").slice(0, 8)}`.toUpperCase();
const created = new Set();
async function request(path, body, staff = false) {
  const config = ["silent", "show-error", "max-time = 45", 'write-out = "\\n%{http_code}"'];
  if (body) config.push('request = "POST"', 'header = "Content-Type: application/json"', `data = ${JSON.stringify(JSON.stringify(body))}`);
  if (staff) config.push(`header = ${JSON.stringify(`Authorization: Basic ${Buffer.from(`staff:${secret}`).toString("base64")}`)}`);
  const result = await new Promise((resolve, reject) => {
    const cli = process.env.VERCEL_CLI_PATH;
    const child = spawn(cli ? process.execPath : "npx", [...(cli ? [cli] : ["--yes", "vercel@59.11.7"]), "curl", path, "--deployment", deployment, "--", "--config", "-"], { cwd: new URL("../../web/", import.meta.url), stdio: ["pipe", "pipe", "pipe"] });
    let out = "", err = "";
    child.stdout.on("data", d => out += d); child.stderr.on("data", d => err += d);
    child.on("error", reject);
    child.on("close", code => code ? reject(new Error(`Release request failed (${code}) for ${path}: ${err.slice(-300)}`)) : resolve(out));
    child.stdin.end(config.join("\n") + "\n");
  });
  const index = result.lastIndexOf("\n"), status = Number(result.slice(index + 1)), text = result.slice(0, index);
  let json; try { json = JSON.parse(text); } catch { /* HTML/assets */ }
  return { status, text, ...json };
}
const op = (extra = {}) => ({ opId: randomUUID(), deviceId: randomUUID(), table, group: "A", kind: "delta", dishId: "lunch-pork-chive", style: "干拌 · 10颗 · 辣 · 加芝麻酱 · 加面", delta: 1, actorName: "发布验收", ...extra });
if (cartOnly) {
  assert.equal((await request("/")).status, 200);
  assert.equal((await request("/api/feed")).status, 401);
  if (process.argv.includes("--reject-test-password")) assert.equal((await request("/api/feed", null, true)).status, 401, "Acceptance-only password must not work on the real release");
  const first = op();
  assert.equal((await request("/api/cart", first)).status, 200);
  const responses = await Promise.all([request("/api/cart", first), request("/api/cart", op()), request("/api/cart", op())]);
  assert(responses.every(r => r.status === 200), JSON.stringify(responses.map(r => ({ status: r.status, error: r.error }))));
  let cart = (await request(`/api/cart?table=${table}&group=A`)).cart;
  assert.equal(cart.items[0].qty, 3);
  assert.equal(cart.contributors["lunch-pork-chive|干拌 · 10颗 · 辣 · 加芝麻酱 · 加面"].length, 3);
  assert.equal((await request(`/api/cart?table=${table}&group=B`)).cart.items.length, 0);
  assert.equal((await request(`/api/cart?table=${table}&group=A&version=${cart.version}`)).cart.unchanged, true);
  const notes = await Promise.all([request("/api/cart", op({ kind: "note", note: "发布验收甲", baseNote: "" })), request("/api/cart", op({ kind: "note", note: "发布验收乙", baseNote: "" }))]);
  assert.deepEqual(notes.map(r => r.status).sort(), [200, 409]);
  assert.equal(notes.find(r => r.status === 409).code, "NOTE_CONFLICT");
  cart = (await request(`/api/cart?table=${table}&group=A`)).cart;
  await request("/api/cart", op({ delta: -3 }));
  await request("/api/cart", op({ kind: "note", note: "", baseNote: cart.note }));
  assert.equal((await request(`/api/cart?table=${table}&group=A`)).cart.items.length, 0);
  console.log(`PASS: deployed Blob CAS races, retry deduplication, contributor attribution, group isolation, version polling, simultaneous note conflict and staff authentication gate. ${table} cart emptied; no orders/calls created.`);
  process.exit(0);
}
try {
  const page = await request("/"); assert.equal(page.status, 200); assert.match(page.text, /data-environment="production"/);
  assert.doesNotMatch(page.text, /id="previewNotice"/);
  assert.equal((await request("/staff")).status, 200);
  assert.equal((await request("/api/feed")).status, 401);
  assert.equal((await request("/api/resolve", { id: randomUUID() })).status, 401);
  assert.equal((await request("/api/feed", null, true)).status, 200);
  const catalogue = vm.createContext({}); vm.runInContext((await request("/menu-data.js")).text, catalogue); vm.runInContext((await request("/lunch-menu.js")).text, catalogue);
  assert.equal(catalogue.MENU.length, 32);
  const first = op();
  assert.equal((await request("/api/cart", first)).status, 200);
  assert.equal((await request("/api/cart", first)).cart.items[0].qty, 1);
  await request("/api/cart", op());
  let cart = (await request(`/api/cart?table=${table}&group=A`)).cart;
  assert.equal(cart.items[0].qty, 2); assert.equal(cart.contributors["lunch-pork-chive|干拌 · 10颗 · 辣 · 加芝麻酱 · 加面"].length, 2);
  assert.equal((await request(`/api/cart?table=${table}&group=B`)).cart.items.length, 0);
  await request("/api/cart", op({ kind: "note", note: "发布验收，不制作", baseNote: "" }));
  const conflict = await request("/api/cart", op({ kind: "note", note: "不同备注", baseNote: "" }));
  assert.equal(conflict.status, 409); assert.equal(conflict.code, "NOTE_CONFLICT");
  cart = (await request(`/api/cart?table=${table}&group=A`)).cart;
  const order = { requestId: randomUUID(), table, group: "A", no: "9806", items: cart.items, note: cart.note, cartOpIds: cart.opIds };
  const rival = { ...order, requestId: randomUUID() }; created.add(order.requestId); created.add(rival.requestId);
  await request("/api/cart", op({ dishId: "lunch-cold-veg-shreds", style: null }));
  const submissions = await Promise.all([request("/api/order", order), request("/api/order", rival)]);
  assert.deepEqual(submissions.map(s => s.status).sort(), [200, 409]);
  const accepted = submissions.find(s => s.status === 200);
  assert.equal(accepted.order.total, 24.6); assert.equal(accepted.cart.items[0].id, "lunch-cold-veg-shreds");
  assert.equal((await request("/api/order", { ...order, requestId: accepted.order.id })).order.id, accepted.order.id);
  assert.equal((await request("/api/cart", first)).cart.items[0].id, "lunch-cold-veg-shreds");
  const feed = await request("/api/feed", null, true);
  assert(feed.events.some(e => e.id === accepted.order.id && e.table === table && e.total === 24.6));
  assert.equal((await request("/api/resolve", { id: accepted.order.id }, true)).status, 200);
  const call = { requestId: randomUUID(), table, group: "A", reason: "发布验收，不需服务" }; created.add(call.requestId);
  assert.equal((await request("/api/call", call)).status, 200);
  assert((await request("/api/feed", null, true)).activeIds.includes(call.requestId));
  assert.equal((await request("/api/resolve", { id: call.requestId }, true)).status, 200);
  cart = (await request(`/api/cart?table=${table}&group=A`)).cart;
  assert.equal(cart.orders.length, 1); assert(cart.orders[0].resolvedAt);
  await request("/api/cart", op({ dishId: "lunch-cold-veg-shreds", style: null, delta: -1 }));
  console.log(`PASS: real production storage, staff authentication, shared cart, note conflicts, concurrent checkout, server prices, staff receipt/resolve, calls and retained order history. Isolated ${table}; test orders archived.`);
} finally {
  for (const id of created) {
    const response = await request("/api/resolve", { id }, true);
    assert.equal(response.status, 200, `Archive own release event ${id}`);
  }
}
