// Sales summary for the back office: revenue and best-selling dishes over a
// date range. Reads the paid order snapshots only; never recalculates prices.
import { RequestError } from './order-core.js';

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const SG = 8 * 3600000; // Business days follow Singapore time.
export const sgDate = iso => new Date(Date.parse(iso) + SG).toISOString().slice(0, 10);
const cents = n => Math.round(Number(n || 0) * 100);
const ORDER_LIST_LIMIT = 1000;

export function cleanRange(query, now = new Date()) {
  const today = sgDate(now.toISOString());
  const from = query?.from || today, to = query?.to || from;
  if (!DAY.test(from) || !DAY.test(to) || from > to) throw new RequestError('请选择有效的日期范围');
  if ((Date.parse(to) - Date.parse(from)) / 86400000 > 366) throw new RequestError('一次最多查看一年');
  return { from, to };
}

export function summarizeOrders(orders, query, now = new Date()) {
  const range = cleanRange(query, now);
  const paid = orders.filter(o => o?.type === 'order' && o.status === 'paid' && !o.freeRewardRefunded)
    .filter(o => { const day = sgDate(o.paidAt || o.at); return day >= range.from && day <= range.to; });
  const totals = { orders: 0, grossCents: 0, refundCents: 0, foodCents: 0, discountCents: 0, serviceCents: 0, items: 0 };
  const byMode = {}, byDay = {}, dishes = {};
  for (const o of paid) {
    const gross = cents(o.total), refund = Math.min(gross, o.refundedCents || 0), day = sgDate(o.paidAt || o.at);
    totals.orders++; totals.grossCents += gross; totals.refundCents += refund;
    totals.foodCents += cents(o.foodTotal ?? o.subtotal); totals.discountCents += cents(o.discount) + (o.loyalty?.discountCents || 0);
    totals.serviceCents += cents(o.serviceCharge);
    const mode = byMode[o.mode] ||= { orders: 0, netCents: 0 };
    mode.orders++; mode.netCents += gross - refund;
    const d = byDay[day] ||= { date: day, orders: 0, netCents: 0 };
    d.orders++; d.netCents += gross - refund;
    for (const i of o.items || []) {
      const key = i.id;
      const row = dishes[key] ||= { id: i.id, name: i.name, englishName: i.englishName || '', qty: 0, salesCents: 0, styles: {} };
      row.qty += i.qty; row.salesCents += cents(i.price) * i.qty; totals.items += i.qty;
      if (i.style) row.styles[i.style] = (row.styles[i.style] || 0) + i.qty;
    }
  }
  const netCents = totals.grossCents - totals.refundCents;
  const days = [];
  for (let t = Date.parse(range.from); t <= Date.parse(range.to); t += 86400000) {
    const date = new Date(t).toISOString().slice(0, 10);
    days.push(byDay[date] || { date, orders: 0, netCents: 0 });
  }
  // Every order with what it contained, newest first, so staff can look one up.
  const orderList = paid.slice().sort((a, b) => Date.parse(b.paidAt || b.at) - Date.parse(a.paidAt || a.at)).slice(0, ORDER_LIST_LIMIT).map(o => ({
    id: o.id, no: o.no || null, mode: o.mode, table: o.table || null, group: o.group || null, pickupNumber: o.pickup?.number || null,
    at: o.paidAt || o.at, note: o.note || null, paymentMethod: o.paymentMethod || 'card',
    canRefund: o.paymentMethod === 'counter' || (o.paymentMethod !== 'wallet' && Boolean(o.paymentIntentId)),
    ...(o.counterMethod ? { counterMethod: o.counterMethod } : {}),
    totalCents: cents(o.total), refundCents: Math.min(cents(o.total), o.refundedCents || 0), discountCents: cents(o.discount) + (o.loyalty?.discountCents || 0),
    items: (o.items || []).map(i => ({ name: i.name, style: i.style || null, qty: i.qty, priceCents: cents(i.price), ...(i.promo ? { promo: i.promo } : {}), ...(i.note ? { note: i.note } : {}) })),
  }));
  return {
    range, orders: orderList, ordersTruncated: paid.length > ORDER_LIST_LIMIT,
    totals: { ...totals, netCents, averageCents: totals.orders ? Math.round(netCents / totals.orders) : 0 },
    byMode, byDay: days,
    dishes: Object.values(dishes).map(d => ({ ...d, styles: Object.entries(d.styles).sort((a, b) => b[1] - a[1]).map(([style, qty]) => ({ style, qty })) }))
      .sort((a, b) => b.qty - a.qty || b.salesCents - a.salesCents),
  };
}
