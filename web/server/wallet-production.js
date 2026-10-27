import { get, put } from "@vercel/blob";
import { isStorageConflict } from './storage-conflict.js';
import { rewardsService } from "./rewards-production.js";
import { createWalletService } from "./wallet-core.js";
import { ensureStorage } from "./order-store.js";
import { RequestError } from "./order-core.js";
import { paymentReady, stripeRequest } from "./stripe-client.js";
const path = "dumplinglab-wallet/v1/state.json";
export const walletEnabled = () =>
  process.env.DL_WALLET_ENABLED === "true" && paymentReady();
const payment = {
  ensureReady() {
    if (!walletEnabled())
      throw new RequestError("余额服务暂不可用，请选择其他支付方式", 503);
  },
  async createTopup(t) {
    const root = new URL(process.env.DL_ORDER_ORIGIN).origin,
      metadata = {
        "metadata[app]": "dumplinglab",
        "metadata[wallet_topup_id]": t.id,
        "payment_intent_data[metadata][app]": "dumplinglab",
        "payment_intent_data[metadata][wallet_topup_id]": t.id,
      };
    return stripeRequest("checkout/sessions", {
      key: `dl-topup-${t.id}`,
      params: new URLSearchParams({
        mode: "payment",
        ...metadata,
        client_reference_id: t.id,
        success_url: `${root}/?wallet_topup=${t.id}`,
        cancel_url: `${root}/?wallet_topup=${t.id}&wallet_cancel=1`,
        expires_at: String(Math.floor(Date.parse(t.at) / 1000) + 3600),
        "payment_method_types[0]": "card",
        "payment_method_types[1]": "paynow",
        "line_items[0][quantity]": "1",
        "line_items[0][price_data][currency]": "sgd",
        "line_items[0][price_data][unit_amount]": String(t.amountCents),
        "line_items[0][price_data][product_data][name]":
          "Dumpling Lab 余额充值",
        "line_items[0][price_data][product_data][description]": `本金 S$${(t.amountCents / 100).toFixed(2)}，赠金 S$${((t.bonusCents || 0) / 100).toFixed(2)}，赠送 ${t.bonusPoints || 0} 积分`,
      }),
    });
  },
  expire: (id) =>
    stripeRequest(`checkout/sessions/${id}/expire`, {
      key: `dl-topup-expire-${id}`,
      params: new URLSearchParams(),
    }),
  refund: (r) =>
    stripeRequest("refunds", {
      key: `dl-wallet-refund-${r.id}`,
      params: new URLSearchParams({
        payment_intent: r.paymentIntentId,
        amount: String(r.amountCents),
        "metadata[app]": "dumplinglab",
        "metadata[wallet_topup_id]": r.topupId,
        "metadata[wallet_refund_id]": r.id,
      }),
    }),
  async refundsForCharge(id) {
    if (!/^ch_[A-Za-z0-9_]+$/.test(id || ""))
      throw new RequestError("退款支付编号无效");
    const items = [];
    let after;
    do {
      const q = new URLSearchParams({
          charge: id,
          limit: "100",
          ...(after ? { starting_after: after } : {}),
        }),
        page = await stripeRequest("refunds?" + q, { method: "GET" });
      items.push(...page.data);
      after = page.has_more ? page.data.at(-1)?.id : null;
    } while (after);
    return items;
  },
};
export const walletService = createWalletService(
  {
    async read() {
      ensureStorage();
      const r = await get(path, {
        access: "private",
        useCache: false,
        headers: { "accept-encoding": "identity" },
      });
      if (!r) return null;
      if (r.statusCode !== 200 || !r.stream)
        throw new Error("Wallet storage unavailable");
      return { value: await new Response(r.stream).json(), etag: r.blob.etag };
    },
    async write(value, etag) {
      ensureStorage();
      await put(path, JSON.stringify(value), {
        access: "private",
        addRandomSuffix: false,
        contentType: "application/json",
        cacheControlMaxAge: 60,
        ...(etag
          ? { allowOverwrite: true, ifMatch: etag }
          : { allowOverwrite: false }),
      });
    },
    isConflict: isStorageConflict,
  },
  payment,
  { rewards: rewardsService },
);
