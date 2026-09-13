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

/* The site answers on several Vercel aliases. A POST is same-origin — and so
   safe from CSRF — when its Origin matches the host the page was served from,
   not only the canonical origin used for OAuth redirects. */
export function sameOrigin(headers, canonical) {
  const sent = headers.origin;
  if (!sent) return false;
  if (canonical && sent === canonical) return true;
  const host = String(headers["x-forwarded-host"] || headers.host || "").split(",")[0].trim();
  if (!host) return false;
  const scheme = String(headers["x-forwarded-proto"] || "https").split(",")[0].trim();
  return sent === `${scheme}://${host}`;
}
