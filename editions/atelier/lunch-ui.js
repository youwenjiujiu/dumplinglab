// Pick preparation to reveal fillings immediately; configure portions/extras in detail.
const LunchMenu = (() => {
  let preparation = null;
  let step = "preparation";
  let flavor = { spicy:false, sesame:false, noodles:false };
  // The 自选 sheet keeps its note while the filling or sauce changes.
  let itemNote = "";
  const prep = id => LUNCH_PREPARATIONS.find(p => p.id === id);
  const preparationDescription = id => ({ soup:tr("清汤鲜香", "In clear broth"), tossed:tr("酱汁拌匀", "Coated in sauce"), boiled:tr("清爽原味", "Plain, no sauce"), fried:tr("金黄脆底", "Golden crisp base") })[id] || "";
  const options = (d, style) => d.variants?.[style];
  const firstStyle = d => d.choiceOptions && !d.variants ? d.styles?.[0] || null : styleFor(d, preparation, 5, flavor) || d.styles?.[0] || null;
  const readyFor = d => Boolean(d.fixedPreparation) || globalThis.LUNCH_CHOOSE_FILLING_FIRST===true || step === "filling" && d.preparations.includes(preparation);
  const visible = d => d.active!==false && !(d.singleChoice===false&&d.section==="dumplings") && (d.section !== "dumplings" || readyFor(d));
  const styleFor = (d, id, pieces = Math.min(...Object.keys(d.portionPrices).map(Number)), extras = {}) => d.styles?.find(key => {
    const v=d.variants[key];
    return !v.legacy && v.prep===id && v.pieces===pieces && (id!=="tossed"||["spicy","sesame","noodles"].every(k=>v[k]===Boolean(extras[k])));
  });
const recommendationPrice = r => {
 const d=dish(r.dishId);
 if(r.chooseFilling)return Math.min(...MENU.filter(d=>d.kind==='dumpling'&&d.active!==false&&d.preparations.includes('boiled')).map(d=>Math.min(...Object.values(d.variants).filter(v=>v.prep==='boiled').map(v=>v.price))));
 return d.variants?Math.min(...Object.values(d.variants).filter(v=>!r.prep||v.prep===r.prep).map(v=>v.price)):d.price;
};
  const hasPriceRange = (d, method) => new Set(Object.values(d.variants||{}).filter(v=>!method||v.prep===method).map(v=>v.price)).size>1;
  const recommendationPriceLabel = r => {
    const price=recommendationPrice(r);
    return r.chooseFilling||hasPriceRange(dish(r.dishId),r.prep)?fromPrice(price):foodMoney(price);
  };
  // 自选: each preparation opens a sheet like a drink's, choosing filling, portion and note there.
  const fillingsFor = id => MENU.filter(d => d.section === "dumplings" && d.active !== false && d.singleChoice !== false && !d.fixedPreparation && d.preparations?.includes(id));
  // The four tossed sauces show as one 干拌 choice; 不加辣 / 不加花生酱 then pick among them.
  const tossedOf = id => (globalThis.LUNCH_TOSSED || []).find(t => t.id === id);
  const tossedToggle = (t, key) => LUNCH_TOSSED.find(x => x.spicy === (key === "spicy" ? !t.spicy : t.spicy) && x.peanut === (key === "peanut" ? !t.peanut : t.peanut))?.id;
  const singlePreparations = () => {
    const first = globalThis.LUNCH_TOSSED?.[0]?.id;
    return LUNCH_PREPARATIONS.filter(p => (globalThis.LUNCH_SINGLE_PREPARATIONS || LUNCH_PREPARATIONS.map(p => p.id)).includes(p.id) && (!tossedOf(p.id) || p.id === first))
      .map(p => p.id === first ? { ...p, cn: "干拌", en: "Tossed" } : p);
  };
  // A preparation card shows the photo uploaded for it in 菜品管理 → 自选卡片图; failing that, the
  // restaurant's own photo of the filling its sheet opens with.
  const preparationPhoto = p => {
    const own = globalThis.DL_SETTINGS?.builderPhotos?.[p.id];
    if (own) return own;
    const fillings = fillingsFor(p.id), f = fillings.find(f => !f.soldOut) || fillings[0];
    return f?.preparationImageUrls?.[prep(p.id)?.sameAs || p.id] || photo(p, "s");
  };
  const builderTitle = () => {
    const p = singlePreparations().find(p => p.id === detailPreset || tossedOf(p.id) && tossedOf(detailPreset));
    return p ? bi(p.cn.endsWith("饺") ? p.cn : `${p.cn}饺子`, `${p.en} Dumplings`) : "";
  };
  function openPreparation(id) {
    const fillings = fillingsFor(id), d = fillings.find(f => !f.soldOut) || fillings[0];
    if (!d) { toast(tr("这个做法暂时没有可选的馅料。", "No fillings for this preparation right now.")); return; }
    preparation = id; itemNote = "";
    openDish(d, styleFor(d, id), id, true);
  }
  // Built-in photos that sit on a white backdrop have a transparent copy, so a selected (red) chip shows only the plate.
  const CHIP_CUTOUTS = new Set(["filling-pork-chive-shrimp-boiled-cutaway-v1-appetite-v1", "filling-pork-celery-shrimp-boiled-cutaway-v1-appetite-v1", "filling-pork-scallion-boiled-cutaway-v1-appetite-v1", "wonton-soup-appetite-v2", "lunch-pork-wonton-generated-v1-appetite-v1"]);
  // In the 自选 sheet a filling is shown, on its chip and as the big photo, by the photo uploaded for
  // that preparation (按做法配图), else by its own photo (菜品主图).
  const fillingPhoto = (f, size = "l", id = f.variants?.[detailStyle]?.prep) => f.preparationImageUrls?.[prep(id)?.sameAs || id] || photo(f, size);
  const chipPhoto = (f, id) => fillingPhoto(f, "s", id).replace(/^\/img\/s\/(.+)\.webp$/, (src, file) => CHIP_CUTOUTS.has(file) ? `/img/s/${file}-cutout.webp` : src);
  function builderControls(d, value, portions) {
    const chip = (attribute, id, label, on, disabled = false, img = "") => `<button class="chip ${on ? "active" : ""}" ${attribute}="${id}" aria-pressed="${on}" ${disabled ? "disabled" : ""}>${img ? `<img src="${img}" alt="" loading="lazy">` : ""}${escapeHTML(label)}</button>`;
    const chips = (label, items, hidden = false) => `<fieldset class="lunch-options lunch-options-choice"><legend${hidden ? ' class="sr-only"' : ""}>${bi(...label)}</legend><div class="styles">${items.join("")}</div></fieldset>`;
    const tossed = tossedOf(value.prep);
    return (tossed ? chips(["口味", "Sauce"], [["spicy", "不加辣", "No chilli"], ["peanut", "不加花生酱", "No peanut sauce"]].map(([key, cn, en]) => chip("data-detail-prep", tossedToggle(tossed, key), tr(cn, en), !tossed[key])), true) : "")
      + chips(["馅料", "Filling"], fillingsFor(value.prep).map(f => chip("data-detail-filling", f.id, name(f).replace(/ Dumplings$/, "") + (f.soldOut ? tr(" · 售罄", " · Sold out") : ""), f.id === d.id, f.soldOut, chipPhoto(f, value.prep))))
      + group(tr("份量", "Portion"), "pieces", portions, value.pieces, "lunch-option", true)
      + `<label class="builder-note"><span>${bi("备注", "Note")}</span><input data-builder-note maxlength="60" autocomplete="off" enterkeyhint="done" placeholder="${escapeHTML(tr("例如：少辣、不要葱", "e.g. less spicy, no scallion"))}" value="${escapeHTML(itemNote)}"></label>`;
  }
  document.addEventListener("input", e => { if (e.target.matches?.("[data-builder-note]")) itemNote = e.target.value; });
  function section() {
    if(globalThis.LUNCH_CHOOSE_FILLING_FIRST)return `<div class="lunch-steps filling-first-intro"><h3>${bi("先选口味，再选做法","Choose filling, then preparation")}</h3><p>${bi("点击下方口味，再选择做法和份量。","Choose a filling below, then preparation and portion size.")}</p></div>`;
    return `<div class="lunch-steps lunch-builder"><div class="builder-preps" role="group" aria-label="${tr("做法", "Preparation")}">${singlePreparations().map(p => `<button type="button" class="builder-chip" data-lunch-prep="${p.id}" aria-haspopup="dialog"><img src="${preparationPhoto(p)}" alt="" loading="lazy"><span>${escapeHTML(tr(p.cn, p.en))}</span></button>`).join("")}</div></div>`;
  }
  const group = (label, key, values, selected, attribute = "lunch-option", showLegend = false) => `<fieldset class="lunch-options lunch-options-${key}"><legend${key === "pieces" && !showLegend ? ' class="sr-only"' : ''}>${bilingualText(label)}</legend><div>${values.map(v => `<button class="chip ${String(selected) === String(v.value) ? "active" : ""}" data-${attribute}="${key}" data-value="${v.value}" aria-pressed="${String(selected) === String(v.value)}">${bilingualText(v.label)}</button>`).join("")}</div></fieldset>`;
  function preparationBadge(d, style) {
    const method = detailBuilder || options(d, style)?.prep === "fried" ? null : d.fixedPreparation || (detailPreset && prep(options(d, style)?.prep));
    return `<span id="detailPreparation" class="preparation-badge"${method ? "" : " hidden"}>${method ? bi(method.cn, method.en) : ""}</span>`;
  }
  function extrasControls(value, attribute = "lunch-option", lockedNoodles = false) {
    const toggle=(label,key,no,yes)=>group(label,key,[{value:false,label:no},{value:true,label:yes}],value[key],attribute);
    return (value.prep==="tossed" ? toggle(tr("辣度","Spice"),"spicy",tr("不辣","Not spicy"),tr("辣","Spicy")) + toggle(tr("芝麻酱","Sesame sauce"),"sesame",tr("不加","No sesame sauce"),tr("加芝麻酱","Add sesame sauce")) : "") +
      (["soup","tossed"].includes(value.prep) && globalThis.LUNCH_ALLOW_NOODLE_EXTRA!==false ? lockedNoodles ? `<p class="detail-portion">${bi("已含面 · 价格已计入","Noodles included in the price")}</p>` : toggle(tr("加面","Noodles"),"noodles",tr("不加面","No noodles"),tr(`加面 +${foodMoney(LUNCH_NOODLE_EXTRA)}`,`Add noodles +${foodMoney(LUNCH_NOODLE_EXTRA)}`)) : "");
  }
  function controls(d) {
    if(!d.variants)return '';
    const value=options(d,detailStyle);
    if(d.fixedPieces)return `<div id="lunchOptions"><p class="detail-portion">${bi('每份固定 '+d.fixedPieces+' 颗云吞，已含面','Each serving includes '+d.fixedPieces+' wontons and noodles')}</p></div>`;
    const methods=d.availablePreparations?expandPreparations(d.availablePreparations):globalThis.LUNCH_SINGLE_PREPARATIONS||d.preparations;
    const preparationOptions=methods.filter(id=>d.preparations.includes(id)).map(id=>{const p=prep(id),extra=d.preparationExtras?.[id]||0;return {value:id,label:tr(p.cn,p.en)+(extra?' +'+foodMoney(extra):'')}});
    const portions=Object.keys(d.portionPrices).map(Number).map(n=>{const price=itemPrice(d,styleFor(d,value.prep,n,value));return {value:n,label:tr(`${n} 颗 · ${foodMoney(price)}`,`${n} pieces · ${foodMoney(price)}`)}});
    if(detailBuilder)return `<div id="lunchOptions">${builderControls(d,value,portions)}</div>`;
    return `<div id="lunchOptions">${d.fixedPreparation||detailPreset?'':group(tr('做法','Preparation'),'prep',preparationOptions,value.prep)}${group(tr('选份量','Portion'),'pieces',portions,value.pieces)}${d.fixedPreparation?'':extrasControls(value,'lunch-option',Boolean(detailPreset?.noodles))}</div>`;
  }
  function ingredients(d, style, previousKeys = null) {
    const info = d.ingredientInfo;
    const items = [...(info?.items || [])];
    const value = options(d, style);
    if (value?.prep === "soup") items.push({cn:"高汤", en:"Broth"});
    if (value?.noodles) items.push({cn:"面条", en:"Noodles"});
    if (["peanut", "dry"].includes(value?.prep)) items.push({cn:"花生酱",en:"Peanut sauce"});
    if (["red-oil", "dry"].includes(value?.prep)) items.push({cn:"四川红油",en:"Sichuan chilli oil"});
    if (value?.prep === "soy") items.push({cn:"酱油",en:"Soy sauce"});
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
return `<section class="menu-section${matchMedia("(max-width: 760px)").matches ? " chapter-mains" : ""}" id="section-recommended" data-section="recommended"><div class="section-heading recommendation-heading"><h2>${categoryName("recommended")}</h2><button class="section-suggestion" data-action="planner" aria-haspopup="dialog">${bi("推荐搭配","Suggestions")}<span aria-hidden="true">↗</span></button></div><div class="dish-grid recommendation-grid">${entries.map((r,i) => `<article class="dish-card recommendation-card"><button class="dish-open" data-recommendation="${r.id}" ${r.pending ? "disabled" : ""} aria-label="${escapeHTML(name(r))}"><div class="dish-image">${r.img||r.imageUrl||r.preparationImageUrls?.[r.prep]?`<img src="${photo(r)}" alt="" ${i===0?'fetchpriority="high"':'loading="lazy"'}>`:`<span class="dish-placeholder">${icon("plate")}</span>`}</div><div class="dish-info"><span class="dish-number">${String(i+1).padStart(2,"0")}</span><h3 class="dish-name">${dishNameHTML(r)}</h3><span class="dish-english">${otherName(r)}</span><span class="dish-price">${r.pending ? (r.soldOut ? bi("售罄", "Sold out") : bi("暂未开放", "Coming later")) : recommendationPriceLabel(r)}</span></div></button>${cardStepper(r.pending || r.chooseFilling ? null : dish(r.dishId), `<button class="dish-add" data-recommendation="${r.id}" aria-label="${escapeHTML(tr("选择", "Choose") + " " + name(r))}" ${r.pending ? "disabled" : ""}>${r.pending ? "—" : "+"}</button>`, r.prep || null)}</article>`).join("")}</div></section>`;
  }
  function openBoiledFillings() {
    openModal("filling", "");
    $("#sheetBody").innerHTML = `<div class="sheet-content"><h2 id="sheetTitle">${bi("水煮饺子", "Boiled Dumplings")}</h2><p class="detail-other">${bi("选馅儿", "Choose your filling")}</p><div class="filling-picker">${MENU.filter(d=>["dumpling","wonton"].includes(d.kind) && d.singleChoice!==false && d.active!==false && d.preparations.includes("boiled")).map(d=>`<button ${d.soldOut?'disabled':''} data-boiled-filling="${d.id}"><img src="${photo(d)}" alt=""><span><strong>${dishNameHTML(d)}</strong><small>${otherName(d)}</small></span><span class="filling-price">${fromPrice(d.price)}</span><span aria-hidden="true">+</span></button>`).join("")}</div></div>`;
  }
  function handle(button) {
    if (button.dataset.recommendation) {
      const r = LUNCH_RECOMMENDATIONS.find(r=>r.id===button.dataset.recommendation);
      if (!r || r.pending) return true;
      if (r.chooseFilling) openPreparation(r.prep);
      else { const d=dish(r.dishId); if(!d.variants)openDish(d);else {const key=d.fixedPreparation?d.styles[0]:styleFor(d,r.prep,Math.min(...Object.keys(d.portionPrices).map(Number)),{noodles:r.noodles});if(key)openDish(d,key,r.noodles?{prep:r.prep,noodles:true}:r.prep);} }
      return true;
    }
    if (button.dataset.boiledFilling) {
      const d = MENU.find(d=>d.id===button.dataset.boiledFilling && ["dumpling","wonton"].includes(d.kind) && d.singleChoice!==false);
      if (d?.preparations.includes("boiled")) openDish(d, styleFor(d,"boiled"), "boiled");
      return true;
    }
    if (button.dataset.lunchPrep) {
      if (!prep(button.dataset.lunchPrep)||(globalThis.LUNCH_SINGLE_PREPARATIONS&&!LUNCH_SINGLE_PREPARATIONS.includes(button.dataset.lunchPrep))) return true;
      openPreparation(button.dataset.lunchPrep);
      return true;
    }
    if (button.dataset.detailFilling || button.dataset.detailPrep) {
      if (!detailBuilder) return true;
      const pieces = options(detail, detailStyle).pieces, next = button.dataset.detailFilling ? dish(button.dataset.detailFilling) : detail, method = button.dataset.detailPrep || detailPreset;
      const key = styleFor(next, method, pieces) || styleFor(next, method);
      if (!key) return true;
      const focus = button.dataset.detailFilling ? `[data-detail-filling="${next.id}"]` : `[data-detail-prep]:nth-child(${[...button.parentElement.children].indexOf(button) + 1})`;
      detail = next; detailPreset = preparation = method; detailStyle = key;
      document.querySelector("#lunchOptions").outerHTML = controls(detail);
      updateDetailSelection();
      document.querySelector(focus)?.focus({ preventScroll: true });
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
    if (field==="noodles" && globalThis.LUNCH_ALLOW_NOODLE_EXTRA===false)return true;
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
  // A dish with drink/brand options shows its lowest option price, marked "from" when they differ.
  const optionPrices = d => d.choiceOptions && !d.variants ? (d.styles || []).map(s => lunchPrice(d, s)) : [];
  const menuPrice = d => { const prices = optionPrices(d); if (prices.length) return new Set(prices).size > 1 ? fromPrice(Math.min(...prices)) : foodMoney(prices[0]); return hasPriceRange(d) ? fromPrice(d.price) : foodMoney(d.price); };
  const start = () => { step = "preparation"; };
  // 先选做法时，选好的做法带进菜品详情并锁定，详情里只选份量。
  const chosenPreparation = d => !globalThis.LUNCH_CHOOSE_FILLING_FIRST && step === "filling" && d.section === "dumplings" && !d.fixedPreparation && d.preparations.includes(preparation) ? preparation : null;
  // After a preparation is chosen, a filling's price is that preparation's lowest portion price.
  const preparationPrice = d => {
    const method = chosenPreparation(d);
    if (!method || !d.variants) return menuPrice(d);
    // lunchPrice includes any preparation surcharge, e.g. pan-fried.
    const prices = (d.styles || []).filter(st => d.variants[st]?.prep === method).map(st => lunchPrice(d, st));
    if (!prices.length) return menuPrice(d);
    return new Set(prices).size > 1 ? fromPrice(Math.min(...prices)) : foodMoney(prices[0]);
  };
  return { builderTitle, fillingPhoto, recommendationPrice, recommendationPriceLabel, openBoiledFillings, section, recommendationSection, controls, ingredients, preparationBadge, handle, visible, firstStyle, menuPrice, preparationPrice, options, readyFor, start, chosenPreparation };
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

// Unpriced lunch sets are inspectable menu previews, never purchasable SKUs.
(()=>{
 const item=key=>MENU.find(d=>d.id.endsWith('-'+key)&&d.active!==false);
 const label=key=>{const d=item(key);return d?name(d):key};
 const select=(title,values)=>`<label class="lunch-set-field"><span>${title}</span><select>${values.map(v=>`<option value="${escapeHTML(v.value)}">${escapeHTML(v.label)}</option>`).join('')}</select></label>`;
 const choices=keys=>keys.map(key=>({value:key,label:label(key)}));
 const title=s=>tr(s.cn||(s.key==='dumpling-set'?'饺子午市套餐':'面条午市套餐'),s.name);
 const schedule=s=>(s.start||'11:00')+'–'+(s.end||'15:00');
 const price=s=>Number.isFinite(s.price)?foodMoney(s.price):bi('价格待定','Price to be confirmed');
 const summary=s=>s.key==='dumpling-set'?tr(s.pieces+'颗饺子／云吞 + '+label(s.includedColdDish)+' + 饮品',s.pieces+' dumplings/wontons + '+label(s.includedColdDish)+' + drink'):tr('面条 + 4颗煎饺 + 饮品','Noodles + 4 pan-fried dumplings + drink');
 LunchMenu.lunchSetSection=()=>{
  const sets=(globalThis.LUNCH_SETS||[]).filter(s=>s.visible!==false);if(!sets.length)return '';
  return `<section class="menu-section" id="section-lunchsets" data-section="lunchsets"><div class="section-heading"><h2>${bi('午市套餐','Lunch Sets')}</h2><span class="translation">LUNCH SETS</span></div><p class="lunch-set-hint">${bi('营业日午市供应 · 价格未确认前暂不开放套餐下单','Lunch on business days · Set ordering is not yet available')}</p><div class="dish-grid">${sets.map(s=>`<article class="dish-card lunch-set-card"><button class="dish-open" data-lunch-set="${s.key}">${globalThis.LunchSetArt?.render(s,MENU)||''}<div class="dish-info"><span class="dish-number">LUNCH · ${escapeHTML(schedule(s))}</span><h3 class="dish-name">${escapeHTML(title(s))}</h3><p class="dish-flavor">${escapeHTML(tr(s.description||summary(s),s.descriptionEn||summary(s)))}</p><span class="dish-price">${price(s)}</span><span class="lunch-set-preview">${bi('查看搭配 ↗','View choices ↗')}</span></div></button></article>`).join('')}</div></section>`;
 };
 const handle=LunchMenu.handle;
 LunchMenu.handle=button=>{
  if(!button.dataset.lunchSet)return handle(button);
  const s=LUNCH_SETS.find(s=>s.key===button.dataset.lunchSet&&s.visible!==false);if(!s)return true;
  LunchMenu.currentSet=s.key;openModal('lunchset',title(s));
  const fields=s.key==='dumpling-set'
   ? select(bi('馅料 · '+s.pieces+'颗','Filling · '+s.pieces+' pieces'),choices(s.fillingChoices))+select(bi('做法','Preparation'),s.preparationChoices.map(p=>({value:p.key,label:tr(p.cn,({boiled:"Plain boiled",soup:"Clear broth","red-oil":"Sichuan chilli oil",peanut:"Peanut sauce"})[p.key])})))+`<p>${bi('固定配菜：','Included side: ')}${escapeHTML(label(s.includedColdDish))}</p>`+select(bi('加面 · 仅限本套餐','Noodles · this set only'),[{value:'no',label:tr('不加面','No noodles')},{value:'yes',label:tr('加面 +'+foodMoney(s.optionalNoodlesExtra),'Add noodles +'+foodMoney(s.optionalNoodlesExtra))}])
   : select(bi('面条','Noodles'),choices(s.noodleChoices))+select(bi('煎饺 · 4颗','Pan-fried dumplings · 4 pieces'),choices(s.sideDumplings.fillingChoices));
  $('#sheetBody').innerHTML=`<div class="set-detail-art">${globalThis.LunchSetArt?.render(s,MENU)||''}</div><div class="sheet-content"><h2 id="sheetTitle">${escapeHTML(title(s))}</h2><p class="detail-other">${bi('营业日 ','Business days ')}${escapeHTML(schedule(s))} · ${price(s)}</p><div class="lunch-set-fields">${fields}${select(bi('饮品','Drink'),choices(s.drinkChoices))}</div><p class="lunch-set-hint">${bi('当前仅预览套餐搭配，暂未开放套餐下单。','Preview choices only. Set ordering is not yet available.')}</p></div><div class="dish-action"><button class="primary" disabled>${bi('暂未开放套餐下单','Set ordering unavailable')}</button></div>`;
  return true;
 };
})();
