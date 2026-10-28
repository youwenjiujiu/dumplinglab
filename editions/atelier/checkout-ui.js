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
    view.picker?.close();
    view.express?.destroy(); view.express = null;
    view.element?.destroy(); view.element = null; view.actions = null;
    const own = Boolean(view.owner.order?.token), blocked = locked(problem);
    const message = blocked ? errorText(pendingError()) : errorText(problem);
    view.node.innerHTML = `<div class="checkout-scroll checkout-recovery"><p class="eyebrow">DUMPLING LAB</p><header class="checkout-heading"><h2 id="sheetTitle">${blocked ? bi('本组有待付款订单', 'Payment pending') : bi('暂时无法继续', 'Unable to continue')}</h2></header>
      <p class="field-error" data-checkout-error role="alert">${escapeHTML(message)}</p>
      <p class="fineprint">${bi('已选菜品与付款凭证会保留，请勿重复付款。', 'Your selection and payment access are retained. Please do not pay twice.')}</p>
      <button class="primary" type="button" data-checkout-retry>${own ? bi('检查并继续原付款', 'Check & resume payment') : bi('重新检查', 'Check again')}</button>
      ${own && !view.confirmed ? `<button class="online-back" type="button" data-checkout-edit>${bi('取消原付款并修改菜品', 'Cancel payment & edit order')}</button>` : ''}
      ${blocked && !own ? `<button class="online-back" type="button" data-table-unlock>${bi('取消同桌的付款，由我来付', 'Cancel their payment & pay here')}</button>` : ''}
      ${view.owner.order?.paymentMethod==='wallet'||globalThis.WalletUI?.input(view.owner).paymentMethod==='wallet'?`<button class="online-back" type="button" data-checkout-wallet>${bi('改用其他支付方式','Use another payment method')}</button>`:''}
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
      if ((locked(e) || e?.code === 'CHECKOUT_CART_CHANGED') && owner.order?.requestId === request.requestId) { owner.order = null; owner.emit(); }
      throw e;
    }
  }
  function dispose() {
    active?.picker?.close();
    const email = active?.node.querySelector('[data-checkout-email]');
    if (typeof email?.value === 'string') contactEmail = email.value.slice(0, 254);
    active?.express?.destroy();
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
    return AddonUI.section(order);
  }
  function chooseAddons(view, preselect = null) {
    if (view.picker || view.confirmed || !current(view)) return;
    view.picker = AddonUI.show(view.order, {host:view.node, preselect,
      onClose:() => { view.picker = null; },
      onApply: async items => {
        // The picker can be used while Stripe starts. Serialize basket changes
        // behind session creation so a late response cannot lock the old basket.
        await view.preparation;
        if (!current(view) || view.busy || view.confirmed) throw new Error(tr('请重新确认订单', 'Please check your order again'));
        view.busy = true;
        try { await change(view, items); }
        catch (e) {
          // Once a cancelled payment's basket has changed, don't let a retry
          // add the same selection twice. Recover through the authoritative cart.
          if (view.changed) { view.picker?.close(); recovery(view, e); }
          throw e;
        } finally { view.busy = false; }
      },
    });
  }
  function itemsHTML(order) {
    const line = (i, qty) => `<article>${dish(i.id)?.img ? `<img src="${escapeHTML(photo(dish(i.id), 's', i.style))}" alt="" width="80" height="80">` : ''}<div><strong>${escapeHTML(language === 'zh' ? i.name : i.englishName)}</strong>${i.style ? `<small>${escapeHTML(styleName(i.style))}</small>` : ''}${i.note ? `<small class="cart-line-note">${escapeHTML(i.note)}</small>` : ''}<small>× ${qty}</small></div><b>${money(i.price * qty)}</b></article>`;
    // A voucher pays for exactly one unit of its dish. That unit is a gift, not
    // a purchase, so it gets its own quieter line at $0 rather than sitting in
    // the list at full price.
    const l = order.loyalty, gift = l?.voucherId && l.discountCents ? order.items.find(i => i.id === l.dishId && (i.style || null) === (l.style || null)) : null;
    const giftLine = i => `<article class="is-gift">${dish(i.id)?.img ? `<img src="${escapeHTML(photo(dish(i.id), 's', i.style))}" alt="" width="48" height="48">` : ''}<div><span class="gift-tag">${bi('赠品', 'Gift')}</span><strong>${escapeHTML(language === 'zh' ? i.name : i.englishName)}</strong></div><b>${money(0)}</b></article>`;
    // 买一赠一 units arrive from the server as their own $0 line.
    const bogoLine = i => `<article class="is-gift">${dish(i.id)?.img ? `<img src="${escapeHTML(photo(dish(i.id), 's', i.style))}" alt="" width="48" height="48">` : ''}<div><span class="gift-tag">${bi('买一赠一', 'Buy 1 get 1')}</span><strong>${escapeHTML(language === 'zh' ? i.name : i.englishName)}</strong>${i.style ? `<small>${escapeHTML(styleName(i.style))}</small>` : ''}<small>× ${i.qty}</small></div><b>${money(0)}</b></article>`;
    const paid = order.items.flatMap(i => i.promo === 'bogo' ? [bogoLine(i)] : i !== gift ? [line(i, i.qty)] : i.qty > 1 ? [line(i, i.qty - 1)] : []);
    return [...paid, ...(gift ? [giftLine(gift)] : [])].join('');
  }
  function draw(view) {
    const { order, config } = view, dining = order.mode === 'dinein', extras = addons(order);
    view.node.innerHTML = `<h2 id="sheetTitle" class="sr-only">${bi('确认订单', 'Your order')}</h2><div class="checkout-scroll">
      <section class="checkout-location"><img src="/brand/header-${dining ? 'dinein' : 'takeaway'}-v1.svg" width="44" height="40" alt=""><div><p class="eyebrow">DUMPLING LAB</p><h3>${dining ? `${bi('堂食', 'Dine-in')} · ${escapeHTML(order.table)}` : bi('打包自取', 'Pickup')}</h3><p>${dining ? `${bi('点餐组', 'Group')} ${escapeHTML(order.group)} · ${bi('请确认桌号后付款', 'Check your table before paying')}` : `${escapeHTML(order.fulfilment.pickupName || '')}<br>${escapeHTML(order.fulfilment.pickupAddress || '')}`}</p></div></section>
      <section class="checkout-block"><h3>${bi('本次点单', 'Order summary')}<button class="checkout-text-action" type="button" data-checkout-edit>${bi('修改', 'Edit')}</button></h3><div class="checkout-lines">${itemsHTML(order)}</div>${order.note ? `<p class="checkout-note">${bi('备注', 'Note')} · ${escapeHTML(order.note)}</p>` : ''}</section>
      ${globalThis.RewardsUI?.checkoutHTML(order)||''}
      ${extras}
      <section class="checkout-block checkout-totals"><h3>${bi('费用明细', 'Order total')}<small>${order.items.reduce((n,i) => n + i.qty, 0)} ${bi('份', 'items')}</small></h3>${Fulfilment.summary(order)}</section>
      <section class="checkout-block checkout-payment"><h3>${bi('支付方式', 'Payment methods')}<small>${order.paymentMethod==='wallet'?bi('余额','Balance'):order.total===0?bi('兑换','Reward'):bi('银行卡 / PayNow','Card / PayNow')}</small></h3>${globalThis.WalletUI?.paymentHTML(order)||''}<div class="checkout-express" data-express-checkout hidden><div data-express-element></div></div><div data-payment-element><p class="fineprint" role="status">${config.preview ? bi('本地流程演示，不会扣款。', 'Local demonstration. No charge.') : view.enabled ? bi('正在加载安全支付…', 'Loading secure payment…') : bi('线上付款尚未开放，选菜会保留。', 'Online payments are not open yet. Your selection is saved.')}</p></div>
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
    if(out.walletPayment){view.walletPayment=true;view.node.querySelector('[data-payment-element]').textContent=tr('确认下单后从余额扣款。','Your balance is charged when you confirm.')+(view.order.walletAllocation?tr(` 本金 ${money(view.order.walletAllocation.principalCents/100)}，赠金 ${money(view.order.walletAllocation.bonusCents/100)}。`,` Principal ${money(view.order.walletAllocation.principalCents/100)}, bonus ${money(view.order.walletAllocation.bonusCents/100)}.`):'');view.node.querySelector('.checkout-email')?.remove();view.node.querySelector('#checkoutEmailHint')?.remove();const pay=view.node.querySelector('[data-checkout-pay]');pay.innerHTML=`<span>${bi('余额支付并下单','Pay with balance & order')}</span><span>${money(view.order.total)}</span>`;pay.disabled=false;return;}
    if(out.freeRedemption){
      view.freeRedemption=true;view.node.querySelector('[data-payment-element]').textContent=tr('本单已全额兑换，无需支付。确认后发送至门店。','Fully covered by your reward. Confirm to send to the store.');
      view.node.querySelector('.checkout-email')?.remove();view.node.querySelector('#checkoutEmailHint')?.remove();
      const pay=view.node.querySelector('[data-checkout-pay]');pay.textContent=tr('确认兑换并下单','Confirm reward & order');pay.disabled=false;return;
    }
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
      theme: 'flat', variables: { colorPrimary: '#983f32', colorText: '#302a24', colorBackground: '#ffffff', borderRadius: '4px', fontFamily: 'Arial, sans-serif', fontSizeBase: '14px', spacingUnit: '3px' },
      rules: {
        '.AccordionItem': { border: '0', borderBottom: '1px solid #ece9e6', boxShadow: 'none', borderRadius: '0' },
        '.AccordionItem--selected': { boxShadow: 'none' },
        '.Block': { boxShadow: 'none', border: '0' },
      },
    } } });
    const loaded = await view.checkout.loadActions();
    if (!current(view)) return;
    if (loaded.type !== 'success') throw new Error(tr('无法加载付款信息，请重试', 'Unable to load payment. Please retry.'));
    view.actions = loaded.actions;
    const session = view.actions.getSession();
    view.node.querySelector('[data-stripe-total]').textContent = session.total.total.amount;
    view.element = view.checkout.createPaymentElement({ layout: { type: 'accordion', defaultCollapsed: true, radios: 'always', spacedAccordionItems: false, visibleAccordionItemsCount: 0 }, paymentMethodOrder: ['paynow', 'card'], wallets: { applePay: 'auto' } });
    const mount = view.node.querySelector('[data-payment-element]'); mount.replaceChildren();
    view.element.mount(mount);
    view.element.on('ready', () => { if (current(view)) view.node.querySelector('[data-checkout-pay]').disabled = false; });
    view.element.on('loaderror', () => error(view, tr('安全支付加载失败，请返回后重试', 'Secure payment failed to load. Go back and retry.')));
    mountApplePay(view);
  }
  function mountApplePay(view) {
    // Let Stripe detect device/wallet eligibility; never draw a fake Apple Pay button.
    const container = view.node.querySelector('[data-express-checkout]');
    try {
      const express = view.checkout.createExpressCheckoutElement({
        buttonHeight: 48, buttonTheme: { applePay: 'black' }, buttonType: { applePay: 'pay' },
        paymentMethods: { applePay: 'auto', googlePay: 'never', link: 'never', paypal: 'never', amazonPay: 'never', klarna: 'never' },
      });
      view.express = express;
      express.on('ready', event => {
        if (current(view) && view.express === express) container.hidden = !event.availablePaymentMethods?.applePay;
      });
      express.on('loaderror', () => { if (current(view) && view.express === express) container.hidden = true; });
      express.on('confirm', async event => {
        if (!current(view) || view.express !== express || view.busy || view.confirmed || !view.actions) {
          event.paymentFailed?.({ reason: 'fail' }); return;
        }
        const pay = view.node.querySelector('[data-checkout-pay]');
        view.busy = true; pay.disabled = true; error(view, '');
        try {
          // Wallet contact data avoids forcing an extra email entry before Apple Pay.
          const email = event.billingDetails?.email || view.node.querySelector('[data-checkout-email]')?.value?.trim();
          const result = await view.actions.confirm({
            expressCheckoutConfirmEvent: event, redirect: 'if_required', ...(email ? { email } : {}),
          });
          if (result.type === 'error') throw new Error(result.error.message);
          view.confirmed = true;
          if (current(view)) error(view, tr('正在确认付款，请勿重复支付…', 'Confirming payment. Please do not pay again…'));
          await refresh(view.owner);
        } catch (err) {
          event.paymentFailed?.({ reason: 'fail' });
          error(view, errorText(err));
        } finally {
          view.busy = false;
          if (current(view)) pay.disabled = Boolean(view.confirmed);
        }
      });
      express.mount(view.node.querySelector('[data-express-element]'));
    } catch {
      // A wallet load failure must not prevent card or PayNow checkout.
      view.express?.destroy(); view.express = null; container.hidden = true;
    }
  }
  async function open({skipAddons = false} = {}) {
    dispose();
    const owner = store;
    clearTimeout(noteTimer);
    const note = $('#cartNote');
    const editedNote = note?.value;
    openModal('online', tr('确认订单', 'Your order'));
    $('#sheetBody').innerHTML = `<div class="sheet-content checkout-page"><h2 id="sheetTitle" class="sr-only">${bi('确认订单', 'Your order')}</h2><div class="checkout-scroll checkout-loading"><span class="checkout-loader" aria-hidden="true"></span><p role="status">${bi('正在核对订单…', 'Checking your order…')}</p><p class="fineprint">${bi('确认菜品与金额后即可付款', 'Checking your dishes and total before payment')}</p><p class="field-error" data-checkout-error role="alert"></p></div></div>`;
    const view = active = { owner, node: $('#sheetBody').firstElementChild, busy: true, newPayment: !owner.order };
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
        // OnlineCart keeps local draft operations; only shared dine-in carts
        // need every operation acknowledged by the table server.
        if (dining && owner.pending?.length) throw new Error('订单同步未完成，请重新检查。');
        if (owner.noteConflict) throw new Error(tr('请先处理备注冲突', 'Resolve the note conflict first'));
      }
      view.config = (await owner.api('/api/online')).config;
      if (!current(view)) return;
      view.enabled = dining ? view.config.dineinEnabled : view.config.takeawayEnabled;
      if (owner.order && !owner.order.token) throw new Error(tr('旧订单需要先核实，请联系店员', 'Please ask staff to check the previous order'));
      if (!owner.order && !owner.items.length) return showCart();
      if (!dining && !view.config.locations?.length) throw new Error(tr('自取门店尚未配置，选菜已保留', 'Pickup location is not configured. Your selection is saved.'));
      if (!dining && view.config.locations.length > 1 && !owner.order) throw new Error(tr('请先确认自取门店', 'Please confirm the pickup location first'));
      // The quote verifies identity, rewards and totals on the server. Refreshing
      // the account/wallet panels here adds unrelated requests before payment.
      view.input = owner.order || { ...freshCredentials(), ...globalThis.RewardsUI?.input(owner), ...globalThis.WalletUI?.input(owner), mode: dining ? 'dinein' : 'takeaway',
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
      view.node.querySelector('.checkout-payment')?.insertAdjacentHTML?.('afterend', `<button type="button" class="checkout-continue" data-checkout-cancel>${bi('取消本次付款，继续点餐', 'Cancel payment & keep ordering')}</button>`);
      if (view.enabled) {
        view.busy = true;
        view.preparation = prepare(view).finally(() => { view.busy = false; });
        if (!skipAddons && view.newPayment && current(view)) chooseAddons(view);
        await view.preparation;
      }
    } catch (e) { recovery(view, e); }
    finally { view.busy = false; }
  }
  async function readPayment(owner) {
    const pending = owner.order;
    const response = await fetch(`/api/online?id=${encodeURIComponent(pending.requestId)}`, { headers: { authorization: `Bearer ${pending.token}` }, cache: 'no-store', signal: AbortSignal.timeout(30000) });
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
  async function change(view, additions) {
    if (view.owner.order) {
      // Never unlock a payable basket until the provider confirms expiration.
      await view.owner.api('/api/online', { ...view.owner.order, action: 'cancel' });
      view.changed = true;
      view.actions = null; view.express?.destroy(); view.express = null; view.element?.destroy(); view.element = null;
      const pay = view.node.querySelector('[data-checkout-pay]'); if (pay) pay.disabled = true;
      view.owner.order = null; view.owner.emit();
      if (view.owner.table) await readCart(view.owner);
    }
    if (!current(view)) return;
    if (additions?.length) {
      const scroll = view.node.querySelector('.checkout-scroll')?.scrollTop || 0;
      view.changed = true;
      for (const item of additions) view.owner.mutate({ kind: 'delta', dishId: item.id, delta: item.qty });
      await view.owner.flush(); await open({skipAddons:true});
      if (active?.owner === view.owner && active.prepared && current(active)) {
        active.node.querySelector('.checkout-scroll').scrollTop = scroll;
        toast(tr('已加到本单，金额已更新', 'Added to your order. Total updated.'));
      }
    }
    else { dispose(); showCart(); }
  }
  const cancelling = new WeakSet();
  function confirmCancellation(button, table = false) {
    return new Promise(resolve => {
      const dialog = document.createElement('dialog');
      dialog.className = 'cancel-payment-dialog';
      dialog.setAttribute('aria-labelledby', 'cancelPaymentTitle');
      dialog.innerHTML = table
        ? `<h2 id="cancelPaymentTitle">${bi('同桌有人正在付款', 'Someone at your table is paying')}</h2><p>${bi('要修改菜品，需要先取消这次付款。已选的菜都会保留，改完再付款就行。', 'To change dishes, cancel this payment first. All dishes stay; pay again after editing.')}</p><div><button type="button" data-cancel-keep>${bi('等他付完', 'Let them pay')}</button><button type="button" class="primary" data-cancel-confirm autofocus>${bi('取消付款并修改', 'Cancel & edit')}</button></div>`
        : `<h2 id="cancelPaymentTitle">${bi('取消待付款订单？', 'Cancel unpaid order?')}</h2><p>${bi('已选菜品会保留，取消后可继续点餐。', 'Your selected dishes will be kept so you can continue ordering.')}</p><div><button type="button" data-cancel-confirm>${bi('确认取消', 'Cancel order')}</button><button type="button" class="primary" data-cancel-keep autofocus>${bi('保留订单', 'Keep order')}</button></div>`;
      const finish = accepted => { dialog.close(); dialog.remove(); if (button.isConnected) button.focus({preventScroll:true}); resolve(accepted); };
      dialog.querySelector('[data-cancel-confirm]').onclick = () => finish(true);
      dialog.querySelector('[data-cancel-keep]').onclick = () => finish(false);
      dialog.addEventListener('cancel', e => { e.preventDefault(); e.stopPropagation(); finish(false); });
      document.body.append(dialog); dialog.showModal();
    });
  }
  // The paying phone cancels its own unpaid payment. The server asks Stripe first and
  // refuses when the payment already went through.
  async function cancelOwn(owner, view = active) {
    // Resolve in-flight creation before asking the provider to expire it.
    if (view?.owner === owner) await view.preparation?.catch(() => {});
    const pending = owner.order;
    if (!pending) return;
    if (!pending.token) throw new Error(tr('请联系店员核实这笔付款', 'Ask staff to check this payment'));
    await owner.api('/api/online', { ...pending, action: 'cancel' });
    if (owner.order !== pending) return;
    if (view?.owner === owner) { view.actions = null; view.express?.destroy(); view.express = null; view.element?.destroy(); view.element = null; const pay = view.node.querySelector('[data-checkout-pay]'); if (pay) pay.disabled = true; }
    owner.order = null; owner.emit();
    if (owner.table) await readCart(owner);
  }
  // Editing dishes while a payment is unfinished. The paying phone simply cancels it;
  // another phone at the table is asked first. Returns true once the cart is editable.
  async function unlock(button = document.activeElement) {
    const owner = store;
    if (cancelling.has(owner)) return false;
    cancelling.add(owner);
    try {
      if (owner.order?.token) {
        await cancelOwn(owner);
        toast(tr('已取消未完成的付款，可以修改了', 'Unpaid payment cancelled. You can edit now.'));
        return store === owner && !owner.order;
      }
      if (!owner.table || !await confirmCancellation(button, true) || store !== owner) return false;
      await owner.api('/api/online', { action: 'cancel-table', table: owner.table, group: owner.group });
      await readCart(owner);
      toast(tr('已取消同桌的付款，可以修改了', 'Their payment was cancelled. You can edit now.'));
      return store === owner && !owner.remote?.paymentPending;
    } catch (e) {
      // Never clear a paid, processing, or unverified payment locally.
      if (store === owner) toast(errorText(e));
      return false;
    } finally { cancelling.delete(owner); }
  }
  async function cancelPending(button) {
    const owner = store, view = active;
    if (cancelling.has(owner)) return;
    cancelling.add(owner); button.disabled = true;
    try {
      if (!await confirmCancellation(button)) return;
      if (store !== owner) return;
      await cancelOwn(owner, view);
      if (owner.order) return;
      if (store === owner) {
        dispose(); closeModal();
        toast(tr('本次付款已取消，已选菜品保留，可继续点餐', 'Payment cancelled. Your dishes are saved; keep ordering.'));
      }
    } catch (e) {
      // Never clear a paid, processing, or unverified payment locally.
      if (store === owner) toast(errorText(e));
    } finally { cancelling.delete(owner); if (button.isConnected) button.disabled = false; }
  }
  document.addEventListener('click', async e => {
    const cancel = e.target.closest('[data-checkout-cancel]');
    if (cancel?.hasAttribute('data-checkout-cancel')) { await cancelPending(cancel); return; }
    const tableUnlock = e.target.closest('[data-table-unlock]');
    if (tableUnlock?.hasAttribute('data-table-unlock')) {
      tableUnlock.disabled = true;
      const inCheckout = Boolean(active && current(active));
      try { if (await unlock(tableUnlock) && inCheckout) await open(); } finally { if (tableUnlock.isConnected) tableUnlock.disabled = false; }
      return;
    }
    const button = e.target.closest('[data-checkout-wallet], [data-checkout-rewards], [data-checkout-pay], [data-checkout-edit], [data-checkout-addon], [data-checkout-addons-open], [data-checkout-retry], [data-checkout-back]');
    const view = active;
    if (!button || !view || !current(view) || view.busy) return;
    if (button.hasAttribute('data-checkout-addons-open') || button.hasAttribute('data-checkout-addon')) return chooseAddons(view, button.dataset.checkoutAddon);
    if(button.hasAttribute('data-checkout-wallet')){
      view.busy=true;button.disabled=true;const priorPay=view.node.querySelector('[data-checkout-pay]');if(priorPay)priorPay.disabled=true;
      try{if(view.owner.order){await view.owner.api('/api/online',{...view.owner.order,action:'cancel'});view.owner.order=null;view.owner.emit();view.express?.destroy();view.express=null;view.element?.destroy();view.actions=null;if(view.owner.table)await readCart(view.owner);}WalletUI.setMethod(view.owner,(view.order?.paymentMethod||view.owner.order?.paymentMethod||WalletUI.input(view.owner).paymentMethod)==='wallet'?'stripe':'wallet');await open({skipAddons:true});}catch(e){error(view,errorText(e));if(priorPay&&view.owner.order)priorPay.disabled=false;}finally{view.busy=false;button.disabled=false;}return;
    }
    if(button.hasAttribute('data-checkout-rewards')) {
      try { await RewardsUI.choose(view.owner,async(selection,reward)=>{
        await view.preparation;if(!current(view)||view.busy||view.confirmed)throw new Error(tr('请重新确认订单','Please check your order again'));
        view.busy=true;
        try {
          if(view.owner.order){await view.owner.api('/api/online',{...view.owner.order,action:'cancel'});view.owner.order=null;view.owner.emit();view.express?.destroy();view.express=null;view.element?.destroy();view.actions=null;view.changed=true;if(view.owner.table)await readCart(view.owner);}
          RewardsUI.setSelection(view.owner,selection);
          if(reward&&!view.owner.items.some(i=>i.id===reward.dishId&&(i.style||null)===(reward.style||null)))view.owner.mutate({kind:'delta',dishId:reward.dishId,style:reward.style||undefined,delta:1});
          await view.owner.flush();await open({skipAddons:true});
        } finally {view.busy=false;}
      }); } catch(e){error(view,errorText(e));}return;
    }
    view.busy = true; button.disabled = true;
    error(view, '');
    try {
      if (button.hasAttribute('data-checkout-back')) { closeModal(); return; }
      if (button.hasAttribute('data-checkout-retry')) { await open(); return; }
      if (button.hasAttribute('data-checkout-pay')) {
        if(view.walletPayment){await view.owner.api('/api/online',{...view.owner.order,action:'confirm-wallet'});
        } else if(view.freeRedemption){await view.owner.api('/api/online',{...view.owner.order,action:'confirm-reward'});
        } else if (view.config.preview && !production) {
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
  return { open, refresh, dispose, itemsHTML, unlock };
})();
