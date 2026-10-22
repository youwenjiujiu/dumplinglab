/* The Tiger campaign voucher: 任意消费送 5 颗水饺, dine-in only, valid through
   2027-02-28.

   All 2,000 printed slips carry the same QR (https://dumplinglab.sg), so the
   paper cannot identify itself and the link cannot be kept private. The account
   is what makes a claim unique instead: one voucher per member, granted into
   the loyalty wallet the guest already uses to order. Signing in is therefore
   the gate, the storage and the recall channel at once — no separate code to
   read out, no second identity to keep, and nothing a guest can lose.

   It also takes staff out of the loop. Guests order from their own phone at the
   table, so the voucher appears under 优惠券 at checkout and the five dumplings
   join the order without anyone at the counter typing a code, mis-typing one,
   or needing a way to undo it. */
import { RequestError } from "./order-core.js";

const fail = (message, status = 409) => {
  throw new RequestError(message, status);
};

export const SOURCE = "tiger";
// One voucher per member, and the id says so: re-claiming is a no-op rather
// than a second voucher. Member ids are uuids, which rewards-core's `key()`
// accepts unchanged.
export const voucherIdFor = (memberId) => `${SOURCE}-${memberId}`;

export function createVoucherService({ rewards, catalog, tally }, options = {}) {
  const {
    now = () => new Date(),
    // The print run. Claiming stops here so we never promise more than Tiger
    // handed out.
    cap = Number(options.cap) > 0 ? Number(options.cap) : 2000,
    // Campaign window. Unset means claimable as soon as this ships, which is
    // what a preview wants; production sets these from the Tiger event date.
    opensAt = null,
    closesAt = null,
    // Printed on the slip: 有效期至 2027年2月28日（含当日）, Singapore time.
    expiresAt = "2027-02-28",
    // The menu item the voucher pays for. Dumplings themselves carry flavours
    // and portion prices, so the gift has to be its own fixed item — which is
    // also why the kitchen must settle on one filling before this goes live.
    dishId = process.env.DL_VOUCHER_DISH || "lunch-v2-pickled-radish",
    title = "饺子券 · 5 颗水饺",
  } = options;

  const expiryIso = new Date(`${expiresAt}T23:59:59+08:00`).toISOString();
  const expiryEnd = Date.parse(expiryIso);

  const windowState = (at) =>
    opensAt && at < Date.parse(opensAt) ? "early"
    : closesAt && at > Date.parse(closesAt) ? "closed"
    : "open";

  const issued = async () => (await rewards.countVouchers(SOURCE)) ?? 0;

  const service = {
    /* What the landing page needs before anyone signs in. */
    async status(memberId = null) {
      const at = now().getTime();
      const count = await issued();
      return {
        window: windowState(at),
        expiresAt,
        expired: at > expiryEnd,
        remaining: Math.max(0, cap - count),
        soldOut: count >= cap,
        held: memberId ? await service.held(memberId) : null,
      };
    },

    async held(memberId) {
      if (!memberId) return null;
      const v = await rewards.findVoucher(voucherIdFor(memberId));
      return v ? { id: v.id, title: v.title, status: v.status, expiresAt: v.expiresAt } : null;
    },

    /* Idempotent: a guest who scans again, or opens the link on a second
       device, lands on the voucher they already hold. */
    async claim(memberId) {
      if (!memberId) fail("请先登录", 401);
      const at = now();
      if (at.getTime() > expiryEnd) fail("优惠券已过期", 410);
      const state = windowState(at.getTime());
      if (state === "early") fail("活动尚未开始", 409);
      if (state === "closed") fail("领取已结束", 410);

      const already = await service.held(memberId);
      if (already) return { voucher: already, fresh: false, expiresAt };
      if ((await issued()) >= cap) fail("本次活动的优惠券已全部领完", 409);

      await rewards.importVoucher(
        { id: voucherIdFor(memberId), memberId, dishId, title, expiresAt: expiryIso, source: SOURCE },
        await catalog.menu(),
      );
      return { voucher: await service.held(memberId), fresh: true, expiresAt };
    },

    /* Paper still crosses the counter, and the printed terms say the two share
       one redemption. Nothing links a particular slip to a particular account,
       so this is a tally, not a control: it tells the shop how far through the
       print run the campaign is, counted beside the vouchers the ordering flow
       has already spent. */
    async redeemPaper({ by = null } = {}) {
      return { paperCount: await tally.bump({ at: now().toISOString(), by }) };
    },

    async admin() {
      const vouchers = await rewards.listVouchers(SOURCE);
      const used = vouchers.filter((v) => v.status === "used").length;
      const paper = await tally.count();
      return {
        cap, dishId, title, expiresAt,
        window: windowState(now().getTime()),
        issued: vouchers.length,
        remaining: Math.max(0, cap - vouchers.length),
        digitalRedeemed: used,
        paperRedeemed: paper,
        totalRedeemed: used + paper,
        vouchers: vouchers.map((v) => ({
          id: v.id, memberId: v.memberId, status: v.status, expiresAt: v.expiresAt,
        })),
      };
    },
  };
  return service;
}
