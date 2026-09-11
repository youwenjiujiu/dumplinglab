import assert from "node:assert/strict";
import { randomUUID, randomBytes, createHmac } from "node:crypto";
import { createRewardsService } from "../web/server/rewards-core.js";
import { createCatalogService } from "../web/server/catalog-core.js";
import { createOnlineService } from "../web/server/online-core.js";
import { verifyRewardGrant } from "../web/server/rewards-bridge.js";
function documentStore() {
  let row = null;
  return {
    read: async () => structuredClone(row),
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
let clock = new Date();
const catalog = createCatalogService(documentStore()),
  ledgerStore = documentStore(),
  rewards = createRewardsService(ledgerStore, { now: () => clock });
const menu = await catalog.menu(),
  drink = menu.find((d) => d.id === "lunch-v2-barley"),
  food = menu.find((d) => d.id === "lunch-v2-soft-egg");
await rewards.save(
  {
    revision: 0,
    pointsPerDollar: 1,
    rewards: [{ dishId: drink.id, points: 10, active: true }],
  },
  menu,
);
const records = new Map();
let paymentCreates = 0,
  settleFails = 0;
const online = createOnlineService({
  now: () => clock,
  inventory: catalog,
  rewards: {
    ...rewards,
    settle: async (...args) => {
      if (settleFails-- > 0) throw new Error("Transient ledger outage");
      return rewards.settle(...args);
    },
  },
  config: {
    locations: [{ id: "test", name: "Test", address: "Test" }],
    origin: "https://test.example",
  },
  storage: {
    read: async (id) => structuredClone(records.get(id) || null),
    write: async (id, value, etag) => {
      const old = records.get(id);
      if (old?.etag !== etag)
        throw Object.assign(new Error("Conflict"), { conflict: true });
      records.set(id, {
        value: structuredClone(value),
        etag: String(Number(old?.etag || 0) + 1),
      });
    },
    isConflict: (e) => e.conflict,
    all: async () => [...records.values()].map((r) => r.value),
  },
  payment: {
    ensureReady() {},
    create: async (o) => {
      paymentCreates++;
      return { id: `cs_${o.id}`, url: "https://test.example/pay" };
    },
    expire: async () => ({ status: "expired", payment_status: "unpaid" }),
  },
});
const make = (items = [{ id: drink.id, qty: 1 }], extra = {}) => ({
  requestId: randomUUID(),
  token: randomBytes(32).toString("hex"),
  mode: "takeaway",
  pickupLocation: "test",
  items,
  ...extra,
});
async function paid(input, member = "member-one") {
  const { order } = await online.checkout(input, member);
  await online.paymentEvent({
    id: `cs_${order.id}`,
    currency: "sgd",
    amount_total: Math.round(order.total * 100),
    payment_status: "paid",
    payment_intent: `pi_${order.id}`,
    metadata: { dumpling_order_id: order.id },
  });
  return online.get(input.requestId, input.token);
}
const earn = make([{ id: drink.id, qty: 20 }]);
const earned = await paid(earn);
assert.equal(earned.rewardPointsEarned, 70);
assert.equal(earned.memberId, undefined);
assert.equal(earned.paymentIntentId, undefined);
assert.equal((await rewards.view("member-one")).points, 70);
await paid(earn);
assert.equal(
  (await rewards.view("member-one")).points,
  70,
  "repeated payment cannot award twice",
);
await assert.rejects(
  online.quote(
    make(undefined, {
      rewardSelection: { type: "points", id: drink.id },
      memberId: "member-one",
    }),
  ),
  (e) => e.status === 401,
  "browser memberId cannot authenticate",
);
const settings = await rewards.admin();
await rewards.save(
  { ...settings, rewards: [{ dishId: drink.id, points: 70, active: true }] },
  menu,
);
const inputs = [
  make(undefined, { rewardSelection: { type: "points", id: drink.id } }),
  make(undefined, { rewardSelection: { type: "points", id: drink.id } }),
];
const results = await Promise.allSettled(
  inputs.map((i) => online.checkout(i, "member-one")),
);
assert.equal(
  results.filter((r) => r.status === "fulfilled").length,
  1,
  "last points reserved exactly once",
);
const winner = inputs[results.findIndex((r) => r.status === "fulfilled")];
assert.equal((await rewards.view("member-one")).availablePoints, 0);
assert.equal(
  (await rewards.view("member-one")).points,
  70,
  "pending redemption not yet spent",
);
await online.cancel(winner);
await online.cancel(winner);
assert.equal((await rewards.view("member-one")).availablePoints, 70);
for (let i = 0; i < inputs.length; i++)
  if (inputs[i] !== winner) await online.cancel(inputs[i]);
const free = make(undefined, {
    rewardSelection: { type: "points", id: drink.id },
  }),
  before = paymentCreates;
const quote = await online.quote(free, "member-one");
assert.equal(quote.total, 0);
assert.equal(
  quote.items[0].price,
  3.5,
  "stock item retains full canonical unit price",
);
assert.equal(quote.loyalty.expectedPoints, 0);
const prepared = await online.checkout(free, "member-one");
assert.equal(prepared.order.status, "awaiting_payment");
assert.equal(prepared.freeRedemption, true);
assert.equal(paymentCreates, before, "free reward needs no payment session");
await assert.rejects(
  online.confirmReward(free, "member-two"),
  (e) => e.status === 401,
);
await online.confirmReward(free, "member-one");
await online.confirmReward(free, "member-one");
assert.equal((await rewards.view("member-one")).points, 0);
assert.equal((await online.get(free.requestId, free.token)).status, "paid");
// Durable signed voucher, owner binding, concurrent use, cancellation and refund.
const voucher = {
  id: "cancan_voucher_one",
  memberId: "member-two",
  dishId: drink.id,
  title: "CanCan 薏米水",
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
};
await rewards.importVoucher(voucher, menu);
await rewards.importVoucher(voucher, menu);
await assert.rejects(
  rewards.importVoucher({ ...voucher, memberId: "member-one" }, menu),
  /不一致/,
);
await assert.rejects(
  online.quote(
    make(undefined, { rewardSelection: { type: "voucher", id: voucher.id } }),
    "member-one",
  ),
  (e) => e.status === 404,
);
const vinputs = [
  make(
    [
      { id: drink.id, qty: 1 },
      { id: food.id, qty: 2 },
    ],
    { rewardSelection: { type: "voucher", id: voucher.id } },
  ),
  make(undefined, { rewardSelection: { type: "voucher", id: voucher.id } }),
];
const vr = await Promise.allSettled(
  vinputs.map((i) => online.checkout(i, "member-two")),
);
assert.equal(vr.filter((r) => r.status === "fulfilled").length, 1);
for (const i of vinputs) await online.cancel(i);
const vin = make(
  [
    { id: drink.id, qty: 1 },
    { id: food.id, qty: 2 },
  ],
  { rewardSelection: { type: "voucher", id: voucher.id } },
);
const vp = await paid(vin, "member-two");
assert.equal(vp.total, 3.8);
assert.equal(vp.rewardPointsEarned, 3);
assert.equal((await rewards.view("member-two")).vouchers[0].status, "used");
const charge = {
  metadata: { dumpling_order_id: vp.id },
  payment_intent: `pi_${vp.id}`,
  currency: "sgd",
  amount: 380,
  amount_refunded: 90,
};
await assert.rejects(
  online.refundEvent({ ...charge, payment_intent: "forged" }),
  (e) => e.status === 409,
);
await online.refundEvent(charge);
assert.equal((await rewards.view("member-two")).points, 2);
await online.refundEvent({ ...charge, amount_refunded: 380 });
await online.refundEvent(charge);
await online.refundEvent({ ...charge, amount_refunded: 380 });
assert.equal((await rewards.view("member-two")).points, 0);
assert.equal(
  (await rewards.view("member-two")).vouchers[0].status,
  "available",
);
assert.equal((await online.get(vp.id, vin.token)).refundedCents, 380);
// A retry via receipt GET repairs a webhook interrupted after payment confirmation.
const recovering = make();
await online.checkout(recovering, "member-three");
settleFails = 1;
await assert.rejects(paid(recovering, "member-three"), /Transient/);
assert.equal(
  (await online.get(recovering.requestId, recovering.token)).rewardPointsEarned,
  3,
);
assert.equal((await rewards.view("member-three")).points, 3);
// Full refunds restore the exact spent points once; later refunds can create debt.
await paid(make([{ id: drink.id, qty: 20 }]), "refund-member");
const rin = make(
  [
    { id: drink.id, qty: 1 },
    { id: food.id, qty: 1 },
  ],
  { rewardSelection: { type: "points", id: drink.id } },
);
const rp = await paid(rin, "refund-member");
assert.equal((await rewards.view("refund-member")).points, 1);
const rc = {
  metadata: { dumpling_order_id: rp.id },
  payment_intent: `pi_${rp.id}`,
  currency: "sgd",
  amount: 190,
  amount_refunded: 190,
};
await online.refundEvent(rc);
await online.refundEvent(rc);
assert.equal((await rewards.view("refund-member")).points, 70);
const debtInput = make([{ id: drink.id, qty: 20 }]),
  debtPaid = await paid(debtInput, "debt-member");
const spend = make(undefined, {
  rewardSelection: { type: "points", id: drink.id },
});
await online.checkout(spend, "debt-member");
await online.confirmReward(spend, "debt-member");
await online.refundEvent({
  metadata: { dumpling_order_id: debtPaid.id },
  payment_intent: `pi_${debtPaid.id}`,
  currency: "sgd",
  amount: 7000,
  amount_refunded: 7000,
});
assert.equal((await rewards.view("debt-member")).points, -70);
assert.equal((await rewards.view("debt-member")).availablePoints, 0);
// Abandoned no-charge checkouts release points and physical stock after 30 minutes.
const timeout = make(undefined, {
  rewardSelection: { type: "points", id: drink.id },
});
await online.checkout(timeout, "refund-member");
assert.equal((await rewards.view("refund-member")).availablePoints, 0);
clock = new Date(clock.getTime() + 31 * 60000);
await online.expireFreeRewards();
assert.equal(
  (await online.get(timeout.requestId, timeout.token)).status,
  "expired",
);
assert.equal((await rewards.view("refund-member")).availablePoints, 70);
await assert.rejects(
  online.confirmReward(timeout, "refund-member"),
  (e) => e.status === 410,
);
assert.equal(
  (await catalog.admin()).items.find((d) => d.id === drink.id).reserved,
  0,
);
// Price and configuration changes cannot silently alter a displayed reward.
const stale = await rewards.admin();
await rewards.save({ ...stale, pointsPerDollar: 2, rewards: [] }, menu);
await assert.rejects(rewards.save({ ...stale, rewards: [] }, menu), /刷新/);
await assert.rejects(
  online.quote(
    make(undefined, { rewardSelection: { type: "points", id: drink.id } }),
    "member-one",
  ),
  /下架/,
);
const raw = Buffer.from(
    JSON.stringify({
      ...voucher,
      issuer: "cancan",
      audience: "dumplinglab",
      version: 1,
    }),
  ),
  secret = "test-only-secret-32-characters-long",
  timestamp = String(Math.floor(Date.now() / 1000));
const signature = createHmac("sha256", secret)
  .update(timestamp + ".")
  .update(raw)
  .digest("hex");
assert.equal(
  verifyRewardGrant(raw, timestamp, signature, secret).id,
  voucher.id,
);
assert.throws(
  () => verifyRewardGrant(Buffer.from("{}"), timestamp, signature, secret),
  /签名/,
);
assert.throws(
  () =>
    verifyRewardGrant(raw, timestamp, signature, secret, Date.now() + 301000),
  /签名/,
);
// Admin rules support an exact main-dish variant and apply without deployment.
const dumpling=menu.find(d=>d.variants),style=Object.keys(dumpling.variants).find(k=>!dumpling.variants[k].legacy);
await paid(make([{id:drink.id,qty:2}]),'variant-member');
const variantStartingPoints=(await rewards.view('variant-member',menu)).availablePoints;
const cfg=await rewards.admin();
await assert.rejects(rewards.save({revision:cfg.revision,pointsPerDollar:2,rewards:[{dishId:dumpling.id,style:'invalid',points:1,active:true}]},menu),/规格/);
await rewards.save({revision:cfg.revision,pointsPerDollar:2,rewards:[{dishId:dumpling.id,style,points:1,active:true}]},menu);
const selection={type:'points',id:dumpling.id};
await assert.rejects(rewards.quote('variant-member',{items:[{id:dumpling.id,style:'other',price:5,qty:1}]},selection),/加入本单/);
const variantOrder=make([{id:dumpling.id,style,qty:1}],{rewardSelection:selection});
const variantPrepared=await online.checkout(variantOrder,'variant-member');assert.equal(variantPrepared.order.total,0);
await online.confirmReward(variantOrder,'variant-member');
assert.equal((await rewards.view('variant-member',menu)).availablePoints,variantStartingPoints-1);
const changed=await rewards.admin();await rewards.save({revision:changed.revision,pointsPerDollar:2,rewards:[{dishId:dumpling.id,style,points:9,active:false}]},menu);
assert.equal((await rewards.view('variant-member',menu)).rewards.length,0);
console.log(
  "PASS rewards: authentic identity, concurrent points/voucher reservation, canonical prices, explicit free-order confirmation, idempotent payment/refund, owner binding, cancellation release, receipt recovery, signed issuer grants. No live writes.",
);
