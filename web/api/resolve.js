import { tableStore } from "../server/table-production.js";
import { RequestError } from "../server/order-core.js";
import { bodyOf, fail, json, method } from "../server/http.js";
import { requireStaff } from "../server/staff-auth.js";
import { onlineService } from "../server/online-production.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return method(res, "POST");
  try {
    requireStaff(req);
    const { id } = bodyOf(req);
    if (typeof id !== "string" || !/^[a-f0-9-]{16,64}$/i.test(id)) throw new RequestError("事件编号无效");
    if (!await onlineService.resolve(id)) await tableStore.resolve(id);
    return json(res, 200, { ok: true });
  } catch (error) { return fail(res, error); }
}
