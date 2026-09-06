// Ten independently identified diners, one local table, separate group, late arrivals.
// This is an HTTP walkthrough, not a real multi-phone usability test.
import assert from "node:assert/strict";
import vm from "node:vm";
const origin = process.env.ATELIER_TEST_URL || "http://127.0.0.1:7898";
assert.match(origin, /^http:\/\/(127\.0\.0\.1|localhost):\d+$/);
const ctx = vm.createContext({});
vm.runInContext(await (await fetch(origin + "/menu-data.js")).text(), ctx);
vm.runInContext(await (await fetch(origin + "/lunch-menu.js")).text(), ctx);
const table = "QW" + crypto.randomUUID().slice(0, 8).toUpperCase();
const api = async (path, body) => {
  const response = await fetch(origin + path, { method: body ? "POST" : "GET", headers: body ? { "content-type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined });
  return { status: response.status, ...await response.json() };
};
const menu = ctx.MENU.filter((d) => !d.soldOut).slice(0, 10);
const diners = menu.map((d, i) => ({ table, group: "A", deviceId: crypto.randomUUID(), actorName: `Guest ${i + 1}`, opId: crypto.randomUUID(), kind: "delta", dishId: d.id, style: d.styles?.[i % d.styles.length] || null, delta: 1 }));
const otherGroup = { ...diners[0], group: "B", deviceId: crypto.randomUUID(), opId: crypto.randomUUID(), actorName: "Separate guest", delta: 2 };
const replies = await Promise.all([...diners.slice(0, 9), otherGroup].map((op) => api("/api/cart", op)));
assert(replies.every((reply) => reply.status === 200));
// Retry the exact requests, as a device with a lost response would.
await Promise.all(diners.slice(0, 9).map((op) => api("/api/cart", op)));
const snapshot = (await api(`/api/cart?table=${table}&group=A`)).cart;
assert.equal(snapshot.items.reduce((n, i) => n + i.qty, 0), 9);
assert.equal(snapshot.activity.length, 9, "Duplicate requests do not announce duplicate additions");
assert.equal(new Set(Object.values(snapshot.contributors).flat().map((p) => p.deviceId)).size, 9);
const isolated = (await api(`/api/cart?table=${table}&group=B`)).cart;
assert.equal(isolated.items.reduce((n, i) => n + i.qty, 0), 2);
assert.equal(isolated.activity.length, 1);
// The tenth device reconnects after the nine-item confirmation was prepared.
await api("/api/cart", diners[9]);
const order = { table, group: "A", requestId: crypto.randomUUID(), no: "9010", items: snapshot.items, cartOpIds: snapshot.opIds, note: snapshot.note || "" };
const submissions = await Promise.all([api("/api/order", order), api("/api/order", { ...order, requestId: crypto.randomUUID() })]);
assert.deepEqual(submissions.map((r) => r.status).sort(), [200, 409]);
const accepted = submissions.find((r) => r.status === 200);
assert.equal(accepted.order.items.reduce((n, i) => n + i.qty, 0), 9);
assert.equal(accepted.cart.items.reduce((n, i) => n + i.qty, 0), 1, "Tenth diner's later selection remains for the next order");
assert.equal(accepted.cart.items[0].id, diners[9].dishId);
assert.equal(accepted.cart.items[0].style, diners[9].style);
assert.equal(accepted.cart.orders.length, 1);
const expected = snapshot.items.reduce((n, i) => n + ctx.lunchPrice(ctx.MENU.find((d) => d.id === i.id), i.style) * i.qty, 0);
assert(Math.abs(accepted.order.total - expected) < 0.001);
await api("/api/order", { ...order, requestId: accepted.order.id });
const finalA = (await api(`/api/cart?table=${table}&group=A`)).cart;
const finalB = (await api(`/api/cart?table=${table}&group=B`)).cart;
assert.equal(finalA.orders.length, 1);
assert.equal(finalB.orders.length, 0);
assert.equal(finalB.items.reduce((n, i) => n + i.qty, 0), 2);
console.log("PASS: ten diner identities, mixed preparations, retry-safe contributions, isolated group, simultaneous checkout, authoritative prices and late selection retained. HTTP-only; real phones not verified.");
