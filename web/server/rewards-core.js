import { APOLOGY_DAY, apologyEligible, apologyId, apologyReward } from './apology-core.js';
import { createHash } from "node:crypto";
import { RequestError } from "./order-core.js";
import { waitForStorageRetry } from './storage-conflict.js';
const initial = () => ({
  schema: 1,
  revision: 0,
  configRevision: 0,
  pointsPerDollar: 1,
  rewards: {},
  accounts: {},
  holds: {},
  vouchers: {},
  audit: [],
});
const SOURCES = ["cancan", "tiger"];
const key = (v) =>
  typeof v === "string" &&
  /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/.test(v) &&
  !["constructor", "prototype"].includes(v);
const fail = (s, status = 409) => {
  throw new RequestError(s, status);
};
const account = (s, id) => (s.accounts[id] ||= { points: 0, transactions: [] });
const held = (s, id) =>
  Object.values(s.holds)
    .filter((h) => h.memberId === id && h.status === "reserved")
    .reduce((n, h) => n + h.pointsCost, 0);
const available = (s, id) =>
  Math.max(0, (s.accounts[id]?.points || 0) - held(s, id));
const fingerprint = (o) =>
  createHash("sha256")
    .update(
      JSON.stringify([
        o.memberId,
        o.items.map((i) => [i.id, i.style || null, i.qty, i.price]),
        o.loyalty,
      ]),
    )
    .digest("hex");
export function createRewardsService(storage, { now = () => new Date() } = {}) {
  async function read() {
    return (await storage.read())?.value || initial();
  }
  async function change(fn) {
    for (let i = 0; i < 16; i++) {
      const current = await storage.read(),
        s = structuredClone(current?.value || initial());
      if (fn(s) === false) return s;
      s.revision++;
      try {
        await storage.write(s, current?.etag);
        return s;
      } catch (e) {
        if (!storage.isConflict(e)) throw e;
        await waitForStorageRetry(i);
      }
    }
    fail("会员账户正在更新，请重试");
  }
  function entry(s, id, type, points, orderId, description) {
    const a = account(s, id);
    a.points += points;
    a.transactions.unshift({
      id: `${orderId}:${type}:${a.transactions.length}`,
      at: now().toISOString(),
      type,
      points,
      balance: a.points,
      orderId,
      description,
    });
  }
  function audit(s, action, details) {
    s.audit.unshift({ at: now().toISOString(), action, details });
    s.audit = s.audit.slice(0, 500);
  }
  function benefit(s, memberId, order, selection) {
    if (!memberId) {
      if (selection) fail("请先登录后使用积分或兑换券", 401);
      return null;
    }
    if (!key(memberId)) fail("会员身份无效", 401);
    let reward = null,
      pointsCost = 0,
      title = "",
      voucherId = null,
      rewardId = null;
    if (selection) {
      if (
        !selection ||
        typeof selection !== "object" ||
        !["points", "voucher"].includes(selection.type) ||
        !key(selection.id)
      )
        fail("兑换选择无效", 400);
      if (selection.type === "points") {
        reward = s.rewards[selection.id];
        if (!reward?.active) fail("此积分奖励已下架，请重新选择");
        pointsCost = reward.points;
        rewardId = selection.id;
        if (available(s, memberId) < pointsCost) fail("可用积分不足");
        title = reward.title;
      } else {
        const v = s.vouchers[selection.id];
        if (!v || v.memberId !== memberId) fail("找不到此兑换券", 404);
        if (
          v.status !== "available" ||
          Date.parse(v.expiresAt) <= now().getTime()
        )
          fail("兑换券已使用、正在使用或已过期");
        reward = v;
        voucherId = selection.id;
        title = v.title;
      }
    }
    const item = reward
      ? order.items.find(
          (i) =>
            i.id === reward.dishId &&
            (i.style || null) === (reward.style || null),
        )
      : null;
    if (reward && !item) fail("请先把兑换菜品加入本单");
    const gross = globalThis.OrderPricing.cents(
        order.items.reduce((n, i) => n + i.price * i.qty, 0),
      ),
      discount = item ? globalThis.OrderPricing.cents(item.price) : 0;
    const net = Math.max(0, gross - discount);
    const eligible =
      order.walletAllocation && !order.walletAllocation.bonusEarnsPoints
        ? Math.floor(
            (net * order.walletAllocation.principalCents) /
              Math.max(1, globalThis.OrderPricing.cents(order.total)),
          )
        : net;
    return {
      ...(order.walletAllocation ? { eligibleSpendCents: eligible } : {}),
      selection: selection || null,
      rewardId,
      voucherId,
      title,
      pointsCost,
      // Which line the reward pays for, so checkout can show it as the gift.
      dishId: item?.id || null,
      style: item?.style || null,
      discountCents: discount,
      grossFoodCents: gross,
      pointsPerDollar: s.pointsPerDollar,
      expectedPoints: Math.floor((eligible * s.pointsPerDollar) / 100),
    };
  }
  return {
    async expiredFreeReservations(memberId = null) {
      const s = await read();
      return Object.entries(s.holds)
        .filter(
          ([, h]) =>
            (!memberId || h.memberId === memberId) &&
            h.status === "reserved" &&
            h.freeExpiresAt &&
            Date.parse(h.freeExpiresAt) <= now().getTime(),
        )
        .map(([id]) => id);
    },
    async view(memberId, catalog = []) {
      const s = await read();
      return {
        pointsPerDollar: s.pointsPerDollar,
        rewards: Object.entries(s.rewards)
          .filter(([, r]) => r.active)
          .map(([id, r]) => ({
            ...r,
            id,
            available: catalog.some(
              (d) =>
                d.id === r.dishId &&
                d.active !== false &&
                !d.soldOut &&
                (d.variants
                  ? Object.hasOwn(d.variants, r.style || "")
                  : !r.style),
            ),
          })),
        ...(memberId
          ? {
              points: s.accounts[memberId]?.points || 0,
              availablePoints: available(s, memberId),
              reservedPoints: held(s, memberId),
              transactions: (s.accounts[memberId]?.transactions || []).slice(
                0,
                100,
              ),
              vouchers: Object.values(s.vouchers)
                .filter((v) => v.memberId === memberId)
                .map(({ memberId, ...v }) => ({
                  ...v,
                  status:
                    v.status === "available" &&
                    Date.parse(v.expiresAt) <= now().getTime()
                      ? "expired"
                      : v.status,
                })),
            }
          : {}),
      };
    },
    async admin() {
      const s = await read();
      return {
        revision: s.configRevision || 0,
        pointsPerDollar: s.pointsPerDollar,
        rewards: s.rewards,
        memberCount: Object.keys(s.accounts).length,
        totalPoints: Object.values(s.accounts).reduce(
          (n, a) => n + a.points,
          0,
        ),
        audit: s.audit,
      };
    },
    async apologyStatus(memberId=null,orders=null){
      const s=await read();
      const recipients=new Map();
      const eligible=orders?orders.filter(apologyEligible):[];
      for(const o of eligible){
        if(!key(o.memberId))continue;
        if(!recipients.has(o.memberId))recipients.set(o.memberId,{memberId:o.memberId,issued:Boolean(s.vouchers[apologyId(o.memberId)]),orders:[]});
        recipients.get(o.memberId).orders.push({no:o.no,table:o.table,at:o.paidAt||o.at,total:o.total});
      }
      return {day:APOLOGY_DAY,...(orders?{recipients:[...recipients.values()],unlinkedOrders:eligible.filter(o=>!key(o.memberId)).length}:{}),requests:Object.values(s.apologyRequests||{}).filter(r=>!memberId||r.memberId===memberId),issued:Object.values(s.vouchers).filter(v=>v.source==='apology').length};
    },
    async requestApology(memberId,orderNo,orders){
      if(!key(memberId))fail('请先登录',401);
      if(typeof orderNo!=='string'||!/^\d{4,8}$/.test(orderNo.trim()))fail('请输入付款订单号',400);
      const matches=orders.filter(o=>apologyEligible(o)&&String(o.no)===orderNo.trim()&&!o.memberId);
      if(matches.length!==1)fail('无法自动匹配这笔订单，请联系店员核对',409);
      const order=matches[0],id=apologyId(memberId);
      await change(s=>{
        if(s.vouchers[id])return false;
        s.apologyRequests||={};
        if(s.apologyRequests[id]?.status==='approved')return false;
        s.apologyRequests[id]={id,memberId,orderId:order.id,orderNo:order.no,status:'pending',at:now().toISOString()};
      });
      return {requestId:id};
    },
    async grantApology(input,catalog,orders){
      const reward=apologyReward(input,catalog),eligible=orders.filter(apologyEligible),issued=[];
      await change(s=>{
        issued.length=0;
        s.apologyOrders||={};
        let recipients;
        if(input.requestId){
          const request=s.apologyRequests?.[input.requestId];
          if(!request)fail('找不到补发申请',404);
          const order=eligible.find(o=>o.id===request.orderId&&!o.memberId);
          if(!order)fail('原订单不符合补发条件');
          const owner=s.apologyOrders[order.id];
          if(owner&&owner!==request.memberId)fail('这笔匿名订单已补发，请勿重复发券');
          recipients=[{memberId:request.memberId,orderId:order.id}];
        }else recipients=eligible.filter(o=>key(o.memberId)).map(o=>({memberId:o.memberId,orderId:o.id}));
        for(const r of recipients){
          const id=apologyId(r.memberId);
          if(!s.vouchers[id]){
            s.vouchers[id]={id,...reward,memberId:r.memberId,source:'apology',status:'available',issuedAt:now().toISOString(),expiresAt:new Date(now().getTime()+30*86400000).toISOString(),sourceOrderId:r.orderId};
            account(s,r.memberId);issued.push(id);
            audit(s,'apology-grant',{orderId:r.orderId,voucherId:id});
          }
          if(input.requestId){s.apologyOrders[r.orderId]=r.memberId;s.apologyRequests[input.requestId].status='approved';}
        }
      });
      return {issued:issued.length};
    },
    async save(input, catalog) {
      if (!Number.isInteger(input.revision)) fail("请刷新积分设置");
      if (
        !Number.isInteger(input.pointsPerDollar) ||
        input.pointsPerDollar < 1 ||
        input.pointsPerDollar > 100
      )
        fail("每元积分须为 1–100 的整数", 400);
      if (!Array.isArray(input.rewards) || input.rewards.length > 100)
        fail("兑换商品列表无效", 400);
      const rewards = {};
      for (const r of input.rewards) {
        const d = catalog.find((d) => d.id === r.dishId);
        if (
          !d ||
          (d.variants
            ? !Object.hasOwn(d.variants, r.style || "")
            : Boolean(r.style)) ||
          !Number.isInteger(r.points) ||
          r.points < 1 ||
          r.points > 100000 ||
          typeof r.active !== "boolean" ||
          rewards[r.dishId]
        )
          fail("请选择有效菜品规格，积分须为 1–100000 且菜品不能重复", 400);
        rewards[r.dishId] = {
          dishId: d.id,
          style: r.style || null,
          title: d.cn,
          points: r.points,
          active: r.active,
        };
      }
      await change((s) => {
        if ((s.configRevision || 0) !== input.revision)
          fail("设置已更新，请刷新");
        s.configRevision = (s.configRevision || 0) + 1;
        s.pointsPerDollar = input.pointsPerDollar;
        s.rewards = rewards;
        audit(s, "settings", {
          pointsPerDollar: s.pointsPerDollar,
          rewards: Object.keys(rewards),
        });
      });
      return this.admin();
    },
    async syncTopup(t) {
      if (
        !key(t.id) ||
        !key(t.memberId) ||
        !Number.isSafeInteger(t.bonusPoints) ||
        t.bonusPoints < 0 ||
        !Number.isSafeInteger(t.amountCents) ||
        t.amountCents <= 0 ||
        !Number.isSafeInteger(t.refundedCents) ||
        t.refundedCents < 0 ||
        t.refundedCents > t.amountCents
      )
        fail("充值积分资料无效", 400);
      await change((s) => {
        s.topupAwards ||= {};
        let old = s.topupAwards[t.id];
        const existed = Boolean(old);
        if (
          old &&
          (old.memberId !== t.memberId ||
            old.points !== t.bonusPoints ||
            old.amountCents !== t.amountCents)
        )
          fail("充值积分记录不一致");
        if (!old) {
          old = s.topupAwards[t.id] = {
            memberId: t.memberId,
            points: t.bonusPoints,
            amountCents: t.amountCents,
            refundedCents: 0,
            reversed: 0,
          };
          if (t.bonusPoints)
            entry(
              s,
              t.memberId,
              "topup-award",
              t.bonusPoints,
              t.id,
              "充值赠送积分",
            );
        }
        if (t.refundedCents <= old.refundedCents)
          return existed ? false : undefined;
        const reversed = Math.floor(
          (t.bonusPoints * t.refundedCents) / t.amountCents,
        );
        if (reversed > old.reversed)
          entry(
            s,
            t.memberId,
            "topup-award-refund",
            old.reversed - reversed,
            t.id,
            "充值退款收回赠送积分",
          );
        old.refundedCents = t.refundedCents;
        old.reversed = reversed;
      });
    },
    async quote(memberId, order, selection) {
      return benefit(await read(), memberId, order, selection);
    },
    async reserve(order) {
      if (!order.memberId) return;
      await change((s) => {
        const old = s.holds[order.id];
        if (old) {
          if (old.status === "released") fail("本单已取消，请重新点餐");
          if (old.fingerprint !== fingerprint(order))
            fail("积分预占与订单不一致");
          return false;
        }
        const current = benefit(
          s,
          order.memberId,
          order,
          order.loyalty?.selection,
        );
        if (JSON.stringify(current) !== JSON.stringify(order.loyalty))
          fail("积分规则或兑换内容已更新，请重新确认");
        account(s, order.memberId);
        s.holds[order.id] = {
          memberId: order.memberId,
          fingerprint: fingerprint(order),
          ...current,
          status: "reserved",
          at: now().toISOString(),
          refundCents: 0,
          earnedPoints: 0,
          ...(order.total === 0
            ? {
                freeExpiresAt: new Date(
                  Date.parse(order.at) + 30 * 60000,
                ).toISOString(),
              }
            : {}),
        };
        if (current.voucherId)
          s.vouchers[current.voucherId].status = "reserved";
      });
    },
    async settle(order, status) {
      if (!order.memberId || !["paid", "expired"].includes(status)) return;
      const s = await change((s) => {
        let h = s.holds[order.id];
        if (!h) {
          if (status === "paid") fail("积分预占缺失，请联系店员核对");
          s.holds[order.id] = {
            memberId: order.memberId,
            status: "released",
            pointsCost: 0,
          };
          return;
        }
        if (h.status === "consumed") return false;
        if (h.status === "released") {
          if (status === "paid") fail("已取消的兑换收到付款，请联系店员核对");
          return false;
        }
        if (h.fingerprint !== fingerprint(order)) fail("积分订单内容不一致");
        if (status === "expired") {
          h.status = "released";
          if (h.voucherId) s.vouchers[h.voucherId].status = "available";
          return;
        }
        h.status = "consumed";
        h.earnedPoints = h.expectedPoints;
        if (h.pointsCost)
          entry(s, h.memberId, "redeem", -h.pointsCost, order.id, h.title);
        if (h.earnedPoints)
          entry(
            s,
            h.memberId,
            "earn",
            h.earnedPoints,
            order.id,
            "消费获得积分",
          );
        if (h.voucherId) {
          s.vouchers[h.voucherId].status = "used";
          s.vouchers[h.voucherId].usedOrderId = order.id;
        }
        audit(s, "settled", {
          orderId: order.id,
          pointsSpent: h.pointsCost,
          earned: h.earnedPoints,
        });
      });
      return { earnedPoints: s.holds[order.id]?.earnedPoints || 0 };
    },
    async refund(order, cumulativeCents) {
      if (!order.memberId) return;
      await change((s) => {
        const h = s.holds[order.id];
        if (!h || h.status !== "consumed") fail("请先完成订单积分入账");
        const total = globalThis.OrderPricing.cents(order.total);
        if (
          !Number.isInteger(cumulativeCents) ||
          cumulativeCents < 0 ||
          cumulativeCents > total
        )
          fail("退款金额不正确", 400);
        if (
          cumulativeCents <= h.refundCents &&
          !(total === 0 && !h.redemptionReturned)
        )
          return false;
        const earned = Math.floor(
            (Math.max(0, total - cumulativeCents) *
              (h.eligibleSpendCents === undefined
                ? 1
                : h.eligibleSpendCents / Math.max(1, total)) *
              h.pointsPerDollar) /
              100,
          ),
          clawback = h.earnedPoints - earned;
        if (clawback > 0)
          entry(
            s,
            h.memberId,
            "refund-earn",
            -clawback,
            order.id,
            "退款扣回消费积分",
          );
        h.earnedPoints = earned;
        h.refundCents = cumulativeCents;
        if (cumulativeCents === total && !h.redemptionReturned) {
          h.redemptionReturned = true;
          if (h.pointsCost)
            entry(
              s,
              h.memberId,
              "refund-redeem",
              h.pointsCost,
              order.id,
              "全额退款退回兑换积分",
            );
          if (h.voucherId) {
            const v = s.vouchers[h.voucherId];
            if (v.usedOrderId === order.id) {
              v.status = "available";
              delete v.usedOrderId;
            }
          }
        }
        audit(s, "refund", { orderId: order.id, cumulativeCents });
      });
    },
    /* Campaign issuers need to know what they have already handed out. These
       read the same voucher table the account panel shows, so there is no
       second ledger to keep in step. */
    async findVoucher(id) {
      return (await read()).vouchers[id] || null;
    },
    async listVouchers(source) {
      return Object.values((await read()).vouchers).filter((v) => v.source === source);
    },
    async countVouchers(source) {
      return (await this.listVouchers(source)).length;
    },
    async importVoucher(input, catalog) {
      if (
        !key(input.id) ||
        !key(input.memberId) ||
        typeof input.title !== "string" ||
        !input.title.trim() ||
        input.title.length > 120 ||
        /[<>]/.test(input.title) ||
        !Number.isFinite(Date.parse(input.expiresAt))
      )
        fail("兑换券资料无效", 400);
      const d = catalog.find((d) => d.id === input.dishId);
      if (!d || d.variants || !["sides", "drinks", "gifts"].includes(d.section))
        fail("兑换券菜品须为配菜、饮品或赠品", 400);
      const v = {
        id: input.id,
        memberId: input.memberId,
        dishId: d.id,
        style: null,
        title: input.title,
        expiresAt: new Date(input.expiresAt).toISOString(),
        // CanCan is not the only issuer any more: the Tiger campaign hands out
        // its own vouchers, and the account panel labels them by source.
        source: SOURCES.includes(input.source) ? input.source : "cancan",
      };
      await change((s) => {
        if (s.vouchers[v.id]) {
          const old = s.vouchers[v.id];
          if (Object.keys(v).some((k) => old[k] !== v[k]))
            fail("同一兑换编号内容不一致");
          return false;
        }
        if (Date.parse(v.expiresAt) <= now().getTime())
          fail("兑换券已过期", 400);
        s.vouchers[v.id] = { ...v, status: "available" };
        account(s, v.memberId);
        audit(s, "voucher-import", { id: v.id, dishId: v.dishId });
      });
      return { ok: true, id: v.id };
    },
  };
}
