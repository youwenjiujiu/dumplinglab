// 订单汇总：营业额与热销菜品。只读，数据来自已付款订单的快照。
globalThis.ReportAdmin = (() => {
  let epoch = 0, request = null, items = [], range = 'today', custom = null, mode = 'all', sort = 'qty-desc', search = '';
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
      const row = rows.get(key) || {name: item?.groupCn || item?.cn || d.name, qty: 0, giftQty: 0, salesCents: 0, parts: []};
      row.qty += d.qty; row.giftQty += d.giftQty || 0; row.salesCents += d.salesCents;
      if (item?.sizeGroup) row.parts.push(`${item.sizeLabel?.cn || d.name} ×${d.qty}`);
      else row.parts.push(...d.styles.map(s => `${s.style} ×${s.qty}`));
      rows.set(key, row);
    }
    return [...rows.values()].filter(r=>!search || r.name.toLowerCase().includes(search.toLowerCase()) || r.parts.join(' ').toLowerCase().includes(search.toLowerCase())).sort((a,b)=>sort==='qty-asc' ? a.qty-b.qty || a.salesCents-b.salesCents : sort==='sales' ? b.salesCents-a.salesCents || b.qty-a.qty : b.qty-a.qty || b.salesCents-a.salesCents);
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
        <footer>${o.counterMethod ? `<span>柜台${o.counterMethod === 'cash' ? '现金' : '刷卡机'}</span>` : ''}${o.discountCents ? `<span>折扣 −${money(o.discountCents)}</span>` : ''}${o.refundCents ? `<span class="report-refund">退款 −${money(o.refundCents)}</span>` : ''}${(o.refundReceipts||[]).map(r=>`<button type="button" class="report-refund-print" data-refund-print="${esc(r.refundId)}" data-order-id="${esc(o.id)}">补打退款凭证 · ${money(r.amountCents)}</button>`).join('')}${o.canRefund && o.refundCents < o.totalCents ? `<button type="button" class="report-refund-open" data-refund-order="${esc(o.id)}">退款</button>` : ''}<strong>${money(o.totalCents)}</strong></footer></article>`).join('')}</div>`;
  }
  // 刷卡/PayNow 的单直接原路退回；柜台单只记账，钱在柜台退。结果未确认时保留同一个退款编号，再点也不会重复退。
  function refundForm(article, order) {
    const key = 'dl-order-refund-' + order.id, left = order.totalCents - order.refundCents;
    let pending = null;
    try { pending = JSON.parse(sessionStorage.getItem(key)); } catch {}
    const plan = order.refundItems, rows = plan?.rows || [];
    let byItem = Boolean(rows.length && !plan.unavailable && (!pending || pending.items));
    const form = document.createElement('form');
    form.className = 'report-refund-form';
    form.innerHTML = `<label class="refund-mode">退款方式<select name="refundMode" ${pending ? 'disabled' : ''}><option value="items" ${byItem ? 'selected' : ''} ${!rows.length || plan?.unavailable ? 'disabled' : ''}>按菜品退款</option><option value="amount" ${!byItem ? 'selected' : ''}>按金额退款</option></select></label>
      <fieldset class="refund-items" ${!byItem ? 'hidden' : ''}><legend>选择菜品和退款份数</legend>${rows.map(r => `<label class="refund-item"><span>${esc(r.name)}${r.style ? `<small>${esc(r.style)}</small>` : ''}<small>可退 ${r.qty-r.used} 份</small></span><select data-refund-line="${r.line}" aria-label="${esc(r.name)}退款份数" ${pending ? 'disabled' : ''}>${Array.from({length:r.qty-r.used+1},(_,q)=>`<option value="${q}" ${pending?.items?.some(i=>i.line===r.line&&i.qty===q)?'selected':''}>${q} 份</option>`).join('')}</select></label>`).join('')}<small>按实付金额分摊优惠及费用，含对应服务费；赠品不退现金。</small></fieldset>
      ${plan?.unavailable ? `<p class="refund-help">${esc(plan.unavailable)}</p>` : ''}
      <label>退款金额 S$<input name="amount" type="number" inputmode="decimal" min="0.01" step="0.01" max="${(left / 100).toFixed(2)}" value="${((pending?.amountCents ?? left) / 100).toFixed(2)}" required></label>
      <label>原因<input name="reason" maxlength="200" required placeholder="例如：菜品售罄" value="${esc(pending?.reason || '')}"></label>
      ${order.paymentMethod==='counter'?'<label class="refund-counter-confirm"><input type="checkbox" name="counterConfirmed" required>我已在柜台退还此笔款项（现金或刷卡机）</label>':''}
      <div><button type="submit" class="primary">确认退款</button><button type="button" data-refund-cancel>取消</button></div><p role="status"></p>`;
    article.append(form);
    const status = form.querySelector('[role=status]'), submit = form.querySelector('[type=submit]');
    const selected = () => [...form.querySelectorAll('[data-refund-line]')].filter(el=>Number(el.value)>0).map(el=>({line:Number(el.dataset.refundLine),qty:Number(el.value)}));
    const label = () => {
      form.amount.readOnly = byItem || Boolean(pending);
      form.reason.readOnly = Boolean(pending);
      form.querySelector('.refund-items').hidden = !byItem;
      if (pending) form.amount.value = (pending.amountCents/100).toFixed(2);
      else if (byItem) form.amount.value = (selected().reduce((sum,i)=>{const r=rows[i.line];return sum+r.unitCents.slice(r.used,r.used+i.qty).reduce((s,c)=>s+c,0)},0)/100).toFixed(2);
      const c = Math.round(Number(form.amount.value) * 100); submit.textContent = c > 0 ? `确认退款 ${money(c)}` : '确认退款'; };
    form.amount.oninput = label; form.refundMode.onchange = () => { byItem = form.refundMode.value === 'items'; label(); }; form.querySelectorAll('[data-refund-line]').forEach(el=>el.onchange=label); label();
    form.querySelector('[data-refund-cancel]').onclick = () => { form.remove(); article.querySelector('[data-refund-order]').hidden = false; };
    form.onsubmit = async e => {
      e.preventDefault();
      if (submit.disabled) return;
      const amountCents = Math.round(Number(form.amount.value) * 100), reason = form.reason.value.trim();
      if (pending && (pending.amountCents !== amountCents || pending.reason !== reason)) { status.textContent = '上一笔退款结果还没确认，请用原来的金额和原因再点一次。'; return; }
      if (amountCents <= 0) { status.textContent = '请选择需要退款的菜品份数'; return; }
      pending ||= { refundId: crypto.randomUUID(), amountCents, reason, ...(order.paymentMethod==='counter'?{counterConfirmed:true}:{}), ...(byItem ? {items:selected()} : {}) };
      try { sessionStorage.setItem(key, JSON.stringify(pending)); } catch {}
      form.querySelectorAll('select').forEach(el=>el.disabled=true); form.amount.readOnly=true; form.reason.readOnly=true;
      submit.disabled = true; status.textContent = '正在退款…';
      try {
        await request('/api/online', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'staff-refund', id: order.id, ...pending }) });
        try { sessionStorage.removeItem(key); } catch {}
        refresh();
      } catch (err) {
        // 结果未确认（503）时保留编号，其余是明确失败，可以换金额重来。
        if (err.status && err.status !== 503) { try { sessionStorage.removeItem(key); } catch {} pending = null; }
        status.textContent = err.message; submit.disabled = false;
        if (!pending) { form.querySelectorAll('select').forEach(el=>el.disabled=false); label(); }
      }
    };
    form.amount.focus();
  }
  function niceStep(v) { const p = 10 ** Math.floor(Math.log10(Math.max(v, 1))), n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; }

  let latestReport = null;
  function render(report) {
    latestReport = report;
    const p = $('#reportPanel'), t = report.totals, rows = dishRows(report.dishes);
    const bySales = sort === 'sales', value = r => bySales ? r.salesCents : r.qty;
    const topValue = Math.max(1,...rows.map(value));
    const columns=rows.slice(0,10);
    if(rows.length>10)columns.push(rows.slice(10).reduce((a,r)=>({...a,qty:a.qty+r.qty,salesCents:a.salesCents+r.salesCents}),{name:`其他 ${rows.length-10} 道菜`,qty:0,salesCents:0}));
    const columnMax=Math.max(1,...columns.map(value));
    const detail=r=>`${r.name} · ${r.qty} 份 · ${money(r.salesCents)}`;
    const modeText = Object.entries(report.byMode).map(([m, v]) => `${modes[m] || m} ${v.orders} 单 · ${money(v.netCents)}`).join('　') || '—';
    p.querySelector('#reportBody').innerHTML = t.orders ? `
      <div class="report-stats">
        <div class="report-hero"><span>实收营业额</span><strong>${money(t.netCents)}</strong><small>${esc(modeText)}</small></div>
        <div><span>订单数</span><strong>${t.orders}</strong></div>
        <div><span>客单价</span><strong>${money(t.averageCents)}</strong></div>
        <div><span>下单份数</span><strong>${t.items}</strong></div>
      </div>
      <p class="report-ledger">菜品金额 ${money(t.foodCents)}　·　折扣与兑换 −${money(t.discountCents)}　·　服务费 ${money(t.serviceCents)}　·　退款 −${money(t.refundCents)}</p>
      ${chart(report.byDay, p.querySelector('#reportBody').clientWidth - 48)}
      <div class="report-dishes"><div class="report-dishes-head"><h3>菜品统计</h3><span class="muted">${rows.length} 道菜</span></div>
      <p class="report-stat-note">份数为已付款订单的下单数量，含赠品，未扣退菜。菜品金额按下单时菜价计算，未扣整单优惠与退款，不含服务费；实际收入看上方实收营业额。</p>
      <div class="dish-overview" aria-label="菜品统计柱状图">
        <div class="dish-overview-key"><span>${bySales?'菜品金额（S$）':'下单份数'} · 当前排序前10道菜，其余合并</span><span>点击柱子查看</span></div>
        <div class="dish-columns" style="--columns:${Math.max(1,columns.length)}">${columns.map((r,i)=>`<button type="button" class="dish-column" data-column="${i}" aria-label="${esc(detail(r))}" aria-pressed="${i===0}" title="${esc(detail(r))}"><span class="dish-column-plot"><span class="dish-column-bar" style="height:${(value(r)/columnMax*100).toFixed(2)}%"><span class="dish-column-number">${bySales?(r.salesCents/100).toFixed(2):r.qty}</span></span></span><span class="dish-column-label">${esc(i===10?'其他':r.name)}</span><span class="dish-column-short">${i===10?'其他':i+1}</span></button>`).join('')}</div>
        <p class="dish-column-detail" role="status">${columns.length?esc(detail(columns[0])):'没有符合搜索条件的菜品。'}</p>
      </div>
      <details class="report-full-ranking"><summary>查看完整排行与做法明细（${rows.length} 道菜）</summary>
      <div class="dish-chart" aria-label="${bySales?'菜品金额':'下单份数'}排行">
        <div class="dish-chart-heading"><span>菜品</span><span>${bySales?'菜品金额（S$）':'下单份数'}</span></div>
        <ol class="dish-chart-list">${rows.map((r,i)=>`<li class="dish-chart-row">
          <div class="dish-chart-name"><span class="dish-chart-rank">${i+1}</span><div><strong>${esc(r.name)}</strong>${r.parts.length?`<details class="report-breakdown"><summary>做法与份量 · ${r.parts.length} 项</summary><ul>${r.parts.map(part=>`<li>${esc(part)}</li>`).join('')}</ul></details>`:''}</div></div>
          <div class="dish-chart-track" aria-hidden="true"><span style="width:${(value(r)/topValue*100).toFixed(2)}%"></span></div>
          <div class="dish-chart-value"><strong>${bySales?money(r.salesCents):r.qty+' 份'}</strong><small>${bySales?r.qty+' 份':money(r.salesCents)}${r.giftQty?` · 赠 ${r.giftQty} 份`:''}</small></div>
        </li>`).join('')}</ol>
      </div>${rows.length?'':'<p class="report-stat-note">没有符合搜索条件的菜品。</p>'}</details></div>
      <details class="report-full-orders"><summary>查看订单明细（${report.orders.length} 单）</summary>${orderList(report)}</details>`
      : `<div class="empty-state"><h3>这段时间没有已付款的订单</h3><p>换一个日期范围看看。</p></div>`;
    p.querySelectorAll('[data-column]').forEach(b=>{b.onclick=()=>{p.querySelector('.dish-column-detail').textContent=detail(columns[Number(b.dataset.column)]);p.querySelectorAll('[data-column]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));};});
    p.querySelectorAll('[data-refund-print]').forEach(b=>{b.onclick=async()=>{
      if(b.disabled)return;
      const key='dl-refund-print-'+b.dataset.orderId+'-'+b.dataset.refundPrint;
      let copyId=sessionStorage.getItem(key)||crypto.randomUUID();sessionStorage.setItem(key,copyId);
      b.disabled=true;
      try{await request('/api/online',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'refund-receipt',id:b.dataset.orderId,refundId:b.dataset.refundPrint,copyId})});sessionStorage.removeItem(key);b.textContent='已加入吧台打印队列';}
      catch(e){b.textContent='补打未确认，点击重试';b.title=e.message;}
      finally{b.disabled=false;}
    };});
    p.querySelectorAll('[data-refund-order]').forEach(b => { b.onclick = () => { b.hidden = true; refundForm(b.closest('.report-order'), report.orders.find(o => o.id === b.dataset.refundOrder)); }; });
    const tip = p.querySelector('.report-tip'), wrap = p.querySelector('.report-chart-wrap');
    if (wrap) {
      const show = e => { const g = e.target.closest('.report-bar'); if (!g) return; tip.textContent = g.dataset.tip; tip.hidden = false;
        const a = wrap.getBoundingClientRect(), b = g.getBoundingClientRect(); tip.style.left = Math.min(a.width - tip.offsetWidth, Math.max(0, b.left - a.left + b.width / 2 - tip.offsetWidth / 2)) + 'px'; };
      wrap.onmouseover = show; wrap.onfocusin = show; wrap.onmouseleave = wrap.onfocusout = () => { tip.hidden = true; };
    }
  }

  async function refresh() {
    const run = ++epoch, p = $('#reportPanel');latestReport=null;
    const [from, to] = range === 'custom' ? custom : ranges[range]();
    p.querySelectorAll('[data-report-range]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.reportRange === range)));
    p.querySelector('#reportFrom').value = from; p.querySelector('#reportTo').value = to;
    p.querySelector('#reportRangeLabel').textContent = from === to ? from : `${from} 至 ${to}`;
    p.querySelector('#reportBody').innerHTML = '<p class="reward-admin-message">正在统计…</p>';
    try {
      const out = await request(`/api/online?report=1&from=${from}&to=${to}&mode=${mode}`);
      if (run === epoch) render(out.report);
    } catch (e) { if (run === epoch) p.querySelector('#reportBody').innerHTML = `<p class="notice" data-tone="error">${esc(e.message)}</p>`; }
  }

  function load(requestFn, catalogItems = []) {
    request = requestFn; items = catalogItems;
    const p = $('#reportPanel');
    if (!p.dataset.ready) {
      p.dataset.ready = '1';
      p.innerHTML = `<div class="panel-heading"><div><h2>订单汇总</h2><span class="muted" id="reportRangeLabel"></span></div><span class="muted">按新加坡付款日期统计，实收已扣退款</span></div>
        <div class="toolbar report-toolbar"><div class="report-presets" role="group" aria-label="统计日期">${Object.keys(ranges).map(k => `<button type="button" class="report-range" data-report-range="${k}" aria-pressed="false">${labels[k]}</button>`).join('')}
          </div><div class="report-dates"><label class="report-date"><span class="sr-only">开始日期</span><input id="reportFrom" type="date"></label><span class="report-date-separator">至</span><label class="report-date"><span class="sr-only">结束日期</span><input id="reportTo" type="date"></label></div></div>
        <div class="toolbar report-filters"><label>用餐方式<select id="reportMode"><option value="all">全部</option><option value="dinein">堂食</option><option value="takeaway">打包自取</option><option value="delivery">外送</option></select></label><label>菜品排序<select id="reportSort"><option value="qty-desc">下单份数：高到低</option><option value="qty-asc">下单份数：低到高</option><option value="sales">菜品金额：高到低</option></select></label><label>搜索菜品<input id="reportSearch" type="search" placeholder="菜名、做法或份量"></label></div>
        <div id="reportBody"></div>`;
      p.querySelector('#reportMode').value=mode;p.querySelector('#reportSort').value=sort;p.querySelector('#reportSearch').value=search;
      p.querySelector('#reportMode').onchange=e=>{mode=e.target.value;refresh();};
      p.querySelector('#reportSort').onchange=e=>{sort=e.target.value;if(latestReport)render(latestReport);};
      p.querySelector('#reportSearch').oninput=e=>{search=e.target.value.trim();if(latestReport)render(latestReport);};
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
