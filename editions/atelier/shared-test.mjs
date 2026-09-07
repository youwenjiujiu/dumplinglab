import assert from "node:assert/strict";
import { cleanNickname, contributorsFor } from "./cart-meta.mjs";
const origin = "http://127.0.0.1:7898",
  table = "QC" + crypto.randomUUID().slice(0, 8);
const a = crypto.randomUUID(),
  b = crypto.randomUUID(),
  id = "lunch-v2-pork-rice";
const api = async (path, body) => {
  const r = await fetch(origin + path, {
    method: body ? "POST" : "GET",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, ...(await r.json()) };
};
const op = (deviceId, actorName, delta = 1, group = "A") => ({
  opId: crypto.randomUUID(),
  deviceId,
  actorName,
  delta,
  group,
  table,
  kind: "delta",
  dishId: id,
});
assert.equal(cleanNickname(null), "");
assert.equal(cleanNickname(" <小陈>\n "), "小陈");
assert.equal(cleanNickname("A".repeat(30)).length, 16);
const first = op(a, "小陈"),
  second = op(b, "Bea");
let out = await api("/api/cart", first);
assert.equal(out.status, 200);
out = await api("/api/cart", second);
assert.equal(out.cart.contributors[id + "|"][0].name, "小陈");
assert.deepEqual(
  out.cart.contributors[id + "|"].map((p) => p.qty),
  [1, 1],
);
assert.equal(out.cart.activity.length, 2);
out = await api("/api/cart", second);
assert.equal(out.cart.activity.length, 2, "Retries must not announce twice");
out = await api("/api/cart", op(b, "Bea", -1));
assert.equal(
  out.cart.contributors[id + "|"].length,
  1,
  "Removed contribution loses attribution",
);
const separate = await api(`/api/cart?table=${table}&group=B`);
assert.equal(separate.cart.activity.length, 0);
assert.deepEqual(separate.cart.contributors, {});
const cart = out.cart;
out = await api("/api/order", {
  table,
  group: "A",
  requestId: crypto.randomUUID(),
  actorName: "小陈",
  no: "2345",
  items: cart.items,
  cartOpIds: cart.opIds,
  note: "QC only",
});
assert.equal(out.status, 200);
assert.deepEqual(out.cart.contributors, {});
assert.equal(out.order.contributors[id + "|"][0].name, "小陈");
assert.equal(out.order.actorName, "小陈");
assert.equal(out.cart.orders[0].items[0].price, 5.8);
assert.equal(out.cart.orders[0].subtotal, 5.8, "Receipt reflects server price");
assert.equal(out.cart.orders[0].total, 6.32, "Receipt includes server-computed GST");
assert.deepEqual(contributorsFor([]), {});
console.log(
  "PASS: optional nicknames, server sanitization, truthful contribution counts, no retry duplicates, group-isolated activity, persistent receipt attribution and prices.",
);
