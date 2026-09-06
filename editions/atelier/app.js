"use strict";
const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
const q = new URLSearchParams(location.search);
const production = document.documentElement.dataset.environment === "production";
const table = /^[a-z0-9-]{1,12}$/i.test(q.get("table") || "")
  ? q.get("table").toUpperCase()
  : null;
const group = /^[a-z0-9-]{1,16}$/i.test(q.get("group") || "")
  ? q.get("group").toUpperCase()
  : "A";
let language =
  q.get("lang") === "en"
    ? "en"
    : (() => { try { return localStorage.getItem("atelier-language") || "zh"; } catch { return "zh"; } })();
const tr = (zh, en) => (language === "en" ? en : zh);
const escapeHTML = (text) =>
  String(text ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const money = (n) => `S$${Number(n).toFixed(2)}`;
const name = (d) => tr(d.cn, d.name),
  otherName = (d) => tr(d.name, d.cn);
// Explicit word boundaries keep ingredients intact at narrow widths.
const dishNameParts = new Map([
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
function dishNameHTML(d) {
  if (language !== "zh") return escapeHTML(name(d));
  const parts = dishNameParts.get(d.cn);
  return parts ? parts.map((part) => `<span class="dish-word">${escapeHTML(part)}</span>`).join("<wbr>") : escapeHTML(d.cn);
}
const categoryName = (id) => tr(I18N.sections[id], SECTION_LABELS[id]);
const categoryOther = (id) => tr(SECTION_LABELS[id], I18N.sections[id]);
const dish = (id) => MENU.find((d) => d.id === id);
const photo = (d, size = "s") =>
  d.img ? `/img/${size}/${d.img.replace(/\.(png|jpe?g|webp)$/i, ".webp")}` : "";
const description = (d) => tr(I18N.dishes[d.id]?.flavor || d.flavor, d.flavor);
const styleName = (s) => tr(s, STYLE_LABELS[s] || s);
const categories = SECTIONS.filter((id) => MENU.some((d) => d.section === id));
const icons = {
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
  bell: '<path d="M5 17h14M7 17v-6a5 5 0 0 1 10 0v6M10 21h4M12 3v3"/>',
  plate:
    '<ellipse cx="12" cy="13" rx="9" ry="6"/><ellipse cx="12" cy="12" rx="5" ry="3"/>',
  spark:
    '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/>',
};
const icon = (key) =>
  `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${icons[key]}</svg>`;
const store = new TableCart(table, group);
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
  items.reduce((s, i) => s + (dish(i.id)?.price || 0) * i.qty, 0);
const statusCopy = () =>
  !table
    ? tr("浏览菜单 · 扫桌码后下单", "Browse menu · scan a table to order")
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

function toast(text) {
  const surface = $("#sheet").open ? $("#sheet") : document.body;
  surface.append($("#toast"));
  $("#toast").textContent = text;
  $("#toast").hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => ($("#toast").hidden = true), 3200);
}
let removedDish = null;
function offerUndo(item) {
  removedDish = { id: item.id, style: item.style || null };
  clearTimeout(toast.timer);
  const surface = $("#sheet").open ? $("#sheet") : document.body;
  surface.append($("#toast"));
  $("#toast").innerHTML = `<span>${escapeHTML(tr("已移除 ", "Removed ") + name(dish(item.id)))}</span><button data-action="undo-remove">${tr("撤销", "Undo")}</button>`;
  $("#toast").hidden = false;
  toast.timer = setTimeout(() => { $("#toast").hidden = true; removedDish = null; }, 8000);
}
// A dialog owns one native history entry. Back closes it before leaving the menu.
// The cart's detail view returns to the cart and retains an entry for a second Back.
const sheetNavigation = (() => {
  const history = globalThis.history;
  const token = crypto.randomUUID();
  let restoring = false, waitingForClose = false, lastPanel = null;
  const ownsEntry = () => history?.state?.atelierSheet === token;
  function remember(type) {
    lastPanel = { type, dishId: detail?.id, tab: cartTab };
    if (!history?.pushState || restoring || waitingForClose) return;
    const state = { ...history.state, atelierSheet: token };
    if (ownsEntry()) history.replaceState(state, "");
    else history.pushState(state, "");
  }
  function closed() {
    if (!ownsEntry() || restoring) return;
    waitingForClose = true;
    history.back();
  }
  if (history?.pushState) addEventListener("popstate", () => {
    if (waitingForClose) {
      waitingForClose = false;
      if ($("#sheet").open) remember(modal);
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
        case "dish": if (dish(lastPanel.dishId)) openDish(dish(lastPanel.dishId)); break;
        case "categories": showCategories(); break;
        case "paper": showPaper(); break;
        case "planner": showPlanner(); break;
        case "service": showService(); break;
        case "table": showTable(); break;
        default: showCart(lastPanel.tab || "pending");
      }
    } finally { restoring = false; }
  });
  return { remember, closed };
})();
function openModal(type, eyebrow) {
  sheetNavigation.remember(type);
  disposeTableScene();
  if (!$("#sheet").open) lastFocus = document.activeElement;
  modal = type;
  $("#closeSheet").textContent = "×";
  $("#closeSheet").ariaLabel = tr("关闭", "Close");
  if (type !== "cart") document.body.classList.remove("viewing-table");
  $("#sheet").dataset.mode = type;
  $("#sheetEyebrow").textContent = eyebrow || "";
  $("#sheet").classList.toggle("plain-heading", !eyebrow);
  if (!$("#sheet").open) {
    $("#sheet").showModal();
    document.body.style.overflow = "hidden";
  }
  $("#sheet").scrollTop = 0;
}
function closeModal(options = {}) {
  if (SharedTable.returnFromDetail()) return;
  document.body.classList.remove("viewing-table");
  $("#sheet").removeAttribute("data-return-to");
  disposeTableScene();
  $("#sheet").close();
  modal = null;
  delete $("#sheet").dataset.mode;
  review = null;
  document.body.style.overflow = "";
  if (lastFocus?.isConnected) lastFocus.focus({ preventScroll: true });
  if (!options.fromHistory) sheetNavigation.closed();
}
$("#closeSheet").onclick = closeModal;
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
        `<button class="side-category ${c === activeCategory ? "active" : ""}" data-category="${c}"><small>${String(i + 1).padStart(2, "0")}</small>${categoryName(c)}</button>`,
    )
    .join("");
  $("#categoryScroll").innerHTML = categories
    .map(
      (c) =>
        `<button class="category-item ${c === activeCategory ? "active" : ""}" data-category="${c}" ${c === activeCategory ? 'aria-current="true"' : ""}>${categoryName(c)}</button>`,
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
function renderFilters() {
  $("#filters").innerHTML = [
    ["all", tr("全部", "All")],
    ["veg", tr("素食", "Vegetarian")],
    ["mild", tr("不辣", "Not spicy")],
    ["noPork", tr("不含猪肉", "No pork")],
  ]
    .map(
      ([id, label]) =>
        `<button data-filter="${id}" class="${filter === id ? "active" : ""}" aria-pressed="${filter === id}">${label}</button>`,
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
function renderMenu() {
  const browsing = !search && filter === "all";
  $("#menuList").innerHTML =
    categories
      .map((c, ci) => {
        const items = MENU.filter((d) => d.section === c && matches(d));
        if (!items.length) return "";
        return `<section class="menu-section ${["noodles", "rice", "soup"].includes(c) ? "chapter-mains" : ["sides", "fried", "veg", "tangzi", "dessert"].includes(c) ? "chapter-small" : ""}" id="section-${c}" data-section="${c}"><div class="section-heading"><h2>${categoryName(c)}</h2><span class="translation">${categoryOther(c)}</span><span class="section-count">${tr(`${items.length} 道菜`, `${items.length} dishes`)}</span></div>${c === "diy" ? `<p class="chapter-note">${tr("选馅料，再选做法。", "Choose a filling and preparation.")}</p>` : ""}<div class="dish-grid">${items
          .map((d, i) => {
            const feature = browsing && c === "signature" && i === 0;
            return `<article class="dish-card ${feature ? "featured" : ""} ${d.img ? "" : "text-dish"} ${d.soldOut ? "sold" : ""}"><button class="dish-open" data-dish="${d.id}" aria-label="${escapeHTML(name(d))}"><div class="dish-image">${d.img ? `<img src="${photo(d)}" alt="" ${feature ? 'fetchpriority="high"' : 'loading="lazy"'}>` : `<span>${categoryName(c)}</span>`}</div><div class="dish-info"><span class="dish-number">${feature ? tr("招牌", "Signature") : String(i + 1).padStart(2, "0")}${d.placeholder ? " · " + tr("示意图", "ILLUSTRATION") : ""}</span><h3 class="dish-name">${dishNameHTML(d)}</h3><span class="dish-english">${otherName(d)}</span>${feature || ["noodles", "rice", "soup"].includes(c) ? `<p class="dish-flavor">${description(d)}</p>` : ""}<span class="dish-price">${money(d.price)}</span><span class="dish-table-count" data-table-count="${d.id}" ${qty(d.id) ? "" : "hidden"}>${tr(`本桌已有 ${qty(d.id)} 份`, `${qty(d.id)} already selected`)}</span></div></button><button class="dish-add ${qty(d.id) ? "selected" : ""}" data-add="${d.id}" aria-label="${escapeHTML(tr("加一份", "Add") + " " + name(d))}" ${d.soldOut ? "disabled" : ""}>${d.soldOut ? tr("售罄", "Sold") : qty(d.id) || "+"}</button></article>`;
          })
          .join("")}</div></section>`;
      })
      .join("") ||
    `<div class="empty-state">${icon("search")}<h3>${tr("没有找到菜品", "No matching dishes")}</h3><p>${tr("试试另一种食材，或清除筛选。", "Try another ingredient or clear your filters.")}</p><button class="secondary" data-action="reset-search">${tr("查看全部菜品", "See all dishes")}</button></div>`;
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
  const summary = $("#searchSummary");
  summary.hidden = browsing;
  const filterLabel = {
    all: "", veg: tr("素食", "Vegetarian"), mild: tr("不辣", "Not spicy"), noPork: tr("不含猪肉", "No pork"),
  }[filter];
  const conditions = [search ? `“${search}”` : "", filterLabel].filter(Boolean).join(" · ");
  const found = MENU.filter(matches).length;
  $("#searchSummaryText").textContent = browsing ? "" : `${conditions} · ${tr(`${found} 道菜`, `${found} dishes`)}`;
  $("#clearSearch").disabled = !$("#searchInput").value;
}
function renderChrome() {
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  $("#previewNotice").hidden = production;
  $("#previewNotice").textContent = tr(
    "本地体验版 · 下单与呼叫不会发送到真实厨房",
    "LOCAL PREVIEW · Orders and staff calls do not reach a real kitchen",
  );
  $("#languageButton").textContent = tr("EN", "中");
  $("#experienceTitle").textContent = tr(
    "揭笼，上桌。",
    "Lift the lid. Gather round.",
  );
  $("#experienceCopy").textContent = tr(
    "转动一桌好菜 · 进入 3D",
    "A new perspective · Explore in 3D",
  );
  $("#tableButton").innerHTML =
    `<span>${tr("本桌", "TABLE")}</span><b>${table || "—"}</b><span>⌄</span>`;
  $("#connectionButton").innerHTML =
    `<span class="status-dot ${store.status}"></span>${statusCopy()}${table && group !== "A" ? " · " + group : ""}`;
  $("#planButton").innerHTML =
    `${icon("spark")}${tr("推荐搭配", "Suggestions")}`;
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
  $("#resetSearchFilters").textContent = tr("清除", "Clear");
  $("#resetSearchFilters").ariaLabel = tr("清除搜索和筛选", "Clear search and filters");
  $("#searchIcon").innerHTML = icon("search");
  $("#searchInput").placeholder = tr(
    "搜索菜名、食材",
    "Search dishes or ingredients",
  );
  $("#footerCopy").textContent = tr(
    "Dumpling Lab",
    "Dumpling Lab",
  );
  renderNavigation();
  renderFilters();
}
function renderTray() {
  const items = store.items,
    n = count();
  const pictures = [...new Set(items.map((i) => i.id))];
  const visible = pictures;
  const rack = $("#trayPictures");
  const signature = JSON.stringify([visible, language]);
  if (rack.dataset.signature !== signature) {
    const existing = new Map(
      [...rack.querySelectorAll("[data-id]")].map((img) => [img.dataset.id, img]),
    );
    const next = document.createDocumentFragment();
    for (const id of visible) {
      const img = existing.get(id) || document.createElement(dish(id)?.img ? "img" : "span");
      if (!existing.has(id)) {
        if (dish(id)?.img) img.src = photo(dish(id));
        else img.textContent = name(dish(id));
        img.dataset.id = id;
        img.className = "just-added";
        img.addEventListener(
          "animationend",
          () => img.classList.remove("just-added"),
          { once: true },
        );
      }
      img.setAttribute("role", "listitem");
      img.setAttribute("aria-label", name(dish(id)));
      img.title = name(dish(id));
      if (dish(id)?.img) img.alt = name(dish(id));
      next.append(img);
    }
    rack.replaceChildren(next);
    rack.hidden = !pictures.length;
    rack.setAttribute("aria-label", tr("已选菜品，可横向滚动", "Selected dishes, scroll horizontally"));
    rack.dataset.signature = signature;
  }
  $("#trayLabel").textContent = n
    ? tr(`已选 ${n} 份`, `${n} portions`)
    : store.orders.length
      ? tr("本桌已下单", "Order placed")
      : tr("尚未选菜", "No dishes selected");
  $("#trayCaption").textContent = statusCopy();
  $("#trayTotal").textContent = n ? money(total(items)) : "";
  $("#trayTotal").hidden = !n;
  $("#trayActionLabel").textContent = tr("查看本桌", "View table");
  $("#tray").ariaLabel =
    `${tr("查看本桌点单", "View our table")}, ${$("#trayLabel").textContent}${n ? ", " + money(total(items)) : ""}`;
  $("#connectionButton").innerHTML =
    `<span class="status-dot ${store.status}"></span>${statusCopy()}${table && group !== "A" ? " · " + group : ""}`;
  $$("[data-add]").forEach((b) => {
    const d = dish(b.dataset.add);
    if (!d?.soldOut) {
      b.textContent = qty(d.id) || "+";
      b.classList.toggle("selected", qty(d.id) > 0);
    }
  });
  $("#desktopTicket").innerHTML =
    `<div class="ticket-title"><h3>${tr("本桌点单", "Our table")}</h3><span class="ticket-table">${table || "—"}</span></div>${
      items.length
        ? items
            .slice(0, 5)
            .map(
              (i) =>
                `<div class="ticket-line"><span>${name(dish(i.id))} × ${i.qty}</span><span>${money(dish(i.id).price * i.qty)}</span></div>`,
            )
            .join("") +
          (items.length > 5
            ? `<p class="fineprint">+ ${items.length - 5} ${tr("道菜", "more dishes")}</p>`
            : "")
        : `<div class="ticket-empty">${icon("plate")}<p>${tr("尚未选菜", "No dishes selected")}</p><small>${tr("点击 + 添加菜品", "Tap + to add a dish")}</small></div>`
    }<div class="ticket-summary"><span>${tr("菜品小计", "Subtotal")}</span><strong>${money(total(items))}</strong></div><button class="primary" data-action="cart">${tr("查看本桌点单", "View our table")} ↗</button><p class="ticket-foot">${statusCopy()}</p>`;
}
function add(d, style = null, amount = 1) {
  if (!table) {
    showTable();
    return false;
  }
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
    toast(e.message);
    return false;
  }
  requestAnimationFrame(() => {
    const target =
      [...document.querySelectorAll("#trayPictures img")].find(
        (img) => img.dataset.id === d.id,
      ) || $("#trayPictures");
    globalThis.TableMotion?.fly(photo(d), origin, target);
  });
  toast(tr(`${name(d)} · 已加入本桌`, `${name(d)} · added to your table`));
  return true;
}
function openDish(d, selectedStyle = null) {
  detail = d;
  detailQty = 1;
  detailStyle = d.styles?.includes(selectedStyle) ? selectedStyle : d.styles?.[0] || null;
  openModal("dish", `${categoryName(d.section)} / ${categoryOther(d.section)}`);
  renderDetail();
}
function renderDetail() {
  const d = detail;
  $("#sheetBody").innerHTML =
    `${d.img ? `<div class="detail-image" role="slider" tabindex="0" aria-label="${tr("旋转菜品图片", "Rotate dish photo")}" aria-valuemin="-22" aria-valuemax="22" aria-valuenow="0" aria-orientation="horizontal"><img src="${photo(d, "l")}" alt="${escapeHTML(name(d))}"></div>` : ""}<div class="sheet-content"><p class="eyebrow">${d.placeholder ? tr("菜品示意图", "SERVING ILLUSTRATION") : tr("现点现做", "MADE TO ORDER")}${d.best ? " · " + tr("人气", "POPULAR") : ""}</p><div class="detail-top"><div><h1 id="sheetTitle">${dishNameHTML(d)}</h1><div class="detail-other">${otherName(d)}</div></div><span class="detail-price">${money(d.price)}</span></div><p class="detail-description">${description(d)}</p><div class="detail-facts"><div class="spice-fact"><small>${tr("辣度", "SPICE")}</small><span><i class="spice-marks" aria-hidden="true">${[1, 2, 3].map((level) => `<i class="${level <= (d.spice || 0) ? "active" : ""}"></i>`).join("")}</i>${I18N.ui[language].spiceLevels[d.spice || 0]}</span></div><div><small>${tr("过敏原", "ALLERGENS")}</small><span>${d.allergens?.length ? d.allergens.map((a) => tr(I18N.allergens[a] || a, a)).join(" · ") : tr("未提供，请向店员确认", "Ask staff for details")}</span></div>${d.pieces ? `<div><small>${tr("份量", "PORTION")}</small><span>${d.pieces} ${tr("只", "pieces")}</span></div>` : ""}</div>${d.styles ? `<p class="eyebrow">${tr("选择做法", "CHOOSE A STYLE")}</p><div class="styles">${d.styles.map((s) => `<button class="chip ${s === detailStyle ? "active" : ""}" data-style="${s}" aria-pressed="${s === detailStyle}">${styleName(s)}</button>`).join("")}</div>` : ""}<p class="fineprint">${tr("如有严重过敏，请先向店员确认食材与共用厨具情况。", "For serious allergies, check ingredients and shared preparation areas with staff.")}</p></div><div class="dish-action"><div class="quantity"><button data-detail-delta="-1" aria-label="${tr("减少份数", "Fewer portions")}" ${detailQty <= 1 ? "disabled" : ""}>−</button><b>${detailQty}</b><button data-detail-delta="1" aria-label="${tr("增加份数", "More portions")}" ${detailQty >= 20 ? "disabled" : ""}>+</button></div><button class="primary" data-action="add-detail" ${d.soldOut ? "disabled" : ""}>${d.soldOut ? tr("暂时售罄", "Sold out") : tr("加入本桌", "Add to our table")}<strong>${money(d.price * detailQty)}</strong></button></div>`;
  globalThis.TableMotion?.attachPlate($(".detail-image"));
}
function updateDetailSelection() {
  const quantity = $(".dish-action .quantity");
  if (!quantity) return;
  quantity.querySelector("b").textContent = detailQty;
  quantity.querySelector('[data-detail-delta="-1"]').disabled = detailQty <= 1;
  quantity.querySelector('[data-detail-delta="1"]').disabled = detailQty >= 20;
  $('[data-action="add-detail"] strong')?.replaceChildren(document.createTextNode(money(detail.price * detailQty)));
  $$(".styles [data-style]").forEach((button) => {
    const selected = button.dataset.style === detailStyle;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}
function showCategories() {
  openModal("categories", "");
  $("#sheetBody").innerHTML =
    `<div class="sheet-content"><h2 id="sheetTitle">${tr("菜品分类", "Categories")}</h2><div class="category-grid">${categories.map((c, i) => `<button data-category="${c}" class="category-choice ${c === activeCategory ? "active" : ""}"><small>${String(i + 1).padStart(2, "0")} / ${MENU.filter((d) => d.section === c).length}</small><strong>${categoryName(c)}</strong><span class="translation">${categoryOther(c)}</span></button>`).join("")}</div><button class="secondary" style="margin-top:22px" data-action="paper">${tr("全部菜单", "Full menu")} ↗</button></div>`;
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
  $("#sceneCount").textContent = count()
    ? tr(
        `这一桌，已选 ${count()} 份 · ${money(total(store.items))}`,
        `${count()} portions · ${money(total(store.items))}`,
      )
    : tr(
        "空桌不空心，选几道喜欢的。",
        "Make yourself at home. Pick a few favourites.",
      );
  $("#sceneDisclaimer").textContent = tr(
    `3D 蒸笼为创意装置；菜品使用照片示意。${ids.length > images.length ? ` 桌面展示 ${images.length} 道，全部菜品见本桌点单。` : ""}`,
    `The steamer is a 3D illustration; menu dishes use photographs.${ids.length > images.length ? ` Showing ${images.length} dishes; view your cart for all items.` : ""}`,
  );
  $("#sceneSelection").innerHTML = ids.length
    ? ids
        .map(
          (id) =>
            `<button data-dish="${id}">${name(dish(id))}<span>× ${qty(id)}</span></button>`,
        )
        .join("")
    : `<p>${tr("下方加菜，会摆到这张桌上。", "Add a dish below and watch your table fill up.")}</p>`;
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
    `<div class="scene-intro"><div><p class="eyebrow">${tr("一笼热气，一桌人。", "A LITTLE STEAM. A LITTLE COMPANY.")}</p><h2 id="sheetTitle">${tr("揭笼，上桌。", "Lift the lid.")}</h2></div><span class="scene-seal" aria-hidden="true">饺</span></div>
    <div class="scene-stage" id="sceneStage"><p class="scene-loading" role="status">${tr("正在摆好这一桌…", "Setting your table…")}</p></div>
    <div class="scene-controls"><button id="sceneLeft" aria-label="${tr("向左转桌面", "Rotate left")}">↶</button><button id="sceneLid" class="scene-lid" disabled>${tr("揭开蒸笼", "Lift the lid")}</button><button id="sceneRight" aria-label="${tr("向右转桌面", "Rotate right")}">↷</button></div>
    <p class="scene-hint">${tr("左右拖动桌面 · 点桌上的菜看详情", "Drag to turn · Tap a dish for details")}</p>
    <div class="scene-views"><button data-scene-view="seat" aria-pressed="true">${tr("入座视角", "Take a seat")}</button><button data-scene-view="top" aria-pressed="false">${tr("俯看这一桌", "From above")}</button><button data-scene-view="close" aria-pressed="false">${tr("凑近看笼", "A closer look")}</button></div>
    <div class="scene-order"><h3 id="sceneCount"></h3><div class="scene-selection" id="sceneSelection"></div><div class="scene-picks">${picks.map((d) => `<div><button data-dish="${d.id}" class="scene-pick-photo"><img src="${photo(d)}" alt="${escapeHTML(name(d))}"></button><span>${name(d)}</span><button class="scene-pick-add" data-add="${d.id}" aria-label="${escapeHTML(tr("添加 ", "Add ") + name(d))}">+</button></div>`).join("")}</div><button class="primary" data-action="cart">${tr("查看本桌点单", "View our table")} ↗</button><p class="fineprint" id="sceneDisclaimer"></p></div>`;
  refreshTableScene();
  const host = $("#sceneStage");
  const unavailable = () => {
    if (sceneSession !== session) return;
    tableScene?.dispose();
    tableScene = null;
    host.innerHTML = `<div class="scene-fallback"><img src="${photo(picks[0])}" alt=""><p>${tr("当前设备暂不能显示 3D，仍可在下方正常选菜。", "3D is unavailable here. You can still order below.")}</p></div>`;
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
      $("#sceneLid").textContent = sceneOpened
        ? tr("轻轻合上", "Close the lid")
        : tr("揭开蒸笼", "Lift the lid");
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
    `<div class="sheet-content paper-menu"><h2 id="sheetTitle">${tr("今日菜单", "The menu")}</h2><p class="sheet-intro">${table || "—"} · ${tr("手工现做", "Made to order")}</p>${categories
      .map(
        (c, i) =>
          `<div class="paper-heading"><small>${String(i + 1).padStart(2, "0")}</small><h3>${categoryName(c)}</h3><em>${categoryOther(c)}</em></div>${MENU.filter(
            (d) => d.section === c,
          )
            .map(
              (d) =>
                `<button class="paper-row" data-dish="${d.id}"><span>${name(d)}<small>${otherName(d)}</small></span><i></i><b>${d.soldOut ? tr("售罄", "Sold") : money(d.price)}</b></button>`,
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
    toast(e.message);
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
  button.textContent = tr("正在提交点单…", "Submitting your order…");
  try {
    lastOrder = await store.checkout(review);
    openModal("success", "DUMPLING LAB / ORDER RECEIVED");
    SharedTable.confirm(lastOrder);
  } catch (e) {
    toast(e.message);
    if (e.status === 409) {
      await store.poll();
      submitting = false;
      showCart(store.items.length ? "pending" : "ordered");
    } else {
      button.disabled = false;
      button.textContent = tr("重试 / 确认订单", "Retry / confirm order");
    }
  } finally {
    submitting = false;
    SharedTable.updateReview();
  }
}
function showTable() {
  openModal("table", "DUMPLING LAB / TOGETHER");
  const url = new URL(location.href);
  url.hash = "menu";
  $("#sheetBody").innerHTML =
    `<div class="sheet-content"><h2 id="sheetTitle">${tr("同桌与拼桌", "Table & groups")}</h2><p class="sheet-intro">${table ? `${tr("桌号", "Table")} ${table} · ${tr("点餐组", "Group")} ${group}` : tr("请扫描桌上的二维码，获取你的桌号。", "Scan your table’s QR code to get started.")}</p><div class="drawer-note">${tr("同一链接的客人共享选菜和已下单记录。陌生人拼桌时，创建独立组；新组不会带走原组菜品。", "Guests using the same link share a cart and order history. Sharing a table with strangers? Create a separate group; the current group keeps its dishes.")}</div>${table ? `<div class="table-options"><button class="primary" data-action="share">${tr("邀请同桌一起点", "Invite your companions")} ↗</button><button class="secondary" data-action="separate">${tr("我们是拼桌，独立点餐", "Start a separate group")}</button></div><div class="group-link">${escapeHTML(url.href)}</div>` : ""}<p class="fineprint">${statusCopy()}</p>${store.status === "rejected" ? `<p class="drawer-note">${escapeHTML(store.lastError)}</p><button class="secondary" data-action="discard-rejected">${tr("撤回未同步操作，重新选菜", "Discard unsynced edits and retry")}</button>` : ""}</div>`;
  $("#sheetBody").insertAdjacentHTML("beforeend", SharedTable.nameForm());
}
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
    `<div class="sheet-content"><h2 id="sheetTitle">${tr("推荐搭配", "Suggested dishes")}</h2><div class="planner-controls"><p>${tr("用餐人数", "Guests")}</p><div class="quantity"><button data-people="-1" aria-label="${tr("减少人数", "Fewer guests")}" ${people === 1 ? "disabled" : ""}>−</button><b>${people}</b><button data-people="1" aria-label="${tr("增加人数", "More guests")}" ${people === 10 ? "disabled" : ""}>+</button></div></div><div class="filters">${[
      ["all", tr("不限", "Any")],
      ["mild", tr("清淡不辣", "Not spicy")],
      ["veg", tr("素食为主", "Vegetarian")],
    ]
      .map(
        ([key, label]) =>
          `<button data-preference="${key}" class="${preference === key ? "active" : ""}" aria-pressed="${preference === key}">${label}</button>`,
      )
      .join(
        "",
      )}</div><div class="planner-list">${suggestions.map((d) => `<label class="planner-item"><img src="${photo(d)}" alt=""><span><strong>${dishNameHTML(d)}</strong><small>${categoryName(d.section)} · ${portions} ${tr("份", "portions")} · ${money(d.price * portions)}</small></span><input type="checkbox" data-suggestion="${d.id}" ${selectedSuggestions.has(d.id) ? "checked" : ""}></label>`).join("")}</div><p class="fineprint">${tr("搭配依据菜单分类与标注，不代表营养或过敏安全建议。食量不同，请按需调整。", "Based on menu categories and labels, not nutritional or allergy advice. Adjust to your appetite.")}</p><button class="primary" data-action="add-plan" ${!selectedSuggestions.size ? "disabled" : ""}>${tr("加入已选", "Add selected dishes")}<strong>${money(amount)}</strong></button></div>`;
}
function showService() {
  openModal("service", "");
  $("#sheetBody").innerHTML =
    `<div class="sheet-content"><h2 id="sheetTitle">${tr("呼叫服务员", "Call staff")}</h2><p class="sheet-intro">${table ? `${tr("送到", "For table")} ${table}` : tr("扫码入座后可呼叫服务员", "Scan your table code to call staff")}</p><div class="service-grid">${[
      ["water", "◒", tr("添水", "Water")],
      ["cutlery", "⋈", tr("添餐具", "Cutlery")],
      ["bill", "▤", tr("买单", "The bill")],
      ["help", "✳", tr("其他帮助", "Other help")],
    ]
      .map(
        ([key, symbol, label]) =>
          `<button data-service="${key}" ${!table ? "disabled" : ""}><span aria-hidden="true">${symbol}</span>${label}</button>`,
      )
      .join(
        "",
      )}</div><p class="fineprint">${tr("选择后会通知店员。", "Tap a request to notify a staff member.")}</p></div>`;
}

document.addEventListener("click", async (e) => {
  const b = e.target.closest("button");
  if (!b || b.disabled) return;
  if (b.hasAttribute("data-image-retry")) {
    const host = b.closest(".detail-image"), img = host?.querySelector("img");
    if (!img) return;
    b.disabled = true;
    b.textContent = tr("加载中…", "Loading…");
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
    openDish(dish(b.dataset.dish));
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
      toast(err.message);
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
      if (!table) {
        showTable();
        break;
      }
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
        if (err.name !== "AbortError")
          toast(
            tr(
              "可复制下方链接邀请同桌",
              "Copy the link below to invite your table",
            ),
          );
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
    host.setAttribute("role", "slider");
    host.setAttribute("tabindex", "0");
    host.setAttribute("aria-label", tr("旋转菜品图片", "Rotate dish photo"));
    host.setAttribute("aria-valuemin", "-22");
    host.setAttribute("aria-valuemax", "22");
    host.setAttribute("aria-orientation", "horizontal");
    host.setAttribute("aria-valuenow", String(Math.round(parseFloat(host.style.getPropertyValue("--plate-angle")) || 0)));
    if (hadFocus) host.focus({ preventScroll: true });
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
  fallback.innerHTML = `${icon("plate")}<small>${tr("图片暂未加载", "Photo unavailable")}</small>${isDetail ? `<button data-image-retry>${tr("重试", "Retry")}</button>` : ""}`;
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
        toast(err.message);
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
    $('[data-action="add-plan"] strong').textContent = money(amount);
  }
});
$("#categoryButton").onclick = showCategories;
$("#tableExperience").onclick = showTableScene;
$("#tray").onclick = () =>
  showCart(count() ? "pending" : store.orders.length ? "ordered" : "pending");
$("#tableButton").onclick = showTable;
$("#connectionButton").onclick = showTable;
$("#planButton").onclick = showPlanner;
$("#serviceButton").onclick = showService;
$("#searchButton").onclick = () => {
  const panel = $("#searchPanel");
  panel.hidden = !panel.hidden;
  $("#searchButton").setAttribute("aria-expanded", String(!panel.hidden));
  if (!panel.hidden) {
    $("#searchInput").focus();
    panel.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }
};
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
  $("#clearSearch").disabled = !e.target.value;
  if (e.isComposing || searchComposing) return;
  scheduleSearch();
};
$("#searchInput").addEventListener("compositionstart", () => { searchComposing = true; clearTimeout(searchTimer); });
$("#searchInput").addEventListener("compositionend", () => { searchComposing = false; scheduleSearch(); });
$("#searchInput").addEventListener("keydown", (e) => {
  if (e.key !== "Escape" || e.isComposing || searchComposing) return;
  e.preventDefault();
  $("#searchPanel").hidden = true;
  $("#searchButton").setAttribute("aria-expanded", "false");
  $("#searchButton").focus();
});
$("#clearSearch").onclick = () => {
  clearTimeout(searchTimer);
  searchComposing = false;
  search = "";
  $("#searchInput").value = "";
  renderMenu();
  $("#searchInput").focus();
};
$("#languageButton").onclick = () => {
  language = language === "zh" ? "en" : "zh";
  try { localStorage.setItem("atelier-language", language); } catch { /* Language still works for this visit. */ }
  renderChrome();
  renderMenu();
  renderTray();
};
store.addEventListener("change", () => {
  renderTray();
  SharedTable.observe();
  refreshTableScene();
  if (modal === "cart" && document.activeElement?.id !== "cartNote")
    renderCart();
});
renderChrome();
renderMenu();
renderTray();
SharedTable.init();
store.start();
if (location.hash === "#index") showPaper();
if (location.hash === "#table3d" || location.hash === "#cart") showCart();
