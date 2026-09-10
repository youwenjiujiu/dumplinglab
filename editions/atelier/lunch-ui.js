// Pick preparation to reveal fillings immediately; configure portions/extras in detail.
const LunchMenu = (() => {
  let preparation = null;
  let step = "preparation";
  let flavor = { spicy:false, sesame:false, noodles:false };
  const prep = id => LUNCH_PREPARATIONS.find(p => p.id === id);
  const preparationDescription = id => ({ soup:tr("清汤鲜香", "In clear broth"), tossed:tr("酱汁拌匀", "Coated in sauce"), boiled:tr("清爽原味", "Plain, no sauce"), fried:tr("金黄脆底", "Golden crisp base") })[id] || "";
  const options = (d, style) => d.variants?.[style];
  const firstStyle = d => styleFor(d, preparation, 5, flavor) || d.styles?.[0] || null;
  const readyFor = d => Boolean(d.fixedPreparation) || step === "filling" && d.preparations.includes(preparation);
  const visible = d => d.active!==false && (d.section !== "dumplings" || readyFor(d));
  const styleFor = (d, id, pieces = 5, extras = {}) => d.styles?.find(key => {
    const v=d.variants[key];
    return !v.legacy && v.prep===id && v.pieces===pieces && ["spicy","sesame","noodles"].every(k=>v[k]===Boolean(extras[k]));
  });
const recommendationPrice = r => r.chooseFilling ? Math.min(...MENU.filter(d=>d.kind==="dumpling"&&d.active!==false).map(d=>d.price)) : dish(r.dishId).price + (r.noodles ? LUNCH_NOODLE_EXTRA : 0);
  function section() {
    if (step === "filling") return `<div class="lunch-steps"><div class="lunch-chosen-flavor"><img src="${photo(prep(preparation), "s")}" alt="" width="52" height="52"><div><strong>${bi(prep(preparation).cn, prep(preparation).en)}</strong></div><button class="edit-preparation" data-lunch-back aria-label="${tr("修改做法", "Edit preparation")}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5 4 4M4 20l4-1 12-12a2.8 2.8 0 0 0-4-4L4 15z"/></svg></button></div><div class="lunch-step-title lunch-fillings-title" tabindex="-1" id="fillingStepTitle"><h3>${bi("馅料", "Fillings")}</h3></div></div>`;
    return `<div class="lunch-steps"><div class="lunch-preparations" role="group" aria-label="${tr("选择做法", "Preparation")}">${LUNCH_PREPARATIONS.map(p => `<button data-lunch-prep="${p.id}" aria-pressed="${preparation === p.id}"><span class="preparation-photo"><img src="${photo(p)}" alt="" loading="lazy"></span><span class="preparation-label"><strong>${bi(p.cn,p.en)}</strong><small class="preparation-description">${preparationDescription(p.id)}</small><span class="preparation-state" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="m5 10 3.2 3.2L15 6.5"/></svg></span></span></button>`).join("")}</div></div>`;
  }
  const group = (label, key, values, selected, attribute = "lunch-option") => `<fieldset class="lunch-options lunch-options-${key}"><legend${key === "pieces" ? ' class="sr-only"' : ''}>${bilingualText(label)}</legend><div>${values.map(v => `<button class="chip ${String(selected) === String(v.value) ? "active" : ""}" data-${attribute}="${key}" data-value="${v.value}" aria-pressed="${String(selected) === String(v.value)}">${bilingualText(v.label)}</button>`).join("")}</div></fieldset>`;
  function preparationBadge(d, style) {
    const method = d.fixedPreparation || (detailPreset && prep(options(d, style)?.prep));
    return `<span id="detailPreparation" class="preparation-badge"${method ? "" : " hidden"}>${method ? bi(method.cn, method.en) : ""}</span>`;
  }
  function extrasControls(value, attribute = "lunch-option", lockedNoodles = false) {
    const toggle=(label,key,no,yes)=>group(label,key,[{value:false,label:no},{value:true,label:yes}],value[key],attribute);
    return (value.prep==="tossed" ? toggle(tr("辣度","Spice"),"spicy",tr("不辣","Not spicy"),tr("辣","Spicy")) + toggle(tr("芝麻酱","Sesame sauce"),"sesame",tr("不加","No sesame sauce"),tr("加芝麻酱","Add sesame sauce")) : "") +
      (["soup","tossed"].includes(value.prep) ? lockedNoodles ? `<p class="detail-portion">${bi("已含面 · 价格已计入","Noodles included in the price")}</p>` : toggle(tr("加面","Noodles"),"noodles",tr("不加面","No noodles"),tr(`加面 +${foodMoney(LUNCH_NOODLE_EXTRA)}`,`Add noodles +${foodMoney(LUNCH_NOODLE_EXTRA)}`)) : "");
  }
  function controls(d) {
    if (!d.variants) return "";
    const value = options(d, detailStyle);
    if (d.fixedPreparation) return `<div id="lunchOptions">${group(tr("选份量", "Portion"), "pieces", Object.keys(d.portionPrices).map(Number).map(n => ({value:n,label:tr(`${n} 颗 · ${foodMoney(d.portionPrices[n])}`,`${n} pieces · ${foodMoney(d.portionPrices[n] + (value.noodles ? LUNCH_NOODLE_EXTRA : 0))}`)})), value.pieces)}</div>`;
    return `<div id="lunchOptions">${detailPreset ? "" : group(tr("做法", "Preparation"), "prep", LUNCH_PREPARATIONS.filter(p => d.preparations.includes(p.id)).map(p => ({ value: p.id, label: tr(p.cn, p.en) })), value.prep)}${group(tr("选份量", "Portion"), "pieces", Object.keys(d.portionPrices).map(Number).map(n => ({ value: n, label: tr(`${n} 颗 · ${foodMoney(d.portionPrices[n] + (value.noodles ? LUNCH_NOODLE_EXTRA : 0))}`,`${n} pieces · ${foodMoney(d.portionPrices[n] + (value.noodles ? LUNCH_NOODLE_EXTRA : 0))}`) })), value.pieces)}${extrasControls(value,"lunch-option",Boolean(detailPreset?.noodles))}</div>`;
  }
  function ingredients(d, style, previousKeys = null) {
    const info = d.ingredientInfo;
    const items = [...(info?.items || [])];
    const value = options(d, style);
    if (value?.prep === "soup") items.push({cn:"高汤", en:"Broth"});
    if (value?.noodles) items.push({cn:"面条", en:"Noodles"});
    if (value?.sesame) items.push({cn:"芝麻酱", en:"Sesame sauce"});
    // Spicy is an option, not proof of a specific oil, pepper or sauce recipe.
    if (value?.spicy && value.prep === "tossed") items.push({cn:"辣味调料", en:"Spicy seasoning"});
    const unique = [...new Map(items.map(item => [item.cn, item])).values()];
    const note = info?.note || (!unique.length ? ["食材信息请向店员确认。", "Please check ingredient information with staff."] : null);
    return `<section id="detailIngredients" class="detail-ingredients" aria-labelledby="ingredientHeading"><span id="ingredientHeading" class="ingredient-heading">${bi("食材", "Ingredients")}</span>${unique.length ? `<dl-ingredient-reveal><ul class="ingredient-list">${unique.map(item => `<li class="ingredient-item" data-ingredient-key="${escapeHTML(item.cn)}" data-motion-new="${!previousKeys?.includes(item.cn)}"><span class="ingredient-name">${escapeHTML(tr(item.cn,item.en))}</span></li>`).join("")}</ul></dl-ingredient-reveal>` : ""}${note ? `<p class="ingredient-note">${bi(...note)}</p>` : ""}</section>`;
  }
  function recommendationSection() {
    const entries = LUNCH_RECOMMENDATIONS.filter(matches);
    if (!entries.length) return "";
return `<section class="menu-section" id="section-recommended" data-section="recommended"><div class="section-heading recommendation-heading"><h2>${categoryName("recommended")}</h2><button class="section-suggestion" data-action="planner" aria-haspopup="dialog">${bi("推荐搭配","Suggestions")}<span aria-hidden="true">↗</span></button></div><div class="dish-grid recommendation-grid">${entries.map((r,i) => `<article class="dish-card recommendation-card"><button class="dish-open" data-recommendation="${r.id}" ${r.pending ? "disabled" : ""} aria-label="${escapeHTML(name(r))}"><div class="dish-image"><img src="${photo(r)}" alt="" ${i===0 ? 'fetchpriority="high"' : 'loading="lazy"'}></div><div class="dish-info"><span class="dish-number">${String(i+1).padStart(2,"0")}</span><h3 class="dish-name">${dishNameHTML(r)}</h3><span class="dish-english">${otherName(r)}</span><span class="dish-price">${r.pending ? bi("暂未开放", "Coming later") : fromPrice(recommendationPrice(r))}</span></div></button><button class="dish-add" data-recommendation="${r.id}" aria-label="${escapeHTML(tr("选择", "Choose") + " " + name(r))}" ${r.pending ? "disabled" : ""}>${r.pending ? "—" : "+"}</button></article>`).join("")}</div></section>`;
  }
  function openBoiledFillings() {
    openModal("filling", "");
    $("#sheetBody").innerHTML = `<div class="sheet-content"><h2 id="sheetTitle">${bi("白灼饺子", "Boiled Dumplings")}</h2><p class="detail-other">${bi("选馅儿", "Choose your filling")}</p><div class="filling-picker">${MENU.filter(d=>d.kind==="dumpling" && d.active!==false && d.preparations.includes("boiled")).map(d=>`<button ${d.soldOut?'disabled':''} data-boiled-filling="${d.id}"><img src="${photo(d)}" alt=""><span><strong>${dishNameHTML(d)}</strong><small>${otherName(d)}</small></span><span class="filling-price">${fromPrice(d.price)}</span><span aria-hidden="true">+</span></button>`).join("")}</div></div>`;
  }
  function handle(button) {
    if (button.dataset.recommendation) {
      const r = LUNCH_RECOMMENDATIONS.find(r=>r.id===button.dataset.recommendation);
      if (!r || r.pending) return true;
      if (r.chooseFilling) openBoiledFillings();
      else { const d = dish(r.dishId); openDish(d, d.fixedPreparation ? d.styles[0] : styleFor(d, r.prep, 5, {noodles:r.noodles}), r.noodles ? {prep:r.prep,noodles:true} : r.prep); }
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
      flavor = { spicy: false, sesame: false, noodles: false };
      step = "filling";
      renderMenu();
      document.querySelector("#fillingStepTitle")?.focus({preventScroll:true});
      document.querySelector("#section-dumplings")?.scrollIntoView({behavior:"instant",block:"start"});
      return true;
    }
    if (button.hasAttribute("data-lunch-back")) {
      step = "preparation"; renderMenu();
      document.querySelector(`[data-lunch-prep="${preparation}"]`)?.focus({preventScroll:true});
      document.querySelector("#section-dumplings")?.scrollIntoView({behavior:"instant",block:"start"});
      return true;
    }
    const field = button.dataset.lunchOption;
    if (!field || !detail?.variants) return false;
    if (detail.fixedPreparation && field !== "pieces") return true;
    if (!["pieces","prep","spicy","sesame","noodles"].includes(field) || (detailPreset && field==="prep") || (detailPreset?.noodles && field==="noodles")) return true;
    const v = { ...options(detail, detailStyle), [field]: field === "pieces" ? Number(button.dataset.value) : field === "prep" ? button.dataset.value : button.dataset.value==="true" };
    if (v.prep!=="tossed" && !detail.fixedPreparation) { v.spicy=false; v.sesame=false; }
    if (!["soup","tossed"].includes(v.prep)) v.noodles=false;
    const key = styleFor(detail, v.prep, v.pieces, v);
    if (!key) return true;
    detailStyle = key;
    document.querySelector("#lunchOptions").outerHTML = controls(detail);
    updateDetailSelection();
    document.querySelector(`[data-lunch-option="${field}"][data-value="${button.dataset.value}"]`)?.focus({ preventScroll: true });
    return true;
  }
  const menuPrice = d => d.variants ? fromPrice(d.price + (flavor.noodles ? LUNCH_NOODLE_EXTRA : 0)) : foodMoney(d.price);
  const start = () => { step = "preparation"; };
  return { recommendationPrice, openBoiledFillings, section, recommendationSection, controls, ingredients, preparationBadge, handle, visible, firstStyle, menuPrice, options, readyFor, start };
})();

// Project-local semantic adaptation of generated/ingredient-reveal-v1/motion-plan.json.
// The slot keeps the real ingredient text/list accessible and styled by the site.
if (globalThis.customElements && !customElements.get('dl-ingredient-reveal')) {
  class IngredientReveal extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({mode:'open'}).innerHTML='<slot></slot>';
      this.animations=[];
      this.preference=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
      this.onPreference=()=>{if(this.preference.matches)this.finish();};
    }
    connectedCallback() {
      this.preference?.addEventListener?.('change',this.onPreference);
      Promise.resolve().then(()=>{if(this.isConnected)this.restart();});
    }
    disconnectedCallback() {this.finish();this.preference?.removeEventListener?.('change',this.onPreference);}
    finish() {this.generation=(this.generation||0)+1;this.animations.forEach(a=>a.cancel());this.animations=[];this.dataset.motionState='complete';}
    restart() {
      this.finish();
      if(this.preference?.matches)return;
      const generation=this.generation;
      const targets=[...this.querySelectorAll('[data-motion-new="true"] .ingredient-name')];
      this.animations=targets.flatMap((node,index)=>node.animate ? [node.animate([
        {opacity:0,transform:'translateY(5px)',clipPath:'inset(100% 0 0 0)'},
        {opacity:1,transform:'translateY(0)',clipPath:'inset(0 0 0 0)'}
      ],{duration:420,delay:Math.min(index*70,280),easing:'cubic-bezier(.22,.72,.18,1)',fill:'backwards'})] : []);
      this.dataset.motionState=this.animations.length?'playing':'complete';
      Promise.all(this.animations.map(a=>a.finished.catch(()=>{}))).then(()=>{if(generation===this.generation&&this.isConnected)this.dataset.motionState='complete';});
    }
    pause(){this.animations.forEach(a=>a.pause());}
    play(){if(this.preference?.matches)return;this.animations.forEach(a=>a.play());}
    seek(ms){this.pause();this.animations.forEach(a=>{a.currentTime=Math.max(0,Number(ms)||0);});}
    setProgress(value){this.seek(Math.max(0,Math.min(1,value))*700);}
  }
  customElements.define('dl-ingredient-reveal',IngredientReveal);
}
