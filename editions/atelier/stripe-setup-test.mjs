import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { onlineConfig, onlineService, stripeCheckoutParams } from '../../web/server/online-production.js';
import {catalogService} from '../../web/server/catalog-production.js';
import {DEFAULT_PICKUP_HOURS} from '../../web/server/pickup-hours.js';
const originalHours=catalogService.pickupHours;catalogService.pickupHours=async()=>structuredClone(DEFAULT_PICKUP_HOURS);
import webhook from '../../web/api/payment-webhook.js';

// Local fake credentials only. No Stripe, Vercel or durable-storage calls.
const previous = { ...process.env };
const originalFetch = globalThis.fetch;
const originalPaymentEvent = onlineService.paymentEvent;
globalThis.fetch = () => { throw new Error('Network forbidden in setup tests'); };
try {
  Object.assign(process.env, {
    STRIPE_SECRET_KEY: 'sk_live_local_fixture', STRIPE_WEBHOOK_SECRET: 'whsec_local_fixture',
    STRIPE_PUBLISHABLE_KEY: 'pk_live_local_fixture',
    DL_ORDER_ORIGIN: 'https://restaurant.example', DL_GST_REGISTERED: 'true',
    DL_PICKUP_LOCATIONS: JSON.stringify([{ id: 'test', name: 'Test', address: 'Test address' }]),
    GOOGLE_MAPS_API_KEY: 'local_fixture', DL_DELIVERY_ORIGIN_POSTAL: '123456',
  });
  for (const flag of [undefined, 'false', 'TRUE', '1']) {
    if (flag === undefined) delete process.env.DL_PAYMENTS_ENABLED;
    else process.env.DL_PAYMENTS_ENABLED = flag;
    assert.equal((await onlineConfig()).takeawayEnabled, false);
    assert.equal((await onlineConfig()).deliveryEnabled, false);
  }
  process.env.DL_PAYMENTS_ENABLED = 'true';
  assert.equal((await onlineConfig()).takeawayEnabled, true);
  assert.equal((await onlineConfig()).deliveryEnabled, false, 'Delivery stays unavailable even with credentials');
  delete process.env.STRIPE_WEBHOOK_SECRET;
  assert.equal((await onlineConfig()).takeawayEnabled, false);
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_local_fixture';
  process.env.DL_PAYMENTS_ENABLED = 'false';

  const params = stripeCheckoutParams({ id: 'test-order', no: 'TEST', at: new Date().toISOString(), total: 10.9, subtotal: 10, gst: .9, deliveryFee: 0 });
  assert.equal(params.get('metadata[app]'), 'dumplinglab');
  assert.equal(params.get('payment_intent_data[metadata][app]'), 'dumplinglab');
  assert.equal(params.get('metadata[dumpling_order_id]'), 'test-order');
  assert.equal(params.get('payment_intent_data[metadata][dumpling_order_id]'), 'test-order');
  assert.equal(params.has('metadata[orderId]'), false, 'Never trigger comedy ticket fulfillment');
  assert.equal(params.has('metadata[order_id]'), false, 'Never trigger the legacy restaurant webhook');
  assert.equal(params.has('payment_intent_data[metadata][order_id]'), false);
  assert.equal(params.get('line_items[0][price_data][unit_amount]'), '1090');
  assert.equal(params.get('line_items[0][price_data][currency]'), 'sgd');
  assert.equal(params.has('automatic_tax[enabled]'), false, 'Do not add tax to inclusive total again');
  assert.equal(new URL(params.get('return_url')).origin, 'https://restaurant.example');
  assert.equal(params.get('ui_mode'), 'elements');
  assert.equal(params.has('success_url'), false);
  assert.equal(params.has('cancel_url'), false);
  assert.deepEqual([0,1].map(i => params.get(`payment_method_types[${i}]`)), ['card','paynow']);
  assert.equal(params.has('payment_method_types[2]'), false);
  assert.equal(params.has('allowed_payment_method_types[0]'), false);
  let handled = 0;
  onlineService.paymentEvent = async () => { handled++; };
  async function send(event, validSignature = true) {
    const raw = JSON.stringify(event), time = Math.floor(Date.now() / 1000);
    const sig = createHmac('sha256', validSignature ? 'whsec_local_fixture' : 'wrong_fixture').update(`${time}.${raw}`).digest('hex');
    return webhook.fetch(new Request('https://restaurant.example/api/payment-webhook', {
      method: 'POST', headers: { 'stripe-signature': `t=${time},v1=${sig}` }, body: raw,
    }));
  }
  for (const type of ['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.expired']) {
    const foreign = { type, livemode: true, data: { object: { metadata: { orderId: 'comedy-order' } } } };
    assert.equal((await send(foreign)).status, 200);
    assert.equal(handled, 0);
    assert.equal((await send(foreign, false)).status, 400, 'Foreign events still require valid signature');
  }
  const own = { type: 'checkout.session.completed', livemode: true, data: { object: { metadata: { app: 'dumplinglab', dumpling_order_id: 'test-order' } } } };
  assert.equal((await send({ ...own, livemode: false })).status, 400);
  assert.equal(handled, 0);
  assert.equal((await send(own)).status, 200);
  assert.equal(handled, 1, 'Pausing new checkout must not discard already-paid callbacks');
  process.env.STRIPE_SECRET_KEY = 'sk_test_local_fixture';
  assert.equal((await send(own)).status, 400);
  assert.equal((await send({ ...own, livemode: false })).status, 200);
  delete process.env.STRIPE_SECRET_KEY;
  assert.equal((await send(own)).status, 400);
  assert.equal(handled, 2);
  assert.equal((await webhook.fetch(new Request('https://restaurant.example/api/payment-webhook'))).status, 405);
  console.log('PASS: explicit checkout gate, app-scoped metadata, inclusive SGD total, signed foreign-event isolation, live/test isolation, paused-payment callback recovery. No external calls.');
} finally {
  catalogService.pickupHours=originalHours;
  globalThis.fetch = originalFetch;
  onlineService.paymentEvent = originalPaymentEvent;
  for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key];
  Object.assign(process.env, previous);
}
