import { tableStore } from "../server/table-production.js";
import { fail, json, method } from "../server/http.js";
import { requireStaff } from "../server/staff-auth.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return method(res, "GET");
  try {
    requireStaff(req);
    return json(res, 200, await tableStore.feed());
  } catch (error) { return fail(res, error); }
}
