"use strict";
const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
const q = new URLSearchParams(location.search);
const production = document.documentElement.dataset.environment === "production";
let table = /^[a-z0-9-]{1,12}$/i.test(q.get("table") || "")
  ? q.get("table").toUpperCase()
  : null;
const group = /^[a-z0-9-]{1,16}$/i.test(q.get("group") || "")
  ? q.get("group").toUpperCase()
  : "A";
// Guest copy is always Chinese + English; old language preferences are ignored.
const language = "zh";
const tr = (zh, en) => [String(zh ?? ''), String(en ?? '')].filter((v,i,a)=>v && a.indexOf(v)===i).join('\n');
const errorText = error => tr(OrderErrors.message(error,'zh'),OrderErrors.message(error,'en'));
const escapeHTML = (text) =>
  String(text ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const money = (n) => `$${Number(n).toFixed(2)}`;
const foodMoney = n => money(OrderPricing.inclusive(n));
// Table and day discounts are set in the back office; the server re-applies them at checkout.
const tableDiscount = () => OrderPricing.discountFor(globalThis.DL_SETTINGS, table);
// Each line's net amount and menu section, for category discounts.
const discountLines = items => { const lines = priced(items), free = OrderPricing.bogoFree(lines); return lines.map((l, n) => ({ section: dish(l.id)?.section || null, amount: l.price * (l.qty - free[n]) })); };
const cartMoney = items => money(OrderPricing.quote(total(items), store.mode || "dinein", tableDiscount(), discountLines(items)).total);
// The cart total already includes the dine-in service charge; show how it is made up.
const cartBreakdown = items => {
  const free = Math.round((gross(items) - total(items)) * 100) / 100, gift = free ? bi(`买一赠一已减 ${money(free)}`, `Buy 1 get 1 −${money(free)}`) : "";
  if ((store.mode || "dinein") !== "dinein") return gift ? `<em class="cart-breakdown">${gift}</em>` : "";
  const q = OrderPricing.quote(total(items), "dinein", tableDiscount(), discountLines(items));
  return `<em class="cart-breakdown">${gift ? `${gift}<br>` : ""}${q.discount ? `${tableDiscount().scope === "day" ? bi(`已减今日折扣 ${money(q.discount)}`, `Today's discount −${money(q.discount)}`) : bi(`已减本桌折扣 ${money(q.discount)}`, `Table discount −${money(q.discount)}`)}<br>` : ""}${bi(`含 10% 服务费 ${money(q.serviceCharge)}`, `Incl. 10% service ${money(q.serviceCharge)}`)}</em>`;
};
// A back-office promotion on one dish: a tag, and the old price struck through
// when the dish has a single price.
const promoTag = d => {
  const p = d?.promo;
  if (!p) return "";
  const [zh, en] = p.type === "bogo" ? ["买一赠一", "Buy 1 get 1"] : p.type === "price" ? ["特价", "Special"] : [`${+((100 - p.value) / 10).toFixed(1)} 折`, `${p.value}% off`];
  return `<span class="promo-tag">${bi(zh, en)}</span>`;
};
const addMoney = (d, style, qty) => foodMoney(itemPrice(d, style) * (qty - (d?.promo?.type === "bogo" ? Math.floor(qty / 2) : 0)));
const listPrice = d => d?.listPrice && !d.variants && !d.sizeGroup && !d.choiceOptions?.items?.some(o => o.price != null) ? `<s class="list-price">${foodMoney(d.listPrice)}</s>` : "";
const bilingualText = text => { const [zh,...rest]=String(text??'').split('\n');return rest.length ? `<span class="bilingual"><span lang="zh-CN">${escapeHTML(zh)}</span><span class="bilingual-en" lang="en">${escapeHTML(rest.join(' '))}</span></span>` : escapeHTML(zh); };
const bi = (zh, en) => bilingualText(tr(zh,en));
const setBilingual = (node, text) => { if(node) node.innerHTML = bilingualText(text); };
const name = (d) => tr(d.cn,d.name),
  otherName = (d) => escapeHTML(d.name || "");
const fromPrice = n => bi(`${foodMoney(n)} 起`, `From ${foodMoney(n)}`);
// Explicit word boundaries keep ingredients intact at narrow widths.
const dishNameParts = new Map([
  "韭菜 虾仁 猪肉", "芹菜 虾仁 猪肉", "白菜 猪肉", "鸡肉 玉米 云吞", "鲜肉 云吞",
  "肉末 辣椒 拌面", "陕西 油泼面", "销魂 皮蛋面", "肉末 红油 燃面", "卤肉饭", "鱼丸汤", "桂花 乌龙茶",
  "韭菜 虾仁 猪肉 煎饺", "鸡肉 包菜 煎饺", "红油 抄手", "清汤 鲜肉 云吞", "鲜虾 蟹籽 云吞面", "白灼 饺子", "水煮 饺子",
  "韭菜 猪肉", "芹菜 猪肉", "鸡肉 玉米", "西葫芦 鸡蛋", "西红柿 鸡蛋",
  "鲜虾 蟹籽 云吞", "鲜肉 抄手", "肉末 葱油面", "肉末 辣椒面",
  "甘榜 鸡肉 拌面", "甘榜 鸡汤 拉面", "干拌 葱油面", "卤豆腐", "卤 五花肉",
  "炸云吞", "秘制 鸡翅", "酱油 菜心", "皮蛋 豆腐", "溏心 卤蛋", "腌萝卜", "黄瓜",
  "薏米水", "柠檬茶", "酸梅汁", "软饮", "水",
  "北京 猪肉 锅贴", "日式 鸡肉 煎饺", "港式 蟹籽 汤云吞", "外婆 煎馄饨",
  "南京 牛肉 锅贴", "四川 红油 抄手", "红油 云吞", "鸡肉 包菜",
  "牛肉 咖喱 洋葱", "猪肉 芹菜 虾仁", "咸蛋 鱼子 虾仁", "猪肉 大葱",
  "鸡肉 玉米 胡萝卜", "猪肉 韭菜", "番茄 鸡蛋", "四素 饺子",
  "菜肉 馄饨", "韭菜 馄饨", "西安 油泼面", "新疆 大盘鸡面",
  "上海 葱油面", "北京 炸酱面", "招牌 鸡汤 拉面", "扬州 阳春 素面",
  "肉末 煎蛋面", "云吞 汤面", "干拌 云吞面", "南京 汤包", "传统 猪肉包",
  "茭白 肉末 团子", "萝卜 猪肉 团子", "豆沙 汤圆", "芝麻 汤圆",
  "传统 虾仁 蛋炒饭", "特色 辣鸡肉 炒饭", "潮州 鱼丸汤", "番茄 牛肉汤",
  "狮子头汤", "土豆泥 沙拉", "糖醋 排骨", "口水鸡", "糟卤虾",
  "肉末 豆腐", "大盘鸡", "鸡蛋 午餐肉", "红烧 狮子头", "云南 包浆 豆腐",
  "秘制 猪排", "十三味 鸡块", "十三味 特色 鸡翅", "老式 炸鸡腿",
  "凉拌 蔬菜丝", "凉拌 茄子· 清炒 豆苗", "蔬菜 蘸酱", "腌萝卜 泡菜",
  "蒜蓉 西兰花", "蚝油 生菜", "麻酱 菠菜", "芒果 冰浆", "西瓜 冰浆", "黄瓜 冰浆",
].map((s) => [s.replaceAll(" ", ""), s.split(" ")]));
dishNameParts.set("Mini 卤肉饭", ["Mini ", "卤肉饭"]);
function dishNameHTML(d) {
  if (language !== "zh") return escapeHTML(name(d));
  const parts = dishNameParts.get(d.cn);
  return parts ? parts.map((part) => `<span class="dish-word">${escapeHTML(part)}</span>`).join("<wbr>") : escapeHTML(d.cn);
}
// Phones: categories in a left rail and every dish as a one-column row card.
const phoneRail = matchMedia("(max-width: 760px)");
const categoryName = (id) => tr(I18N.sections[id],SECTION_LABELS[id]);
const categoryOther = () => "";
const dish = (id) => MENU.find((d) => d.id === id) || (globalThis.LEGACY_MENU || []).find(d => d.id === id) || { id, cn: "原菜单菜品", name: "Previous menu item", section: "sides", price: 0 };
const itemPrice = (d, style) => lunchPrice(d, style) ?? d.price;
const combinationPresentation = (d, style) => {
  const variant = d.variants?.[style];
  return variant?.noodles ? LUNCH_RECOMMENDATIONS.find(r => r.dishId === d.id && r.prep === variant.prep && r.noodles) : null;
};
const presentedDish = (d, style) => {
  const combination = combinationPresentation(d, style);
  if (combination) return { ...d, cn: combination.cn, name: combination.name, img: combination.img };
  if (d.variants?.[style]?.prep === "fried") return { ...d,
    cn: /煎饺/.test(d.cn) ? d.cn : `${d.cn}煎饺`,
    name: /pan.fried/i.test(d.name) ? d.name : `Pan-fried ${d.name}` };
  return d;
};
const photo = (d, size = "s", style = null, transparent = false) => {
  const optionImage = style && globalThis.choiceOptionFor?.(d, style)?.imageUrl;
  if (optionImage) return optionImage;
  const preparation = d.variants?.[style]?.prep||d.prep;
  if(d.fixedPreparation?.id==="fried"&&d.imageUrl)return d.imageUrl;
  const imagePrep = LUNCH_PREPARATIONS.find(p=>p.id===preparation)?.sameAs||preparation;
  if(preparation&&d.preparationImageUrls?.[imagePrep])return d.preparationImageUrls[imagePrep];
  if(!preparation&&d.imageUrl)return d.imageUrl;
  const img = combinationPresentation(d, style)?.img || d.preparationImages?.[imagePrep] || (d.kind === "dumpling" && style ? d.img || LUNCH_PREPARATIONS.find(p=>p.id===preparation)?.img : d.img);
  const artwork = transparent ? globalThis.DL_TRAY_ART?.[img] || img : globalThis.DL_MENU_ART?.[img] || img;
  return artwork ? `/img/${size}/${artwork.replace(/\.(png|jpe?g|webp)$/i, ".webp")}` : preparation?"/brand/dumpling-lab-primary.png":"";
};
// A recommendation with its own photo (干拌鲜虾蟹籽云吞) shows that photo in the dish sheet too.
const detailPhoto = (d, style) => { const r = (globalThis.LUNCH_RECOMMENDATIONS || []).find(r => r.ownPhoto && r.dishId === d.id && r.prep === d.variants?.[style]?.prep); return r ? photo(r, "l") : photo(d, "l", style); };
const description = (d) => I18N.dishes[d.id]?.flavor || d.flavor;
const culinaryPhrases = ["手工宽面", "酱香微辣", "配辣椒", "蒜末", "与热油", "细面", "拌葱油", "与甜酱油", "底部", "煎至金黄", "卷心菜", "猪肉", "鸡肉", "牛肉", "土豆", "番茄", "鸡汤", "拉面", "葱油", "芝麻", "黑芝麻", "糯米汤圆", "薄皮煎制", "鲜虾", "韭菜", "香菇", "咸蛋黄"].sort((a, b) => b.length - a.length);
const culinaryPattern = new RegExp(`(${culinaryPhrases.join("|")})`, "u");
const copySegmenter = typeof Intl.Segmenter === "function" ? new Intl.Segmenter("zh", { granularity: "word" }) : null;
function chineseCopyUnits(text) {
  const tokens = String(text).split(culinaryPattern).filter(Boolean).flatMap(part => culinaryPhrases.includes(part) ? [part] : copySegmenter ? [...copySegmenter.segment(part)].map(s => s.segment) : part.split(/(?<=[，、。；])/u));
  const units = []; let prefix = "";
  for (const token of tokens) {
    if (/^[，。、；：！？,.!?;）]+$/u.test(token) && units.length) {
      units[units.length - 1] += prefix + token;
      prefix = "";
    }
    else if (/^(与|和|及|配|的|拌|加|（)$/u.test(token)) prefix += token;
    else { units.push(prefix + token); prefix = ""; }
  }
  if (prefix) { if (units.length) units[units.length - 1] += prefix; else units.push(prefix); }
  return units;
}
const descriptionHTML = d => bi(description(d),d.flavor);
const spiceMarkup = d => `<span class="spice-value">${bi(I18N.ui.zh.spiceLevels[d.spice || 0],I18N.ui.en.spiceLevels[d.spice || 0])}<svg class="spice-brush" width="${34 + Math.min(3, d.spice || 0) * 12}" height="9" viewBox="0 0 104 12" preserveAspectRatio="none" aria-hidden="true" style="opacity:${d.spice ? .76 : .3}"><path d="M2 7C14 3 22 6 34 4S58 7 70 4S91 5 102 3L100 7C85 10 77 7 65 9S42 7 31 9S12 11 3 9Z" fill="currentColor"/></svg></span>`;
const updateText = (node, value) => {
  if (!node) return;
  if (typeof value === "string" && value.includes("\n")) { setBilingual(node,value); return; }
  if (globalThis.OrderFeedback) globalThis.OrderFeedback.text(node, value);
  else node.textContent = value;
};
const styleEnglish = s => [...MENU, ...(globalThis.LEGACY_MENU || [])].find(d => d.variants?.[s])?.variants[s].en || MENU.flatMap(d => d.choiceOptions?.items || []).find(o => o.cn === s)?.en || STYLE_LABELS[s] || s;
const styleName = s => tr(s,styleEnglish(s));
const styleHTML = s => bi(s,styleEnglish(s));
let categories = SECTIONS.filter((id) => id === "recommended" || (id === "lunchsets" && (globalThis.LUNCH_SETS||[]).some(s=>s.visible!==false)) || MENU.some((d) => d.section === id));
const icons = {
  close: '<path d="m4 4 16 16M20 4 4 20"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
  plate:
    '<ellipse cx="12" cy="13" rx="9" ry="6"/><ellipse cx="12" cy="12" rx="5" ry="3"/>',
  dumpling:
    '<path d="M2.8 14.5C4.1 9.2 7.6 6.3 12 6.3s7.9 2.9 9.2 8.2C17 19 7 19 2.8 14.5Z"/><path d="m6.1 9.5 1.6 2.6M9.8 6.7l.6 3.5m3.8-3.5-.6 3.5m4.3-.7-1.6 2.6"/>',
};
const icon = (key) =>
  `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${icons[key]}</svg>`;
const groupOf = d => d.sizeGroup ? d.sizeGroup.map(id => dish(id)).filter(x => x.active !== false) : [d];
const sizeCard = d => d.sizeGroup ? { ...d, cn: d.groupCn, name: d.groupName } : d;
const groupQty = d => groupOf(d).reduce((n, x) => n + qty(x.id), 0);
// Cart lines a menu card stands for: all its sizes, or one preparation for a recommendation.
const cardLines = (d, prep = null) => {
  const ids = new Set(groupOf(d).map(x => x.id));
  return store.items.filter(i => ids.has(i.id) && (!prep || !dish(i.id).variants || dish(i.id).variants[i.style]?.prep === prep));
};
// − count + on a menu card, so a guest can take a dish back without finding the cart.
function cardStepper(d, addButton, prep = null) {
  const n = d && !d.soldOut ? cardLines(d, prep).reduce((t, i) => t + i.qty, 0) : 0;
  const target = d ? `data-stepper-dish="${d.id}"${prep ? ` data-stepper-prep="${prep}"` : ""}` : "";
  const minus = d ? `<button class="dish-minus" data-card-minus="${d.id}"${prep ? ` data-prep="${prep}"` : ""} aria-label="${escapeHTML(tr("减一份", "Remove one") + " " + name(d))}" ${n ? "" : "hidden"}>−</button><b class="dish-count" aria-live="polite" ${n ? "" : "hidden"}>${n || ""}</b>` : "";
  return `<div class="dish-stepper ${n ? "has-qty" : ""}" ${target}>${minus}${addButton}</div>`;
}
let store = new TableCart(table, group);
let tableScene = null,
  sceneSession = null,
  sceneOpened = false,
  sceneSignature = "";
let activeCategory = categories[0],
  search = "",
  filter = "all",
  modal = null,
  detail = null,
  detailQty = 1,
  detailStyle = null;
let detailPreset = null;
// The 自选 sheet: a preparation opened like a drink, choosing filling, portion and note inside.
let detailBuilder = false;
let cartTab = "pending",
  submitting = false,
  review = null,
  noteTimer,
  noteDraft = null,
  lastFocus,
  observer;
let people = 2,
  preference = "all",
  suggestions = [],
  selectedSuggestions = new Set(),
  lastOrder = null;
globalThis.getReviewSnapshot = () => review;
const qty = (id) =>
  store.items.filter((i) => i.id === id).reduce((s, i) => s + i.qty, 0);
const count = () => store.items.reduce((s, i) => s + i.qty, 0);
// Cart lines have no price yet; 买一赠一 is worked out the same way the server will.
// Placed orders carry server lines (free units already at $0).
const priced = items => items.map(i => ({ id: i.id, qty: i.qty, price: i.price ?? itemPrice(dish(i.id), i.style) ?? 0, bogo: i.price == null && dish(i.id)?.promo?.type === "bogo" }));
const gross = items => Math.round(priced(items).reduce((s, l) => s + l.price * l.qty, 0) * 100) / 100;
const total = (items) => {
  const lines = priced(items), free = OrderPricing.bogoFree(lines);
  return Math.round(lines.reduce((s, l, n) => s + l.price * (l.qty - free[n]), 0) * 100) / 100;
};
const statusCopy = () =>
  store.mode ? tr('个人选菜已保留', 'Your selection is saved') : !table
    ? tr("已保留选菜 · 下单前确认桌号", "Picks saved · choose your table before ordering")
    : {
        synced: tr("同桌已同步", "Table synced"),
        syncing: store.storageAvailable
          ? tr("正在同步…", "Syncing…")
          : tr("正在同步 · 请勿关闭页面", "Syncing · keep this page open"),
        connecting: tr("连接本桌…", "Connecting…"),
        offline: store.storageAvailable
          ? tr("离线 · 已保留选菜", "Offline · your picks are saved")
          : tr("离线 · 请勿刷新或关闭", "Offline · keep this page open"),
        rejected: tr("同步需处理 · 点击查看", "Sync needs attention · view"),
      }[store.status];

function positionAddedToast() {
  if ($('#toast').dataset.kind !== 'added' || $('#toast').hidden) return;
  const sheetOpen = $('#sheet').open;
  (sheetOpen ? $('#sheet') : document.body).append($('#toast'));
  const rect = $('.table-tray').getBoundingClientRect();
  const bottom = !sheetOpen && rect.height && rect.top < innerHeight ? innerHeight - rect.top + 12 : 108;
  $('#toast').style.setProperty('--added-toast-bottom', `${bottom}px`);
}
function toast(text, options = {}) {
  const surface = $("#sheet").open ? $("#sheet") : document.body;
  surface.append($("#toast"));
  $("#toast").dataset.kind = options.kind || 'message';
  if (options.kind === 'added') {
    $("#toast").innerHTML = `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 10 3.2 3.2L15 6.5"/></svg><span>${escapeHTML(text)}</span><span class="toast-announcement">${escapeHTML(options.announcement || '')}</span>`;
    requestAnimationFrame(() => {
      if ($('#toast').dataset.kind !== 'added' || $('#toast').hidden) return;
      // Adding from detail closes that dialog synchronously. Keep confirmation
      // visible in the surviving surface and clear of the cart's touch area.
      positionAddedToast();
      // The photo strip can grow after its images load; keep the same clearance.
      if (!toast.resizeObserver && globalThis.ResizeObserver) {
        toast.resizeObserver = new ResizeObserver(positionAddedToast);
        toast.resizeObserver.observe($('.table-tray'));
      }
    });
  } else $("#toast").textContent = text;
  $("#toast").hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => ($("#toast").hidden = true), options.kind === 'added' ? 1800 : 3200);
}
// A dialog owns one native history entry. Back closes it before leaving the menu.
// The cart's detail view returns to the cart and retains an entry for a second Back.
const sheetNavigation = (() => {
  const history = globalThis.history;
  const token = crypto.randomUUID();
  let restoring = false, waitingForClose = false, lastPanel = null, afterClose = null;
  const ownsEntry = () => history?.state?.atelierSheet === token;
  function remember(type) {
    lastPanel = { type, dishId: detail?.id, style: detailStyle, preset: detailPreset, tab: cartTab, setId: LunchMenu.currentSet };
    if (!history?.pushState || restoring || waitingForClose) return;
    const state = { ...history.state, atelierSheet: token };
    if (ownsEntry()) history.replaceState(state, "");
    else history.pushState(state, "");
  }
  function closed(action = null) {
    if (!ownsEntry() || restoring) {
      // A fresh entry has no history to traverse, but native dialog focus and
      // restored horizontal scroll still settle after close(). Reassert the
      // requested starting position at the next frame, not an arbitrary timer.
      if (action) requestAnimationFrame(() => { if (!$("#sheet").open) action(); });
      return;
    }
    afterClose = action;
    waitingForClose = true;
    history.back();
  }
  if (history?.pushState) addEventListener("popstate", () => {
    if (waitingForClose) {
      waitingForClose = false;
      const action = afterClose;
      afterClose = null;
      if ($("#sheet").open) remember(modal);
      // Native Back may restore the older document offset after popstate.
      // Apply an explicit new-start action before the next painted frame,
      // without disturbing another sheet opened in the meantime.
      if (action) requestAnimationFrame(() => { if (!$("#sheet").open) action(); });
      return;
    }
    if (!ownsEntry()) {
      if ($("#sheet").open) closeModal({ fromHistory: true });
      return;
    }
    if ($("#sheet").open || !lastPanel) return;
    restoring = true;
    try {
      switch (lastPanel.type) {
        case "dish": if (dish(lastPanel.dishId)) openDish(dish(lastPanel.dishId), lastPanel.style, lastPanel.preset); break;
        case "filling": LunchMenu.openBoiledFillings(); break;
        case "lunchset": LunchMenu.handle({dataset:{lunchSet:lastPanel.setId}}); break;
        case "categories": showCategories(); break;
        case "paper": showPaper(); break;
        case "planner": showPlanner(); break;
        case "service": showService(); break;
        case "table": showTable(); break;
        case "fulfilment": Fulfilment.select(); break;
        case "online": Fulfilment.checkout(); break;
        case "pickup": Fulfilment.paid(); break;
        default: showCart(lastPanel.tab || "pending");
      }
    } finally { restoring = false; }
  });
  return { remember, closed };
})();
let pageScrollLock = null;
function lockPageScroll() {
  if (pageScrollLock) return;
  const properties = ["position", "top", "left", "right", "width", "overflow"];
  pageScrollLock = {
    x: window.scrollX || 0, y: window.scrollY || 0,
    styles: Object.fromEntries(properties.map(key => [key, document.body.style.getPropertyValue(key)])),
  };
  Object.assign(document.body.style, {position:"fixed", top:`-${pageScrollLock.y}px`, left:"0", right:"0", width:"100%", overflow:"hidden"});
}
function unlockPageScroll() {
  if (!pageScrollLock || $("#sheet").open || document.body.classList.contains("search-open")) return;
  const saved = pageScrollLock;
  pageScrollLock = null;
  for (const [key, value] of Object.entries(saved.styles)) {
    if (value) document.body.style.setProperty(key, value);
    else document.body.style.removeProperty(key);
  }
  window.scrollTo?.({left:saved.x, top:saved.y, behavior:"instant"});
}
function openModal(type, eyebrow, options = {}) {
  $(".detail-image")?.stopPlateMotion?.();
  // The automatic entry chooser is part of entering this page, not a new
  // navigation. Closing it must not ask an embedded browser to go Back and
  // restore a previous menu scroll offset. User-opened sheets still own history.
  if (!options.initialEntry) sheetNavigation.remember(type);
  disposeTableScene();
  if (!$("#sheet").open) lastFocus = document.activeElement;
  modal = type;
  $("#sheet").classList.remove("table-entry-sheet");
  $("#closeSheet").innerHTML = icon("close");
  $("#closeSheet").ariaLabel = tr("关闭", "Close");
  if (type !== "cart") document.body.classList.remove("viewing-table");
  $("#sheet").dataset.mode = type;
  setBilingual($("#sheetEyebrow"),eyebrow || "");
  $("#sheet").classList.toggle("plain-heading", !eyebrow);
  if (!$("#sheet").open) {
    lockPageScroll();
    document.documentElement.classList.add("has-open-sheet");
    $("#sheet").showModal();
  }
  $("#sheet").scrollTop = 0;
}
function closeModal(options = {}) {
  CheckoutUI.dispose();
  $(".detail-image")?.stopPlateMotion?.();
  if (SharedTable.returnFromDetail()) return;
  $("dl-receipt-print")?.finish?.();
  document.body.classList.remove("viewing-table");
  $("#sheet").removeAttribute("data-return-to");
  disposeTableScene();
  $("#sheet").close();
  document.documentElement.classList.remove("has-open-sheet");
  modal = null;
  delete $("#sheet").dataset.mode;
  review = null;
  unlockPageScroll();
  if (lastFocus?.isConnected) lastFocus.focus({ preventScroll: true });
  if (options.startMenu) startMenu();
  if (!options.fromHistory) sheetNavigation.closed(options.startMenu ? startMenu : null);
}
$("#closeSheet").onclick = closeModal;
// Safari can mark programmatically focused controls as focus-visible after a tap.
// Keep keyboard focus feedback, but do not draw it for touch/pointer navigation.
document.addEventListener("pointerdown", () => { document.documentElement.dataset.inputMode = "pointer"; }, true);
document.addEventListener("keydown", (e) => {
  if (!["Shift", "Control", "Alt", "Meta"].includes(e.key)) document.documentElement.dataset.inputMode = "keyboard";
}, true);
function syncVisibleViewport() {
  const viewport = window.visualViewport;
  if (!viewport) return;
  const root = document.documentElement;
  root.style.setProperty("--visible-height", `${viewport.height}px`);
  root.style.setProperty("--visible-top", `${viewport.offsetTop}px`);
  const editing = document.activeElement?.matches?.('input:not([type="checkbox"]):not([type="radio"]):not([readonly]), textarea, [contenteditable=true], [data-payment-element] iframe');
  const obscured = viewport.scale < 1.1 && window.innerHeight - viewport.height > 100;
  // Keep the keyboard layout through pointer-down → blur → click. Moving the
  // sheet on blur can put the pressed button elsewhere before the tap completes.
  root.classList.toggle("keyboard-open", Boolean(obscured && (editing || root.classList.contains("keyboard-open"))));
  if (root.classList.contains("keyboard-open") && $("#sheet").contains(document.activeElement)) {
    requestAnimationFrame(() => {
      const input = document.activeElement;
      if (!input?.matches?.("input, textarea, [data-payment-element] iframe")) return;
      const scroller = input.closest(".cart-scroll, .checkout-scroll") || $("#sheet");
      const r = input.getBoundingClientRect(), frame = scroller.getBoundingClientRect();
      const top = Math.max(frame.top, viewport.offsetTop) + 64;
      const bottom = Math.min(frame.bottom, viewport.offsetTop + viewport.height) - 16;
      if (r.bottom > bottom) scroller.scrollTop += r.bottom - bottom;
      else if (r.top < top) scroller.scrollTop -= top - r.top;
    });
  }
}
window.visualViewport?.addEventListener("resize", syncVisibleViewport);
window.visualViewport?.addEventListener("scroll", syncVisibleViewport);
window.addEventListener("resize", syncVisibleViewport);
document.addEventListener("focusin", syncVisibleViewport);
document.addEventListener("focusout", () => requestAnimationFrame(syncVisibleViewport));
syncVisibleViewport();
$("#sheet").addEventListener("cancel", (e) => {
  e.preventDefault();
  closeModal();
});
$("#sheet").addEventListener("click", (e) => {
  const r = $("#sheet").getBoundingClientRect();
  if (
    e.target === $("#sheet") &&
    (e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom)
  ) {
    closeModal();
  }
});

function renderNavigation() {
  $("#sideCategories").innerHTML = categories
    .map(
      (c, i) =>
        `<button class="side-category ${c === activeCategory ? "active" : ""}" data-category="${c}"><small>${String(i + 1).padStart(2, "0")}</small>${bi(I18N.sections[c],c === "recommended" ? "Picks" : SECTION_LABELS[c])}</button>`,
    )
    .join("");
  $("#categoryScroll").innerHTML = categories
    .map(
      (c) =>
        `<button class="category-item ${c === activeCategory ? "active" : ""}" data-category="${c}" ${c === activeCategory ? 'aria-current="true"' : ""}>${bi(I18N.sections[c],c === "recommended" ? "Picks" : SECTION_LABELS[c])}</button>`,
    )
    .join("");
}
let jumpTarget = null, jumpTimer;
function setActive(c) {
  if (activeCategory === c) return;
  activeCategory = c;
  $$("[data-category]").forEach((b) => {
    b.classList.toggle("active", b.dataset.category === c);
    b.setAttribute("aria-current", String(b.dataset.category === c));
  });
  const side = $(`#sideCategories [data-category="${c}"]`), index = $(".desktop-index");
  if (side && phoneRail.matches) index.scrollTo({ top: side.offsetTop - index.clientHeight / 2 + side.offsetHeight / 2, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  const item = $(`#categoryScroll [data-category="${c}"]`),
    rail = $("#categoryScroll");
  if (item)
    rail.scrollTo({
      left:
        item.offsetLeft -
        rail.offsetLeft -
        rail.clientWidth / 2 +
        item.offsetWidth / 2,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
}
function jump(c) {
  if (document.body.classList.contains("search-open")) cancelSearch();
  clearTimeout(searchTimer);
  searchComposing = false;
  if (search || filter !== "all") {
    search = "";
    filter = "all";
    $("#searchInput").value = "";
    renderFilters();
    renderMenu();
  }
  if ($("#sheet").open) closeModal();
  setActive(c);
  // Keep the tapped category highlighted while the page glides past the ones in between.
  jumpTarget = c; clearTimeout(jumpTimer);
  jumpTimer = setTimeout(() => { jumpTarget = null; }, 1000);
  addEventListener("scrollend", () => { clearTimeout(jumpTimer); jumpTarget = null; }, { once: true });
  $(`#section-${c}`)?.scrollIntoView({
    behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "instant"
      : "smooth",
    block: "start",
  });
}
function startMenu() {
  if (document.body.classList.contains('search-open')) cancelSearch();
  clearTimeout(searchTimer);
  searchComposing = false;
  if (search || filter !== 'all') {
    search = '';
    filter = 'all';
    $('#searchInput').value = '';
    renderFilters();
    renderMenu();
  }
  setActive(categories[0]);
  // This is a new menu entry, not a smooth trip through every category.
  window.scrollTo({left:0, top:0, behavior:'instant'});
  $('#categoryScroll').scrollTo({left:0, behavior:'instant'});
}
function renderFilters() {
  $("#filters").innerHTML = [
    ["all", tr("全部", "All")],
    ["veg", tr("素食", "Vegetarian")],
  ]
    .map(
      ([id, label]) =>
        `<button data-filter="${id}" class="${filter === id ? "active" : ""}" aria-pressed="${filter === id}">${bilingualText(label)}</button>`,
    )
    .join("");
}
function matches(d) {
  if(d.active===false)return false;
  const normalise = (value) => String(value || "").normalize("NFKC").toLowerCase().replace(/[‐‑–—-]/g, " ");
  const terms = normalise(search).split(/\s+/).filter(Boolean);
  const text = normalise([
    d.cn, d.name, d.flavor, I18N.dishes[d.id]?.flavor,
    ...(d.ingredients || []),
  ].join(" "));
  return (
    terms.every((term) => text.includes(term)) &&
    (filter !== "veg" || d.veg) &&
    (filter !== "mild" || !d.spice) &&
    (filter !== "noPork" || (d.meat && d.meat !== "pork") || d.veg)
  );
}
function searchEntries() {
  if (!search.trim()) return [];
  const entries = new Map(MENU.filter(matches).map(d => [d.id, { d }]));
  for (const r of LUNCH_RECOMMENDATIONS.filter(matches)) {
    const key = r.noodles ? `${r.dishId}:noodles` : r.dishId || r.id;
    if (!entries.has(key)) entries.set(key, { d: r, recommendation: true });
  }
  return [...entries.values()];
}
function renderSearchResults() {
  observer?.disconnect();
  const hasQuery = Boolean(search.trim());
  $("#filters").hidden = !hasQuery;
  $("#clearSearch").hidden = !$("#searchInput").value.trim();
  $("#clearSearch").disabled = $("#clearSearch").hidden;
  if (!hasQuery) {
    // Before typing: a few popular searches, like delivery apps, instead of a blank page.
    const terms = (language === "zh" ? ["韭菜虾仁", "云吞", "煎饺", "面", "卤肉", "茶"] : ["Shrimp", "Wonton", "Potstickers", "Noodles", "Braised", "Tea"])
      .filter(t => MENU.some(d => d.active !== false && `${d.cn} ${d.name}`.toLowerCase().includes(t.toLowerCase())));
    $("#menuList").innerHTML = `<section class="search-hot"><h3>${tr("热门搜索", "Popular searches")}</h3><div>${terms.map(t => `<button type="button" data-search-term="${escapeHTML(t)}">${escapeHTML(t)}</button>`).join("")}</div></section>`;
    $("#searchSummary").hidden = true;
    $("#searchSummaryText").textContent = "";
    return;
  }
  const entries = searchEntries();
  const terms = search.trim().split(/\s+/).filter(Boolean).map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const marked = text => escapeHTML(text).replace(new RegExp(`(${terms.map(t => escapeHTML(t)).join("|")})`, "gi"), "<mark>$1</mark>");
  $("#menuList").innerHTML = `<section class="search-results" aria-label="${tr("搜索结果", "Search results")}">${entries.map(({d,recommendation}) => {
    const attribute = recommendation ? `data-recommendation="${d.id}"` : `data-dish="${d.id}"`;
    const label = name(recommendation ? d : sizeCard(d));
    // Plain dishes add straight from the row; dishes with options open their choices.
    const plus = recommendation ? attribute : d.styles || d.sizeGroup ? `data-dish="${d.id}"` : `data-add="${d.id}"`;
    return `<article class="search-result"><button class="search-result-open" ${attribute}><img src="${photo(d,"s",recommendation ? undefined : d.styles?.[0])}" alt="" loading="lazy"><span><strong>${marked(label)}</strong><small>${recommendation ? LunchMenu.recommendationPriceLabel(d) : LunchMenu.menuPrice(d)}</small></span></button><button class="dish-add search-add" ${plus} aria-label="${escapeHTML(tr("加一份 ", "Add ") + label)}">+</button></article>`;
  }).join("") || `<div class="empty-state"><h3>${bi("没有找到菜品", "No matching dishes")}</h3></div>`}</section>`;
  $("#searchSummary").hidden = !hasQuery;
  if (!hasQuery) { $("#searchSummaryText").textContent = ""; return; }
  const conditions = [search ? `“${search}”` : "", filter === "veg" ? tr("素食", "Vegetarian") : ""].filter(Boolean);
  conditions.push(tr(`${entries.length} 道菜`, `${entries.length} dishes`));
  setBilingual($("#searchSummaryText"), conditions.join(" · "));
  $("#clearSearch").disabled = !$("#searchInput").value;
}
function renderMenu() {
  if (!$("#searchPanel").hidden || search || filter !== "all") { renderSearchResults(); return; }
  const browsing = !search && filter === "all";
  $("#menuList").innerHTML =
    categories
      .map((c, ci) => {
        if (c === "lunchsets") return LunchMenu.lunchSetSection();
        if (c === "recommended") return LunchMenu.recommendationSection();
        const candidates = MENU.filter((d) => d.section === c && matches(d));
        // Sizes of one dish share a single card; the size is chosen in its detail.
        const items = candidates.filter(LunchMenu.visible).filter((d, i, all) => !d.sizeGroup || all.findIndex(x => x.sizeGroup?.[0] === d.sizeGroup[0]) === i);
        if (!candidates.length) return "";
        return `<section class="menu-section ${phoneRail.matches || ["noodles", "rice", "soup"].includes(c) ? "chapter-mains" : ["sides", "cold", "fried", "veg", "tangzi", "dessert"].includes(c) ? "chapter-small" : ""}" id="section-${c}" data-section="${c}"><div class="section-heading"><h2>${bilingualText(categoryName(c))}</h2><span class="translation">${categoryOther(c)}</span></div>${c === "dumplings" ? LunchMenu.section() : ""}<div class="dish-grid"${c === "dumplings" ? " hidden" : ""}>${items
          .map((d, i) => {
            const feature = browsing && c === "signature" && i === 0;
            const shown = sizeCard(d), count = groupQty(d);
            return `<article class="dish-card ${feature ? "featured" : ""} ${photo(d,"s") ? "" : "text-dish"} ${d.soldOut ? "sold" : ""}"><button class="dish-open" data-dish="${d.id}" aria-label="${escapeHTML(name(shown))}"><div class="dish-image">${photo(d,"s") ? `<img src="${photo(d, "s")}" alt="" ${feature ? 'fetchpriority="high"' : 'loading="lazy"'}>` : `<span class="dish-placeholder">${icon(c === "dumplings" ? "dumpling" : "plate")}</span>`}${d.recommended ? `<span class="dish-pick" role="img" aria-label="${tr("推荐", "Our pick")}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10v11H3V10h4Zm2 11V10l4.2-7.4a1.9 1.9 0 0 1 3.5 1.3L15.8 8H20a2 2 0 0 1 2 2.3l-1.3 8.6A2.5 2.5 0 0 1 18.2 21H9Z"/></svg></span>` : ""}</div><div class="dish-info"><span class="dish-number">${feature ? bi("招牌", "Signature") : String(i + 1).padStart(2, "0")}</span><h3 class="dish-name">${dishNameHTML(shown)}</h3><span class="dish-english">${otherName(shown)}</span>${description(d) && (feature || ["noodles", "rice", "soup"].includes(c)) ? `<p class="dish-flavor">${descriptionHTML(d)}</p>` : ""}<span class="dish-price">${d.soldOut ? bi("售罄", "Sold out") : `${promoTag(d)}${listPrice(d)}${d.sizeGroup ? fromPrice(Math.min(...groupOf(d).map(x => x.price))) : LunchMenu.menuPrice(d)}`}</span><span class="dish-table-count" data-table-count="${d.id}" ${count ? "" : "hidden"}>${bi(`本桌已有 ${count} 份`, `${count} already selected`)}</span></div></button>${cardStepper(d, `<button class="dish-add" data-add="${d.id}" aria-label="${escapeHTML(tr("加一份", "Add") + " " + name(shown))}" ${d.soldOut ? "disabled" : ""}>${d.soldOut ? "—" : "+"}</button>`)}${globalThis.RewardsUI?.dishBadge(d)||''}</article>`;
          })
          .join("")}</div></section>`;
      })
      .join("") ||
    `<div class="empty-state">${icon("search")}<h3>${bi("没有找到菜品", "No matching dishes")}</h3><p>${bi("试试另一种食材，或清除筛选。", "Try another ingredient or clear your filters.")}</p><button class="secondary" data-action="reset-search">${bi("查看全部菜品", "See all dishes")}</button></div>`;
  observer?.disconnect();
  observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0] && !jumpTarget) setActive(visible[0].target.dataset.section);
    },
    // Phones have only the 60px header above the menu; other layouts also have the category bar.
    { rootMargin: phoneRail.matches ? "-72px 0px -55% 0px" : "-145px 0px -55% 0px", threshold: 0 },
  );
  $$(".menu-section").forEach((s) => observer.observe(s));
  $("#searchSummary").hidden = true;
  $("#searchSummaryText").textContent = "";
  $("#clearSearch").disabled = !$("#searchInput").value;
}
function renderChrome() {
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";

  const previewNotice = $("#previewNotice");
  if (production) previewNotice?.remove();
  else if (previewNotice) setBilingual(previewNotice, tr(
    "本地体验版 · 下单与呼叫不会发送到真实厨房",
    "LOCAL PREVIEW · Orders and staff calls do not reach a real kitchen",
  ));
  setBilingual($("#experienceTitle"), tr(
    "揭笼，上桌。",
    "Lift the lid. Gather round.",
  ));
  setBilingual($("#experienceCopy"), tr(
    "转动一桌好菜 · 进入 3D",
    "A new perspective · Explore in 3D",
  ));
  $("#tableButton").innerHTML =
    table ? `<span lang="en">Table</span><b>${escapeHTML(table)}</b>` : `<span>${tr("选择桌号", "Set table")}</span>`;
  $("#tableButton").classList.toggle("needs-table", !table);
  $("#tableButton").ariaLabel = table ? tr(`桌号 ${table}，查看同桌与拼桌`, `Table ${table}, view table and groups`) : tr("选择桌号", "Set your table number");
  $("#tableButton").setAttribute("aria-haspopup", "dialog");
  $("#tableButton").setAttribute("aria-controls", "sheet");
  $("#connectionButton").innerHTML =
    `<span class="status-dot ${store.status}"></span>${bilingualText(statusCopy())}${table && group !== "A" ? " · " + group : ""}`;
  $("#planButton").innerHTML =
    `<span lang="en">Suggestions</span>`;
  $("#planButton").ariaLabel = tr("推荐搭配", "Suggested dishes");
  $("#categoryButton").innerHTML = icon("grid");
  $("#categoryButton").ariaLabel = tr("全部分类", "All categories");
  $("#searchButton").innerHTML = icon("search");
  $("#searchButton").ariaLabel = tr("搜索菜品", "Search dishes");
  $("#searchButton").setAttribute("aria-controls", "searchPanel");
  $("#searchButton").setAttribute("aria-expanded", String(!$("#searchPanel").hidden));
  $("#searchInput").setAttribute("aria-label", tr("搜索菜名、食材", "Search dishes or ingredients"));
  $("#clearSearch").ariaLabel = tr("清除搜索文字", "Clear search text");
  $("#clearSearch").innerHTML = icon("close");
  $("#cancelSearch").textContent = tr("取消", "Cancel");
  setBilingual($("#resetSearchFilters"), tr("清除", "Clear"));
  $("#resetSearchFilters").ariaLabel = tr("清除搜索和筛选", "Clear search and filters");
  $("#searchIcon").innerHTML = icon("search");
  $("#searchInput").placeholder = tr(
    "搜索菜名、食材",
    "Search dishes or ingredients",
  );
  setBilingual($("#footerCopy"), tr(
    "Dumpling Lab",
    "Dumpling Lab",
  ));
  setBilingual($("#footerTopLabel"), tr("再看看菜单", "Back to the menu"));
  setBilingual($("#footerFarewell"), tr("好好吃饭，下次见。", "Eat well. See you soon."));
  $("#footerNavigation").ariaLabel = tr("门店与菜单", "Visit and menu");
  $("#footerStorefront").alt = tr("Dumpling Lab 红色门店", "The red Dumpling Lab shopfront");
  renderNavigation();
  renderFilters();
  Fulfilment.chrome();
  Fulfilment.refreshTicket();
}
function renderTray() {
  const remoteOrder = Fulfilment.remote();
  const viewOrder = remoteOrder ? tr('查看订单', 'View order') : tr('查看本桌点单', 'View our table');
  const items = store.items,
    n = count();
  const pictures = [...new Set(items.map((i) => i.id))];
  const visible = pictures;
  const rack = $("#trayPictures");
  const signature = JSON.stringify([visible, items.map(i=>i.style), language, Fulfilment.mode()]);
  if (rack.dataset.signature !== signature) {
    const existing = new Map(
      [...rack.querySelectorAll("[data-id]")].map((img) => [img.dataset.id, img]),
    );
    const next = document.createDocumentFragment();
    for (const id of visible) {
      const img = existing.get(id) || document.createElement(dish(id)?.img ? "img" : "span");
      if (!existing.has(id)) {
        if (dish(id)?.img) img.src = photo(dish(id), "s", items.find(i=>i.id===id)?.style, true);
        else img.textContent = name(dish(id));
        img.dataset.id = id;
        img.className = "just-added";
        img.addEventListener(
          "animationend",
          () => img.classList.remove("just-added"),
          { once: true },
        );
      }
      if (dish(id)?.img) img.src = photo(dish(id), "s", items.find(i=>i.id===id)?.style, true);
      img.setAttribute("role", "listitem");
      img.setAttribute("aria-label", name(dish(id)));
      img.title = name(dish(id));
      if (dish(id)?.img) img.alt = name(dish(id));
      next.append(img);
    }
    rack.replaceChildren(next);
    rack.hidden = !pictures.length;
    rack.setAttribute("aria-label", remoteOrder
      ? tr("已选菜品，可横向滚动", "Selected dishes. Scroll horizontally")
      : tr("本桌已选菜品，可横向滚动", "Selected table dishes. Scroll horizontally"));
    rack.dataset.signature = signature;
  }
  updateText($("#trayLabel"), n
    ? tr(`已选 ${n} 份`, `${n} portions`)
    : store.orders.length
      ? (remoteOrder ? tr("已下单", "Order placed") : tr("本桌已下单", "Order placed"))
      : tr("尚未选菜", "No dishes selected"));
  setBilingual($("#trayCaption"),remoteOrder ? Fulfilment.label() : statusCopy());
  updateText($("#trayTotal"), n ? cartMoney(items) : "");
  $("#trayTotal").hidden = !n;
  setBilingual($("#trayActionLabel"), remoteOrder ? viewOrder : n ? tr("查看 / 修改 ›", "View / edit ›") : tr("查看本桌", "View table"));
  $("#tray").ariaLabel =
    `${viewOrder}, ${$("#trayLabel").textContent}${n ? ", " + cartMoney(items) : ""}`;
  $("#connectionButton").innerHTML =
    `<span class="status-dot ${store.status}"></span>${bilingualText(statusCopy())}${table && group !== "A" ? " · " + group : ""}`;
  $$(".dish-stepper[data-stepper-dish]").forEach((s) => {
    const d = dish(s.dataset.stepperDish);
    if (d.soldOut) return;
    const n = cardLines(d, s.dataset.stepperPrep || null).reduce((t, i) => t + i.qty, 0);
    s.classList.toggle("has-qty", n > 0);
    s.querySelector(".dish-minus").hidden = !n;
    const shown = s.querySelector(".dish-count");
    shown.hidden = !n;
    updateText(shown, n || "");
  });
  $("#desktopTicket").innerHTML =
    `<div class="ticket-title"><h3>${remoteOrder ? escapeHTML(Fulfilment.label()) : bi("本桌点单", "Our table")}</h3>${remoteOrder ? '' : `<span class="ticket-table">${escapeHTML(table || "—")}</span>`}</div>${
      items.length
        ? items
            .slice(0, 5)
            .map(
              (i) =>
                `<div class="ticket-line"><span>${name(dish(i.id))}${i.style ? " · " + styleName(i.style) : ""} × ${i.qty}</span><span>${foodMoney(itemPrice(dish(i.id), i.style) * i.qty)}</span></div>`,
            )
            .join("") +
          (items.length > 5
            ? `<p class="fineprint">+ ${items.length - 5} ${bi("道菜", "more dishes")}</p>`
            : "")
        : `<div class="ticket-empty">${icon("plate")}<p>${bi("尚未选菜", "No dishes selected")}</p><small>${bi("点击 + 添加菜品", "Tap + to add a dish")}</small></div>`
    }<div class="ticket-summary"><span>${Fulfilment.mode() === 'delivery' ? bi("预估总额", "Estimated total") : Fulfilment.mode() === 'dinein' ? bi("合计（含 10% 服务费）", "Total incl. 10% service") : bi("菜品小计", "Subtotal")}</span><strong>${cartMoney(items)}</strong></div><button class="primary" data-action="cart">${bilingualText(viewOrder)} ↗</button><p class="ticket-foot">${bilingualText(statusCopy())}</p>`;
}
// An unfinished payment locks the cart. Editing offers to cancel it instead of
// leaving the guest stuck; the edit is applied once the cart is unlocked.
const paymentLock = e => ['PAYMENT_PENDING', 'OWN_PAYMENT'].includes(e?.code) || /本组正在付款|同桌正在支付本单/.test(e?.message || '');
function unlockThen(retry) { CheckoutUI.unlock().then(ok => { if (ok) retry(); }); }
function changeCart(change) {
  try {
    store.mutate(change);
  } catch (err) {
    if (paymentLock(err)) unlockThen(() => { try { store.mutate(change); } catch (e) { toast(errorText(e)); } });
    else toast(errorText(err));
  }
}
function add(d, style = null, amount = 1, note = null) {
  if (d.soldOut) return false;
  if (qty(d.id) + amount > 20) {
    toast(tr("单道菜最多选择 20 份", "Up to 20 portions per dish"));
    return false;
  }
  const sourceImage =
    modal === "dish"
      ? $(".detail-image img")
      : document.querySelector(`[data-dish="${d.id}"] img`);
  const origin = sourceImage && globalThis.TableMotion?.rect(sourceImage);
  try {
    store.mutate({ kind: "delta", dishId: d.id, style, delta: amount, ...(note ? { note } : {}) });
  } catch (e) {
    if (paymentLock(e)) unlockThen(() => add(d, style, amount, note));
    else toast(errorText(e));
    return false;
  }
  requestAnimationFrame(() => {
    // Send desktop feedback to the visible order summary, never the hidden
    // mobile tray's zero-sized rectangle. Order data and mobile flow stay shared.
    const desktopTarget = $("#desktopTicket .ticket-summary");
    const target = desktopTarget?.getClientRects().length ? desktopTarget :
      [...document.querySelectorAll("#trayPictures img")].find(
        (img) => img.dataset.id === d.id,
      ) || $("#trayPictures");
    globalThis.TableMotion?.fly(photo(d, "s", style, true), origin, target);
  });
  toast(tr('已加入', 'Added'), { kind:'added', announcement:tr(`：${name(d)}，${amount} 份`, `: ${name(d)}, ${amount} ${amount === 1 ? 'portion' : 'portions'}`) });
  return true;
}
function openDish(d, selectedStyle = null, lockedPrep = null, builder = false) {
  if (d.variants && !selectedStyle && !LunchMenu.readyFor(d)) {
    LunchMenu.start();
    renderMenu();
    jump("dumplings");
    toast(tr("请先选做法，再选馅儿。", "Choose preparation before your filling."));
    return;
  }
  lockedPrep ||= LunchMenu.chosenPreparation(d);
  if (lockedPrep && !selectedStyle) selectedStyle = LunchMenu.firstStyle(d);
  detail = d;
  detailPreset = lockedPrep;
  detailBuilder = builder;
  detailQty = 1;
  detailStyle = d.styles?.includes(selectedStyle) ? selectedStyle : LunchMenu.firstStyle(d);
  openModal("dish", categoryName(combinationPresentation(d, detailStyle) ? "noodles" : d.section));
  renderDetail();
}
function detailIsHot(d, style) {
  return d.section === "noodles" || style === "soup" || d.variants?.[style]?.prep === "soup" || d.id === "lunch-v2-fishball-soup";
}
// Options such as which soft drink; the chosen name becomes the order line's style.
function optionChoice(d) {
  const label = d.choiceOptions.label || { cn: "选项", en: "Option" };
  const offered = d.choiceOptions.items.filter(o => o.active);
  return `<fieldset class="lunch-options lunch-options-choice"><legend>${bi(label.cn, label.en)}</legend><div class="styles">${offered.map(o => o.soldOut || !d.styles.includes(o.cn) ? `<button class="chip" disabled aria-disabled="true">${bi(`${o.cn} · 已售罄`, `${o.en} · Sold out`)}</button>` : `<button class="chip ${o.cn === detailStyle ? "active" : ""}" data-style="${escapeHTML(o.cn)}" aria-pressed="${o.cn === detailStyle}">${bi(`${o.cn} · ${foodMoney(lunchPrice(d, o.cn))}`, `${o.en} · ${foodMoney(lunchPrice(d, o.cn))}`)}</button>`).join("")}</div></fieldset>`;
}
function sizeChoice(d) {
  return `<fieldset class="lunch-options lunch-options-pieces"><legend class="sr-only">${bi("选份量", "Size")}</legend><div>${groupOf(d).map(x => `<button class="chip ${x.id === d.id ? "active" : ""}" data-size-dish="${x.id}" aria-pressed="${x.id === d.id}" ${x.soldOut ? "disabled" : ""}>${bi(`${x.sizeLabel.cn} · ${foodMoney(x.price)}`, `${x.sizeLabel.en} · ${foodMoney(x.price)}`)}</button>`).join("")}</div></fieldset>`;
}
function renderDetail() {
  $(".detail-image")?.stopPlateMotion?.();
  const d = presentedDish(detail, detailStyle);
  $("#sheetBody").innerHTML =
    `${d.img||d.imageUrl||Object.values(d.preparationImageUrls||{}).some(Boolean) ? `<div class="detail-image" data-heat="${detailIsHot(d, detailStyle) ? 'hot' : 'none'}"><img draggable="false" src="${detailBuilder ? LunchMenu.fillingPhoto(d) : detailPhoto(d, detailStyle)}" alt="${escapeHTML(name(d))}"><span class="detail-steam" aria-hidden="true"><i></i><i></i><i></i></span></div>` : ""}<div class="sheet-content"><div class="detail-top"><div class="detail-title"><h1 id="sheetTitle">${detailBuilder ? LunchMenu.builderTitle() : bi(d.cn,d.name)}</h1>${LunchMenu.preparationBadge(detail, detailStyle)}${promoTag(d)}</div><span class="detail-price">${listPrice(d)}<span class="detail-price-now">${foodMoney(itemPrice(d, detailStyle))}</span></span></div>${d.promo?.type === "bogo" ? `<p class="promo-note">${bi("同一道菜每点两份，较便宜的一份免费，口味可以混搭。", "Every second one is free, the cheaper of each pair. Flavours can mix.")}</p>` : ""}${LunchMenu.ingredients(detail, detailStyle)}${description(d) ? `<p class="detail-description">${descriptionHTML(d)}</p>` : ""}${d.variants ? LunchMenu.controls(d) : d.choiceOptions && d.styles ? optionChoice(d) : d.sizeGroup ? sizeChoice(d) : d.portion ? `<p class="detail-portion">${bi("每份", "Per portion")} · ${bi(d.portion, d.portion.replace("块"," piece").replace("个"," pieces"))}</p>` : ""}<p class="ingredient-advisory">${bi("如有食物过敏，请先告知店员。", "Please tell staff about any food allergies.")}</p></div><div class="dish-action"><div class="quantity" role="group" aria-label="${tr("份数", "Portions")}"><button data-detail-delta="-1" aria-label="${tr("减少份数", "Fewer portions")}" ${detailQty <= 1 ? "disabled" : ""}>−</button><b>${detailQty}</b><button data-detail-delta="1" aria-label="${tr("增加份数", "More portions")}" ${detailQty >= 20 ? "disabled" : ""}>+</button></div><button class="primary" data-action="add-detail" ${d.soldOut ? "disabled" : ""}>${d.soldOut ? bi("暂时售罄", "Sold out") : (Fulfilment.remote() ? bi("加入订单", "Add to order") : bi("加入本桌", "Add to our table"))}<strong>${addMoney(d, detailStyle, detailQty)}</strong></button></div>`;
  const image = $(".detail-image img");
  if (image) image.parentElement.append(document.createElement("dl-dish-serving"));
  if (image?.complete && image.naturalWidth) image.parentElement.classList.add("is-served");
}
function updateDetailSelection() {
  if ($("#detailPreparation")) $("#detailPreparation").outerHTML = LunchMenu.preparationBadge(detail, detailStyle);
  if ($("#detailIngredients")) {
    const previousKeys=$$("#detailIngredients [data-ingredient-key]").map(node=>node.dataset.ingredientKey);
    $("#detailIngredients").outerHTML = LunchMenu.ingredients(detail, detailStyle, previousKeys);
  }
  const image = $(".detail-image img");
  const presentation = presentedDish(detail, detailStyle);
  if (image && detail) {
    const nextPhoto = detailBuilder ? LunchMenu.fillingPhoto(detail) : detailPhoto(detail, detailStyle);
    if (image.getAttribute("src") !== nextPhoto) {
      image.parentElement.classList.remove("is-served");
      image.src = nextPhoto;
    }
    image.parentElement.dataset.heat = detailIsHot(presentation, detailStyle) ? "hot" : "none";
    image.alt = name(presentation);
  }
  if ($("#sheetTitle")) $("#sheetTitle").innerHTML = detailBuilder ? LunchMenu.builderTitle() : bi(presentation.cn,presentation.name);
  sheetNavigation.remember("dish");
  const quantity = $(".dish-action .quantity");
  if (!quantity) return;
  updateText(quantity.querySelector("b"), detailQty);
  quantity.querySelector('[data-detail-delta="-1"]').disabled = detailQty <= 1;
  quantity.querySelector('[data-detail-delta="1"]').disabled = detailQty >= 20;
  updateText($('[data-action="add-detail"] strong'), addMoney(detail, detailStyle, detailQty));
  updateText($(".detail-price-now"), foodMoney(itemPrice(detail, detailStyle)));
  $$(".styles [data-style]").forEach((button) => {
    const selected = button.dataset.style === detailStyle;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}
function showCategories() {
  openModal("categories", "");
  const categoryPhoto = c => c === "recommended" ? LUNCH_RECOMMENDATIONS[0] : MENU.find(d => d.section === c && d.img);
  $("#sheetBody").innerHTML =
    `<div class="sheet-content category-directory"><h2 id="sheetTitle">${bi("菜品分类", "Categories")}</h2><div class="category-directory-list">${categories.map(c => `<button data-category="${c}" class="category-choice ${c === activeCategory ? "active" : ""}" aria-current="${c === activeCategory ? "true" : "false"}"><span class="category-directory-photo">${categoryPhoto(c) ? `<img src="${photo(categoryPhoto(c), "s")}" alt="" width="64" height="64">` : ""}</span><strong>${bilingualText(categoryName(c))}</strong><span class="category-current" aria-hidden="true"></span></button>`).join("")}</div><div class="category-directory-footer"><button data-action="paper">${bi("全部菜单", "Full menu")}</button><button data-action="planner">${bi("搭配建议", "Suggestions")}</button></div></div>`;
}
function disposeTableScene() {
  sceneSession = null;
  tableScene?.dispose();
  tableScene = null;
  sceneSignature = "";
}
function refreshTableScene() {
  if (modal !== "table3d") return;
  const ids = [...new Set(store.items.map((i) => i.id))];
  const images = ids.filter((id) => dish(id)?.img).slice(0, 6);
  const signature = JSON.stringify(images);
  if (tableScene && signature !== sceneSignature) {
    tableScene.setDishes(images.map((id) => ({ id, src: photo(dish(id)) })));
    sceneSignature = signature;
  }
  setBilingual($("#sceneCount"), count()
    ? tr(
        `这一桌，已选 ${count()} 份 · ${cartMoney(store.items)}`,
        `${count()} portions · ${cartMoney(store.items)}`,
      )
    : tr(
        "空桌不空心，选几道喜欢的。",
        "Make yourself at home. Pick a few favourites.",
      ));
  setBilingual($("#sceneDisclaimer"), tr(
    `3D 蒸笼为创意装置；菜品使用照片示意。${ids.length > images.length ? ` 桌面展示 ${images.length} 道，全部菜品见本桌点单。` : ""}`,
    `The steamer is a 3D illustration; menu dishes use photographs.${ids.length > images.length ? ` Showing ${images.length} dishes; view your cart for all items.` : ""}`,
  ));
  $("#sceneSelection").innerHTML = ids.length
    ? ids
        .map(
          (id) =>
            `<button data-dish="${id}">${name(dish(id))}<span>× ${qty(id)}</span></button>`,
        )
        .join("")
    : `<p>${bi("下方加菜，会摆到这张桌上。", "Add a dish below and watch your table fill up.")}</p>`;
}
async function showTableScene() {
  openModal("table3d", "DUMPLING LAB / AT THE TABLE");
  const session = Symbol("table-scene");
  sceneSession = session;
  sceneOpened = false;
  const picks = MENU.filter(
    (d) => d.section === "signature" && d.img && !d.soldOut,
  ).slice(0, 3);
  $("#sheetBody").innerHTML =
    `<div class="scene-intro"><div><p class="eyebrow">${bi("一笼热气，一桌人。", "A LITTLE STEAM. A LITTLE COMPANY.")}</p><h2 id="sheetTitle">${bi("揭笼，上桌。", "Lift the lid.")}</h2></div><span class="scene-seal" aria-hidden="true">饺</span></div>
    <div class="scene-stage" id="sceneStage"><p class="scene-loading" role="status">${bi("正在摆好这一桌…", "Setting your table…")}</p></div>
    <div class="scene-controls"><button id="sceneLeft" aria-label="${tr("向左转桌面", "Rotate left")}">↶</button><button id="sceneLid" class="scene-lid" disabled>${bi("揭开蒸笼", "Lift the lid")}</button><button id="sceneRight" aria-label="${tr("向右转桌面", "Rotate right")}">↷</button></div>
    <p class="scene-hint">${bi("左右拖动桌面 · 点桌上的菜看详情", "Drag to turn · Tap a dish for details")}</p>
    <div class="scene-views"><button data-scene-view="seat" aria-pressed="true">${bi("入座视角", "Take a seat")}</button><button data-scene-view="top" aria-pressed="false">${bi("俯看这一桌", "From above")}</button><button data-scene-view="close" aria-pressed="false">${bi("凑近看笼", "A closer look")}</button></div>
    <div class="scene-order"><h3 id="sceneCount"></h3><div class="scene-selection" id="sceneSelection"></div><div class="scene-picks">${picks.map((d) => `<div><button data-dish="${d.id}" class="scene-pick-photo"><img src="${photo(d)}" alt="${escapeHTML(name(d))}"></button><span>${name(d)}</span><button class="scene-pick-add" data-add="${d.id}" aria-label="${escapeHTML(tr("添加 ", "Add ") + name(d))}">+</button></div>`).join("")}</div><button class="primary" data-action="cart">${bi("查看本桌点单", "View our table")} ↗</button><p class="fineprint" id="sceneDisclaimer"></p></div>`;
  refreshTableScene();
  const host = $("#sceneStage");
  const unavailable = () => {
    if (sceneSession !== session) return;
    tableScene?.dispose();
    tableScene = null;
    host.innerHTML = `<div class="scene-fallback"><img src="${photo(picks[0])}" alt=""><p>${bi("当前设备暂不能显示 3D，仍可在下方正常选菜。", "3D is unavailable here. You can still order below.")}</p></div>`;
    $("#sceneLid").disabled = true;
    $$("[data-scene-view], #sceneLeft, #sceneRight").forEach(
      (b) => (b.disabled = true),
    );
  };
  try {
    const { mountTableScene } = await import("/table-scene.js");
    if (sceneSession !== session) return;
    tableScene = mountTableScene(host, {
      label: tr(
        "可转动的竹蒸笼与本桌菜品",
        "Interactive bamboo steamer and selected dishes",
      ),
      onDish: (id) => openDish(dish(id)),
      onError: unavailable,
    });
    host.querySelector(".scene-loading")?.remove();
    $("#sceneLid").disabled = false;
    $("#sceneLid").onclick = () => {
      sceneOpened = !sceneOpened;
      tableScene?.open(sceneOpened);
      setBilingual($("#sceneLid"), sceneOpened
        ? tr("轻轻合上", "Close the lid")
        : tr("揭开蒸笼", "Lift the lid"));
      $("#sceneLid").setAttribute("aria-pressed", String(sceneOpened));
    };
    $("#sceneLeft").onclick = () => tableScene?.turn(-0.4);
    $("#sceneRight").onclick = () => tableScene?.turn(0.4);
    $$("[data-scene-view]").forEach(
      (b) =>
        (b.onclick = () => {
          tableScene?.view(b.dataset.sceneView);
          $$("[data-scene-view]").forEach((other) =>
            other.setAttribute("aria-pressed", String(other === b)),
          );
        }),
    );
    refreshTableScene();
  } catch (error) {
    unavailable();
  }
}
function showPaper() {
  openModal("paper", "DUMPLING LAB / À LA CARTE");
  $("#sheetBody").innerHTML =
    `<div class="sheet-content paper-menu"><h2 id="sheetTitle">${bi("今日菜单", "The menu")}</h2><p class="sheet-intro">${table || "—"} · ${bi("手工现做", "Made to order")}</p>${categories
      .map(
        (c, i) =>
          `<div class="paper-heading"><small>${String(i + 1).padStart(2, "0")}</small><h3>${bilingualText(categoryName(c))}</h3><em>${categoryOther(c)}</em></div>${c === "lunchsets" ? (globalThis.LUNCH_SETS||[]).map(s=>`<button class="paper-row" data-lunch-set="${s.key}"><span>${s.name}</span><b>${bi("价格待定","Price pending")}</b></button>`).join("") : c === "recommended" ? LUNCH_RECOMMENDATIONS.map(r=>`<button class="paper-row" data-recommendation="${r.id}" ${r.pending ? "disabled" : ""}><span>${dishNameHTML(r)}<small>${otherName(r)}</small></span><i></i><b>${r.pending ? (r.soldOut ? bi("售罄", "Sold out") : bi("暂未开放", "Coming later")) : r.chooseFilling ? bi("选馅儿 ↗", "Choose filling ↗") : LunchMenu.recommendationPriceLabel(r)}</b></button>`).join("") : MENU.filter(
            (d) => d.section === c && d.active!==false,
          )
            .map(
              (d) =>
                `<button class="paper-row" data-dish="${d.id}"><span>${dishNameHTML(d)}<small>${otherName(d)}</small></span><i></i><b>${d.soldOut ? bi("售罄", "Sold out") : LunchMenu.menuPrice(d)}</b></button>`,
            )
            .join("")}`,
      )
      .join("")}</div>`;
}
function showCart(tab = "pending") {
  return SharedTable.open(tab);
}
function renderCart() {
  const before = globalThis.TableMotion?.capture($("#sheetBody"));
  return SharedTable.render(before);
}
async function prepareReview() {
  if (submitting) return;
  if (Fulfilment.remote()) return CheckoutUI.open();
  if (!table) {
    clearTimeout(noteTimer);
    const note = $("#cartNote");
    if (note && note.value !== store.note) store.mutate({ kind: "note", note: note.value });
    noteDraft = null;
    showTable(true);
    return;
  }
  return CheckoutUI.open();
}
async function submit() {
  return CheckoutUI.open();
}
function showTable(forReview = false) {
  openModal("table", table ? "DUMPLING LAB / TOGETHER" : "");
  if (!table) {
    $("#sheet").classList.add("table-entry-sheet");
    $("#sheetBody").innerHTML = `<div class="sheet-content form-content"><h2 id="sheetTitle">${bi("输入桌号", "Table number")}</h2><p id="tableEntryHint" class="form-hint">${bi("填写桌牌上的编号", "Enter the number on your table")}</p><form id="tableEntryForm" class="nickname-form" data-review="${forReview}"><label for="tableEntry" class="sr-only">${bi("桌号", "Table number")}</label><input id="tableEntry" name="table" maxlength="12" autocomplete="off" autocapitalize="characters" enterkeyhint="done" spellcheck="false" placeholder="${tr("例如 A1", "e.g. A1")}" aria-describedby="tableEntryHint tableEntryError"><p id="tableEntryError" class="field-error" role="alert"></p><button class="primary" type="submit">${bi(forReview ? "继续" : "确认", forReview ? "Continue" : "Confirm")}</button></form></div>`;
    // Let the guest read the form before opening the software keyboard.
    return;
  }
  $("#sheetBody").innerHTML =
    `<div class="sheet-content"><h2 id="sheetTitle">${bi("同桌与拼桌", "Table & groups")}</h2><p class="sheet-intro">${bi("桌号", "Table")} ${escapeHTML(table)} · ${bi("点餐组", "Group")} ${escapeHTML(group)}</p><div class="table-options sharing-options"><button class="sharing-option" data-action="share" aria-label="${tr("邀请同桌一起点餐", "Invite companions to share this order")}"><dl-sharing-motion mode="shared" aria-hidden="true"></dl-sharing-motion><strong>${bi("一起点", "Together")}</strong><small>${bi("共用一份订单", "One shared order")}</small></button><button class="sharing-option" data-action="separate" aria-label="${tr("创建独立点餐组", "Create a separate ordering group")}"><dl-sharing-motion mode="separate" aria-hidden="true"></dl-sharing-motion><strong>${bi("独立点", "Separately")}</strong><small>${bi("各自一份订单", "Your own order")}</small></button></div><p class="sharing-note">${bi("朋友、同事或拼桌，都可以各自下单。", "Friends, colleagues or people sharing a table can all order separately.")}</p>${store.status === "rejected" ? `<p class="drawer-note">${escapeHTML(store.lastError)}</p><button class="secondary" data-action="discard-rejected">${bi("撤回未同步操作，重新选菜", "Discard unsynced edits and retry")}</button>` : ""}</div>`;
}
document.addEventListener("submit", async (event) => {
  if (event.target.id !== "tableEntryForm") return;
  event.preventDefault();
  const form = event.target, input = $("#tableEntry"), error = $("#tableEntryError");
  const value = input.value.trim().toUpperCase();
  if (!/^[A-Z0-9-]{1,12}$/.test(value)) {
    setBilingual(error, tr("请填写桌牌上的桌号，例如 A1。", "Enter your table number, e.g. A1."));
    input.setAttribute("aria-invalid", "true");
    input.focus();
    return;
  }
  try {
    store.bindTable(value);
    table = store.table;
    const url = new URL(location.href);
    url.searchParams.set("table", table);
    history.replaceState(history.state, "", url.href);
    renderChrome();
    store.emit();
    showCart();
    if (form.dataset.review === "true") await prepareReview();
    else { await store.flush(); await store.poll(); }
  } catch (e) {
    if (error.isConnected) error.textContent = errorText(e);
    else toast(errorText(e));
  }
});
function buildSuggestions() {
  const eligible = MENU.filter(
    (d) =>
      !d.soldOut &&
      d.img &&
      !d.styles &&
      (preference !== "veg" || d.veg) &&
      (preference !== "mild" || !d.spice),
  );
  const pools = [
    ["signature", "diy"],
    ["noodles", "rice"],
    ["veg", "sides"],
    ["soup"],
    ["dessert"],
  ];
  const picked = [];
  for (const pool of pools) {
    const d = eligible.find(
      (d) => pool.includes(d.section) && !picked.includes(d),
    );
    if (d) picked.push(d);
    if (picked.length >= Math.min(5, people + 1)) break;
  }
  for (const d of eligible)
    if (picked.length < Math.min(5, people + 1) && !picked.includes(d))
      picked.push(d);
  suggestions = picked;
  selectedSuggestions = new Set(picked.map((d) => d.id));
}
function showPlanner() {
  buildSuggestions();
  openModal("planner", "");
  renderPlanner();
}
function renderPlanner() {
  const portions = people <= 3 ? 1 : Math.ceil(people / 3);
  const amount = suggestions
    .filter((d) => selectedSuggestions.has(d.id))
    .reduce((s, d) => s + d.price * portions, 0);
  $("#sheetBody").innerHTML =
    `<div class="sheet-content"><h2 id="sheetTitle">${bi("推荐搭配", "Suggested dishes")}</h2><div class="planner-controls"><p>${bi("用餐人数", "Guests")}</p><div class="quantity"><button data-people="-1" aria-label="${tr("减少人数", "Fewer guests")}" ${people === 1 ? "disabled" : ""}>−</button><b>${people}</b><button data-people="1" aria-label="${tr("增加人数", "More guests")}" ${people === 10 ? "disabled" : ""}>+</button></div></div><div class="filters">${[
      ["all", tr("不限", "Any")],
      ["veg", tr("素食为主", "Vegetarian")],
    ]
      .map(
        ([key, label]) =>
          `<button data-preference="${key}" class="${preference === key ? "active" : ""}" aria-pressed="${preference === key}">${bilingualText(label)}</button>`,
      )
      .join(
        "",
      )}</div><div class="planner-list">${suggestions.map((d) => `<label class="planner-item"><img src="${photo(d)}" alt=""><span><strong>${dishNameHTML(d)}</strong><small lang="en">${escapeHTML(otherName(d))}</small><small>${bilingualText(categoryName(d.section))} · ${portions} ${bi("份", "portions")} · ${foodMoney(d.price * portions)}</small></span><input type="checkbox" data-suggestion="${d.id}" ${selectedSuggestions.has(d.id) ? "checked" : ""}></label>`).join("")}</div><p class="fineprint">${bi("搭配依据菜单分类与标注，不代表营养或过敏安全建议。食量不同，请按需调整。", "Based on menu categories and labels, not nutritional or allergy advice. Adjust to your appetite.")}</p><button class="primary" data-action="add-plan" ${!selectedSuggestions.size ? "disabled" : ""}>${bi("加入已选", "Add selected dishes")}<strong>${foodMoney(amount)}</strong></button></div>`;
}
function showService() {
  openModal("service", "");
  $("#sheetBody").innerHTML =
    `<div class="sheet-content"><h2 id="sheetTitle">${bi("呼叫服务员", "Call staff")}</h2><p class="sheet-intro">${table ? `${tr("送到", "For table")} ${table}` : bi("扫码入座后可呼叫服务员", "Scan your table code to call staff")}</p><div class="service-grid">${[
      ["water", "◒", tr("添水", "Water")],
      ["cutlery", "⋈", tr("添餐具", "Cutlery")],
      ["bill", "▤", tr("买单", "The bill")],
      ["help", "✳", tr("其他帮助", "Other help")],
    ]
      .map(
        ([key, symbol, label]) =>
          `<button data-service="${key}" ${!table ? "disabled" : ""}><span aria-hidden="true">${symbol}</span>${bilingualText(label)}</button>`,
      )
      .join(
        "",
      )}</div><p class="fineprint">${bi("选择后会通知店员。", "Tap a request to notify a staff member.")}</p></div>`;
}

document.addEventListener("click", async (e) => {
  const b = e.target.closest("button");
  if (!b || b.disabled) return;
  if (LunchMenu.handle(b)) return;
  if (b.hasAttribute("data-image-retry")) {
    const host = b.closest(".detail-image"), img = host?.querySelector("img");
    if (!img) return;
    b.disabled = true;
    setBilingual(b, tr("加载中…", "Loading…"));
    const url = new URL(img.src, location.href);
    url.searchParams.set("retry", String(Date.now()));
    img.src = url.href;
    return;
  }
  if (b.dataset.category) {
    jump(b.dataset.category);
    return;
  }
  if (b.dataset.sizeDish) {
    detail = dish(b.dataset.sizeDish);
    detailStyle = null;
    renderDetail();
    $(`[data-size-dish="${detail.id}"]`)?.focus({ preventScroll: true });
    return;
  }
  if (b.dataset.dish) {
    const origin =
      b.querySelector("img") &&
      globalThis.TableMotion?.rect(b.querySelector("img"));
    const selectedDish = dish(b.dataset.dish);
    openDish(selectedDish, b.closest(".search-result") ? selectedDish.styles?.[0] : null);
    const image = $(".detail-image img");
    if (origin && image) {
      image.dataset.motionKey = "opened-dish";
      globalThis.TableMotion?.reconcile(
        $("#sheetBody"),
        new Map([["opened-dish", origin]]),
        420,
      );
    }
    return;
  }
  if (b.dataset.searchTerm) {
    $("#searchInput").value = b.dataset.searchTerm;
    search = b.dataset.searchTerm;
    $("#clearSearch").hidden = false; $("#clearSearch").disabled = false;
    renderMenu();
    return;
  }
  if (b.dataset.add) {
    const d = dish(b.dataset.add);
    if (d.styles || d.sizeGroup) openDish(d);
    else add(d);
    return;
  }
  if (b.dataset.filter) {
    filter = b.dataset.filter;
    renderFilters();
    renderMenu();
    $(`#filters [data-filter="${filter}"]`)?.focus({ preventScroll: true });
    return;
  }
  if (b.dataset.detailDelta) {
    detailQty = Math.max(
      1,
      Math.min(20, detailQty + Number(b.dataset.detailDelta)),
    );
    updateDetailSelection();
    return;
  }
  if (b.dataset.style && !b.dataset.cartDelta) {
    detailStyle = b.dataset.style;
    updateDetailSelection();
    return;
  }
  if (b.dataset.cartDelta || b.dataset.cartRemove) {
    changeCart({ kind: "delta", dishId: b.dataset.id, style: b.dataset.style || null, ...(b.dataset.note ? { note: b.dataset.note } : {}), delta: b.dataset.cartRemove ? -Number(b.dataset.cartRemove) : Number(b.dataset.cartDelta) });
    return;
  }
  if (b.dataset.cardMinus) {
    const lines = cardLines(dish(b.dataset.cardMinus), b.dataset.prep || null);
    if (lines.length === 1) changeCart({ kind: "delta", dishId: lines[0].id, style: lines[0].style || null, delta: -1 });
    else if (lines.length > 1) {
      showCart();
      toast(tr("这道菜点了几种做法，请在这里选要减哪一份", "Several versions are selected. Choose which to remove here."));
    }
    return;
  }
  if (b.dataset.cartTab) {
    cartTab = b.dataset.cartTab;
    renderCart();
    return;
  }
  if (b.dataset.people) {
    people = Math.max(1, Math.min(10, people + Number(b.dataset.people)));
    buildSuggestions();
    renderPlanner();
    return;
  }
  if (b.dataset.preference) {
    preference = b.dataset.preference;
    buildSuggestions();
    renderPlanner();
    return;
  }
  if (b.dataset.service) {
    b.disabled = true;
    try {
      await store.api("/api/call", {
        requestId: crypto.randomUUID(),
        table,
        group,
        reason: I18N.ui.zh.reasons[b.dataset.service],
      });
      closeModal();
      toast(production ? tr("呼叫已提交", "Request sent") : tr("本地体验已记录呼叫 · 未通知真实店员", "Request saved locally · No staff notified"));
    } catch (err) {
      toast(
        tr("暂时未通知成功，请重试。", "Could not notify staff. Please retry."),
      );
      b.disabled = false;
    }
    return;
  }
  switch (b.dataset.action) {
    case "close":
      closeModal();
      break;
    case "cart":
      showCart();
      break;
    case "ordered":
      showCart("ordered");
      break;
    case "table":
      showTable();
      break;
    case "paper":
      showPaper();
      break;
    case "planner":
      showPlanner();
      break;
    case "add-detail":
      if (add(detail, detailStyle, detailQty, detailBuilder ? $("[data-builder-note]")?.value.trim() || null : null)) closeModal();
      break;
    case "review":
      await prepareReview();
      break;
    case "submit":
      await submit();
      break;
    case "reset-search":
      clearTimeout(searchTimer);
      searchComposing = false;
      search = "";
      filter = "all";
      $("#searchInput").value = "";
      renderFilters();
      renderMenu();
      if (!$("#searchPanel").hidden) $("#searchInput").focus({ preventScroll: true });
      else $("#searchButton").focus({ preventScroll: true });
      break;
    case "add-plan": {
      if (store.order) {
        toast(
          tr("请先确认上一笔订单", "Please confirm your previous order first"),
        );
        break;
      }
      const amount = people <= 3 ? 1 : Math.ceil(people / 3);
      let added = 0;
      for (const id of selectedSuggestions) {
        if (add(dish(id), null, amount)) added++;
      }
      if (added) {
        closeModal();
        toast(
          tr(
            `${added} 道菜已加入，份数可以在本桌点单中调整。`,
            `${added} dishes added. Adjust portions in your order.`,
          ),
        );
      }
      break;
    }
    case "share": {
      try {
        const url = new URL(location.href);
        url.hash = "menu";
        if (navigator.share)
          await navigator.share({
            title: "Dumpling Lab",
            text: tr("来一起点菜", "Let’s order together"),
            url: url.href,
          });
        else {
          await navigator.clipboard.writeText(url.href);
          toast(tr("同组链接已复制", "Group link copied"));
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          const url = new URL(location.href); url.hash = "menu";
          $(".share-link-fallback")?.remove();
          const label = document.createElement("label");
          label.className = "share-link-fallback";
          label.innerHTML = `${bi("复制链接", "Copy link")}<input readonly aria-label="${tr("同组点餐链接", "Shared order link")}" value="${escapeHTML(url.href)}">`;
          $("#sheetBody .sheet-content")?.append(label);
          label.querySelector("input").select();
          toast(tr("长按链接复制，发给同桌", "Copy this link and send it to your companions"));
        }
      }
      break;
    }
    case "separate": {
      const url = new URL(location.href);
      url.searchParams.set(
        "group",
        "P" + crypto.randomUUID().slice(0, 5).toUpperCase(),
      );
      url.hash = "menu";
      location.assign(url);
      break;
    }
    case "discard-rejected":
      store.pending = [];
      store.status = "connecting";
      store.emit();
      store.poll();
      closeModal();
      break;
  }
});
// Keep food names and ordering usable when a photograph fails to load.
function restoreFoodPhoto(img) {
  const host = img.closest(".detail-image, .dish-image, .cart-photo");
  if (!host) return;
  const hadFocus = host.querySelector("[data-image-retry]") === document.activeElement;
  host.classList.remove("image-unavailable");
  host.querySelector(".image-fallback")?.remove();
  if (host.classList.contains("detail-image")) {
    host.classList.add("is-served");
    for (const attr of ["role", "tabindex", "aria-label", "aria-valuemin", "aria-valuemax", "aria-valuenow", "aria-orientation"]) host.removeAttribute(attr);
    if (hadFocus) $("#closeSheet").focus({ preventScroll: true });
  }
}
document.addEventListener("error", (e) => {
  const img = e.target;
  if (img.tagName !== "IMG") return;
  const host = img.closest(".detail-image, .dish-image, .cart-photo");
  if (!host) return;
  host.classList.add("image-unavailable");
  let fallback = host.querySelector(".image-fallback");
  if (!fallback) {
    fallback = document.createElement("span");
    fallback.className = "image-fallback";
    host.append(fallback);
  }
  const isDetail = host.classList.contains("detail-image");
  fallback.innerHTML = `${icon("plate")}<small>${bi("图片暂未加载", "Photo unavailable")}</small>${isDetail ? `<button data-image-retry>${bi("重试", "Retry")}</button>` : ""}`;
  if (isDetail) {
    host.setAttribute("role", "group");
    host.removeAttribute("tabindex");
    for (const attr of ["aria-valuemin", "aria-valuemax", "aria-valuenow", "aria-orientation"]) host.removeAttribute(attr);
    host.setAttribute("aria-label", tr("菜品图片加载失败", "Dish photo failed to load"));
  }
}, true);
document.addEventListener("load", (e) => {
  if (e.target.tagName === "IMG") restoreFoodPhoto(e.target);
}, true);
document.addEventListener("input", (e) => {
  if (e.target.id === "cartNote") {
    const value = e.target.value;
    noteDraft = value;
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => {
      noteDraft = null;
      try {
        store.mutate({ kind: "note", note: value });
      } catch (err) {
        toast(errorText(err));
      }
    }, 450);
  }
});
document.addEventListener("change", (e) => {
  if (e.target.dataset.suggestion) {
    if (e.target.checked) selectedSuggestions.add(e.target.dataset.suggestion);
    else selectedSuggestions.delete(e.target.dataset.suggestion);
    const amount = suggestions
      .filter((d) => selectedSuggestions.has(d.id))
      .reduce(
        (s, d) => s + d.price * (people <= 3 ? 1 : Math.ceil(people / 3)),
        0,
      );
    $('[data-action="add-plan"]').disabled = !selectedSuggestions.size;
    $('[data-action="add-plan"] strong').textContent = foodMoney(amount);
  }
});
$("#categoryButton").onclick = showCategories;
$("#tableExperience").onclick = showTableScene;
// The entire visible tray opens the order, including the photo strip and padding.
// A horizontal swipe is still a scroll, never an accidental order opening.
const traySurface = $(".table-tray");
let trayGesture = null;
const openTray = () => showCart(count() ? "pending" : store.orders.length ? "ordered" : "pending");
traySurface.addEventListener("pointerdown", (event) => {
  trayGesture = { id: event.pointerId, x: event.clientX, y: event.clientY, scroll: $("#trayPictures").scrollLeft, moved: false };
}, { passive: true });
const trackTrayGesture = (event) => {
  if (!trayGesture || event.pointerId !== trayGesture.id) return;
  if (Math.hypot(event.clientX - trayGesture.x, event.clientY - trayGesture.y) > 8) trayGesture.moved = true;
};
traySurface.addEventListener("pointermove", trackTrayGesture, { passive: true });
traySurface.addEventListener("pointerup", trackTrayGesture, { passive: true });
traySurface.addEventListener("pointercancel", () => {
  if (trayGesture) trayGesture.moved = true;
}, { passive: true });
traySurface.addEventListener("click", (event) => {
  const dragged = trayGesture && (trayGesture.moved || Math.abs($("#trayPictures").scrollLeft - trayGesture.scroll) > 8);
  trayGesture = null;
  if (dragged && event.detail !== 0) return;
  openTray();
});
$("#trayPictures").addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  trayGesture = null;
  openTray();
});
$("#tableButton").onclick = () => showTable();
$("#connectionButton").onclick = () => showTable();
$("#planButton").onclick = showPlanner;
$("#searchButton").onclick = () => {
  if (!$("#searchPanel").hidden) { cancelSearch(); return; }
  lockPageScroll();
  $("#searchPanel").hidden = false;
  document.body.classList.add("search-open");
  $("#searchButton").setAttribute("aria-expanded", "true");
  renderMenu();
  $("#main").scrollTop = 0;
  $("#searchInput").focus({ preventScroll: true });
};
// Reuse one search button (and its state/handlers) across both layouts.
// Reparent only at the breakpoint, including when resizing an open page.
const desktopSearchLayout = matchMedia("(min-width: 1151px)");
function placeSearchControl() {
  const button = $("#searchButton");
  const parent = desktopSearchLayout.matches || phoneRail.matches ? $(".header-actions") : $(".menu-toolbar");
  if (button.parentElement === parent) return;
  const focused = document.activeElement === button;
  // Phones keep it as an icon beside the language switch, so the category rail starts at the first category.
  if (phoneRail.matches) parent.append(button);
  else if (desktopSearchLayout.matches) parent.prepend(button);
  else parent.append(button);
  if (focused) button.focus({ preventScroll: true });
}
desktopSearchLayout.addEventListener("change", placeSearchControl);
phoneRail.addEventListener("change", () => { placeSearchControl(); renderMenu(); });
placeSearchControl();
// Desktop footer closes the complete workspace; mobile keeps its illustrated
// ending inside the menu. Move the original node so links and artwork survive.
function placeOrderFooter() {
  const footer = $("#brandFooter");
  const desktop = desktopSearchLayout.matches;
  const parent = desktop ? document.body : $("#main");
  if (footer.parentElement === parent) return;
  const focused = footer.contains(document.activeElement) ? document.activeElement : null;
  if (desktop) $(".workspace").after(footer);
  else parent.append(footer);
  focused?.focus({ preventScroll: true });
}
desktopSearchLayout.addEventListener("change", placeOrderFooter);
placeOrderFooter();
function cancelSearch() {
  clearTimeout(searchTimer);
  searchComposing = false;
  search = "";
  filter = "all";
  $("#searchInput").value = "";
  $("#searchInput").blur();
  $("#searchPanel").hidden = true;
  document.body.classList.remove("search-open");
  $("#searchButton").setAttribute("aria-expanded", "false");
  renderFilters(); renderMenu();
  unlockPageScroll();
  $("#searchButton").focus({ preventScroll: true });
}
$("#cancelSearch").onclick = cancelSearch;
let searchTimer, searchComposing = false;
function scheduleSearch() {
  clearTimeout(searchTimer);
  if (searchComposing) return;
  searchTimer = setTimeout(() => {
    search = $("#searchInput").value.trim();
    renderMenu();
  }, 170);
}
$("#searchInput").oninput = (e) => {
  $("#clearSearch").hidden = !e.target.value.trim();
  $("#clearSearch").disabled = $("#clearSearch").hidden;
  if (!e.target.value.trim()) {
    clearTimeout(searchTimer);
    search = "";
    renderMenu();
    return;
  }
  if (e.isComposing || searchComposing) return;
  scheduleSearch();
};
$("#searchInput").addEventListener("compositionstart", () => { searchComposing = true; clearTimeout(searchTimer); });
$("#searchInput").addEventListener("compositionend", () => { searchComposing = false; scheduleSearch(); });
$("#searchInput").addEventListener("keydown", (e) => {
  if (e.isComposing || searchComposing) return;
  if (e.key === "Enter") {
    e.preventDefault(); clearTimeout(searchTimer);
    search = $("#searchInput").value.trim(); renderMenu();
    $("#searchInput").blur();
    return;
  }
  if (e.key !== "Escape") return;
  e.preventDefault();
  cancelSearch();
});
$("#clearSearch").onclick = () => {
  clearTimeout(searchTimer);
  searchComposing = false;
  search = "";
  $("#searchInput").value = "";
  renderMenu();
  $("#searchInput").focus();
};
function onCartChange() {
  renderTray();
  SharedTable.observe();
  refreshTableScene();
  if (modal === "cart" && document.activeElement?.id !== "cartNote")
    renderCart();
  Fulfilment.chrome();
  Fulfilment.refreshTicket();
}
store.addEventListener("change", onCartChange);
window.addEventListener('catalog-updated',()=>{
  const nextCategories = SECTIONS.filter(id => id === 'recommended' || (id === 'lunchsets' && (globalThis.LUNCH_SETS||[]).some(s=>s.visible!==false)) || MENU.some(d => d.section === id && d.active !== false));
  if (nextCategories.join('|') !== categories.join('|')) {
    categories = nextCategories;
    if (!categories.includes(activeCategory)) activeCategory = categories[0];
    renderNavigation();
    if (modal === 'categories') showCategories();
  }
  renderMenu();renderTray();
});
renderChrome();
renderMenu();
renderTray();
SharedTable.init();
store.start();
Fulfilment.init();
if (!modal && location.hash === "#index") showPaper();
if (!modal && (location.hash === "#table3d" || location.hash === "#cart")) showCart();

// Dish photos come from different sources (built-in renders, staff uploads, square
// and wide canvases), so the same bowl can look large or small on its card. Measure
// where the food actually sits in each picture and scale it to fill the card's image
// box evenly. Measured once per picture; the result is cached.
const dishFit = new Map();
const decodedDishes = new WeakSet();
function measureDish(img) {
  const size = 96, ratio = img.naturalWidth / img.naturalHeight, w = ratio >= 1 ? size : Math.max(1, Math.round(size * ratio)), h = ratio >= 1 ? Math.max(1, Math.round(size / ratio)) : size;
  const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
  const context = canvas.getContext("2d", { willReadFrequently: true }); if (!context) return null;
  context.drawImage(img, 0, 0, w, h);
  let data; try { data = context.getImageData(0, 0, w, h).data; } catch { return null; }
  const at = (x, y) => (y * w + x) * 4, corners = [at(0, 0), at(w - 1, 0), at(0, h - 1), at(w - 1, h - 1)];
  const opaque = corners.every(i => data[i + 3] > 200), bg = [0, 1, 2].map(c => corners.reduce((n, i) => n + data[i + c], 0) / 4);
  // Reviewed ceramic foot; the cast shadow below it is not part of the bowl.
  const bodyBottom = /wonton-soup-noodles-cutout-appetite-v2\.webp/.test(img.currentSrc || img.src) ? .85 : null;
  let left = w, top = h, right = -1, bottom = -1, pixels = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = at(x, y);
    const food = opaque ? Math.abs(data[i] - bg[0]) + Math.abs(data[i + 1] - bg[1]) + Math.abs(data[i + 2] - bg[2]) > 24 : data[i + 3] > 16;
    if (food) { if (bodyBottom === null || (y + .5) / h <= bodyBottom) pixels++; if (x < left) left = x; if (x > right) right = x; if (y < top) top = y; if (y > bottom) bottom = y; }
  }
  // The reviewed studio image includes a cast shadow below the ceramic foot.
  // Align the bowl itself, rather than treating that shadow as its base.
  const baseline = bodyBottom ?? (bottom + 1) / h;
  return right < 0 ? null : { x: left / w, y: top / h, w: (right - left + 1) / w, h: (bottom - top + 1) / h, area: pixels / (w * h), baseline, ratio };
}
function fitDish(img) {
  if (!decodedDishes.has(img) || !img.complete || !img.naturalWidth || !img.isConnected) return;
  let box = dishFit.get(img.currentSrc || img.src);
  if (box === undefined) { box = measureDish(img); dishFit.set(img.currentSrc || img.src, box); }
  const frame = img.parentElement, style = getComputedStyle(img);
  const bw = parseFloat(style.width), bh = parseFloat(style.height);
  if (!box || !bw || !bh || !frame) return;
  const { width: fw, height: fh } = frame.getBoundingClientRect();
  if (!fw || !fh) return;
  // Size of the whole picture inside the element under object-fit: contain.
  const s = Math.min(bw / box.ratio, bh), pw = s * box.ratio, ph = s;
  const bowl = frame.closest('.menu-section')?.dataset.section !== 'drinks' && box.w * box.ratio / box.h >= 1.05;
  // Match the visible silhouette area, not only its width: a deeper bowl must
  // shrink relative to a shallow bowl. The century-egg bowl is the visual
  // reference (roughly .39 of frame width squared at its previous size).
  const k = Math.min(fw * .9 / (box.w * pw), fh * .97 / (box.h * ph),
    bowl ? Math.sqrt(fw * fw * .39 / (box.area * pw * ph)) : Infinity);
  const dx = (box.x + box.w / 2 - .5) * pw, dy = (box.y + box.h / 2 - .5) * ph;
  let ty = -dy * k;
  if (bowl) {
    ty = fh * .86 - fh / 2 - (box.baseline - .5) * ph * k;
    // Keep the entire photograph inside the frame, including its soft shadow.
    ty = Math.max(fh * .015 - fh / 2 - (box.y - .5) * ph * k,
      Math.min(ty, fh * .985 - fh / 2 - (box.y + box.h - .5) * ph * k));
  }
  img.style.scale = k.toFixed(5);
  img.style.translate = `${(-dx * k / bw * 100).toFixed(4)}% ${(ty / bh * 100).toFixed(4)}%`;
}
const dishFrames = new Set();
const dishResize = new ResizeObserver(entries => entries.forEach(({ target }) => {
  const img = target.querySelector(":scope > img");
  if (img) fitDish(img);
}));
function watchDishImages() {
  for (const frame of dishFrames) if (!frame.isConnected) {
    dishResize.unobserve(frame);
    dishFrames.delete(frame);
  }
  $$(".dish-image > img:not([data-fitted])").forEach(img => {
    img.dataset.fitted = "1";
    const ready = async () => {
      decodedDishes.delete(img);
      // WebKit can report complete before canvas can read the decoded pixels.
      try { await img.decode(); } catch { return; }
      decodedDishes.add(img);
      fitDish(img);
    };
    img.addEventListener("load", ready);
    dishFrames.add(img.parentElement);
    dishResize.observe(img.parentElement);
    if (img.complete) ready();
  });
}
new MutationObserver(watchDishImages).observe(document.body, { childList: true, subtree: true });
watchDishImages();
