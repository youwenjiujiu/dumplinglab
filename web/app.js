/* Dumpling Lab — table menu, rebuilt clean.
   One clear flow: browse by category → tap dish → add → cart → order.
   Bilingual, dietary filters, 自选 cooking styles, table QR. No gimmicks.
   art.js provides artFor(dish) (photo or SVG illustration). */

"use strict";
const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];

const params = new URLSearchParams(location.search);
const TABLE = params.get("table");
const CURRENCY = "S$";
const fmt = n => CURRENCY + (Number.isInteger(n) ? n : n.toFixed(2));
const haptic = s => navigator.vibrate && navigator.vibrate(s ? 16 : 8);

/* ---------------- Language ---------------- */
const norm = v => { v=(v||"").toLowerCase(); return v.startsWith("zh")?"zh":v.startsWith("en")?"en":null; };
let lang = norm(params.get("lang")) || norm(localStorage.getItem("dl-lang")) || norm(navigator.language) || "zh";
const L = () => I18N.ui[lang];
const secName = s => lang==="zh" ? I18N.sections[s] : SECTION_LABELS[s];
const secOther = s => lang==="zh" ? SECTION_LABELS[s] : I18N.sections[s];
const secTag = s => lang==="zh" ? (I18N.taglines[s]||"") : "";
const dName = d => lang==="zh" ? d.cn : d.name;
const dOther = d => lang==="zh" ? d.name : d.cn;
const dFlavor = d => lang==="zh" ? ((I18N.dishes[d.id]||{}).flavor || d.flavor) : d.flavor;
const styleLabel = s => lang==="zh" ? s : (STYLE_LABELS[s] || s);
const allergen = a => lang==="zh" ? (I18N.allergens[a]||a) : a;

/* ---------------- Cart (keyed by dish id + style) ---------------- */
const cart = new Map(); // key -> { id, style, qty }
try { (JSON.parse(localStorage.getItem("dl-cart2")||"[]")).forEach(x => cart.set(x.k, x.v)); } catch {}
const keyOf = (id, style) => style ? `${id}|${style}` : id;
const saveCart = () => localStorage.setItem("dl-cart2", JSON.stringify([...cart].map(([k,v])=>({k,v}))));
const cartCount = () => [...cart.values()].reduce((a,b)=>a+b.qty,0);
const cartTotal = () => [...cart.values()].reduce((a,v)=>a+(dishById(v.id)?.price||0)*v.qty,0);
const qtyForDish = id => [...cart.values()].filter(v=>v.id===id).reduce((a,b)=>a+b.qty,0);
const dishById = id => MENU.find(d=>d.id===id);

function addToCart(id, style, n=1) {
  const k = keyOf(id, style);
  const cur = cart.get(k) || { id, style: style||null, qty:0 };
  cur.qty += n;
  if (cur.qty<=0) cart.delete(k); else cart.set(k, cur);
  saveCart(); syncCartBar(); updateBadges();
}

/* ---------------- Render: header/tabs/filters ---------------- */
function renderStatic() {
  document.documentElement.lang = lang==="zh"?"zh-CN":"en";
  $("#heroSub").textContent = L().tagline;
  $("#tableTag").textContent = TABLE ? L().table(TABLE) : "";
  $("#langBtn").textContent = lang==="zh" ? "EN" : "中文";
  $("#bellBtn").title = L().waiter;
  $("#search").placeholder = L().search;
  $("#cartBarLabel").textContent = L().viewCart;
  $("#cartTitle").textContent = lang==="zh" ? "蒸笼" : "The Steamer";
  $("#noteLabel").textContent = L().noteLabel;
  $("#note").placeholder = L().notePlaceholder;
  $("#orderLabel").textContent = L().order;
  $("#waiterLabel").textContent = L().waiter;
  $("#doneTitle").textContent = L().ordered;
  $("#doneBack").textContent = L().back;
  $("#foot").querySelector("p").textContent = lang==="zh" ? "Dumpling Lab · 手工现包" : "Dumpling Lab · folded by hand";
}

let activeSection = SECTIONS[0];
function renderTabs() {
  const el = $("#tabsInner"); el.innerHTML = "";
  SECTIONS.forEach(sec => {
    if (!MENU.some(d=>d.section===sec)) return;
    const b = document.createElement("button");
    b.className = "tab" + (sec===activeSection?" on":"");
    b.textContent = secName(sec);
    b.dataset.sec = sec;
    b.onclick = () => {
      haptic();
      const target = $(`.chapter[data-sec="${sec}"]`);
      if (target) window.scrollTo({ top: target.offsetTop - 60, behavior:"smooth" });
    };
    el.appendChild(b);
  });
}

let filterMode = "all", query = "";
function renderFilters() {
  const el = $("#filters"); el.innerHTML = "";
  [["all",L().fAll],["veg","🌱 "+L().fVeg],["spicy","🌶 "+L().fSpicy],["noPork","🚫 "+L().fNoPork]].forEach(([m,label])=>{
    const b = document.createElement("button");
    b.className = "fchip"+(filterMode===m?" on":"");
    b.textContent = label;
    b.onclick = () => { filterMode = filterMode===m?"all":m; haptic(); renderFilters(); applyFilter(); };
    el.appendChild(b);
  });
}

/* ---------------- Dish tile visual ---------------- */
// Photo when available; otherwise an elegant warm gradient card with the
// dish name set in serif — premium editorial look, varied per dish colour.
function tileFor(d, opts={}) {
  if (d.img) return `<img class="ph" src="img/${d.img}" alt="${d.cn||d.name}" loading="lazy">`;
  const a = d.accent || "#8a6a45", g = d.glow || "#3a271a";
  const nm = (lang==="zh"?d.cn:d.name);
  const em = SECTION_EMOJI[d.section] || "";
  return `<div class="gtile" style="--a:${a};--b:${g}">
    <span class="gt-em">${em}</span>
    <span class="gt-nm">${nm}</span>
    <span class="gt-line"></span>
  </div>`;
}
const SECTION_EMOJI = {
  signature:"🥟", diy:"🥟", noodles:"🍜", buns:"🫓", tangzi:"🍡",
  rice:"🍚", soup:"🥣", sides:"🍢", fried:"🍤", veg:"🥬", dessert:"🍧"
};

/* ---------------- Render: menu grid ---------------- */
function renderMenu() {
  const menu = $("#menu"); menu.innerHTML = "";
  SECTIONS.forEach(sec => {
    const dishes = MENU.filter(d=>d.section===sec);
    if (!dishes.length) return;
    const ch = document.createElement("section");
    ch.className = "chapter"; ch.dataset.sec = sec;
    ch.innerHTML = `<div class="chapter-head">
      <h2>${secName(sec)} <span class="sub">${secOther(sec)}</span></h2>
      ${secTag(sec) ? `<div class="tag">${secTag(sec)}</div>`:""}
    </div><div class="grid"></div>`;
    const grid = ch.querySelector(".grid");
    dishes.forEach(d => grid.appendChild(card(d)));
    menu.appendChild(ch);
  });
  updateBadges();
}

function card(d) {
  const el = document.createElement("div");
  el.className = "card" + (d.soldOut?" sold":"") + (d.img?" hasphoto":"");
  el.dataset.id = d.id;
  const spice = d.spice ? `<span class="spice">${"🌶".repeat(Math.min(d.spice,3))}</span>` : "";
  el.innerHTML = `
    <div class="pic">
      ${tileFor(d)}
      ${d.soldOut ? `<div class="sold-tag">${L().soldOut}</div>`
        : `<button class="add" aria-label="add">+</button>`}
    </div>
    <div class="cap">
      ${d.img?`<div class="nm">${(d.best||d.chef)?'<span class="dot">•</span>':""}${dName(d)}</div>`:""}
      <div class="en">${(!d.img&&(d.best||d.chef))?'<span class="dot">•</span>':""}${dOther(d)}</div>
      <div class="row"><span class="price">${fmt(d.price)}</span>${spice}${d.pieces?`<span class="pc">${d.pieces} ${L().pieces}</span>`:""}</div>
    </div>`;
  if (!d.soldOut) {
    el.querySelector(".pic").onclick = e => { if (e.target.classList.contains("add")) return; openDish(d); };
    el.querySelector(".cap").onclick = () => openDish(d);
    el.querySelector(".add").onclick = e => {
      e.stopPropagation();
      if (d.styles) { openDish(d); return; }   // 自选 must pick a style
      addToCart(d.id, null, 1); toast(L().added(dName(d))); pulseCart();
    };
  }
  return el;
}

function updateBadges() {
  $$(".card").forEach(c => {
    const d = dishById(c.dataset.id); if (!d || d.soldOut) return;
    const q = qtyForDish(d.id);
    const pic = c.querySelector(".pic");
    let add = pic.querySelector(".add"), badge = pic.querySelector(".qty-badge");
    if (q>0) {
      if (add) { add.className="qty-badge"; add.textContent=q; }
      else if (badge) badge.textContent=q;
    } else {
      const cur = pic.querySelector(".qty-badge");
      if (cur) { cur.className="add"; cur.textContent="+"; }
    }
  });
}

/* ---------------- Filter + search ---------------- */
function matches(d) {
  if (filterMode==="veg" && !d.veg) return false;
  if (filterMode==="spicy" && d.spice<2) return false;
  if (filterMode==="noPork" && d.meat==="pork") return false;
  if (query) { const q=query.toLowerCase(); if (!d.name.toLowerCase().includes(q) && !d.cn.includes(query)) return false; }
  return true;
}
function applyFilter() {
  let any=false;
  $$(".chapter").forEach(ch => {
    let shown=0;
    $$(".card", ch).forEach(c => {
      const ok = matches(dishById(c.dataset.id));
      c.style.display = ok?"":"none"; if (ok) shown++;
    });
    ch.style.display = shown?"":"none"; if (shown) any=true;
  });
  const e=$("#empty"); e.hidden=any; e.textContent=L().noResults;
}
let searchT;
$("#search").addEventListener("input", e => { clearTimeout(searchT); searchT=setTimeout(()=>{query=e.target.value.trim(); applyFilter();},150); });

/* ---------------- Dish detail sheet ---------------- */
let sheetDish=null, sheetQty=1, sheetStyle=null;
function openDish(d) {
  sheetDish=d; sheetQty=1; sheetStyle = d.styles ? d.styles[0] : null;
  haptic();
  renderSheet();
  $("#sheetScrim").hidden=false; $("#sheet").hidden=false;
  document.body.style.overflow="hidden";
  requestAnimationFrame(()=>{ $("#sheetScrim").classList.add("open"); $("#sheet").classList.add("open"); $("#sheet").scrollTop=0; });
}
function closeSheet() {
  $("#sheetScrim").classList.remove("open"); $("#sheet").classList.remove("open");
  setTimeout(()=>{ $("#sheetScrim").hidden=true; $("#sheet").hidden=true;
    if ($("#cart").hidden) document.body.style.overflow=""; }, 420);
}
function renderSheet() {
  const d=sheetDish;
  const badges = [
    (d.best?`<span class="badge red">${L().best}</span>`:(d.chef?`<span class="badge red">${L().chef}</span>`:"")),
  ].filter(Boolean).join("");
  const meta = [];
  if (d.pieces) meta.push(`${d.pieces} ${L().pieces}`);
  if (d.spice) meta.push(`${"🌶".repeat(Math.min(d.spice,3))} ${L().spiceLevels[d.spice]}`);
  meta.push(`${d.kcal} ${L().kcal}`);
  if (d.allergens?.length) meta.push(`${L().allergens}: ${d.allergens.map(allergen).join(" · ")}`);
  const stylePicker = d.styles ? `
    <div class="d-section-label">${L().pickStyle}</div>
    <div class="styles">${d.styles.map(s=>`<button class="style-opt${s===sheetStyle?" on":""}" data-s="${s}">${styleLabel(s)}</button>`).join("")}</div>
  ` : "";
  $("#sheetBody").innerHTML = `
    <div class="d-pic">${tileFor(d,{big:true})}</div>
    ${badges?`<div class="d-badges">${badges}</div>`:""}
    <div class="d-name">${dName(d)}</div>
    <div class="d-en">${dOther(d)}</div>
    <div class="d-price">${fmt(d.price)}</div>
    ${dFlavor(d)?`<div class="d-flavor">${dFlavor(d)}</div>`:""}
    <div class="d-meta">${meta.map(m=>`<span class="m">${m}</span>`).join("")}</div>
    ${stylePicker}
    <div class="d-bar">
      <div class="stepper"><button id="qm">−</button><b id="qn">${sheetQty}</b><button id="qp">+</button></div>
      <button class="d-add" id="dAdd"><span>${L().addToSteamer}</span><strong>${fmt(d.price*sheetQty)}</strong></button>
    </div>`;
  $("#qm").onclick=()=>{ if(sheetQty>1){sheetQty--; syncSheet(); haptic();} };
  $("#qp").onclick=()=>{ sheetQty++; syncSheet(); haptic(); };
  $$(".style-opt", $("#sheetBody")).forEach(b=> b.onclick=()=>{ sheetStyle=b.dataset.s; renderSheet(); haptic(); });
  $("#dAdd").onclick=()=>{
    addToCart(d.id, sheetStyle, sheetQty);
    toast(L().added(dName(d) + (sheetStyle?` · ${styleLabel(sheetStyle)}`:"")));
    closeSheet(); pulseCart();
  };
}
function syncSheet() { $("#qn").textContent=sheetQty; $("#dAdd").querySelector("strong").textContent=fmt(sheetDish.price*sheetQty); }
$("#sheetScrim").addEventListener("click", closeSheet);

/* ---------------- Cart drawer ---------------- */
function pulseCart(){ const b=$("#cartBar"); b.classList.remove("pulse"); void b.offsetWidth; b.classList.add("pulse"); }
function syncCartBar() {
  const n=cartCount(); const bar=$("#cartBar");
  bar.hidden = n===0;
  $("#cartCount").textContent=n; $("#cartCount").hidden=n===0;
  $("#cartBarTotal").textContent = n?fmt(cartTotal()):"";
  if ($("#cart").hidden===false) renderCart();
}
function openCart(){ renderCart(); $("#cartScrim").hidden=false; $("#cart").hidden=false; document.body.style.overflow="hidden";
  requestAnimationFrame(()=>{ $("#cartScrim").classList.add("open"); $("#cart").classList.add("open"); }); }
function closeCart(){ $("#cartScrim").classList.remove("open"); $("#cart").classList.remove("open");
  setTimeout(()=>{ $("#cartScrim").hidden=true; $("#cart").hidden=true;
    if ($("#sheet").hidden) document.body.style.overflow=""; }, 420); }
$("#cartBar").addEventListener("click", ()=>{ haptic(); openCart(); });
$("#cartScrim").addEventListener("click", closeCart);

function renderCart() {
  const n=cartCount();
  $("#cartSub").textContent = n ? L().cartSub(n, TABLE) : "";
  const items=$("#cartItems");
  if (!n) { items.innerHTML=`<div class="cart-empty">${L().emptyCart}</div>`;
    $("#cartTotals").innerHTML=""; $("#placeOrder").hidden=true; $("#noteWrap").hidden=true; $("#callWaiter").hidden=false; return; }
  $("#placeOrder").hidden=false; $("#noteWrap").hidden=false; $("#callWaiter").hidden=false;
  items.innerHTML = [...cart].map(([k,v])=>{
    const d=dishById(v.id); if(!d) return "";
    const sub = v.style ? styleLabel(v.style) : fmt(d.price);
    return `<div class="cart-line" data-k="${k}">
      <div class="th">${tileFor(d)}</div>
      <div class="info"><div class="nm">${dName(d)}</div><div class="sub">${sub}${v.style?` · ${fmt(d.price)}`:""}</div></div>
      <div class="stepper"><button data-d="-1">−</button><b>${v.qty}</b><button data-d="1">+</button></div>
    </div>`;
  }).join("");
  $$(".cart-line .stepper button", items).forEach(b=> b.onclick=()=>{
    const k=b.closest(".cart-line").dataset.k, v=cart.get(k); if(!v) return;
    addToCart(v.id, v.style, Number(b.dataset.d)); haptic(); renderCart();
  });
  const kcal=[...cart.values()].reduce((a,v)=>a+(dishById(v.id)?.kcal||0)*v.qty,0);
  $("#cartTotals").innerHTML=`
    <div class="row"><span>${L().total}</span><b>${fmt(cartTotal())}</b></div>
    <div class="row"><span>${L().estCal}</span><b>≈ ${kcal} ${L().kcal}</b></div>`;
  $("#orderTotal").textContent=fmt(cartTotal());
  $("#note").value = localStorage.getItem("dl-note")||"";
}
$("#note").addEventListener("input", e=>localStorage.setItem("dl-note", e.target.value));

$("#placeOrder").addEventListener("click", ()=>{
  const no = String(Math.floor(1000+Math.random()*9000));
  const order = { table:TABLE, no, items:[...cart.values()], note:($("#note").value||"").trim()||null, total:cartTotal(), at:new Date().toISOString() };
  console.log("ORDER →", JSON.stringify(order));
  const past=JSON.parse(localStorage.getItem("dl-orders")||"[]"); past.push(order); localStorage.setItem("dl-orders", JSON.stringify(past));
  cart.clear(); saveCart(); syncCartBar(); localStorage.removeItem("dl-note"); closeCart();
  $("#doneNote").textContent = L().orderNote(TABLE, no);
  $("#done").hidden=false; haptic(true);
});
$("#doneBack").addEventListener("click", ()=>{ $("#done").hidden=true; document.body.style.overflow=""; });

/* ---------------- Waiter + language + nav ---------------- */
function callWaiter(){ console.log("WAITER →", TABLE); haptic(true); toast(L().waiterOntheway); }
$("#bellBtn").addEventListener("click", callWaiter);
$("#callWaiter").addEventListener("click", callWaiter);
$("#langBtn").addEventListener("click", ()=>{ lang = lang==="zh"?"en":"zh"; localStorage.setItem("dl-lang", lang); haptic(); renderAll(); });

const toTop=$("#toTop");
toTop.addEventListener("click", ()=>{ haptic(); window.scrollTo({top:0,behavior:"smooth"}); });
addEventListener("scroll", ()=>{
  toTop.classList.toggle("show", scrollY>innerHeight*0.8);
  // active tab follows scroll
  let cur=activeSection;
  $$(".chapter").forEach(ch=>{ if (ch.getBoundingClientRect().top < 90) cur=ch.dataset.sec; });
  if (cur!==activeSection) {
    activeSection=cur;
    $$(".tab").forEach(t=>t.classList.toggle("on", t.dataset.sec===cur));
    const on=$(`.tab.on`); if(on) on.scrollIntoView({behavior:"smooth",inline:"center",block:"nearest"});
  }
}, { passive:true });

/* ---------------- Toast ---------------- */
let toastT;
function toast(msg){ const el=$("#toast"); el.textContent=msg; el.hidden=false;
  requestAnimationFrame(()=>el.classList.add("show"));
  clearTimeout(toastT); toastT=setTimeout(()=>{ el.classList.remove("show"); setTimeout(()=>el.hidden=true,300); },1800); }

/* ---------------- Boot ---------------- */
function renderAll(){ renderStatic(); renderTabs(); renderFilters(); renderMenu(); applyFilter(); syncCartBar(); }
renderAll();
