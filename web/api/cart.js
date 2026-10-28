import { onlineService } from '../server/online-production.js';
import { tableStore } from "../server/table-production.js";
import { bodyOf, fail, json, method } from "../server/http.js";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const args = [req.query.table, req.query.group, typeof req.query.version === "string" ? req.query.version : "", req.query.tableSession || null];
      let cart = await tableStore.cart(...args);
      if (cart.paymentPending && Date.now()-Date.parse(cart.paymentStartedAt)>=15*60000) {
        await onlineService.recoverTablePayment(req.query.table,req.query.group);
        cart = await tableStore.cart(args[0],args[1],"",args[3]);
      }
      return json(res,200,{ok:true,cart});
    }
    if (req.method === "POST") return json(res, 200, { ok: true, cart: await tableStore.mutate(bodyOf(req)) });
    return method(res, "GET, POST");
  } catch (error) { return fail(res, error); }
}
