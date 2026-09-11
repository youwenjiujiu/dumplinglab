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
  const { tokenHash: secret, fingerprint, requestFingerprint, memberId, paymentIntentId, refundRequests, localRefundCents, sessionId, clientSecret, ...view } = order;
  return { ...view, ...(order.mode === 'takeaway' && order.status === 'paid' ? { preparationStatus: preparationState(order) } : {}) };
};
export function createOnlineService({ storage, payment, checkAddress, config, dining, inventory, rewards, wallet, now = () => new Date() }) {
  const requestFingerprint = input => createHash('sha256').update(JSON.stringify({
    mode:input.mode,items:input.items?.map(i=>[i.id,i.style||null,Number(i.qty)]),
    customer:input.customer,date:input.date,slot:input.slot,pickupLocation:input.pickupLocation||null,note:input.note||'',
    table: input.table || null, group: input.group || null, cartOpIds: input.cartOpIds || null,
    ...(input.rewardSelection ? {rewardSelection:input.rewardSelection} : {}),
    ...(input.paymentMethod==='wallet'?{paymentMethod:'wallet'}:{}),
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
  async function expireFreeRewards(){
    const ids=new Set([...(await rewards?.expiredFreeReservations?.()||[]),...(await wallet?.expiredReservations?.()||[])]);
    for(const id of ids){
      const order=await mutate(id,prior=>{
        if(!prior||(prior.total!==0&&prior.paymentMethod!=='wallet')||prior.status!=='awaiting_payment')return prior;
        return {...prior,status:'expired'};
      });
      if(order&&['paid','expired'].includes(order.status))await finalize(order);
    }
  }
  async function checked(input, memberId) {
    const order = cleanOnline(input, config, now(), inventory ? await inventory.menu() : undefined);
    if (order.mode === 'delivery') {
      const result = await checkAddress(order.customer.postalCode);
      if (!result || !Number.isFinite(result.distanceKm)) throw new RequestError('暂时无法核实配送地址，请稍后重试', 503);
      if (result.distanceKm > 10) throw new RequestError('此地址超出 10 km 配送范围');
      order.customer.address = result.address; // postal lookup, never trust client distance/address
      order.fulfilment.distanceKm = result.distanceKm;
    }
    if(input.rewardSelection&&!memberId)throw new RequestError('请先登录后使用积分或兑换券',401);
    if(memberId&&rewards){
      order.memberId=memberId;
      order.loyalty=await rewards.quote(memberId,order,input.rewardSelection||null);
      Object.assign(order,globalThis.OrderPricing.quote((order.loyalty.grossFoodCents-order.loyalty.discountCents)/100,order.mode));
    }
    if(input.paymentMethod&&!['stripe','wallet'].includes(input.paymentMethod))throw new RequestError('支付方式无效');
    if(input.paymentMethod==='wallet'){if(!wallet||!memberId)throw new RequestError('请先登录后使用余额',401);order.memberId=memberId;order.paymentMethod='wallet';order.walletAllocation=await wallet.check(order);if(rewards)order.loyalty=await rewards.quote(memberId,order,input.rewardSelection||null);}
    return order;
  }
  async function finalize(order) {
    if(order.paymentMethod==='wallet'){await wallet.settle(order,order.status);if(order.status==='paid'&&!order.walletSettled)order=await mutate(order.id,prior=>({...prior,walletSettled:true}));}
    if(order.inventoryManaged)await inventory.settle(order,order.status);
    if(order.memberId&&rewards){const result=await rewards.settle(order,order.status);if(order.status==='paid'&&!order.rewardsSettled)order=await mutate(order.id,prior=>({...prior,rewardsSettled:true,rewardPointsEarned:result.earnedPoints}));}
    if(order.localRefundCents!==undefined&&!order.refundCompleted){if(order.paymentMethod==='wallet')await wallet.refundOrder(order,order.localRefundCents);if(order.memberId&&rewards)await rewards.refund(order,order.localRefundCents);order=await mutate(order.id,prior=>({...prior,refundedCents:Math.max(prior.refundedCents||0,order.localRefundCents),refundCompleted:prior.localRefundCents===order.localRefundCents}));}
    if(order.mode==='dinein'){
      if(order.status==='paid'){await dining.finishPayment(order);if(order.refundedCents!==undefined||order.freeRewardRefunded)await dining.syncRefund?.(order);if(!order.fulfilmentCommitted)order=await mutate(order.id,prior=>({...prior,fulfilmentCommitted:true}));}
      if(order.status==='expired')await dining.releasePayment(order);
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
    if (!order || order.freeRewardRefunded || (order.refundedCents>0&&order.refundedCents>=globalThis.OrderPricing.cents(order.total)) || order.mode !== 'takeaway' || order.status !== 'paid' || !order.pickup ||
      typeof code !== 'string' || !/^[a-f0-9]{32}$/.test(code) ||
      !timingSafeEqual(Buffer.from(code,'hex'), Buffer.from(order.pickup.code,'hex'))) throw new RequestError('取餐码无效或订单尚未付款',404);
  }
  return {
    expireFreeRewards,
    async memberOrders(memberId, before = '') {
      if (!memberId) throw new RequestError('请先登录', 401);
      if (typeof before !== 'string' || before.length > 200) throw new RequestError('分页参数无效');
      const key = o => `${o.at || ''}|${o.id}`;
      const rows = (await storage.all()).filter(o => o.type === 'order' && o.memberId === memberId)
        .sort((a,b) => key(b).localeCompare(key(a)))
        .filter(o => !before || key(o).localeCompare(before) < 0);
      const page = rows.slice(0, 20);
      return { orders: page.map(o => ({
        id:o.id, at:o.at, mode:o.mode, status:o.status, total:o.total,
        subtotal:o.subtotal, gst:o.gst, paymentMethod:o.paymentMethod || 'card',
        refundedCents:o.refundedCents || 0, preparationStatus:preparationState(o), pickupNumber:o.pickup?.number || null,
        items:(o.items || []).map(i => ({id:i.id,name:i.name,englishName:i.englishName,style:i.style,qty:i.qty,price:i.price})),
      })), next:rows.length > 20 ? key(page.at(-1)) : null };
    },
    async quote(input, memberId=null) { await expireFreeRewards();return publicOrder(await checked(input,memberId)); },
    async checkout(input, memberId=null) {
      await expireFreeRewards();
      // Recover an existing payment before applying changing date/availability rules.
      const saved = validId(input.requestId) ? (await storage.read(input.requestId))?.value : null;
      if (saved) {
        authorize(saved, input.token);
        if(saved.memberId&&saved.memberId!==memberId)throw new RequestError('请使用原会员账号继续付款',401);
        if (saved.requestFingerprint && saved.requestFingerprint !== requestFingerprint(input)) throw new RequestError('订单内容已更改，请先确认上一笔付款', 409);
        if (saved.status === 'paid') return { order: publicOrder(await finalize(saved)) };
        if (saved.status === 'expired') throw new RequestError('付款已过期，请重新确认订单', 410);
      }
      const data = saved || await checked(input,memberId);
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
        if(order.status==='paid')return {order:publicOrder(await finalize(order))};
      }
      if(order.memberId&&rewards){
        await rewards.reserve(order);
        order=(await storage.read(order.id))?.value||order;
        if(order.status==='expired'){await rewards.settle(order,'expired');throw new RequestError('付款已取消，请重新确认',410);}
        if(order.status==='paid')return {order:publicOrder(await finalize(order))};
      }
      if(order.paymentMethod==='wallet'){await wallet.reserve(order);order=(await storage.read(order.id)).value;if(order.status==='expired'){await wallet.settle(order,'expired');throw new RequestError('余额付款已取消',410);}if(order.status==='paid')return {order:publicOrder(await finalize(order))};return {order:publicOrder(order),walletPayment:true};}
      if(order.total===0&&order.loyalty?.discountCents)return {order:publicOrder(order),freeRedemption:true};
      if (!order.sessionId) {
        // Don't reissue an uncertain payment after Stripe's key-retention window.
        if (now().getTime()-Date.parse(order.at)>23*3600000) throw new RequestError('原付款状态需门店核实，请勿重新付款', 503);
        const session = await payment.create(order);
        order = await mutate(order.id, prior => ({ ...prior, sessionId: session.id, paymentUrl: session.url, clientSecret: session.client_secret }));
      }
      return { order: publicOrder(order), paymentUrl: order.paymentUrl, clientSecret: order.clientSecret };
    },
    async confirmWallet(input,memberId){
      if(!validId(input.requestId))throw new RequestError('订单编号无效');const existing=(await storage.read(input.requestId))?.value;authorize(existing,input.token);
      if(!memberId||existing.memberId!==memberId||existing.paymentMethod!=='wallet')throw new RequestError('请使用原账号确认余额付款',401);
      await this.checkout(input,memberId);
      const order=await mutate(existing.id,async prior=>{if(prior.status==='expired'||(prior.status!=='paid'&&now().getTime()-Date.parse(prior.at)>=30*60000))throw new RequestError('余额付款已过期',410);return {...prior,status:'paid',paidAt:prior.paidAt||now().toISOString(),...(prior.mode==='takeaway'?{pickup:await pickupTicket(prior)}:{})};});return {order:publicOrder(await finalize(order))};
    },
    async refundLocal(input){
      if(!validId(input.id)||!validId(input.refundId)||!Number.isSafeInteger(input.amountCents)||input.amountCents<0||typeof input.reason!=='string'||!input.reason.trim()||input.reason.length>200)throw new RequestError('请填写有效的退款金额和原因');
      const order=await mutate(input.id,prior=>{if(!prior||prior.status!=='paid'||(prior.paymentMethod!=='wallet'&&prior.total!==0))throw new RequestError('此订单须通过原支付渠道退款',409);const requests={...prior.refundRequests};if(requests[input.refundId]){if(requests[input.refundId].amountCents!==input.amountCents||requests[input.refundId].reason!==input.reason)throw new RequestError('退款请求不一致',409);return prior;}const amount=(prior.localRefundCents||0)+input.amountCents;if(amount>globalThis.OrderPricing.cents(prior.total)||(input.amountCents===0&&(prior.total!==0||prior.freeRewardRefunded)))throw new RequestError('超过可退金额',409);requests[input.refundId]={amountCents:input.amountCents,reason:input.reason,at:now().toISOString()};return {...prior,refundRequests:requests,localRefundCents:amount,refundCompleted:false,...(prior.total===0?{freeRewardRefunded:true}:{})};});return publicOrder(await finalize(order));
    },
    async localPayments(){return (await storage.all()).filter(o=>o.status==='paid'&&(o.paymentMethod==='wallet'||o.total===0)).sort((a,b)=>b.at.localeCompare(a.at)).slice(0,100).map(publicOrder);},
    async confirmReward(input,memberId) {
      const existing=(await storage.read(input.requestId))?.value;
      authorize(existing,input.token);
      if(!memberId||existing.memberId!==memberId)throw new RequestError('请使用原会员账号确认兑换',401);
      if(existing.total!==0||!existing.loyalty?.discountCents)throw new RequestError('此订单需要完成付款',409);
      await this.checkout(input,memberId);
      const order=await mutate(existing.id,async prior=>{
        if(prior.status==='expired'||(prior.status!=='paid'&&now().getTime()-Date.parse(prior.at)>=30*60000))throw new RequestError('兑换已取消或过期',410);
        return {...prior,status:'paid',paidAt:prior.paidAt||now().toISOString(),...(prior.mode==='takeaway'?{pickup:await pickupTicket(prior)}:{})};
      });
      return {order:publicOrder(await finalize(order))};
    },
    async cancel(input) {
      if (!validId(input.requestId)) throw new RequestError('订单编号无效');
      const order = (await storage.read(input.requestId))?.value;
      authorize(order, input.token);
      if (order.status === 'paid') throw new RequestError('订单已付款，请查询订单状态', 409);
      if (order.status !== 'expired') {
        // Recover the exact idempotent Session if its creation response was lost.
        const session = (order.total===0||order.paymentMethod==='wallet') ? {id:null} : order.sessionId ? { id: order.sessionId } : await payment.create(order);
        const expired = (order.total===0||order.paymentMethod==='wallet') ? {status:'expired'} : await payment.expire(session.id);
        if (expired.status !== 'expired' || expired.payment_status === 'paid') throw new RequestError('付款正在确认，请稍后查询', 409);
        await mutate(order.id, prior => {
          if (prior.status === 'paid') throw new RequestError('订单已付款，请查询订单状态', 409);
          return { ...prior, status: 'expired', sessionId: session.id };
        });
      }
      await finalize({...order,status:'expired'});
      return { cancelled: true };
    },
    async get(id, token) {
      await expireFreeRewards();
      if (!validId(id)) throw new RequestError('订单编号无效');
      const record = (await storage.read(id))?.value; authorize(record, token);
      return publicOrder(['paid','expired'].includes(record.status)?await finalize(record):record);
    },
    async paymentEvent(session) {
      // Neither comedy's orderId nor the legacy restaurant's order_id is ours.
      const id = session.metadata?.dumpling_order_id;
      if (!validId(id)) throw new RequestError('付款订单编号无效');
      const updated = await mutate(id, async order => {
        if (!order || order.paymentMethod==='wallet' || (order.sessionId && order.sessionId !== session.id)) throw new RequestError('付款订单不匹配', 409);
        if (session.currency !== 'sgd' || session.amount_total !== globalThis.OrderPricing.cents(order.total)) throw new RequestError('付款金额不匹配', 409);
        if (session.payment_status === 'paid') return { ...order, sessionId: session.id, paymentIntentId:session.payment_intent||order.paymentIntentId||null, status: 'paid', paidAt: order.paidAt || now().toISOString(), ...(order.mode === 'takeaway' ? {pickup:await pickupTicket(order)} : {}) };
        if (session.status === 'expired' && order.status !== 'paid') return { ...order, status: 'expired' };
        return order;
      });
      return finalize(updated);
    },
    async refundEvent(charge) {
      const id=charge.metadata?.dumpling_order_id;
      if(!validId(id))throw new RequestError('退款订单编号无效');
      let order=(await storage.read(id))?.value;
      if(!order||order.status!=='paid'||!order.paymentIntentId||order.paymentIntentId!==charge.payment_intent||charge.currency!=='sgd'||charge.amount!==globalThis.OrderPricing.cents(order.total)||!Number.isInteger(charge.amount_refunded)||charge.amount_refunded<0||charge.amount_refunded>charge.amount)throw new RequestError('退款与付款订单不匹配',409);
      order=await finalize(order);
      if(order.memberId&&rewards)await rewards.refund(order,charge.amount_refunded);
      return finalize(await mutate(id,prior=>({...prior,refundedCents:Math.max(prior.refundedCents||0,charge.amount_refunded)})));
    },
    async feed() { return (await storage.all()).filter(o => o.mode !== 'dinein' && o.status === 'paid' && !o.resolvedAt && !o.freeRewardRefunded && (o.paymentMethod!=='wallet'||o.walletSettled) && (!o.refundedCents||o.refundedCents<globalThis.OrderPricing.cents(o.total))).map(publicOrder); },
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
