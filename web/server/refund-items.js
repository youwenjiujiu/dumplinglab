import { RequestError } from './order-core.js';
const cents = n => Math.round(Number(n || 0) * 100);
const entries = o => [...Object.values(o.cardRefunds || {}), ...Object.values(o.refundRequests || {})].filter(r => r.status !== 'failed');
const signature = x => JSON.stringify(x || null);
// Allocate the immutable paid total in cents. The final unit absorbs rounding.
// Historical section discounts have no section snapshot, so keep amount refunds available.
export function refundItems(o) {
  const records = entries(o), known = records.reduce((s, r) => s + r.amountCents, 0);
  let unavailable = '';
  if (o.discountRule?.sections) unavailable = '此单含分类优惠，请核对金额退款';
  if (records.some(r => !r.items) || (o.refundedCents || 0) > known) unavailable = '此单已有按金额退款，请继续按金额退款';
  const units = [];
  let reward = o.loyalty?.discountCents || 0;
  (o.items || []).forEach((i, line) => {
    for (let n = 0; n < i.qty; n++) {
      let weight = cents(i.price);
      if (reward && i.id === o.loyalty.dishId && (i.style || null) === (o.loyalty.style || null)) {
        const off = Math.min(weight, reward); weight -= off; reward -= off;
      }
      units.push({line, weight});
    }
  });
  const sum = units.reduce((s, u) => s + u.weight, 0), total = cents(o.total);
  let running = 0, allocated = 0;
  const rows = (o.items || []).map((i, line) => ({line, name:i.name, style:i.style || null, qty:i.qty, used:0, unitCents:[]}));
  for (const u of units) { running += u.weight; const next = sum ? Math.round(total * running / sum) : 0; rows[u.line].unitCents.push(next - allocated); allocated = next; }
  for (const r of records) for (const i of r.items || []) if (rows[i.line]) rows[i.line].used += i.qty;
  return {unavailable, rows};
}
export function validateRefundItems(o, input, old) {
  if (old) { if (signature(old.items) !== signature(input.items)) throw new RequestError('退款菜品请求不一致',409); return old.items ? {items:old.items} : {}; }
  if (input.items === undefined) return {};
  const plan = refundItems(o);
  if (plan.unavailable) throw new RequestError(plan.unavailable,409);
  if (!Array.isArray(input.items) || !input.items.length) throw new RequestError('请选择退款菜品');
  let amount = 0; const seen = new Set();
  for (const i of input.items) {
    const row = plan.rows[i.line];
    if (!Number.isSafeInteger(i.line) || !row || seen.has(i.line) || !Number.isSafeInteger(i.qty) || i.qty < 1 || i.qty > row.qty - row.used) throw new RequestError('菜品已退款或可退份数不足，请刷新订单',409);
    seen.add(i.line); amount += row.unitCents.slice(row.used, row.used + i.qty).reduce((s,c)=>s+c,0);
  }
  if (amount <= 0 || amount !== input.amountCents) throw new RequestError('退款金额已变化，请刷新并重新选择菜品',409);
  return {items:input.items.map(i=>({line:i.line,qty:i.qty}))};
}
