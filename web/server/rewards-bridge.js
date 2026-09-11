import { createHmac, timingSafeEqual } from "node:crypto";
import { RequestError } from "./order-core.js";
export function verifyRewardGrant(
  raw,
  timestamp,
  signature,
  secret,
  now = Date.now(),
) {
  if (!secret || secret.length < 32)
    throw new RequestError("兑换券接入未配置", 503);
  if (
    !/^\d{10}$/.test(timestamp || "") ||
    Math.abs(now / 1000 - Number(timestamp)) > 300 ||
    !/^[a-f0-9]{64}$/.test(signature || "")
  )
    throw new RequestError("兑换券签名无效", 401);
  const digest = createHmac("sha256", secret)
    .update(timestamp + ".")
    .update(raw)
    .digest();
  if (!timingSafeEqual(digest, Buffer.from(signature, "hex")))
    throw new RequestError("兑换券签名无效", 401);
  let input;
  try {
    input = JSON.parse(raw.toString("utf8"));
  } catch {
    throw new RequestError("兑换券资料无效", 400);
  }
  if (
    input.issuer !== "cancan" ||
    input.audience !== "dumplinglab" ||
    input.version !== 1
  )
    throw new RequestError("兑换券来源不匹配", 400);
  return input;
}
