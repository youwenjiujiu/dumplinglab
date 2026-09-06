// Run against the local preview only; all test tables use a dedicated QA prefix.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import "../../web/server/order-core.js";
const origin = process.env.ATELIER_TEST_URL || "http://127.0.0.1:7898";
assert.match(origin, /^http:\/\/(127\.0\.0\.1|localhost):\d+$/);
const table = "QA" + crypto.randomUUID().slice(0, 8),
  dish = "lunch-mini-pork-rice",
  second = "lunch-cold-veg-shreds";
const api = async (path, body) => {
  const r = await fetch(origin + path, {
    method: body ? "POST" : "GET",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, ...(await r.json()) };
};
const operation = (group = "A", id = dish) => ({
  opId: crypto.randomUUID(),
  deviceId: crypto.randomUUID(),
  table,
  group,
  kind: "delta",
  dishId: id,
  style: null,
  delta: 1,
});
const a = operation(),
  b = operation();
assert.equal((await api("/api/cart", a)).status, 200);
assert.equal(
  (await api("/api/cart", a)).cart.items[0].qty,
  1,
  "Operation retry cannot duplicate portions",
);
await api("/api/cart", b);
let cart = (await api(`/api/cart?table=${table}&group=A`)).cart;
assert.equal(cart.items[0].qty, 2, "Two guests add independently");
assert.equal(
  (await api(`/api/cart?table=${table}&group=B`)).cart.items.length,
  0,
  "Separate group cannot see A",
);
await api("/api/cart", operation("B", second));
const payload = {
  requestId: crypto.randomUUID(),
  table,
  group: "A",
  no: "1234",
  items: cart.items,
  cartOpIds: cart.opIds,
  note: "QA only",
};
await api("/api/cart", operation("A", second));
const submissions = await Promise.all([
  api("/api/order", payload),
  api("/api/order", { ...payload, requestId: crypto.randomUUID() }),
]);
assert.deepEqual(
  submissions.map((s) => s.status).sort(),
  [200, 409],
  "Concurrent checkout accepts only one request",
);
const success = submissions.find((s) => s.status === 200);
assert.equal(success.cart.items.length, 1);
assert.equal(
  success.cart.items[0].id,
  second,
  "Later additions survive checkout",
);
assert.equal(success.cart.orders.length, 1);
const retry = await api("/api/order", {
  ...payload,
  requestId: success.order.id,
});
assert.equal(retry.status, 200);
assert.equal(retry.cart.orders.length, 1, "Order retry is idempotent");
await api("/api/cart", a);
cart = (await api(`/api/cart?table=${table}&group=A`)).cart;
assert.equal(
  cart.items.length,
  1,
  "Consumed operation retries cannot resurrect ordered food",
);
const corrupt = {
  requestId: crypto.randomUUID(),
  table,
  group: "A",
  no: "5678",
  items: [{ id: second, qty: 2, style: null }],
  cartOpIds: cart.opIds,
};
assert.equal(
  (await api("/api/order", corrupt)).status,
  409,
  "Server rejects items that do not match claimed cart",
);
assert.equal(
  (await api("/api/cart", { ...operation(), delta: 100 })).status,
  400,
  "Quantity validation",
);
assert.equal(
  (await api("/api/cart", { ...operation(), dishId: "does-not-exist" })).status,
  400,
  "Catalogue validation",
);

const source = await readFile(
  new URL("./cart-store.js", import.meta.url),
  "utf8",
);
function client(t, g = "A", memory = new Map(), blockedStorage = false) {
  const state = { offline: false, dropOrderResponse: false, blockedStorage };
  const ctx = vm.createContext({
    isLunchItem: globalThis.isLunchItem,
    EventTarget,
    Event,
    crypto,
    AbortSignal,
    structuredClone,
    setInterval,
    addEventListener() {},
    document: { hidden: false, addEventListener() {} },
    localStorage: {
      getItem: (k) => {
        if (state.blockedStorage) throw new Error("Storage disabled");
        return memory.get(k) ?? null;
      },
      setItem: (k, v) => {
        if (state.blockedStorage) throw new Error("Storage disabled");
        return memory.set(k, v);
      },
    },
    fetch: async (path, options) => {
      if (state.offline) throw new TypeError("Offline");
      const res = await fetch(origin + path, options);
      if (state.dropOrderResponse && path === "/api/order") {
        state.dropOrderResponse = false;
        throw new TypeError("Response lost");
      }
      return res;
    },
  });
  vm.runInContext(source + "\nglobalThis.TableCart = TableCart;", ctx);
  return { store: new ctx.TableCart(t, g), state, memory };
}
const t2 = "QB" + crypto.randomUUID().slice(0, 8),
  one = client(t2),
  two = client(t2);
await Promise.all([one.store.poll(), two.store.poll()]);
one.store.mutate({ kind: "delta", dishId: dish, style: null, delta: 1 });
await one.store.flush();
await two.store.poll();
assert.equal(
  two.store.items[0].qty,
  1,
  "Second client sees first guest’s pick",
);
two.store.mutate({ kind: "delta", dishId: dish, style: null, delta: 1 });
await two.store.flush();
await one.store.poll();
assert.equal(one.store.items[0].qty, 2);
one.state.offline = true;
one.store.mutate({ kind: "delta", dishId: second, style: null, delta: 1 });
try {
  await one.store.flush();
} catch {}
assert.equal(
  one.store.items.length,
  2,
  "Offline selection retained optimistically",
);
assert.equal(one.store.status, "offline");
const restored = client(t2, "A", one.memory);
await restored.store.poll();
assert.equal(
  restored.store.pending.length,
  0,
  "Offline operation survives reload and retries",
);
await two.store.poll();
assert.equal(two.store.items.length, 2);
restored.state.dropOrderResponse = true;
const snapshot = {
  items: restored.store.items,
  cartOpIds: restored.store.remote.opIds,
  note: "",
};
try {
  await restored.store.checkout(snapshot);
} catch {}
assert.ok(restored.store.order, "Lost response retains same request ID");
const confirmed = await restored.store.checkout(snapshot);
assert.ok(confirmed.id);
assert.equal(restored.store.orders.length, 1);
assert.equal(restored.store.order, null);
assert.equal(restored.store.items.length, 0);
await two.store.poll();
assert.equal(
  two.store.orders.length,
  1,
  "Placed order visible on companion phone",
);
assert.equal(two.store.items.length, 0);
const privateClient = client("QB" + crypto.randomUUID().slice(0, 8), "A", new Map(), true);
assert.equal(privateClient.store.storageAvailable, false);
privateClient.store.setNickname("Test");
privateClient.state.offline = true;
privateClient.store.mutate({ kind: "delta", dishId: dish, style: null, delta: 1 });
await privateClient.store.flush().catch(() => {});
assert.equal(privateClient.store.items[0].qty, 1, "Unavailable storage does not crash the cart");
assert.equal(privateClient.store.status, "offline");
privateClient.state.offline = false;
await privateClient.store.poll();
assert.equal(privateClient.store.pending.length, 0, "In-memory edits can still sync when the network returns");
const privatePeer = client(privateClient.store.table);
await privatePeer.store.poll();
assert.equal(privatePeer.store.items[0].qty, 1, "Synced cart remains on server even without local storage");
const noteTable = "QB" + crypto.randomUUID().slice(0, 8);
const noteA = client(noteTable), noteB = client(noteTable);
await Promise.all([noteA.store.poll(), noteB.store.poll()]);
noteA.store.mutate({ kind: "note", note: "不要香菜" });
await noteA.store.flush();
noteB.store.mutate({ kind: "note", note: "少盐" });
noteB.store.mutate({ kind: "delta", dishId: dish, delta: 1 });
await noteB.store.flush();
assert.equal(noteB.store.noteConflict.local, "少盐");
assert.equal(noteB.store.noteConflict.remote, "不要香菜");
assert.equal(noteB.store.items[0].qty, 1, "A note conflict does not block independent dish additions");
const noteReloaded = client(noteTable, "A", noteB.memory);
assert.equal(noteReloaded.store.noteConflict.local, "少盐", "Conflicting draft survives reload");
await assert.rejects(() => noteReloaded.store.checkout({ items: noteReloaded.store.items, cartOpIds: noteReloaded.store.remote.opIds, note: "少盐" }), /备注冲突/);
noteReloaded.store.resolveNote("local", "少盐，不要香菜");
await noteReloaded.store.flush();
await noteA.store.poll();
assert.equal(noteA.store.note, "少盐，不要香菜", "Explicit note resolution reaches other diners");
const beforeRemoval = { items: structuredClone(noteA.store.items), cartOpIds: [...noteA.store.remote.opIds], note: noteA.store.note };
noteReloaded.store.mutate({ kind: "delta", dishId: dish, delta: -1 });
await noteReloaded.store.flush();
await assert.rejects(() => noteA.store.checkout(beforeRemoval), (e) => e.status === 409, "A removal after review invalidates stale checkout");
assert.equal(noteA.store.order, null);
assert.equal(noteA.store.orders.length, 0);
console.log(
  "PASS: concurrent guests, isolated groups, checkout conflicts, later additions, retries, validation, offline reload, lost-response recovery, shared order history.",
);
