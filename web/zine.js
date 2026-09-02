/* Dumpling Lab — the printed menu, as software.
   A cover, one poster page per chapter, a spine to jump between them, a
   clipping for each dish, a ticket for the order. Written from the print
   system outward; nothing here is a scrolling card grid. */
"use strict";
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const params = new URLSearchParams(location.search);
const TABLE = params.get("table");
const fmt = n => "S$" + (Number.isInteger(n) ? n : n.toFixed(2));
const haptic = s => navigator.vibrate && navigator.vibrate(s ? 16 : 8);
const pad = n => String(n).padStart(2, "0");

/* ---------- language ---------- */
const norm = v => { v = (v || "").toLowerCase(); return v.startsWith("zh") ? "zh" : v.startsWith("en") ? "en" : null; };
let lang = norm(params.get("lang")) || norm(localStorage.getItem("dl-lang")) || norm(navigator.language) || "zh";
const L = () => I18N.ui[lang];
const secName = s => lang === "zh" ? I18N.sections[s] : SECTION_LABELS[s];
const secOther = s => lang === "zh" ? SECTION_LABELS[s] : I18N.sections[s];
const secTag = s => lang === "zh" ? (I18N.taglines[s] || "") : "";
const dName = d => lang === "zh" ? d.cn : d.name;
const dOther = d => lang === "zh" ? d.name : d.cn;
const dFlavor = d => lang === "zh" ? ((I18N.dishes[d.id] || {}).flavor || d.flavor) : d.flavor;
const styleLabel = s => lang === "zh" ? s : (STYLE_LABELS[s] || s);
const allergen = a => lang === "zh" ? (I18N.allergens[a] || a) : a;
const dishById = id => MENU.find(d => d.id === id);
const chapters = SECTIONS.filter(s => MENU.some(d => d.section === s));
const refOf = d => `${pad(chapters.indexOf(d.section) + 1)}.${pad(MENU.filter(x => x.section === d.section).indexOf(d) + 1)}`;

/* ---------- cart ---------- */
const cart = new Map();
try { JSON.parse(localStorage.getItem("dl-cart2") || "[]").forEach(x => cart.set(x.k, x.v)); } catch {}
const keyOf = (id, style) => style ? `${id}|${style}` : id;
const saveCart = () => localStorage.setItem("dl-cart2", JSON.stringify([...cart].map(([k, v]) => ({ k, v }))));
const cartCount = () => [...cart.values()].reduce((a, b) => a + b.qty, 0);
const cartTotal = () => [...cart.values()].reduce((a, v) => a + (dishById(v.id)?.price || 0) * v.qty, 0);
const qtyForDish = id => [...cart.values()].filter(v => v.id === id).reduce((a, b) => a + b.qty, 0);
function addToCart(id, style, n = 1) {
  const k = keyOf(id, style);
  const cur = cart.get(k) || { id, style: style || null, qty: 0 };
  cur.qty += n;
  if (cur.qty <= 0) cart.delete(k); else cart.set(k, cur);
  saveCart(); syncTicket(); syncMarks();
}

/* ---------- pieces ---------- */
const flag = d => d.best ? `<span class="flag">${L().bestSeller}</span>` : d.chef ? `<span class="flag">${L().chefsChoice}</span>` : "";
const spice = d => d.spice ? `<span class="spice" aria-label="spice ${d.spice}">${"•".repeat(Math.min(d.spice, 3))}</span>` : "";
const mark = d => d.soldOut ? `<span class="soldtag">${L().soldOut}</span>` : (qtyForDish(d.id) ? `<span class="qty" data-add="${d.id}">${qtyForDish(d.id)}</span>` : `<button class="add" data-add="${d.id}" aria-label="${L().addToSteamer}">+</button>`);

function rowHTML(d) {
  return `<div class="row dish${d.soldOut ? " sold" : ""}" data-id="${d.id}" role="button" tabindex="0">
    <span class="ref">${refOf(d)}</span>
    <span class="th">${artFor(d)}</span>
    <span class="cap"><span class="nm">${dName(d)}${flag(d)}${spice(d)}</span><span class="en">${dOther(d)}${d.pieces ? ` · ${d.pieces} ${L().pieces}` : ""}</span></span>
    <span class="price">${fmt(d.price)}</span>
    ${mark(d)}
  </div>`;
}
function tileHTML(d) {
  return `<div class="tile dish${d.soldOut ? " sold" : ""}" data-id="${d.id}">
    <span class="ref">${refOf(d)}</span>${flag(d)}${mark(d)}
    <div class="art">${artFor(d)}</div>
    <div class="cap"><div class="nm">${dName(d)}${spice(d)}</div><div class="en">${dOther(d)}</div></div>
    <div class="price">${fmt(d.price)}</div>
  </div>`;
}

/* Each chapter is set as a poster in one of four compositions. The choice is
   fixed per chapter so the book reads the same every visit. */
const COMPOSITION = { signature: "field", diy: "objects", noodles: "ruled", buns: "declare", tangzi: "objects", rice: "ruled", soup: "declare", sides: "objects", fried: "ruled", veg: "field", dessert: "declare" };

function chapterHTML(sec, i) {
  const dishes = MENU.filter(d => d.section === sec);
  const comp = COMPOSITION[sec] || "ruled";
  const hero = dishes.find(d => d.img) || dishes[0];
  const head = `<div class="ch-head">
      <span class="code">DL//${pad(i + 1)}</span>
      <span class="num">${pad(i + 1)}</span>
      <h2>${secName(sec)}<small>${secOther(sec)}</small></h2>
      <span class="count">${pad(dishes.length)}</span>
    </div>
    ${secTag(sec) ? `<p class="ch-tag">${secTag(sec)}</p>` : ""}`;
  let body = "";
  // On a wide spread the left page always carries one specimen so the paper is
  // never blank; on a phone only the image-field chapters spend the height.
  const specimen = `<div class="field dish-hero${comp === "field" ? "" : " desk-only"}" data-id="${hero.id}">${artFor(hero)}<div class="cap"><b>${dName(hero)}</b>${fmt(hero.price)}</div></div>`;
  if (comp === "field") body = `${specimen}<div class="rows">${dishes.map(rowHTML).join("")}</div>`;
  else if (comp === "objects") body = `${specimen}<div class="tiles">${dishes.map(tileHTML).join("")}</div>`;
  else if (comp === "ruled") body = `${specimen}<div class="rows">${dishes.map(rowHTML).join("")}</div>`;
  else if (comp === "declare") body = `<div class="declare">${secName(sec)}<small>${secOther(sec)} · ${pad(dishes.length)}</small></div><div class="rows">${dishes.map(rowHTML).join("")}</div>`;
  else body = `<div class="rows">${dishes.map(rowHTML).join("")}</div>`;
  return `<section class="page chapter" id="p${i + 1}" data-sec="${sec}"><div class="page-inner">${head}${body}</div></section>`;
}

function coverHTML() {
  const hero = MENU.find(d => d.featured && d.img) || MENU.find(d => d.img) || MENU[0];
  return `<section class="page cover" id="p0"><div class="page-inner">
    <div class="head"><span class="k">DUMPLING LAB · ${new Date().getFullYear()}</span><span class="k" id="heroCount">${pad(MENU.filter(d => !d.soldOut).length)} DISHES</span></div>
    <h1>MENU<span class="zh">${lang === "zh" ? "菜单" : "手工现包"}</span></h1>
    <p class="sub" id="heroSub">${L().tagline}</p>
    <div class="plate dish-hero" data-id="${hero.id}">${artFor(hero)}<div class="caption"><b>${dName(hero)}</b>${L().todays} · ${fmt(hero.price)}</div></div>
    <div class="toc">${chapters.map((s, i) => `<button data-page="${i + 1}"><span class="n">${pad(i + 1)}</span><span class="nm">${secName(s)}<small>${secOther(s)}</small></span><span class="c">${pad(MENU.filter(d => d.section === s).length)}</span></button>`).join("")}</div>
    <p class="flip">→ ${lang === "zh" ? "向左翻页" : "Swipe to turn the page"}</p>
  </div></section>`;
}

function renderBook() {
  $("#book").innerHTML = coverHTML() + chapters.map(chapterHTML).join("");
  $("#spine").innerHTML = `<button data-page="0" class="on"><b>00</b>${lang === "zh" ? "封面" : "Cover"}</button>` +
    chapters.map((s, i) => `<button data-page="${i + 1}"><b>${pad(i + 1)}</b>${secName(s)}</button>`).join("");
  $$("[data-page]").forEach(b => b.onclick = () => { haptic(); goPage(Number(b.dataset.page)); });
  $("#book").addEventListener("click", onDishClick);
  watchPages();
}
function goPage(n) {
  const page = $(`#p${n}`); if (!page) return;
  $("#book").scrollTo({ left: page.offsetLeft, behavior: "smooth" });
}
function watchPages() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const n = Number(e.target.id.slice(1));
      $$("#spine button").forEach(b => b.classList.toggle("on", Number(b.dataset.page) === n));
      $(`#spine button[data-page="${n}"]`)?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    });
  }, { root: $("#book"), threshold: .6 });
  $$(".page").forEach(p => io.observe(p));
}
function onDishClick(e) {
  const add = e.target.closest("[data-add]");
  if (add) {
    e.stopPropagation();
    const d = dishById(add.dataset.add); if (!d || d.soldOut) return;
    if (d.styles) { openDish(d); return; }
    addToCart(d.id, null, 1); toast(L().added(dName(d))); pulse(); haptic();
    return;
  }
  const el = e.target.closest(".dish, .dish-hero");
  if (el) { const d = dishById(el.dataset.id); if (d && !d.soldOut) openDish(d); }
}
function syncMarks() {
  $$(".dish").forEach(el => {
    const d = dishById(el.dataset.id); if (!d || d.soldOut) return;
    const cur = el.querySelector("[data-add]"); if (!cur) return;
    const q = qtyForDish(d.id);
    const next = document.createElement("template"); next.innerHTML = mark(d);
    if ((q > 0) !== cur.classList.contains("qty") || (q > 0 && cur.textContent !== String(q))) cur.replaceWith(next.content.firstElementChild);
  });
}

/* ---------- find ---------- */
let filterMode = "all", query = "";
function matches(d) {
  if (filterMode === "veg" && !d.veg) return false;
  if (filterMode === "spicy" && d.spice < 2) return false;
  if (filterMode === "noPork" && d.meat === "pork") return false;
  if (query) { const q = query.toLowerCase(); if (!d.name.toLowerCase().includes(q) && !d.cn.includes(query)) return false; }
  return true;
}
function renderFilters() {
  $("#filters").innerHTML = [["all", L().fAll], ["veg", L().fVeg], ["spicy", L().fSpicy], ["noPork", L().fNoPork]]
    .map(([m, label]) => `<button class="fchip${filterMode === m ? " on" : ""}" data-m="${m}">${label}</button>`).join("");
  $$("#filters .fchip").forEach(b => b.onclick = () => { filterMode = filterMode === b.dataset.m ? "all" : b.dataset.m; haptic(); renderFilters(); renderFind(); });
}
function renderFind() {
  const hits = MENU.filter(matches);
  const show = query || filterMode !== "all";
  $("#findList").innerHTML = show ? `<div class="rows">${hits.map(rowHTML).join("")}</div>` : "";
  $("#empty").hidden = !(show && hits.length === 0);
  $("#empty").textContent = L().noResults;
}
function openFind() { $("#findScrim").hidden = false; $("#find").hidden = false; requestAnimationFrame(() => { $("#findScrim").classList.add("open"); $("#find").classList.add("open"); $("#search").focus(); }); }
function closeFind() { $("#findScrim").classList.remove("open"); $("#find").classList.remove("open"); setTimeout(() => { $("#findScrim").hidden = true; $("#find").hidden = true; }, 450); }
let searchT;
$("#search").addEventListener("input", e => { clearTimeout(searchT); searchT = setTimeout(() => { query = e.target.value.trim(); renderFind(); }, 120); });
$("#findBtn").addEventListener("click", () => { haptic(); openFind(); });
$("#findClose").addEventListener("click", closeFind);
$("#findScrim").addEventListener("click", closeFind);
$("#findList").addEventListener("click", onDishClick);

/* ---------- clipping (dish) ---------- */
let sheetDish = null, sheetQty = 1, sheetStyle = null, view = null, request = 0;
function openDish(d) {
  sheetDish = d; sheetQty = 1; sheetStyle = d.styles ? d.styles[0] : null; haptic();
  renderSheet();
  $("#sheetScrim").hidden = false; $("#sheet").hidden = false;
  requestAnimationFrame(() => { $("#sheetScrim").classList.add("open"); $("#sheet").classList.add("open"); $("#sheet").scrollTop = 0; });
}
function closeSheet() {
  request++; view?.dispose(); view = null;
  $("#sheetScrim").classList.remove("open"); $("#sheet").classList.remove("open");
  setTimeout(() => { $("#sheetScrim").hidden = true; $("#sheet").hidden = true; }, 400);
}
function renderSheet() {
  view?.dispose(); view = null;
  const d = sheetDish;
  const spatial = Boolean(d.model || d.img);
  const meta = [];
  if (d.pieces) meta.push(`${d.pieces} ${L().pieces}`);
  if (d.spice) meta.push(lang === "zh" ? `辣度 ${d.spice}/3 · ${L().spiceLevels[d.spice]}` : `Spice ${d.spice}/3 · ${L().spiceLevels[d.spice]}`);
  if (d.allergens?.length) meta.push(`${L().allergens}: ${d.allergens.map(allergen).join(" · ")}`);
  $("#sheetBody").innerHTML = `
    <span class="d-ref">DL//${refOf(d)}</span>
    <div class="d-pic">
      ${spatial ? `<div class="three-stage" id="threeStage"></div>` : ""}
      <div class="d-art-object" id="dArt">${artFor(d)}</div>
      ${spatial ? `<span class="drag-hint"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3.4 8a6.8 6.8 0 0 1 13.2 0"/><path d="M2.6 10.6 3.4 8l2.6.9M17.4 10.6 16.6 8 14 8.9"/></svg>${
        d.model ? (lang === "zh" ? "拖动旋转 · 双指缩放" : "DRAG TO ROTATE · PINCH TO ZOOM") : (lang === "zh" ? "拖动查看 · 实拍" : "DRAG TO TILT · REAL PHOTO")}</span>` : ""}
    </div>
    ${(d.best || d.chef) ? `<div class="d-badges"><span class="badge">${d.best ? L().bestSeller : L().chefsChoice}</span></div>` : ""}
    <div class="d-name">${dName(d)}</div>
    <div class="d-en">${dOther(d)}</div>
    <div class="d-price">${fmt(d.price)}</div>
    ${dFlavor(d) ? `<div class="d-flavor">${dFlavor(d)}</div>` : ""}
    <div class="d-meta">${meta.map(m => `<span>${m}</span>`).join("")}</div>
    ${d.styles ? `<div class="d-section-label">${L().pickStyle}</div><div class="styles">${d.styles.map(s => `<button class="style-opt${s === sheetStyle ? " on" : ""}" data-s="${s}">${styleLabel(s)}</button>`).join("")}</div>` : ""}
    <div class="d-bar">
      <div class="stepper"><button id="qm">−</button><b id="qn">${sheetQty}</b><button id="qp">+</button></div>
      <button class="d-add" id="dAdd"><span>${L().addToSteamer}</span><strong>${fmt(d.price * sheetQty)}</strong></button>
    </div>`;
  $("#qm").onclick = () => { if (sheetQty > 1) { sheetQty--; syncSheet(); haptic(); } };
  $("#qp").onclick = () => { sheetQty++; syncSheet(); haptic(); };
  $$(".style-opt").forEach(b => b.onclick = () => { sheetStyle = b.dataset.s; renderSheet(); haptic(); });
  $("#dAdd").onclick = () => { addToCart(d.id, sheetStyle, sheetQty); toast(L().added(dName(d) + (sheetStyle ? ` · ${styleLabel(sheetStyle)}` : ""))); closeSheet(); pulse(); };
  mountStage();
}
function syncSheet() { $("#qn").textContent = sheetQty; $("#dAdd strong").textContent = fmt(sheetDish.price * sheetQty); }
async function mountStage() {
  const d = sheetDish, stage = $("#threeStage"); if (!stage) return;
  const req = ++request;
  const pic = stage.closest(".d-pic");
  const modelURL = d.model ? `models/production/${d.model}` : null;
  const imageURL = d.img ? `img/${d.img}` : null;
  const opts = {
    label: dName(d), idle: false,
    onReady: box => {
      if (req !== request || !stage.isConnected) return;
      const img = pic.querySelector(".d-art-object img");
      const fit = () => {
        if (!box || !img || !img.naturalWidth) return;
        const s = stage.getBoundingClientRect(), el = img.getBoundingClientRect(), pr = pic.getBoundingClientRect();
        const ratio = Math.min(el.width / img.naturalWidth, el.height / img.naturalHeight);
        const scale = box.width / (img.naturalWidth * ratio);
        const tx = (s.left - pr.left + box.left + box.width / 2) - (el.left - pr.left + el.width / 2);
        const ty = (s.top - pr.top + box.top + box.height / 2) - (el.top - pr.top + el.height / 2);
        img.style.transform = `translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px) scale(${scale.toFixed(3)})`;
      };
      if (modelURL && img) { if (img.complete && img.naturalWidth) fit(); else img.addEventListener("load", fit, { once: true }); }
      pic.classList.add(modelURL ? "ready-3d" : "showing-3d");
    },
    onFirstTouch: () => { if (req === request) pic.classList.add("showing-3d"); },
    onError: () => { if (req === request) { pic.classList.remove("showing-3d", "ready-3d"); stage.remove(); } },
  };
  try {
    if (modelURL) { const { mountGeneratedDish3D } = await import("./model3d.js?v=12"); if (req !== request) return; view = mountGeneratedDish3D(stage, { ...opts, modelURL }); }
    else if (imageURL) { const { mountPhotoDepth3D } = await import("./photo3d.js?v=9"); if (req !== request) return; view = mountPhotoDepth3D(stage, { ...opts, imageURL, profile: d.art }); }
  } catch { stage.remove(); }
}
$("#sheetScrim").addEventListener("click", closeSheet);
$("#sheetClose").addEventListener("click", closeSheet);

/* ---------- ticket ---------- */
function pulse() { const b = $("#cartBar"); b.classList.remove("pulse"); void b.offsetWidth; b.classList.add("pulse"); }
function syncTicket() {
  const n = cartCount();
  $("#cartBar").hidden = n === 0; $("#cartCount").textContent = n;
  if (!$("#cart").hidden) renderTicket();
}
function openTicket() { renderTicket(); $("#cartScrim").hidden = false; $("#cart").hidden = false; requestAnimationFrame(() => { $("#cartScrim").classList.add("open"); $("#cart").classList.add("open"); }); }
function closeTicket() { $("#cartScrim").classList.remove("open"); $("#cart").classList.remove("open"); setTimeout(() => { $("#cartScrim").hidden = true; $("#cart").hidden = true; }, 450); }
function renderTicket() {
  const n = cartCount();
  $("#cartSub").textContent = n ? L().cartSub(n, TABLE) : "";
  if (!n) { $("#cartItems").innerHTML = `<div class="cart-empty">${L().emptyCart}</div>`; $("#cartTotals").innerHTML = ""; $("#placeOrder").hidden = true; $("#noteWrap").hidden = true; return; }
  $("#placeOrder").hidden = false; $("#noteWrap").hidden = false;
  $("#cartItems").innerHTML = [...cart].map(([k, v]) => {
    const d = dishById(v.id); if (!d) return "";
    return `<div class="cart-line" data-k="${k}"><div class="th">${artFor(d)}</div>
      <div><div class="nm">${dName(d)}</div><div class="sub">${v.style ? `${styleLabel(v.style)} · ` : ""}${fmt(d.price)}</div></div>
      <div class="stepper"><button data-d="-1">−</button><b>${v.qty}</b><button data-d="1">+</button></div></div>`;
  }).join("");
  $$("#cartItems .stepper button").forEach(b => b.onclick = () => { const k = b.closest(".cart-line").dataset.k, v = cart.get(k); if (!v) return; addToCart(v.id, v.style, Number(b.dataset.d)); haptic(); renderTicket(); });
  $("#cartTotals").innerHTML = `<div class="rowt"><span>${L().total}</span><b>${fmt(cartTotal())}</b></div>`;
  $("#orderTotal").textContent = fmt(cartTotal());
  $("#note").value = localStorage.getItem("dl-note") || "";
}
$("#cartBar").addEventListener("click", () => { haptic(); openTicket(); });
$("#cartScrim").addEventListener("click", closeTicket);
$("#cartClose").addEventListener("click", closeTicket);
$("#note").addEventListener("input", e => localStorage.setItem("dl-note", e.target.value));
$("#placeOrder").addEventListener("click", () => {
  const no = String(Math.floor(1000 + Math.random() * 9000));
  const order = { table: TABLE, no, items: [...cart.values()].map(v => ({ ...v, name: dishById(v.id)?.cn })), note: ($("#note").value || "").trim() || null, total: cartTotal(), at: new Date().toISOString() };
  fetch("/api/order", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(order) }).catch(() => {});
  const past = JSON.parse(localStorage.getItem("dl-orders") || "[]"); past.push(order); localStorage.setItem("dl-orders", JSON.stringify(past));
  cart.clear(); saveCart(); syncTicket(); syncMarks(); localStorage.removeItem("dl-note"); closeTicket();
  $("#doneNote").textContent = L().orderNote(TABLE, no); $("#done").hidden = false; haptic(true);
});
$("#doneBack").addEventListener("click", () => { $("#done").hidden = true; });

/* ---------- waiter ---------- */
let waiterReason = null;
const REASON_ICONS = {
  water: '<svg viewBox="0 0 24 24"><path d="M7 4h10l-1.2 15a1.5 1.5 0 0 1-1.5 1.4H9.7A1.5 1.5 0 0 1 8.2 19L7 4Z"/><path d="M8 11h8"/></svg>',
  cutlery: '<svg viewBox="0 0 24 24"><path d="M7 3v18M5 3v5a2 2 0 0 0 4 0V3M17 3c-2 0-3 3-3 6s1 3 3 3v9"/></svg>',
  bill: '<svg viewBox="0 0 24 24"><path d="M6 3h12v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21V3Z"/><path d="M9 8h6M9 12h6"/></svg>',
  help: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17h.01"/></svg>',
};
function renderReasons() {
  $("#reasons").innerHTML = Object.entries(L().reasons).map(([k, label]) => `<button class="reason${waiterReason === k ? " on" : ""}" data-r="${k}">${REASON_ICONS[k]}<span>${label}</span></button>`).join("");
  $$(".reason").forEach(b => b.onclick = () => { waiterReason = b.dataset.r; haptic(); renderReasons(); $("#waiterSend").disabled = false; });
}
function openWaiter() { waiterReason = null; renderReasons(); $("#waiterSend").disabled = true; $("#waiterScrim").hidden = false; $("#waiterSheet").hidden = false; requestAnimationFrame(() => { $("#waiterScrim").classList.add("open"); $("#waiterSheet").classList.add("open"); }); }
function closeWaiter() { $("#waiterScrim").classList.remove("open"); $("#waiterSheet").classList.remove("open"); setTimeout(() => { $("#waiterScrim").hidden = true; $("#waiterSheet").hidden = true; }, 400); }
$("#bellBtn").addEventListener("click", () => { haptic(); openWaiter(); });
$("#callWaiter").addEventListener("click", () => { closeTicket(); setTimeout(openWaiter, 200); });
$("#waiterScrim").addEventListener("click", closeWaiter);
$("#waiterClose").addEventListener("click", closeWaiter);
$("#waiterSend").addEventListener("click", () => {
  const label = waiterReason ? L().reasons[waiterReason] : null; haptic(true);
  fetch("/api/call", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ table: TABLE, reason: label }) }).catch(() => {});
  closeWaiter(); toast(L().waiterSent(label));
});

/* ---------- copy, language, toast ---------- */
function renderStatic() {
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  $("#tableTag").textContent = TABLE ? (lang === "zh" ? `${TABLE}号桌` : `TABLE ${TABLE}`) : "";
  $("#langBtn").textContent = lang === "zh" ? "EN" : "中文";
  $("#search").placeholder = L().search;
  $("#cartTitle").textContent = L().steamer; $("#noteLabel").textContent = L().noteLabel; $("#note").placeholder = L().notePlaceholder;
  $("#orderLabel").textContent = L().order; $("#waiterLabel").textContent = L().waiter;
  $("#doneTitle").textContent = L().ordered; $("#doneBack").textContent = L().back;
  $("#waiterTitle").textContent = L().waiterTitle; $("#waiterSub").textContent = L().waiterSub(TABLE); $("#waiterK").textContent = L().waiterK; $("#waiterSend").textContent = L().waiterSend;
  $("#bellBtn").setAttribute("aria-label", L().waiter);
}
let toastT;
function toast(msg) { const el = $("#toast"); el.textContent = msg; el.hidden = false; requestAnimationFrame(() => el.classList.add("show")); clearTimeout(toastT); toastT = setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.hidden = true, 300); }, 1800); }
$("#langBtn").addEventListener("click", () => { lang = lang === "zh" ? "en" : "zh"; localStorage.setItem("dl-lang", lang); haptic(); renderAll(true); });
$("#brandLink").addEventListener("click", e => { e.preventDefault(); goPage(0); });
addEventListener("keydown", e => {
  if ((e.key === "Enter" || e.key === " ") && e.target.classList?.contains("dish")) { e.preventDefault(); e.target.click(); return; } if (e.key === "ArrowRight") $("#book").scrollBy({ left: innerWidth, behavior: "smooth" }); if (e.key === "ArrowLeft") $("#book").scrollBy({ left: -innerWidth, behavior: "smooth" }); if (e.key === "Escape") { closeSheet(); closeTicket(); closeFind(); closeWaiter(); } });

function renderAll(keepPage) {
  const current = keepPage ? Number(($$(".page").find(p => Math.abs(p.getBoundingClientRect().left) < innerWidth / 2) || { id: "p0" }).id.slice(1)) : 0;
  renderStatic(); renderBook(); renderFilters(); renderFind(); syncTicket(); syncMarks();
  if (current) requestAnimationFrame(() => $("#book").scrollTo({ left: $(`#p${current}`).offsetLeft }));
}
renderAll(false);
