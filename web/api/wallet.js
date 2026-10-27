import { memberService } from "../server/member-production.js";
import { walletService, walletEnabled } from "../server/wallet-production.js";
import { onlineService } from "../server/online-production.js";
import { requireStaff } from "../server/staff-auth.js";
import { RequestError } from "../server/order-core.js";
import { bodyOf, fail, json, method, sameOrigin} from "../server/http.js";
export default async function handler(req, res) {
  try {
    if (req.method === "GET" && req.query?.admin === "1") {
      requireStaff(req);
      return json(res, 200, {
        ok: true,
        ...(await walletService.admin()),
        orders: await onlineService.localPayments(),
      });
    }
    if (!["GET", "POST"].includes(req.method)) return method(res, "GET, POST");
    const input = req.method === "POST" ? bodyOf(req) : {};
    if (["refund-topup", "refund-order", "settings"].includes(input.action)) {
      requireStaff(req);
      const out =
        input.action === "settings"
          ? await walletService.saveSettings(input)
          : input.action === "refund-topup"
            ? await walletService.refundTopup(input)
            : await onlineService.refundLocal(input);
      return json(res, 200, { ok: true, result: out });
    }
    const auth = memberService();
    if (req.method === "GET" && (!walletEnabled() || !auth.configured))
      return json(res, 200, { ok: true, enabled: false });
    const member = await auth.identity(req.headers);
    if (!member) throw new RequestError("请先登录", 401);
    if (req.method === "GET") {
      await onlineService.expireFreeRewards(member.id, { includeRewards: false });
      return json(res, 200, {
        ok: true,
        enabled: true,
        ...(req.query?.id
          ? { topup: await walletService.topup(req.query.id, member.id) }
          : await walletService.view(member.id)),
      });
    }
    if (
      !sameOrigin(
        req.headers,
        process.env.DL_MEMBER_ORIGIN || process.env.DL_ORDER_ORIGIN,
      )
    )
      throw new RequestError("请从本网站操作", 403);
    if (input.action === "topup")
      return json(res, 200, {
        ok: true,
        topup: await walletService.createTopup(input, member.id),
      });
    if (input.action === "cancel-topup")
      return json(res, 200, {
        ok: true,
        ...(await walletService.cancelTopup(input.id, member.id)),
      });
    throw new RequestError("操作无效");
  } catch (e) {
    return fail(res, e);
  }
}
