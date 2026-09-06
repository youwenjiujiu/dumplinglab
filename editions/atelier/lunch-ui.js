// Preparation -> filling -> portion. Unconfirmed extras are deliberately not offered.
const LunchMenu = (() => {
  let preparation = null;
  let step = "preparation";
  const prep = id => LUNCH_PREPARATIONS.find(p => p.id === id);
  const options = (d, style) => d.variants?.[style];
  const firstStyle = d => d.styles?.find(key => d.variants[key].prep === preparation && d.variants[key].pieces === 5) || d.styles?.[0] || null;
  const readyFor = d => step === "filling" && d.preparations.includes(preparation);
  const visible = d => d.section !== "dumplings" || readyFor(d);
  const styleFor = (d, id, pieces = 5) => d.styles?.find(key => d.variants[key].prep === id && d.variants[key].pieces === pieces);
  function section() {
    if (step === "filling") return `<div class="lunch-steps"><p class="lunch-service">${tr("午餐供应", "LUNCH MENU")}</p><div class="lunch-chosen-flavor"><div><small>${tr("已选做法", "PREPARATION")}</small><strong>${tr(prep(preparation).cn, prep(preparation).en)}</strong></div><button data-lunch-back>${tr("换做法", "Change")} ↗</button></div><div class="lunch-step-title lunch-fillings-title" tabindex="-1" id="fillingStepTitle"><span>02</span><h3>${tr("选馅儿", "Choose your filling")}</h3></div></div>`;
    return `<div class="lunch-steps"><p class="lunch-service">${tr("午餐供应", "LUNCH MENU")}</p><div class="lunch-step-title"><span>01</span><h3>${tr("先选做法", "Choose preparation first")}</h3></div><div class="lunch-preparations" role="group" aria-label="${tr("先选做法", "Choose preparation first")}">${LUNCH_PREPARATIONS.map(p => `<button data-lunch-prep="${p.id}" aria-pressed="${preparation === p.id}"><span class="preparation-photo"><img src="${photo(p)}" alt="" loading="lazy"></span><span class="preparation-label"><strong>${tr(p.cn, p.en)}</strong><small>${tr(p.en, p.cn)}</small><span aria-hidden="true">${preparation === p.id ? "✓" : "↗"}</span></span></button>`).join("")}</div>${preparation ? `<button class="primary lunch-next" data-lunch-next>${tr("选馅儿", "Choose filling")} <span aria-hidden="true">→</span></button>` : ""}</div>`;
  }
  const group = (label, key, values, selected) => `<fieldset class="lunch-options"><legend>${label}</legend><div>${values.map(v => `<button class="chip ${String(selected) === String(v.value) ? "active" : ""}" data-lunch-option="${key}" data-value="${v.value}" aria-pressed="${String(selected) === String(v.value)}">${v.label}</button>`).join("")}</div></fieldset>`;
  function controls(d) {
    if (!d.variants) return "";
    const value = options(d, detailStyle);
    return `<div id="lunchOptions">${detailPreset ? `<p class="detail-portion">${tr("做法", "Preparation")} · ${tr(prep(value.prep).cn, prep(value.prep).en)}</p>` : group(tr("做法", "Preparation"), "prep", LUNCH_PREPARATIONS.filter(p => d.preparations.includes(p.id)).map(p => ({ value: p.id, label: tr(p.cn, p.en) })), value.prep)}${group(tr("选份量", "Portion"), "pieces", Object.keys(d.portionPrices).map(Number).map(n => ({ value: n, label: `${n} ${tr("颗", "pieces")} · ${money(d.portionPrices[n])}` })), value.pieces)}</div>`;
  }
  function recommendationSection() {
    const entries = LUNCH_RECOMMENDATIONS.filter(matches);
    if (!entries.length) return "";
    return `<section class="menu-section" id="section-recommended" data-section="recommended"><div class="section-heading"><h2>${categoryName("recommended")}</h2><span class="translation">${categoryOther("recommended")}</span></div><div class="dish-grid recommendation-grid">${entries.map((r,i) => `<article class="dish-card recommendation-card"><button class="dish-open" data-recommendation="${r.id}" ${r.pending ? "disabled" : ""} aria-label="${escapeHTML(name(r))}"><div class="dish-image"><img src="${photo(r)}" alt="" ${i===0 ? 'fetchpriority="high"' : 'loading="lazy"'}></div><div class="dish-info"><span class="dish-number">${String(i+1).padStart(2,"0")}</span><h3 class="dish-name">${dishNameHTML(r)}</h3><span class="dish-english">${otherName(r)}</span><span class="dish-price">${r.pending ? tr("暂未开放", "Coming later") : `${money(r.chooseFilling ? Math.min(...MENU.filter(d=>d.kind==="dumpling").map(d=>d.price)) : dish(r.dishId).price)} ${tr("起", "from")}`}</span></div></button><button class="dish-add" data-recommendation="${r.id}" aria-label="${escapeHTML(tr("选择", "Choose") + " " + name(r))}" ${r.pending ? "disabled" : ""}>${r.pending ? "—" : "↗"}</button></article>`).join("")}</div></section>`;
  }
  function openBoiledFillings() {
    openModal("filling", "");
    $("#sheetBody").innerHTML = `<div class="sheet-content"><h2 id="sheetTitle">${tr("白灼饺子", "Boiled Dumplings")}</h2><p class="detail-other">${tr("选馅儿", "Choose your filling")}</p><div class="filling-picker">${MENU.filter(d=>d.kind==="dumpling" && d.preparations.includes("boiled")).map(d=>`<button data-boiled-filling="${d.id}"><img src="${photo(d)}" alt=""><span><strong>${dishNameHTML(d)}</strong><small>${otherName(d)}</small></span><span>${money(d.price)}<small>${tr("起", "from")}</small></span><span aria-hidden="true">↗</span></button>`).join("")}</div></div>`;
  }
  function handle(button) {
    if (button.dataset.recommendation) {
      const r = LUNCH_RECOMMENDATIONS.find(r=>r.id===button.dataset.recommendation);
      if (!r || r.pending) return true;
      if (r.chooseFilling) openBoiledFillings();
      else { const d = dish(r.dishId); openDish(d, styleFor(d, r.prep), r.prep); }
      return true;
    }
    if (button.dataset.boiledFilling) {
      const d = MENU.find(d=>d.id===button.dataset.boiledFilling && d.kind==="dumpling");
      if (d) openDish(d, styleFor(d,"boiled"), "boiled");
      return true;
    }
    if (button.dataset.lunchPrep) {
      if (!prep(button.dataset.lunchPrep)) return true;
      preparation = button.dataset.lunchPrep;
      renderMenu();
      document.querySelector(`[data-lunch-prep="${preparation}"]`)?.focus({ preventScroll: true });
      return true;
    }
    if (button.hasAttribute("data-lunch-back")) {
      step = "preparation"; renderMenu();
      document.querySelector(`[data-lunch-prep="${preparation}"]`)?.focus({preventScroll:true});
      return true;
    }
    if (button.hasAttribute("data-lunch-next")) {
      if (!preparation) return true;
      step = "filling"; renderMenu();
      document.querySelector("#fillingStepTitle")?.focus({preventScroll:true});
      document.querySelector("#section-dumplings")?.scrollIntoView({behavior:"instant",block:"start"});
      return true;
    }
    const field = button.dataset.lunchOption;
    if (!field || !detail?.variants) return false;
    if (!["pieces","prep"].includes(field) || (detailPreset && field==="prep")) return true;
    const v = { ...options(detail, detailStyle), [field]: field === "pieces" ? Number(button.dataset.value) : button.dataset.value };
    const key = styleFor(detail, v.prep, v.pieces);
    if (!key) return true;
    detailStyle = key;
    document.querySelector("#lunchOptions").outerHTML = controls(detail);
    updateDetailSelection();
    document.querySelector(`[data-lunch-option="${field}"][data-value="${button.dataset.value}"]`)?.focus({ preventScroll: true });
    return true;
  }
  const menuPrice = d => `${money(d.price)}${d.variants ? " " + tr("起", "from") : ""}`;
  const start = () => { step = "preparation"; };
  return { openBoiledFillings, section, recommendationSection, controls, handle, visible, firstStyle, menuPrice, options, readyFor, start };
})();
