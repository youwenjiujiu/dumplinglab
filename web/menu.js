/* Dumpling Lab — phone menu: cover → shop → dish → ticket. */
"use strict";
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const params = new URLSearchParams(location.search);
const TABLE = params.get("table");
const GROUP = /^[a-z0-9-]{1,16}$/i.test(params.get("group") || "") ? params.get("group").toUpperCase() : "A";
const LOOK = params.get("look") || "paper";            // paper (default) · table · plain
const LOOK_TABLE = LOOK === "table";
const FLOATING = LOOK === "paper" || LOOK === "showa" || LOOK === "lab";   // food floats on paper: photo grid + quiet rows
const TABLE3D = { colour: 0x7E2617, reflect: .14 };
const fmt = n => "S$" + (Number.isInteger(n) ? n : n.toFixed(2));
const haptic = s => navigator.vibrate && navigator.vibrate(s ? 16 : 8);
const pad = n => String(n).padStart(2, "0");
const norm = v => { v = (v || "").toLowerCase(); return v.startsWith("zh") ? "zh" : v.startsWith("en") ? "en" : null; };
let lang = norm(params.get("lang")) || norm(localStorage.getItem("dl-lang")) || norm(navigator.language) || "zh";
const L = () => I18N.ui[lang];
const secName = s => lang === "zh" ? I18N.sections[s] : SECTION_LABELS[s];
const secOther = s => lang === "zh" ? SECTION_LABELS[s] : I18N.sections[s];
const dName = d => lang === "zh" ? d.cn : d.name;
const dOther = d => lang === "zh" ? d.name : d.cn;
const dFlavor = d => lang === "zh" ? ((I18N.dishes[d.id] || {}).flavor || d.flavor) : d.flavor;
const styleLabel = s => lang === "zh" ? s : (STYLE_LABELS[s] || s);
const allergen = a => lang === "zh" ? (I18N.allergens[a] || a) : a;
const dishById = id => MENU.find(d => d.id === id);
const chapters = SECTIONS.filter(s => MENU.some(d => d.section === s));

/* cart */
const cart = new Map();
let pendingOrder = null;
const keyOf = (id, style) => style ? `${id}|${style}` : id;
const requestId = () => crypto.randomUUID?.() || [...crypto.getRandomValues(new Uint8Array(16))].map(x => x.toString(16).padStart(2, "0")).join("");
const SHARED_CART = Boolean(TABLE);
const CART_CACHE_KEY = `dl-cart3:${TABLE || "local"}:${GROUP}`;
const CART_PENDING_KEY = `dl-cart3-pending:${TABLE || "local"}:${GROUP}`;
const ORDER_PENDING_KEY = `dl-order-pending:${TABLE || "local"}:${GROUP}`;
const NOTE_KEY = `dl-note:${TABLE || "local"}`;
let deviceId = localStorage.getItem("dl-device-id");
if (!deviceId) { deviceId = requestId(); localStorage.setItem("dl-device-id", deviceId); }
let serverCart = { items: [], note: null, opIds: [], orders: [], revision: 0 };
let pendingCartOps = [], cartFlushPromise = null, cartPollBusy = false, cartRetryTimer = 0, syncWarned = false, cartHasSynced = false, noteDraft = null, noteTimer = 0;
if (SHARED_CART) {
  try { serverCart = { ...serverCart, ...JSON.parse(localStorage.getItem(CART_CACHE_KEY) || "{}") }; } catch {}
  try { pendingCartOps = JSON.parse(localStorage.getItem(CART_PENDING_KEY) || "[]"); } catch {}
  try { pendingOrder = JSON.parse(localStorage.getItem(ORDER_PENDING_KEY) || "null"); } catch {}
} else {
  try { JSON.parse(localStorage.getItem("dl-cart2") || "[]").forEach(x => cart.set(x.k, x.v)); } catch {}
}
const applyCartDelta = (target, id, style, delta) => {
  const key = keyOf(id, style), current = target.get(key) || { id, style: style || null, qty: 0 };
  current.qty = Math.max(0, current.qty + delta);
  if (current.qty) target.set(key, current); else target.delete(key);
};
function currentCartNote() {
  if (pendingOrder) return pendingOrder.note || "";
  if (noteDraft !== null) return noteDraft;
  const acknowledged = new Set(serverCart.opIds || []);
  const localNote = pendingCartOps.filter(op => op.kind === "note" && !acknowledged.has(op.opId)).at(-1);
  return localNote ? localNote.note : (SHARED_CART ? serverCart.note || "" : localStorage.getItem(NOTE_KEY) || "");
}
function rememberPendingOrder(order) {
  pendingOrder = order;
  if (SHARED_CART) {
    if (order) localStorage.setItem(ORDER_PENDING_KEY, JSON.stringify(order));
    else localStorage.removeItem(ORDER_PENDING_KEY);
  }
}
function recordPastOrder(order) {
  const past = JSON.parse(localStorage.getItem("dl-orders") || "[]");
  if (!past.some(item => item.id === order.id)) past.push(order);
  localStorage.setItem("dl-orders", JSON.stringify(past));
}
function persistCartState() {
  if (SHARED_CART) {
    localStorage.setItem(CART_CACHE_KEY, JSON.stringify(serverCart));
    localStorage.setItem(CART_PENDING_KEY, JSON.stringify(pendingCartOps));
  } else localStorage.setItem("dl-cart2", JSON.stringify([...cart].map(([k, v]) => ({ k, v }))));
}
function rebuildSharedCart() {
  if (!SHARED_CART) return;
  cart.clear();
  if (pendingOrder) {
    for (const item of pendingOrder.items || []) if (item.qty > 0) cart.set(keyOf(item.id, item.style), { id: item.id, style: item.style || null, qty: item.qty });
    persistCartState(); syncRail(); syncMarks();
    return;
  }
  for (const item of serverCart.items || []) if (item.qty > 0) cart.set(keyOf(item.id, item.style), { id: item.id, style: item.style || null, qty: item.qty });
  const acknowledged = new Set(serverCart.opIds || []);
  for (const operation of pendingCartOps) if (operation.kind === "delta" && !acknowledged.has(operation.opId)) applyCartDelta(cart, operation.dishId, operation.style, operation.delta);
  persistCartState(); syncRail(); syncMarks();
}
const cartCount = () => [...cart.values()].reduce((a, b) => a + b.qty, 0);
const cartTotal = () => [...cart.values()].reduce((a, v) => a + (dishById(v.id)?.price || 0) * v.qty, 0);
const qtyForDish = id => [...cart.values()].filter(v => v.id === id).reduce((a, b) => a + b.qty, 0);
function reportCartSyncFailure() {
  if (!syncWarned) { syncWarned = true; toast(L().cartSyncFailed); }
}
function queueCartOperation(operation) {
  pendingCartOps.push({ opId: requestId(), deviceId, table: TABLE, group: GROUP, ...operation });
  rememberPendingOrder(null); rebuildSharedCart();
  flushCartOps().catch(reportCartSyncFailure);
}
function addToCart(id, style, n = 1) {
  if (SHARED_CART) return queueCartOperation({ kind: "delta", dishId: id, style: style || null, delta: n });
  applyCartDelta(cart, id, style, n); rememberPendingOrder(null); persistCartState(); syncRail(); syncMarks();
}
function flushCartOps() {
  if (!SHARED_CART || !pendingCartOps.length) return Promise.resolve();
  if (cartFlushPromise) return cartFlushPromise;
  clearTimeout(cartRetryTimer);
  cartFlushPromise = (async () => {
    while (pendingCartOps.length) {
      const operation = pendingCartOps[0];
      const res = await fetch("/api/cart", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(operation) });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || !out.ok) throw new Error(out.error || `HTTP ${res.status}`);
      serverCart = out.cart; pendingCartOps = pendingCartOps.filter(op => op.opId !== operation.opId); syncWarned = false; rebuildSharedCart();
    }
  })().finally(() => {
    cartFlushPromise = null;
    if (pendingCartOps.length) cartRetryTimer = setTimeout(() => flushCartOps().catch(reportCartSyncFailure), 1800);
  });
  return cartFlushPromise;
}
async function syncSharedCart() {
  if (!SHARED_CART || cartPollBusy) return;
  cartPollBusy = true;
  try {
    const version = serverCart.version ? `&version=${encodeURIComponent(serverCart.version)}` : "";
    const res = await fetch(`/api/cart?table=${encodeURIComponent(TABLE)}&group=${encodeURIComponent(GROUP)}${version}`, { cache: "no-store" });
    const out = await res.json().catch(() => ({}));
    if (!res.ok || !out.ok) throw new Error(out.error || `HTTP ${res.status}`);
    if (!out.cart?.unchanged) {
      const remoteChanged = cartHasSynced && serverCart.version && out.cart.version !== serverCart.version;
      serverCart = out.cart;
      const confirmed = pendingOrder && (serverCart.orders || []).find(order => order.id === pendingOrder.id);
      if (confirmed) { recordPastOrder(confirmed); rememberPendingOrder(null); toast(L().orderRecovered); }
      rebuildSharedCart();
      if (remoteChanged && !confirmed) { toast(L().cartUpdated); pulse(); }
    }
    cartHasSynced = true;
    syncWarned = false;
  } catch { reportCartSyncFailure(); }
  finally { cartPollBusy = false; }
}
function commitNoteDraft() {
  clearTimeout(noteTimer);
  if (!SHARED_CART || noteDraft === null) return;
  const note = noteDraft; noteDraft = null; queueCartOperation({ kind: "note", note });
}

/* views */
const views = ["cover", "shop", "dish", "indexView"];
function show(name) { views.forEach(v => { $("#" + v).hidden = v !== name; }); if (name !== "dish") { request++; view?.dispose(); view = null; } if (name === "cover") mountCover(); else { coverView?.dispose?.(); coverView = null; } }

/* cover: the restaurant's own photograph of the featured dish, its reflection below — never altered */
let coverView = null;
/* The cover wants the most appetising real photograph we have, not the first one. */
const COVER_ORDER = ["red-oil-wontons", "xian-hot-oil-noodles", "hk-crab-roe-wonton"];
const coverDish = () => COVER_ORDER.map(dishById).find(d => d?.img && !d.soldOut)
  || MENU.find(x => x.img && !x.placeholder && x.featured) || MENU.find(x => x.img) || MENU[0];
async function mountCover() {
  if (coverView) return; coverView = { dispose() {} };
  const stage = $("#coverStage"); $$(".plate, canvas", stage).forEach(e => e.remove());
  const d = coverDish(); $("#coverDish").textContent = FLOATING ? `${secName(d.section)} · ${dName(d)}` : dName(d);
  if (LOOK_TABLE && d.img) {
    const mine = coverView;
    const { mountPhotoDepth3D } = await import("./photo3d.js?v=16");
    if (coverView !== mine) return;
    coverView = mountPhotoDepth3D(stage, { imageURL: imgURL(d.img, "l"), label: dName(d), table: { ...TABLE3D, reflect: 0 }, zoom: 1.75, onTap: () => openDish(d) });
    return;
  }
  if (FLOATING) {
    // one dish, large — a cover is a single statement, not a table of contents
    const el = document.createElement("div"); el.className = "plate fl-1";
    el.innerHTML = `<img src="${imgURL(d.img, "l")}" alt="${dName(d)}" fetchpriority="high">`;
    el.onclick = () => openDish(d);
    stage.appendChild(el);
    return;
  }
  const plate = document.createElement("div"); plate.className = "plate";
  plate.innerHTML = d.img ? `<img class="hero" src="${imgURL(d.img, "l")}" alt=""><img class="mirror" src="${imgURL(d.img, "l")}" alt="" aria-hidden="true">` : artFor(d);
  const hero = plate.querySelector(".hero"), ar = () => { if (hero?.naturalWidth) plate.style.setProperty("--ar", (hero.naturalWidth / hero.naturalHeight).toFixed(4)); };
  if (hero) { if (hero.complete) ar(); else hero.addEventListener("load", ar, { once: true }); }
  plate.onclick = () => openDish(d);
  stage.appendChild(plate);
}
$("#enterBtn").addEventListener("click", () => { haptic(); show("shop"); history.pushState({ v: "shop" }, "", "#menu"); });
/* Warm the 3D modules in the background once the menu is up, so the first dish page opens without a wait. */
let warmed = false;
function warm3D() { if (warmed) return; warmed = true; for (const href of ["vendor/three.module.js", "vendor/three.core.js", "photo3d.js?v=16", "table3d.js"]) { const l = document.createElement("link"); l.rel = "modulepreload"; l.href = href; document.head.appendChild(l); } }
(window.requestIdleCallback || (f => setTimeout(f, 1200)))(warm3D);
$("#toCover").addEventListener("click", e => { e.preventDefault(); show("cover"); history.pushState({}, "", location.pathname + location.search); });
$("#coverLang").addEventListener("click", () => toggleLang());
$("#coverBell").addEventListener("click", () => { haptic(); openWaiter(); });

/* shop */
let kind = "signature", diet = "all", query = "";
const matches = d => (diet !== "veg" || d.veg) && (diet !== "spicy" || d.spice >= 2) && (diet !== "noPork" || d.meat !== "pork")
  && (!query || d.name.toLowerCase().includes(query.toLowerCase()) || d.cn.includes(query));
const mark = d => d.soldOut ? "" : qtyForDish(d.id) ? `<button class="qty" data-add="${d.id}">${qtyForDish(d.id)}</button>` : `<button class="add" data-add="${d.id}" aria-label="${L().addToSteamer}">+</button>`;
const tags = d => [d.best ? L().bestSeller : d.chef ? L().chefsChoice : null, d.spice >= 2 ? `<i class="sp">${"•".repeat(Math.min(d.spice, 3))}</i>` : null].filter(Boolean).map(t => `<span>${t}</span>`).join("");
const priceLine = d => `<div class="pr"><b>${d.soldOut ? L().soldOut : fmt(d.price)}</b>${tags(d)}</div>`;
/* Two dishes to a row. A photographed dish shows its photograph; one without
   a photograph shows its name set large in the same square — never a drawing. */
const rowHTML = (d, i = -1) => `<div class="row dish${d.soldOut ? " sold" : ""}" data-id="${d.id}" role="button" tabindex="0">
    <div class="txt"><div class="nm">${i >= 0 ? no(i) : ""}${dName(d)}</div><div class="en">${dOther(d)}</div></div>
    <div class="side">${priceLine(d)}${mark(d)}</div>
  </div>`;
const no = i => `<span class="no">${String(i + 1).padStart(2, "0")}</span>`;
const tileHTML = (d, i = -1) => `<div class="tile dish${d.soldOut ? " sold" : ""}${d.img ? " has-pic" : ""}${d.placeholder ? " is-ph" : ""}" data-id="${d.id}" role="button" tabindex="0">
    <div class="art">${d.img ? `<img src="${imgURL(d.img, "s")}" alt="" loading="lazy">` : `<span class="word">${dName(d)}</span>`}${d.placeholder ? `<span class="ph">${L().placeholder}</span>` : ""}${mark(d)}</div>
    <div class="cap">${i >= 0 ? no(i) : ""}${d.img ? `<div class="nm">${dName(d)}</div>` : ""}<div class="en">${dOther(d)}</div>${priceLine(d)}</div>
  </div>`;
function renderKinds() {
  $("#kinds").innerHTML = chapters.map(s => `<button data-kind="${s}" class="${kind === s ? "on" : ""}">${secName(s)}</button>`).join("");
  $$("#kinds button").forEach(b => b.onclick = () => { kind = b.dataset.kind; haptic(); renderKinds(); scrollToKind(kind); });
  $("#diet").innerHTML = [["all", L().fAll], ["veg", L().fVeg], ["spicy", L().fSpicy], ["noPork", L().fNoPork]].map(([m, t]) => `<button data-d="${m}" class="${diet === m ? "on" : ""}">${t}</button>`).join("");
  $$("#diet button").forEach(b => b.onclick = () => { diet = b.dataset.d; haptic(); renderKinds(); renderList(); });
  centreKind();
}
function centreKind() { const k = $("#kinds"), b = $("#kinds .on"); if (!b) return; k.scrollTo({ left: b.offsetLeft - (k.clientWidth - b.offsetWidth) / 2, behavior: "smooth" }); }
function renderList() {
  let html = ""; let total = 0;
  for (const sec of chapters) {
    const list = MENU.filter(d => d.section === sec && matches(d)); if (!list.length) continue; total += list.length;
    if (FLOATING) {
      const photos = list.filter(d => d.img), rest = list.filter(d => !d.img);
      html += `<section class="section" data-sec="${sec}"><h2>${secName(sec)}<span class="en">${secOther(sec)}</span><span class="count">${String(list.length).padStart(2, "0")}</span></h2><div class="section-body">${photos.length ? `<div class="grid photos">${photos.map((d, i) => tileHTML(d, i)).join("")}</div>` : ""}${rest.length ? `<div class="rows">${rest.map((d, i) => rowHTML(d, photos.length + i)).join("")}</div>` : ""}</div></section>`;
    } else html += `<section class="section" data-sec="${sec}"><h2>${secName(sec)}<span class="en">${secOther(sec)}</span></h2><div class="grid">${list.map(tileHTML).join("")}</div></section>`;
  }
  $("#list").innerHTML = html; $("#empty").hidden = total > 0; $("#empty").textContent = L().noResults;
}
function scrollToKind(s) { const el = $(`.section[data-sec="${s}"]`); if (!el) return; const top = el.offsetTop - 110; $("#shop").scrollTo({ top, behavior: "smooth" }); }
$("#shop").addEventListener("scroll", () => {
  let cur = kind; $$(".section").forEach(sec => { if (sec.getBoundingClientRect().top < 140) cur = sec.dataset.sec; });
  if (cur !== kind) { kind = cur; $$("#kinds button").forEach(b => b.classList.toggle("on", b.dataset.kind === cur)); centreKind(); }
}, { passive: true });
function syncMarks() { $$(".dish").forEach(el => { const d = dishById(el.dataset.id); const cur = el.querySelector("[data-add]"); if (!d || !cur) return; const t = document.createElement("template"); t.innerHTML = mark(d); const next = t.content.firstElementChild; if (next && (next.className !== cur.className || next.textContent !== cur.textContent)) cur.replaceWith(next); }); }
$("#list").addEventListener("click", e => {
  const add = e.target.closest("[data-add]");
  if (add) { e.stopPropagation(); const d = dishById(add.dataset.add); if (!d) return; if (d.styles) { openDish(d); return; } addToCart(d.id, null, 1); toast(L().added(dName(d))); pulse(); haptic(); return; }
  const el = e.target.closest(".dish"); if (el) openDish(dishById(el.dataset.id));
});
/* Index: the whole menu on one screen, the way a regular reads it — numbered
   lines, no pictures, tap to jump straight to the dish. */
function renderIndex() {
  $("#indexTitle").textContent = L().indexTitle;
  $("#indexCount").textContent = `${MENU.length}`;
  $("#indexBody").innerHTML = chapters.map(sec => {
    const list = MENU.filter(d => d.section === sec);
    if (!list.length) return "";
    return `<section class="ix-sec"><h2>${secName(sec)}<span class="en">${secOther(sec)}</span></h2>${list.map((d, i) => `<div class="ix-row dish${d.soldOut ? " sold" : ""}" data-id="${d.id}" role="button" tabindex="0"><span class="no">${String(i + 1).padStart(2, "0")}</span><span class="nm">${dName(d)}</span><span class="pr">${d.soldOut ? L().soldOut : fmt(d.price)}</span></div>`).join("")}</section>`;
  }).join("");
}
function openIndex() { haptic(); renderIndex(); show("indexView"); $("#indexView").scrollTop = 0; history.pushState({ v: "index" }, "", "#index"); }
$("#indexBtn").addEventListener("click", openIndex);
$("#indexClose").addEventListener("click", () => { show("shop"); history.pushState({ v: "shop" }, "", "#menu"); });
$("#indexBody").addEventListener("click", e => { const el = e.target.closest(".ix-row"); if (el) openDish(dishById(el.dataset.id)); });
$("#findBtn").addEventListener("click", () => { const f = $("#find"); f.hidden = !f.hidden; if (!f.hidden) $("#search").focus(); else { $("#search").value = ""; query = ""; diet = "all"; renderKinds(); renderList(); } });
let searchT; $("#search").addEventListener("input", e => { clearTimeout(searchT); searchT = setTimeout(() => { query = e.target.value.trim(); renderList(); }, 120); });

/* dish */
let sheetDish = null, sheetQty = 1, sheetStyle = null, view = null, request = 0, shopScroll = 0;
function openDish(d) { if (!d || d.soldOut) return; sheetDish = d; sheetQty = 1; sheetStyle = d.styles ? d.styles[0] : null; haptic(); shopScroll = $("#shop").scrollTop; renderSheet(); show("dish"); $("#dish").scrollTop = 0; if (location.hash !== `#${d.id}`) history.pushState({ dish: d.id }, "", `#${d.id}`); }
function closeSheet() { show("shop"); $("#shop").scrollTop = shopScroll; if (location.hash && location.hash !== "#menu") history.pushState({ v: "shop" }, "", "#menu"); }
addEventListener("popstate", () => { const h = location.hash.slice(1); const d = h && dishById(h); if (d) { if ($("#dish").hidden || sheetDish?.id !== d.id) openDish(d); } else if (h === "index") { renderIndex(); show("indexView"); } else if (h === "menu") show("shop"); else show("cover"); });
function renderSheet() {
  view?.dispose(); view = null; const d = sheetDish; const spatial = Boolean(d.model || d.img);
  $("#dishCrumb").textContent = secName(d.section);
  $("#dish").classList.toggle("has-pic", spatial);   // a table only where a dish sits on it
  const meta = [], facts = [];
  if (d.pieces) facts.push([L().pieces, `${d.pieces}<em>${lang === "zh" ? "只" : "pc"}</em>`, 0]);
  if (d.spice) facts.push([L().spice, L().spiceLevels[d.spice], d.spice / 4]);
  if (d.allergens?.length) facts.push([L().allergens, d.allergens.map(allergen).join(" · "), 0]);
  if (d.pieces) meta.push(`${d.pieces} ${L().pieces}`);
  if (d.spice) meta.push(`${L().spice} ${"•".repeat(Math.min(d.spice, 3))} ${L().spiceLevels[d.spice]}`);
  if (d.allergens?.length) meta.push(`${L().allergens}: ${d.allergens.map(allergen).join(" · ")}`);
  $("#sheetBody").innerHTML = `
    ${spatial ? `<div class="d-pic"><div class="dglow"></div><span class="ground"></span><div class="three-stage" id="threeStage"></div><div class="d-art-object">${d.img ? `<img src="${imgURL(d.img, "l")}" alt="${dName(d)}" draggable="false">` : artFor(d)}</div>
      ${d.model ? `<span class="drag-hint"><svg viewBox="0 0 20 20"><path d="M3.4 8a6.8 6.8 0 0 1 13.2 0"/><path d="M2.6 10.6 3.4 8l2.6.9M17.4 10.6 16.6 8 14 8.9"/></svg>${lang === "zh" ? "拖动旋转 · 双指缩放" : "Drag to rotate · pinch to zoom"}</span>` : ""}</div>` : ""}
    <div class="d-body${spatial ? "" : " plain"}">
      <div class="d-strip">${(FLOATING ? [secName(d.section), ...((d.best || d.chef) ? [d.best ? L().bestSeller : L().chefsChoice] : d.placeholder ? [L().placeholder] : [])] : [...((d.best || d.chef) ? [d.best ? L().bestSeller : L().chefsChoice] : []), ...meta]).map((m, i) => `<span class="m${i ? " dim" : ""}">${m}</span>`).join("")}</div>
      <h1 class="d-name">${dName(d)}</h1><div class="d-en m">${dOther(d)}</div>
      <div class="d-price">${FLOATING ? `<small>S$</small>${Number.isInteger(d.price) ? d.price : d.price.toFixed(2)}` : fmt(d.price)}</div>
      ${dFlavor(d) ? `<p class="d-flavor">${dFlavor(d)}</p>` : ""}
      ${FLOATING && facts.length ? `<div class="facts-head m">${lang === "zh" ? "分析" : "Analysis"}</div><div class="facts">${facts.map(([k, v, p]) => `<div class="fact"><span class="k">${k}</span><span class="v">${v}</span>${p ? `<span class="prog" style="width:${Math.round(p * 100)}%"></span>` : ""}</div>`).join("")}</div>` : ""}
      ${FLOATING ? `<div class="d-foot"><div><span class="k">${lang === "zh" ? "分量" : "Serves"}</span><span class="v">${d.pieces ? `${d.pieces}${lang === "zh" ? " 只" : " pc"}` : (lang === "zh" ? "一份" : "One")}</span></div><div><span class="k">${lang === "zh" ? "出餐" : "Ready in"}</span><span class="v">${lang === "zh" ? "12–15 分钟" : "12–15 min"}</span></div><div><span class="k">${lang === "zh" ? "桌号" : "Table"}</span><span class="v">${TABLE || "—"}</span></div></div>` : ""}
      ${d.styles ? `<div class="m" style="margin-top:18px">${L().pickStyle}</div><div class="styles">${d.styles.map(s => `<button class="style-opt${s === sheetStyle ? " on" : ""}" data-s="${s}">${styleLabel(s)}</button>`).join("")}</div>` : ""}
    </div>`;
  $("#qn").textContent = sheetQty; $("#dAddLabel").textContent = L().addToSteamer; $("#dTotal").textContent = fmt(d.price * sheetQty);
  $$(".style-opt").forEach(b => b.onclick = () => { sheetStyle = b.dataset.s; renderSheet(); haptic(); });
  mountStage();
}
function syncSheet() { $("#qn").textContent = sheetQty; $("#dTotal").textContent = fmt(sheetDish.price * sheetQty); }
$("#qm").addEventListener("click", () => { if (sheetQty > 1) { sheetQty--; syncSheet(); haptic(); } });
$("#qp").addEventListener("click", () => { sheetQty++; syncSheet(); haptic(); });
$("#dAdd").addEventListener("click", () => { const d = sheetDish; addToCart(d.id, sheetStyle, sheetQty); toast(L().added(dName(d) + (sheetStyle ? ` · ${styleLabel(sheetStyle)}` : ""))); pulse(); closeSheet(); });
$("#sheetClose").addEventListener("click", closeSheet); $("#dishCart").addEventListener("click", () => { haptic(); openTicket(); });
async function mountStage() {
  const d = sheetDish, stage = $("#threeStage"); if (!stage) return;
  const req = ++request, pic = stage.closest(".d-pic");
  const modelURL = d.model ? `models/production/${d.model}` : null, imageURL = d.img ? imgURL(d.img, "l") : null;
  const opts = { label: dName(d), idle: false,
    onReady: box => { if (req !== request || !stage.isConnected) return;
      const img = pic.querySelector(".d-art-object img");
      const fit = () => { if (!box || !img || !img.naturalWidth) return; const s = stage.getBoundingClientRect(), el = img.getBoundingClientRect(), pr = pic.getBoundingClientRect(); const ratio = Math.min(el.width / img.naturalWidth, el.height / img.naturalHeight), scale = box.width / (img.naturalWidth * ratio); const tx = (s.left - pr.left + box.left + box.width / 2) - (el.left - pr.left + el.width / 2), ty = (s.top - pr.top + box.top + box.height / 2) - (el.top - pr.top + el.height / 2); img.style.transform = `translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px) scale(${scale.toFixed(3)})`; };
      /* Where the dish actually sits on screen: its ground shadow goes under it and the table's horizon through it. */
      const rectOf = () => { const pr = pic.getBoundingClientRect(); if (box) { const s = stage.getBoundingClientRect(); return { left: s.left - pr.left + box.left, top: s.top - pr.top + box.top, width: box.width, height: box.height }; } if (!img || !img.naturalWidth) return null; const el = stage.getBoundingClientRect(); const r = Math.min(el.width / img.naturalWidth, el.height / img.naturalHeight), w = img.naturalWidth * r, h = img.naturalHeight * r; return { left: el.left - pr.left + (el.width - w) / 2, top: el.top - pr.top + (el.height - h) / 2, width: w, height: h }; };
      const settle = () => { const r = rectOf(), ground = pic.querySelector(".ground"); if (!r || !ground) return; ground.style.cssText = `left:${(r.left + r.width / 2).toFixed(1)}px;top:${(r.top + r.height * .94).toFixed(1)}px;width:${(r.width * .92).toFixed(1)}px;height:${(r.height * .22).toFixed(1)}px;bottom:auto;transform:translate(-50%,-50%)`; pic.style.setProperty("--horizon", `${(r.top + r.height * .55).toFixed(1)}px`);
        // the red table: the photograph's reflection under it, and the model's reflection faded with distance
        const mirror = pic.querySelector(".d-pic > .mirror, .mirror"); if (mirror) mirror.style.cssText = `left:${r.left.toFixed(1)}px;top:${(r.top + r.height).toFixed(1)}px;width:${r.width.toFixed(1)}px;height:${r.height.toFixed(1)}px`;
      };
      const ready = () => { fit(); settle(); };
      if (img) { if (img.complete && img.naturalWidth) ready(); else img.addEventListener("load", ready, { once: true }); }
      if (!modelURL) {
        const photoFirst = LOOK === "showa";
        pic.style.setProperty("--photo", photoFirst ? 1 : 0); pic.style.setProperty("--model", photoFirst ? 0 : 1); pic.dataset.photo = photoFirst ? "1" : "0";
      }
      else if (LOOK_TABLE) { pic.style.setProperty("--photo", 1); pic.style.setProperty("--model", 1); pic.dataset.photo = "1"; setTimeout(() => { if (req === request) view?.setDishVisible?.(false); }, 0); }
      pic.classList.add(modelURL || LOOK === "showa" ? "ready-3d" : "showing-3d"); },
    /* The photograph stays on top until the dish is actually turned; then it hands over to the
       model (which carries the same photo projected onto it) across the first few degrees. */
    onFirstTouch: () => { if (req !== request) return; pic.classList.add("showing-3d"); if (!modelURL) { pic.style.setProperty("--photo", 0); pic.style.setProperty("--model", 1); } },
    /* Either the photograph or the model — never a blend left on screen: past a few degrees the
       model takes over (a quick fade), and when the dish comes back to rest the photograph returns. */
    onPose: ({ turn }) => { if (req !== request) return; const photo = turn > .06 ? 0 : 1; if (pic.dataset.photo === String(photo)) return; pic.dataset.photo = photo; pic.style.setProperty("--photo", photo); pic.style.setProperty("--mirror", photo); pic.style.setProperty("--model", LOOK_TABLE ? 1 : 1 - photo); if (LOOK_TABLE) view?.setDishVisible?.(!photo); },
    onError: () => { if (req === request) { pic.classList.remove("showing-3d", "ready-3d"); stage.remove(); } } };
  try {
    if (modelURL) { const { mountGeneratedDish3D } = await import("./model3d.js?v=23"); if (req !== request) return; view = mountGeneratedDish3D(stage, { ...opts, modelURL, photoURL: imageURL, contactShadow: !LOOK_TABLE ? false : true, table: LOOK_TABLE ? TABLE3D : null, zoom: LOOK_TABLE ? 1.5 : undefined, snapBack: .32 }); }
    else if (imageURL) { const { mountPhotoDepth3D } = await import("./photo3d.js?v=16"); if (req !== request) return; view = mountPhotoDepth3D(stage, { ...opts, imageURL, table: LOOK_TABLE ? { ...TABLE3D, reflect: 0 } : null, zoom: LOOK_TABLE ? 1.5 : 1.3 }); }
  } catch { stage.remove(); }
}

/* ticket */
function pulse() { const b = $("#rail"); b.classList.add("pulse"); clearTimeout(pulse.t); pulse.t = setTimeout(() => b.classList.remove("pulse"), 160); }
function syncRail() { const n = cartCount(), ordered = (serverCart.orders || []).length; $("#rail").hidden = (!n && !ordered) || !$("#cover").hidden; $("#cartCount").textContent = n; $("#cartCount").hidden = !n; $("#railTotal").textContent = n ? fmt(cartTotal()) : ""; $("#railLabel").textContent = n ? L().viewCart : L().historyTitle; if (!$("#cart").hidden) renderTicket(); }
function openTicket() { $("#toast").classList.remove("show"); renderTicket(); $("#cartScrim").hidden = false; $("#cart").hidden = false; requestAnimationFrame(() => { $("#cartScrim").classList.add("open"); $("#cart").classList.add("open"); }); }
function closeTicket() { $("#cartScrim").classList.remove("open"); $("#cart").classList.remove("open"); setTimeout(() => { $("#cartScrim").hidden = true; $("#cart").hidden = true; }, 450); }
const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
function renderOrderHistory() {
  const orders = serverCart.orders || [], history = $("#orderHistory");
  if (!orders.length) { history.innerHTML = ""; return; }
  history.innerHTML = `<section class="order-history"><h3>${L().historyTitle}</h3>${[...orders].reverse().map(order => {
    const time = new Date(order.at).toLocaleTimeString(lang === "zh" ? "zh-CN" : "en-SG", { hour: "2-digit", minute: "2-digit" });
    const lines = (order.items || []).map(item => `<div><span>${escapeHTML(lang === "zh" ? item.name : (dishById(item.id)?.name || item.name))}${item.style ? ` · ${escapeHTML(styleLabel(item.style))}` : ""} ×${item.qty}</span><b>${fmt(item.price * item.qty)}</b></div>`).join("");
    return `<article><header><strong>${escapeHTML(L().historyOrder(order.no, time))}</strong><span>${fmt(order.total || 0)}</span></header>${lines}${order.note ? `<p>${escapeHTML(L().noteLabel)}：${escapeHTML(order.note)}</p>` : ""}</article>`;
  }).join("")}</section>`;
}
function renderTicket() {
  const n = cartCount(); $("#cartSub").textContent = TABLE ? L().cartScope(n, TABLE, GROUP) : (n ? L().cartSub(n, TABLE) : "");
  $("#groupAction").textContent = GROUP === "A" ? L().separateGroup : L().shareGroup(GROUP);
  renderOrderHistory();
  if (!n) { $("#cartItems").innerHTML = `<div class="cart-empty">${(serverCart.orders || []).length ? L().emptyPending : L().emptyCart}</div>`; $("#cartTotals").innerHTML = ""; $("#placeOrder").hidden = true; $("#noteWrap").hidden = true; return; }
  $("#placeOrder").hidden = false; $("#noteWrap").hidden = false;
  $("#cartItems").innerHTML = [...cart].map(([k, v]) => { const d = dishById(v.id); if (!d) return ""; return `<div class="cart-line" data-k="${k}"><div class="th">${d.img ? `<img src="${imgURL(d.img, "s")}" alt="">` : ""}</div><div class="info"><div class="nm">${dName(d)}</div><div class="sub">${v.style ? `${styleLabel(v.style)} · ` : ""}${fmt(d.price)}</div></div><div class="stepper"><button data-d="-1">−</button><b>${v.qty}</b><button data-d="1">+</button></div></div>`; }).join("");
  $$("#cartItems .stepper button").forEach(b => b.onclick = () => { const k = b.closest(".cart-line").dataset.k, v = cart.get(k); if (!v) return; addToCart(v.id, v.style, Number(b.dataset.d)); haptic(); renderTicket(); });
  $("#cartTotals").innerHTML = `<div class="rowt"><span>${L().total}</span><b>${fmt(cartTotal())}</b></div>`;
  $("#orderTotal").textContent = fmt(cartTotal());
  if (document.activeElement !== $("#note")) $("#note").value = currentCartNote();
}
$("#rail").addEventListener("click", () => { haptic(); openTicket(); });
$("#cartBar").addEventListener("click", () => openTicket());
$("#cartScrim").addEventListener("click", closeTicket); $("#cartClose").addEventListener("click", closeTicket);
$("#note").addEventListener("input", e => {
  rememberPendingOrder(null);
  if (!SHARED_CART) return localStorage.setItem(NOTE_KEY, e.target.value);
  noteDraft = e.target.value; clearTimeout(noteTimer); noteTimer = setTimeout(commitNoteDraft, 420);
});
$("#placeOrder").addEventListener("click", async () => {
  if (!TABLE) return toast(lang === "zh" ? "请扫描桌上带桌号的二维码。" : "Please scan the table QR code before ordering.");
  if ((!cartCount() && !pendingOrder) || $("#placeOrder").disabled) return;
  $("#placeOrder").disabled = true; $("#orderLabel").textContent = L().orderSending;
  try {
    commitNoteDraft(); await flushCartOps(); await syncSharedCart();
    if (!pendingOrder) {
      if (!cartCount() || !(serverCart.opIds || []).length) throw new Error(lang === "zh" ? "购物车已被同桌其他人结算" : "This cart was already checked out");
      rememberPendingOrder({
        requestId: requestId(), table: TABLE, group: GROUP, no: String(Math.floor(1000 + Math.random() * 9000)),
        items: [...cart.values()].map(v => ({ ...v })), note: currentCartNote().trim() || null,
        cartOpIds: [...serverCart.opIds],
      });
    }
    const order = pendingOrder;
    const res = await fetch("/api/order", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(order) });
    const out = await res.json().catch(() => ({}));
    if (!res.ok || !out.ok) { const error = new Error(out.error || `HTTP ${res.status}`); error.status = res.status; throw error; }
    const saved = out.order || order;
    recordPastOrder(saved);
    rememberPendingOrder(null); serverCart = out.cart || { items: [], note: null, opIds: [], orders: [], revision: 0 }; rebuildSharedCart(); closeTicket();
    $("#doneNote").textContent = L().orderNote(TABLE, saved.no); $("#done").hidden = false; haptic(true);
  } catch (error) {
    if (error.status === 409) rememberPendingOrder(null);
    console.warn("Order failed:", error.message); await syncSharedCart(); toast(error.message || L().orderFailed);
  } finally {
    $("#placeOrder").disabled = false; $("#orderLabel").textContent = L().order;
  }
});
$("#doneBack").addEventListener("click", () => { $("#done").hidden = true; });
$("#groupAction").addEventListener("click", async () => {
  if (GROUP === "A") {
    const url = new URL(location.href), group = `P${requestId().replace(/-/g, "").slice(0, 5)}`.toUpperCase();
    url.searchParams.set("group", group); location.assign(url);
    return;
  }
  const share = { title: "Dumpling Lab", text: L().shareGroupText(TABLE, GROUP), url: location.href };
  try {
    if (navigator.share) await navigator.share(share);
    else { await navigator.clipboard.writeText(location.href); toast(L().groupLinkCopied); }
  } catch (error) { if (error.name !== "AbortError") toast(L().groupShareFailed); }
});

/* waiter */
let waiterReason = null;
const ICONS = { water: '<svg viewBox="0 0 24 24"><path d="M7 4h10l-1.2 15a1.5 1.5 0 0 1-1.5 1.4H9.7A1.5 1.5 0 0 1 8.2 19L7 4Z"/><path d="M8 11h8"/></svg>', cutlery: '<svg viewBox="0 0 24 24"><path d="M7 3v18M5 3v5a2 2 0 0 0 4 0V3M17 3c-2 0-3 3-3 6s1 3 3 3v9"/></svg>', bill: '<svg viewBox="0 0 24 24"><path d="M6 3h12v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21V3Z"/><path d="M9 8h6M9 12h6"/></svg>', help: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17h.01"/></svg>' };
function renderReasons() { $("#reasons").innerHTML = Object.entries(L().reasons).map(([k, t]) => `<button class="reason${waiterReason === k ? " on" : ""}" data-r="${k}">${ICONS[k]}<span>${t}</span></button>`).join(""); $$(".reason").forEach(b => b.onclick = () => { waiterReason = b.dataset.r; haptic(); renderReasons(); $("#waiterSend").disabled = false; }); }
function openWaiter() { waiterReason = null; renderReasons(); $("#waiterSend").disabled = true; $("#waiterScrim").hidden = false; $("#waiterSheet").hidden = false; requestAnimationFrame(() => { $("#waiterScrim").classList.add("open"); $("#waiterSheet").classList.add("open"); }); }
function closeWaiter() { $("#waiterScrim").classList.remove("open"); $("#waiterSheet").classList.remove("open"); setTimeout(() => { $("#waiterScrim").hidden = true; $("#waiterSheet").hidden = true; }, 450); }
$("#bellBtn").addEventListener("click", () => { haptic(); openWaiter(); }); $("#callWaiter").addEventListener("click", () => { closeTicket(); setTimeout(openWaiter, 250); });
$("#waiterScrim").addEventListener("click", closeWaiter);
$("#waiterSend").addEventListener("click", async () => {
  if (!TABLE) return toast(lang === "zh" ? "请扫描桌上带桌号的二维码。" : "Please scan the table QR code first.");
  const label = waiterReason ? L().reasons[waiterReason] : null;
  if (!label || $("#waiterSend").disabled) return;
  $("#waiterSend").disabled = true; $("#waiterSend").textContent = L().waiterSending;
  try {
    const res = await fetch("/api/call", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ requestId: requestId(), table: TABLE, group: GROUP, reason: label }) });
    const out = await res.json().catch(() => ({}));
    if (!res.ok || !out.ok) throw new Error(out.error || `HTTP ${res.status}`);
    haptic(true); closeWaiter(); toast(L().waiterSent(label));
  } catch (error) {
    console.warn("Staff call failed:", error.message); toast(L().waiterFailed);
  } finally {
    $("#waiterSend").disabled = false; $("#waiterSend").textContent = L().waiterSend;
  }
});

/* copy */
function renderStatic() {
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  $("#enterBtn").textContent = lang === "zh" ? "点餐" : "Order"; $("#coverBellLabel").textContent = L().waiter; $("#coverLang").textContent = lang === "zh" ? "EN" : "中文";
  $("#coverLine").textContent = L().coverLine;
  $("#coverTable").textContent = TABLE ? (lang === "zh" ? `${TABLE}号桌 · 现点现做` : `Table ${TABLE} · Cooked to order`) : (lang === "zh" ? "现点现做" : "Cooked to order");
  $("#slipTable").textContent = TABLE ? (lang === "zh" ? `${TABLE}号桌` : `Table ${TABLE}`) : "";
  $("#tableTag").textContent = TABLE ? (lang === "zh" ? `${TABLE}号桌${GROUP === "A" ? "" : ` · ${GROUP}组`}` : `TABLE ${TABLE}${GROUP === "A" ? "" : ` · ${GROUP}`}`) : "";
  $("#introKicker").textContent = L().menuKicker(TABLE, GROUP);
  $("#introTitle").textContent = L().menuIntro;
  $("#introCopy").textContent = L().menuIntroCopy;
  $("#langBtn").textContent = lang === "zh" ? "EN" : "中文"; $("#search").placeholder = L().search;
  $("#heroSub").textContent = L().tagline;
  $("#cartTitle").textContent = L().steamer; $("#noteLabel").textContent = L().noteLabel; $("#note").placeholder = L().notePlaceholder; $("#orderLabel").textContent = L().order; $("#waiterLabel").textContent = L().waiter;
  $("#doneTitle").textContent = L().ordered; $("#doneBack").textContent = L().back;
  $("#waiterTitle").textContent = L().waiterTitle; $("#waiterSub").textContent = L().waiterSub(TABLE); $("#waiterSend").textContent = L().waiterSend; $("#bellBtn").setAttribute("aria-label", L().waiter);
}
let toastT; function toast(msg) { const el = $("#toast"); el.textContent = msg; el.hidden = false; requestAnimationFrame(() => el.classList.add("show")); clearTimeout(toastT); toastT = setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.hidden = true, 300); }, 1800); }
function toggleLang() { lang = lang === "zh" ? "en" : "zh"; localStorage.setItem("dl-lang", lang); haptic(); renderAll(); }
$("#langBtn").addEventListener("click", toggleLang);
addEventListener("keydown", e => { if (e.key === "Escape") { if (!$("#cart").hidden) closeTicket(); else if (!$("#waiterSheet").hidden) closeWaiter(); else if (!$("#dish").hidden) closeSheet(); } });
function renderAll() { renderStatic(); renderKinds(); renderList(); syncRail(); syncMarks(); if (!$("#dish").hidden && sheetDish) renderSheet(); if (!$("#cover").hidden) { coverView?.dispose?.(); coverView = null; mountCover(); } }
renderAll();
if (SHARED_CART) {
  rebuildSharedCart();
  flushCartOps().catch(reportCartSyncFailure);
  syncSharedCart();
  setInterval(() => { if (!document.hidden) syncSharedCart(); }, 1200);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) syncSharedCart(); });
}
{ const h = location.hash.slice(1); const d = h && dishById(h); if (d) { show("shop"); openDish(d); } else if (h === "index") { renderIndex(); show("indexView"); } else if (h === "menu") show("shop"); else show("cover"); }
