// 店员点单：客人在柜台付现金或刷卡机，店员替他点，付完直接出单，不经过 Stripe。
globalThis.CounterAdmin = (() => {
  let request = null, menu = [], lines = [], mode = 'dinein', method = 'cash', quote = null, quoteRun = 0, opened = null, requestId = null, busy = false;
  const $ = s => document.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  const money = n => 'S$' + Number(n || 0).toFixed(2);
  let sections = [['dumplings', '饺子 / 云吞'], ['recommended', '煎饺 / 抄手'], ['noodles', '面条'], ['sides', '配菜'], ['cold', '凉菜'], ['drinks', '饮品']];
  const dish = id => menu.find(d => d.id === id);
  const priceOf = (d, style) => d.variants?.[style]?.price ?? d.choiceOptions?.items?.find(o => o.cn === style)?.price ?? d.price;
  const panel = () => $('#counterPanel');

  function menuHTML() {
    return sections.map(([key, label]) => {
      const list = menu.filter(d => d.section === key);
      if (!list.length) return '';
      return `<section class="counter-section"><h3>${label}</h3><div class="counter-dishes">${list.map(d => `
        <button type="button" class="counter-dish" data-dish="${esc(d.id)}" aria-expanded="${d.styles ? String(opened === d.id) : 'false'}"><span>${esc(d.cn)}</span><small>${money(d.price)}${d.styles ? ' 起' : ''}</small></button>
        ${d.styles && opened === d.id ? `<div class="counter-styles">${d.styles.map(s => `<button type="button" data-dish="${esc(d.id)}" data-style="${esc(s)}">${esc(s)}<small>${money(priceOf(d, s))}</small></button>`).join('')}</div>` : ''}`).join('')}</div></section>`;
    }).join('');
  }
  function ticketHTML() {
    const q = quote;
    return `<div class="counter-mode" role="group" aria-label="用餐方式">${[['dinein', '堂食'], ['takeaway', '自取']].map(([k, l]) => `<button type="button" data-mode="${k}" aria-pressed="${mode === k}">${l}</button>`).join('')}</div>
      ${mode === 'dinein' ? `<label class="counter-table">桌号<input name="counterTable" autocomplete="off" maxlength="12" value="${esc(panel().dataset.table || '')}" placeholder="例如 A3"></label>` : ''}
      ${lines.length ? `<ul class="counter-lines">${lines.map((l, n) => `<li><span>${esc(dish(l.id)?.cn || l.id)}${l.style ? `<small>${esc(l.style)}</small>` : ''}</span>
        <span class="counter-qty"><button type="button" data-line="${n}" data-delta="-1" aria-label="减一份">−</button><b>${l.qty}</b><button type="button" data-line="${n}" data-delta="1" aria-label="加一份">+</button></span>
        <b class="counter-line-total">${money(priceOf(dish(l.id), l.style) * l.qty)}</b></li>`).join('')}</ul>` : '<p class="counter-empty">点左边的菜加入本单</p>'}
      <label class="counter-note">备注<textarea name="counterNote" rows="2" maxlength="240">${esc(panel().dataset.note || '')}</textarea></label>
      ${q ? `<dl class="counter-totals"><div><dt>菜品</dt><dd>${money(q.foodTotal ?? q.subtotal)}</dd></div>${q.discount ? `<div><dt>折扣</dt><dd>−${money(q.discount)}</dd></div>` : ''}${q.serviceCharge ? `<div><dt>服务费</dt><dd>${money(q.serviceCharge)}</dd></div>` : ''}<div class="counter-total"><dt>合计</dt><dd>${money(q.total)}</dd></div></dl>` : ''}
      <div class="counter-method" role="group" aria-label="收款方式">${[['cash', '现金'], ['card', '刷卡机']].map(([k, l]) => `<button type="button" data-method="${k}" aria-pressed="${method === k}">${l}</button>`).join('')}</div>
      <button type="button" class="primary counter-submit" data-counter-submit ${q && !busy ? '' : 'disabled'}>${q ? `已收 ${money(q.total)}，出单` : '出单'}</button>
      <p class="counter-status" role="status"></p>`;
  }
  function render(status = '') {
    const p = panel();
    p.querySelector('.counter-menu').innerHTML = menuHTML();
    p.querySelector('.counter-ticket').innerHTML = ticketHTML();
    if (status) p.querySelector('.counter-status').textContent = status;
  }
  const input = () => ({ mode, table: mode === 'dinein' ? (panel().dataset.table || '').trim() : undefined, items: lines.map(l => ({ id: l.id, style: l.style, qty: l.qty })), note: panel().dataset.note || '' });
  // 价格以服务器为准（折扣、服务费、买一赠一），每次改动后重新算。
  async function requote() {
    const run = ++quoteRun, i = input();
    if (!lines.length || (mode === 'dinein' && !i.table)) { quote = null; render(lines.length ? '填好桌号后显示合计' : ''); return; }
    try {
      const out = await request('/api/online', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'staff-quote', ...i }) });
      if (run === quoteRun) { quote = out.order; render(); }
    } catch (e) { if (run === quoteRun) { quote = null; render(e.message); } }
  }
  function changed() { requestId = null; quote = null; render(); requote(); }
  async function submit() {
    if (busy || !quote) return;
    busy = true; requestId ||= crypto.randomUUID();
    const button = panel().querySelector('[data-counter-submit]'); button.disabled = true;
    panel().querySelector('.counter-status').textContent = '正在出单…';
    try {
      const out = await request('/api/online', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'staff-order', requestId, counterMethod: method, expectedTotal: quote.total, ...input() }) });
      const o = out.order;
      lines = []; quote = null; requestId = null; busy = false; panel().dataset.note = ''; panel().dataset.table = '';
      render(`已出单 #${o.no}${o.pickup?.number ? ` · 自取号 ${o.pickup.number}` : o.table ? ` · ${o.table} 桌` : ''} · ${money(o.total)}`);
    } catch (e) {
      busy = false;
      // 结果未确认时保留同一个编号，再点出单不会重复出。
      if (e.status && e.status !== 503) requestId = null;
      if (e.status === 422) await requote();
      render(e.status && e.status !== 503 ? e.message : '结果未确认，请再点一次出单（不会重复出单）');
    }
  }
  function bind() {
    const p = panel();
    p.onclick = e => {
      const b = e.target.closest('button'); if (!b || busy) return;
      if (b.dataset.style !== undefined || (b.dataset.dish && !dish(b.dataset.dish)?.styles)) {
        const id = b.dataset.dish, style = b.dataset.style || null, line = lines.find(l => l.id === id && l.style === style);
        if (line) line.qty = Math.min(20, line.qty + 1); else lines.push({ id, style, qty: 1 });
        return changed();
      }
      if (b.dataset.dish) { opened = opened === b.dataset.dish ? null : b.dataset.dish; return render(); }
      if (b.dataset.line) { const l = lines[+b.dataset.line]; l.qty += +b.dataset.delta; if (l.qty < 1) lines.splice(+b.dataset.line, 1); return changed(); }
      if (b.dataset.mode) { mode = b.dataset.mode; return changed(); }
      if (b.dataset.method) { method = b.dataset.method; return render(); }
      if (b.hasAttribute('data-counter-submit')) submit();
    };
    p.oninput = e => {
      if (e.target.name === 'counterNote') { p.dataset.note = e.target.value; requestId = null; }
      if (e.target.name === 'counterTable') { p.dataset.table = e.target.value; requestId = null; }
    };
    p.onchange = e => { if (e.target.name === 'counterTable') changed(); };
  }

  async function load(requestFn) {
    request = requestFn;
    const p = panel();
    if (!p.dataset.ready) {
      p.dataset.ready = '1';
      p.innerHTML = `<div class="panel-heading"><div><h2>店员点单</h2></div></div><div class="counter-layout"><div class="counter-menu"></div><aside class="counter-ticket" aria-label="本单"></aside></div>`;
      bind();
    }
    try {
      const out = await request('/api/catalog');
      menu = out.items.filter(d => d.active !== false && !d.soldOut);
      // 后台的分类顺序和新增分类；自带分类沿用这里更好认的名字。
      if (out.sections) sections = out.sections.map(x => [x.key, sections.find(([k]) => k === x.key)?.[1] || x.cn]);
      render(); requote();
    } catch (e) { p.querySelector('.counter-menu').innerHTML = `<p class="notice" data-tone="error">${esc(e.message)}</p>`; }
  }
  return { load, clear() { const p = panel(); if (p) { p.innerHTML = ''; delete p.dataset.ready; } lines = []; quote = null; requestId = null; } };
})();
