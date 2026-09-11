import { onlineService, verifyStripeWebhook } from '../server/online-production.js';
import {walletService} from '../server/wallet-production.js';
import { RequestError } from '../server/order-core.js';
// Web-standard handler preserves raw bytes on Vercel; no JSON body helper runs.
export default { async fetch(req) {
  const json = (status, body) => Response.json(body, {status,headers:{'cache-control':'no-store'}});
  if (req.method !== 'POST') return new Response(null,{status:405,headers:{allow:'POST'}});
  try {
    const chunks = []; let size = 0;
    for await (const chunk of req.body || []) { size += chunk.length; if (size > 262144) throw new RequestError('Request too large', 413); chunks.push(Buffer.from(chunk)); }
    const event = verifyStripeWebhook(Buffer.concat(chunks), req.headers.get('stripe-signature'));
    if (['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed', 'checkout.session.expired','charge.refunded','refund.updated','refund.created','refund.failed'].includes(event.type)) {
      const session = event.data?.object;
      // Account-level endpoints also receive other projects' events. Verify the
      // signature first, then ignore foreign sessions without touching storage.
      if(event.type.startsWith('refund.')&&session?.metadata?.app!=='dumplinglab'){const key=process.env.STRIPE_SECRET_KEY||'';if(!/^(?:sk|rk)_(?:live|test)_/.test(key)||event.livemode!==/^(?:sk|rk)_live_/.test(key))return json(200,{ok:true,ignored:true});await walletService.refundUpdated(session);return json(200,{ok:true});}
      if (session?.metadata?.app !== 'dumplinglab') return json(200, { ok: true, ignored: true });
      const key = process.env.STRIPE_SECRET_KEY || '';
      const live = /^(?:sk|rk)_live_/.test(key), test = /^(?:sk|rk)_test_/.test(key);
      if ((!live && !test) || event.livemode !== live) throw new RequestError('付款环境不匹配', 400);
      if(event.type.startsWith('refund.'))await walletService.refundUpdated(session);
      else if(session.metadata.wallet_topup_id){if(event.type==='charge.refunded')await walletService.refundEvent(session);else await walletService.paymentEvent(event.type==='checkout.session.async_payment_failed'?{...session,status:'expired'}:session);}
      else if(event.type==='charge.refunded')await onlineService.refundEvent(session);
      else await onlineService.paymentEvent(event.type === 'checkout.session.async_payment_failed' ? { ...session, status: 'expired' } : session);
    }
    return json(200, { ok: true });
  } catch (error) { return json(error.status || 500,{ok:false,error:error.status ? error.message : '付款通知处理失败，请重试'}); }
} };
