import { verifyRewardGrant } from "../server/rewards-bridge.js";
import { rewardsService } from "../server/rewards-production.js";
import { catalogService } from "../server/catalog-production.js";
export default {
  async fetch(req) {
    const json = (status, body) =>
      Response.json(body, { status, headers: { "cache-control": "no-store" } });
    if (req.method !== "POST")
      return json(405, { error: "Method not allowed" });
    try {
      let size = 0;
      const chunks = [];
      for await (const c of req.body || []) {
        size += c.length;
        if (size > 8192) return json(413, { error: "Request too large" });
        chunks.push(Buffer.from(c));
      }
      const input = verifyRewardGrant(
        Buffer.concat(chunks),
        req.headers.get("x-cancan-timestamp"),
        req.headers.get("x-cancan-signature"),
        process.env.CANCAN_REWARDS_BRIDGE_SECRET,
      );
      return json(
        200,
        await rewardsService.importVoucher(input, await catalogService.menu()),
      );
    } catch (e) {
      return json(e.status || 500, {
        error: e.status ? e.message : "兑换券同步失败，请重试",
      });
    }
  },
};
