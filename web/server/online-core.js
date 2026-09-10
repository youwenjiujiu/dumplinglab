import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import QRCode from 'qrcode';
import { cleanItems, cleanOrder, RequestError } from './order-core.js';
import { cleanCartOpIds } from './cart-core.js';
import { cleanNickname } from './cart-meta.js';

export const SLOTS = ['11:30-12:30', '12:30-13:30', '13:30-14:30', '17:00-18:00'];
export const validId = value => typeof value === 'string' && /^[a-f0-9-]{36}$/.test(value);
export function tokenHash(token) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw new RequestError('订单访问凭证无效', 401);
  return createHash('sha256').update(token).digest('hex');
}
export function authorize(order, token) {
  const hash = tokenHash(token);
  if (!order || typeof order.tokenHash !== 'string' || !timingSafeEqual(Buffer.from(order.tokenHash, 'hex'), Buffer.from(hash, 'hex'))) throw new RequestError('找不到该订单', 404);
}
export function bookingDates(now = new Date()) {
  const sg = new Date(now.getTime() + 8 * 3600000);
  const start = sg.getUTCHours() >= 21 ? 2 : 1;
  return Array.from({ length: 15 - start }, (_, i) => {
    const date = new Date(sg); date.setUTCDate(date.getUTCDate() + start + i);
    return date.toISOString().slice(0, 10);
  });
}
const text = (value, max, label) => {
  const out = typeof value === 'string' ? value.trim() : '';
  if (!out || out.length > max || /[\u0000-\u001f<>]/.test(out)) throw new RequestError(`请填写有效的${label}`);
  return out;
};
export function cleanOnline(input, config, now = new Date(), catalog) {
  if (!input || !['dinein', 'takeaway', 'delivery'].includes(input.mode)) throw new RequestError('请选择用餐方式');
  if (!validId(input.requestId)) throw new RequestError('订单编号无效');
  if (input.mode === 'dinein') {
    const order = cleanOrder({ ...input, no: String(parseInt(input.requestId.replace(/-/g, '').slice(0, 6), 16) % 9000 + 1000) }, catalog);
    return { ...order, table: order.table.toUpperCase(), tokenHash: tokenHash(input.token),
      cartOpIds: cleanCartOpIds(input.cartOpIds), actorName: cleanNickname(input.actorName), customer: {}, fulfilment: {} };
  }
  const items = cleanItems(input.items, catalog);
  const pricing = globalThis.OrderPricing.quote(items.reduce((sum, i) => sum + i.price * i.qty, 0), input.mode);
  const c = input.customer || {};
  const customer = {};
  const fulfilment = {};
  if (input.mode === 'delivery') {
    customer.name = text(c.name, 60, '姓名');
    customer.phone = text(c.phone, 24, '手机号码').replace(/[ ()-]/g, '');
    if (!/^(?:\+65)?[3689]\d{7}$/.test(customer.phone)) throw new RequestError('请填写新加坡联系电话');
    if (!bookingDates(now).includes(input.date) || !SLOTS.includes(input.slot)) throw new RequestError('请选择有效的预订日期和时段；次日订单前晚 21:00 截止');
    fulfilment.date = input.date; fulfilment.slot = input.slot;
    // $100 food minimum, before delivery/GST. A fee cannot qualify the food basket.
    if (pricing.subtotal < 100) throw new RequestError('配送菜品小计需满 $100（未税，不含配送费）');
    customer.postalCode = text(c.postalCode, 6, '邮编');
    if (!/^\d{6}$/.test(customer.postalCode)) throw new RequestError('请填写六位邮编');
    customer.unit = typeof c.unit === 'string' ? c.unit.trim().slice(0, 40) : '';
    customer.address = text(c.address, 180, '配送地址');
  } else {
    const location = config.locations.find(l => l.id === input.pickupLocation);
    if (!location) throw new RequestError('请选择自取门店');
    fulfilment.pickupLocation = location.id;
    fulfilment.pickupAddress = location.address;
    fulfilment.pickupName = location.name;
    fulfilment.timing = 'asap';
  }
  return { id: input.requestId, tokenHash: tokenHash(input.token), type: 'order',
    mode: input.mode, table: null, group: null, items, customer, fulfilment,
    note: typeof input.note === 'string' ? input.note.trim().slice(0, 240) : '', ...pricing };
}
export const preparationState = order => order.collectedAt || order.resolvedAt ? 'collected'
  : order.readyAt ? 'ready' : order.preparingAt ? 'preparing' : 'received';
export const publicOrder = order => {
  const { tokenHash: secret, fingerprint, requestFingerprint, sessionId, clientSecret, ...view } = order;
  return { ...view, ...(order.mode === 'takeaway' && order.status === 'paid' ? { preparationStatus: preparationState(order) } : {}) };
};
export function createOnlineService({ storage, payment, checkAddress, config, dining, inventory, now = () => new Date() }) {
  const requestFingerprint = input => createHash('sha256').update(JSON.stringify({
    mode:input.mode,items:input.items?.map(i=>[i.id,i.style||null,Number(i.qty)]),
    customer:input.customer,date:input.date,slot:input.slot,pickupLocation:input.pickupLocation||null,note:input.note||'',
    table: input.table || null, group: input.group || null, cartOpIds: input.cartOpIds || null,
  })).digest('hex');
  async function mutate(id, fn) {
    for (let n = 0; n < 8; n++) {
      const current = await storage.read(id);
      const value = await fn(current?.value);
      try { await storage.write(id, value, current?.etag); return value; }
      catch (e) { if (!storage.isConflict(e)) throw e; }
    }
    throw new RequestError('订单正在更新，请稍后重试', 409);
  }
  async function checked(input) {
    const order = cleanOnline(input, config, now(), inventory ? await inventory.menu() : undefined);
    if (order.mode === 'delivery') {
      const result = await checkAddress(order.customer.postalCode);
      if (!result || !Number.isFinite(result.distanceKm)) throw new RequestError('暂时无法核实配送地址，请稍后重试', 503);
      if (result.distanceKm > 10) throw new RequestError('此地址超出 10 km 配送范围');
      order.customer.address = result.address; // postal lookup, never trust client distance/address
      order.fulfilment.distanceKm = result.distanceKm;
    }
    return order;
  }
  async function pickupTicket(order) {
    if (order.pickup || order.mode !== 'takeaway') return order.pickup;
    const date = new Date(now().getTime() + 8 * 3600000).toISOString().slice(0, 10);
    const hash = createHash('sha256').update(`dumpling-pickup-counter:${date}`).digest('hex').slice(0,32);
    const key = `${hash.slice(0,8)}-${hash.slice(8,12)}-${hash.slice(12,16)}-${hash.slice(16,20)}-${hash.slice(20)}`;
    // CAS + per-order allocation makes duplicate/concurrent payment callbacks safe.
    const counter = await mutate(key, prior => {
      const current = prior || { type:'pickup-counter', date, next:0, numbers:{} };
      if (current.numbers[order.id]) return current;
      const next = current.next + 1;
      return { ...current, next, numbers:{...current.numbers, [order.id]:next} };
    });
    const code = randomBytes(16).toString('hex');
    const payload = `${new URL(config.origin).origin}/staff.html#pickup=${order.id}.${code}`;
    const qr = await QRCode.toDataURL(payload, { errorCorrectionLevel:'M', margin:4, width:280 });
    return { number:`A${String(counter.numbers[order.id]).padStart(3,'0')}`, date, code, qr };
  }
  function checkPickup(order, code) {
    if (!order || order.mode !== 'takeaway' || order.status !== 'paid' || !order.pickup ||
      typeof code !== 'string' || !/^[a-f0-9]{32}$/.test(code) ||
      !timingSafeEqual(Buffer.from(code,'hex'), Buffer.from(order.pickup.code,'hex'))) throw new RequestError('取餐码无效或订单尚未付款',404);
  }
  return {
    async quote(input) { return publicOrder(await checked(input)); },
    async checkout(input) {
      // Recover an existing payment before applying changing date/availability rules.
      const saved = validId(input.requestId) ? (await storage.read(input.requestId))?.value : null;
      if (saved) {
        authorize(saved, input.token);
        if (saved.requestFingerprint && saved.requestFingerprint !== requestFingerprint(input)) throw new RequestError('订单内容已更改，请先确认上一笔付款', 409);
        if (saved.status === 'paid') return { order: publicOrder(saved) };
        if (saved.status === 'expired') throw new RequestError('付款已过期，请重新确认订单', 410);
      }
      const data = saved || await checked(input);
      if (!saved && input.expectedTotal !== undefined && globalThis.OrderPricing.cents(input.expectedTotal) !== globalThis.OrderPricing.cents(data.total)) throw new RequestError('价格已更新，请重新核对订单', 422);
      payment.ensureReady();
      if (data.mode === 'dinein') {
        if (!dining) throw new RequestError('堂食付款尚未开放', 503);
        if (!saved) await dining.reservePayment(data);
      }
      const fingerprint = createHash('sha256').update(JSON.stringify(data)).digest('hex');
      let order = saved || await mutate(data.id, prior => {
        if (prior) { authorize(prior, input.token); if (prior.fingerprint !== fingerprint) throw new RequestError('订单内容已更改，请重新确认', 409); return prior; }
        return { ...data, ...(inventory?{inventoryManaged:true}:{}), fingerprint, requestFingerprint:requestFingerprint(input), at: now().toISOString(), no: data.no || `W${data.id.slice(0, 8).toUpperCase()}`, status: 'awaiting_payment' };
      });
      if(order.inventoryManaged){
        try{await inventory.reserve(order)}catch(e){
          // An order/table hold already exists. Keep the client's credentials so
          // it can cancel/retry instead of treating this as pre-creation validation.
          if([400,422].includes(e.status))throw new RequestError(e.message,409);
          throw e;
        }
        order=(await storage.read(order.id))?.value||order;
        if(order.status==='expired'){await inventory.settle(order,'expired');throw new RequestError('付款已取消，请重新确认',410)}
        if(order.status==='paid'){await inventory.settle(order,'paid');return {order:publicOrder(order)}}
      }
      if (!order.sessionId) {
        // Don't reissue an uncertain payment after Stripe's key-retention window.
        if (now().getTime()-Date.parse(order.at)>23*3600000) throw new RequestError('原付款状态需门店核实，请勿重新付款', 503);
        const session = await payment.create(order);
        order = await mutate(order.id, prior => ({ ...prior, sessionId: session.id, paymentUrl: session.url, clientSecret: session.client_secret }));
      }
      return { order: publicOrder(order), paymentUrl: order.paymentUrl, clientSecret: order.clientSecret };
    },
    async cancel(input) {
      if (!validId(input.requestId)) throw new RequestError('订单编号无效');
      const order = (await storage.read(input.requestId))?.value;
      authorize(order, input.token);
      if (order.status === 'paid') throw new RequestError('订单已付款，请查询订单状态', 409);
      if (order.status !== 'expired') {
        // Recover the exact idempotent Session if its creation response was lost.
        const session = order.sessionId ? { id: order.sessionId } : await payment.create(order);
        const expired = await payment.expire(session.id);
        if (expired.status !== 'expired' || expired.payment_status === 'paid') throw new RequestError('付款正在确认，请稍后查询', 409);
        await mutate(order.id, prior => {
          if (prior.status === 'paid') throw new RequestError('订单已付款，请查询订单状态', 409);
          return { ...prior, status: 'expired', sessionId: session.id };
        });
      }
      if (order.mode === 'dinein') await dining.releasePayment(order);
      if (order.inventoryManaged) await inventory.settle(order,'expired');
      return { cancelled: true };
    },
    async get(id, token) {
      if (!validId(id)) throw new RequestError('订单编号无效');
      const record = (await storage.read(id))?.value; authorize(record, token);
      return publicOrder(record);
    },
    async paymentEvent(session) {
      // Neither comedy's orderId nor the legacy restaurant's order_id is ours.
      const id = session.metadata?.dumpling_order_id;
      if (!validId(id)) throw new RequestError('付款订单编号无效');
      const updated = await mutate(id, async order => {
        if (!order || (order.sessionId && order.sessionId !== session.id)) throw new RequestError('付款订单不匹配', 409);
        if (session.currency !== 'sgd' || session.amount_total !== globalThis.OrderPricing.cents(order.total)) throw new RequestError('付款金额不匹配', 409);
        if (session.payment_status === 'paid') return { ...order, sessionId: session.id, status: 'paid', paidAt: order.paidAt || now().toISOString(), ...(order.mode === 'takeaway' ? {pickup:await pickupTicket(order)} : {}) };
        if (session.status === 'expired' && order.status !== 'paid') return { ...order, status: 'expired' };
        return order;
      });
      if(updated.inventoryManaged) await inventory.settle(updated,updated.status);
      if (updated.mode === 'dinein') {
        if (updated.status === 'paid') {
          await dining.finishPayment(updated);
          return mutate(id, prior => ({ ...prior, fulfilmentCommitted: true }));
        }
        if (updated.status === 'expired') await dining.releasePayment(updated);
      }
      return updated;
    },
    async feed() { return (await storage.all()).filter(o => o.mode !== 'dinein' && o.status === 'paid' && !o.resolvedAt).map(publicOrder); },
    // A pickup credential grants status-only access, not staff authority or PII.
    // It also lets receipts created before status tracking refresh safely.
    async progress(id, code) {
      if (!validId(id)) throw new RequestError('订单编号无效');
      const order = (await storage.read(id))?.value;
      checkPickup(order, code);
      return { id: order.id, preparationStatus: preparationState(order),
        preparingAt: order.preparingAt || null, readyAt: order.readyAt || null,
        collectedAt: order.collectedAt || null, resolvedAt: order.resolvedAt || null };
    },
    async advance(id, next) {
      if (!validId(id) || !['preparing', 'ready'].includes(next)) throw new RequestError('无效订单状态');
      return publicOrder(await mutate(id, order => {
        if (!order || order.type !== 'order') throw new RequestError('找不到该订单', 404);
        if (order.mode !== 'takeaway' || order.status !== 'paid') throw new RequestError('仅支持已付款自取订单', 409);
        const current = preparationState(order);
        if (current === next) return order; // Safe duplicate/retry, no new timestamp.
        if ((current === 'received' && next === 'preparing') || (current === 'preparing' && next === 'ready')) {
          return { ...order, [next === 'preparing' ? 'preparingAt' : 'readyAt']: now().toISOString() };
        }
        throw new RequestError('订单状态已更新，请刷新后操作', 409);
      }));
    },
    async pickup(id, code, collect = false) {
      if (!validId(id)) throw new RequestError('订单编号无效');
      if (!collect) { const order = (await storage.read(id))?.value; checkPickup(order,code); return publicOrder(order); }
      return publicOrder(await mutate(id, order => {
        checkPickup(order,code);
        return { ...order, collectedAt:order.collectedAt || now().toISOString(), resolvedAt:order.resolvedAt || now().toISOString() };
      }));
    },
    async resolve(id) {
      if (!validId(id)) return false;
      const record = await storage.read(id);
      if (!record || record.value.mode === 'dinein') return false;
      await mutate(id, order => {
        if (order.status !== 'paid') throw new RequestError('订单尚未付款', 409);
        return { ...order, resolvedAt: order.resolvedAt || now().toISOString(), ...(order.pickup ? {collectedAt:order.collectedAt || now().toISOString()} : {}) };
      }); return true;
    },
  };
}
