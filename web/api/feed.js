import { tableStore } from "../server/table-production.js";
import { fail, json, method } from "../server/http.js";
import { requireStaff } from "../server/staff-auth.js";
import { onlineService } from "../server/online-production.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return method(res, "GET");
  try {
    requireStaff(req);
    const [feed, online] = await Promise.all([tableStore.feed(), onlineService.feed(req.query?.refunds==='1')]);
    const onlineEvents=Array.isArray(online)?online:online.events;
    const diningOrders = new URL(req.url, 'https://local').searchParams.get('workbench') === '1' ? await onlineService.workbenchOrders() : undefined;
    return json(res, 200, { ...feed, ...(!Array.isArray(online)?{refundPrintJobs:online.refundPrintJobs}:{}), ...(diningOrders ? {diningOrders} : {}), events: [...feed.events, ...onlineEvents], activeIds: [...feed.activeIds, ...onlineEvents.map(o => o.id)] });
  } catch (error) { return fail(res, error); }
}
