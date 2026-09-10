(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const sections = {dumplings:'饺子／云吞',noodles:'面条',sides:'配菜',drinks:'饮品',recommended:'固定搭配'};
  const fieldNames = {cn:'中文名',name:'英文名',flavor:'描述',section:'分类',sort:'排序',active:'上下架',soldOut:'临时售罄',price:'价格',portionPrices:'规格价格',stock:'实有库存',imageUrl:'菜品图片'};
  let password = '', data = null, selected = null, busy = false, view = 'catalog', authEpoch = 0, editRevision = 0, returnFocus = null;
  try { password = sessionStorage.getItem('dl-staff-password') || ''; } catch {}
  const form = $('#editForm');
  const auth = () => 'Basic ' + btoa(String.fromCharCode(...new TextEncoder().encode('staff:' + password)));
  const message = (s, tone = 'success') => { for (const id of ['message','loginMessage']) { $('#' + id).textContent = s; $('#' + id).dataset.tone = tone; } };
  const minimum = d => d.variants ? Math.min(...Object.values(d.variants).map(v => v.pieces)) : 1;
  const low = d => d.active && !d.soldOut && d.available !== null && d.available < minimum(d) * 3;
  const statusText = d => d.active === false ? '已下架' : d.soldOut ? '已售罄' : '在售';
  const image = d => d.imageUrl || '/img/s/' + (globalThis.DL_MENU_ART?.[d.img] || d.img).replace(/\.(png|jpe?g|webp)$/i, '.webp');
  const prior = (d, key) => key === 'soldOut' ? d.manualSoldOut || false : key === 'imageUrl' ? d.imageUrl || '' : d[key];
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
        authenticated(false);
        if ($('#editor').open) $('#editor').close();
        try { sessionStorage.removeItem('dl-staff-password'); } catch {}
      }
      throw new Error(out.error || '操作失败，请重试');
    }
    return out;
  }
  function setView(next) {
    view = ['catalog','inventory','history'].includes(next) ? next : 'catalog';
    document.body.dataset.view = view;
    $('#catalogPanel').hidden = view === 'history'; $('#historyPanel').hidden = view !== 'history';
    $('.metrics').hidden = view === 'history';
    $('#pageTitle').textContent = $('#breadcrumb').textContent = ({catalog:'菜品管理',inventory:'库存管理',history:'操作记录'})[view];
    $('#pageDescription').textContent = ({catalog:'改价格、调整销售状态，或编辑菜品完整资料。',inventory:'核对实有、预占与可售数量，按实际数量盘点库存。',history:'查看菜品更新与库存变动的时间和明细。'})[view];
    $('#listTitle').textContent = view === 'inventory' ? '库存盘点' : '菜品列表';
    $$('[data-view]').forEach(b => b.setAttribute('aria-current', b.dataset.view === view ? 'page' : 'false'));
  }
  function render() {
    const query = $('#search').value.trim().toLowerCase(), section = $('#section').value, status = $('#status').value;
    const list = data.items.filter(d => (d.cn + ' ' + d.name).toLowerCase().includes(query) && (!section || d.section === section) && (!status || (status === 'inactive' ? d.active === false : status === 'sold' ? d.active && d.soldOut : status === 'low' ? low(d) : d.active && !d.soldOut)));
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
      <td class="category-col"><span class="category-text">${esc(sections[d.section] || d.section)}</span></td>
      <td class="price price-col" data-label="售价 / SGD">$${d.price.toFixed(2)}${d.variants ? '<small>起</small>' : ''}</td>
      <td class="inventory stock-col ${low(d) ? 'low' : ''}" data-label="可售库存"><strong>${d.available === null ? '不限量' : `${d.available} <small class="unit">${esc(d.stockUnit)}</small>`}</strong>${d.stock !== null ? `<small>实有 ${d.stock} ${esc(d.stockUnit)}</small>` : ''}${low(d) ? '<small>库存偏低</small>' : ''}${d.reserved ? `<small>待付款预占 ${d.reserved} ${esc(d.stockUnit)}</small>` : ''}</td>
      <td class="status-col"><span class="tag ${d.active === false ? 'inactive' : d.soldOut ? 'sold' : ''}"><i class="dot"></i>${statusText(d)}</span></td>
      <td class="align-right edit-col"><div class="row-actions"><button class="edit-button quick-price" data-edit="${esc(d.id)}" data-mode="price" aria-label="修改${esc(d.cn)}价格">改价</button><button class="edit-button quick-stock" data-edit="${esc(d.id)}" data-mode="stock" aria-label="盘点${esc(d.cn)}库存">盘点</button><button class="edit-button" data-edit="${esc(d.id)}" aria-label="编辑${esc(d.cn)}">详情 <span aria-hidden="true">↗</span></button></div></td>
    </tr>`).join('');
    $('#audit').innerHTML = (data.audit || []).slice(0, 200).map(a => {
      const dish = data.items.find(d => d.id === a.id);
      const title = a.action === 'edit' ? `更新菜品 · ${dish?.cn || a.id}` : ({consumed:'付款成功 · 扣减库存',released:'取消 / 过期 · 释放预占'})[a.action] || a.action;
      const details = a.action === 'edit' ? Object.keys(a.details || {}).map(k => fieldNames[k] || k).join('、') : Object.entries(a.details || {}).map(([id, n]) => { const d = data.items.find(d => d.id === id); return `${d?.cn || id} ${n} ${d?.stockUnit || ''}`; }).join(' · ');
      return `<article class="audit-row"><span class="audit-icon" aria-hidden="true">${a.action === 'edit' ? '↗' : '↺'}</span><div><strong>${esc(title)}</strong><p>${esc(details || '资料已更新')}</p></div><time datetime="${esc(a.at)}">${esc(new Date(a.at).toLocaleString('zh-SG', {month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}))}</time></article>`;
    }).join('') || '<div class="empty-state"><h3>暂无操作记录</h3><p>发布菜品或发生库存变动后，会在这里留下记录。</p></div>';
  }
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
      data = result; authenticated(true); render(); setView(view); stamp(); message('');
    } catch (e) { if (epoch === authEpoch) message(e.message, 'error'); }
    finally { button.disabled = false; button.textContent = '↻ 刷新数据'; $('#loginButton').disabled = false; $('#loginButton').textContent = '登录后台 →'; }
  }
  $('#login').onsubmit = async e => {
    e.preventDefault(); if ($('#loginButton').disabled) return;
    authEpoch++; password = new FormData(e.target).get('password'); await load();
    if (data && !$('#workspace').hidden) { try { sessionStorage.setItem('dl-staff-password', password); } catch {} e.target.reset(); }
  };
  $('#logout').onclick = () => {
    authEpoch++; password = ''; data = null; selected = null;
    try { sessionStorage.removeItem('dl-staff-password'); } catch {}
    authenticated(false); if ($('#editor').open) $('#editor').close(); setView('catalog'); $('#list').innerHTML = ''; $('#audit').innerHTML = ''; message('已退出登录');
  };
  $('#refresh').onclick = load;
  for (const id of ['search','section','status']) $('#' + id).addEventListener('input', () => data && render());
  function resetFilters() { for (const id of ['search','section','status']) $('#' + id).value = ''; if (data) render(); }
  $('#resetFilters').onclick = $('#clearEmpty').onclick = resetFilters;
  $$('[data-view]').forEach(b => { b.onclick = () => setView(b.dataset.view); });
  $$('[data-filter]').forEach(b => { b.onclick = () => { resetFilters(); $('#status').value = b.dataset.filter; setView(view === 'inventory' ? 'inventory' : 'catalog'); render(); }; });

  function collectPatch() {
    const f = form.elements;
    const patch = {cn:f.cn.value,name:f.name.value,flavor:f.flavor.value,section:f.section.value,sort:Number(f.sort.value),active:f.active.value === 'true',soldOut:f.soldOut.value === 'true',stock:f.unlimited.checked ? null : Number(f.stock.value),imageUrl:f.imageUrl.value.trim()};
    if (selected.variants) patch.portionPrices = Object.fromEntries(Object.keys(selected.portionPrices).map(n => [n, Number(f['price_' + n].value)]));
    else patch.price = Number(f.price.value);
    for (const key of Object.keys(patch)) if (JSON.stringify(patch[key]) === JSON.stringify(prior(selected, key))) delete patch[key];
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
  $('#list').onclick = e => {
    const button = e.target.closest('[data-edit]'); if (!button) return;
    selected = structuredClone(data.items.find(d => d.id === button.dataset.edit)); if (!selected) return;
    returnFocus = button; editRevision = data.revision; form.reset(); $('#formMessage').textContent = ''; $('#discardPrompt').hidden = true;
    $('#editorTitle').textContent = selected.cn; $('#editorName').textContent = selected.name;
    $('#editorStatus').textContent = `${sections[selected.section]} · ${statusText(selected)}`;
    for (const key of ['cn','name','flavor','section','sort','active','imageUrl']) form.elements[key].value = selected[key] ?? '';
    form.elements.soldOut.value = String(selected.manualSoldOut || false);
    form.elements.section.disabled = Boolean(selected.variants);
    form.elements.unlimited.checked = selected.stock === null;
    form.elements.stock.disabled = selected.stock === null; form.elements.stock.required = selected.stock !== null; form.elements.stock.value = selected.stock ?? '';
    for (const option of form.elements.section.options) option.disabled = !selected.variants && ['dumplings','recommended'].includes(option.value);
    $('#stockHint').textContent = `单位：${selected.stockUnit}。${selected.variants ? '所有做法与份量共用库存。' : ''}当前待付款预占 ${selected.reserved} ${selected.stockUnit}。`;
    $('#prices').innerHTML = selected.variants ? Object.entries(selected.portionPrices).map(([n, p]) => `<label>${n} 颗售价（SGD）<input name="price_${n}" type="number" min="0.01" max="9999" step="0.01" required value="${p}"></label>`).join('') : `<label>售价（SGD）<input name="price" type="number" min="0.01" max="9999" step="0.01" required value="${selected.price}"></label>`;
    const mode = button.dataset.mode || 'all';
    $$('[data-editor-section]').forEach(section => { section.hidden = mode !== 'all' && section.dataset.editorSection !== mode; });
    $('#editorTitle').textContent = `${mode === 'price' ? '改价' : mode === 'stock' ? '盘点库存' : '编辑菜品'} · ${selected.cn}`;
    $('#photoPreview').src = image(selected); dirtyHint(); $('#editor').showModal(); $('.editor-scroll').scrollTop = 0;
  };
  form.elements.unlimited.onchange = e => { form.elements.stock.disabled = e.target.checked; form.elements.stock.required = !e.target.checked; dirtyHint(); };
  form.elements.imageUrl.addEventListener('change', e => {
    const url = e.target.value.trim();
    if (!url) $('#photoPreview').src = image({...selected,imageUrl:''});
    else if (/^https:\/\//i.test(url) || /^\/api\/catalog-image\?id=/.test(url)) $('#photoPreview').src = url;
  });
  let disabledBefore = [];
  function setBusy(on, label = '保存并发布') {
    busy = on; $('#save').textContent = label;
    if (on) { disabledBefore = [...form.querySelectorAll('input,select,textarea,button')].map(el => [el, el.disabled]); disabledBefore.forEach(([el]) => { el.disabled = true; }); }
    else { disabledBefore.forEach(([el, was]) => { el.disabled = was; }); disabledBefore = []; }
  }
  $('#photoFile').onchange = async e => {
    const file = e.target.files[0]; if (!file || busy) return;
    setBusy(true, '正在上传…'); $('#formMessage').textContent = '正在上传照片…';
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error('照片超过 2 MB，请先缩小文件');
      const result = await request('/api/catalog-image', {method:'POST',headers:{'content-type':file.type},body:file});
      form.elements.imageUrl.value = result.url; $('#photoPreview').src = result.url; dirtyHint();
      $('#formMessage').textContent = '照片已上传，点击“保存并发布”后生效。';
    } catch (error) { $('#formMessage').textContent = error.message; }
    finally { setBusy(false); e.target.value = ''; }
  };
  form.onsubmit = async e => {
    e.preventDefault(); if (busy || !selected) return;
    const patch = collectPatch(); if (!Object.keys(patch).length) { closeNow(); return; }
    const base = Object.fromEntries(Object.keys(patch).map(key => [key, prior(selected,key)]));
    const dishName = selected.cn;
    setBusy(true, '正在发布…'); $('#discardPrompt').hidden = true; $('#formMessage').textContent = '正在保存…';
    try {
      data = await request('/api/catalog', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:selected.id,revision:editRevision,patch,base})});
      render(); stamp(); closeNow(); message(`「${dishName}」已发布。顾客菜单刷新或 30 秒内同步。`);
    } catch (error) { $('#formMessage').textContent = error.message + '；你的修改仍保留在这里。'; }
    finally { setBusy(false); }
  };
  authenticated(false);
  if (window.location?.hash === '#history') setView('history');
  if (window.location?.hash === '#inventory') setView('inventory');
  if (password) load();
})();
