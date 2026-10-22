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
      </tbody></table></div></div>`
      : `<div class="empty-state"><h3>这段时间没有已付款的订单</h3><p>换一个日期范围看看。</p></div>`;
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
