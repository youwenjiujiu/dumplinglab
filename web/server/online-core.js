import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import QRCode from 'qrcode';
import { cleanItems, cleanOrder, RequestError } from './order-core.js';
import { cleanCartOpIds, cleanTable } from './cart-core.js';
import { cleanNickname } from './cart-meta.js';
import { summarizeOrders } from './report-core.js';

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
    // $100 food minimum, before the delivery fee. A fee cannot qualify the food basket.
    if (pricing.subtotal < 100) throw new RequestError('配送菜品小计需满 $100（不含配送费）');
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
// An unpaid card/PayNow checkout holds stock for 15 minutes. Stripe's own link
// lives longer (its minimum is 30 minutes), so we void the link ourselves.
export const PAYMENT_WINDOW_MS = 15 * 60000;
export const preparationState = order => order.collectedAt || order.resolvedAt ? 'collected'
  : order.readyAt ? 'ready' : order.preparingAt ? 'preparing' : 'received';
export const publicOrder = order => {
  const { tokenHash: secret, fingerprint, requestFingerprint, memberId, paymentIntentId, refundRequests, cardRefunds, localRefundCents, sessionId, clientSecret, ...view } = order;
  return { ...view, ...(order.mode === 'takeaway' && order.status === 'paid' ? { preparationStatus: preparationState(order) } : {}) };
};
export function createOnlineService({ storage, payment, checkAddress, config, dining, inventory, rewards, wallet, now = () => new Date() }) {
  const requestFingerprint = input => createHash('sha256').update(JSON.stringify({
    mode:input.mode,items:input.items?.map(i=>[i.id,i.style||null,Number(i.qty),i.note||null]),
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
  // Priced exactly like a guest order of the same mode, table discount included.
  async function counterOrder(input){
    if(!['dinein','takeaway'].includes(input.mode))throw new RequestError('请选择堂食或自取');
    if(input.mode==='dinein'&&!String(input.table||'').trim())throw new RequestError('请填写桌号');
    const table=input.mode==='dinein'?cleanTable(input.table):null;
    const menu=inventory?await inventory.menu():undefined,items=cleanItems(input.items,menu);
    const sectionOf=id=>menu?.find(d=>d.id===id)?.section||null;
    const lines=items.map(i=>({id:i.id,style:i.style||null,section:sectionOf(i.id),amount:i.price*i.qty}));
    const discount=input.mode==='dinein'?await inventory?.tableDiscount?.(table):null;
    return {type:'order',mode:input.mode,table:table?table.toUpperCase():null,group:table?'A':null,items,customer:{},fulfilment:{},
      note:typeof input.note==='string'?input.note.trim().slice(0,240):'',...globalThis.OrderPricing.quote(items.reduce((sum,i)=>sum+i.price*i.qty,0),input.mode,discount,lines),paymentMethod:'counter'};
  }
  async function checked(input, memberId) {
    const menu = inventory ? await inventory.menu() : undefined;
    const order = cleanOnline(input, config, now(), menu);
    if (order.mode === 'delivery') {
      const result = await checkAddress(order.customer.postalCode);
      if (!result || !Number.isFinite(result.distanceKm)) throw new RequestError('暂时无法核实配送地址，请稍后重试', 503);
      if (result.distanceKm > 10) throw new RequestError('此地址超出 10 km 配送范围');
      order.customer.address = result.address; // postal lookup, never trust client distance/address
      order.fulfilment.distanceKm = result.distanceKm;
    }
    if(input.rewardSelection&&!memberId)throw new RequestError('请先登录后使用积分或兑换券',401);
    // The back office decides a table's discount; the client only displays it.
    const tableDiscount = order.mode === 'dinein' ? await inventory?.tableDiscount?.(order.table) : null;
    // Category discounts need each line's menu section.
    const sectionOf = id => menu?.find(d => d.id === id)?.section || null;
    const lines = order.items.map(i => ({ id: i.id, style: i.style || null, section: sectionOf(i.id), amount: i.price * i.qty }));
    if (tableDiscount) Object.assign(order, globalThis.OrderPricing.quote(order.foodTotal, order.mode, tableDiscount, lines));
    if(memberId&&rewards){
      order.memberId=memberId;
      order.loyalty=await rewards.quote(memberId,order,input.rewardSelection||null);
      // The reward pays for one unit of its dish, so that unit is not discounted again.
      const l=order.loyalty, gift=l.discountCents?lines.find(x=>x.id===l.dishId&&x.style===(l.style||null)&&x.amount>0):null;
      const rewardLines=lines.map(x=>x===gift?{...x,amount:Math.max(0,x.amount-l.discountCents/100)}:x);
      Object.assign(order,globalThis.OrderPricing.quote((l.grossFoodCents-l.discountCents)/100,order.mode,tableDiscount,rewardLines));
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
    // A counter order never went through a table's shared cart.
    if(order.mode==='dinein'&&order.paymentMethod!=='counter'){
      if(order.status==='paid'){await dining.finishPayment(order);if(order.refundedCents!==undefined||order.freeRewardRefunded)await dining.syncRefund?.(order);if(!order.fulfilmentCommitted)order=await mutate(order.id,prior=>({...prior,fulfilmentCommitted:true}));}
      if(order.status==='expired')await dining.releasePayment(order);
    }
    return order;
  }
  // Void the payment link first, so a late payment cannot land on released stock.
  async function voidPayment(order,by){
    if(order.status==='paid')throw new RequestError('这笔订单已经付款，不能取消',409);
    if(order.status!=='expired'){
      // A link still being created is recovered by its idempotent request, then voided.
      // Stripe links end 46 minutes after the order starts, so an older order has none.
      const mayHaveLink=order.sessionId||(by!=='staff'&&now().getTime()-Date.parse(order.at)<46*60000);
      if(order.total!==0&&order.paymentMethod!=='wallet'&&order.paymentMethod!=='counter'&&mayHaveLink){
        const id=order.sessionId||(await payment.create(order)).id;
        let session;
        try{session=await payment.expire(id)}catch(error){session=payment.retrieve?await payment.retrieve(id):null;if(!session)throw error}
        if(session.payment_status==='paid'||session.status==='complete')throw new RequestError('客人已经付款，系统正在确认，请稍后刷新',409);
        if(session.status!=='expired')throw new RequestError('付款链接还没作废，请稍后再试',409);
      }
      await mutate(order.id,prior=>{if(prior.status==='paid')throw new RequestError('这笔订单已经付款，不能取消',409);return {...prior,status:'expired',cancelledBy:by,cancelledAt:now().toISOString()}});
    }
    await finalize({...order,status:'expired'});
  }
  // Runs whenever staff screens or the printer read orders (every few seconds while
  // the printer bridge is on). A customer paying at that moment keeps the order.
  async function expireStale(orders){
    const stale=orders.filter(o=>o?.type==='order'&&o.status==='awaiting_payment'&&o.paymentMethod!=='wallet'&&o.total!==0&&now().getTime()-Date.parse(o.at)>=PAYMENT_WINDOW_MS);
    for(const o of stale){try{await voidPayment(o,'timeout');o.status='expired'}catch(error){if(error.status!==409)console.error('Payment timeout failed',o.id,error.message)}}
    return orders;
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
        subtotal:o.subtotal, gst:o.gst, serviceCharge:o.serviceCharge, discount:o.discount, paymentMethod:o.paymentMethod || 'card',
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
    async staffQuote(input){return publicOrder(await counterOrder(input));},
    // Staff takes an order at the counter and collects cash or card there; it prints at once.
    // Saved before the stock hold, so a retry with the same requestId continues instead of doubling.
    async staffOrder(input){
      if(!validId(input.requestId))throw new RequestError('订单编号无效');
      if(!['dinein','takeaway'].includes(input.mode))throw new RequestError('请选择堂食或自取');
      if(!['cash','card'].includes(input.counterMethod))throw new RequestError('请选择收款方式');
      let order=(await storage.read(input.requestId))?.value;
      if(!order){
        const data=await counterOrder(input);
        if(input.expectedTotal!==undefined&&globalThis.OrderPricing.cents(input.expectedTotal)!==globalThis.OrderPricing.cents(data.total))throw new RequestError('价格已更新，请重新核对',422);
        order=await mutate(input.requestId,prior=>prior||{...data,id:input.requestId,counterMethod:input.counterMethod,
          ...(inventory?{inventoryManaged:true}:{}),at:now().toISOString(),no:`S${input.requestId.slice(0,6).toUpperCase()}`,status:'awaiting_payment'});
      }
      if(order.paymentMethod!=='counter')throw new RequestError('订单编号冲突',409);
      if(order.status==='expired')throw new RequestError('这单已取消，请重新点单',410);
      if(order.status!=='paid'){
        if(order.inventoryManaged){
          try{await inventory.reserve(order)}catch(e){await mutate(order.id,prior=>prior.status==='paid'?prior:{...prior,status:'expired',cancelledBy:'stock'});throw e;}
        }
        order=await mutate(order.id,async prior=>prior.status==='paid'?prior:{...prior,status:'paid',paidAt:now().toISOString(),...(prior.mode==='takeaway'?{pickup:await pickupTicket(prior)}:{})});
      }
      return publicOrder(await finalize(order));
    },
    // Staff refund of a card/PayNow order straight to Stripe. The request is reserved on
    // the order first, so a retry reuses the same Stripe idempotency key and two staff
    // cannot together refund more than was paid. The charge.refunded webhook still
    // reconciles the exact total and member points afterwards.
    async staffRefund(input){
      if(!validId(input.id)||!validId(input.refundId)||!Number.isSafeInteger(input.amountCents)||input.amountCents<=0||typeof input.reason!=='string'||!input.reason.trim()||input.reason.length>200)throw new RequestError('请填写有效的退款金额和原因');
      if(!payment.refund)throw new RequestError('退款暂不可用',503);
      const reason=input.reason.trim();
      let order=await mutate(input.id,prior=>{
        if(!prior||prior.type!=='order'||prior.status!=='paid')throw new RequestError('只有付款成功的订单可以退款',409);
        if(prior.paymentMethod==='wallet'||!prior.paymentIntentId)throw new RequestError('这单不是刷卡付款，请在「余额」页退款',409);
        const refunds={...prior.cardRefunds},old=refunds[input.refundId];
        if(old){if(old.amountCents!==input.amountCents||old.reason!==reason)throw new RequestError('退款请求不一致',409);return prior;}
        const held=Object.values(refunds).filter(r=>r.status!=='failed').reduce((s,r)=>s+r.amountCents,0);
        const base=Math.max(prior.refundedCents||0,held);
        if(base+input.amountCents>globalThis.OrderPricing.cents(prior.total))throw new RequestError('超过可退金额，最多还能退 S$'+((globalThis.OrderPricing.cents(prior.total)-base)/100).toFixed(2),409);
        refunds[input.refundId]={amountCents:input.amountCents,reason,baseCents:base,status:'reserved',at:now().toISOString()};
        return {...prior,cardRefunds:refunds};
      });
      const request=order.cardRefunds[input.refundId];
      if(request.status==='succeeded')return publicOrder(order);
      if(request.status==='failed')throw new RequestError('这笔退款已失败，请重新发起',409);
      let refund;
      try{refund=await payment.refund({id:input.refundId,orderId:order.id,paymentIntentId:order.paymentIntentId,amountCents:input.amountCents});}
      catch(error){
        // Only a definite rejection releases the reservation; anything else may have reached Stripe.
        if(error.rejected){await mutate(order.id,prior=>({...prior,cardRefunds:{...prior.cardRefunds,[input.refundId]:{...prior.cardRefunds[input.refundId],status:'failed',error:error.message}}}));throw new RequestError('退款失败：'+error.message,409);}
        throw new RequestError('退款结果未确认，请稍后再点一次（不会重复退）',503);
      }
      if(refund.status==='failed'||refund.status==='canceled'){await mutate(order.id,prior=>({...prior,cardRefunds:{...prior.cardRefunds,[input.refundId]:{...prior.cardRefunds[input.refundId],status:'failed',stripeRefundId:refund.id}}}));throw new RequestError('退款失败，请到 Stripe 查看原因',409);}
      order=await mutate(order.id,prior=>({...prior,refundedCents:Math.max(prior.refundedCents||0,request.baseCents+input.amountCents),
        cardRefunds:{...prior.cardRefunds,[input.refundId]:{...prior.cardRefunds[input.refundId],status:'succeeded',stripeRefundId:refund.id}}}));
      return publicOrder(await finalize(order));
    },
    // Staff view of payments started but not finished; each still holds stock.
    async pendingPayments(){
      return (await expireStale(await storage.all())).filter(o=>o.type==='order'&&o.status==='awaiting_payment')
        .sort((a,b)=>String(a.at).localeCompare(String(b.at)))
        .map(o=>({id:o.id,no:o.no,mode:o.mode,table:o.table,group:o.group,at:o.at,expiresAt:new Date(Date.parse(o.at)+PAYMENT_WINDOW_MS).toISOString(),
          total:o.total,paymentMethod:o.paymentMethod||'card',items:(o.items||[]).map(i=>({id:i.id,name:i.name,style:i.style,qty:i.qty}))}));
    },
    // Another phone at the same table cancels an unfinished payment so the table can
    // edit the order. Stripe is asked first; a completed payment is never released.
    async cancelForTable(input){
      if(!dining)throw new RequestError('堂食付款尚未开放',503);
      const id=await dining.paymentHold(input.table,input.group);
      if(!id)return {cancelled:true};
      const order=(await storage.read(id))?.value;
      if(!order)throw new RequestError('付款正在创建，请几秒后再试',409);
      if(order.status==='paid')throw new RequestError('同桌已经付款成功，请查看已下单',409);
      await voidPayment(order,'table');
      return {cancelled:true};
    },
    async staffCancel(id){
      if(!validId(id))throw new RequestError('订单编号无效');
      const order=(await storage.read(id))?.value;
      if(!order||order.type!=='order')throw new RequestError('找不到该订单',404);
      await voidPayment(order,'staff');
      return {cancelled:true};
    },
    // Staff-only sales summary; reads paid order snapshots.
    async report(query){return summarizeOrders(await storage.all(),query,now());},
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
    async feed() { return (await expireStale(await storage.all())).filter(o => (o.mode !== 'dinein' || o.paymentMethod === 'counter') && o.status === 'paid' && !o.resolvedAt && !o.freeRewardRefunded && (o.paymentMethod!=='wallet'||o.walletSettled) && (!o.refundedCents||o.refundedCents<globalThis.OrderPricing.cents(o.total))).map(publicOrder); },
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
      if (!record || (record.value.mode === 'dinein' && record.value.paymentMethod !== 'counter')) return false;
      await mutate(id, order => {
        if (order.status !== 'paid') throw new RequestError('订单尚未付款', 409);
        return { ...order, resolvedAt: order.resolvedAt || now().toISOString(), ...(order.pickup ? {collectedAt:order.collectedAt || now().toISOString()} : {}) };
      }); return true;
    },
  };
}
