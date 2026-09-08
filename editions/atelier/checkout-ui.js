// One checkout surface for dine-in and pickup. Stripe owns all sensitive inputs.
const CheckoutUI = (() => {
  let active = null, stripeScript = null, contactEmail = '';
  const freshCredentials = () => ({ requestId: crypto.randomUUID(), token: [...crypto.getRandomValues(new Uint8Array(32))].map(v => v.toString(16).padStart(2, '0')).join('') });
  const current = view => active === view && view.node.isConnected && store === view.owner;
  function error(view, message) { if (current(view)) view.node.querySelector('[data-checkout-error]').textContent = message; }
  const locked = e => e?.code === 'PAYMENT_PENDING' || /本组正在付款|同桌正在支付本单/.test(e?.message || '');
  const pendingError = () => Object.assign(new Error('本组有未完成的付款。请在发起付款的原设备和浏览器继续，或在那里取消付款后再试。'), { code: 'PAYMENT_PENDING' });
  function recovery(view, problem) {
    if (!current(view)) return;
    view.element?.destroy(); view.element = null; view.actions = null;
    const own = Boolean(view.owner.order?.token), blocked = locked(problem);
    const message = blocked ? errorText(pendingError()) : errorText(problem);
    view.node.innerHTML = `<div class="checkout-scroll checkout-recovery"><p class="eyebrow">DUMPLING LAB</p><header class="checkout-heading"><h2 id="sheetTitle">${blocked ? bi('本组有待付款订单', 'Payment pending') : bi('暂时无法继续', 'Unable to continue')}</h2></header>
      <p class="field-error" data-checkout-error role="alert">${escapeHTML(message)}</p>
      <p class="fineprint">${bi('已选菜品与付款凭证会保留，请勿重复付款。', 'Your selection and payment access are retained. Please do not pay twice.')}</p>
      <button class="primary" type="button" data-checkout-retry>${own ? bi('检查并继续原付款', 'Check & resume payment') : bi('重新检查', 'Check again')}</button>
      ${own && !view.confirmed ? `<button class="online-back" type="button" data-checkout-edit>${bi('取消原付款并修改菜品', 'Cancel payment & edit order')}</button>` : ''}
      <button class="online-back" type="button" data-checkout-back>${bi('返回菜单', 'Back to menu')}</button></div>`;
  }
  async function readCart(owner) {
    const out = await owner.api(`/api/cart?table=${encodeURIComponent(owner.table)}&group=${encodeURIComponent(owner.group)}`);
    owner.remote = out.cart;
    if (owner.order && !owner.order.token && out.cart.orders?.some(o => o.id === owner.order.requestId)) owner.order = null;
    owner.emit();
    return out.cart;
  }
  async function sendCheckout(owner, request) {
    try { return await owner.api('/api/online', { ...request, action: 'checkout' }); }
    catch (e) {
      // PAYMENT_PENDING is raised before this request is reserved or persisted.
      // Do not retain a losing request as if it owned the other payer's session.
      if (locked(e) && owner.order?.requestId === request.requestId) { owner.order = null; owner.emit(); }
      throw e;
    }
  }
  function dispose() {
    const email = active?.node.querySelector('[data-checkout-email]');
    if (typeof email?.value === 'string') contactEmail = email.value.slice(0, 254);
    active?.element?.destroy();
    active = null;
  }
  async function loadStripe() {
    if (globalThis.Stripe) return;
    if (!stripeScript) stripeScript = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/dahlia/stripe.js';
      script.onload = resolve;
      script.onerror = () => { script.remove(); stripeScript = null; reject(new Error(tr('付款组件加载失败，请重试', 'Payment form failed to load. Please retry.'))); };
      document.head.append(script);
    });
    await stripeScript;
  }
  function addons(order) {
    const preferred = ['lunch-v2-barley', 'lunch-v2-sour-plum', 'lunch-v2-soft-egg', 'lunch-v2-cucumber'];
    return preferred.map(id => dish(id)).filter(d => d && !d.soldOut && !d.styles &&
      !order.items.some(i => i.id === d.id)).map(d => `<article class="checkout-addon"><div class="checkout-addon-photo"><img src="${escapeHTML(photo(d, 's'))}" alt="" width="120" height="104" loading="lazy"></div><strong>${escapeHTML(name(d))}</strong><div><span>${money(itemPrice(d))}</span><button type="button" data-checkout-addon="${escapeHTML(d.id)}" aria-label="${escapeHTML(tr('加一份', 'Add one') + ' ' + name(d))}">+</button></div></article>`).join('');
  }
  function itemsHTML(order) {
    return order.items.map(i => `<article>${dish(i.id)?.img ? `<img src="${escapeHTML(photo(dish(i.id), 's', i.style))}" alt="" width="80" height="80">` : ''}<div><strong>${escapeHTML(language === 'zh' ? i.name : i.englishName)}</strong>${i.style ? `<small>${escapeHTML(styleName(i.style))}</small>` : ''}<small>× ${i.qty}</small></div><b>${money(i.price * i.qty)}</b></article>`).join('');
  }
  function draw(view) {
    const { order, config } = view, dining = order.mode === 'dinein', extras = addons(order);
    view.node.innerHTML = `<h2 id="sheetTitle" class="sr-only">${bi('确认订单', 'Your order')}</h2><div class="checkout-scroll">
      <section class="checkout-location"><img src="/brand/header-${dining ? 'dinein' : 'takeaway'}-v1.svg" width="44" height="40" alt=""><div><p class="eyebrow">DUMPLING LAB</p><h3>${dining ? `${bi('堂食', 'Dine-in')} · ${escapeHTML(order.table)}` : bi('打包自取', 'Pickup')}</h3><p>${dining ? `${bi('点餐组', 'Group')} ${escapeHTML(order.group)} · ${bi('请确认桌号后付款', 'Check your table before paying')}` : `${escapeHTML(order.fulfilment.pickupName || '')}<br>${escapeHTML(order.fulfilment.pickupAddress || '')}`}</p></div></section>
      <section class="checkout-block"><h3>${bi('本次点单', 'Order summary')}<button class="checkout-text-action" type="button" data-checkout-edit>${bi('修改', 'Edit')}</button></h3><div class="checkout-lines">${itemsHTML(order)}</div>${order.note ? `<p class="checkout-note">${bi('备注', 'Note')} · ${escapeHTML(order.note)}</p>` : ''}</section>
      ${extras ? `<section class="checkout-block checkout-addons"><h3>${bi('搭配加点', 'Add-ons')}<small>${bi('再来一点，刚刚好', 'A little extra')}</small></h3><div class="checkout-addon-list" tabindex="0" role="region" aria-label="${tr('可选加购菜品', 'Optional add-ons')}">${extras}</div></section>` : ''}
      <section class="checkout-block checkout-totals"><h3>${bi('费用明细', 'Order total')}<small>${order.items.reduce((n,i) => n + i.qty, 0)} ${bi('份', 'items')}</small></h3>${Fulfilment.summary(order)}</section>
      <section class="checkout-block checkout-payment"><h3>${bi('支付方式', 'Payment methods')}<small>Stripe</small></h3><div data-payment-element><p class="fineprint" role="status">${config.preview ? bi('本地流程演示，不会扣款。', 'Local demonstration. No charge.') : view.enabled ? bi('正在加载安全支付…', 'Loading secure payment…') : bi('线上付款尚未开放，选菜会保留。', 'Online payments are not open yet. Your selection is saved.')}</p></div>
      ${!config.preview ? `<label class="online-field checkout-email"><span>${bi('电子邮箱', 'Email')}</span><input data-checkout-email type="email" autocomplete="email" inputmode="email" autocapitalize="none" spellcheck="false" required maxlength="254" placeholder="you@example.com" value="${escapeHTML(contactEmail)}" aria-describedby="checkoutEmailHint"></label><p class="fineprint" id="checkoutEmailHint">${bi('用于完成付款，不会订阅营销邮件。', 'Required for payment. No marketing subscription.')}</p>` : ''}</section></div>
      <footer class="checkout-paybar"><p class="field-error" data-checkout-error role="alert"></p><p class="checkout-pay-note">${bi('支付成功后，订单才会发送至门店', 'Your order is sent only after successful payment')}</p><button class="primary" type="button" data-checkout-pay disabled><span>${config.preview ? bi('模拟付款', 'Simulate payment') : bi('付款并下单', 'Pay & order')}</span><span data-stripe-total>${money(order.total)}</span></button></footer>`;
  }
  async function prepare(view) {
    const owner = view.owner;
    if (!owner.order) {
      owner.order = { ...view.input, action: 'checkout' };
      owner.persist();
      if (!owner.storageAvailable) { owner.order = null; throw new Error(tr('请允许网站存储以保留付款凭证', 'Allow storage to retain payment access')); }
    }
    const request = owner.order;
    const out = await sendCheckout(owner, request);
    if (owner.order !== request) return;
    owner.emit();
    if (out.order.status === 'paid') { await refresh(owner); return; }
    if (!current(view)) return;
    view.prepared = true;
    if (view.config.preview) {
      view.node.querySelector('[data-payment-element]').innerHTML = `<p class="checkout-demo">${bi('本地模拟支付 · 非真实支付方式', 'Local simulation · Not a real payment method')}</p>`;
      view.node.querySelector('[data-checkout-pay]').disabled = false;
      return;
    }
    if (!out.clientSecret || !view.config.publishableKey) throw new Error(tr('付款配置不完整，选菜已保留', 'Payment setup is incomplete. Your selection is saved.'));
    await loadStripe();
    if (!current(view)) return;
    const stripe = Stripe(view.config.publishableKey, { locale: language === 'zh' ? 'zh' : 'en' });
    view.checkout = stripe.initCheckoutElementsSdk({ clientSecret: out.clientSecret, elementsOptions: { appearance: {
      theme: 'stripe', variables: { colorPrimary: '#983f32', colorText: '#302a24', borderRadius: '8px', fontFamily: 'Arial, sans-serif' },
    } } });
    const loaded = await view.checkout.loadActions();
    if (!current(view)) return;
    if (loaded.type !== 'success') throw new Error(tr('无法加载付款信息，请重试', 'Unable to load payment. Please retry.'));
    view.actions = loaded.actions;
    const session = view.actions.getSession();
    view.node.querySelector('[data-stripe-total]').textContent = session.total.total.amount;
    view.element = view.checkout.createPaymentElement({ layout: { type: 'accordion', radios: 'always', spacedAccordionItems: false, visibleAccordionItemsCount: 0 }, paymentMethodOrder: ['apple_pay', 'paynow', 'card'] });
    const mount = view.node.querySelector('[data-payment-element]'); mount.replaceChildren();
    view.element.mount(mount);
    view.element.on('ready', () => { if (current(view)) view.node.querySelector('[data-checkout-pay]').disabled = false; });
    view.element.on('loaderror', () => error(view, tr('安全支付加载失败，请返回后重试', 'Secure payment failed to load. Go back and retry.')));
  }
  async function open() {
    dispose();
    const owner = store;
    clearTimeout(noteTimer);
    const note = $('#cartNote');
    const editedNote = note?.value;
    openModal('online', tr('确认订单', 'Your order'));
    $('#sheetBody').innerHTML = `<div class="sheet-content checkout-page"><h2 id="sheetTitle" class="sr-only">${bi('确认订单', 'Your order')}</h2><div class="checkout-scroll checkout-loading"><span class="checkout-loader" aria-hidden="true"></span><p role="status">${bi('正在核对订单…', 'Checking your order…')}</p><p class="fineprint">${bi('确认菜品与金额后即可付款', 'Checking your dishes and total before payment')}</p><p class="field-error" data-checkout-error role="alert"></p></div></div>`;
    const view = active = { owner, node: $('#sheetBody').firstElementChild, busy: true };
    try {
      const dining = Fulfilment.mode() === 'dinein';
      // Resume the exact owned payment BEFORE flushing drafts: its reservation
      // intentionally rejects edits until payment completes or is cancelled.
      if (!owner.order?.token) {
        if (dining && (await readCart(owner)).paymentPending) throw pendingError();
        if (!current(view)) return;
        if (editedNote !== undefined && editedNote !== owner.note && !owner.order) owner.mutate({ kind: 'note', note: editedNote });
        noteDraft = null;
        await owner.flush();
        if (dining && (await readCart(owner)).paymentPending) throw pendingError();
        if (!current(view)) return;
        if (owner.pending?.length) throw new Error('订单同步未完成，请重新检查。');
        if (owner.noteConflict) throw new Error(tr('请先处理备注冲突', 'Resolve the note conflict first'));
      }
      view.config = (await owner.api('/api/online')).config;
      if (!current(view)) return;
      view.enabled = dining ? view.config.dineinEnabled : view.config.takeawayEnabled;
      if (owner.order && !owner.order.token) throw new Error(tr('旧订单需要先核实，请联系店员', 'Please ask staff to check the previous order'));
      if (!owner.order && !owner.items.length) return showCart();
      if (!dining && !view.config.locations?.length) throw new Error(tr('自取门店尚未配置，选菜已保留', 'Pickup location is not configured. Your selection is saved.'));
      if (!dining && view.config.locations.length > 1 && !owner.order) throw new Error(tr('请先确认自取门店', 'Please confirm the pickup location first'));
      view.input = owner.order || { ...freshCredentials(), mode: dining ? 'dinein' : 'takeaway',
        items: structuredClone(owner.items), note: owner.note,
        ...(dining ? { table: owner.table, group: owner.group, cartOpIds: [...owner.remote.opIds], actorName: owner.nickname } : { pickupLocation: view.config.locations[0].id }) };
      let result;
      if (owner.order) {
        try { result = await readPayment(owner); }
        catch (e) {
          if (e.status !== 404) throw e;
          result = await sendCheckout(owner, owner.order);
        }
      } else result = await owner.api('/api/online', { ...view.input, action: 'quote' });
      view.order = result.order;
      if (!current(view)) return;
      if (view.order.status === 'paid' || view.order.status === 'expired') {
        view.confirmed = view.order.status === 'paid';
        await refresh(owner);
        if (current(view)) recovery(view, new Error(view.confirmed ? '付款已完成，正在同步订单，请勿重复支付。' : '付款已过期，请重新确认订单'));
        return;
      }
      view.input.expectedTotal = view.order.total;
      draw(view);
      if (view.enabled) {
        view.busy = true;
        try { await prepare(view); } finally { view.busy = false; }
      }
    } catch (e) { recovery(view, e); }
    finally { view.busy = false; }
  }
  async function readPayment(owner) {
    const pending = owner.order;
    const response = await fetch(`/api/online?id=${encodeURIComponent(pending.requestId)}`, { headers: { authorization: `Bearer ${pending.token}` }, cache: 'no-store', signal: AbortSignal.timeout(9000) });
    const result = await response.json();
    if (!response.ok || !result.ok) throw Object.assign(new Error(result.error || 'Unable to check payment'), { status: response.status });
    return result;
  }
  async function refresh(owner = store) {
    if (!owner.order?.token || owner.paymentPolling) return;
    owner.paymentPolling = true;
    try {
      const result = await readPayment(owner), order = result.order;
      if (order.status === 'paid' && (order.mode !== 'dinein' || order.fulfilmentCommitted)) {
        if (order.mode === 'dinein') {
          owner.order = null; await owner.poll(); owner.emit();
          if (store === owner) { dispose(); openModal('success', ''); SharedTable.confirm(order); }
        } else await owner.poll();
      } else if (order.status === 'expired') {
        owner.order = null; owner.emit();
        if (store === owner) { dispose(); showCart(); toast(tr('付款已取消或过期，菜品已保留', 'Payment cancelled or expired. Your selection is saved.')); }
      }
    } catch { /* Retain credentials and avoid duplicate orders during outages. */ }
    finally { owner.paymentPolling = false; }
  }
  async function change(view, addon) {
    if (view.owner.order) {
      // Never unlock a payable basket until the provider confirms expiration.
      await view.owner.api('/api/online', { ...view.owner.order, action: 'cancel' });
      view.owner.order = null; view.owner.emit();
      if (view.owner.table) await readCart(view.owner);
    }
    if (!current(view)) return;
    if (addon) {
      const scroll = view.node.querySelector('.checkout-scroll')?.scrollTop || 0;
      view.owner.mutate({ kind: 'delta', dishId: addon, delta: 1 }); await view.owner.flush(); await open();
      if (active?.owner === view.owner && active.prepared && current(active)) {
        active.node.querySelector('.checkout-scroll').scrollTop = scroll;
        toast(tr('已加到本单，金额已更新', 'Added to your order. Total updated.'));
      }
    }
    else { dispose(); showCart(); }
  }
  document.addEventListener('click', async e => {
    const button = e.target.closest('[data-checkout-pay], [data-checkout-edit], [data-checkout-addon], [data-checkout-retry], [data-checkout-back]');
    const view = active;
    if (!button || !view || !current(view) || view.busy) return;
    view.busy = true; button.disabled = true;
    error(view, '');
    try {
      if (button.hasAttribute('data-checkout-back')) { closeModal(); return; }
      if (button.hasAttribute('data-checkout-retry')) { await open(); return; }
      if (button.hasAttribute('data-checkout-pay')) {
        if (view.config.preview && !production) {
          await view.owner.api('/api/online', { ...view.owner.order, action: 'preview-pay' });
        } else {
          if (!view.actions) throw new Error(tr('支付方式尚未加载', 'Payment methods are still loading'));
          const email = view.node.querySelector('[data-checkout-email]');
          if (!email.reportValidity()) return;
          const result = await view.actions.confirm({ redirect: 'if_required', email: email.value.trim() });
          if (result.type === 'error') throw new Error(result.error.message);
        }
        view.confirmed = true;
        if (current(view)) error(view, tr('正在确认付款，请勿重复支付…', 'Confirming payment. Please do not pay again…'));
        await refresh(view.owner);
      } else await change(view, button.dataset.checkoutAddon);
    } catch (err) { error(view, errorText(err)); }
    finally { view.busy = false; if (button.isConnected) button.disabled = button.hasAttribute('data-checkout-pay') && Boolean(view.confirmed); }
  });
  setInterval(() => { if (!document.hidden && store?.order?.token && Fulfilment.mode() === 'dinein') refresh(store); }, 3000);
  return { open, refresh, dispose, itemsHTML };
})();
