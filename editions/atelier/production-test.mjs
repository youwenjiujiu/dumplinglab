import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createTableStore } from "../../web/server/table-state.js";
import { requireStaff } from "../../web/server/staff-auth.js";
const records = new Map(); let etagSequence = 0, conflicts = 0, loseWriteResponse = false, unavailable = false;
const storage = {
  async read(path) { if (unavailable) throw new Error("Storage offline"); await Promise.resolve(); return structuredClone(records.get(path) || null); },
  async write(path, value, etag) {
    const old = records.get(path);
    if ((old?.etag || null) !== etag) { conflicts++; throw Object.assign(new Error("CAS conflict"), { conflict: true }); }
    records.set(path, { value: structuredClone(value), etag: String(++etagSequence) });
    if (loseWriteResponse) { loseWriteResponse = false; throw new Error("Response lost after commit"); }
  },
  isConflict: error => error.conflict,
  async all(prefix) { return [...records].filter(([key]) => key.startsWith(prefix)).map(([, record]) => structuredClone(record.value)); },
};
let legacyResolved;
const legacyOrder = { id: randomUUID(), table: "LEGACY", group: "A", type: "order", at: new Date().toISOString(), items: [{ id: "beijing-pork-guotie", qty: 1 }], cartOpIds: [randomUUID()] };
const legacyOp = { id: randomUUID(), table: "LEGACY", group: "A", kind: "delta", dishId: "beijing-pork-guotie", delta: 1, at: new Date().toISOString(), storedAt: Date.now(), deviceId: randomUUID() };
const legacy = {
  async read(table) { return table === "LEGACY" ? { operations: [legacyOp], orders: [legacyOrder] } : { operations: [], orders: [] }; },
  async feed() { return { events: legacyResolved ? [] : [legacyOrder], activeIds: legacyResolved ? [] : [legacyOrder.id] }; },
  async resolve(id) { legacyResolved = id; },
};
const store = createTableStore(storage, legacy);
const op = (table = "RELEASE", group = "A", extra = {}) => ({ opId: randomUUID(), deviceId: randomUUID(), table, group, kind: "delta", dishId: "lunch-v2-pork-rice", delta: 1, actorName: "客人", ...extra });
const first = op();
await store.mutate(first);
await store.mutate(first);
assert.equal((await store.cart("RELEASE", "A")).items[0].qty, 1);
await Promise.all(Array.from({ length: 9 }, () => store.mutate(op())));
let cart = await store.cart("RELEASE", "A");
assert.equal(cart.items[0].qty, 10, "10 simultaneous guests cannot overwrite one another");
assert(conflicts > 0, "CAS retries exercised");
assert.equal(cart.contributors["lunch-v2-pork-rice|"].length, 10);
assert.deepEqual(await store.cart("RELEASE", "A", cart.version), { unchanged: true, version: cart.version });
assert.equal((await store.cart("RELEASE", "B")).items.length, 0);
const note = op("RELEASE", "A", { kind: "note", note: "不要香菜", baseNote: "" });
await store.mutate(note);
await assert.rejects(store.mutate(op("RELEASE", "A", { kind: "note", note: "少盐", baseNote: "" })), error => error.code === "NOTE_CONFLICT" && error.cart.note === "不要香菜");
cart = await store.cart("RELEASE", "A");
const request = { requestId: randomUUID(), table: "RELEASE", group: "A", no: "9801", items: cart.items, cartOpIds: cart.opIds, note: cart.note };
await store.mutate(op("RELEASE", "A", { dishId: "lunch-v2-cold-veg-shreds" }));
const submitted = await Promise.allSettled([store.order(request), store.order({ ...request, requestId: randomUUID() })]);
assert.equal(submitted.filter(r => r.status === "fulfilled").length, 1);
assert.equal(submitted.find(r => r.status === "rejected").reason.status, 409);
const success = submitted.find(r => r.status === "fulfilled").value;
assert.equal(success.order.total, 58, "Server catalogue prices are authoritative");
assert.equal(success.cart.items[0].id, "lunch-v2-cold-veg-shreds", "Later addition remains");
assert.equal((await store.order({ ...request, requestId: success.order.id })).order.id, success.order.id);
await store.mutate(first);
assert.equal((await store.cart("RELEASE", "A")).items[0].id, "lunch-v2-cold-veg-shreds", "Consumed op cannot resurrect");
assert((await store.feed()).activeIds.includes(success.order.id), "Accepted order atomically appears in staff queue");
await store.resolve(success.order.id);
assert(!(await store.feed()).activeIds.includes(success.order.id));
assert.equal((await store.cart("RELEASE", "A")).orders.length, 1, "Resolve archives, never deletes receipts");
const call = { requestId: randomUUID(), table: "RELEASE", group: "A", reason: "加水" };
await store.call(call); await store.call(call);
assert.equal((await store.feed()).events.filter(e => e.id === call.requestId).length, 1);
await store.resolve(call.requestId);

await store.mutate(op("STALE"));
cart = await store.cart("STALE", "A");
await store.mutate(op("STALE", "A", { delta: -1 }));
await assert.rejects(store.order({ ...request, requestId: randomUUID(), table: "STALE", items: cart.items, cartOpIds: cart.opIds }), error => error.status === 409);
await store.mutate(op("LOST")); cart = await store.cart("LOST", "A");
const lost = { ...request, requestId: randomUUID(), table: "LOST", items: cart.items, cartOpIds: cart.opIds };
loseWriteResponse = true;
await assert.rejects(store.order(lost), /Response lost/);
assert((await store.feed()).activeIds.includes(lost.requestId));
assert.equal((await store.order(lost)).order.id, lost.requestId);
assert.equal((await store.cart("LOST", "A")).orders.length, 1);
await store.mutate(op("LEGACY"));
const migrated = await store.cart("LEGACY", "A");
assert.equal(migrated.items[0].qty, 1); assert.equal(migrated.orders[0].id, legacyOrder.id); assert.equal(migrated.unavailableItems[0].id, "beijing-pork-guotie");
assert.equal((await store.feed()).events.filter(e => e.id === legacyOrder.id).length, 1);
await store.resolve(legacyOrder.id); assert.equal(legacyResolved, legacyOrder.id);
await assert.rejects(store.mutate(op("VALID", "A", { dishId: "not-a-dish" })), error => error.status === 400);
await assert.rejects(store.cart("../BAD", "A"), error => error.status === 400);
unavailable = true;
await assert.rejects(store.cart("RELEASE", "A"), /Storage offline/);
unavailable = false;
process.env.DL_STAFF_PASSWORD = randomUUID();
assert.throws(() => requireStaff({ headers: {} }), error => error.status === 401);
requireStaff({ headers: { authorization: `Basic ${Buffer.from(`staff:${process.env.DL_STAFF_PASSWORD}`).toString("base64")}` } });
delete process.env.DL_STAFF_PASSWORD;
assert.throws(() => requireStaff({ headers: {} }), error => error.status === 503);
console.log("PASS: production state store — CAS contention, ten guests, note conflicts, checkout races, durable staff queue, idempotency, lost responses, archived receipts, legacy migration, storage failures and staff authentication.");
