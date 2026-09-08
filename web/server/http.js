import { RequestError, parseBody } from "./order-core.js";
import { StorageUnavailableError } from "./order-store.js";
import { StaffAuthError } from "./staff-auth.js";

export const bodyOf = req => parseBody(req.body);

export function json(res, status, value) {
  res.setHeader("cache-control", "no-store");
  return res.status(status).json(value);
}

export function method(res, allowed) {
  res.setHeader("allow", allowed);
  return json(res, 405, { error: "Method not allowed" });
}

export function fail(res, error) {
  const expected = error instanceof RequestError || error instanceof StorageUnavailableError || error instanceof StaffAuthError || (error.status >= 400 && error.status < 500);
  if (!expected) console.error(error);
  return json(res, error.status || 500, { error: expected ? error.message : "服务暂时不可用，请稍后重试", ...(error.code === 'PAYMENT_PENDING' ? { code: error.code } : {}), ...(error.code === "NOTE_CONFLICT" ? { code: error.code, cart: error.cart } : {}) });
}
