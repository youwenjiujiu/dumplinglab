import { tableStore } from "../server/table-production.js";
import { bodyOf, fail, json, method } from "../server/http.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return method(res, "POST");
  try {
    const call = await tableStore.call(bodyOf(req));
    return json(res, 200, { ok: true, call });
  } catch (error) { return fail(res, error); }
}
