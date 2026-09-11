import { RequestError } from "./order-core.js";
export const paymentReady = () =>
  Boolean(
    process.env.DL_PAYMENTS_ENABLED === "true" &&
      process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_PUBLISHABLE_KEY &&
      process.env.STRIPE_WEBHOOK_SECRET &&
      /^https:\/\//.test(process.env.DL_ORDER_ORIGIN || "") &&
      process.env.DL_GST_REGISTERED === "true",
  );
export async function stripeRequest(
  route,
  { params, key, method = "POST" } = {},
) {
  const response = await fetch(`https://api.stripe.com/v1/${route}`, {
    method,
    headers: {
      authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "content-type": "application/x-www-form-urlencoded",
      ...(key ? { "idempotency-key": key } : {}),
      "Stripe-Version": "2026-08-26.dahlia",
    },
    ...(params ? { body: params } : {}),
    signal: AbortSignal.timeout(15000),
  });
  const out = await response.json();
  if (!response.ok) throw new RequestError("付款服务暂时不可用，请重试", 503);
  return out;
}
