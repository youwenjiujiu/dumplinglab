import { tableStore } from "../server/table-production.js";
import { bodyOf, fail, json, method } from "../server/http.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return method(res, "POST");
  try {
    return json(res, 200, { ok: true, ...await tableStore.order(bodyOf(req)) });
  } catch (error) { return fail(res, error); }
}
