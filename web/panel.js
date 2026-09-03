/* Dumpling Lab — the instrument panel: an index of dishes, a viewport for
   each one, a ticket. Quiet by design; the food is the only colour. */
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
const numberOf = d => pad(MENU.indexOf(d) + 1);

/* ---------- cart ---------- */
const cart = new Map();
try { JSON.parse(localStorage.getItem("dl-cart2") || "[]").forEach(x => cart.set(x.k, x.v)); } catch {}
const keyOf = (id, style) => style ? `${id}|${style}` : id;
const saveCart = () => localStorage.setItem("dl-cart2", JSON.stringify([...cart].map(([k, v]) => ({ k, v }))));
const cartCount = () => [...cart.values()].reduce((a, b) => a + b.qty, 0);
const cartTotal = () => [...cart.values()].reduce((a, v) => a + (dishById(v.id)?.price || 0) * v.qty, 0);
const qtyForDish = id => [...cart.values()].filter(v => v.id === id).reduce((a, b) => a + b.qty, 0);
function addToCart(id, style, n = 1) {
  const k = keyOf(id, style); const cur = cart.get(k) || { id, style: style || null, qty: 0 };
  cur.qty += n; if (cur.qty <= 0) cart.delete(k); else cart.set(k, cur);
  saveCart(); syncTicket(); syncMarks();
}

/* ---------- index ---------- */
let kind = "all", diet = "all", query = "", order = "menu";
const matches = d => (kind === "all" || d.section === kind)
  && (diet !== "veg" || d.veg) && (diet !== "spicy" || d.spice >= 2) && (diet !== "noPork" || d.meat !== "pork")
  && (!query || d.name.toLowerCase().includes(query.toLowerCase()) || d.cn.includes(query));
const sorted = list => order === "price" ? [...list].sort((a, b) => a.price - b.price) : order === "az" ? [...list].sort((a, b) => dName(a).localeCompare(dName(b), lang === "zh" ? "zh" : "en")) : list;

const mark = d => d.soldOut ? `<span class="m">${L().soldOut}</span>` : qtyForDish(d.id)
  ? `<button class="qty" data-add="${d.id}">${qtyForDish(d.id)}</button>`
  : `<button class="add" data-add="${d.id}" aria-label="${L().addToSteamer}">+</button>`;
const rowHTML = d => `<div class="dish${d.soldOut ? " sold" : ""}" data-id="${d.id}" role="button" tabindex="0">
    <span class="no">${numberOf(d)}</span>
    <span class="cap"><span class="nm">${dName(d)}${d.best ? `<span class="flag">${L().bestSeller}</span>` : d.chef ? `<span class="flag">${L().chefsChoice}</span>` : ""}${d.spice ? `<span class="sp">${"•".repeat(Math.min(d.spice, 3))}</span>` : ""}</span><span class="en">${dOther(d)}${d.pieces ? ` · ${d.pieces} ${L().pieces}` : ""}</span></span>
    <span class="kind">${secName(d.section)}</span>
    <span class="r"><span class="price">${fmt(d.price)}</span>${mark(d)}</span>
  </div>`;

function renderIndex() {
  const hits = sorted(MENU.filter(matches));
  const byKind = kind === "all" && order === "menu";
  let html = `<div class="thead"><span class="m">No.</span><span class="m">${lang === "zh" ? "菜品" : "Dish"}</span><span class="m">${lang === "zh" ? "价格" : "Price"}</span></div>`;
  if (byKind) {
    for (const s of chapters) {
      const list = hits.filter(d => d.section === s); if (!list.length) continue;
      html += `<div class="group"><div class="m"><span>${pad(chapters.indexOf(s) + 1)} — <b>${secName(s)}</b> ${secOther(s)}</span><span>${pad(list.length)}</span></div>${list.map(rowHTML).join("")}</div>`;
    }
  } else html += hits.map(rowHTML).join("");
  $("#list").innerHTML = html;
  $("#empty").hidden = hits.length > 0; $("#empty").textContent = L().noResults;
  $("#showing").textContent = `${pad(hits.length)} / ${pad(MENU.length)}`;
  $("#kindNow").textContent = kind === "all" ? (lang === "zh" ? "全部" : "All") : secName(kind);
  $("#orderNow").textContent = { menu: lang === "zh" ? "菜单序" : "Menu", price: lang === "zh" ? "价格" : "Price", az: "A–Z" }[order];
  $("#matchNow").textContent = query || "—";
}
function renderKinds() {
  $("#kinds").innerHTML = `<button data-kind="all" class="${kind === "all" ? "on" : ""}"><span>${lang === "zh" ? "全部" : "All"}</span><b>${pad(MENU.length)}</b></button>` +
    chapters.map(s => `<button data-kind="${s}" class="${kind === s ? "on" : ""}"><span>${secName(s)}</span><b>${pad(MENU.filter(d => d.section === s).length)}</b></button>`).join("");
  $$("#kinds button").forEach(b => b.onclick = () => { kind = b.dataset.kind; haptic(); renderKinds(); renderIndex(); $("#main").scrollTo({ top: 0, behavior: "smooth" }); });
  $("#diet").innerHTML = [["all", L().fAll], ["veg", L().fVeg], ["spicy", L().fSpicy], ["noPork", L().fNoPork]].map(([m, t]) => `<button data-d="${m}" class="${diet === m ? "on" : ""}">${t}</button>`).join("");
  $$("#diet button").forEach(b => b.onclick = () => { diet = b.dataset.d; haptic(); renderKinds(); renderIndex(); });
  $$("#orderBtns button").forEach(b => { b.classList.toggle("solid", b.dataset.o === order); b.onclick = () => { order = b.dataset.o; haptic(); renderKinds(); renderIndex(); }; });
}
function syncMarks() {
  $$(".dish").forEach(el => { const d = dishById(el.dataset.id); const cur = el.querySelector("[data-add]"); if (!d || !cur) return;
    const t = document.createElement("template"); t.innerHTML = mark(d); const next = t.content.firstElementChild;
    if (next.className !== cur.className || next.textContent !== cur.textContent) cur.replaceWith(next); });
}
$("#list").addEventListener("click", e => {
  const add = e.target.closest("[data-add]");
  if (add) { e.stopPropagation(); const d = dishById(add.dataset.add); if (!d) return; if (d.styles) { openDish(d); return; } addToCart(d.id, null, 1); toast(L().added(dName(d))); pulse(); haptic(); return; }
  const el = e.target.closest(".dish"); if (el) openDish(dishById(el.dataset.id));
});
let searchT;
$("#search").addEventListener("input", e => { clearTimeout(searchT); searchT = setTimeout(() => { query = e.target.value.trim(); renderIndex(); }, 120); });
$("#clearBtn").addEventListener("click", () => { query = ""; kind = "all"; diet = "all"; $("#search").value = ""; renderKinds(); renderIndex(); });
$("#randomBtn").addEventListener("click", () => { const pool = MENU.filter(d => !d.soldOut && matches(d)); openDish(pool[Math.floor(Math.random() * pool.length)]); haptic(); });

/* ---------- viewport ---------- */
let sheetDish = null, sheetQty = 1, sheetStyle = null, view = null, request = 0;
function openDish(d) {
  if (!d) return; sheetDish = d; sheetQty = 1; sheetStyle = d.styles ? d.styles[0] : null; haptic();
  renderSheet(); $("#sheetScrim").hidden = false; $("#sheet").hidden = false;
  requestAnimationFrame(() => { $("#sheetScrim").classList.add("open"); $("#sheet").classList.add("open"); $("#sheet").scrollTop = 0; });
}
function closeSheet() { request++; view?.dispose(); view = null; $("#sheetScrim").classList.remove("open"); $("#sheet").classList.remove("open"); setTimeout(() => { $("#sheetScrim").hidden = true; $("#sheet").hidden = true; }, 400); }
function renderSheet() {
  view?.dispose(); view = null; const d = sheetDish; const spatial = Boolean(d.model || d.img);
  const kv = [[lang === "zh" ? "编号" : "No.", `DL//${numberOf(d)}`], [lang === "zh" ? "分类" : "Kind", secName(d.section)], [lang === "zh" ? "价格" : "Price", fmt(d.price)]];
  if (d.pieces) kv.push([lang === "zh" ? "份量" : "Portion", `${d.pieces} ${L().pieces}`]);
  if (d.spice) kv.push([L().spice, `${"•".repeat(Math.min(d.spice, 3))} ${L().spiceLevels[d.spice]}`]);
  if (d.allergens?.length) kv.push([L().allergens, d.allergens.map(allergen).join(" · ")]);
  $("#sheetBody").innerHTML = `
    <div class="v-head"><span class="m">DL//${numberOf(d)} — <b>${secName(d.section)}</b></span><span class="m">${d.best ? L().bestSeller : d.chef ? L().chefsChoice : ""}</span></div>
    <div class="v-grid">
      <div class="d-pic marks"><i></i>
        ${spatial ? `<div class="three-stage" id="threeStage"></div>` : ""}
        <div class="d-art-object">${artFor(d)}</div>
        ${spatial ? `<span class="drag-hint"><svg viewBox="0 0 20 20"><path d="M3.4 8a6.8 6.8 0 0 1 13.2 0"/><path d="M2.6 10.6 3.4 8l2.6.9M17.4 10.6 16.6 8 14 8.9"/></svg>${d.model ? (lang === "zh" ? "拖动旋转 · 双指缩放" : "Drag to rotate · pinch to zoom") : (lang === "zh" ? "拖动查看 · 实拍" : "Drag to tilt · real photo")}</span>` : ""}
      </div>
      <div class="v-meta">
        <div><div class="d-name">${dName(d)}</div><div class="d-en">${dOther(d)}</div>${dFlavor(d) ? `<p class="d-flavor">${dFlavor(d)}</p>` : ""}</div>
        <div class="kv">${kv.map(([k, v]) => `<span class="m">${k}</span><span class="m">${v}</span>`).join("")}</div>
        ${d.styles ? `<div><div class="m">${L().pickStyle}</div><div class="styles">${d.styles.map(s => `<button class="style-opt${s === sheetStyle ? " on" : ""}" data-s="${s}">${styleLabel(s)}</button>`).join("")}</div></div>` : ""}
        <div class="d-bar"><div class="stepper"><button id="qm">−</button><b id="qn">${sheetQty}</b><button id="qp">+</button></div><button class="d-add" id="dAdd"><span>${L().addToSteamer}</span><strong>${fmt(d.price * sheetQty)}</strong></button></div>
      </div>
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
  const req = ++request, pic = stage.closest(".d-pic");
  const modelURL = d.model ? `models/production/${d.model}` : null, imageURL = d.img ? `img/${d.img}` : null;
  const opts = { label: dName(d), idle: false,
    onReady: box => { if (req !== request || !stage.isConnected) return;
      const img = pic.querySelector(".d-art-object img");
      const fit = () => { if (!box || !img || !img.naturalWidth) return;
        const s = stage.getBoundingClientRect(), el = img.getBoundingClientRect(), pr = pic.getBoundingClientRect();
        const ratio = Math.min(el.width / img.naturalWidth, el.height / img.naturalHeight), scale = box.width / (img.naturalWidth * ratio);
        const tx = (s.left - pr.left + box.left + box.width / 2) - (el.left - pr.left + el.width / 2), ty = (s.top - pr.top + box.top + box.height / 2) - (el.top - pr.top + el.height / 2);
        img.style.transform = `translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px) scale(${scale.toFixed(3)})`; };
      if (modelURL && img) { if (img.complete && img.naturalWidth) fit(); else img.addEventListener("load", fit, { once: true }); }
      pic.classList.add(modelURL ? "ready-3d" : "showing-3d"); },
    onFirstTouch: () => { if (req === request) pic.classList.add("showing-3d"); },
    onError: () => { if (req === request) { pic.classList.remove("showing-3d", "ready-3d"); stage.remove(); } } };
  try {
    if (modelURL) { const { mountGeneratedDish3D } = await import("./model3d.js?v=12"); if (req !== request) return; view = mountGeneratedDish3D(stage, { ...opts, modelURL }); }
    else if (imageURL) { const { mountPhotoDepth3D } = await import("./photo3d.js?v=9"); if (req !== request) return; view = mountPhotoDepth3D(stage, { ...opts, imageURL, profile: d.art }); }
  } catch { stage.remove(); }
}
$("#sheetScrim").addEventListener("click", closeSheet); $("#sheetClose").addEventListener("click", closeSheet);

/* ---------- objet: one dish turning quietly in the margin ---------- */
let objet = null;
async function mountObjet() {
  const host = $("#objet"); if (!host || !matchMedia("(min-width:1000px)").matches) return;
  const d = MENU.find(x => x.model && x.featured) || MENU.find(x => x.model); if (!d) return;
  host.innerHTML = `<div class="three-stage"></div><div class="cap m"><b>${dName(d)}</b> · ${fmt(d.price)}</div>`;
  const { mountGeneratedDish3D } = await import("./model3d.js?v=12");
  objet = mountGeneratedDish3D(host.querySelector(".three-stage"), { modelURL: `models/production/${d.model}`, label: dName(d), idle: true });
  host.onclick = e => { if (!host.dataset.dragged) openDish(d); delete host.dataset.dragged; };
  let px = 0, py = 0; host.addEventListener("pointerdown", e => { px = e.clientX; py = e.clientY; }); host.addEventListener("pointerup", e => { if (Math.hypot(e.clientX - px, e.clientY - py) > 8) host.dataset.dragged = "1"; });
}

/* ---------- ticket ---------- */
function pulse() { const b = $("#cartBar"); b.classList.remove("pulse"); void b.offsetWidth; b.classList.add("pulse"); }
function syncTicket() { const n = cartCount(); $("#cartBar").hidden = n === 0; $("#cartCount").textContent = n; $("#tItems").textContent = pad(n); $("#tTotal").textContent = fmt(cartTotal()); if (!$("#cart").hidden) renderTicket(); }
function openTicket() { renderTicket(); $("#cartScrim").hidden = false; $("#cart").hidden = false; requestAnimationFrame(() => { $("#cartScrim").classList.add("open"); $("#cart").classList.add("open"); }); }
function closeTicket() { $("#cartScrim").classList.remove("open"); $("#cart").classList.remove("open"); setTimeout(() => { $("#cartScrim").hidden = true; $("#cart").hidden = true; }, 450); }
function renderTicket() {
  const n = cartCount(); $("#cartSub").textContent = n ? L().cartSub(n, TABLE) : "";
  if (!n) { $("#cartItems").innerHTML = `<div class="cart-empty">${L().emptyCart}</div>`; $("#cartTotals").innerHTML = ""; $("#placeOrder").hidden = true; $("#noteWrap").hidden = true; return; }
  $("#placeOrder").hidden = false; $("#noteWrap").hidden = false;
  $("#cartItems").innerHTML = [...cart].map(([k, v]) => { const d = dishById(v.id); if (!d) return ""; return `<div class="cart-line" data-k="${k}"><div><div class="nm">${dName(d)}</div><div class="sub">DL//${numberOf(d)}${v.style ? ` · ${styleLabel(v.style)}` : ""} · ${fmt(d.price)}</div></div><div class="stepper"><button data-d="-1">−</button><b>${v.qty}</b><button data-d="1">+</button></div></div>`; }).join("");
  $$("#cartItems .stepper button").forEach(b => b.onclick = () => { const k = b.closest(".cart-line").dataset.k, v = cart.get(k); if (!v) return; addToCart(v.id, v.style, Number(b.dataset.d)); haptic(); renderTicket(); });
  $("#cartTotals").innerHTML = `<div class="rowt"><span>${L().total}</span><b>${fmt(cartTotal())}</b></div>`;
  $("#orderTotal").textContent = fmt(cartTotal()); $("#note").value = localStorage.getItem("dl-note") || "";
}
$("#cartBar").addEventListener("click", () => { haptic(); openTicket(); }); $("#ticketBtn")?.addEventListener("click", () => { haptic(); openTicket(); });
$("#cartScrim").addEventListener("click", closeTicket); $("#cartClose").addEventListener("click", closeTicket);
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
const ICONS = { water: '<svg viewBox="0 0 24 24"><path d="M7 4h10l-1.2 15a1.5 1.5 0 0 1-1.5 1.4H9.7A1.5 1.5 0 0 1 8.2 19L7 4Z"/><path d="M8 11h8"/></svg>', cutlery: '<svg viewBox="0 0 24 24"><path d="M7 3v18M5 3v5a2 2 0 0 0 4 0V3M17 3c-2 0-3 3-3 6s1 3 3 3v9"/></svg>', bill: '<svg viewBox="0 0 24 24"><path d="M6 3h12v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21V3Z"/><path d="M9 8h6M9 12h6"/></svg>', help: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17h.01"/></svg>' };
function renderReasons() { $("#reasons").innerHTML = Object.entries(L().reasons).map(([k, t]) => `<button class="reason${waiterReason === k ? " on" : ""}" data-r="${k}">${ICONS[k]}<span>${t}</span></button>`).join(""); $$(".reason").forEach(b => b.onclick = () => { waiterReason = b.dataset.r; haptic(); renderReasons(); $("#waiterSend").disabled = false; }); }
function openWaiter() { waiterReason = null; renderReasons(); $("#waiterSend").disabled = true; $("#waiterScrim").hidden = false; $("#waiterSheet").hidden = false; requestAnimationFrame(() => { $("#waiterScrim").classList.add("open"); $("#waiterSheet").classList.add("open"); }); }
function closeWaiter() { $("#waiterScrim").classList.remove("open"); $("#waiterSheet").classList.remove("open"); setTimeout(() => { $("#waiterScrim").hidden = true; $("#waiterSheet").hidden = true; }, 400); }
$("#bellBtn").addEventListener("click", () => { haptic(); openWaiter(); }); $("#callWaiter").addEventListener("click", () => { closeTicket(); setTimeout(openWaiter, 200); });
$("#waiterScrim").addEventListener("click", closeWaiter); $("#waiterClose").addEventListener("click", closeWaiter);
$("#waiterSend").addEventListener("click", () => { const label = waiterReason ? L().reasons[waiterReason] : null; haptic(true); fetch("/api/call", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ table: TABLE, reason: label }) }).catch(() => {}); closeWaiter(); toast(L().waiterSent(label)); });

/* ---------- copy ---------- */
function renderStatic() {
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  $("#tableNow").textContent = TABLE ? (lang === "zh" ? `${TABLE}号桌` : `Table ${TABLE}`) : "—";
  $("#tableTop").textContent = TABLE ? (lang === "zh" ? `${TABLE}号桌` : `TABLE ${TABLE}`) : "";
  $("#dishesNow").textContent = pad(MENU.filter(d => !d.soldOut).length); $("#kindsNow").textContent = pad(chapters.length);
  $("#heroSub").textContent = L().tagline;
  $("#langBtn").textContent = lang === "zh" ? "EN" : "中文"; $("#search").placeholder = L().search;
  $("#filterLab").textContent = lang === "zh" ? "筛选" : "Filter"; $("#clearBtn").textContent = lang === "zh" ? "清除" : "Clear"; $("#randomBtn").textContent = lang === "zh" ? "随便来一道" : "Random";
  $$("[data-t]").forEach(el => { const [zh, en] = el.dataset.t.split("|"); el.textContent = lang === "zh" ? zh : en; });
  $("#cartTitle").textContent = L().steamer; $("#noteLabel").textContent = L().noteLabel; $("#note").placeholder = L().notePlaceholder; $("#orderLabel").textContent = L().order; $("#waiterLabel").textContent = L().waiter;
  $("#doneTitle").textContent = L().ordered; $("#doneBack").textContent = L().back;
  $("#waiterTitle").textContent = L().waiterTitle; $("#waiterSub").textContent = L().waiterSub(TABLE); $("#waiterK").textContent = L().waiterK; $("#waiterSend").textContent = L().waiterSend; $("#bellBtn").setAttribute("aria-label", L().waiter);
}
let toastT; function toast(msg) { const el = $("#toast"); el.textContent = msg; el.hidden = false; requestAnimationFrame(() => el.classList.add("show")); clearTimeout(toastT); toastT = setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.hidden = true, 300); }, 1800); }
$("#langBtn").addEventListener("click", () => { lang = lang === "zh" ? "en" : "zh"; localStorage.setItem("dl-lang", lang); haptic(); renderAll(); });
addEventListener("keydown", e => { if (e.key === "Escape") { closeSheet(); closeTicket(); closeWaiter(); } if ((e.key === "Enter" || e.key === " ") && e.target.classList?.contains("dish")) { e.preventDefault(); e.target.click(); } if (e.key === "/" && document.activeElement !== $("#search")) { e.preventDefault(); $("#search").focus(); } });
function placeKinds() {
  const wide = matchMedia("(min-width:1000px)").matches;
  const kinds = $("#kinds"), diet = $("#diet");
  if (wide) { $("#kindsSlot").appendChild(kinds); $("#dietSlot").appendChild(diet); }
  else { $("#kindsMobile").append(kinds, diet); }
}
addEventListener("resize", placeKinds);
function renderAll() { renderStatic(); renderKinds(); renderIndex(); syncTicket(); syncMarks(); placeKinds(); }
renderAll(); setTimeout(mountObjet, 400);
