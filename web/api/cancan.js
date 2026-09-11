import { memberService } from "../server/member-production.js";
import { cancanService } from "../server/cancan-production.js";
import { RequestError } from "../server/order-core.js";
import { fail, json, method } from "../server/http.js";
export default async function handler(req, res) {
  try {
    if (req.method !== "GET") return method(res, "GET");
    if (req.method === "GET" && !cancanService.enabled)
      return json(res, 200, { ok: true, enabled: false });
    const session = await memberService().session(req.headers);
    if (!session) throw new RequestError("请先登录", 401);
    return json(res, 200, {
      ok: true,
      ...(await cancanService.sync(session)),
    });
  } catch (e) {
    return fail(res, e);
  }
}
