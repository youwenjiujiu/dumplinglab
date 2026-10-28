import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { createWalletService } from "../web/server/wallet-core.js";
import { createRewardsService } from "../web/server/rewards-core.js";
import { createCatalogService } from "../web/server/catalog-core.js";
import { createTableStore } from "../web/server/table-state.js";
import { createOnlineService } from "../web/server/online-core.js";
function doc() {
  let row;
  return {
    read: async () => structuredClone(row || null),
    write: async (value, etag) => {
      if (row?.etag !== etag)
        throw Object.assign(new Error("Conflict"), { conflict: true });
      row = {
        value: structuredClone(value),
        etag: String(Number(row?.etag || 0) + 1),
      };
    },
    isConflict: (e) => e.conflict,
  };
}
let now = new Date(),
  refundState = "succeeded",
  stripeCalls = 0;
const wallet = createWalletService(
  doc(),
  {
    ensureReady() {},
    createTopup: async (t) => ({
      id: "cs_" + t.id,
      url: "https://checkout.stripe.com/test",
    }),
    expire: async () => ({ status: "expired" }),
    refund: async (r) => ({
      id: "re_" + r.id.replaceAll("-", ""),
      amount: r.amountCents,
      currency: "sgd",
      payment_intent: r.paymentIntentId,
      status: refundState,
      metadata: { wallet_refund_id: r.id },
    }),
  },
  { now: () => now },
);
const rewards = createRewardsService(doc(), { now: () => now }),
  catalog = createCatalogService(doc()),
  rows = new Map();
const tableRows = new Map();
const dining = createTableStore(
  {
    read: async (id) => structuredClone(tableRows.get(id) || null),
    write: async (id, value, etag) => {
      const old = tableRows.get(id);
      if ((old?.etag || null) !== etag)
        throw Object.assign(new Error("Conflict"), { conflict: true });
      tableRows.set(id, {
        value: structuredClone(value),
        etag: String(Number(old?.etag || 0) + 1),
      });
    },
    isConflict: (e) => e.conflict,
    all: async () => [...tableRows.values()].map((r) => r.value),
  },
  {
    read: async () => ({ operations: [], orders: [] }),
    feed: async () => ({ events: [], activeIds: [] }),
    resolve: async () => {},
  },
);
const online = createOnlineService({
  now: () => now,
  wallet,
  rewards,
  dining,
  inventory: catalog,
  config: {
    origin: "https://test.example",
    locations: [{ id: "test", name: "Test", address: "Test" }],
  },
  payment: {
    ensureReady() {},
    create: async () => {
      stripeCalls++;
      throw Error("Wallet order must never create Stripe charge");
    },
    expire: async () => ({ status: "expired" }),
  },
  storage: {
    read: async (id) => structuredClone(rows.get(id) || null),
    write: async (id, value, etag) => {
      const old = rows.get(id);
      if (old?.etag !== etag)
        throw Object.assign(new Error("Conflict"), { conflict: true });
      rows.set(id, {
        value: structuredClone(value),
        etag: String(Number(old?.etag || 0) + 1),
      });
    },
    isConflict: (e) => e.conflict,
    all: async () => [...rows.values()].map((r) => r.value),
  },
});
const member = "wallet-member",
  make = (extra = {}) => ({
    requestId: randomUUID(),
    token: randomBytes(32).toString("hex"),
    mode: "takeaway",customer:{name:'Pickup QA',phone:'91234567'},pickupDate:new Date(Date.now()+86400000+8*3600000).toISOString().slice(0,10),pickupTime:'11:30',
    pickupLocation: "test",
    paymentMethod: "wallet",
    items: [{ id: "lunch-v2-barley", qty: 1 }],
    ...extra,
  });
async function topup(amountCents, user = member) {
  const input = { requestId: randomUUID(), amountCents },
    t = await wallet.createTopup(input, user);
  await wallet.paymentEvent({
    id: "cs_" + t.id,
    metadata: { wallet_topup_id: t.id },
    amount_total: amountCents,
    currency: "sgd",
    payment_status: "paid",
    payment_intent: "pi_" + t.id,
  });
  return t;
}
const input = { requestId: randomUUID(), amountCents: 1000 };
const pending = await wallet.createTopup(input, member);
assert.equal((await wallet.view(member)).balanceCents, 0);
await assert.rejects(
  wallet.topup(pending.id, "attacker"),
  (e) => e.status === 404,
);
await assert.rejects(
  wallet.createTopup({ ...input, amountCents: 2000 }, member),
  /不一致/,
);
const event = {
  id: "cs_" + pending.id,
  metadata: { wallet_topup_id: pending.id },
  amount_total: 1000,
  currency: "sgd",
  payment_status: "paid",
  payment_intent: "pi_" + pending.id,
};
await assert.rejects(
  wallet.paymentEvent({ ...event, amount_total: 999 }),
  /不匹配/,
);
await wallet.paymentEvent(event);
await wallet.paymentEvent(event);
assert.equal((await wallet.view(member)).balanceCents, 1000);
assert.equal(
  (await rewards.view(member)).points,
  0,
  "top-up never earns points",
);
const a = make({ items: [{ id: "lunch-v2-barley", qty: 2 }] }),
  b = make({ items: [{ id: "lunch-v2-barley", qty: 2 }] });
await assert.rejects(online.quote(a), (e) => e.status === 401);
const results = await Promise.allSettled([
  online.checkout(a, member),
  online.checkout(b, member),
]);
assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
const win = results[0].status === "fulfilled" ? a : b;
assert.equal((await wallet.view(member)).availableCents, 300);
assert.equal((await wallet.view(member)).balanceCents, 1000);
await online.cancel(win);
await online.cancel(win);
await online.cancel(win === a ? b : a);
assert.equal((await wallet.view(member)).availableCents, 1000);
const order = make();
await online.checkout(order, member);
await assert.rejects(
  online.confirmWallet(order, "attacker"),
  (e) => e.status === 401,
);
await online.confirmWallet(order, member);
await online.confirmWallet(order, member);
assert.equal((await wallet.view(member)).balanceCents, 650);
assert.equal((await rewards.view(member)).points, 3);
assert.equal(stripeCalls, 0);
const refund = {
  id: order.requestId,
  refundId: randomUUID(),
  amountCents: 100,
  reason: "测试部分退款",
};
await online.refundLocal(refund);
await online.refundLocal(refund);
assert.equal((await wallet.view(member)).balanceCents, 750);
assert.equal((await rewards.view(member)).points, 2);
await Promise.all([
  online.refundLocal({ ...refund, refundId: randomUUID(), amountCents: 100 }),
  online.refundLocal({ ...refund, refundId: randomUUID(), amountCents: 150 }),
]);
assert.equal((await wallet.view(member)).balanceCents, 1000);
assert.equal((await rewards.view(member)).points, 0);
assert.equal(
  (await online.get(order.requestId, order.token)).refundedCents,
  350,
);
await assert.rejects(
  online.refundLocal({ ...refund, refundId: randomUUID() }),
  /超过/,
);
const t = await topup(2000),
  request = {
    requestId: randomUUID(),
    topupId: t.id,
    amountCents: 700,
    reason: "测试充值原路退款",
  };
refundState = "pending";
assert((await wallet.refundTopup(request)).pending);
assert.equal((await wallet.view(member)).availableCents, 2300);
const record = {
  id: "re_" + request.requestId.replaceAll("-", ""),
  amount: 700,
  currency: "sgd",
  payment_intent: "pi_" + t.id,
  status: "succeeded",
  metadata: { wallet_refund_id: request.requestId },
};
await wallet.refundUpdated(record);
await wallet.refundUpdated(record);
refundState = "succeeded";
await wallet.refundTopup(request);
assert.equal((await wallet.view(member)).balanceCents, 2300);
assert.equal((await wallet.view(member)).reservedCents, 0);
await wallet.refundEvent({
  id: "ch_test",
  payment_intent: "pi_" + t.id,
  metadata: { wallet_topup_id: t.id },
  currency: "sgd",
  amount: 2000,
  amount_refunded: 700,
  refunds: { data: [record] },
});
assert.equal((await wallet.view(member)).balanceCents, 2300);
refundState = "failed";
await assert.rejects(
  wallet.refundTopup({
    requestId: randomUUID(),
    topupId: t.id,
    amountCents: 100,
    reason: "测试失败退款",
  }),
  /失败/,
);
assert.equal((await wallet.view(member)).reservedCents, 0);
await assert.rejects(
  wallet.refundTopup({
    requestId: randomUUID(),
    topupId: t.id,
    amountCents: 2000,
    reason: "越界",
  }),
  /超过/,
);
const expiring = make();
await online.checkout(expiring, member);
now = new Date(now.getTime() + 31 * 60000);
await online.expireFreeRewards();
assert.equal(
  (await online.get(expiring.requestId, expiring.token)).status,
  "expired",
);
assert.equal((await wallet.view(member)).availableCents, 2300);
// Refund a fully covered food voucher without a cash processor transaction.
const menu = await catalog.menu();
await rewards.importVoucher(
  {
    id: "free-test",
    memberId: member,
    dishId: "lunch-v2-barley",
    title: "免费测试券",
    expiresAt: new Date(now.getTime() + 86400000).toISOString(),
  },
  menu,
);
const free = make({
  paymentMethod: "stripe",
  rewardSelection: { type: "voucher", id: "free-test" },
});
await online.checkout(free, member);
await online.confirmReward(free, member);
await online.refundLocal({
  id: free.requestId,
  refundId: randomUUID(),
  amountCents: 0,
  reason: "退还免费券",
});
assert.equal((await rewards.view(member)).vouchers[0].status, "available");
assert(!(await online.feed()).some((o) => o.id === free.requestId));
await dining.mutate({
  table: "A1",
  group: "A",
  opId: randomUUID(),
  deviceId: randomUUID(),
  kind: "delta",
  dishId: "lunch-v2-barley",
  delta: 1,
});
const cart = await dining.cart("A1", "A");
const dine = make({
  mode: "dinein",
  table: "A1",
  group: "A",
  items: cart.items,
  cartOpIds: cart.opIds,
  note: cart.note,
});
await online.checkout(dine, member);
await online.confirmWallet(dine, member);
assert((await dining.feed()).events.some((e) => e.id === dine.requestId));
await online.refundLocal({
  id: dine.requestId,
  refundId: randomUUID(),
  amountCents: 385,
  reason: "堂食退款",
});
assert(!(await dining.feed()).events.some((e) => e.id === dine.requestId));
const receipt = (await dining.cart("A1", "A")).orders.find(
  (o) => o.id === dine.requestId,
);
assert.equal(receipt.refundedCents, 385);
assert.equal(receipt.memberId, undefined);
assert.equal(receipt.refundRequests, undefined);
console.log(
  "PASS wallet: verified top-up only, no top-up points, concurrent balance reservation, explicit payment, cancellation/expiry, ownership, idempotent partial/full order and cash refunds, pending/failed refunds, free-voucher refund, no live financial operations.",
);
