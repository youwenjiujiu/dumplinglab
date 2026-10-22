import { get, put, list, BlobPreconditionFailedError } from '@vercel/blob';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { RequestError } from './order-core.js';
import { ensureStorage } from './order-store.js';
import { createOnlineService, bookingDates, SLOTS, validId } from './online-core.js';
import { tableStore } from './table-production.js';
import {catalogService} from './catalog-production.js';
import {walletService} from './wallet-production.js';
import {rewardsService} from './rewards-production.js';

const PREFIX = 'dumplinglab-online/v1/';
const path = id => { if (!validId(id)) throw new RequestError('订单编号无效'); return `${PREFIX}${id}.json`; };
const storage = {
  async read(id) {
    ensureStorage();
    const result = await get(path(id), { access: 'private', useCache: false, headers: { 'accept-encoding': 'identity' } });
    if (!result) return null;
    if (result.statusCode !== 200 || !result.stream) throw new Error('Online order storage read failed');
    return { value: await new Response(result.stream).json(), etag: result.blob.etag };
  },
  async write(id, value, etag) {
    ensureStorage();
    await put(path(id), JSON.stringify(value), { access: 'private', addRandomSuffix: false,
      contentType: 'application/json', cacheControlMaxAge: 60,
      ...(etag ? { allowOverwrite: true, ifMatch: etag } : { allowOverwrite: false }) });
  },
  isConflict: e => e instanceof BlobPreconditionFailedError || /already exists/i.test(e.message || ''),
  async all() {
    ensureStorage(); const orders = []; let cursor;
    do {
      const page = await list({ prefix: PREFIX, cursor, limit: 1000 });
      orders.push(...(await Promise.all(page.blobs.map(b => storage.read(b.pathname.slice(PREFIX.length, -5))))).filter(Boolean).map(r => r.value));
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    return orders;
  },
};
function settings() {
  let locations = [];
  try { locations = JSON.parse(process.env.DL_PICKUP_LOCATIONS || '[]'); } catch { /* fail closed */ }
  if (!Array.isArray(locations)) locations = [];
  locations = locations.filter(l => l && typeof l.id === 'string' && typeof l.name === 'string' && typeof l.address === 'string');
  return { locations, origin:process.env.DL_ORDER_ORIGIN };
}
// Credentials alone must never open checkout before the restaurant is ready.
const ready = () => Boolean(process.env.DL_PAYMENTS_ENABLED === 'true' && process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY && process.env.STRIPE_WEBHOOK_SECRET &&
  /^https:\/\//.test(process.env.DL_ORDER_ORIGIN || '') && process.env.DL_GST_REGISTERED === 'true');
export function onlineConfig() {
  return { ...settings(), dates: bookingDates(), slots: SLOTS, preview: false,
    dineinEnabled: ready(), publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
    takeawayEnabled: ready() && settings().locations.length > 0,
    deliveryEnabled: false,
    deliveryMinimum: 100, deliveryRate: 0.09, serviceRate: 0.1, radiusKm: 10 };
}
async function stripePost(route, params, idempotencyKey) {
  const response = await fetch(`https://api.stripe.com/v1/${route}`, {
    method: 'POST', headers: { authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, 'content-type': 'application/x-www-form-urlencoded', 'idempotency-key': idempotencyKey, 'Stripe-Version': '2026-08-26.dahlia' },
    body: params, signal: AbortSignal.timeout(15000),
  });
  const out = await response.json();
  if (!response.ok) throw new RequestError('付款服务暂时不可用，请重试', 503);
  return out;
}
export function stripeCheckoutParams(order) {
    const origin = new URL(process.env.DL_ORDER_ORIGIN).origin;
    const returnUrl = new URL(origin);
    returnUrl.searchParams.set('online_order', order.id);
    if (order.mode === 'dinein') { returnUrl.searchParams.set('table', order.table); returnUrl.searchParams.set('group', order.group); }
    return new URLSearchParams({ mode: 'payment', ui_mode: 'elements', 'metadata[dumpling_order_id]': order.id,
      'metadata[app]': 'dumplinglab',
      'payment_intent_data[metadata][app]': 'dumplinglab',
      'payment_intent_data[metadata][dumpling_order_id]': order.id,
      client_reference_id: order.id, return_url: returnUrl.href,
      // Stripe needs at least 30 minutes; we void the link at 15 (PAYMENT_WINDOW_MS).
      // 46 minutes keeps any link created inside our window above Stripe's minimum.
      expires_at: String(Math.floor(Date.parse(order.at) / 1000) + 46 * 60),
      // Match comedy's enabled methods without changing shared account settings.
      // Apple Pay is a card wallet, not a separate API payment-method type.
      'payment_method_types[0]': 'card', 'payment_method_types[1]': 'paynow',
      'line_items[0][quantity]': '1', 'line_items[0][price_data][currency]': 'sgd',
      'line_items[0][price_data][unit_amount]': String(globalThis.OrderPricing.cents(order.total)),
      'line_items[0][price_data][product_data][name]': `Dumpling Lab ${order.no}`,
      'line_items[0][price_data][product_data][description]': order.mode === 'dinein' ? `Food $${order.subtotal.toFixed(2)} · Service charge 10% $${(order.serviceCharge || 0).toFixed(2)}` : `Food $${order.subtotal.toFixed(2)} · Delivery $${order.deliveryFee.toFixed(2)}`,
    });
}
const payment = {
  ensureReady() { if (!ready()) throw new RequestError('线上付款尚未开放，请联系门店', 503); },
  async create(order) {
    const params = stripeCheckoutParams(order);
    return stripePost('checkout/sessions', params, `dl-online-${order.id}`);
  },
  async expire(id) {
    if (!/^cs_[A-Za-z0-9_]+$/.test(id || '')) throw new RequestError('付款编号无效');
    return stripePost(`checkout/sessions/${id}/expire`, new URLSearchParams(), `dl-expire-${id}`);
  },
  // Read-only: used when a link already expired on Stripe's side.
  async retrieve(id) {
    if (!/^cs_[A-Za-z0-9_]+$/.test(id || '')) throw new RequestError('付款编号无效');
    const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${id}`, { headers: { authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, 'Stripe-Version': '2026-08-26.dahlia' }, signal: AbortSignal.timeout(15000) });
    const out = await response.json();
    if (!response.ok) throw new RequestError('付款服务暂时不可用，请重试', 503);
    return out;
  },
};
async function geocode(postal) {
  const params = new URLSearchParams({ components: `postal_code:${postal}|country:SG`, key: process.env.GOOGLE_MAPS_API_KEY });
  const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`, { signal: AbortSignal.timeout(8000) });
  const out = await response.json();
  const result = out.results?.find(r => r.address_components?.some(c => c.types.includes('postal_code') && c.long_name === postal));
  if (!response.ok || out.status !== 'OK' || !result) throw new RequestError('未找到该邮编，请检查地址', 400);
  return result;
}
async function checkAddress(postal) {
  if (!process.env.GOOGLE_MAPS_API_KEY || !/^\d{6}$/.test(process.env.DL_DELIVERY_ORIGIN_POSTAL || '')) throw new RequestError('配送地址核验尚未开放', 503);
  const [origin, target] = await Promise.all([geocode(process.env.DL_DELIVERY_ORIGIN_POSTAL), geocode(postal)]);
  const a = origin.geometry.location, b = target.geometry.location, rad = n => n * Math.PI / 180;
  const h = Math.sin(rad(b.lat-a.lat)/2)**2 + Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(rad(b.lng-a.lng)/2)**2;
  return { distanceKm: 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h))), address: target.formatted_address };
}
export const onlineService = createOnlineService({ storage, payment, checkAddress, config: settings(), dining: tableStore, inventory:catalogService, rewards:rewardsService, wallet:walletService });
export function verifyStripeWebhook(raw, signature, secret = process.env.STRIPE_WEBHOOK_SECRET, now = Date.now()) {
  if (!secret) throw new RequestError('付款回调尚未配置', 503);
  const parts = String(signature || '').split(',').map(p => p.split('='));
  const timestamp = parts.find(p => p[0] === 't')?.[1];
  if (!/^\d+$/.test(timestamp || '') || Math.abs(now/1000 - Number(timestamp)) > 300) throw new RequestError('付款签名已过期', 400);
  const expected = createHmac('sha256', secret).update(`${timestamp}.`).update(raw).digest();
  if (!parts.some(([key, value]) => key === 'v1' && /^[a-f0-9]{64}$/i.test(value || '') && timingSafeEqual(expected, Buffer.from(value, 'hex')))) throw new RequestError('付款签名无效', 400);
  try { return JSON.parse(raw.toString('utf8')); } catch { throw new RequestError('付款通知无效'); }
}
