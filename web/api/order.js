import { fail, method } from "../server/http.js";
import { RequestError } from "../server/order-core.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return method(res, "POST");
  try {
    // Old clients must not bypass the paid checkout by posting here directly.
    throw new RequestError('请先完成付款；付款成功后自动下单。', 402);
  } catch (error) { return fail(res, error); }
}
