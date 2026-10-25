// 订单汇总：营业额与热销菜品。只读，数据来自已付款订单的快照。
globalThis.ReportAdmin = (() => {
  let epoch = 0, request = null, items = [], range = 'today', custom = null;
  const $ = s => document.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  const money = c => 'S$' + (c / 100).toFixed(2);
  const sgToday = () => new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
  const shift = (day, n) => new Date(Date.parse(day) + n * 86400000).toISOString().slice(0, 10);
  const ranges = {
    today: () => [sgToday(), sgToday()],
    yesterday: () => [shift(sgToday(), -1), shift(sgToday(), -1)],
    week: () => [shift(sgToday(), -6), sgToday()],
    month: () => [shift(sgToday(), -29), sgToday()],
  };
  const labels = {today:'今天', yesterday:'昨天', week:'最近 7 天', month:'最近 30 天', custom:'自选日期'};
  const modes = {dinein:'堂食', takeaway:'打包自取', delivery:'外送'};

  // 同一道菜的大小份合成一行，括号里分开列份数。
  function dishRows(dishes) {
    const rows = new Map();
    for (const d of dishes) {
      const item = items.find(i => i.id === d.id), key = item?.sizeGroup?.[0] || d.id;
      const row = rows.get(key) || {name: item?.groupCn || item?.cn || d.name, qty: 0, salesCents: 0, parts: []};
      row.qty += d.qty; row.salesCents += d.salesCents;
      if (item?.sizeGroup) row.parts.push(`${item.sizeLabel?.cn || d.name} ×${d.qty}`);
      else row.parts.push(...d.styles.slice(0, 3).map(s => `${s.style} ×${s.qty}`));
      rows.set(key, row);
    }
    return [...rows.values()].sort((a, b) => b.qty - a.qty || b.salesCents - a.salesCents);
  }

  function chart(days, width) {
    if (days.length < 2) return '';
    // Drawn at the panel's real width so text stays 11px and bars stay slim.
    const W = Math.max(480, Math.round(width)), H = 200, top = 16, bottom = 28, left = 52, right = 8;
    const max = Math.max(...days.map(d => d.netCents), 1), step = niceStep(max / 3), ceil = step * Math.ceil(max / step);
    const bw = (W - left - right) / days.length, y = v => top + (H - top - bottom) * (1 - v / ceil);
    const every = Math.ceil(days.length / 10);
    const grid = [0, step, step * 2, step * 3].filter(v => v <= ceil).map(v => `<line x1="${left}" x2="${W - right}" y1="${y(v)}" y2="${y(v)}" class="report-grid"/><text x="${left - 8}" y="${y(v) + 4}" text-anchor="end" class="report-axis">${v ? '$' + Math.round(v / 100) : '0'}</text>`).join('');
    const bars = days.map((d, i) => {
      const w = Math.max(2, Math.min(28, bw - 2)), x = left + i * bw + (bw - w) / 2, h = y(0) - y(d.netCents), r = Math.min(4, w / 2, h);
      const path = h > 0 ? `M${x},${y(0)}V${y(d.netCents) + r}Q${x},${y(d.netCents)} ${x + r},${y(d.netCents)}H${x + w - r}Q${x + w},${y(d.netCents)} ${x + w},${y(d.netCents) + r}V${y(0)}Z` : '';
      const tip = `${d.date.slice(5).replace('-', '/')} · ${money(d.netCents)} · ${d.orders} 单`;
      return `<g class="report-bar" data-tip="${esc(tip)}" tabindex="0"><rect x="${left + i * bw}" y="${top}" width="${bw}" height="${H - top - bottom}" fill="transparent"/>${path ? `<path d="${path}" fill="var(--brand)"/>` : ''}${i % every === 0 ? `<text x="${x + w / 2}" y="${H - 8}" text-anchor="middle" class="report-axis">${d.date.slice(5).replace('-', '/')}</text>` : ''}<title>${esc(tip)}</title></g>`;
    }).join('');
    return `<figure class="report-chart"><figcaption>每日实收</figcaption><div class="report-chart-wrap"><svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="每日实收营业额">${grid}${bars}</svg><div class="report-tip" hidden></div></div></figure>`;
  }
  // 每一单点了什么：单号、桌号或自取号、付款时间、菜品和金额。
  function orderList(report) {
    const multiDay = report.range.from !== report.range.to;
    const time = iso => new Date(iso).toLocaleString('zh-SG', {timeZone:'Asia/Singapore', ...(multiDay ? {month:'numeric', day:'numeric'} : {}), hour:'2-digit', minute:'2-digit', hour12:false});
    const place = o => o.mode === 'dinein' ? `${o.table || '—'} 桌${o.group && o.group !== 'A' ? ' · ' + o.group : ''}` : o.mode === 'takeaway' ? `自取${o.pickupNumber ? ' ' + o.pickupNumber : ''}` : modes[o.mode] || o.mode;
    const line = i => `<li><span>${esc(i.name)}${i.style ? `<small>${esc(i.style)}</small>` : ''}${i.note ? `<small>备注：${esc(i.note)}</small>` : ''}</span><b>×${i.qty}</b>${i.promo === 'bogo' ? '<em>赠</em>' : ''}</li>`;
    return `<div class="report-orders"><div class="report-dishes-head"><h3>订单明细</h3><span class="muted">${report.orders.length} 单${report.ordersTruncated ? '（只显示最近 1000 单，缩短日期可看全部）' : ''}</span></div>
      ${report.orders.map(o => `<article class="report-order"><header><strong>${o.no ? '#' + esc(o.no) : esc(o.id.slice(0, 8))}</strong><span>${esc(place(o))}</span><time datetime="${esc(o.at)}">${esc(time(o.at))}</time></header>
        <ul>${o.items.map(line).join('')}</ul>${o.note ? `<p class="report-order-note">备注：${esc(o.note)}</p>` : ''}
        <footer>${o.counterMethod ? `<span>柜台${o.counterMethod === 'cash' ? '现金' : '刷卡机'}</span>` : ''}${o.discountCents ? `<span>折扣 −${money(o.discountCents)}</span>` : ''}${o.refundCents ? `<span class="report-refund">退款 −${money(o.refundCents)}</span>` : ''}${o.canRefund && o.refundCents < o.totalCents ? `<button type="button" class="report-refund-open" data-refund-order="${esc(o.id)}">退款</button>` : ''}<strong>${money(o.totalCents)}</strong></footer></article>`).join('')}</div>`;
  }
  // 刷卡/PayNow 的单直接原路退回；结果未确认时保留同一个退款编号，再点也不会重复退。
  function refundForm(article, order) {
    const key = 'dl-order-refund-' + order.id, left = order.totalCents - order.refundCents;
    let pending = null;
    try { pending = JSON.parse(sessionStorage.getItem(key)); } catch {}
    const form = document.createElement('form');
    form.className = 'report-refund-form';
    form.innerHTML = `<label>退款金额 S$<input name="amount" type="number" inputmode="decimal" min="0.01" step="0.01" max="${(left / 100).toFixed(2)}" value="${((pending?.amountCents ?? left) / 100).toFixed(2)}" required></label>
      <label>原因<input name="reason" maxlength="200" required placeholder="例如：菜品售罄" value="${esc(pending?.reason || '')}"></label>
      <div><button type="submit" class="primary">确认退款</button><button type="button" data-refund-cancel>取消</button></div><p role="status"></p>`;
    article.append(form);
    const status = form.querySelector('[role=status]'), submit = form.querySelector('[type=submit]');
    const label = () => { const c = Math.round(Number(form.amount.value) * 100); submit.textContent = c > 0 ? `确认退款 ${money(c)}` : '确认退款'; };
    form.amount.oninput = label; label();
    form.querySelector('[data-refund-cancel]').onclick = () => { form.remove(); article.querySelector('[data-refund-order]').hidden = false; };
    form.onsubmit = async e => {
      e.preventDefault();
      if (submit.disabled) return;
      const amountCents = Math.round(Number(form.amount.value) * 100), reason = form.reason.value.trim();
      if (pending && (pending.amountCents !== amountCents || pending.reason !== reason)) { status.textContent = '上一笔退款结果还没确认，请用原来的金额和原因再点一次。'; return; }
      pending ||= { refundId: crypto.randomUUID(), amountCents, reason };
      try { sessionStorage.setItem(key, JSON.stringify(pending)); } catch {}
      submit.disabled = true; status.textContent = '正在退款…';
      try {
        await request('/api/online', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'staff-refund', id: order.id, ...pending }) });
        try { sessionStorage.removeItem(key); } catch {}
        refresh();
      } catch (err) {
        // 结果未确认（503）时保留编号，其余是明确失败，可以换金额重来。
        if (err.status && err.status !== 503) { try { sessionStorage.removeItem(key); } catch {} pending = null; }
        status.textContent = err.message; submit.disabled = false;
      }
    };
    form.amount.focus();
  }
  function niceStep(v) { const p = 10 ** Math.floor(Math.log10(Math.max(v, 1))), n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; }

  function render(report) {
    const p = $('#reportPanel'), t = report.totals, rows = dishRows(report.dishes);
    const topQty = rows[0]?.qty || 1;
    const modeText = Object.entries(report.byMode).map(([m, v]) => `${modes[m] || m} ${v.orders} 单 · ${money(v.netCents)}`).join('　') || '—';
    p.querySelector('#reportBody').innerHTML = t.orders ? `
      <div class="report-stats">
        <div class="report-hero"><span>实收营业额</span><strong>${money(t.netCents)}</strong><small>${esc(modeText)}</small></div>
        <div><span>订单数</span><strong>${t.orders}</strong></div>
        <div><span>客单价</span><strong>${money(t.averageCents)}</strong></div>
        <div><span>售出份数</span><strong>${t.items}</strong></div>
      </div>
      <p class="report-ledger">菜品金额 ${money(t.foodCents)}　·　折扣与兑换 −${money(t.discountCents)}　·　服务费 ${money(t.serviceCents)}　·　退款 −${money(t.refundCents)}</p>
      ${chart(report.byDay, p.querySelector('#reportBody').clientWidth - 48)}
      <div class="report-dishes"><div class="report-dishes-head"><h3>热销菜品</h3><span class="muted">按售出份数排序 · 金额按下单时的菜价</span></div>
      <div class="table-wrap"><table class="report-table"><thead><tr><th scope="col">#</th><th scope="col">菜品</th><th scope="col" class="align-right">份数</th><th scope="col" class="align-right">菜品金额</th></tr></thead><tbody>
      ${rows.map((r, i) => `<tr><td class="report-rank">${i + 1}</td><td><strong>${esc(r.name)}</strong>${r.parts.length ? `<small class="report-parts">${esc(r.parts.join('，'))}</small>` : ''}<span class="report-share" style="--share:${(r.qty / topQty).toFixed(3)}"></span></td><td class="align-right report-num">${r.qty}</td><td class="align-right report-num">${money(r.salesCents)}</td></tr>`).join('')}
      </tbody></table></div></div>
      ${orderList(report)}`
      : `<div class="empty-state"><h3>这段时间没有已付款的订单</h3><p>换一个日期范围看看。</p></div>`;
    p.querySelectorAll('[data-refund-order]').forEach(b => { b.onclick = () => { b.hidden = true; refundForm(b.closest('.report-order'), report.orders.find(o => o.id === b.dataset.refundOrder)); }; });
    const tip = p.querySelector('.report-tip'), wrap = p.querySelector('.report-chart-wrap');
    if (wrap) {
      const show = e => { const g = e.target.closest('.report-bar'); if (!g) return; tip.textContent = g.dataset.tip; tip.hidden = false;
        const a = wrap.getBoundingClientRect(), b = g.getBoundingClientRect(); tip.style.left = Math.min(a.width - tip.offsetWidth, Math.max(0, b.left - a.left + b.width / 2 - tip.offsetWidth / 2)) + 'px'; };
      wrap.onmouseover = show; wrap.onfocusin = show; wrap.onmouseleave = wrap.onfocusout = () => { tip.hidden = true; };
    }
  }

  async function refresh() {
    const run = ++epoch, p = $('#reportPanel');
    const [from, to] = range === 'custom' ? custom : ranges[range]();
    p.querySelectorAll('[data-report-range]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.reportRange === range)));
    p.querySelector('#reportFrom').value = from; p.querySelector('#reportTo').value = to;
    p.querySelector('#reportRangeLabel').textContent = from === to ? from : `${from} 至 ${to}`;
    p.querySelector('#reportBody').innerHTML = '<p class="reward-admin-message">正在统计…</p>';
    try {
      const out = await request(`/api/online?report=1&from=${from}&to=${to}`);
      if (run === epoch) render(out.report);
    } catch (e) { if (run === epoch) p.querySelector('#reportBody').innerHTML = `<p class="notice" data-tone="error">${esc(e.message)}</p>`; }
  }

  function load(requestFn, catalogItems = []) {
    request = requestFn; items = catalogItems;
    const p = $('#reportPanel');
    if (!p.dataset.ready) {
      p.dataset.ready = '1';
      p.innerHTML = `<div class="panel-heading"><div><h2>订单汇总</h2><span class="muted" id="reportRangeLabel"></span></div><span class="muted">只统计付款成功的订单，金额已扣退款</span></div>
        <div class="toolbar report-toolbar">${Object.keys(ranges).map(k => `<button type="button" class="report-range" data-report-range="${k}" aria-pressed="false">${labels[k]}</button>`).join('')}
          <label class="report-date">从<input id="reportFrom" type="date"></label><label class="report-date">到<input id="reportTo" type="date"></label></div>
        <div id="reportBody"></div>`;
      p.querySelectorAll('[data-report-range]').forEach(b => { b.onclick = () => { range = b.dataset.reportRange; refresh(); }; });
      for (const id of ['#reportFrom', '#reportTo']) p.querySelector(id).onchange = () => {
        const from = p.querySelector('#reportFrom').value, to = p.querySelector('#reportTo').value;
        if (from && to) { custom = from <= to ? [from, to] : [to, from]; range = 'custom'; refresh(); }
      };
    }
    refresh();
  }
  return { load, clear() { epoch++; const p = $('#reportPanel'); if (p) { p.innerHTML = ''; delete p.dataset.ready; } } };
})();
