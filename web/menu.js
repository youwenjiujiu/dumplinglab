/* Dumpling Lab — phone menu: cover → shop → dish → ticket. */
"use strict";
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const params = new URLSearchParams(location.search);
const TABLE = params.get("table");
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
try { JSON.parse(localStorage.getItem("dl-cart2") || "[]").forEach(x => cart.set(x.k, x.v)); } catch {}
const keyOf = (id, style) => style ? `${id}|${style}` : id;
const saveCart = () => localStorage.setItem("dl-cart2", JSON.stringify([...cart].map(([k, v]) => ({ k, v }))));
const cartCount = () => [...cart.values()].reduce((a, b) => a + b.qty, 0);
const cartTotal = () => [...cart.values()].reduce((a, v) => a + (dishById(v.id)?.price || 0) * v.qty, 0);
const qtyForDish = id => [...cart.values()].filter(v => v.id === id).reduce((a, b) => a + b.qty, 0);
function addToCart(id, style, n = 1) { const k = keyOf(id, style); const cur = cart.get(k) || { id, style: style || null, qty: 0 }; cur.qty += n; if (cur.qty <= 0) cart.delete(k); else cart.set(k, cur); saveCart(); syncRail(); syncMarks(); }

/* views */
const views = ["cover", "shop", "dish"];
function show(name) { views.forEach(v => { $("#" + v).hidden = v !== name; }); if (name !== "dish") { request++; view?.dispose(); view = null; } if (name === "cover") mountCover(); else coverView?.dispose(), coverView = null; }

/* cover */
let coverView = null;
async function mountCover() {
  if (coverView) return; coverView = { dispose() {} };
  const stage = $("#coverStage"); $$(".plate", stage).forEach(e => e.remove());
  const d = MENU.find(x => x.img && x.featured) || MENU.find(x => x.img) || MENU[0];
  $("#coverDish").textContent = `${dName(d)}`;
  const plate = document.createElement("div"); plate.className = "plate";
  plate.innerHTML = d.img ? `<img class="hero" src="img/${d.img}" alt=""><img class="mirror" src="img/${d.img}" alt="" aria-hidden="true">` : artFor(d);
  plate.onclick = () => openDish(d);
  stage.appendChild(plate);
}
$("#enterBtn").addEventListener("click", () => { haptic(); show("shop"); history.pushState({ v: "shop" }, "", "#menu"); });
$("#toCover").addEventListener("click", e => { e.preventDefault(); show("cover"); history.pushState({}, "", location.pathname + location.search); });
$("#coverLang").addEventListener("click", () => toggleLang());
$("#coverBell").addEventListener("click", () => { haptic(); openWaiter(); });

/* shop */
let kind = "signature", diet = "all", query = "";
const matches = d => (diet !== "veg" || d.veg) && (diet !== "spicy" || d.spice >= 2) && (diet !== "noPork" || d.meat !== "pork")
  && (!query || d.name.toLowerCase().includes(query.toLowerCase()) || d.cn.includes(query));
const mark = d => d.soldOut ? "" : qtyForDish(d.id) ? `<button class="qty" data-add="${d.id}">${qtyForDish(d.id)}</button>` : `<button class="add" data-add="${d.id}" aria-label="${L().addToSteamer}">+</button>`;
const tileHTML = d => `<div class="tile dish${d.soldOut ? " sold" : ""}" data-id="${d.id}" role="button" tabindex="0">
    <div class="art">${artFor(d)}${(d.best || d.chef) ? `<span class="flag">${d.best ? L().bestSeller : L().chefsChoice}</span>` : ""}${mark(d)}</div>
    <div class="nm">${dName(d)}</div>
    <div class="row"><span class="price">${d.soldOut ? L().soldOut : fmt(d.price)}${d.spice >= 2 ? `<span class="sp">${"•".repeat(Math.min(d.spice, 3))}</span>` : ""}</span></div>
  </div>`;
function renderKinds() {
  $("#kinds").innerHTML = chapters.map(s => `<button data-kind="${s}" class="${kind === s ? "on" : ""}">${secName(s)}</button>`).join("");
  $$("#kinds button").forEach(b => b.onclick = () => { kind = b.dataset.kind; haptic(); renderKinds(); scrollToKind(kind); });
  $("#diet").innerHTML = [["all", L().fAll], ["veg", L().fVeg], ["spicy", L().fSpicy], ["noPork", L().fNoPork]].map(([m, t]) => `<button data-d="${m}" class="${diet === m ? "on" : ""}">${t}</button>`).join("");
  $$("#diet button").forEach(b => b.onclick = () => { diet = b.dataset.d; haptic(); renderKinds(); renderList(); });
  $("#kinds .on")?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
}
function renderList() {
  let html = ""; let total = 0;
  for (const s of chapters) {
    const list = MENU.filter(d => d.section === s && matches(d)); if (!list.length) continue; total += list.length;
    html += `<section class="section" data-sec="${s}"><h2>${secName(s)}<span class="m">${secOther(s)} // ${pad(list.length)}</span></h2><div class="grid">${list.map(tileHTML).join("")}</div></section>`;
  }
  $("#list").innerHTML = html; $("#empty").hidden = total > 0; $("#empty").textContent = L().noResults;
}
function scrollToKind(s) { const el = $(`.section[data-sec="${s}"]`); if (!el) return; const top = el.offsetTop - 110; $("#shop").scrollTo({ top, behavior: "smooth" }); }
$("#shop").addEventListener("scroll", () => {
  let cur = kind; $$(".section").forEach(sec => { if (sec.getBoundingClientRect().top < 140) cur = sec.dataset.sec; });
  if (cur !== kind) { kind = cur; $$("#kinds button").forEach(b => b.classList.toggle("on", b.dataset.kind === cur)); $("#kinds .on")?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" }); }
}, { passive: true });
function syncMarks() { $$(".tile").forEach(el => { const d = dishById(el.dataset.id); const cur = el.querySelector("[data-add]"); if (!d || !cur) return; const t = document.createElement("template"); t.innerHTML = mark(d); const next = t.content.firstElementChild; if (next && (next.className !== cur.className || next.textContent !== cur.textContent)) cur.replaceWith(next); }); }
$("#list").addEventListener("click", e => {
  const add = e.target.closest("[data-add]");
  if (add) { e.stopPropagation(); const d = dishById(add.dataset.add); if (!d) return; if (d.styles) { openDish(d); return; } addToCart(d.id, null, 1); toast(L().added(dName(d))); pulse(); haptic(); return; }
  const el = e.target.closest(".tile"); if (el) openDish(dishById(el.dataset.id));
});
$("#findBtn").addEventListener("click", () => { const f = $("#find"); f.hidden = !f.hidden; if (!f.hidden) $("#search").focus(); else { $("#search").value = ""; query = ""; diet = "all"; renderKinds(); renderList(); } });
let searchT; $("#search").addEventListener("input", e => { clearTimeout(searchT); searchT = setTimeout(() => { query = e.target.value.trim(); renderList(); }, 120); });

/* dish */
let sheetDish = null, sheetQty = 1, sheetStyle = null, view = null, request = 0, shopScroll = 0;
function openDish(d) { if (!d || d.soldOut) return; sheetDish = d; sheetQty = 1; sheetStyle = d.styles ? d.styles[0] : null; haptic(); shopScroll = $("#shop").scrollTop; renderSheet(); show("dish"); $("#dish").scrollTop = 0; if (location.hash !== `#${d.id}`) history.pushState({ dish: d.id }, "", `#${d.id}`); }
function closeSheet() { show("shop"); $("#shop").scrollTop = shopScroll; if (location.hash && location.hash !== "#menu") history.pushState({ v: "shop" }, "", "#menu"); }
addEventListener("popstate", () => { const h = location.hash.slice(1); const d = h && dishById(h); if (d) { if ($("#dish").hidden) openDish(d); } else if (h === "menu") show("shop"); else show("cover"); });
function renderSheet() {
  view?.dispose(); view = null; const d = sheetDish; const spatial = Boolean(d.model || d.img);
  $("#dishCrumb").textContent = `${secName(d.section)} // ${pad(MENU.indexOf(d) + 1)}`;
  const meta = [];
  if (d.pieces) meta.push(`${d.pieces} ${L().pieces}`);
  if (d.spice) meta.push(`${L().spice} ${"•".repeat(Math.min(d.spice, 3))} ${L().spiceLevels[d.spice]}`);
  if (d.allergens?.length) meta.push(`${L().allergens}: ${d.allergens.map(allergen).join(" · ")}`);
  $("#sheetBody").innerHTML = `
    <div class="d-pic"><div class="dglow"></div>${spatial ? `<div class="three-stage" id="threeStage"></div>` : ""}<div class="d-art-object">${artFor(d)}${d.img ? `<img class="mirror" src="img/${d.img}" alt="" aria-hidden="true">` : ""}</div>
      ${spatial ? `<span class="drag-hint"><svg viewBox="0 0 20 20"><path d="M3.4 8a6.8 6.8 0 0 1 13.2 0"/><path d="M2.6 10.6 3.4 8l2.6.9M17.4 10.6 16.6 8 14 8.9"/></svg>${d.model ? (lang === "zh" ? "拖动旋转 · 双指缩放" : "Drag to rotate · pinch to zoom") : (lang === "zh" ? "拖动查看 · 实拍" : "Drag to tilt · real photo")}</span>` : ""}</div>
    <div class="d-body">
      ${(d.best || d.chef) ? `<div class="m">${d.best ? L().bestSeller : L().chefsChoice}</div>` : ""}
      <h1 class="d-name">${dName(d)}</h1><div class="d-en m">${dOther(d)}</div>
      <div class="d-price">${fmt(d.price)}</div>
      ${dFlavor(d) ? `<p class="d-flavor">${dFlavor(d)}</p>` : ""}
      <div class="d-meta">${meta.map(m => `<span class="m">${m}</span>`).join("")}</div>
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
  const modelURL = d.model ? `models/production/${d.model}` : null, imageURL = d.img ? `img/${d.img}` : null;
  const opts = { label: dName(d), idle: false,
    onReady: box => { if (req !== request || !stage.isConnected) return;
      const img = pic.querySelector(".d-art-object img");
      const fit = () => { if (!box || !img || !img.naturalWidth) return; const s = stage.getBoundingClientRect(), el = img.getBoundingClientRect(), pr = pic.getBoundingClientRect(); const ratio = Math.min(el.width / img.naturalWidth, el.height / img.naturalHeight), scale = box.width / (img.naturalWidth * ratio); const tx = (s.left - pr.left + box.left + box.width / 2) - (el.left - pr.left + el.width / 2), ty = (s.top - pr.top + box.top + box.height / 2) - (el.top - pr.top + el.height / 2); img.style.transform = `translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px) scale(${scale.toFixed(3)})`; };
      if (modelURL && img) { if (img.complete && img.naturalWidth) fit(); else img.addEventListener("load", fit, { once: true }); }
      pic.classList.add(modelURL ? "ready-3d" : "showing-3d"); },
    onFirstTouch: () => { if (req === request) pic.classList.add("showing-3d"); },
    onError: () => { if (req === request) { pic.classList.remove("showing-3d", "ready-3d"); stage.remove(); } } };
  try {
    if (modelURL) { const { mountGeneratedDish3D } = await import("./model3d.js?v=12"); if (req !== request) return; view = mountGeneratedDish3D(stage, { ...opts, modelURL }); }
    else if (imageURL) { const { mountPhotoDepth3D } = await import("./photo3d.js?v=9"); if (req !== request) return; view = mountPhotoDepth3D(stage, { ...opts, imageURL, profile: d.art }); }
  } catch { stage.remove(); }
}

/* ticket */
function pulse() { const b = $("#rail"); b.classList.add("pulse"); clearTimeout(pulse.t); pulse.t = setTimeout(() => b.classList.remove("pulse"), 160); }
function syncRail() { const n = cartCount(); $("#rail").hidden = n === 0 || !$("#cover").hidden; $("#cartCount").textContent = n; $("#railTotal").textContent = fmt(cartTotal()); $("#railLabel").textContent = L().viewCart; if (!$("#cart").hidden) renderTicket(); }
function openTicket() { $("#toast").classList.remove("show"); renderTicket(); $("#cartScrim").hidden = false; $("#cart").hidden = false; requestAnimationFrame(() => { $("#cartScrim").classList.add("open"); $("#cart").classList.add("open"); }); }
function closeTicket() { $("#cartScrim").classList.remove("open"); $("#cart").classList.remove("open"); setTimeout(() => { $("#cartScrim").hidden = true; $("#cart").hidden = true; }, 450); }
function renderTicket() {
  const n = cartCount(); $("#cartSub").textContent = n ? L().cartSub(n, TABLE) : "";
  if (!n) { $("#cartItems").innerHTML = `<div class="cart-empty">${L().emptyCart}</div>`; $("#cartTotals").innerHTML = ""; $("#placeOrder").hidden = true; $("#noteWrap").hidden = true; return; }
  $("#placeOrder").hidden = false; $("#noteWrap").hidden = false;
  $("#cartItems").innerHTML = [...cart].map(([k, v]) => { const d = dishById(v.id); if (!d) return ""; return `<div class="cart-line" data-k="${k}"><div class="th">${artFor(d)}</div><div><div class="nm">${dName(d)}</div><div class="sub">${v.style ? `${styleLabel(v.style)} · ` : ""}${fmt(d.price)}</div></div><div class="stepper"><button data-d="-1">−</button><b>${v.qty}</b><button data-d="1">+</button></div></div>`; }).join("");
  $$("#cartItems .stepper button").forEach(b => b.onclick = () => { const k = b.closest(".cart-line").dataset.k, v = cart.get(k); if (!v) return; addToCart(v.id, v.style, Number(b.dataset.d)); haptic(); renderTicket(); });
  $("#cartTotals").innerHTML = `<div class="rowt"><span>${L().total}</span><b>${fmt(cartTotal())}</b></div>`;
  $("#orderTotal").textContent = fmt(cartTotal()); $("#note").value = localStorage.getItem("dl-note") || "";
}
$("#rail").addEventListener("click", () => { haptic(); openTicket(); });
$("#cartBar").addEventListener("click", () => openTicket());
$("#cartScrim").addEventListener("click", closeTicket); $("#cartClose").addEventListener("click", closeTicket);
$("#note").addEventListener("input", e => localStorage.setItem("dl-note", e.target.value));
$("#placeOrder").addEventListener("click", () => {
  const no = String(Math.floor(1000 + Math.random() * 9000));
  const order = { table: TABLE, no, items: [...cart.values()].map(v => ({ ...v, name: dishById(v.id)?.cn })), note: ($("#note").value || "").trim() || null, total: cartTotal(), at: new Date().toISOString() };
  fetch("/api/order", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(order) }).catch(() => {});
  const past = JSON.parse(localStorage.getItem("dl-orders") || "[]"); past.push(order); localStorage.setItem("dl-orders", JSON.stringify(past));
  cart.clear(); saveCart(); syncRail(); syncMarks(); localStorage.removeItem("dl-note"); closeTicket();
  $("#doneNote").textContent = L().orderNote(TABLE, no); $("#done").hidden = false; haptic(true);
});
$("#doneBack").addEventListener("click", () => { $("#done").hidden = true; });

/* waiter */
let waiterReason = null;
const ICONS = { water: '<svg viewBox="0 0 24 24"><path d="M7 4h10l-1.2 15a1.5 1.5 0 0 1-1.5 1.4H9.7A1.5 1.5 0 0 1 8.2 19L7 4Z"/><path d="M8 11h8"/></svg>', cutlery: '<svg viewBox="0 0 24 24"><path d="M7 3v18M5 3v5a2 2 0 0 0 4 0V3M17 3c-2 0-3 3-3 6s1 3 3 3v9"/></svg>', bill: '<svg viewBox="0 0 24 24"><path d="M6 3h12v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21V3Z"/><path d="M9 8h6M9 12h6"/></svg>', help: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17h.01"/></svg>' };
function renderReasons() { $("#reasons").innerHTML = Object.entries(L().reasons).map(([k, t]) => `<button class="reason${waiterReason === k ? " on" : ""}" data-r="${k}">${ICONS[k]}<span>${t}</span></button>`).join(""); $$(".reason").forEach(b => b.onclick = () => { waiterReason = b.dataset.r; haptic(); renderReasons(); $("#waiterSend").disabled = false; }); }
function openWaiter() { waiterReason = null; renderReasons(); $("#waiterSend").disabled = true; $("#waiterScrim").hidden = false; $("#waiterSheet").hidden = false; requestAnimationFrame(() => { $("#waiterScrim").classList.add("open"); $("#waiterSheet").classList.add("open"); }); }
function closeWaiter() { $("#waiterScrim").classList.remove("open"); $("#waiterSheet").classList.remove("open"); setTimeout(() => { $("#waiterScrim").hidden = true; $("#waiterSheet").hidden = true; }, 450); }
$("#bellBtn").addEventListener("click", () => { haptic(); openWaiter(); }); $("#callWaiter").addEventListener("click", () => { closeTicket(); setTimeout(openWaiter, 250); });
$("#waiterScrim").addEventListener("click", closeWaiter);
$("#waiterSend").addEventListener("click", () => { const label = waiterReason ? L().reasons[waiterReason] : null; haptic(true); fetch("/api/call", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ table: TABLE, reason: label }) }).catch(() => {}); closeWaiter(); toast(L().waiterSent(label)); });

/* copy */
function renderStatic() {
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  $("#enterBtn").textContent = lang === "zh" ? "点餐" : "Order"; $("#coverBellLabel").textContent = L().waiter; $("#coverLang").textContent = lang === "zh" ? "EN" : "中文";
  $("#coverTable").textContent = TABLE ? (lang === "zh" ? `${TABLE}号桌  //  现点现做` : `TABLE ${TABLE}  //  COOKED TO ORDER`) : (lang === "zh" ? "现点现做" : "COOKED TO ORDER");
  $("#tableTag").textContent = TABLE ? (lang === "zh" ? `${TABLE}号桌` : `TABLE ${TABLE}`) : "";
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
function renderAll() { renderStatic(); renderKinds(); renderList(); syncRail(); syncMarks(); if (!$("#dish").hidden && sheetDish) renderSheet(); if (!$("#cover").hidden) { const d = MENU.find(x => x.model && x.featured) || MENU.find(x => x.model) || MENU[0]; $("#coverDish").textContent = `${dName(d)} // ${fmt(d.price)}`; } }
renderAll();
{ const h = location.hash.slice(1); const d = h && dishById(h); if (d) { show("shop"); openDish(d); } else if (h === "menu") show("shop"); else show("cover"); }
