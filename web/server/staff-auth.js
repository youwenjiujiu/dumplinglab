import { timingSafeEqual } from "node:crypto";

export class StaffAuthError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}
export function requireStaff(req, secret = process.env.DL_STAFF_PASSWORD) {
  if (!secret) throw new StaffAuthError("线上店员端密码尚未配置", 503);
  const [scheme, encoded] = String(req.headers.authorization || "").split(" ");
  let given = "";
  if (scheme === "Basic" && encoded) {
    try { given = Buffer.from(encoded, "base64").toString("utf8").split(":").slice(1).join(":"); }
    catch { given = ""; }
  }
  const actualBuffer = Buffer.from(secret), givenBuffer = Buffer.from(given);
  if (actualBuffer.length !== givenBuffer.length || !timingSafeEqual(actualBuffer, givenBuffer)) {
    throw new StaffAuthError("需要正确的店员密码", 401);
  }
}
