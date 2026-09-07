import { tableStore } from "../server/table-production.js";
import { fail, json, method } from "../server/http.js";
import { requireStaff } from "../server/staff-auth.js";
import { onlineService } from "../server/online-production.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return method(res, "GET");
  try {
    requireStaff(req);
    const [feed, online] = await Promise.all([tableStore.feed(), onlineService.feed()]);
    return json(res, 200, { ...feed, events: [...feed.events, ...online], activeIds: [...feed.activeIds, ...online.map(o => o.id)] });
  } catch (error) { return fail(res, error); }
}
