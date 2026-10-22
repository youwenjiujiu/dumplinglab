(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const sections = {dumplings:'饺子／云吞',noodles:'面条',sides:'配菜',cold:'凉菜',drinks:'饮品',recommended:'固定搭配'};
  const fieldNames = {choiceOptions:'顾客可选项',cn:'中文名',name:'英文名',flavor:'描述',section:'分类',sort:'排序',active:'上下架',recommended:'推荐 👍',soldOut:'临时售罄',price:'价格',enabledPreparations:'开启做法',preparationExtras:'做法加价',portionSizes:'份量颗数',portionPrices:'规格价格',stock:'实有库存',imageUrl:'默认图片',preparationImageUrls:'按做法配图',description:'套餐介绍',descriptionEn:'英文介绍',visible:'菜单展示',start:'开始供应',end:'结束供应',drinkChoices:'饮品选项',fillingChoices:'馅料选项',noodleChoices:'面条选项',preparationChoices:'可选做法',sideDumplings:'配餐煎饺',includedColdDish:'固定凉菜',optionalNoodlesExtra:'加面价格',printStation:'出单打印机',promo:'单品活动'};
  let preparationPhotoDraft={}, optionsDraft=null, pending=[];
  let beforeCutout=null, cutoutWorker=null, cutoutTask=null, cutoutSequence=0, cutoutOperation=0, cutoutAbort=null;
  let password = '', data = null, selected = null, busy = false, view = location.hash==='#lunchsets'?'lunchsets':'catalog', authEpoch = 0, editRevision = 0, returnFocus = null;
  try { password = sessionStorage.getItem('dl-staff-password') || ''; } catch {}
  const form = $('#editForm');
  const auth = () => 'Basic ' + btoa(String.fromCharCode(...new TextEncoder().encode('staff:' + password)));
  const message = (s, tone = 'success') => { for (const id of ['message','loginMessage']) { $('#' + id).textContent = s; $('#' + id).dataset.tone = tone; } };
  const minimum = d => d.variants ? Math.min(...Object.values(d.variants).map(v => v.pieces)) : 1;
  const low = d => d.active && !d.soldOut && d.available !== null && d.available < minimum(d) * 3;
  const statusText = d => d.active === false ? '已下架' : d.soldOut ? '已售罄' : '在售';
  const image = d => d.imageUrl || (!d.img ? '/brand/dumpling-lab-primary.png' : '/img/s/' + (globalThis.DL_MENU_ART?.[d.img] || d.img || '').replace(/\.(png|jpe?g|webp)$/i, '.webp'));
  const station = d => d.printStation || (['drinks','cold'].includes(d.section) ? 'bar' : 'kitchen');
  const stationName = d => station(d)==='bar' ? '吧台出单' : '厨房出单';
  const prior = (d, key) => key === 'choiceOptions' ? d.choiceOptions || null : key === 'preparationImageUrls' ? d.preparationImageUrls||{} : key === 'recommended' ? Boolean(d.recommended) : key === 'printStation' ? station(d) : key === 'promo' ? d.promo || null : key === 'soldOut' ? d.manualSoldOut || false : key === 'imageUrl' ? d.imageUrl || '' : d[key];
  function authenticated(on) {
    $('#loginScreen').hidden = on; $('#adminApp').hidden = !on;
    document.title = on ? '商家后台 · Dumpling Lab' : '登录商家后台 · Dumpling Lab';
    $('#login').hidden = on; $('#workspace').hidden = !on;
    for (const id of ['logout', 'refresh', 'updated']) $('#' + id).hidden = !on;
    $('#accountLabel').textContent = on ? '店员' : '未登录';
    $$('[data-view]').forEach(b => { b.disabled = !on; });
  }
  async function request(url, options = {}) {
    const epoch = authEpoch;
    const r = await fetch(url, {...options, cache:'no-store', headers:{authorization:auth(), ...options.headers}});
    const out = await r.json();
    if (epoch !== authEpoch) throw new Error('登录状态已变化，请重新登录');
    if (!r.ok) {
      if (r.status === 401) {
        globalThis.LunchSetAdmin?.clear();
        authenticated(false);
        if ($('#editor').open) $('#editor').close();
        try { sessionStorage.removeItem('dl-staff-password'); } catch {}
      }
      throw new Error(out.error || '操作失败，请重试');
    }
    return out;
  }
  function setView(next) {
    view = ['catalog','inventory','history','rewards','wallet','lunchsets','settings','report'].includes(next) ? next : 'catalog';
    document.body.dataset.view = view;
    $('#catalogPanel').hidden = ['history','rewards','wallet','lunchsets','settings','report'].includes(view); $('#historyPanel').hidden = view !== 'history';
    $('.metrics').hidden = ['history','rewards','wallet','lunchsets','settings','report'].includes(view);
    $('#settingsPanel').hidden = view !== 'settings';
    $('#pendingPanel').hidden = !['catalog','inventory'].includes(view) || !pending.length;
    $('#reportPanel').hidden = view !== 'report';
    if (view === 'report' && data) globalThis.ReportAdmin?.load(request, data.items);
    $('#walletPanel').hidden=view!=='wallet';
    $('#lunchSetsPanel').hidden=view!=='lunchsets';
    if(view==='lunchsets'&&data)globalThis.LunchSetAdmin?.render({request,data,preparePhoto,onSaved:result=>{data=result;render();setView(view);stamp();message('午市套餐已保存并同步至顾客菜单')}});
    if(view==='wallet'&&data)globalThis.WalletAdmin?.load(request);
    $('#rewardsPanel').hidden = view !== 'rewards';
    if(view==='rewards'&&data)globalThis.RewardAdmin?.load(request,data.items);
    $('#pageTitle').textContent = $('#breadcrumb').textContent = ({lunchsets:'午市套餐',catalog:'菜品管理',inventory:'库存管理',history:'操作记录',rewards:'积分与兑换',wallet:'充值与余额',settings:'堂食设置',report:'订单汇总'})[view];
    $('#pageDescription').textContent = ({lunchsets:'设置套餐搭配、价格、供应时段及吸引顾客的套餐配图。',catalog:'改价格、调整销售状态，或编辑菜品完整资料。',inventory:'核对实有、预占与可售数量，按实际数量盘点库存。',history:'查看菜品更新与库存变动的时间和明细。',rewards:'设置消费积分与可兑换的配菜、饮品。',wallet:'核对充值、余额支付及退款记录。',settings:'给包场或熟客的桌子打折。',report:'营业额与热销菜品，按付款时间统计（新加坡时间）。'})[view];
    $('#listTitle').textContent = view === 'inventory' ? '库存盘点' : '菜品列表';
    $$('[data-view]').forEach(b => b.setAttribute('aria-current', b.dataset.view === view ? 'page' : 'false'));
  }
  function render() {
    const query = $('#search').value.trim().toLowerCase(), section = $('#section').value, status = $('#status').value;
    const list = data.items.filter(d => (d.cn + ' ' + d.name).toLowerCase().includes(query) && (!section || d.section === section) && (!status || (status === 'inactive' ? d.active === false : status === 'recommended' ? d.recommended : status === 'sold' ? d.active && d.soldOut : status === 'low' ? low(d) : d.active && !d.soldOut)));
    $('#countAll').textContent = data.items.length;
    $('#countAvailable').textContent = data.items.filter(d => d.active && !d.soldOut).length;
    $('#countLow').textContent = data.items.filter(low).length;
    $('#countSold').textContent = data.items.filter(d => d.active && d.soldOut).length;
    $$('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === status && !section && !query)));
    $('#summary').textContent = `共 ${data.items.length} 道`;
    $('#resultCount').textContent = `显示 ${list.length} / ${data.items.length} 道菜品`;
    $('#resetFilters').hidden = !query && !section && !status;
    $('#emptyState').hidden = list.length > 0;
    $('#list').innerHTML = list.map(d => `<tr>
      <td><div class="product"><img src="${esc(image(d))}" alt="" loading="lazy"><div><strong>${esc(d.cn)}</strong><small>${esc(d.name)}</small></div></div></td>
      <td class="category-col"><span class="category-text">${esc(sections[d.section] || d.section)}</span><small class="print-station">${stationName(d)}</small></td>
      <td class="price price-col" data-label="售价 / SGD">$${d.price.toFixed(2)}${d.variants ? '<small>起</small>' : ''}${d.promo ? `<small class="promo-badge ${promoEnded(d.promo) ? 'ended' : ''}">${esc(promoText(d.promo))}</small>` : ''}</td>
      <td class="inventory stock-col ${low(d) ? 'low' : ''}" data-label="可售库存"><strong>${d.available === null ? '不限量' : `${d.available} <small class="unit">${esc(d.stockUnit)}</small>`}</strong>${d.stock !== null ? `<small>实有 ${d.stock} ${esc(d.stockUnit)}</small>` : ''}${low(d) ? '<small>库存偏低</small>' : ''}${d.reserved ? `<small>待付款预占 ${d.reserved} ${esc(d.stockUnit)}</small>` : ''}${d.stockPool ? `<small>与「${esc(data.items.find(x => x.id === d.stockPool)?.cn || '')}」共用库存</small>` : ''}${(d.choiceOptions?.items || []).some(o => o.active && o.stock !== null && o.stock !== undefined) ? `<small class="option-stock">${d.choiceOptions.items.filter(o => o.active).map(o => esc(o.cn) + ' ' + (o.stock === null || o.stock === undefined ? '不限' : o.available < 1 ? '售罄' : o.available)).join(' · ')}</small>` : ''}</td>
      <td class="status-col"><span class="tag ${d.active === false ? 'inactive' : d.soldOut ? 'sold' : ''}"><i class="dot"></i>${statusText(d)}</span></td>
      <td class="align-right edit-col"><div class="row-actions"><button class="edit-button recommend-toggle ${d.recommended?'is-recommended':''}" data-recommend="${esc(d.id)}" aria-pressed="${Boolean(d.recommended)}" aria-label="${d.recommended?'取消':'设置'}${esc(d.cn)}推荐">推荐 👍</button><button class="edit-button quick-print" data-edit="${esc(d.id)}" data-mode="printing" aria-label="设置${esc(d.cn)}出单打印机">出单</button><button class="edit-button quick-promo ${d.promo && !promoEnded(d.promo) ? 'is-on' : ''}" data-edit="${esc(d.id)}" data-mode="promo" aria-label="设置${esc(d.cn)}单品活动">活动</button><button class="edit-button quick-photo" data-edit="${esc(d.id)}" data-mode="image" aria-label="更换${esc(d.cn)}图片">换图</button><button class="edit-button quick-price" data-edit="${esc(d.id)}" data-mode="price" aria-label="修改${esc(d.cn)}价格">改价</button><button class="edit-button quick-stock" data-edit="${esc(d.id)}" data-mode="stock" aria-label="盘点${esc(d.cn)}库存">盘点</button><button class="edit-button" data-edit="${esc(d.id)}" aria-label="编辑${esc(d.cn)}">详情 <span aria-hidden="true">↗</span></button></div></td>
    </tr>`).join('');
    $('#audit').innerHTML = (data.audit || []).slice(0, 200).map(a => {
      const dish = data.items.find(d => d.id === a.id);
      if (a.action === 'settings') {
        const d = a.details || {};
        const [title, detail] = [`堂食设置 · ${a.id} 桌折扣`, d.tableDiscount ? discountText(d.tableDiscount) : '已取消'];
        return `<article class="audit-row"><span class="audit-icon" aria-hidden="true">⚙</span><div><strong>${esc(title)}</strong><p>${esc(detail)}</p></div><time datetime="${esc(a.at)}">${esc(new Date(a.at).toLocaleString('zh-SG', {month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}))}</time></article>`;
      }
      const title = a.action === 'lunch-set-edit' ? `更新午市套餐 · ${data.lunchSets?.find(s=>s.key===a.id)?.cn||a.id}` : a.action === 'create' ? `新增菜品 · ${dish?.cn || a.id}` : a.action === 'edit' ? `更新菜品 · ${dish?.cn || a.id}` : ({consumed:'付款成功 · 扣减库存',released:'取消 / 过期 · 释放预占'})[a.action] || a.action;
      const details = ['edit','create','lunch-set-edit'].includes(a.action) ? Object.keys(a.details || {}).map(k => fieldNames[k] || k).join('、') : Object.entries(a.details || {}).map(([id, n]) => { const d = data.items.find(d => d.id === id); return `${d?.cn || id} ${n} ${d?.stockUnit || ''}`; }).join(' · ');
      return `<article class="audit-row"><span class="audit-icon" aria-hidden="true">${a.action === 'edit' ? '↗' : '↺'}</span><div><strong>${esc(title)}</strong><p>${esc(details || '资料已更新')}</p></div><time datetime="${esc(a.at)}">${esc(new Date(a.at).toLocaleString('zh-SG', {month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}))}</time></article>`;
    }).join('') || '<div class="empty-state"><h3>暂无操作记录</h3><p>发布菜品或发生库存变动后，会在这里留下记录。</p></div>';
  }
  const discountText = d => (d.type === 'percent' ? `减 ${d.value}%（打 ${+(10 - d.value / 10).toFixed(2)} 折）` : `减 S$${d.value.toFixed(2)}`) + (d.note ? ` · ${d.note}` : '');
  function renderSettings() {
    const s = data.settings || {tableDiscounts:{}};
    const rows = Object.entries(s.tableDiscounts).sort(([a], [b]) => a.localeCompare(b, 'en', {numeric:true}));
    $('#discountList').innerHTML = rows.length ? rows.map(([t, d]) => `<article class="discount-row"><strong>${esc(t)}</strong><span>${esc(discountText(d))}</span><div><button type="button" class="edit-button" data-discount-edit="${esc(t)}">修改</button><button type="button" class="edit-button" data-discount-clear="${esc(t)}">取消折扣</button></div></article>`).join('') : '<p class="muted discount-empty">目前没有桌子打折。</p>';
  }
  async function saveSettings(body, status) {
    const result = await request('/api/catalog', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(body)});
    data = result; render(); renderSettings(); stamp(); status.textContent = '';
  }
  function discountMode() {
    const f = $('#discountForm').elements, percent = f.type.value === 'percent';
    $('#discountValueLabel').textContent = percent ? '减免 %' : '减免金额 S$';
    f.value.max = percent ? '100' : '9999'; f.value.placeholder = percent ? '如 20' : '如 50';
    const v = Number(f.value.value);
    $('#discountHint').textContent = percent ? (v > 0 && v <= 100 ? `= 打 ${+(10 - v / 10).toFixed(2)} 折` : '输入 20 = 打 8 折') : '从这桌每张单的菜品金额里减';
  }
  $('#discountForm').elements.type.onchange = discountMode;
  $('#discountForm').elements.value.oninput = discountMode;
  $('#discountForm').onsubmit = async e => {
    e.preventDefault();
    const f = e.target.elements, status = $('#discountMessage'), button = $('#saveDiscount');
    button.disabled = true;
    try {
      const table = f.table.value.trim().toUpperCase();
      await saveSettings({action:'table-discount', table, discount:{type:f.type.value, value:Number(f.value.value), note:f.note.value}}, status);
      e.target.reset(); discountMode(); status.dataset.tone = 'success'; status.textContent = `${table} 桌折扣已保存`;
    } catch (err) { status.dataset.tone = 'error'; status.textContent = err.message; }
    finally { button.disabled = false; }
  };
  $('#discountList').onclick = async e => {
    const edit = e.target.closest('[data-discount-edit]'), clear = e.target.closest('[data-discount-clear]'), status = $('#discountMessage');
    if (edit) {
      const t = edit.dataset.discountEdit, d = data.settings.tableDiscounts[t], f = $('#discountForm').elements;
      f.table.value = t; f.type.value = d.type; f.value.value = d.value; f.note.value = d.note || ''; discountMode(); f.value.focus();
    }
    if (clear) {
      const t = clear.dataset.discountClear; clear.disabled = true;
      try { await saveSettings({action:'table-discount', table:t, discount:null}, status); status.dataset.tone = 'success'; status.textContent = `${t} 桌已取消折扣`; }
      catch (err) { clear.disabled = false; status.dataset.tone = 'error'; status.textContent = err.message; }
    }
  };
  // 待付款订单：客人已进入付款页但还没付完，这些单占着库存，15 分钟没付完自动作废并释放。
  const placeName = o => o.mode === 'dinein' ? `${o.table || '—'} 桌${o.group && o.group !== 'A' ? ' · ' + o.group : ''}` : o.mode === 'takeaway' ? '打包自取' : '外送';
  const clock = iso => new Date(iso).toLocaleTimeString('zh-SG', {hour:'2-digit', minute:'2-digit', timeZone:'Asia/Singapore'});
  function renderPending() {
    const box = $('#pendingPanel');
    box.innerHTML = pending.length ? `<div class="panel-heading"><div><h2>待付款订单</h2><span class="muted">${pending.length} 笔 · 客人已进入付款页但还没付款，菜品库存先被占住</span></div><span class="muted">过期后自动释放</span></div>
      <div class="pending-list">${pending.map(o => `<article class="pending-row"><div><strong>${esc(placeName(o))}</strong><small>单号 ${esc(o.no)} · ${clock(o.at)} 开始 · ${clock(o.expiresAt)} 过期</small><p>${o.items.map(i => esc(i.name + (i.style ? '（' + i.style + '）' : '') + ' ×' + i.qty + (i.promo === 'bogo' ? ' 赠送' : ''))).join('，')}</p></div><b>S$${Number(o.total).toFixed(2)}</b><button type="button" class="edit-button" data-cancel-payment="${esc(o.id)}">取消这笔付款</button></article>`).join('')}</div>` : '';
    box.hidden = !['catalog','inventory'].includes(view) || !pending.length;
  }
  async function loadPending() {
    try { pending = (await request('/api/online?pending=1')).orders || []; } catch { pending = []; }
    renderPending();
  }
  $('#pendingPanel').addEventListener('click', async e => {
    const button = e.target.closest('[data-cancel-payment]'); if (!button || busy) return;
    const o = pending.find(o => o.id === button.dataset.cancelPayment); if (!o) return;
    if (!confirm(`取消 ${placeName(o)} 这笔 S$${Number(o.total).toFixed(2)} 的付款？\n系统会先作废付款链接；如果客人已经付了钱，不会取消。`)) return;
    button.disabled = true; button.textContent = '正在取消…';
    try {
      await request('/api/online', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({action:'staff-cancel', id:o.id})});
      message(`已取消 ${placeName(o)} 的付款，占用的库存已释放`);
      await load();
    } catch (error) { message(error.message, 'error'); button.disabled = false; button.textContent = '取消这笔付款'; }
  });
  function stamp() {
    $('#updated').textContent = '更新于 ' + new Date().toLocaleTimeString('zh-SG', {hour:'2-digit',minute:'2-digit'});
  }
  async function load() {
    const button = $('#refresh'); button.disabled = true; $('#loginButton').disabled = true;
    const epoch = authEpoch;
    $('#loginButton').textContent = '正在登录…'; button.textContent = '正在刷新…';
    try {
      const result = await request('/api/catalog?admin=1');
      if (epoch !== authEpoch) return;
      data = result; authenticated(true); render(); renderSettings(); setView(view); stamp(); message(''); loadPending();
    } catch (e) { if (epoch === authEpoch) message(e.message, 'error'); }
    finally { button.disabled = false; button.textContent = '↻ 刷新数据'; $('#loginButton').disabled = false; $('#loginButton').textContent = '登录后台 →'; }
  }
  $('#login').onsubmit = async e => {
    e.preventDefault(); if ($('#loginButton').disabled) return;
    authEpoch++; password = new FormData(e.target).get('password'); await load();
    if (data && !$('#workspace').hidden) { try { sessionStorage.setItem('dl-staff-password', password); } catch {} e.target.reset(); }
  };
  $('#logout').onclick = () => {
    globalThis.LunchSetAdmin?.clear();globalThis.RewardAdmin?.clear();globalThis.WalletAdmin?.clear();globalThis.ReportAdmin?.clear();
    cancelCutout();authEpoch++; password = ''; data = null; selected = null;
    try { sessionStorage.removeItem('dl-staff-password'); } catch {}
    authenticated(false); if ($('#editor').open) $('#editor').close(); setView('catalog'); $('#list').innerHTML = ''; $('#audit').innerHTML = ''; message('已退出登录');
  };
  $('#refresh').onclick = load;
  for (const id of ['search','section','status']) $('#' + id).addEventListener('input', () => data && render());
  function resetFilters() { for (const id of ['search','section','status']) $('#' + id).value = ''; if (data) render(); }
  $('#resetFilters').onclick = $('#clearEmpty').onclick = resetFilters;
  $$('[data-view]').forEach(b => { b.onclick = () => setView(b.dataset.view); });
  $$('[data-filter]').forEach(b => { b.onclick = () => { resetFilters(); $('#status').value = b.dataset.filter; setView(view === 'inventory' ? 'inventory' : 'catalog'); render(); }; });

  // 单品活动. End times are entered in Singapore time.
  const sgInput = iso => iso ? new Date(Date.parse(iso) + 8 * 3600000).toISOString().slice(0, 16) : '';
  const promoEnded = p => Boolean(p?.endsAt) && Date.parse(p.endsAt) <= Date.now();
  const promoText = p => !p ? '' : (p.type === 'bogo' ? '买一赠一' : p.type === 'price' ? `特价 S$${p.value.toFixed(2)}` : `减 ${p.value}%（打 ${+((100 - p.value) / 10).toFixed(1)} 折）`)
    + (promoEnded(p) ? ' · 已结束' : p.endsAt ? ` · 至 ${sgInput(p.endsAt).slice(5).replace('-', '/').replace('T', ' ')}` : '');
  function promoFromForm() {
    const f = form.elements, type = f.promoType.value;
    if (!type) return null;
    const promo = {type};
    if (type !== 'bogo') promo.value = Number(f.promoValue.value);
    if (f.promoEnds.value) promo.endsAt = new Date(f.promoEnds.value + ':00+08:00').toISOString();
    return promo;
  }
  function promoMode() {
    const f = form.elements, type = f.promoType.value, price = Number(f.price?.value) || selected?.price || 0;
    $('#promoValueField').hidden = !type || type === 'bogo';
    f.promoValue.required = Boolean(type) && type !== 'bogo'; f.promoEnds.disabled = !type;
    f.promoValue.min = type === 'price' ? '0.01' : '1'; f.promoValue.max = type === 'price' ? '9999' : '99'; f.promoValue.step = type === 'price' ? '0.01' : '1';
    $('#promoValueLabel').textContent = type === 'price' ? '特价（SGD）' : '减免 %';
    const v = Number(f.promoValue.value);
    $('#promoHint').textContent = !type ? '可以给这道菜单独打折、设特价或买一赠一，到结束时间自动恢复原价。'
      : type === 'percent' ? (v >= 1 && v <= 99 ? `= 打 ${+((100 - v) / 10).toFixed(1)} 折。所有份量和口味一起打折。` : '输入 20 = 打 8 折。所有份量和口味一起打折。')
      : type === 'price' ? `原价 S$${price.toFixed(2)}，顾客看到原价划线和特价。`
      : '同一道菜每点两份，较便宜的一份免费，口味可以混搭。';
    if (selected?.promo && promoEnded(selected.promo) && JSON.stringify(promoFromForm()) === JSON.stringify(selected.promo)) $('#promoHint').textContent += ` 这个活动已经结束，顾客看到的是原价。`;
  }
  form.elements.promoType.onchange = () => { promoMode(); dirtyHint(); };
  form.addEventListener('input', promoMode);
  function collectPatch() {
    const f = form.elements;
    const patch = {cn:f.cn.value,name:f.name.value,flavor:f.flavor.value,section:f.section.value,sort:Number(f.sort.value),active:f.active.value === 'true',soldOut:f.soldOut.value === 'true',stock:f.unlimited.checked ? null : Number(f.stock.value),imageUrl:f.imageUrl.value.trim(),printStation:f.printStation.value,recommended:f.recommended.checked,preparationImageUrls:preparationPhotoDraft,choiceOptions:optionsDraft,promo:promoFromForm()};
    if (selected.variants) {const old=Object.keys(selected.portionPrices);patch.portionSizes=old.map(n=>Number(f['pieces_'+n].value));patch.portionPrices=Object.fromEntries(old.map((n,i)=>[patch.portionSizes[i],Number(f['price_'+n].value)]));if(!selected._new&&JSON.stringify(patch.portionSizes)===JSON.stringify(old.map(Number)))delete patch.portionSizes;}
    else patch.price = Number(f.price.value);
    if(selected.availablePreparations){patch.enabledPreparations=selected.availablePreparations.filter(id=>f['prep_enabled_'+id].checked);patch.preparationExtras=Object.fromEntries(selected.availablePreparations.map(id=>[id,Number(f['prep_extra_'+id].value)]));}

    for (const key of Object.keys(patch)) if (!selected._new && JSON.stringify(patch[key]) === JSON.stringify(prior(selected, key))) delete patch[key];
    return patch;
  }
  const dirty = () => selected && Object.keys(collectPatch()).length > 0;
  function dirtyHint() { $('#saveHint').textContent = dirty() ? '有未发布的修改' : '保存后同步至顾客菜单'; }
  function closeNow() {
    $('#editor').close(); selected = null; $('#discardPrompt').hidden = true;
    if (returnFocus?.isConnected) returnFocus.focus(); else $('#search').focus();
  }
  function close() {
    if (busy) return;
    if (dirty()) { $('#discardPrompt').hidden = false; $('#keepEditing').focus(); }
    else closeNow();
  }
  $('#closeEditor').onclick = $('#cancelEdit').onclick = close;
  $('#discardChanges').onclick = closeNow;
  $('#keepEditing').onclick = () => { $('#discardPrompt').hidden = true; $('#save').focus(); };
  $('#editor').addEventListener('cancel', e => { e.preventDefault(); close(); });
  form.addEventListener('input', dirtyHint);
  window.addEventListener('beforeunload', e => { if ($('#editor').open && (busy || dirty())) { e.preventDefault(); e.returnValue = ''; } });
  function editDish(item, button, mode = 'all') {
    if(busy) return;
    selected = structuredClone(item); if (!selected) return; preparationPhotoDraft=structuredClone(selected.preparationImageUrls||{}); beforeCutout=null; $('#undoCutout').hidden=true;
    returnFocus = button; editRevision = data.revision; form.reset(); $('#formMessage').textContent = ''; $('#discardPrompt').hidden = true;
    $('#editorTitle').textContent = selected.cn; $('#editorName').textContent = selected.name;
    $('#editorStatus').textContent = `${sections[selected.section]} · ${statusText(selected)} · ${stationName(selected)}`;
    for (const key of ['cn','name','flavor','section','sort','active','imageUrl']) form.elements[key].value = selected[key] ?? '';
    form.elements.printStation.value = station(selected);
    form.elements.promoType.value = selected.promo?.type || ''; form.elements.promoValue.value = selected.promo?.value ?? ''; form.elements.promoEnds.value = sgInput(selected.promo?.endsAt);
    for (const o of form.elements.promoType.options || []) if (o.value === 'price') o.disabled = Boolean(selected.variants || selected.choiceOptions?.items?.some(o => o.active && o.price !== null && o.price !== undefined));
    form.elements.recommended.checked=Boolean(selected.recommended);
    form.elements.soldOut.value = String(selected.manualSoldOut || false);
    form.elements.section.disabled = Boolean(selected.variants);
    form.elements.unlimited.checked = selected.stock === null;
    form.elements.stock.disabled = selected.stock === null; form.elements.stock.required = selected.stock !== null; form.elements.stock.value = selected.stock ?? '';
    for (const option of form.elements.section.options) option.disabled = !selected.variants && ['dumplings','recommended'].includes(option.value);
    $('#stockHint').textContent = `单位：${selected.stockUnit}。${selected.variants ? '所有做法与份量共用库存。' : ''}当前待付款预占 ${selected.reserved} ${selected.stockUnit}。`;
    const sharers = data.items.filter(d => d.stockPool === selected.id || Object.values(d.stockPoolByPrep || {}).includes(selected.id));
    if (selected.stockPool) {
      const owner = data.items.find(d => d.id === selected.stockPool);
      form.elements.unlimited.disabled = form.elements.stock.disabled = true;
      $('#stockHint').textContent = `这道菜和「${owner?.cn || ''}」共用库存（按${selected.stockUnit}计，每份扣 ${selected.variants ? '对应颗数' : selected.stockUnits || 1} ${selected.stockUnit}），请在「${owner?.cn || ''}」里盘点。`;
    } else {
      form.elements.unlimited.disabled = false;
      if (sharers.length) $('#stockHint').textContent += ` 「${sharers.map(d => d.cn).join('」「')}」也从这里扣库存${selected.stockUnits > 1 ? `；本菜每份扣 ${selected.stockUnits} ${selected.stockUnit}` : ''}。`;
    }
    $('#prices').innerHTML = selected.variants ? Object.entries(selected.portionPrices).map(([n, p]) => `<label>${selected.fixedPieces?'每份固定云吞颗数':'份量（颗）'}<input name="pieces_${n}" ${selected.fixedPieces?'readonly':''} type="number" min="1" max="100" step="1" required value="${n}"></label><label>该份量售价（SGD）<input name="price_${n}" type="number" min="0.01" max="9999" step="0.01" required value="${p}"></label>`).join('') : `<label>售价（SGD）<input name="price" type="number" min="0.01" max="9999" step="0.01" required value="${selected.price}"></label>`;
    if(selected.availablePreparations)$('#prices').insertAdjacentHTML('beforeend',`<p class="hint">上方为基础售价；顾客价格 = 份量基础售价 + 所选做法加价。至少开启一种做法。</p>${selected.availablePreparations.map(id=>`<label class="preparation-setting"><span><input type="checkbox" name="prep_enabled_${id}" ${selected.enabledPreparations.includes(id)?'checked':''}>开启${methodLabels[id]||id}</span><span>做法加价（SGD）</span><input name="prep_extra_${id}" type="number" min="0" max="9999" step="0.01" required value="${selected.preparationExtras[id]}"></label>`).join('')}`);
    $('#newTypeField').hidden = !selected._new;
    $('#newType').value = selected._type || 'simple';
    $$('[data-editor-section]').forEach(section => { section.hidden = mode !== 'all' && section.dataset.editorSection !== mode; });
    optionsDraft = selected.choiceOptions ? structuredClone(selected.choiceOptions) : null;
    $('#optionsSection').hidden = $('#optionsSection').hidden || Boolean(selected.variants); renderChoiceOptions();
    $('#editorTitle').textContent = selected._new ? '新增菜品' : `${mode === 'price' ? '改价' : mode === 'stock' ? '盘点库存' : mode === 'image' ? '更换图片' : mode === 'printing' ? '设置出单' : mode === 'promo' ? '单品活动' : '编辑菜品'} · ${selected.cn}`;
    $('#photoMeta').textContent = ''; $('#photoPreview').src = image(selected); promoMode(); dirtyHint(); $('#save').textContent = selected._new ? '创建菜品' : '保存并发布'; if(!$('#editor').open) $('#editor').showModal(); $('.editor-scroll').scrollTop = 0; updatePhotoActions();
  }
  $('#list').onclick = async e => {
    const toggle=e.target.closest('[data-recommend]');
    if(toggle&&data&&!busy){
      const d=data.items.find(d=>d.id===toggle.dataset.recommend);if(!d)return;
      toggle.disabled=true;const epoch=authEpoch;
      try{const result=await request('/api/catalog',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:d.id,revision:data.revision,patch:{recommended:!d.recommended},base:{recommended:Boolean(d.recommended)}})});if(epoch!==authEpoch)return;data=result;render();stamp();message(`${d.cn}已${d.recommended?'取消推荐':'加入推荐 👍'}`)}catch(error){if(epoch===authEpoch)message(error.message,'error')}finally{if(toggle.isConnected)toggle.disabled=false}
      return;
    }
    const button=e.target.closest('[data-edit]');if(!button||!data)return;
    const item=data.items.find(d=>d.id===button.dataset.edit);if(item)editDish(item,button,button.dataset.mode||'all');
  };
  function newDraft(type='simple', previous=null) {
    const template=type==='simple'?null:data.items.find(d=>d.kind===type&&!d.id.startsWith('custom-'));
    if(type!=='simple'&&!template)throw new Error('未找到可用的规格模板');
    const draft={...(template?structuredClone(template):{}),id:previous?.id||'custom-'+crypto.randomUUID(),_new:true,_stationTouched:previous?._stationTouched||false,_type:type,_templateId:template?.id,recommended:previous?.recommended??false,cn:previous?.cn||'',name:previous?.name||'',flavor:previous?.flavor||'',price:previous?.price||0,section:template?'dumplings':(['noodles','sides','cold','drinks'].includes(previous?.section||$('#section').value)?previous?.section||$('#section').value:'sides'),sort:previous?.sort??Math.min(9999,Math.max(-1,...data.items.map(d=>d.sort||0))+1),active:previous?.active??false,soldOut:false,manualSoldOut:false,stock:previous?.stock??null,reserved:0,available:null,stockUnit:template?'颗':'份',img:null,imageUrl:previous?.imageUrl||'',printStation:previous?.printStation || (['drinks','cold'].includes($('#section').value)?'bar':'kitchen')};
    delete draft.preparationImages;draft.preparationImageUrls=Object.fromEntries(Object.entries(previous?.preparationImageUrls||{}).filter(([method])=>template?.preparations?.includes(method)));
    if(template)draft.portionPrices=Object.fromEntries(Object.keys(template.portionPrices).map(n=>[n,previous?.portionPrices?.[n]||0]));
    return draft;
  }
  $('#newDish').onclick = () => {if(!busy&&data)editDish(newDraft(),$('#newDish'));};
  $('#newType').onchange = () => {
    if(!selected?._new||busy)return;
    const previous={...selected,...collectPatch()};
    editDish(newDraft($('#newType').value,previous),returnFocus);
  };
  form.elements.printStation.onchange = () => { if(selected)selected._stationTouched=true; };
  form.elements.section.onchange = () => {
    if(selected?._new&&!selected._stationTouched)form.elements.printStation.value=['drinks','cold'].includes(form.elements.section.value)?'bar':'kitchen';
    dirtyHint();
  };
  form.elements.unlimited.onchange = e => { form.elements.stock.disabled = e.target.checked; form.elements.stock.required = !e.target.checked; dirtyHint(); };
  form.elements.imageUrl.addEventListener('change', e => {
    const url = e.target.value.trim();
    if (!url) $('#photoPreview').src = image({...selected,imageUrl:''});
    else if (/^https:\/\//i.test(url) || /^\/api\/catalog-image\?id=/.test(url)) $('#photoPreview').src = url;
    beforeCutout=null;$('#undoCutout').hidden=true;updatePhotoActions();
  });
  let disabledBefore = [];
  function setBusy(on, label = selected?._new ? '创建菜品' : '保存并发布') {
    busy = on; $('#save').textContent = label;
    if (on) { disabledBefore = [...form.querySelectorAll('input,select,textarea,button')].map(el => [el, el.disabled]); disabledBefore.forEach(([el]) => { el.disabled = true; }); }
    else { disabledBefore.forEach(([el, was]) => { el.disabled = was; }); disabledBefore = []; }
  }
  function transparentBounds(img) {
    const scale = Math.min(1, 400 / Math.max(img.naturalWidth, img.naturalHeight)), w = Math.max(1, Math.round(img.naturalWidth * scale)), h = Math.max(1, Math.round(img.naturalHeight * scale));
    const probe = document.createElement('canvas'); probe.width = w; probe.height = h;
    const context = probe.getContext('2d', { willReadFrequently: true }); if (!context) return null;
    context.drawImage(img, 0, 0, w, h);
    const alpha = context.getImageData(0, 0, w, h).data;
    let left = w, top = h, right = -1, bottom = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (alpha[(y * w + x) * 4 + 3] > 12) { if (x < left) left = x; if (x > right) right = x; if (y < top) top = y; if (y > bottom) bottom = y; }
    if (right < 0) return null;
    const pad = Math.round(Math.max(right - left, bottom - top) * 0.03);
    const box = { x: Math.max(0, left - pad), y: Math.max(0, top - pad), w: Math.min(w, right + pad + 1) - Math.max(0, left - pad), h: Math.min(h, bottom + pad + 1) - Math.max(0, top - pad) };
    if (box.w * box.h > w * h * 0.9) return null; // already tight
    return { x: box.x / scale, y: box.y / scale, w: box.w / scale, h: box.h / scale };
  }
  async function encodePhoto(img, crop, type) {
    const ratio = Math.min(1, 1600 / Math.max(crop.w, crop.h)), canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(crop.w * ratio)); canvas.height = Math.max(1, Math.round(crop.h * ratio));
    const context = canvas.getContext('2d'); if (!context) throw new Error('浏览器无法处理图片，请改用 JPG 小图');
    context.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, canvas.width, canvas.height);
    for (const quality of [.92, .85, .75, .65]) {
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', quality));
      if (blob && blob.size <= 2 * 1024 * 1024) return blob;
    }
    throw new Error('照片压缩后仍超过 2 MB，请换一张较小的照片');
  }
  async function preparePhoto(file) {
    if (file.size > 20 * 1024 * 1024) throw new Error('照片超过 20 MB，请选择较小的文件');
    if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type) &&
        !(file.type === '' && /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name))) throw new Error('请选择 JPG、PNG、WebP 或 HEIC 照片');
    const objectUrl = URL.createObjectURL(file), img = new Image();
    try {
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('无法读取这张照片；HEIC 请先转成 JPG，或重新选择照片'));
        img.src = objectUrl;
      });
      if (!img.naturalWidth || !img.naturalHeight || img.naturalWidth * img.naturalHeight > 50000000) throw new Error('照片尺寸过大或无效，请先缩小照片');
      // Cut-out photos often keep a wide transparent border, which makes the dish look
      // small on the menu card. Trim it to the dish plus a thin margin.
      const crop = /^image\/(png|webp)$/i.test(file.type) ? transparentBounds(img) : null;
      if (crop) return encodePhoto(img, crop, file.type);
      if (file.size <= 2 * 1024 * 1024 && Math.max(img.naturalWidth, img.naturalHeight) <= 1600 &&
          /^image\/(jpeg|png|webp)$/i.test(file.type)) return file;
      const canvas = document.createElement('canvas');
      try {
        const ratio = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
        canvas.width = Math.max(1, Math.round(img.naturalWidth * ratio));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * ratio));
        const context = canvas.getContext('2d');
        if (!context) throw new Error('浏览器无法处理图片，请改用 JPG 小图');
        const mime = /png|webp/i.test(file.type) ? 'image/webp' : 'image/jpeg';
        if (mime === 'image/jpeg') { context.fillStyle = '#fff'; context.fillRect(0,0,canvas.width,canvas.height); }
        context.drawImage(img,0,0,canvas.width,canvas.height);
        for (const quality of [.9,.8,.7,.6]) {
          const blob = await new Promise(resolve => canvas.toBlob(resolve,mime,quality));
          if (blob && blob.size <= 2 * 1024 * 1024) return blob;
        }
        throw new Error('压缩后仍超过 2 MB，请选择较小的照片');
      } finally { canvas.width = canvas.height = 0; }
    } finally { URL.revokeObjectURL(objectUrl); }
  }
  async function uploadPhoto(file) {
    if (!file || busy || !selected || !$('#editor').open) return;
    const epoch = authEpoch, id = selected.id;
    const stillEditing = () => epoch === authEpoch && selected?.id === id && $('#editor').open;
    setBusy(true, '正在处理图片…'); $('#formMessage').textContent = '正在读取、缩小照片…';
    try {
      const photo = await preparePhoto(file);
      if (!stillEditing()) return;
      $('#formMessage').textContent = '正在上传照片…';
      const result = await request('/api/catalog-image', {method:'POST',headers:{'content-type':photo.type},body:photo});
      if (!stillEditing()) return;
      form.elements.imageUrl.value = result.url; $('#photoPreview').src = result.url; beforeCutout=null;$('#undoCutout').hidden=true;dirtyHint();
      $('#photoMeta').textContent = `${file.name} · ${(file.size/1024/1024).toFixed(2)} MB → ${(photo.size/1024/1024).toFixed(2)} MB`;
      $('#formMessage').textContent = '照片已上传并预览，点击“保存并发布”后生效。';
    } catch (error) { if (stillEditing()) $('#formMessage').textContent = error.message + '；原有菜图未更改，可重新选择。'; }
    finally { setBusy(false); $('#photoFile').value = ''; updatePhotoActions(); }
  }
  // 顾客可选项：例如软饮选可乐 / 气泡水 / 乌龙茶。选项名会写进订单规格；所有选项共用本菜库存。
  function renderChoiceOptions(){
    const box=$('#choiceOptions');if(!box||!selected)return;
    if(!optionsDraft){box.innerHTML=`<p class="hint">需要让顾客再选一次时使用，例如软饮选饮品、啤酒选品牌。</p><button type="button" class="secondary" data-option-start>添加选项</button>`;return;}
    const cover=image(selected);
    box.innerHTML=`<div class="fields"><label>选项类别（中文）<input data-option-label="cn" maxlength="20" value="${esc(optionsDraft.label.cn)}" placeholder="选填，如 口味"></label><label>选项类别（英文）<input data-option-label="en" maxlength="40" value="${esc(optionsDraft.label.en)}" placeholder="选填，如 Flavour"></label></div>
      <p class="hint">可单独定价，留空使用基础售价。每个选项可单独设库存，留空为不限量；卖完的选项顾客端显示「已售罄」。上方菜品库存若也设了，两边同时扣。至少开启一项。每个选项可单独上传图片，顾客切换选项时换图；未设置时使用菜品主图。</p>
      <div class="option-rows">${optionsDraft.items.map((o,i)=>`<article class="option-row" data-option-index="${i}"><div class="option-photo"><img src="${esc(o.imageUrl||cover)}" alt=""><label class="method-upload">${o.imageUrl?'更换图片':'上传图片'}<input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" data-option-file="${i}"></label><button type="button" class="text-button" data-option-clear-image="${i}" ${o.imageUrl?'':'disabled'}>移除选项图片</button></div>
        <label>中文名称<input data-option-field="cn" maxlength="40" required value="${esc(o.cn)}"></label><label>英文名称<input data-option-field="en" maxlength="60" required value="${esc(o.en)}"></label><label>售价（SGD）<input data-option-field="price" type="number" min="0.01" max="9999" step="0.01" placeholder="留空=原价" value="${o.price??''}"></label><label>库存<input data-option-field="stock" type="number" min="0" max="1000000" step="1" placeholder="不限量" value="${o.stock??''}">${o.reserved?`<small>待付款预占 ${o.reserved}</small>`:o.stock!==null&&o.stock!==undefined&&o.available<1?'<small>已售罄</small>':''}</label>
        <label class="option-active"><input type="checkbox" data-option-field="active" ${o.active?'checked':''}>供应</label><button type="button" class="text-button danger-text" data-option-remove="${i}">删除</button></article>`).join('')}</div>
      <div class="option-actions"><button type="button" class="secondary" data-option-add>添加一项</button><button type="button" class="text-button" data-option-remove-all>移除全部选项</button></div>`;
  }
  const newOption=()=>({key:'o'+Math.random().toString(36).slice(2,10),cn:'',en:'',price:null,active:true,stock:null,imageUrl:''});
  $('#choiceOptions').addEventListener('input',e=>{
    if(!optionsDraft)return;const t=e.target;
    if(t.dataset.optionLabel)optionsDraft.label[t.dataset.optionLabel]=t.value;
    const row=t.closest('[data-option-index]');if(!row||!t.dataset.optionField)return;const o=optionsDraft.items[Number(row.dataset.optionIndex)];
    o[t.dataset.optionField]=t.dataset.optionField==='active'?t.checked:['price','stock'].includes(t.dataset.optionField)?(t.value===''?null:Number(t.value)):t.value;dirtyHint();
  });
  $('#choiceOptions').addEventListener('click',e=>{
    if(busy)return;const t=e.target.closest('button');if(!t)return;
    if(t.hasAttribute('data-option-start')){optionsDraft={label:{cn:'',en:''},items:[newOption(),newOption()]};}
    else if(t.hasAttribute('data-option-add'))optionsDraft.items.push(newOption());
    else if(t.dataset.optionRemove!==undefined){optionsDraft.items.splice(Number(t.dataset.optionRemove),1);if(!optionsDraft.items.length)optionsDraft=null;}
    else if(t.hasAttribute('data-option-remove-all'))optionsDraft=null;
    else if(t.dataset.optionClearImage!==undefined)optionsDraft.items[Number(t.dataset.optionClearImage)].imageUrl='';
    else return;
    if(!optionsDraft&&!selected.choiceOptions)optionsDraft=null;renderChoiceOptions();dirtyHint();
  });
  $('#choiceOptions').addEventListener('change',async e=>{
    const index=e.target.dataset.optionFile,file=e.target.files?.[0];if(index===undefined||!file||busy||!selected||!optionsDraft)return;
    const epoch=authEpoch,id=selected.id,stillEditing=()=>epoch===authEpoch&&selected?.id===id&&$('#editor').open;
    setBusy(true,'正在处理选项图片…');$('#formMessage').textContent='正在上传选项图片…';
    try{const photo=await preparePhoto(file);if(!stillEditing())return;const result=await request('/api/catalog-image',{method:'POST',headers:{'content-type':photo.type},body:photo});if(!stillEditing())return;optionsDraft.items[Number(index)].imageUrl=result.url;$('#formMessage').textContent='选项图片已预览，保存后生效。'}catch(error){if(stillEditing())$('#formMessage').textContent=error.message+'；原有选项图片未更改。'}finally{setBusy(false);if(stillEditing()){renderChoiceOptions();dirtyHint()}}
  });
  const methodLabels={boiled:'水煮',soup:'清汤','red-oil':'四川红油拌',peanut:'花生酱拌',fried:'煎饺',tossed:'干拌'};
  function methodPhoto(method){
    if(preparationPhotoDraft[method])return preparationPhotoDraft[method];
    const file=selected?.preparationImages?.[method]||selected?.img;
    return file?'/img/s/'+(globalThis.DL_MENU_ART?.[file]||file).replace(/\.(png|jpe?g|webp)$/i,'.webp'):'/brand/dumpling-lab-primary.png';
  }
  function renderPreparationPhotos(){
    const box=$('#preparationPhotos'),methods=selected?.fixedPreparation?.id==='fried'?[]:selected?.availablePreparations||selected?.preparations||[];box.hidden=!methods.length;
    box.innerHTML=methods.length?`<h3>按做法配图</h3><p class="hint">做法图片独立于菜品主图。顾客切换做法时自动换图；未上传时显示原有做法示意图。保存后生效。</p><div class="preparation-photo-grid">${methods.map(method=>`<article class="preparation-photo-card"><img src="${esc(methodPhoto(method))}" alt="${esc(methodLabels[method]||method)}图片预览"><strong>${esc(methodLabels[method]||method)}</strong><small>${preparationPhotoDraft[method]?'已单独配图':'原有做法示意图'}</small><label class="method-upload">${preparationPhotoDraft[method]?'更换图片':'上传图片'}<input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" data-preparation-file="${esc(method)}"></label><button type="button" class="text-button" data-clear-preparation="${esc(method)}" ${preparationPhotoDraft[method]?'':'disabled'}>恢复做法示意图</button></article>`).join('')}</div>`:'';
  }
  $('#preparationPhotos').addEventListener('change',async e=>{
    const method=e.target.dataset.preparationFile,file=e.target.files?.[0];if(!method||!file||busy||!selected)return;
    const epoch=authEpoch,id=selected.id,stillEditing=()=>epoch===authEpoch&&selected?.id===id&&$('#editor').open;
    setBusy(true,'正在处理做法图片…');$('#formMessage').textContent='正在上传'+(methodLabels[method]||method)+'图片…';
    try{const photo=await preparePhoto(file);if(!stillEditing())return;const result=await request('/api/catalog-image',{method:'POST',headers:{'content-type':photo.type},body:photo});if(!stillEditing())return;preparationPhotoDraft[method]=result.url;$('#formMessage').textContent=(methodLabels[method]||method)+'图片已预览，保存后生效。'}catch(error){if(stillEditing())$('#formMessage').textContent=error.message+'；原有做法图片未更改。'}finally{setBusy(false);if(stillEditing()){renderPreparationPhotos();dirtyHint()}}
  });
  $('#preparationPhotos').addEventListener('click',e=>{const button=e.target.closest('[data-clear-preparation]');if(!button||busy)return;delete preparationPhotoDraft[button.dataset.clearPreparation];renderPreparationPhotos();dirtyHint()});
  $('#photoFile').onchange = e => uploadPhoto(e.target.files[0]);
  $('#restorePhoto').onclick = () => {
    if (busy || !selected) return;
    form.elements.imageUrl.value = ''; $('#photoPreview').src = image({...selected,imageUrl:''});beforeCutout=null;$('#undoCutout').hidden=true;updatePhotoActions();
    $('#photoMeta').textContent = ''; $('#formMessage').textContent = selected._new ? '已移除新图片，保存后可继续换图。' : '已预览原有菜图，保存后生效。'; dirtyHint();
  };
  function updatePhotoActions() {
    if(!busy&&selected)renderPreparationPhotos();
    $('#removeBackground').disabled = busy || !selected || Boolean(beforeCutout) || !(form.elements.imageUrl.value.trim() || selected.img);
  }
  function cancelCutout(reason='已取消抠图，原图片保留。') {
    cutoutOperation++;cutoutAbort?.abort();cutoutAbort=null;
    if(busy&&$('#editor').open)$('#formMessage').textContent=reason;
    cutoutWorker?.terminate();cutoutWorker=null;
    cutoutTask?.reject(new Error(reason));cutoutTask=null;
  }
  function runCutout(blob,onProgress) {
    if(!globalThis.Worker)throw new Error('此浏览器暂不支持自动抠图，请使用新版 Chrome 或 Safari');
    if(!cutoutWorker){
      cutoutWorker=new Worker('/vendor/cutout/worker.js?v=20261020-plate-curve4',{type:'module'});
      cutoutWorker.onmessage=({data})=>{
        if(!cutoutTask||cutoutTask.id!==data.id)return;
        if(data.stage){cutoutTask.progress(data.stage);return;}
        const task=cutoutTask;cutoutTask=null;
        if(data.error)task.reject(new Error(data.error));else task.resolve(data.blob);
      };
      cutoutWorker.onerror=()=>cancelCutout('抠图组件加载失败，请检查网络后重试');
    }
    return new Promise((resolve,reject)=>{
      const id=++cutoutSequence,timer=setTimeout(()=>cancelCutout('抠图超时，原图片保留；可重试或换一张照片'),90000);
      cutoutTask={id,progress:onProgress,resolve:value=>{clearTimeout(timer);resolve(value)},reject:e=>{clearTimeout(timer);reject(e)}};
      cutoutWorker.postMessage({id,blob});
    });
  }
  $('#cancelCutout').onclick=()=>cancelCutout();
  $('#removeBackground').onclick=async()=>{
    if(busy||!selected)return;
    const epoch=authEpoch,id=selected.id,operation=++cutoutOperation;
    cutoutAbort=new AbortController();
    const stillEditing=()=>operation===cutoutOperation&&epoch===authEpoch&&selected?.id===id&&$('#editor').open;
    const previous={url:form.elements.imageUrl.value,src:$('#photoPreview').src};
    setBusy(true,'正在抠图…');$('#cancelCutout').hidden=false;$('#cancelCutout').disabled=false;
    $('#formMessage').textContent='正在读取图片…';
    try{
      const response=await fetch(previous.url.trim()||image(selected),{signal:cutoutAbort.signal});
      if(!response.ok)throw new Error('无法读取原图，请先重新上传照片');
      const blob=await response.blob();if(!stillEditing())return;
      const result=await runCutout(blob,stage=>{if(stillEditing())$('#formMessage').textContent=stage});
      if(!stillEditing())return;
      $('#cancelCutout').hidden=true;$('#formMessage').textContent='正在保存透明图片预览…';
      const trimmed=await preparePhoto(new File([result],'cutout.png',{type:result.type||'image/png'}));if(!stillEditing())return;
      const uploaded=await request('/api/catalog-image',{method:'POST',headers:{'content-type':trimmed.type},body:trimmed});
      if(!stillEditing())return;
      beforeCutout=previous;form.elements.imageUrl.value=uploaded.url;$('#photoPreview').src=uploaded.url;
      $('#undoCutout').hidden=false;$('#photoMeta').textContent='透明背景 · 已裁掉多余留白 · '+(trimmed.size/1024/1024).toFixed(2)+' MB';
      $('#formMessage').textContent='抠图完成，请检查餐具和菜品边缘；保存后生效，不满意可撤销。';dirtyHint();
    }catch(e){if(stillEditing())$('#formMessage').textContent=e.message+'；未替换当前图片。';}
    finally{cutoutAbort=null;setBusy(false);$('#cancelCutout').hidden=true;updatePhotoActions();}
  };
  $('#undoCutout').onclick=()=>{
    if(busy||!beforeCutout)return;
    form.elements.imageUrl.value=beforeCutout.url;$('#photoPreview').src=beforeCutout.src;beforeCutout=null;
    $('#undoCutout').hidden=true;$('#photoMeta').textContent='';$('#formMessage').textContent='已撤销抠图，恢复处理前的图片。';dirtyHint();updatePhotoActions();
  };
  const dropzone = $('#photoDropzone');
  for (const event of ['dragover','dragleave','drop']) dropzone.addEventListener(event,e => {
    e.preventDefault(); dropzone.classList.toggle('dragging',event === 'dragover' && !busy);
    if (event === 'drop' && !busy) {
      const files = e.dataTransfer?.files;
      if (files?.length > 1) { $('#formMessage').textContent = '每道菜一次选择一张照片。'; return; }
      uploadPhoto(files?.[0]);
    }
  });
  $('#editor').addEventListener('paste', e => {
    const files = [...(e.clipboardData?.files || [])];
    if (!files.length) return;
    e.preventDefault();
    if (files.length > 1) { $('#formMessage').textContent = '每道菜一次粘贴一张照片。'; return; }
    uploadPhoto(files[0]);
  });
  form.onsubmit = async e => {
    e.preventDefault(); if (busy || !selected) return;
    const patch = collectPatch(); if (!Object.keys(patch).length) { closeNow(); return; }
    const base = Object.fromEntries(Object.keys(patch).map(key => [key, prior(selected,key)]));
    const dishName = selected._new ? patch.cn : selected.cn;
    const creating=Boolean(selected._new);
    setBusy(true, '正在发布…'); $('#discardPrompt').hidden = true; $('#formMessage').textContent = '正在保存…';
    try {
      data = await request('/api/catalog', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:selected.id,revision:editRevision,patch,base,...(creating?{action:'create',templateId:selected._templateId}: {})})});
      render(); stamp(); closeNow(); message(`「${dishName}」${creating?'已创建':'已发布'}。${patch.active===false?'当前为下架状态，可在详情中上架。':'顾客菜单刷新或 30 秒内同步。'}`);
    } catch (error) { $('#formMessage').textContent = error.message + '；你的修改仍保留在这里。'; }
    finally { setBusy(false); }
  };
  authenticated(false);
  if (window.location?.hash === '#history') setView('history');
  if (window.location?.hash === '#inventory') setView('inventory');
  if (window.location?.hash === '#rewards') setView('rewards');
  if (window.location?.hash === '#wallet') setView('wallet');
  if (password) load();
})();
