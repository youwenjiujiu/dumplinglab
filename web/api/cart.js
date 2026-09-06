import { tableStore } from "../server/table-production.js";
import { bodyOf, fail, json, method } from "../server/http.js";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") return json(res, 200, { ok: true, cart: await tableStore.cart(req.query.table, req.query.group, typeof req.query.version === "string" ? req.query.version : "") });
    if (req.method === "POST") return json(res, 200, { ok: true, cart: await tableStore.mutate(bodyOf(req)) });
    return method(res, "GET, POST");
  } catch (error) { return fail(res, error); }
}
