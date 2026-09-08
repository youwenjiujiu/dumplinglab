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
      const res = await fetch(`/api/online?id=${this.order.requestId}`, { headers: { authorization: `Bearer ${this.order.token}` }, cache: 'no-store', signal: AbortSignal.timeout(9000) });
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
  const summary = order => `<dl class="payment-breakdown"><div><dt>${bi('菜品金额（未税）','Food (before GST)')}</dt><dd>${money(order.subtotal)}</dd></div>${order.mode === 'delivery' ? `<div><dt>${bi('配送费 9%','Delivery fee 9%')}</dt><dd>${money(order.deliveryFee)}</dd></div>` : ''}<div><dt>${order.pricingVersion === 'sg-inclusive-gst9-delivery9-v2' ? bi('内含 GST 9%','Included GST 9%') : 'GST 9%'}</dt><dd>${money(order.gst)}</dd></div><div class="payment-total"><dt>${bi('应付总额','Total to pay')}</dt><dd>${money(order.total)}</dd></div></dl>`;
  function chrome() {
    const button = $('#fulfilmentButton');
    button.innerHTML = `<img class="fulfilment-mode-icon" src="/brand/header-${mode()}-v1.svg" alt="" width="32" height="28"><span>${escapeHTML(label())}</span><svg class="fulfilment-chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>`;
    button.ariaLabel = tr(`用餐方式：${label()}，点击切换`, `Order type: ${label()}. Change order type`);
    $('#dineinControls').hidden = remote();
    $('#tableButton').hidden = remote(); $('#serviceButton').hidden = remote();
  }
  // Entry is bilingual before the guest has chosen the app language.
  const entryText = (zh, en) => `<span class="entry-copy"><span lang="zh-CN">${escapeHTML(zh)}</span><span lang="en" class="entry-en">${escapeHTML(en)}</span></span>`;
  function select() {
    openModal('fulfilment', '');
    $('#sheetBody').innerHTML = `<div class="sheet-content fulfilment-content fulfilment-entry" translate="no"><h2 id="sheetTitle">${entryText('选择用餐方式','Choose your order type')}</h2><div class="fulfilment-choices entry-choices"><button data-fulfilment="dinein"><img class="entry-art" src="/brand/entry-dinein-v1.svg" width="260" height="220" alt="" draggable="false"><strong>${entryText('堂食','Dine-in')}</strong></button><button data-fulfilment="takeaway"><img class="entry-art" src="/brand/entry-takeaway-v1.svg" width="260" height="220" alt="" draggable="false"><strong>${entryText('打包外带','Takeaway')}</strong></button></div></div>`;
    $('#closeSheet').ariaLabel = '关闭 / Close';
    const heading = $('#sheetTitle'); heading.tabIndex = -1; heading.focus({preventScroll:true});
  }
  function visit() {
    openModal('fulfilment', '');
    $('#sheetBody').innerHTML = `<div class="sheet-content fulfilment-content"><h2 id="sheetTitle">${bi('到店用餐','At the restaurant')}</h2><div class="fulfilment-choices"><button data-fulfilment="dinein"><strong>${bi('堂食','Dine-in')}</strong><small>${bi('按桌号下单','Order for your table')}</small></button><button data-fulfilment="takeaway"><strong>${bi('打包自取','Pickup')}</strong><small>${bi('无需桌号','No table number needed')}</small></button></div></div>`;
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
    // Original brand marks + the user's preferred steaming dumpling pot.
    // Paper and bag silhouettes are CSS containers for the original marks.
    // Progress remains server-driven; there is no simulated timing or advancement.
    const illustrations = [
      '<i class="progress-order-slip"><em class="progress-slip-logo"></em><em class="progress-slip-items"></em><em class="progress-slip-stamp"></em></i>',
      '<i class="progress-steam"></i><i class="progress-pot"><em></em><em></em><em></em></i>',
      '<i class="progress-brand-bag"><em class="progress-bag-lockup"></em><em class="progress-bag-fold"></em></i>',
      '<i class="progress-seal"></i>',
    ];
    const sync = store.progressSync?.[order.id];
    const note = sync === 'synced' ? bi('状态已更新 · 页面打开时自动刷新','Up to date · Refreshes while this page is open')
      : sync === 'offline' ? bi('暂时无法更新，显示上次记录。请向店员确认。','Unable to refresh. Showing the last saved status; check with staff.')
      : sync === 'unavailable' ? bi('此旧订单暂无法同步，请向店员确认。','This older order cannot be refreshed; check with staff.')
      : bi('正在更新，以下为上次记录…','Refreshing the last saved status…');
    return `<section class="pickup-ticket" data-pickup-id="${escapeHTML(order.id)}" data-stage="${stage}" aria-label="${tr('取餐凭证','Pickup ticket')}">
      <div class="pickup-number"><span lang="zh-CN">取餐号</span><small lang="en">PICKUP NUMBER</small><strong>${escapeHTML(p.number)}</strong></div>
      <ol class="pickup-progress" aria-label="${tr('取餐进度','Order progress')}">${stages.map((s,i)=>`<li class="${i<stages.indexOf(stage)?'is-complete':''}" ${s===stage?'aria-current="step"':''}><span class="progress-art progress-art--${s}" aria-hidden="true">${illustrations[i]}</span><span class="progress-label" lang="zh-CN">${labels[i][0]}</span><small lang="en">${labels[i][1]}</small></li>`).join('')}</ol>
      <p class="pickup-status" role="status"><b>${stage === 'ready' ? bi('餐已备好，请到柜台取餐','Your order is ready. Please collect at the counter.') : stage === 'preparing' ? bi('正在为您制作，请稍候','We are preparing your order.') : stage === 'collected' ? bi('已取餐，祝您用餐愉快','Collected. Enjoy your meal!') : bi('订单已收到，等待制作','Order received. Waiting to be prepared.')}</b><small>${note}</small></p>
      ${stage === 'collected' ? `<div class="pickup-code pickup-code--collected"><span>${bi('本单已完成','Order completed')}</span><small>${escapeHTML(p.date)}</small></div>` : `<div class="pickup-code"><img class="pickup-qr" src="${escapeHTML(p.qr)}" width="140" height="140" alt="${tr('向店员出示此取餐二维码','Show this pickup QR code to staff')}"><div><span>${bi('取餐时出示','Show at collection')}</span><small>${bi('取餐号或二维码','Pickup number or QR code')}</small><small>${escapeHTML(p.date)}</small></div></div>`}
    </section>`;
  }
  function refreshTicket() {
    if (modal !== 'pickup') return;
    const node = $('#sheetBody .pickup-ticket');
    const order = store.orders.find(o => o.id === node?.dataset.pickupId);
    if (node && order) node.outerHTML = pickupTicket(order);
  }
  function renderOnlineReview(input, order) {
    const pickup = order.mode === 'takeaway';
    $('#sheet').scrollTop = 0;
    $('#sheetBody').innerHTML = `<div class="sheet-content fulfilment-content"><h2 id="sheetTitle">${pickup ? bi('核对自取订单','Review pickup order') : bi('确认订单','Review order')}</h2><p class="online-policy">${escapeHTML(label(order.mode))}${pickup ? '' : ` · ${escapeHTML(input.date)} · ${escapeHTML(input.slot)}`}</p><p>${escapeHTML(pickup ? order.fulfilment.pickupName : order.customer.address)}<small class="pickup-location">${escapeHTML(pickup ? order.fulfilment.pickupAddress : order.customer.unit || '')}</small></p><div class="online-review-items">${order.items.map(i => `<div><span>${escapeHTML(language === 'zh' ? i.name : i.englishName)}<small>${i.style ? escapeHTML(styleName(i.style)) : ''} × ${i.qty}</small></span><b>${money(i.price*i.qty)}</b></div>`).join('')}</div>${summary(order)}<p class="fineprint">${pickup ? bi('付款后生成取餐号和取餐码，请留意门店叫号。','Your pickup number and QR code appear after payment. Listen for your number at the store.') : bi('支持信用卡及 PayNow。支付成功后提交门店。','Card and PayNow. Sent to the restaurant after successful payment.')}</p><p id="onlineError" class="field-error" role="alert"></p><button class="primary" data-online-pay>${bi('付款','Pay')} ${money(order.total)}</button><button class="online-back" ${pickup ? 'data-action="cart"' : 'data-online-start'}>${pickup ? bi('返回修改菜品','Edit selected items') : bi('修改资料','Edit details')}</button></div>`;
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
    quoted = null;
    formDraft = readDraft(mode());
    $('#toast').hidden = true;
    clearTimeout(noteTimer); const note = $('#cartNote');
    if (note && note.value !== store.note) store.mutate({kind:'note',note:note.value});
    noteDraft = null;
    if (store.order) {
      openModal('online', '');
      $('#sheetBody').innerHTML = `<div class="sheet-content fulfilment-content"><h2 id="sheetTitle">${bi('等待付款确认','Awaiting payment')}</h2><p>${bi('付款成功后才会提交门店；未付款不会重复下单。','Your order reaches the restaurant after payment. Retrying will not duplicate it.')}</p><button class="primary" data-online-retry>${bi('继续付款 / 查询状态','Continue payment / Check status')}</button><p id="onlineError" class="field-error" role="alert"></p></div>`;
      return;
    }
    if (!store.items.length) return showCart();
    openModal('online', '');
    $('#sheetBody').innerHTML = `<div class="sheet-content fulfilment-content"><h2 id="sheetTitle">${escapeHTML(label())}</h2><p role="status">${bi('正在核对订单…','Checking your order…')}</p></div>`;
    const isCurrent = currentCheckoutView();
    let nextConfig;
    try { nextConfig = await getConfig(); } catch (e) { if (isCurrent()) $('#sheetBody').innerHTML = `<div class="sheet-content"><h2 id="sheetTitle">${bi('暂时无法读取下单信息','Unable to load order details')}</h2><button class="secondary" data-online-start>${bi('重试','Retry')}</button></div>`; return; }
    if (!isCurrent()) return;
    config = nextConfig;
    const delivery = mode() === 'delivery', enabled = delivery ? config.deliveryEnabled : config.takeawayEnabled;
    if (!delivery) return pickupCheckout(enabled, isCurrent);
    const options = (values, selected) => values.map(v => `<option value="${escapeHTML(v)}" ${v === selected ? 'selected' : ''}>${escapeHTML(v)}</option>`).join('');
    $('#sheetBody').innerHTML = `<div class="sheet-content fulfilment-content"><h2 id="sheetTitle">${escapeHTML(label())}</h2><p class="online-policy">${delivery ? bi('10 km 内 · 菜品未税满 $100 · 配送费 9%','Within 10 km · $100 food minimum before GST · 9% delivery fee') : bi('预约自取，无需桌号','Scheduled pickup. No table number needed.')}</p><form id="onlineForm"><div class="online-fields">${field('customerName', bi('姓名','Name'), 'required maxlength="60" autocomplete="name"')}${field('customerPhone', bi('手机号码','Phone'), 'type="tel" required maxlength="24" autocomplete="tel" placeholder="+65"')}${delivery ? `${field('postalCode',bi('邮编','Postal code'),'required inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="postal-code"')}${field('address',bi('配送地址','Address'),'required maxlength="180" autocomplete="street-address"')}${field('unit',bi('楼层 / 单位号（选填）','Unit / floor (optional)'),'maxlength="40" autocomplete="address-line2"')}` : `<label class="online-field"><span>${bi('自取门店','Pickup location')}</span><select name="pickupLocation" required>${config.locations.map(l => `<option value="${escapeHTML(l.id)}" ${formDraft.pickupLocation === l.id ? 'selected' : ''}>${escapeHTML(l.name)} — ${escapeHTML(l.address)}</option>`).join('')}</select></label>`}<label class="online-field"><span>${bi('日期','Date')}</span><select name="date" required><option value="">${bi('选择日期','Select date')}</option>${options(config.dates,formDraft.date)}</select></label><label class="online-field"><span>${bi('时段','Time slot')}</span><select name="slot" required><option value="">${bi('选择时段','Select slot')}</option>${options(config.slots,formDraft.slot)}</select></label></div><p class="fineprint">${bi('提前一天预订，次日订单前晚 21:00 截止。时间以新加坡为准。','Order at least one day ahead; next-day cutoff is 9 pm Singapore time.')}</p>${summary({...OrderPricing.quote(total(store.items),mode()),mode:mode()})}<p class="field-error" id="onlineError" role="alert">${enabled ? '' : bi('线上付款尚未开放；请联系门店。选菜会保留。','Online payment is not available yet. Please contact the restaurant. Your selection is saved.')}</p><button class="primary" type="submit" ${enabled ? '' : 'disabled'}>${bi('核对订单','Review order')}</button></form></div>`;
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
    $('#toast').hidden = true;
    const order = store.orders.filter(o => o.mode === 'takeaway' && !o.collectedAt && !o.resolvedAt).at(-1) || store.orders.at(-1);
    if (order?.mode === 'takeaway' && order.pickup) {
      openModal('pickup','');
      $('#sheetBody').innerHTML = `<div class="sheet-content fulfilment-content pickup-success"><h2 id="sheetTitle" tabindex="-1">${bi('取餐凭证','Your pickup ticket')}</h2>${pickupTicket(order)}<p>${escapeHTML(order.fulfilment.pickupName)}<small class="pickup-location">${escapeHTML(order.fulfilment.pickupAddress)}</small></p><button class="primary" data-action="ordered">${bi('查看订单','View order')}</button></div>`;
      $('#sheetTitle').focus({preventScroll:true});
    } else showCart('ordered');
  }
  function init() {
    stores.set('dinein',store); $('#fulfilmentButton').onclick = select;
    if (!q.get('table')) {
      let selected; try { selected = localStorage.getItem('atelier-mode'); } catch { /* default */ }
      if (selected === 'takeaway') switchTo(selected,false);
      else if (selected === 'delivery') {
        try { localStorage.setItem('atelier-mode', 'dinein'); } catch { /* chooser still opens */ }
      }
    }
    chrome();
    // Payment returns recover their pending transaction; every normal page/QR
    // entry explicitly offers dine-in/takeaway, even with a saved preference.
    if (q.get('online_order') && remote()) checkout();
    else if (store.order) { if (remote()) checkout(); else showCart(); }
    else if (remote() && store.orders.some(o => o.mode === 'takeaway' && o.pickup)) paid();
    else select();
  }
  for (const event of ['input','change']) document.addEventListener(event, e => {
    const form = e.target.closest?.('#onlineForm');
    if (form) rememberDraft(form);
  });
  document.addEventListener('submit', e => { if (e.target.id === 'onlineForm') { e.preventDefault(); quoteForm(e.target); } });
  document.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.fulfilment) return b.dataset.fulfilment === 'visit' ? visit() : switchTo(b.dataset.fulfilment);
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
  return { init, remote, mode, label, chrome, select, checkout, summary, paid, previewPayment, pickupTicket, refreshTicket, clearDraft };
})();
