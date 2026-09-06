// Preparation first, then filling, then portion and relevant extras.
const LunchMenu = (() => {
  let preparation = null;
  const prep = id => LUNCH_PREPARATIONS.find(p => p.id === id);
  const options = (d, style) => d.variants?.[style];
  const selectedKey = (d, values) => d.styles.find(key => {
    const v = d.variants[key];
    return ["prep", "pieces", "spicy", "sesame", "noodles"].every(k => v[k] === values[k]);
  });
  const firstStyle = d => d.styles?.find(key => d.variants[key].prep === preparation) || d.styles?.[0] || null;
  const visible = d => d.section !== "dumplings" || Boolean(preparation && d.preparations.includes(preparation));
  function section() {
    return `<div class="lunch-steps"><p class="lunch-service">${tr("午餐供应", "LUNCH MENU")}</p><div class="lunch-step-title"><span>01</span><h3>${tr("先选做法", "Choose preparation")}</h3></div><div class="lunch-preparations" role="group" aria-label="${tr("先选做法", "Choose preparation")}">${LUNCH_PREPARATIONS.map(p => `<button data-lunch-prep="${p.id}" aria-pressed="${preparation === p.id}"><strong>${tr(p.cn, p.en)}</strong><small>${p.extra ? tr("+S$1 / 份", "+S$1 / portion") : tr(p.en, p.cn)}</small></button>`).join("")}</div>${preparation ? `<div class="lunch-step-title lunch-fillings-title"><span>02</span><h3>${tr("再选饺子种类", "Choose your filling")}</h3><small>${tr(prep(preparation).cn, prep(preparation).en)}</small></div>` : ""}</div>`;
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
      renderMenu();
      document.querySelector(`[data-lunch-prep="${preparation}"]`)?.focus({ preventScroll: true });
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
    const extra = prep(preparation)?.extra || 0;
    return `${money(d.price + extra)} ${tr("起", "from")}`;
  };
  return { section, controls, handle, visible, firstStyle, menuPrice, options };
})();
