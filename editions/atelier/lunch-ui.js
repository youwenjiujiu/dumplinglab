// Preparation first, then filling, then portion and relevant extras.
const LunchMenu = (() => {
  let preparation = null;
  let step = "preparation";
  let flavor = { spicy: false, sesame: false, noodles: false };
  const prep = id => LUNCH_PREPARATIONS.find(p => p.id === id);
  const options = (d, style) => d.variants?.[style];
  const selectedKey = (d, values) => d.styles.find(key => {
    const v = d.variants[key];
    return ["prep", "pieces", "spicy", "sesame", "noodles"].every(k => v[k] === values[k]);
  });
  const firstStyle = d => d.styles?.find(key => {
    const v = d.variants[key];
    return v.prep === preparation && v.pieces === 5 && ["spicy", "sesame", "noodles"].every(k => v[k] === flavor[k]);
  }) || d.styles?.[0] || null;
  const readyFor = d => step === "filling" && d.preparations.includes(preparation);
  const visible = d => d.section !== "dumplings" || readyFor(d);
  const flavorSummary = () => [tr(prep(preparation)?.cn, prep(preparation)?.en),
    ...(preparation === "tossed" ? [tr(flavor.spicy ? "辣" : "不辣", flavor.spicy ? "Spicy" : "Not spicy"), tr(flavor.sesame ? "加芝麻酱" : "不加芝麻酱", flavor.sesame ? "Sesame sauce" : "No sesame sauce")] : []),
    ...(["soup", "tossed"].includes(preparation) ? [tr(flavor.noodles ? "加面 +S$2.50" : "不加面", flavor.noodles ? "Noodles +S$2.50" : "No noodles")] : []),
    ...(preparation === "fried" ? ["+S$1"] : [])].filter(Boolean).join(" · ");
  function section() {
    if (step === "filling") return `<div class="lunch-steps"><p class="lunch-service">${tr("午餐供应", "LUNCH MENU")}</p><div class="lunch-chosen-flavor"><div><small>${tr("已选口味", "PREPARATION")}</small><strong>${flavorSummary()}</strong></div><button data-lunch-back>${tr("换口味", "Change")} ↗</button></div><div class="lunch-step-title lunch-fillings-title" tabindex="-1" id="fillingStepTitle"><span>02</span><h3>${tr("选饺子种类", "Choose your filling")}</h3></div></div>`;
    const choice = (label, field, yes, no) => `<fieldset class="lunch-options"><legend>${label}</legend><div>${[false,true].map(value=>`<button class="chip ${flavor[field]===value ? "active" : ""}" data-lunch-flavor="${field}" data-value="${value}" aria-pressed="${flavor[field]===value}">${value ? yes : no}</button>`).join("")}</div></fieldset>`;
    return `<div class="lunch-steps"><p class="lunch-service">${tr("午餐供应", "LUNCH MENU")}</p><div class="lunch-step-title"><span>01</span><h3>${tr("先选口味", "Choose preparation first")}</h3></div><div class="lunch-preparations" role="group" aria-label="${tr("先选口味", "Choose preparation first")}">${LUNCH_PREPARATIONS.map(p => `<button data-lunch-prep="${p.id}" aria-pressed="${preparation === p.id}"><span class="preparation-photo"><img src="${photo(p)}" alt="" loading="lazy"></span><span class="preparation-label"><strong>${tr(p.cn, p.en)}</strong><small>${p.extra ? tr("+S$1 / 份", "+S$1 / portion") : tr(p.en, p.cn)}</small><span aria-hidden="true">${preparation === p.id ? "✓" : "↗"}</span></span></button>`).join("")}</div>${preparation ? `<div class="lunch-flavor-options">${preparation === "tossed" ? choice(tr("辣度", "Spice"),"spicy",tr("辣", "Spicy"),tr("不辣", "Not spicy"))+choice(tr("芝麻酱", "Sesame sauce"),"sesame",tr("加芝麻酱", "Add sesame sauce"),tr("不加", "No sauce")) : ""}${["soup","tossed"].includes(preparation) ? choice(tr("加面", "Noodles"),"noodles",tr("加面 +S$2.50", "Add noodles +S$2.50"),tr("不加面", "No noodles")) : ""}</div><button class="primary lunch-next" data-lunch-next>${tr("选饺子种类", "Choose filling")} <span aria-hidden="true">→</span></button>` : ""}</div>`;
  }
  const group = (label, key, values, selected) => `<fieldset class="lunch-options"><legend>${label}</legend><div>${values.map(v => `<button class="chip ${String(selected) === String(v.value) ? "active" : ""}" data-lunch-option="${key}" data-value="${v.value}" aria-pressed="${String(selected) === String(v.value)}">${v.label}</button>`).join("")}</div></fieldset>`;
  function controls(d) {
    if (!d.variants) return "";
    const value = options(d, detailStyle);
    return `<div id="lunchOptions">${group(tr("做法", "Preparation"), "prep", LUNCH_PREPARATIONS.filter(p => d.preparations.includes(p.id)).map(p => ({ value: p.id, label: tr(p.cn, p.en) + (p.extra ? " +S$1" : "") })), value.prep)}${group(tr("03 · 选份量", "03 · Portion"), "pieces", [5, 10].map(n => ({ value: n, label: `${n} ${tr("颗", "pieces")} · ${money(d.portionPrices[n] + prep(value.prep).extra)}` })), value.pieces)}${value.prep === "tossed" ? group(tr("辣度", "Spice"), "spicy", [{ value: false, label: tr("不辣", "Not spicy") }, { value: true, label: tr("辣", "Spicy") }], value.spicy) + group(tr("芝麻酱", "Sesame sauce"), "sesame", [{ value: false, label: tr("不加", "No sauce") }, { value: true, label: tr("加芝麻酱", "Add sesame sauce") }], value.sesame) : ""}${["soup", "tossed"].includes(value.prep) ? group(tr("加面", "Noodles"), "noodles", [{ value: false, label: tr("不加面", "No noodles") }, { value: true, label: tr("加面 +S$2.50", "Add noodles +S$2.50") }], value.noodles) : ""}</div>`;
  }
  function handle(button) {
    if (button.dataset.lunchPrep) {
      preparation = button.dataset.lunchPrep;
      if (preparation !== "tossed") { flavor.spicy = false; flavor.sesame = false; }
      if (!["soup", "tossed"].includes(preparation)) flavor.noodles = false;
      renderMenu();
      document.querySelector(`[data-lunch-prep="${preparation}"]`)?.focus({ preventScroll: true });
      return true;
    }
    if (button.hasAttribute("data-lunch-back")) {
      step = "preparation";
      renderMenu();
      document.querySelector(`[data-lunch-prep="${preparation}"]`)?.focus({preventScroll:true});
      return true;
    }
    if (button.hasAttribute("data-lunch-next")) {
      if (!preparation) return true;
      step = "filling";
      renderMenu();
      document.querySelector("#fillingStepTitle")?.focus({preventScroll:true});
      document.querySelector("#section-dumplings")?.scrollIntoView({behavior:"instant",block:"start"});
      return true;
    }
    if (button.dataset.lunchFlavor) {
      flavor[button.dataset.lunchFlavor] = button.dataset.value === "true";
      renderMenu();
      document.querySelector(`[data-lunch-flavor="${button.dataset.lunchFlavor}"][data-value="${button.dataset.value}"]`)?.focus({preventScroll:true});
      return true;
    }
    const field = button.dataset.lunchOption;
    if (!field || !detail?.variants) return false;
    const v = { ...options(detail, detailStyle) };
    v[field] = field === "pieces" ? Number(button.dataset.value) : field === "prep" ? button.dataset.value : button.dataset.value === "true";
    if (v.prep !== "tossed") { v.spicy = false; v.sesame = false; }
    if (!["soup", "tossed"].includes(v.prep)) v.noodles = false;
    const key = selectedKey(detail, v);
    if (!key) return true;
    detailStyle = key;
    document.querySelector("#lunchOptions").outerHTML = controls(detail);
    updateDetailSelection();
    document.querySelector(`[data-lunch-option="${field}"][data-value="${button.dataset.value}"]`)?.focus({ preventScroll: true });
    return true;
  }
  const menuPrice = d => {
    if (!d.variants) return money(d.price);
    const extra = (prep(preparation)?.extra || 0) + (flavor.noodles ? 2.5 : 0);
    return `${money(d.price + extra)} ${tr("起", "from")}`;
  };
  const start = () => { step = "preparation"; };
  return { section, controls, handle, visible, firstStyle, menuPrice, options, readyFor, start };
})();
