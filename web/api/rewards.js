import { onlineService } from "../server/online-production.js";
import { memberService } from "../server/member-production.js";
import { rewardsService } from "../server/rewards-production.js";
import { catalogService } from "../server/catalog-production.js";
import { requireStaff } from "../server/staff-auth.js";
import { bodyOf, fail, json, method } from "../server/http.js";
export default async function handler(req, res) {
  try {
    if (req.method === "GET" && req.query?.admin === "1") {
      requireStaff(req);
      return json(res, 200, { ok: true, ...(await rewardsService.admin()) });
    }
    if (req.method === "POST") {
      requireStaff(req);
      return json(res, 200, {
        ok: true,
        ...(await rewardsService.save(
          bodyOf(req),
          await catalogService.menu(),
        )),
      });
    }
    if (req.method !== "GET") return method(res, "GET, POST");
    const auth = memberService();
    if (!auth.configured) return json(res, 200, { ok: true, enabled: false });
    const member = await auth.identity(req.headers);
    if (member) await onlineService.expireFreeRewards(member.id, { includeWallet: false });
    return json(res, 200, {
      ok: true,
      enabled: true,
      member,
      ...(await rewardsService.view(member?.id, await catalogService.menu())),
    });
  } catch (e) {
    return fail(res, e);
  }
}
