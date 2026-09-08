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
// Show one language at a time; keep selection and ordering state independent.
let language = q.get("lang") === "en" ? "en" : q.get("lang") === "zh" ? "zh" : (() => {
  try { return localStorage.getItem("atelier-language") === "en" ? "en" : "zh"; } catch { return "zh"; }
})();
const tr = (zh, en) => String(language === "en" && en ? en : zh ?? "");
const errorText = error => OrderErrors.message(error, language);
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
const cartMoney = items => money(OrderPricing.quote(total(items), store.mode || "dinein").total);
const bi = (zh, en) => escapeHTML(tr(zh,en));
const bilingualText = text => escapeHTML(text);
const setBilingual = (node, text) => { if(node) node.innerHTML = bilingualText(text); };
const name = (d) => tr(d.cn,d.name),
  otherName = (d) => tr(d.name,d.cn);
const fromPrice = n => language === "en" ? `From ${foodMoney(n)}` : `${foodMoney(n)} 起`;
// Explicit word boundaries keep ingredients intact at narrow widths.
const dishNameParts = new Map([
  "韭菜 虾仁 猪肉", "芹菜 虾仁 猪肉", "白菜 猪肉", "鸡肉 玉米 云吞", "鲜肉 云吞",
  "肉末 辣椒 拌面", "陕西 油泼面", "销魂 皮蛋面", "肉末 红油 燃面", "卤肉饭", "鱼丸汤", "桂花 乌龙茶",
  "韭菜 虾仁 猪肉 煎饺", "鸡肉 包菜 煎饺", "红油 抄手", "清汤 鲜肉 云吞", "鲜虾 蟹籽 云吞面", "白灼 饺子",
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
const categoryName = (id) => tr(I18N.sections[id],SECTION_LABELS[id]);
const categoryOther = (id) => tr(SECTION_LABELS[id],I18N.sections[id]);
const dish = (id) => MENU.find((d) => d.id === id) || (globalThis.LEGACY_MENU || []).find(d => d.id === id) || { id, cn: "原菜单菜品", name: "Previous menu item", section: "sides", price: 0 };
const itemPrice = (d, style) => lunchPrice(d, style) ?? d.price;
const combinationPresentation = (d, style) => {
  const variant = d.variants?.[style];
  return variant?.noodles ? LUNCH_RECOMMENDATIONS.find(r => r.dishId === d.id && r.prep === variant.prep && r.noodles) : null;
};
const presentedDish = (d, style) => {
  const combination = combinationPresentation(d, style);
  return combination ? { ...d, cn: combination.cn, name: combination.name, img: combination.img } : d;
};
const photo = (d, size = "s", style = null) => {
  const preparation = d.variants?.[style]?.prep;
  const img = combinationPresentation(d, style)?.img || d.preparationImages?.[preparation] || (d.kind === "dumpling" && style ? LUNCH_PREPARATIONS.find(p=>p.id===preparation)?.img || d.img : d.img);
  return img ? `/img/${size}/${img.replace(/\.(png|jpe?g|webp)$/i, ".webp")}` : "";
};
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
const descriptionHTML = d => language === "zh" ? chineseCopyUnits(description(d)).map(word => `<span class="copy-word">${escapeHTML(word)}</span>`).join("<wbr>") : escapeHTML(description(d));
const spiceMarkup = d => `<span class="spice-value">${I18N.ui[language].spiceLevels[d.spice || 0]}<svg class="spice-brush" width="${34 + Math.min(3, d.spice || 0) * 12}" height="9" viewBox="0 0 104 12" preserveAspectRatio="none" aria-hidden="true" style="opacity:${d.spice ? .76 : .3}"><path d="M2 7C14 3 22 6 34 4S58 7 70 4S91 5 102 3L100 7C85 10 77 7 65 9S42 7 31 9S12 11 3 9Z" fill="currentColor"/></svg></span>`;
const updateText = (node, value) => {
  if (!node) return;
  if (typeof value === "string" && value.includes("\n")) { setBilingual(node,value); return; }
  if (globalThis.OrderFeedback) globalThis.OrderFeedback.text(node, value);
  else node.textContent = value;
};
const styleEnglish = s => [...MENU, ...(globalThis.LEGACY_MENU || [])].find(d => d.variants?.[s])?.variants[s].en || STYLE_LABELS[s] || s;
const styleName = s => tr(s,styleEnglish(s));
const styleHTML = s => bi(s,styleEnglish(s));
const categories = SECTIONS.filter((id) => id === "recommended" || MENU.some((d) => d.section === id));
const icons = {
  close: '<path d="m4 4 16 16M20 4 4 20"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
  bell: '<path d="M5 17h14M7 17v-6a5 5 0 0 1 10 0v6M10 21h4M12 3v3"/>',
  plate:
    '<ellipse cx="12" cy="13" rx="9" ry="6"/><ellipse cx="12" cy="12" rx="5" ry="3"/>',
  dumpling:
    '<path d="M2.8 14.5C4.1 9.2 7.6 6.3 12 6.3s7.9 2.9 9.2 8.2C17 19 7 19 2.8 14.5Z"/><path d="m6.1 9.5 1.6 2.6M9.8 6.7l.6 3.5m3.8-3.5-.6 3.5m4.3-.7-1.6 2.6"/>',
};
const icon = (key) =>
  `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${icons[key]}</svg>`;
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
const total = (items) =>
  Math.round(items.reduce((s, i) => s + (i.price ?? itemPrice(dish(i.id), i.style) ?? 0) * i.qty, 0) * 100) / 100;
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
let removedDish = null;
function undoMatchesCart() {
  return removedDish?.owner === store && removedDish.scope === store.key;
}
function discardUndo() {
  removedDish = null;
  if ($('#toast').dataset.kind === 'undo') {
    clearTimeout(toast.timer);
    $('#toast').hidden = true;
    $('#toast').replaceChildren();
  }
}
function offerUndo(item) {
  removedDish = { id: item.id, style: item.style || null, owner:store, scope:store.key };
  clearTimeout(toast.timer);
  const surface = $("#sheet").open ? $("#sheet") : document.body;
  surface.append($("#toast"));
  $("#toast").dataset.kind = 'undo';
  $("#toast").innerHTML = `<span>${escapeHTML(tr("已移除 ", "Removed ") + name(dish(item.id)))}</span><button data-action="undo-remove">${bi("撤销", "Undo")}</button>`;
  $("#toast").hidden = false;
  toast.timer = setTimeout(() => { $("#toast").hidden = true; removedDish = null; }, 8000);
}
// A dialog owns one native history entry. Back closes it before leaving the menu.
// The cart's detail view returns to the cart and retains an entry for a second Back.
const sheetNavigation = (() => {
  const history = globalThis.history;
  const token = crypto.randomUUID();
  let restoring = false, waitingForClose = false, lastPanel = null, afterClose = null;
  const ownsEntry = () => history?.state?.atelierSheet === token;
  function remember(type) {
    lastPanel = { type, dishId: detail?.id, style: detailStyle, preset: detailPreset, tab: cartTab };
    if (!history?.pushState || restoring || waitingForClose) return;
    const state = { ...history.state, atelierSheet: token };
    if (ownsEntry()) history.replaceState(state, "");
    else history.pushState(state, "");
  }
  function closed(action = null) {
    if (!ownsEntry() || restoring) { action?.(); return; }
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
function openModal(type, eyebrow) {
  $(".detail-image")?.stopPlateMotion?.();
  sheetNavigation.remember(type);
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
  const editing = document.activeElement?.matches?.('input:not([type="checkbox"]):not([type="radio"]):not([readonly]), textarea, [contenteditable=true]');
  const obscured = viewport.scale < 1.1 && window.innerHeight - viewport.height > 100;
  // Keep the keyboard layout through pointer-down → blur → click. Moving the
  // sheet on blur can put the pressed button elsewhere before the tap completes.
  root.classList.toggle("keyboard-open", Boolean(obscured && (editing || root.classList.contains("keyboard-open"))));
  if (root.classList.contains("keyboard-open") && $("#sheet").contains(document.activeElement)) {
    requestAnimationFrame(() => {
      const input = document.activeElement;
      if (!input?.matches?.("input, textarea")) return;
      const scroller = input.closest(".cart-scroll") || $("#sheet");
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
  )
    closeModal();
});

function renderNavigation() {
  $("#sideCategories").innerHTML = categories
    .map(
      (c, i) =>
        `<button class="side-category ${c === activeCategory ? "active" : ""}" data-category="${c}"><small>${String(i + 1).padStart(2, "0")}</small>${escapeHTML(categoryName(c))}</button>`,
    )
    .join("");
  $("#categoryScroll").innerHTML = categories
    .map(
      (c) =>
        `<button class="category-item ${c === activeCategory ? "active" : ""}" data-category="${c}" ${c === activeCategory ? 'aria-current="true"' : ""}>${escapeHTML(categoryName(c))}</button>`,
    )
    .join("");
}
function setActive(c) {
  if (activeCategory === c) return;
  activeCategory = c;
  $$("[data-category]").forEach((b) => {
    b.classList.toggle("active", b.dataset.category === c);
    b.setAttribute("aria-current", String(b.dataset.category === c));
  });
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
  setActive('recommended');
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
    $("#menuList").innerHTML = "";
    $("#searchSummary").hidden = true;
    $("#searchSummaryText").textContent = "";
    return;
  }
  const entries = searchEntries();
  $("#menuList").innerHTML = `<section class="search-results" aria-label="${tr("搜索结果", "Search results")}">${entries.map(({d,recommendation}) => {
    const attribute = recommendation ? `data-recommendation="${d.id}"` : `data-dish="${d.id}"`;
    return `<article class="search-result"><button class="search-result-open" ${attribute}><img src="${photo(d,"s",recommendation ? undefined : d.styles?.[0])}" alt="" loading="lazy"><span><strong>${dishNameHTML(d)}</strong><small>${recommendation ? fromPrice(LunchMenu.recommendationPrice(d)) : d.variants ? fromPrice(d.price) : foodMoney(d.price)}</small></span><span class="search-result-arrow" aria-hidden="true">›</span></button></article>`;
  }).join("") || `<div class="empty-state"><h3>${bi("没有找到菜品", "No matching dishes")}</h3></div>`}</section>`;
  $("#searchSummary").hidden = false;
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
        if (c === "recommended") return LunchMenu.recommendationSection();
        const candidates = MENU.filter((d) => d.section === c && matches(d));
        const items = candidates.filter(LunchMenu.visible);
        if (!candidates.length) return "";
        return `<section class="menu-section ${["noodles", "rice", "soup"].includes(c) ? "chapter-mains" : ["sides", "fried", "veg", "tangzi", "dessert"].includes(c) ? "chapter-small" : ""}" id="section-${c}" data-section="${c}"><div class="section-heading"><h2>${categoryName(c)}</h2><span class="translation">${categoryOther(c)}</span></div>${c === "dumplings" ? LunchMenu.section() : ""}<div class="dish-grid">${items
          .map((d, i) => {
            const feature = browsing && c === "signature" && i === 0;
            return `<article class="dish-card ${feature ? "featured" : ""} ${d.img ? "" : "text-dish"} ${d.soldOut ? "sold" : ""}"><button class="dish-open" data-dish="${d.id}" aria-label="${escapeHTML(name(d))}"><div class="dish-image">${d.img ? `<img src="${photo(d, "s", LunchMenu.firstStyle(d))}" alt="" ${feature ? 'fetchpriority="high"' : 'loading="lazy"'}>` : `<span class="dish-placeholder">${icon(c === "dumplings" ? "dumpling" : "plate")}</span>`}</div><div class="dish-info"><span class="dish-number">${feature ? bi("招牌", "Signature") : String(i + 1).padStart(2, "0")}</span><h3 class="dish-name">${dishNameHTML(d)}</h3><span class="dish-english">${otherName(d)}</span>${description(d) && (feature || ["noodles", "rice", "soup"].includes(c)) ? `<p class="dish-flavor">${descriptionHTML(d)}</p>` : ""}<span class="dish-price">${LunchMenu.menuPrice(d)}</span><span class="dish-table-count" data-table-count="${d.id}" ${qty(d.id) ? "" : "hidden"}>${bi(`本桌已有 ${qty(d.id)} 份`, `${qty(d.id)} already selected`)}</span></div></button><button class="dish-add ${qty(d.id) ? "selected" : ""}" data-add="${d.id}" aria-label="${escapeHTML(tr("加一份", "Add") + " " + name(d))}" ${d.soldOut ? "disabled" : ""}>${d.soldOut ? bi("售罄", "Sold") : qty(d.id) || "+"}</button></article>`;
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
      if (visible[0]) setActive(visible[0].target.dataset.section);
    },
    { rootMargin: "-145px 0px -55% 0px", threshold: 0 },
  );
  $$(".menu-section").forEach((s) => observer.observe(s));
  $("#searchSummary").hidden = true;
  $("#searchSummaryText").textContent = "";
  $("#clearSearch").disabled = !$("#searchInput").value;
}
function renderChrome() {
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  $("#languageButton").textContent = tr("EN", "中文");
  $("#languageButton").ariaLabel = tr("Switch to English", "切换为中文");
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
  $("#serviceButton").innerHTML = icon("bell");
  $("#serviceButton").ariaLabel = tr("呼叫服务员", "Call staff");
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
  renderNavigation();
  renderFilters();
  Fulfilment.chrome();
  Fulfilment.refreshTicket();
}
function renderTray() {
  if (removedDish && !undoMatchesCart()) discardUndo();
  const remoteOrder = Fulfilment.remote();
  const viewOrder = remoteOrder ? tr('查看订单', 'View order') : tr('查看本桌点单', 'View our table');
  const removedCount = (store.remote.unavailableItems || []).length + (store.retiredPending || []).length
    + store.remote.items.filter(i => !isLunchItem(i.id, i.style)).length;
  const notice = $("#menuChangeNotice");
  if (notice) {
    notice.hidden = !removedCount;
    setBilingual(notice, tr("部分已选菜品已更新，请重新选择。", "Some selected dishes have changed. Please choose again."));
  }
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
        if (dish(id)?.img) img.src = photo(dish(id), "s", items.find(i=>i.id===id)?.style);
        else img.textContent = name(dish(id));
        img.dataset.id = id;
        img.className = "just-added";
        img.addEventListener(
          "animationend",
          () => img.classList.remove("just-added"),
          { once: true },
        );
      }
      if (dish(id)?.img) img.src = photo(dish(id), "s", items.find(i=>i.id===id)?.style);
      img.setAttribute("role", "listitem");
      img.setAttribute("aria-label", name(dish(id)));
      img.title = name(dish(id));
      if (dish(id)?.img) img.alt = name(dish(id));
      next.append(img);
    }
    rack.replaceChildren(next);
    rack.hidden = !pictures.length;
    rack.setAttribute("aria-label", remoteOrder
      ? tr("已选菜品，可横向滚动，按回车查看订单", "Selected dishes. Scroll horizontally or press Enter to view order")
      : tr("已选菜品，可横向滚动，按回车查看本桌", "Selected dishes. Scroll horizontally or press Enter to view table"));
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
  setBilingual($("#trayActionLabel"), remoteOrder ? viewOrder : tr("查看本桌", "View table"));
  $("#tray").ariaLabel =
    `${viewOrder}, ${$("#trayLabel").textContent}${n ? ", " + cartMoney(items) : ""}`;
  $("#connectionButton").innerHTML =
    `<span class="status-dot ${store.status}"></span>${bilingualText(statusCopy())}${table && group !== "A" ? " · " + group : ""}`;
  $$("[data-add]").forEach((b) => {
    const d = dish(b.dataset.add);
    if (!d?.soldOut) {
      updateText(b, qty(d.id) || "+");
      b.classList.toggle("selected", qty(d.id) > 0);
    }
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
    }<div class="ticket-summary"><span>${Fulfilment.mode() === 'delivery' ? bi("预估总额", "Estimated total") : bi("菜品小计", "Subtotal")}</span><strong>${cartMoney(items)}</strong></div><button class="primary" data-action="cart">${escapeHTML(viewOrder)} ↗</button><p class="ticket-foot">${bilingualText(statusCopy())}</p>`;
}
function add(d, style = null, amount = 1) {
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
    store.mutate({ kind: "delta", dishId: d.id, style, delta: amount });
  } catch (e) {
    toast(errorText(e));
    return false;
  }
  requestAnimationFrame(() => {
    const target =
      [...document.querySelectorAll("#trayPictures img")].find(
        (img) => img.dataset.id === d.id,
      ) || $("#trayPictures");
    globalThis.TableMotion?.fly(photo(d, "s", style), origin, target);
  });
  toast(tr('已加入', 'Added'), { kind:'added', announcement:tr(`：${name(d)}，${amount} 份`, `: ${name(d)}, ${amount} ${amount === 1 ? 'portion' : 'portions'}`) });
  return true;
}
function openDish(d, selectedStyle = null, lockedPrep = null) {
  if (d.variants && !selectedStyle && !LunchMenu.readyFor(d)) {
    LunchMenu.start();
    renderMenu();
    jump("dumplings");
    toast(tr("请先选做法，再选馅儿。", "Choose preparation before your filling."));
    return;
  }
  detail = d;
  detailPreset = lockedPrep;
  detailQty = 1;
  detailStyle = d.styles?.includes(selectedStyle) ? selectedStyle : LunchMenu.firstStyle(d);
  openModal("dish", categoryName(combinationPresentation(d, detailStyle) ? "noodles" : d.section));
  renderDetail();
}
function renderDetail() {
  $(".detail-image")?.stopPlateMotion?.();
  const d = presentedDish(detail, detailStyle);
  $("#sheetBody").innerHTML =
    `${d.img ? `<div class="detail-image"><img draggable="false" src="${photo(d, "l", detailStyle)}" alt="${escapeHTML(name(d))}"></div>` : ""}<div class="sheet-content"><div class="detail-top"><div class="detail-title"><h1 id="sheetTitle">${dishNameHTML(d)}</h1>${LunchMenu.preparationBadge(detail, detailStyle)}</div><span class="detail-price">${foodMoney(itemPrice(d, detailStyle))}</span></div>${LunchMenu.ingredients(detail, detailStyle)}${description(d) ? `<p class="detail-description">${descriptionHTML(d)}</p>` : ""}${d.variants ? LunchMenu.controls(d) : d.portion ? `<p class="detail-portion">${bi("每份", "Per portion")} · ${bi(d.portion, d.portion.replace("块"," piece").replace("个"," pieces"))}</p>` : ""}<p class="ingredient-advisory">${bi("如有食物过敏，请先告知店员。", "Please tell staff about any food allergies.")}</p></div><div class="dish-action"><div class="quantity" role="group" aria-label="${tr("份数", "Portions")}"><button data-detail-delta="-1" aria-label="${tr("减少份数", "Fewer portions")}" ${detailQty <= 1 ? "disabled" : ""}>−</button><b>${detailQty}</b><button data-detail-delta="1" aria-label="${tr("增加份数", "More portions")}" ${detailQty >= 20 ? "disabled" : ""}>+</button></div><button class="primary" data-action="add-detail" ${d.soldOut ? "disabled" : ""}>${d.soldOut ? bi("暂时售罄", "Sold out") : (Fulfilment.remote() ? bi("加入订单", "Add to order") : bi("加入本桌", "Add to our table"))}<strong>${foodMoney(itemPrice(d, detailStyle) * detailQty)}</strong></button></div>`;
}
function updateDetailSelection() {
  if ($("#detailPreparation")) $("#detailPreparation").outerHTML = LunchMenu.preparationBadge(detail, detailStyle);
  if ($("#detailIngredients")) {
    const previousKeys=$$("#detailIngredients [data-ingredient-key]").map(node=>node.dataset.ingredientKey);
    $("#detailIngredients").outerHTML = LunchMenu.ingredients(detail, detailStyle, previousKeys);
  }
  const image = $(".detail-image img");
  const presentation = presentedDish(detail, detailStyle);
  if (image && detail?.img) {
    const nextPhoto = photo(detail, "l", detailStyle);
    if (image.getAttribute("src") !== nextPhoto) image.src = nextPhoto;
    image.alt = name(presentation);
  }
  if ($("#sheetTitle")) $("#sheetTitle").innerHTML = dishNameHTML(presentation);
  sheetNavigation.remember("dish");
  const quantity = $(".dish-action .quantity");
  if (!quantity) return;
  updateText(quantity.querySelector("b"), detailQty);
  quantity.querySelector('[data-detail-delta="-1"]').disabled = detailQty <= 1;
  quantity.querySelector('[data-detail-delta="1"]').disabled = detailQty >= 20;
  updateText($('[data-action="add-detail"] strong'), foodMoney(itemPrice(detail, detailStyle) * detailQty));
  updateText($(".detail-price"), foodMoney(itemPrice(detail, detailStyle)));
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
    `<div class="sheet-content category-directory"><h2 id="sheetTitle">${bi("菜品分类", "Categories")}</h2><div class="category-directory-list">${categories.map(c => `<button data-category="${c}" class="category-choice ${c === activeCategory ? "active" : ""}" aria-current="${c === activeCategory ? "true" : "false"}"><span class="category-directory-photo">${categoryPhoto(c) ? `<img src="${photo(categoryPhoto(c), "s")}" alt="" width="64" height="64">` : ""}</span><strong>${escapeHTML(categoryName(c))}</strong><span class="category-current" aria-hidden="true"></span></button>`).join("")}</div><div class="category-directory-footer"><button data-action="paper">${bi("全部菜单", "Full menu")}</button><button data-action="planner">${bi("搭配建议", "Suggestions")}</button></div></div>`;
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
          `<div class="paper-heading"><small>${String(i + 1).padStart(2, "0")}</small><h3>${categoryName(c)}</h3><em>${categoryOther(c)}</em></div>${c === "recommended" ? LUNCH_RECOMMENDATIONS.map(r=>`<button class="paper-row" data-recommendation="${r.id}" ${r.pending ? "disabled" : ""}><span>${name(r)}<small>${otherName(r)}</small></span><i></i><b>${r.pending ? bi("暂未开放", "Coming later") : r.chooseFilling ? bi("选馅儿 ↗", "Choose filling ↗") : fromPrice(LunchMenu.recommendationPrice(r))}</b></button>`).join("") : MENU.filter(
            (d) => d.section === c,
          )
            .map(
              (d) =>
                `<button class="paper-row" data-dish="${d.id}"><span>${name(d)}<small>${otherName(d)}</small></span><i></i><b>${d.soldOut ? bi("售罄", "Sold") : (d.variants ? fromPrice(d.price) : foodMoney(d.price))}</b></button>`,
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
  if (Fulfilment.remote()) return Fulfilment.checkout();
  if (!table) {
    clearTimeout(noteTimer);
    const note = $("#cartNote");
    if (note && note.value !== store.note) store.mutate({ kind: "note", note: note.value });
    noteDraft = null;
    showTable(true);
    return;
  }
  submitting = true;
  try {
    clearTimeout(noteTimer);
    const note = $("#cartNote");
    noteDraft = null;
    if (note && note.value !== store.note)
      store.mutate({ kind: "note", note: note.value });
    await store.flush();
    await store.poll();
    if (store.noteConflict) throw new Error(tr("请先处理备注冲突", "Resolve the note conflict first"));
    if (store.order) {
      review = store.order;
    } else {
      if (!store.items.length) {
        renderCart();
        return;
      }
      if (store.status !== "synced")
        throw new Error(
          tr("请等待同步完成后下单。", "Wait for your table to reconnect."),
        );
      review = {
        items: structuredClone(store.items),
        note: store.note,
        cartOpIds: [...store.remote.opIds],
      };
    }
    openModal("review", "");
    SharedTable.review(review);
  } catch (e) {
    toast(errorText(e));
  } finally {
    submitting = false;
    SharedTable.updateReview();
    if (modal === "cart") renderCart();
  }
}
async function submit() {
  if (submitting) return;
  if (SharedTable.reviewChanged()) {
    SharedTable.updateReview();
    return;
  }
  submitting = true;
  const button = $('[data-action="submit"]');
  button.disabled = true;
  button.setAttribute("aria-busy", "true");
  button.dataset.orderState = "submitting";
  setBilingual(button, tr("正在提交点单…", "Submitting your order…"));
  try {
    lastOrder = await store.checkout(review);
    openModal("success", "DUMPLING LAB / ORDER RECEIVED");
    SharedTable.confirm(lastOrder);
  } catch (e) {
    toast(errorText(e));
    if (e.status === 409) {
      await store.poll();
      submitting = false;
      showCart(store.items.length ? "pending" : "ordered");
    } else {
      button.disabled = false;
      button.dataset.orderState = "error";
      setBilingual(button, tr("重试 / 确认订单", "Retry / confirm order"));
    }
  } finally {
    button.removeAttribute("aria-busy");
    if (button.dataset.orderState === "submitting") delete button.dataset.orderState;
    submitting = false;
    SharedTable.updateReview();
  }
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
    `<div class="sheet-content"><h2 id="sheetTitle">${bi("同桌与拼桌", "Table & groups")}</h2><p class="sheet-intro">${bi("桌号", "Table")} ${escapeHTML(table)} · ${bi("点餐组", "Group")} ${escapeHTML(group)}</p><div class="table-options sharing-options"><button class="sharing-option" data-action="share" aria-label="${tr("邀请同桌一起点餐", "Invite companions to share this order")}"><dl-sharing-motion mode="shared" aria-hidden="true"></dl-sharing-motion><strong>${bi("一起点", "Together")}</strong></button><button class="sharing-option" data-action="separate" aria-label="${tr("创建独立点餐组", "Create a separate ordering group")}"><dl-sharing-motion mode="separate" aria-hidden="true"></dl-sharing-motion><strong>${bi("独立点", "Separately")}</strong></button></div>${store.status === "rejected" ? `<p class="drawer-note">${escapeHTML(store.lastError)}</p><button class="secondary" data-action="discard-rejected">${bi("撤回未同步操作，重新选菜", "Discard unsynced edits and retry")}</button>` : ""}</div>`;
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
      )}</div><div class="planner-list">${suggestions.map((d) => `<label class="planner-item"><img src="${photo(d)}" alt=""><span><strong>${dishNameHTML(d)}</strong><small lang="en">${escapeHTML(otherName(d))}</small><small>${escapeHTML(categoryName(d.section))} · ${portions} ${bi("份", "portions")} · ${foodMoney(d.price * portions)}</small></span><input type="checkbox" data-suggestion="${d.id}" ${selectedSuggestions.has(d.id) ? "checked" : ""}></label>`).join("")}</div><p class="fineprint">${bi("搭配依据菜单分类与标注，不代表营养或过敏安全建议。食量不同，请按需调整。", "Based on menu categories and labels, not nutritional or allergy advice. Adjust to your appetite.")}</p><button class="primary" data-action="add-plan" ${!selectedSuggestions.size ? "disabled" : ""}>${bi("加入已选", "Add selected dishes")}<strong>${foodMoney(amount)}</strong></button></div>`;
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
  if (b.dataset.dish) {
    const origin =
      b.querySelector("img") &&
      globalThis.TableMotion?.rect(b.querySelector("img"));
    const selectedDish = dish(b.dataset.dish);
    openDish(selectedDish, b.classList.contains("search-result-open") ? selectedDish.styles?.[0] : null);
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
  if (b.dataset.add) {
    const d = dish(b.dataset.add);
    if (d.styles) openDish(d);
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
  if (b.dataset.cartDelta) {
    try {
      const removed = store.items.find((i) => i.id === b.dataset.id && (i.style || "") === (b.dataset.style || ""));
      store.mutate({
        kind: "delta",
        dishId: b.dataset.id,
        style: b.dataset.style || null,
        delta: Number(b.dataset.cartDelta),
      });
      if (Number(b.dataset.cartDelta) === -1 && removed?.qty === 1) offerUndo(removed);
    } catch (err) {
      toast(errorText(err));
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
    case "undo-remove": {
      if (!removedDish) break;
      if (!undoMatchesCart()) { discardUndo(); break; }
      if (store.order || submitting) {
        toast(tr("请先确认上一笔订单", "Check your pending order first"));
        break;
      }
      const item = removedDish;
      if (add(dish(item.id), item.style, 1)) {
        removedDish = null;
        toast(tr("已恢复 1 份", "Restored one portion"));
      }
      break;
    }
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
      if (add(detail, detailStyle, detailQty)) closeModal();
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
$("#serviceButton").onclick = showService;
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
$("#languageButton").onclick = () => {
  language = language === "zh" ? "en" : "zh";
  try { localStorage.setItem("atelier-language",language); } catch { /* Works without persistence. */ }
  renderChrome(); renderMenu(); renderTray();
};
renderChrome();
renderMenu();
renderTray();
SharedTable.init();
store.start();
Fulfilment.init();
if (!modal && location.hash === "#index") showPaper();
if (!modal && (location.hash === "#table3d" || location.hash === "#cart")) showCart();
