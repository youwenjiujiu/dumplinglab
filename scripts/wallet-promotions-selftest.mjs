import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createWalletService } from "../web/server/wallet-core.js";
import { createRewardsService } from "../web/server/rewards-core.js";
import { createCatalogService } from "../web/server/catalog-core.js";
function doc() {
  let row;
  return {
    read: async () => structuredClone(row || null),
    write: async (value, etag) => {
      if (row?.etag !== etag)
        throw Object.assign(Error("Conflict"), { conflict: true });
      row = {
        value: structuredClone(value),
        etag: String(Number(row?.etag || 0) + 1),
      };
    },
    isConflict: (e) => e.conflict,
  };
}
await createCatalogService(doc()).menu(); // Loads the shared canonical pricing implementation.
const rewards = createRewardsService(doc());
let failSync = false,
  refundStatus = "succeeded";
const wallet = createWalletService(
  doc(),
  {
    ensureReady() {},
    createTopup: async (t) => ({
      id: "cs_" + t.id,
      url: "https://checkout.stripe.com/fixture",
    }),
    expire: async () => ({ status: "expired" }),
    refund: async (r) => ({
      id: "re_" + r.id.replaceAll("-", ""),
      amount: r.amountCents,
      currency: "sgd",
      payment_intent: r.paymentIntentId,
      status: refundStatus,
      metadata: { wallet_refund_id: r.id },
    }),
  },
  {
    rewards: {
      syncTopup: async (t) => {
        if (failSync) {
          failSync = false;
          throw Error("Points ledger interrupted");
        }
        return rewards.syncTopup(t);
      },
    },
  },
);
const member = "promotion-member",
  tier = {
    amountCents: 20000,
    bonusCents: 2000,
    bonusPoints: 100,
    active: true,
  };
await wallet.saveSettings({
  revision: 0,
  tiers: [tier],
  bonusEarnsPoints: false,
});
await assert.rejects(
  wallet.saveSettings({ revision: 0, tiers: [tier], bonusEarnsPoints: false }),
  /已更新/,
);
await assert.rejects(
  wallet.saveSettings({
    revision: 1,
    tiers: [tier, tier],
    bonusEarnsPoints: false,
  }),
  /不能重复/,
);
await assert.rejects(
  wallet.createTopup(
    { requestId: randomUUID(), amountCents: 20000, configRevision: 0 },
    member,
  ),
  (e) => e.status === 422,
);
const input = {
  requestId: randomUUID(),
  amountCents: 20000,
  configRevision: 1,
  bonusCents: 999999,
};
const topup = await wallet.createTopup(input, member);
assert.equal(topup.bonusCents, 2000);
assert.equal((await wallet.view(member)).balanceCents, 0);
await wallet.saveSettings({ revision: 1, tiers: [], bonusEarnsPoints: true });
assert.equal(
  (await wallet.createTopup(input, member)).bonusCents,
  2000,
  "pending terms remain unchanged",
);
const event = {
  id: "cs_" + topup.id,
  payment_status: "paid",
  payment_intent: "pi_" + topup.id,
  currency: "sgd",
  amount_total: 20000,
  metadata: { wallet_topup_id: topup.id },
};
failSync = true;
await assert.rejects(wallet.paymentEvent(event), /interrupted/);
await wallet.paymentEvent(event);
await wallet.paymentEvent(event);
assert.equal((await wallet.view(member)).principalCents, 20000);
assert.equal((await wallet.view(member)).bonusCents, 2000);
assert.equal((await rewards.view(member)).points, 100);
await wallet.saveSettings({
  revision: 2,
  tiers: [tier],
  bonusEarnsPoints: false,
});
const order = {
  id: randomUUID(),
  memberId: member,
  paymentMethod: "wallet",
  total: 22,
  at: new Date().toISOString(),
  items: [{ id: "fixture-meal", qty: 1, price: 22 }],
};
order.walletAllocation = await wallet.check(order);
assert.deepEqual(order.walletAllocation, {
  principalCents: 2000,
  bonusCents: 200,
  bonusEarnsPoints: false,
});
order.loyalty = await rewards.quote(member, order, null);
assert.equal(order.loyalty.expectedPoints, 20);
await rewards.reserve(order);
await wallet.reserve(order);
await wallet.settle(order, "paid");
await rewards.settle(order, "paid");
assert.equal((await wallet.view(member)).balanceCents, 19800);
assert.equal((await rewards.view(member)).points, 120);
await wallet.refundOrder(order, 1100);
await rewards.refund(order, 1100);
assert.equal((await wallet.view(member)).principalCents, 19000);
assert.equal((await wallet.view(member)).bonusCents, 1900);
assert.equal((await rewards.view(member)).points, 110);
await wallet.refundOrder(order, 2200);
await rewards.refund(order, 2200);
await wallet.refundOrder(order, 2200);
assert.equal((await wallet.view(member)).balanceCents, 22000);
assert.equal((await rewards.view(member)).points, 100);
const refund = {
  requestId: randomUUID(),
  topupId: topup.id,
  amountCents: 10000,
  reason: "Test proportional bonus reversal",
};
refundStatus = "pending";
await wallet.refundTopup(refund);
assert.equal((await wallet.view(member)).reservedCents, 11000);
assert.equal((await wallet.view(member)).availableCents, 11000);
const refundEvent = {
  id: "re_" + refund.requestId.replaceAll("-", ""),
  amount: 10000,
  currency: "sgd",
  payment_intent: "pi_" + topup.id,
  status: "succeeded",
  metadata: { wallet_refund_id: refund.requestId },
};
await wallet.refundUpdated(refundEvent);
await wallet.refundUpdated(refundEvent);
await wallet.paymentEvent(event);
assert.equal((await wallet.view(member)).balanceCents, 11000);
assert.equal((await wallet.view(member)).bonusCents, 1000);
assert.equal((await rewards.view(member)).points, 50);
refundStatus = "failed";
await assert.rejects(
  wallet.refundTopup({ ...refund, requestId: randomUUID(), amountCents: 100 }),
  /失败/,
);
assert.equal((await wallet.view(member)).reservedCents, 0);
refundStatus = "succeeded";
await wallet.refundTopup({ ...refund, requestId: randomUUID() });
assert.equal((await wallet.view(member)).balanceCents, 0);
assert.equal((await rewards.view(member)).points, 0);
// A late points sync must never resurrect refunded bonus points.
await rewards.syncTopup({ ...topup, memberId: member, refundedCents: 0 });
assert.equal((await rewards.view(member)).points, 0);
// Existing principal-only accounts and non-promotion amounts receive no bonus.
const ordinary = await wallet.createTopup(
  { requestId: randomUUID(), amountCents: 10000 },
  member,
);
assert.equal(ordinary.bonusCents, 0);
assert.equal(ordinary.bonusPoints, 0);
const concurrencyMember='bonus-concurrency';
const ct=await wallet.createTopup({requestId:randomUUID(),amountCents:20000},concurrencyMember);
await wallet.paymentEvent({...event,id:'cs_'+ct.id,payment_intent:'pi_'+ct.id,metadata:{wallet_topup_id:ct.id}});
await wallet.saveSettings({revision:3,tiers:[tier],bonusEarnsPoints:true});
const toggleOrder={...order,id:randomUUID(),memberId:concurrencyMember};toggleOrder.walletAllocation=await wallet.check(toggleOrder);toggleOrder.loyalty=await rewards.quote(concurrencyMember,toggleOrder,null);assert.equal(toggleOrder.loyalty.expectedPoints,22,'bonus earning toggle applies to new orders');
const contenders=await Promise.all([1,2].map(async()=>{const o={...order,id:randomUUID(),memberId:concurrencyMember,total:130};o.walletAllocation=await wallet.check(o);return o;}));
const reservations=await Promise.allSettled(contenders.map(o=>wallet.reserve(o)));assert.equal(reservations.filter(r=>r.status==='fulfilled').length,1);const winning=contenders[reservations.findIndex(r=>r.status==='fulfilled')];await wallet.settle(winning,'expired');assert.equal((await wallet.view(concurrencyMember)).availableCents,22000);
await wallet.refundUpdated({id:'re_external_bonus_test',payment_intent:'pi_'+ct.id,currency:'sgd',amount:10000,status:'succeeded',metadata:{}});assert.equal((await wallet.view(concurrencyMember)).principalCents,10000);assert.equal((await wallet.view(concurrencyMember)).bonusCents,1000);assert.equal((await rewards.view(concurrencyMember)).points,50);
console.log(
  "PASS promotion accounting: config CAS, immutable offers, verified credit, interrupted/replayed points sync, principal/bonus spending, no bonus-spend earnings, proportional meal and topup refunds, pending/failed refunds, stale event protection. No live funds.",
);
