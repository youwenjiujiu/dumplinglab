import { onlineService, verifyStripeWebhook } from '../server/online-production.js';
import { RequestError } from '../server/order-core.js';
// Web-standard handler preserves raw bytes on Vercel; no JSON body helper runs.
export default { async fetch(req) {
  const json = (status, body) => Response.json(body, {status,headers:{'cache-control':'no-store'}});
  if (req.method !== 'POST') return new Response(null,{status:405,headers:{allow:'POST'}});
  try {
    const chunks = []; let size = 0;
    for await (const chunk of req.body || []) { size += chunk.length; if (size > 262144) throw new RequestError('Request too large', 413); chunks.push(Buffer.from(chunk)); }
    const event = verifyStripeWebhook(Buffer.concat(chunks), req.headers.get('stripe-signature'));
    if (['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.expired'].includes(event.type)) await onlineService.paymentEvent(event.data.object);
    return json(200, { ok: true });
  } catch (error) { return json(error.status || 500,{ok:false,error:error.status ? error.message : '付款通知处理失败，请重试'}); }
} };
