// Shared artwork/layout for the inline rail and its optional selection dialog.
// A selection is local to the dialog until the caller accepts it; no API here.
const AddonUI = (() => {
  const ids = ['lunch-v2-barley', 'lunch-v2-sour-plum', 'lunch-v2-soft-egg', 'lunch-v2-cucumber'];
  const hero = '/brand/addon-illustration-v3.webp';
  const campaign = {
    'lunch-v2-barley': '/brand/addon-barley-v4.webp',
    'lunch-v2-sour-plum': '/brand/addon-sour-plum-v3.webp',
    'lunch-v2-soft-egg': '/brand/addon-soft-egg-v4.webp',
    'lunch-v2-cucumber': '/brand/addon-cucumber-v4.webp',
  };
  const available = order => ids.map(id => dish(id)).filter(d => d && !d.soldOut && !d.styles && !order.items.some(i => i.id === d.id));
  const imageHTML = d => `<div class="addon-scene"><img src="${escapeHTML(campaign[d.id] || photo(d,'s'))}" alt="" width="160" height="160"></div>`;
  function section(order) {
    const dishes = available(order);
    if (!dishes.length) return '';
    return `<section class="checkout-block checkout-addons addon-reference"><header class="addon-section-head"><div><p class="addon-kicker">DUMPLING LAB</p><h3><button type="button" class="addon-open" data-checkout-addons-open><dl-serving-motion aria-hidden="true"></dl-serving-motion><span>${bi('搭配加点','Add-ons')}</span><span class="sr-only">${bi('选择加购菜品','Choose extras')}</span></button></h3></div><img class="addon-header-art" src="${hero}" width="180" height="120" alt=""></header><div class="checkout-addon-list" tabindex="0" role="region" aria-label="${tr('可选加购菜品','Optional add-ons')}">${dishes.map(d => `<article class="checkout-addon">${imageHTML(d)}<strong>${escapeHTML(name(d))}</strong><span class="addon-price">${money(itemPrice(d))}</span><button type="button" class="addon-small-button" data-checkout-addon="${escapeHTML(d.id)}" aria-label="${escapeHTML(tr('选择 ', 'Select ') + name(d))}">+</button></article>`).join('')}</div></section>`;
  }
  function show(order, {host, preselect = null, onApply, onClose = () => {}}) {
    const dishes = available(order);
    if (!dishes.length) return {close(){}};
    const selected = new Set(preselect && dishes.some(d => d.id === preselect) ? [preselect] : []);
    const before = document.activeElement;
    const dialog = document.createElement('dialog');
    dialog.className = 'addon-dialog';
    dialog.setAttribute('aria-labelledby','addonDialogTitle');
    dialog.innerHTML = `<div class="addon-popup-card"><header class="addon-popup-head"><h2 id="addonDialogTitle" tabindex="-1" autofocus><dl-serving-motion aria-hidden="true"></dl-serving-motion>${bi('搭配加点','Add-ons')}</h2><img src="${hero}" alt="" width="180" height="120"></header><div class="addon-popup-list">${dishes.map(d => `<article class="addon-popup-row">${imageHTML(d)}<div class="addon-popup-copy"><h3>${escapeHTML(name(d))}</h3><span class="addon-category">${d.section === 'drinks' ? bi('配一杯清爽','Something refreshing') : bi('添一份小食','A little on the side')}</span><div class="addon-popup-price"><strong>${money(itemPrice(d))}</strong><label class="addon-select"><input type="checkbox" value="${escapeHTML(d.id)}" ${selected.has(d.id) ? 'checked' : ''} aria-label="${escapeHTML(tr('选择 ', 'Select ') + name(d))}"><span aria-hidden="true"></span></label></div></div></article>`).join('')}</div><footer class="addon-popup-footer"><p class="addon-popup-error" role="alert"></p><button class="addon-apply" type="button" disabled>${bi('加入已选','Add selected')}</button></footer></div><button type="button" class="addon-dismiss" aria-label="${tr('跳过加购，返回订单','Skip add-ons and return to order')}">×</button>`;
    let busy = false, closed = false;
    const apply = dialog.querySelector('.addon-apply');
    apply.insertAdjacentHTML('afterend', `<button type="button" class="addon-skip">${bi('不用了，继续结算', 'No thanks, continue')}</button>`);
    function update() {
      const items = dishes.filter(d => selected.has(d.id));
      apply.disabled = !items.length || busy;
      apply.textContent = busy ? tr('正在加入…','Adding…') : items.length ? `${tr('加入已选','Add selected')} · ${items.length} · ${money(items.reduce((sum,d) => sum + itemPrice(d),0))}` : tr('加入已选','Add selected');
    }
    function close() {
      if (closed) return;
      closed = true; if (dialog.open) dialog.close(); dialog.remove();
      if (before?.isConnected) before.focus({preventScroll:true});
      onClose();
    }
    dialog.addEventListener('change', e => {
      if (busy || !e.target.matches('.addon-select input')) return;
      if (e.target.checked) selected.add(e.target.value); else selected.delete(e.target.value);
      update();
    });
    dialog.addEventListener('cancel', e => { e.preventDefault(); e.stopPropagation(); if (!busy) close(); });
    dialog.querySelector('.addon-dismiss').onclick = () => { if (!busy) close(); };
    dialog.querySelector('.addon-skip').onclick = () => { if (!busy) close(); };
    apply.onclick = async () => {
      if (busy || !selected.size) return;
      busy = true; update();
      dialog.querySelectorAll('input, .addon-dismiss, .addon-skip').forEach(node => node.disabled = true);
      try { await onApply(dishes.filter(d => selected.has(d.id)).map(d => ({id:d.id,qty:1}))); close(); }
      catch (e) {
        if (!closed) dialog.querySelector('.addon-popup-error').textContent = errorText(e);
      } finally {
        busy = false;
        if (!closed) { dialog.querySelectorAll('input, .addon-dismiss, .addon-skip').forEach(node => node.disabled = false); update(); }
      }
    };
    host.append(dialog); update(); dialog.showModal();
    // Start at the heading, not an auto-focused scroll container or first choice.
    dialog.querySelector('#addonDialogTitle').focus({preventScroll:true});
    dialog.querySelector('.addon-popup-list').scrollTop = 0;
    return {close};
  }
  return {available, section, show};
})();
