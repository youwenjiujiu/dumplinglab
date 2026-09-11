import { createHash } from "node:crypto";
import { RequestError } from "./order-core.js";
const validId = (v) => typeof v === "string" && /^[a-f0-9-]{36}$/.test(v);
const memberKey = (v) =>
  typeof v === "string" &&
  /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/.test(v) &&
  !["constructor", "prototype"].includes(v);
const fail = (message, status = 409) => {
  throw new RequestError(message, status);
};
const initial = () => ({
  schema: 1,
  revision: 0,
  configRevision: 0,
  tiers: [],
  bonusEarnsPoints: false,
  accounts: {},
  topups: {},
  holds: {},
  refunds: {},
  audit: [],
});
const account = (s, id) =>
  (s.accounts[id] ||= { balanceCents: 0, bonusCents: 0, entries: [] });
const buckets = (s, id) => {
  const a = s.accounts[id],
    bonus = a?.bonusCents || 0;
  let principal = (a?.balanceCents || 0) - bonus,
    gifts = bonus;
  for (const h of Object.values(s.holds))
    if (h.memberId === id && h.status === "reserved") {
      principal -= h.principalCents ?? h.amountCents;
      gifts -= h.bonusCents || 0;
    }
  for (const r of Object.values(s.refunds))
    if (r.memberId === id && r.status === "reserved") {
      principal -= r.amountCents;
      gifts -= r.bonusReclaimCents || 0;
    }
  return {
    principalCents: Math.max(0, principal + Math.min(0, gifts)),
    bonusCents: Math.max(0, gifts + Math.min(0, principal)),
  };
};
const held = (s, id) =>
  Object.values(s.holds)
    .filter((h) => h.memberId === id && h.status === "reserved")
    .reduce((n, h) => n + h.amountCents, 0) +
  Object.values(s.refunds)
    .filter((r) => r.memberId === id && r.status === "reserved")
    .reduce((n, r) => n + r.amountCents + (r.bonusReclaimCents || 0), 0);
const available = (s, id) => {
  const b = buckets(s, id);
  return b.principalCents + b.bonusCents;
};
const allocation = (s, o) => {
  const b = buckets(s, o.memberId),
    amount = cents(o),
    total = b.principalCents + b.bonusCents;
  if (total < amount) fail("余额不足，请充值或选择其他支付方式");
  const principalCents = amount
    ? Math.ceil((amount * b.principalCents) / total)
    : 0;
  return {
    principalCents,
    bonusCents: amount - principalCents,
    bonusEarnsPoints: Boolean(s.bonusEarnsPoints),
  };
};
const cents = (o) => globalThis.OrderPricing.cents(o.total);
const fingerprint = (o) =>
  createHash("sha256")
    .update(
      JSON.stringify([
        o.id,
        o.memberId,
        cents(o),
        ...(o.walletAllocation ? [o.walletAllocation] : []),
      ]),
    )
    .digest("hex");
export function createWalletService(
  storage,
  payment,
  {
    now = () => new Date(),
    minTopupCents = 100,
    maxTopupCents = 100000,
    rewards,
  } = {},
) {
  async function read() {
    return (await storage.read())?.value || initial();
  }
  async function change(fn) {
    for (let i = 0; i < 16; i++) {
      const row = await storage.read(),
        s = structuredClone(row?.value || initial());
      if (fn(s) === false) return s;
      s.revision++;
      try {
        await storage.write(s, row?.etag);
        return s;
      } catch (e) {
        if (!storage.isConflict(e)) throw e;
      }
    }
    fail("账户正在更新，请重试");
  }
  function log(
    s,
    memberId,
    type,
    amountCents,
    reference,
    reason,
    bonusCents = 0,
  ) {
    const a = account(s, memberId);
    a.balanceCents += amountCents;
    a.bonusCents = (a.bonusCents || 0) + bonusCents;
    a.entries.unshift({
      id: `${reference}:${type}:${a.entries.length}`,
      type,
      amountCents,
      principalCents: amountCents - bonusCents,
      bonusCents,
      balanceCents: a.balanceCents,
      reference,
      reason,
      at: now().toISOString(),
    });
    s.audit.unshift({ type, amountCents, reference, at: now().toISOString() });
    s.audit = s.audit.slice(0, 500);
  }
  function own(s, id, memberId) {
    if (!memberKey(memberId)) fail("请先登录", 401);
    const t = s.topups[id];
    if (!t || t.memberId !== memberId) fail("找不到此充值记录", 404);
    return t;
  }
  const topupView = (t) => ({
    id: t.id,
    amountCents: t.amountCents,
    bonusCents: t.bonusCents || 0,
    bonusPoints: t.bonusPoints || 0,
    bonusReclaimedCents: t.bonusReclaimedCents || 0,
    refundedCents: t.refundedCents,
    status: t.status,
    at: t.at,
    paidAt: t.paidAt,
    paymentUrl: t.paymentUrl,
  });
  async function reconcile(id) {
    const t = (await read()).topups[id];
    if (t?.status === "paid" && (t.bonusPoints || 0) > 0) {
      if (!rewards) fail("充值积分同步暂不可用", 503);
      await rewards.syncTopup(t);
    }
  }
  async function applyRefundRecord(id, refund) {
    await change((s) => {
      const t = s.topups[id];
      if (
        !t ||
        t.status !== "paid" ||
        refund.payment_intent !== t.paymentIntentId ||
        refund.currency !== "sgd" ||
        !/^re_[A-Za-z0-9_]+$/.test(refund.id || "") ||
        !Number.isSafeInteger(refund.amount) ||
        refund.amount <= 0
      )
        fail("充值退款资料不匹配");
      t.processedRefunds ||= {};
      const source = refund.metadata?.wallet_refund_id,
        r = source ? s.refunds[source] : null;
      if (r && (r.topupId !== id || r.amountCents !== refund.amount))
        fail("退款请求不匹配");
      if (refund.status === "succeeded") {
        if (!t.processedRefunds[refund.id]) {
          if (t.refundedCents + refund.amount > t.amountCents)
            fail("超过充值金额");
          log(
            s,
            t.memberId,
            "topup-refund",
            -refund.amount,
            refund.id,
            "充值退回原支付渠道",
          );
          t.refundedCents += refund.amount;
          const reclaimed = Math.floor(
              ((t.bonusCents || 0) * t.refundedCents) / t.amountCents,
            ),
            delta = reclaimed - (t.bonusReclaimedCents || 0);
          if (delta)
            log(
              s,
              t.memberId,
              "bonus-reversal",
              -delta,
              refund.id,
              "充值退款收回赠金",
              -delta,
            );
          t.bonusReclaimedCents = reclaimed;
          t.processedRefunds[refund.id] = refund.amount;
        }
        if (r) r.status = "succeeded";
      } else if (
        ["failed", "canceled"].includes(refund.status) &&
        r?.status === "reserved"
      )
        r.status = "failed";
      else return false;
    });
    await reconcile(id);
  }

  return {
    async saveSettings(input) {
      if (
        !Number.isInteger(input.revision) ||
        typeof input.bonusEarnsPoints !== "boolean" ||
        !Array.isArray(input.tiers) ||
        input.tiers.length > 20
      )
        fail("充值规则无效", 400);
      const seen = new Set(),
        tiers = input.tiers.map((t) => {
          if (
            !Number.isSafeInteger(t.amountCents) ||
            t.amountCents < minTopupCents ||
            t.amountCents > maxTopupCents ||
            seen.has(t.amountCents) ||
            !Number.isSafeInteger(t.bonusCents) ||
            t.bonusCents < 0 ||
            t.bonusCents > t.amountCents ||
            !Number.isSafeInteger(t.bonusPoints) ||
            t.bonusPoints < 0 ||
            t.bonusPoints > 100000 ||
            typeof t.active !== "boolean"
          )
            fail("请核对充值金额、赠金和积分；充值金额不能重复", 400);
          if (t.bonusPoints && !rewards) fail("充值赠积分尚未连接", 503);
          seen.add(t.amountCents);
          return {
            amountCents: t.amountCents,
            bonusCents: t.bonusCents,
            bonusPoints: t.bonusPoints,
            active: t.active,
          };
        });
      await change((s) => {
        if ((s.configRevision || 0) !== input.revision)
          fail("充值规则已更新，请刷新后重试");
        s.configRevision = input.revision + 1;
        s.tiers = tiers;
        s.bonusEarnsPoints = input.bonusEarnsPoints;
        s.audit.unshift({
          type: "settings",
          at: now().toISOString(),
          tiers,
          bonusEarnsPoints: input.bonusEarnsPoints,
        });
        s.audit = s.audit.slice(0, 500);
      });
      return this.admin();
    },
    ensureReady() {
      payment.ensureReady();
    },
    async view(memberId) {
      if (!memberKey(memberId)) fail("请先登录", 401);
      for (const t of Object.values((await read()).topups))
        if (t.memberId === memberId && t.status === "paid" && t.bonusPoints > 0)
          await reconcile(t.id);
      const s = await read(),
        a = s.accounts[memberId];
      return {
        balanceCents: a?.balanceCents || 0,
        principalCents: (a?.balanceCents || 0) - (a?.bonusCents || 0),
        bonusCents: a?.bonusCents || 0,
        availablePrincipalCents: buckets(s, memberId).principalCents,
        availableBonusCents: buckets(s, memberId).bonusCents,
        tiers: (s.tiers || []).filter((t) => t.active),
        configRevision: s.configRevision || 0,
        bonusEarnsPoints: Boolean(s.bonusEarnsPoints),
        availableCents: available(s, memberId),
        reservedCents: held(s, memberId),
        entries: (a?.entries || []).slice(0, 100),
        topups: Object.values(s.topups)
          .filter((t) => t.memberId === memberId)
          .sort((a, b) => b.at.localeCompare(a.at))
          .slice(0, 50)
          .map(topupView),
        minTopupCents,
        maxTopupCents,
      };
    },
    async admin() {
      const s = await read();
      return {
        configRevision: s.configRevision || 0,
        tiers: s.tiers || [],
        bonusEarnsPoints: Boolean(s.bonusEarnsPoints),
        bonusCents: Object.values(s.accounts).reduce(
          (n, a) => n + (a.bonusCents || 0),
          0,
        ),
        balanceCents: Object.values(s.accounts).reduce(
          (n, a) => n + a.balanceCents,
          0,
        ),
        memberCount: Object.keys(s.accounts).length,
        topups: Object.values(s.topups)
          .sort((a, b) => b.at.localeCompare(a.at))
          .slice(0, 100)
          .map((t) => ({ ...topupView(t), memberId: t.memberId })),
        refunds: Object.values(s.refunds).slice(-100),
        audit: s.audit,
      };
    },
    async createTopup(input, memberId) {
      if (!memberKey(memberId)) fail("请先登录", 401);
      if (
        !validId(input.requestId) ||
        !Number.isSafeInteger(input.amountCents) ||
        input.amountCents < minTopupCents ||
        input.amountCents > maxTopupCents
      )
        fail(
          `充值金额须为 S$${minTopupCents / 100}–${maxTopupCents / 100}`,
          400,
        );
      payment.ensureReady();
      let s = await change((s) => {
        const old = s.topups[input.requestId];
        if (old) {
          if (
            old.memberId !== memberId ||
            old.amountCents !== input.amountCents
          )
            fail("充值请求内容不一致");
          return false;
        }
        if (
          input.configRevision !== undefined &&
          input.configRevision !== (s.configRevision || 0)
        )
          fail("充值优惠已更新，请重新查看充值金额", 422);
        const tier = (s.tiers || []).find(
          (t) => t.active && t.amountCents === input.amountCents,
        );
        account(s, memberId);
        s.topups[input.requestId] = {
          id: input.requestId,
          memberId,
          amountCents: input.amountCents,
          bonusCents: tier?.bonusCents || 0,
          bonusPoints: tier?.bonusPoints || 0,
          configRevision: s.configRevision || 0,
          refundedCents: 0,
          status: "pending",
          at: now().toISOString(),
        };
      });
      let t = s.topups[input.requestId];
      if (t.status === "pending" && !t.sessionId) {
        if (now().getTime() - Date.parse(t.at) > 23 * 3600000)
          fail("原充值需核实，请联系门店", 503);
        const session = await payment.createTopup(t);
        s = await change((s) => {
          const r = s.topups[t.id];
          if (r.sessionId && r.sessionId !== session.id)
            fail("充值支付编号不一致");
          r.sessionId = session.id;
          r.paymentUrl = session.url;
        });
        t = s.topups[t.id];
      }
      return topupView(t);
    },
    async topup(id, memberId) {
      own(await read(), id, memberId);
      await reconcile(id);
      return topupView(own(await read(), id, memberId));
    },
    async cancelTopup(id, memberId) {
      let t = own(await read(), id, memberId);
      if (t.status === "paid") fail("充值已到账");
      if (t.status === "expired") return { cancelled: true };
      if (!t.sessionId) {
        await this.createTopup(
          { requestId: id, amountCents: t.amountCents },
          memberId,
        );
        t = own(await read(), id, memberId);
      }
      const result = await payment.expire(t.sessionId);
      if (result.status !== "expired" || result.payment_status === "paid")
        fail("充值正在确认，请稍后查询");
      await change((s) => {
        if (s.topups[id].status === "paid") fail("充值已到账");
        s.topups[id].status = "expired";
      });
      return { cancelled: true };
    },
    async paymentEvent(session) {
      const id = session.metadata?.wallet_topup_id;
      if (!validId(id)) fail("充值编号无效", 400);
      await change((s) => {
        const t = s.topups[id];
        if (
          !t ||
          (t.sessionId && t.sessionId !== session.id) ||
          session.currency !== "sgd" ||
          session.amount_total !== t.amountCents
        )
          fail("充值支付信息不匹配");
        if (t.status === "paid") return false;
        if (session.payment_status === "paid") {
          t.status = "paid";
          t.sessionId = session.id;
          t.paymentIntentId = session.payment_intent;
          t.paidAt = now().toISOString();
          log(s, t.memberId, "topup", t.amountCents, id, "充值本金到账");
          if (t.bonusCents)
            log(
              s,
              t.memberId,
              "topup-bonus",
              t.bonusCents,
              id,
              "充值赠金到账",
              t.bonusCents,
            );
        } else if (session.status === "expired") t.status = "expired";
        else return false;
      });
      await reconcile(id);
    },
    async refundEvent(charge) {
      const t = (await read()).topups[charge.metadata?.wallet_topup_id];
      if (
        !t ||
        t.status !== "paid" ||
        !t.paymentIntentId ||
        charge.payment_intent !== t.paymentIntentId ||
        charge.currency !== "sgd" ||
        charge.amount !== t.amountCents
      )
        fail("充值退款信息不匹配");
      const refunds = payment.refundsForCharge
        ? await payment.refundsForCharge(charge.id)
        : charge.refunds?.data;
      if (!Array.isArray(refunds)) fail("退款明细暂未取得", 503);
      for (const refund of refunds) await applyRefundRecord(t.id, refund);
    },
    async refundTopup(input) {
      if (
        !validId(input.requestId) ||
        !validId(input.topupId) ||
        !Number.isSafeInteger(input.amountCents) ||
        input.amountCents <= 0 ||
        typeof input.reason !== "string" ||
        !input.reason.trim() ||
        input.reason.length > 200
      )
        fail("请填写退款金额和原因", 400);
      let s = await change((s) => {
        const old = s.refunds[input.requestId];
        if (old) {
          if (
            old.topupId !== input.topupId ||
            old.amountCents !== input.amountCents ||
            old.reason !== input.reason
          )
            fail("退款请求内容不一致");
          return false;
        }
        const t = s.topups[input.topupId];
        if (!t || t.status !== "paid" || !t.paymentIntentId)
          fail("找不到已付款的充值");
        if (
          Object.values(s.refunds).some(
            (r) => r.topupId === t.id && r.status === "reserved",
          )
        )
          fail("此充值有待确认的退款，请先核实");
        if (t.refundedCents + input.amountCents > t.amountCents)
          fail("超过此笔充值可退金额");
        const b = buckets(s, t.memberId),
          bonusReclaimCents =
            Math.floor(
              ((t.bonusCents || 0) * (t.refundedCents + input.amountCents)) /
                t.amountCents,
            ) - (t.bonusReclaimedCents || 0);
        if (
          b.principalCents < input.amountCents ||
          b.bonusCents < bonusReclaimCents
        )
          fail("可用本金或待收回赠金不足，请先核实已消费金额");
        s.refunds[input.requestId] = {
          id: input.requestId,
          topupId: t.id,
          memberId: t.memberId,
          amountCents: input.amountCents,
          baseRefundCents: t.refundedCents,
          bonusReclaimCents,
          reason: input.reason,
          status: "reserved",
          at: now().toISOString(),
        };
      });
      let r = s.refunds[input.requestId];
      if (r.status === "succeeded") {
        await reconcile(r.topupId);
        return { refunded: true };
      }
      if (r.status === "failed") fail("此笔退款已失败，请重新发起");
      const t = s.topups[r.topupId],
        out = await payment.refund({
          id: r.id,
          paymentIntentId: t.paymentIntentId,
          amountCents: r.amountCents,
          topupId: t.id,
        });
      if (out.status === "succeeded") {
        await applyRefundRecord(t.id, out);
        return { refunded: true };
      }
      if (["failed", "canceled"].includes(out.status)) {
        await change((s) => {
          if (s.refunds[r.id].status === "reserved")
            s.refunds[r.id].status = "failed";
        });
        fail("原路退款失败，余额预占已释放");
      }
      return { refunded: false, pending: true };
    },
    async refundUpdated(refund) {
      const s = await read(),
        t = Object.values(s.topups).find(
          (t) =>
            t.paymentIntentId && t.paymentIntentId === refund.payment_intent,
        );
      if (!t) return;
      await applyRefundRecord(t.id, refund);
    },

    async check(order) {
      payment.ensureReady();
      if (!order.memberId) fail("请先登录后使用余额", 401);
      return allocation(await read(), order);
    },
    async reserve(order) {
      if (order.paymentMethod !== "wallet") return;
      await change((s) => {
        const old = s.holds[order.id];
        if (old) {
          if (old.status === "released") fail("此余额付款已取消");
          if (old.fingerprint !== fingerprint(order))
            fail("余额预占与订单不一致");
          return false;
        }
        if (available(s, order.memberId) < cents(order))
          fail("余额不足，请充值或选择其他支付方式");
        const split = order.walletAllocation || {
            principalCents: cents(order),
            bonusCents: 0,
            bonusEarnsPoints: false,
          },
          b = buckets(s, order.memberId);
        if (
          !Number.isSafeInteger(split.principalCents) ||
          !Number.isSafeInteger(split.bonusCents) ||
          split.principalCents < 0 ||
          split.bonusCents < 0 ||
          split.principalCents + split.bonusCents !== cents(order) ||
          b.principalCents < split.principalCents ||
          b.bonusCents < split.bonusCents
        )
          fail("余额组成已变化，请取消本次付款后重新确认");
        s.holds[order.id] = {
          ...split,
          memberId: order.memberId,
          amountCents: cents(order),
          status: "reserved",
          fingerprint: fingerprint(order),
          expiresAt: new Date(Date.parse(order.at) + 30 * 60000).toISOString(),
          refundedCents: 0,
        };
      });
    },
    async settle(order, status) {
      if (order.paymentMethod !== "wallet") return;
      await change((s) => {
        let h = s.holds[order.id];
        if (!h) {
          if (status === "expired") {
            s.holds[order.id] = {
              memberId: order.memberId,
              status: "released",
              amountCents: 0,
            };
            return;
          }
          fail("余额预占缺失，请联系门店");
        }
        if (h.status === "consumed") return false;
        if (h.status === "released") {
          if (status === "paid") fail("已取消的余额付款收到确认");
          return false;
        }
        if (h.fingerprint !== fingerprint(order)) fail("余额订单内容不一致");
        h.status = status === "paid" ? "consumed" : "released";
        if (status === "paid")
          log(
            s,
            h.memberId,
            "spend",
            -h.amountCents,
            order.id,
            "余额支付餐费",
            -(h.bonusCents || 0),
          );
      });
    },
    async refundOrder(order, cumulative) {
      await change((s) => {
        const h = s.holds[order.id];
        if (!h || h.status !== "consumed") fail("余额付款尚未完成");
        if (
          !Number.isSafeInteger(cumulative) ||
          cumulative < 0 ||
          cumulative > h.amountCents
        )
          fail("余额退款金额无效", 400);
        if (cumulative <= h.refundedCents) return false;
        const bonusRefund =
          Math.floor((cumulative * (h.bonusCents || 0)) / h.amountCents) || 0;
        log(
          s,
          h.memberId,
          "order-refund",
          cumulative - h.refundedCents,
          order.id,
          "餐费退回本金与赠金",
          bonusRefund - (h.refundedBonusCents || 0),
        );
        h.refundedBonusCents = bonusRefund;
        h.refundedCents = cumulative;
      });
    },
    async expiredReservations() {
      const s = await read();
      return Object.entries(s.holds)
        .filter(
          ([, h]) =>
            h.status === "reserved" &&
            Date.parse(h.expiresAt) <= now().getTime(),
        )
        .map(([id]) => id);
    },
  };
}
