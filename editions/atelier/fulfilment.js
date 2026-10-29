// Remote orders never enter table/group APIs. Browser drafts and credentials are
// private to this device; only verified backend payment state clears a draft.
class OnlineCart extends TableCart {
  constructor(mode) { super(null, 'A', `atelier:online:${mode}`); this.mode = mode; this.status = 'local'; }
  async flush() { this.status = 'local'; }
  start() { this.poll(); this.timer = setInterval(() => this.poll(), 5000); }
  async refreshProgress() {
    this.progressSync ||= {};
    const active = this.orders.filter(o => o.mode === 'takeaway' && !o.collectedAt && !o.resolvedAt);
    const targets = (active.length ? active : this.orders.filter(o => o.mode === 'takeaway').slice(-1)).slice(-10);
    await Promise.all(targets.map(async order => {
      if (!order.pickup?.code) { this.progressSync[order.id] = 'unavailable'; return; }
      try {
        const response = await fetch(`/api/online?id=${encodeURIComponent(order.id)}&progress=1`, {
          headers: { 'x-pickup-code': order.pickup.code }, cache: 'no-store', signal: AbortSignal.timeout(9000),
        });
        const out = await response.json();
        if (!response.ok || !out.ok || out.progress?.id !== order.id ||
            !['received','preparing','ready','collected'].includes(out.progress.preparationStatus)) throw new Error('Status unavailable');
        this.remote.orders = this.orders.map(o => o.id === order.id ? { ...o, ...out.progress } : o);
        this.progressSync[order.id] = 'synced';
      } catch { this.progressSync[order.id] = 'offline'; }
    }));
    this.emit();
  }
  async poll() {
    if (this.polling) return;
    this.polling = true;
    try {
      if (!this.order?.requestId) { await this.refreshProgress(); return; }
      const res = await fetch(`/api/online?id=${this.order.requestId}`, { headers: { authorization: `Bearer ${this.order.token}` }, cache: 'no-store', signal: AbortSignal.timeout(30000) });
      const out = await res.json();
      if (!res.ok || !out.ok) return;
      if (out.order.status === 'paid') {
        this.progressSync ||= {};
        this.progressSync[out.order.id] = 'synced';
        Fulfilment.clearDraft(this.mode);
        this.remote = { items: [], note: '', opIds: [], orders: [...this.orders.filter(o => o.id !== out.order.id), out.order] };
        this.pending = []; this.order = null; this.emit();
        if (store === this) Fulfilment.paid();
      } else if (out.order.status === 'expired') {
        this.order = null; this.emit();
        if (store === this) toast(tr('付款已过期，选菜已保留，请重新确认', 'Payment expired. Your selection is saved; please review again.'));
      }
    } catch { /* Keep durable pending order during network outages. */ }
    finally { this.polling = false; }
  }
  async checkoutOnline(input) {
    if (!this.order) {
      this.order = { ...input, action: 'checkout' };
      if (!this.writeStorage(this.key, JSON.stringify({ remote: this.remote, pending: this.pending, order: this.order }))) {
        this.order = null; throw new Error(tr('请允许网站存储以保留订单凭证', 'Enable browser storage to save your order access'));
      }
    }
    this.emit();
    let out;
    try { out = await this.api('/api/online', this.order); }
    catch (e) {
      // Validation failures happen before order creation; safe to edit the draft.
      // Conflict, network and server errors retain the original request ID.
      if ([400,410,422].includes(e.status)) { this.order = null; this.emit(); }
      throw e;
    }
    if (out.order.status === 'paid') { await this.poll(); return; }
    this.order.paymentUrl = out.paymentUrl; this.emit();
    if (out.paymentUrl?.startsWith('https://checkout.stripe.com/')) location.assign(out.paymentUrl);
    else if (!production && out.paymentUrl?.startsWith('/?preview_payment=')) Fulfilment.previewPayment(out.order);
    else throw new Error(tr('付款页面暂时不可用，订单已保留，可安全重试', 'Payment unavailable. Your order is saved; retry safely.'));
  }
}
const Fulfilment = (() => {
  const stores = new Map(); let config = null, formDraft = {}, quoted = null;
  const drafts = new Map();
  const draftFields = {customerName:60, customerPhone:24, postalCode:6, address:180, unit:40, date:10, slot:40, pickupLocation:100};
  const draftKey = selected => `atelier:checkout-draft:${selected}`;
  const cleanDraft = value => Object.fromEntries(Object.entries(draftFields)
    .filter(([key]) => typeof value?.[key] === 'string')
    .map(([key,max]) => [key,value[key].slice(0,max)]));
  const remote = () => Boolean(store.mode);
  const mode = () => store.mode || 'dinein';
  function readDraft(selected) {
    if (!drafts.has(selected)) {
      let cached = {};
      try { cached = JSON.parse(sessionStorage.getItem(draftKey(selected)) || '{}'); } catch { /* memory-only fallback */ }
      drafts.set(selected, cleanDraft(cached));
    }
    return { ...drafts.get(selected) };
  }
  function rememberDraft(form) {
    if (modal !== 'online' || !form.isConnected) return;
    formDraft = cleanDraft(Object.fromEntries(new FormData(form)));
    drafts.set(mode(), { ...formDraft });
    // Contact/address drafts live only in this tab's session, not localStorage.
    try { sessionStorage.setItem(draftKey(mode()), JSON.stringify(formDraft)); } catch { /* retain in memory */ }
  }
  function clearDraft(selected) {
    drafts.set(selected, {});
    try { sessionStorage.removeItem(draftKey(selected)); } catch { /* no persistent draft */ }
    if (selected === mode()) formDraft = {};
  }
  const label = (value = mode()) => ({ dinein: tr('堂食', 'Dine-in'), takeaway: tr('打包自取', 'Pickup'), delivery: tr('外送', 'Delivery') })[value];
  const credentials = () => ({ requestId: crypto.randomUUID(), token: [...crypto.getRandomValues(new Uint8Array(32))].map(v => v.toString(16).padStart(2,'0')).join('') });
  const summary = (order, paid = false) => `<dl class="payment-breakdown">${paid&&order.paymentMethod==='wallet'?`<div><dt>${bi('支付方式','Payment method')}</dt><dd>${bi('余额','Balance')}</dd></div>`:''}${paid&&order.walletAllocation?`<div><dt>${bi('本金 / 赠金','Principal / bonus')}</dt><dd>${money(order.walletAllocation.principalCents/100)} / ${money(order.walletAllocation.bonusCents/100)}</dd></div>`:''}${order.refundedCents?`<div><dt>${bi('已退款','Refunded')}</dt><dd>${money(order.refundedCents/100)}</dd></div>`:''}${order.loyalty?.discountCents ? `<div><dt>${(order.gst !== undefined ? bi('菜品原价（含税）','Food before reward (incl. GST)') : bi('菜品原价','Food before reward'))}</dt><dd>${money(order.loyalty.grossFoodCents/100)}</dd></div><div><dt>${bi('兑换优惠','Reward')}</dt><dd>−${money(order.loyalty.discountCents/100)}</dd></div>` : ''}${order.gst !== undefined ? `<div><dt>${bi('菜品金额（未税）','Food (before GST)')}</dt><dd>${money(order.subtotal)}</dd></div>${order.mode === 'delivery' ? `<div><dt>${bi('配送费 9%','Delivery fee 9%')}</dt><dd>${money(order.deliveryFee)}</dd></div>` : ''}<div><dt>${order.pricingVersion === 'sg-inclusive-gst9-delivery9-v2' ? bi('内含 GST 9%','Included GST 9%') : 'GST 9%'}</dt><dd>${money(order.gst)}</dd></div>` : `${order.discount ? `<div><dt>${bi('菜品金额','Food')}</dt><dd>${money(order.foodTotal)}</dd></div><div><dt>${(([cn, en]) => order.discountRule?.type === 'percent' && !order.discountRule.sections ? bi(`${cn} ${order.discountRule.value}%`, `${en} ${order.discountRule.value}%`) : bi(cn, en))(order.discountRule?.scope === 'day' ? ['今日折扣', "Today's discount"] : ['本桌折扣', 'Table discount'])}</dt><dd>−${money(order.discount)}</dd></div>` : ''}<div><dt>${order.discount ? bi('折后菜品','Food after discount') : bi('菜品金额','Food')}</dt><dd>${money(order.subtotal)}</dd></div>${order.mode === 'delivery' ? `<div><dt>${bi('配送费 9%','Delivery fee 9%')}</dt><dd>${money(order.deliveryFee)}</dd></div>` : ''}${order.mode === 'dinein' ? `<div><dt>${bi('服务费 10%','Service charge 10%')}</dt><dd>${money(order.serviceCharge)}</dd></div>` : ''}`}<div class="payment-total"><dt>${paid ? bi('实付金额','Total paid') : bi('应付总额','Total to pay')}</dt><dd>${money(order.total)}</dd></div></dl>`;
  function chrome() {
    const button = $('#fulfilmentButton');
    const tableLabel = !remote() ? ` · ${table || tr('选桌号', 'Table')}` : '';
    button.innerHTML = `<img class="fulfilment-mode-icon" src="/brand/header-${mode()}-v1.svg" alt="" width="32" height="28"><span>${escapeHTML(label() + tableLabel)}</span><svg class="fulfilment-chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>`;
    button.ariaLabel = tr(`用餐方式：${label() + tableLabel}，更改桌号或用餐方式`, `Order type: ${label() + tableLabel}. Change table or order type`);
    $('#dineinControls').hidden = true;
    $('#tableButton').hidden = remote();
  }
  // Entry is bilingual before the guest has chosen the app language.
  const entryText = (zh, en) => `<span class="entry-copy"><span lang="zh-CN">${escapeHTML(zh)}</span><span lang="en" class="entry-en">${escapeHTML(en)}</span></span>`;
  async function refreshPickupChoice(button, recurring = true) {
    if (!button?.isConnected) return false;
    button.disabled = true;
    try {
      const current = await getConfig();
      if (!button.isConnected) return false;
      const open = current.pickupAvailability?.open !== false;
      const bilingual = Boolean(button.closest('.fulfilment-entry'));
      button.querySelector('strong').innerHTML = bilingual
        ? entryText(open ? '打包外带' : '自提时间', open ? 'Takeaway' : 'Pickup hours')
        : bi(open ? '打包自取' : '自提时间', open ? 'Pickup' : 'Pickup hours');
      let notice=button.querySelector('.pickup-icon-hours');
      if(!notice){notice=document.createElement('small');notice.className='pickup-icon-hours';button.append(notice);}
      notice.hidden=open;
      const windows=current.pickupAvailability?.windows||[];
      notice.textContent=windows.length?windows.map(w=>w.join('–')).join(' / '):tr('今日暂停自提','Closed today');
      button.disabled = !open;
      button.dataset.pickupOpen = String(open);
      return open;
    } catch {
      if (button.isConnected) { button.disabled = false; button.dataset.pickupOpen = 'unknown'; }
      return false;
    } finally {
      if (recurring && button.isConnected) setTimeout(() => refreshPickupChoice(button), 30000);
    }
  }
  function select(options = {}) {
    openModal('fulfilment', '', {initialEntry: options.initialEntry === true});
    $('#sheetBody').innerHTML = `<div class="sheet-content fulfilment-content fulfilment-entry" translate="no"><h2 id="sheetTitle">${entryText('选择用餐方式','Choose your order type')}</h2><div class="fulfilment-choices entry-choices"><button data-fulfilment="dinein"><dl-dinein-serving class="entry-art" aria-hidden="true"><img src="/brand/entry-dinein-v3.svg" width="260" height="220" alt="" draggable="false" style="width:100%;height:auto"></dl-dinein-serving><strong>${entryText('堂食','Dine-in')}</strong></button><button data-fulfilment="takeaway"><dl-takeaway-pickup class="entry-art" aria-hidden="true"><img src="/brand/entry-takeaway-v5.svg" width="260" height="220" alt="" draggable="false" style="width:100%;height:auto"></dl-takeaway-pickup><strong>${entryText('打包外带','Takeaway')}</strong></button></div></div>`;
    if (!remote()) $('#sheetBody .fulfilment-entry')?.insertAdjacentHTML('beforeend', `<button type="button" class="entry-change-table" data-action="table">${bi('桌号', 'Table')} ${escapeHTML(table || '—')}<span>${bi('更改桌号', 'Change table')} ↗</span></button>`);
    $('#closeSheet').ariaLabel = '关闭 / Close';
    const heading = $('#sheetTitle'); heading.tabIndex = -1; heading.focus({preventScroll:true});
    refreshPickupChoice($('#sheetBody [data-fulfilment=takeaway]'));
  }
  function visit() {
    openModal('fulfilment', '');
    $('#sheetBody').innerHTML = `<div class="sheet-content fulfilment-content"><h2 id="sheetTitle">${bi('到店用餐','At the restaurant')}</h2><div class="fulfilment-choices"><button data-fulfilment="dinein"><strong>${bi('堂食','Dine-in')}</strong><small>${bi('按桌号下单','Order for your table')}</small></button><button data-fulfilment="takeaway"><strong>${bi('打包自取','Pickup')}</strong><small>${bi('无需桌号','No table number needed')}</small></button></div></div>`;
    refreshPickupChoice($('#sheetBody [data-fulfilment=takeaway]'));
  }
  function switchTo(next, close = true) {
    // Preserve old delivery data, but reject retired entry actions before mutation.
    if (!['dinein', 'takeaway'].includes(next)) return;
    if (next === mode()) { try {localStorage.setItem('atelier-mode',next);} catch {} if (close) closeModal({startMenu:true}); return; }
    if (store.order || submitting) { toast(tr('请先确认上一笔付款或订单状态','Check your pending payment or order first')); return; }
    clearTimeout(noteTimer);
    const note = $('#cartNote'); if (note && note.value !== store.note) store.mutate({kind:'note',note:note.value});
    noteDraft = null;
    const previous = store;
    stores.set(mode(), store);
    if (!stores.has(next)) stores.set(next, next === 'dinein' ? new TableCart(table, group) : new OnlineCart(next));
    const target = stores.get(next);
    // First selection from a browsing-only draft travels with the customer.
    if (!previous.table && !previous.mode && next !== 'dinein' && !target.items.length && !target.order) {
      target.pending = structuredClone(previous.pending); target.persist();
      previous.pending = []; previous.persist();
    }
    store.removeEventListener('change', onCartChange); clearInterval(store.timer);
    store = target; table = target.table;
    store.addEventListener('change', onCartChange); store.start();
    try { localStorage.setItem('atelier-mode', next); } catch { /* no persistence */ }
    formDraft = readDraft(next); quoted = null;
    renderChrome(); renderMenu(); renderTray(); chrome();
    if (close) closeModal({startMenu:true});
  }
  async function getConfig() {
    const out = await store.api('/api/online'); return out.config;
  }
  // A mode name alone is insufficient: closing and reopening can create a newer
  // checkout in the same mode. Bind reads and errors to the exact view and cart.
  function currentCheckoutView() {
    const owner = store, view = $('#sheetBody').firstElementChild;
    return () => modal === 'online' && store === owner && view?.isConnected && $('#sheetBody').firstElementChild === view;
  }
  const field = (id, title, attributes = '') => `<label class="online-field" for="${id}"><span>${title}</span><input id="${id}" name="${id}" ${attributes} value="${escapeHTML(formDraft[id] || '')}"></label>`;
  function pickupTicket(order) {
    if (order.mode !== 'takeaway' || order.status !== 'paid' || !order.pickup) return '';
    const p = order.pickup;
    const stage = order.collectedAt || order.resolvedAt ? 'collected' : order.readyAt ? 'ready' : order.preparingAt ? 'preparing' : 'received';
    const stages = ['received','preparing','ready','collected'];
    const labels = [['已下单','Ordered'],['制作中','Preparing'],['待取餐','Ready'],['已取餐','Collected']];
    // Generated transparent progress artwork; text and server-driven states remain authoritative.
    // Progress remains server-driven; there is no simulated timing or advancement.
    const illustrations = stages.map(s => `<img class="progress-generated-icon" src="/img/s/progress-${s}-${['preparing','collected'].includes(s) ? 'v3' : 'v2'}.webp" alt="" width="80" height="80" decoding="async">`);
    const sync = store.progressSync?.[order.id];
    const note = sync === 'synced' ? bi('状态已更新 · 页面打开时自动刷新','Up to date · Refreshes while this page is open')
      : sync === 'offline' ? bi('暂时无法更新，显示上次记录。请向店员确认。','Unable to refresh. Showing the last saved status; check with staff.')
      : sync === 'unavailable' ? bi('此旧订单暂无法同步，请向店员确认。','This older order cannot be refreshed; check with staff.')
      : bi('正在更新，以下为上次记录…','Refreshing the last saved status…');
    return `<section class="pickup-ticket" data-pickup-id="${escapeHTML(order.id)}" data-stage="${stage}" aria-label="${tr('取餐凭证','Pickup ticket')}">
      <div class="pickup-number"><span lang="zh-CN">取餐号</span><small lang="en">PICKUP NUMBER</small><strong>${escapeHTML(p.number)}</strong></div>
      <ol class="pickup-progress" aria-label="${tr('取餐进度','Order progress')}">${stages.map((s,i)=>`<li class="${i<stages.indexOf(stage)?'is-complete':''}" ${s===stage?'aria-current="step"':''}><span class="progress-art progress-art--${s}" aria-hidden="true">${illustrations[i]}</span><span class="progress-label" lang="zh-CN">${labels[i][0]}</span><small lang="en">${labels[i][1]}</small></li>`).join('')}</ol>
      <p class="pickup-status" role="status"><b>${stage === 'ready' ? bi('餐已备好，请到柜台取餐','Your order is ready. Please collect at the counter.') : stage === 'preparing' ? bi('正在为您制作，请稍候','We are preparing your order.') : stage === 'collected' ? bi('已取餐，祝您用餐愉快','Collected. Enjoy your meal!') : bi('订单已收到，等待制作','Order received. Waiting to be prepared.')}</b><small>${note}</small></p>
      ${stage === 'collected' ? `<div class="pickup-code pickup-code--collected"><span>${bi('本单已完成','Order completed')}</span><small>${escapeHTML(p.date)}</small></div>` : `<dl-pickup-slip lang="${tr('zh','en')}"><div class="pickup-code"><img class="pickup-qr" src="${escapeHTML(p.qr)}" width="140" height="140" alt="${tr('向店员出示此取餐二维码','Show this pickup QR code to staff')}"><div><span>${bi('取餐时出示','Show at collection')}</span><small>${bi('取餐号或二维码','Pickup number or QR code')}</small><small>${escapeHTML(p.date)}</small></div></div></dl-pickup-slip>`}
    </section>`;
  }
  function refreshTicket() {
    if (modal !== 'pickup') return;
    const node = $('#sheetBody .pickup-ticket');
    const order = store.orders.find(o => o.id === node?.dataset.pickupId);
    if (node && order) {
      const previousStage = node.dataset.stage;
      const unfolded = node.querySelector('dl-pickup-slip')?.detached;
      node.outerHTML = pickupTicket(order);
      const updated = $('#sheetBody .pickup-ticket');
      // Polling unchanged progress must not repeatedly replay the same animation.
      if (updated?.dataset.stage === previousStage) updated.setAttribute('data-motion-settled', '');
      if (unfolded) updated?.querySelector('dl-pickup-slip')?.setDetached?.(true);
    }
  }
  function renderOnlineReview(input, order) {
    globalThis.RewardsUI?.onPaid();
    const pickup = order.mode === 'takeaway';
    $('#sheet').scrollTop = 0;
    $('#sheetBody').innerHTML = `<div class="sheet-content fulfilment-content"><h2 id="sheetTitle">${pickup ? bi('核对自取订单','Review pickup order') : bi('确认订单','Review order')}</h2><p class="online-policy">${escapeHTML(label(order.mode))}${pickup ? '' : ` · ${escapeHTML(input.date)} · ${escapeHTML(input.slot)}`}</p><p>${escapeHTML(pickup ? order.fulfilment.pickupName : order.customer.address)}<small class="pickup-location">${escapeHTML(pickup ? order.fulfilment.pickupAddress : order.customer.unit || '')}</small></p><div class="online-review-items">${order.items.map(i => `<div><span>${escapeHTML(language === 'zh' ? i.name : i.englishName)}<small>${i.style ? escapeHTML(styleName(i.style)) : ''}${i.promo === 'bogo' ? ` · ${bi('买一赠一', 'Buy 1 get 1')}` : ''} × ${i.qty}</small></span><b>${money(i.price*i.qty)}</b></div>`).join('')}</div>${summary(order)}<p class="fineprint">${pickup ? bi('付款后生成取餐号和取餐码，请留意门店叫号。','Your pickup number and QR code appear after payment. Listen for your number at the store.') : bi('支持信用卡及 PayNow。支付成功后提交门店。','Card and PayNow. Sent to the restaurant after successful payment.')}</p><p id="onlineError" class="field-error" role="alert"></p><button class="primary" data-online-pay>${bi('付款','Pay')} ${money(order.total)}</button><button class="online-back" ${pickup ? 'data-action="cart"' : 'data-online-start'}>${pickup ? bi('返回修改菜品','Edit selected items') : bi('修改资料','Edit details')}</button></div>`;
  }
  async function quoteInput(input, isCurrent) {
    if (!isCurrent()) return;
    const out = await store.api('/api/online', input);
    if (!isCurrent() || mode() !== input.mode) return;
    input.expectedTotal = out.order.total; quoted = { input, order:out.order };
    document.activeElement?.blur(); $('#toast').hidden = true;
    renderOnlineReview(input, out.order);
  }
  async function pickupCheckout(enabled, isCurrent) {
    if (enabled && config.locations.length === 1) {
      try {
        await quoteInput({ ...credentials(), mode:'takeaway', items:structuredClone(store.items), note:store.note, pickupLocation:config.locations[0].id, action:'quote' }, isCurrent);
      } catch (e) {
        if (isCurrent()) $('#sheetBody').innerHTML = `<div class="sheet-content fulfilment-content"><h2 id="sheetTitle">${bi('核对自取订单','Review pickup order')}</h2><p class="field-error" role="alert">${escapeHTML(errorText(e))}</p><button class="primary" data-online-start>${bi('重试','Retry')}</button></div>`;
      }
      return;
    }
    $('#sheetBody').innerHTML = `<div class="sheet-content fulfilment-content"><h2 id="sheetTitle">${bi('打包自取','Pickup')}</h2><p>${bi('付款后凭取餐号和取餐码领取。','Collect with your pickup number and QR code after payment.')}</p><form id="onlineForm">${config.locations.length ? `<label class="online-field"><span>${bi('自取门店','Pickup location')}</span><select name="pickupLocation" required>${config.locations.map(l=>`<option value="${escapeHTML(l.id)}" ${formDraft.pickupLocation === l.id ? "selected" : ""}>${escapeHTML(l.name)} — ${escapeHTML(l.address)}</option>`).join('')}</select></label>` : ''}<p id="onlineError" class="field-error" role="alert">${enabled ? '' : bi('线上付款尚未开放；请联系门店。选菜会保留。','Online payment is not available yet. Contact the restaurant; your selection is saved.')}</p><button class="primary" type="submit" ${enabled ? '' : 'disabled'}>${bi('核对订单','Review order')}</button></form></div>`;
  }
  async function checkout() {
    return CheckoutUI.open();
  }
  async function quoteForm(form) {
    const button = form.querySelector('[type="submit"]');
    if (!form.isConnected || modal !== 'online' || button.disabled) return;
    const isCurrent = currentCheckoutView();
    button.disabled = true;
    rememberDraft(form);
    const input = { ...credentials(), mode: mode(), items: structuredClone(store.items), note: store.note,
      customer: { name: formDraft.customerName, phone: formDraft.customerPhone, postalCode: formDraft.postalCode, address: formDraft.address, unit: formDraft.unit },
      date: formDraft.date, slot: formDraft.slot, pickupLocation: formDraft.pickupLocation, action: 'quote' };
    try {
      await quoteInput(input, isCurrent);
    } catch (e) { if (!isCurrent()) return; const error = $('#onlineError'); if (error) error.textContent = errorText(e); button.disabled = false; }
  }
  function previewPayment(order) {
    if (production) return;
    openModal('online','');
    $('#sheetBody').innerHTML = `<div class="sheet-content fulfilment-content"><h2 id="sheetTitle">${bi('本地模拟付款','Local payment simulation')}</h2><p>${bi('仅用于测试，不会扣款或发送至真实厨房。','For testing only. No charge and no real kitchen order.')}</p>${summary(order)}<button class="primary" data-preview-pay>${bi('模拟支付成功','Simulate successful payment')}</button><p id="onlineError" role="alert" class="field-error"></p></div>`;
  }
  function paid() {
    if (typeof CheckoutUI !== 'undefined') CheckoutUI.dispose();
    $('#toast').hidden = true;
    const order = store.orders.filter(o => o.mode === 'takeaway' && !o.collectedAt && !o.resolvedAt).at(-1) || store.orders.at(-1);
    if (order?.mode === 'takeaway' && order.pickup) {
      showPaidOrder(order);
    } else showCart('ordered');
  }
  function showPaidOrder(order) {
    // A presentation of the verified snapshot, never a client-side payment or
    // preparation state. Legacy/unpaid receipts retain their existing renderer.
    if (order.status !== 'paid') return;
    globalThis.RewardsUI?.onPaid();
    const pickup = order.mode === 'takeaway';
    openModal(pickup ? 'pickup' : 'success', tr('订单详情', 'Order details'));
    const when = new Date(order.paidAt || order.at || order.createdAt);
    const time = Number.isNaN(when.getTime()) ? '' : when.toLocaleString(language === 'zh' ? 'zh-CN' : 'en-SG', {timeZone:'Asia/Singapore',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
    $('#sheetBody').innerHTML = `<div class="order-result ${pickup ? 'pickup-success' : 'dinein-success'}"><h2 id="sheetTitle" class="sr-only" tabindex="-1">${bi('订单详情', 'Order details')}</h2><div class="order-result-scroll">
      ${order.freeRewardRefunded ? `<section class="dinein-paid"><h3>${bi('兑换已退还','Reward returned')}</h3><p>${bi('本单兑换券或积分已退回账户。','This order’s voucher or points have been returned.')}</p></section>` : pickup ? pickupTicket(order) : `<section class="dinein-paid"><img src="/brand/order-complete-seal.svg" alt="" width="42" height="42"><p class="eyebrow">${bi('已付款 · 堂食桌号', 'PAID · TABLE')}</p><strong>${escapeHTML(order.table || '')}</strong><p>${bi('下单成功，请在座位稍候。', 'Order placed. Please wait at your table.')}</p></section>`}
      <div class="order-brand-banner"><img src="/brand/pairing-banner-backdrop-v6.webp" alt="" width="1200" height="400" loading="lazy"><span class="order-banner-pattern" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span><img class="order-banner-dish" src="/img/l/potstickers-pork-shrimp-chive-cutaway-v1.webp" alt="${tr('韭菜虾仁猪肉煎饺', 'Pork, Shrimp & Chive Potstickers')}" width="1280" height="1280" loading="lazy"><img class="order-banner-logo" src="/brand/order-packaging-lockup.svg" alt="Dumpling Lab"></div>
      <section class="checkout-block"><h3>${pickup ? escapeHTML(order.fulfilment?.pickupName || 'Dumpling Lab') : 'Dumpling Lab'}</h3>${pickup ? `<p class="pickup-location">${escapeHTML(order.fulfilment?.pickupAddress || '')}</p>` : ''}<div class="checkout-lines">${CheckoutUI.itemsHTML(order)}</div>${order.note ? `<p class="checkout-note">${bi('备注', 'Note')} · ${escapeHTML(order.note)}</p>` : ''}</section>
      <section class="checkout-block checkout-totals"><h3>${bi('付款明细', 'Payment details')}</h3>${summary(order, true)}</section>${globalThis.RewardsUI?.receiptHTML(order)||''}
      <section class="checkout-block"><dl class="order-result-meta">${time ? `<div><dt>${bi('付款时间', 'Payment time')}</dt><dd>${escapeHTML(time)}</dd></div>` : ''}<div><dt>${bi('订单编号', 'Order number')}</dt><dd>${escapeHTML(order.no || order.id)}</dd></div><div><dt>${bi('用餐方式', 'Order type')}</dt><dd>${escapeHTML(label(order.mode))}${pickup ? '' : ` · ${escapeHTML(order.table)} / ${escapeHTML(order.group)}`}</dd></div></dl></section>
      </div><footer class="order-result-footer"><button class="primary" data-action="ordered">${bi('查看全部订单', 'View all orders')}</button></footer></div>`;
    $('#sheetTitle').focus({preventScroll:true});
  }
  function init() {
    stores.set('dinein',store); $('#fulfilmentButton').onclick = select;
    if (!table) {
      let selected; try { selected = localStorage.getItem('atelier-mode'); } catch { /* default */ }
      if (selected === 'takeaway') switchTo(selected,false);
      else if (selected === 'delivery') {
        try { localStorage.setItem('atelier-mode', 'dinein'); } catch { /* chooser still opens */ }
      }
    }
    chrome();
    // Payment recovery takes priority. Valid table QR links enter dine-in
    // directly; generic links still offer dine-in/takeaway.
    if (q.get('online_order')) checkout();
    else if (store.order) checkout();
    else if (remote() && store.orders.some(o => o.mode === 'takeaway' && o.pickup)) paid();
    else if (!table) select({initialEntry:true});
  }
  for (const event of ['input','change']) document.addEventListener(event, e => {
    const form = e.target.closest?.('#onlineForm');
    if (form) rememberDraft(form);
  });
  document.addEventListener('submit', e => { if (e.target.id === 'onlineForm') { e.preventDefault(); quoteForm(e.target); } });
  document.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.fulfilment) {
      if (b.disabled) return;
      if (b.dataset.fulfilment === 'takeaway' && !await refreshPickupChoice(b, false)) {
        if (b.isConnected && b.dataset.pickupOpen === 'unknown') toast(tr('暂时无法确认自提开放状态，请重试','Unable to check pickup availability. Please retry.'));
        return;
      }
      if (!b.isConnected) return;
      return b.dataset.fulfilment === 'visit' ? visit() : switchTo(b.dataset.fulfilment);
    }
    if (b.hasAttribute('data-online-start')) return checkout();
    if (b.hasAttribute('data-online-pay') || b.hasAttribute('data-online-retry') || b.hasAttribute('data-preview-pay')) {
      if (submitting) return; submitting = true; b.disabled = true;
      try {
        if (b.hasAttribute('data-preview-pay') && !production) {
          await store.api('/api/online', { action:'preview-pay', requestId:store.order.requestId, token:store.order.token }); await store.poll();
        } else { await store.poll(); if (modal === 'online') await store.checkoutOnline(quoted?.input || store.order); }
      } catch (err) { const error = $('#onlineError'); if (error) error.textContent = errorText(err); }
      finally { submitting = false; b.disabled = false; }
    }
  });
  return { init, remote, mode, label, chrome, select, checkout, summary, paid, showPaidOrder, previewPayment, pickupTicket, refreshTicket, clearDraft };
})();
