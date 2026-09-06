// DOM interaction checks, not a browser or pixel-level motion test.
// NODE_PATH=<temporary test dependencies>/node_modules node editions/atelier/ui-test.mjs
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import vm from "node:vm";
const { parseHTML } = createRequire(import.meta.url)("linkedom");
const origin = "http://127.0.0.1:7898",
  table = ("QD" + crypto.randomUUID().slice(0, 8)).toUpperCase();
const browse = process.argv.includes("--browse"), named = process.argv.includes("--named");
const source = process.env.UI_SOURCE_URL || origin;
const { window, document } = parseHTML(
  process.env.UI_SOURCE_URL ? await (await fetch(source)).text() : await readFile(new URL("./index.html", import.meta.url), "utf8"),
);
const timers = new Set(),
  frames = [],
  animations = [];
const later = (fn, ms = 0) => {
  const id = setTimeout(() => {
    timers.delete(id);
    fn();
  }, ms);
  timers.add(id);
  return id;
};
const storage = new Map();
if (named) storage.set("atelier-nickname", JSON.stringify("已填名字"));
const network = { loseOrderResponse: false };
const globalListeners = new Map();
const historyEntries = [{ external: "preserved" }];
let historyIndex = 0;
const browserHistory = {
  get state() { return historyEntries[historyIndex]; },
  pushState(state) { historyEntries.splice(++historyIndex); historyEntries[historyIndex] = state; },
  replaceState(state) { historyEntries[historyIndex] = state; },
  back() {
    if (historyIndex === 0) return;
    later(() => {
      historyIndex--;
      (globalListeners.get("popstate") || []).forEach((fn) => fn({ state: this.state }));
    });
  },
  forward() {
    if (historyIndex + 1 >= historyEntries.length) return;
    later(() => {
      historyIndex++;
      (globalListeners.get("popstate") || []).forEach((fn) => fn({ state: this.state }));
    });
  },
};
let reduced = true;
Object.defineProperty(document, "activeElement", {
  value: document.body,
  writable: true,
});
window.HTMLElement.prototype.focus = function () {
  document.activeElement = this;
};
window.HTMLElement.prototype.scrollIntoView = function () {};
window.HTMLElement.prototype.scrollTo = function (options) { this.scrollLeft = options.left || 0; };
window.HTMLElement.prototype.getBoundingClientRect = function () {
  const isList = this.closest(".cart-dishes")?.dataset.layout === "list";
  const width = isList ? 62 : 100;
  return {
    left: isList ? 12 : 20,
    top: isList ? 18 : 30,
    width,
    height: width,
    right: 20 + width,
    bottom: 30 + width,
  };
};
window.HTMLElement.prototype.getAnimations = function () {
  return [];
};
window.HTMLElement.prototype.animate = function (keys, options) {
  animations.push({ keys, options });
  return { finished: Promise.resolve(), cancel() {}, pause() {} };
};
const dialog = document.querySelector("dialog");
Object.defineProperty(dialog, "open", {
  get() {
    return this.hasAttribute("open");
  },
});
dialog.showModal = function () {
  this.setAttribute("open", "");
};
dialog.close = function () {
  this.removeAttribute("open");
};
const context = vm.createContext({
  document,
  window,
  Event: window.Event,
  EventTarget: window.EventTarget,
  HTMLElement: window.HTMLElement,
  customElements: window.customElements,
  Image: function () {
    return document.createElement("img");
  },
  crypto,
  URL,
  URLSearchParams,
  AbortSignal,
  structuredClone,
  performance,
  console,
  localStorage: {
    getItem: (k) => storage.get(k) || null,
    setItem: (k, v) => storage.set(k, v),
  },
  location: {
    search: browse ? "" : `?table=${table}`,
    hash: browse ? "" : "#cart",
    href: browse ? `${origin}/` : `${origin}/?table=${table}#cart`,
    assign() {},
  },
  navigator: {},
  history: browserHistory,
  addEventListener(type, fn) {
    globalListeners.set(type, [...(globalListeners.get(type) || []), fn]);
  },
  fetch: async (path, options) => {
    const response = await fetch(new URL(path, origin), options);
    if (network.loseOrderResponse && path === "/api/order") {
      network.loseOrderResponse = false;
      throw new TypeError("Response lost after server accepted order");
    }
    return response;
  },
  setTimeout: later,
  clearTimeout: (id) => {
    clearTimeout(id);
    timers.delete(id);
  },
  setInterval: () => 0,
  clearInterval() {},
  requestAnimationFrame: (fn) => later(() => fn(performance.now())),
  cancelAnimationFrame: clearTimeout,
  matchMedia: () => ({ matches: reduced }),
  IntersectionObserver: class {
    observe() {}
    disconnect() {}
  },
  ResizeObserver: class {
    observe() {}
    disconnect() {}
  },
});
const run = (code) => vm.runInContext(code, context);
const click = (selector) => {
  const node =
    typeof selector === "string" ? document.querySelector(selector) : selector;
  assert(node, `Missing ${selector}`);
  node.focus();
  node.dispatchEvent(new window.Event("click", { bubbles: true }));
  return node;
};
const choosePreparation = (id, extras = {}) => {
  if (document.querySelector('[data-lunch-back]')) click('[data-lunch-back]');
  click(`[data-lunch-prep="${id}"]`);
  assert.equal(document.querySelectorAll('#section-dumplings .dish-card').length,0,"Selecting preparation alone must not reveal fillings before confirming flavor options");
  for (const [field,value] of Object.entries(extras)) click(`[data-lunch-flavor="${field}"][data-value="${value}"]`);
  click('[data-lunch-next]');
};
const until = async (fn) => {
  for (let i = 0; i < 200; i++) {
    if (fn()) return;
    await new Promise((r) => setTimeout(r, 5));
  }

  throw Error("UI state timed out");
};
try {
  for (const script of document.querySelectorAll("script[src]")) {
    const path = script.getAttribute("src"), response = await fetch(new URL(path, source));
    assert.equal(response.status,200,path);
    vm.runInContext(await response.text(),context,{filename:path});
  }
  const store = run("store");
  if (!browse) await until(()=>store.status==="synced");
  assert.equal(run("MENU.length"),35);
  if (!browse) click("#closeSheet");
  await until(()=>!browserHistory.state?.atelierSheet);

  assert.deepEqual(Array.from(document.querySelectorAll(".menu-section")).map(s=>s.dataset.section), ["recommended","dumplings","noodles","sides","drinks"]);
  assert.equal(document.querySelectorAll("#section-recommended .dish-card").length,6);
  for (const button of document.querySelectorAll('#section-recommended .dish-add:not([disabled])')) assert.equal(button.textContent, '+', 'Recommendation uses the same plus entry as other dishes');
  assert.equal(document.querySelectorAll('#section-recommended [disabled]').length,0,'All six recommendations are now open');
  for (const id of ["chive-fried","chicken-fried","pork-soup","red-oil-chaoshou"]) {
    const recommendationImage = document.querySelector(`[data-recommendation="${id}"] img`).getAttribute("src");
    click(`[data-recommendation="${id}"]`);
    assert.equal(run("modal"),"dish");
    if (id.endsWith("fried")) {
      assert(recommendationImage.includes("cutaway-v1"));
      assert.equal(document.querySelector(".detail-image img").getAttribute("src"), recommendationImage.replace("/s/", "/l/"));
    }
    assert.equal(document.querySelector('[data-lunch-option="prep"]'),null,"Recommended preparation stays locked");
    click('[data-lunch-option="pieces"][data-value="9"]');
    assert.equal(run("detail.variants[detailStyle].pieces"),9);
    click("#closeSheet"); await until(()=>!browserHistory.state?.atelierSheet);
  }
  click('[data-recommendation="boiled-dumplings"]');
  assert.equal(run("modal"),"filling");
  assert.equal(document.querySelectorAll("[data-boiled-filling]").length,5);
  click('[data-boiled-filling="lunch-v2-pork-cabbage"]');
  assert.equal(run("detail.id"),"lunch-v2-pork-cabbage");
  assert.equal(run("detail.variants[detailStyle].prep"),"boiled");
  assert.equal(document.querySelector(".detail-price").textContent,"S$5.80");
  click("#closeSheet"); await until(()=>!browserHistory.state?.atelierSheet);
  assert.equal(store.items.length,0,"Browsing recommendation choices never adds without confirmation");
  assert(!document.querySelector('[data-recommendation="roe-wonton-noodles"]').disabled);
  assert(document.querySelector('[data-recommendation="roe-wonton-noodles"] .dish-price').textContent.includes('S$10.20'));
  click('[data-recommendation="roe-wonton-noodles"]');
  assert.equal(run('detail.variants[detailStyle].noodles'),true);
  assert.equal(document.querySelector('.detail-price').textContent,'S$10.20');
  click('[data-lunch-option="pieces"][data-value="9"]');
  assert.equal(document.querySelector('.detail-price').textContent,'S$14.50');
  assert.equal(document.querySelector('[data-lunch-option="noodles"]'),null,'Named noodle recommendation always includes noodles');
  click('#closeSheet'); await until(()=>!browserHistory.state?.atelierSheet);
  console.log("RECOMMENDATIONS PASS — section order, all recommendations enabled, direct presets, white-boiled filling chooser and portions.");

  assert.equal(document.querySelector("#section-dumplings .dish-grid").children.length,0,"No filling before choosing preparation");
  assert.equal(document.querySelectorAll('[data-lunch-prep] img').length,4,"All four flavor entries have photos");
  run('openDish(dish("lunch-v2-pork-chive-shrimp"))');
  assert.equal(run('modal'),null,"A direct dish entry cannot bypass preparation selection");
  choosePreparation("tossed");
  for (const dish of run('MENU.filter(d=>d.section!=="recommended")')) {
    const card = document.querySelector(`[data-dish="${dish.id}"]`);
    assert(card.querySelector(".dish-image img"), `${dish.cn} must have a menu photo`);
    assert(!card.closest(".dish-card").classList.contains("text-dish"));
    click(card);
    assert.equal(document.querySelector(".detail-image img").getAttribute("src"), run(`photo(dish('${dish.id}'), 'l', detailStyle)`));
    click("#closeSheet"); await until(()=>!browserHistory.state?.atelierSheet);
  }
  // Render a full catalogue cart fixture without creating API cart/order writes.
  const savedRemote = store.remote;
  store.remote = { ...savedRemote, items: run('MENU.map(d => ({id:d.id, style:d.preparationImages?.fried ? "煎 · 5颗" : d.styles?.[0] || null, qty:1}))') };
  run('showCart()');
  assert.equal(document.querySelectorAll(".cart-photo img").length,35,"All cart dishes have images");
  const cutawayCartImages = [...document.querySelectorAll('.cart-photo img')].map(img=>img.getAttribute('src')).filter(src=>src.includes('cutaway-v1'));
  assert.equal(new Set(cutawayCartImages).size,5,"All five fried fillings keep their own cutaway photo in the cart");
  store.remote = savedRemote;
  run('renderTray()');
  click("#closeSheet"); await until(()=>!browserHistory.state?.atelierSheet);
  console.log("MENU PHOTOS PASS — all 35 products, recommendation/menu cards, detail views and cart fixtures have corresponding images.");
  click('[data-lunch-back]');
  assert.equal(document.querySelectorAll("[data-lunch-prep]").length,4);
  assert(document.querySelector(".lunch-service").textContent.includes("午餐"));
  for (const [prep,count] of [["soup",3],["tossed",8],["boiled",5],["fried",5]]) {
    choosePreparation(prep);
    assert.equal(document.querySelectorAll("#section-dumplings .dish-card").length,count,prep);
    if (prep !== "soup") {
      const dumplingImages = run('MENU.filter(d=>d.kind==="dumpling")').map(d=>{
        const src=document.querySelector(`[data-dish="${d.id}"] .dish-image img`).getAttribute('src');
        assert.equal(src,run(`photo(dish('${d.id}'),'s',LunchMenu.firstStyle(dish('${d.id}')))`));
        assert(src.includes('cutaway-v1'));
        return src;
      });
      assert.equal(new Set(dumplingImages).size,5,`${prep}: five different fillings must not reuse one image`);
    }
    assert(document.querySelector('.lunch-chosen-flavor strong').textContent.length);
    const restricted = ['lunch-v2-prawn-roe-wonton','lunch-v2-pork-wonton','lunch-v2-chicken-corn-wonton'];
    for (const id of restricted) assert.equal(Boolean(document.querySelector(`#section-dumplings [data-dish="${id}"]`)), ['soup','tossed'].includes(prep));
  }
  assert(document.querySelector('[data-dish="lunch-v2-pork-chive-shrimp"] .dish-price').textContent.includes("S$6.80"));
  choosePreparation("tossed",{spicy:true,sesame:true,noodles:true});
  assert(document.querySelector('.lunch-chosen-flavor strong').textContent.includes('加面 +S$3'));
  assert(document.querySelector('[data-dish="lunch-v2-pork-chive-shrimp"] .dish-price').textContent.includes('S$9.80'));
  click('[data-dish="lunch-v2-pork-chive-shrimp"]');
  assert.equal(run("detail.variants[detailStyle].prep"),"tossed");
  assert(run('detail.variants[detailStyle].spicy && detail.variants[detailStyle].sesame && detail.variants[detailStyle].noodles'));
  click('[data-lunch-option="pieces"][data-value="9"]');
  assert.equal(document.querySelector(".detail-price").textContent,"S$13.80");
  click('[data-detail-delta="1"]');
  assert.equal(document.querySelector('[data-action="add-detail"] strong').textContent,"S$27.60");
  click('[data-lunch-option="prep"][data-value="fried"]');
  assert(document.querySelector('.detail-image img').getAttribute('src').includes('potstickers-pork-shrimp-chive-cutaway-v1'));
  assert.equal(document.querySelector('[data-lunch-option="noodles"]'),null);
  assert.equal(document.querySelector('[data-lunch-option="spicy"]'),null);
  assert.equal(document.querySelector(".detail-price").textContent,"S$10.80");
  assert(run('!detail.variants[detailStyle].spicy && !detail.variants[detailStyle].sesame && !detail.variants[detailStyle].noodles'));
  click('[data-lunch-option="prep"][data-value="tossed"]');
  click('[data-lunch-option="spicy"][data-value="true"]');
  click('[data-lunch-option="sesame"][data-value="true"]');
  click('[data-lunch-option="noodles"][data-value="true"]');
  assert.equal(document.querySelector('.detail-price').textContent,'S$13.80');
  click('[data-action="add-detail"]');
  await store.flush();
  assert.equal(store.items[0].qty,2);
  assert.equal(run("total(store.items)"),27.6);
  await until(()=>!browserHistory.state?.atelierSheet);
  if (browse) {
    assert.equal(run("modal"),null,"Adding without a table must not open a name or table form");
    assert.equal(store.table,null);
    assert.equal(store.nickname,named ? "已填名字" : "");
    assert.equal(run("new TableCart(null, group).items[0].qty"),2,"Browsing draft survives a reload");
    const draftIds = store.pending.map(op=>op.opId);
    click("#tray");
    document.querySelector("#cartNote").value = "保留做法和备注";
    click('[data-action="review"]');
    assert.equal(run("modal"),"table");
    assert.equal(document.querySelector("#nickname"),null,"Table entry cannot be confused with a name form");
    const form = document.querySelector("#tableEntryForm");
    for (const invalid of ["", "<A1>", "A 1"]) {
      document.querySelector("#tableEntry").value = invalid;
      form.dispatchEvent(new window.Event("submit",{bubbles:true,cancelable:true}));
      assert.equal(store.table,null);
      assert(document.querySelector("#tableEntryError").textContent.length);
      assert.equal(store.items[0].qty,2);
    }
    document.querySelector("#tableEntry").value = ` ${table.toLowerCase()} `;
    form.dispatchEvent(new window.Event("submit",{bubbles:true,cancelable:true}));
    await until(()=>run("modal")==="review");
    assert.equal(store.table,table);
    assert.equal(store.items[0].qty,2,"Table handoff adds each portion exactly once");
    assert.equal(store.note,"保留做法和备注");
    assert(draftIds.every(id=>store.remote.opIds.includes(id)),"Handoff preserves operation IDs");
    assert.equal(run("new TableCart(null, group).items.length"),0,"Transferred browsing draft cleared");
    assert.equal(run(`new TableCart('${table}', group).items[0].qty`),2,"Confirmed table survives reload");
    assert.equal(store.orders.length,0,"Selecting a table never submits an order");
    assert(document.querySelector(".receipt-lines").textContent.includes("9颗"));
    click("#closeSheet"); await until(()=>!browserHistory.state?.atelierSheet);
    console.log(`ROOT ENTRY PASS — ${named ? "saved name" : "no name"}, add without table, persisted draft, validation, handoff, note and no premature order.`);
  }
  choosePreparation("boiled");
  click('[data-dish="lunch-v2-pork-chive-shrimp"]');
  assert.equal(run("detail.variants[detailStyle].pieces"),5);
  click('[data-action="add-detail"]'); await store.flush();
  await until(()=>!browserHistory.state?.atelierSheet);
  assert.equal(store.items.length,2,"Distinct preparations/portions do not merge");
  assert.equal(run("total(store.items)"),34.4);
  choosePreparation("soup");
  click('[data-dish="lunch-v2-prawn-roe-wonton"]');
  assert.equal(document.querySelectorAll('[data-lunch-option="prep"]').length,2);
  click("#closeSheet"); await until(()=>!browserHistory.state?.atelierSheet);
  console.log("ROUND 4 PASS — preparation-first flow, conditional options, portions, live prices and restricted wontons.");

  for (const target of [".table-tray","#trayPictures img","#trayTotal","#trayActionLabel"]) {
    click(target); assert.equal(run("modal"),"cart",target);
    assert.equal(document.querySelector("#sheetTitle").textContent,"本桌点单");
    click("#closeSheet"); await until(()=>!browserHistory.state?.atelierSheet);
  }
  click("#tray");
  const photo = document.querySelector(".cart-photo img");
  click("[data-table-layout]"); click("[data-table-layout]");
  assert.equal(document.querySelector(".cart-photo img"),photo,"Same image retained between layouts");
  assert.equal(document.querySelectorAll(".shared-dish").length,2);
  assert.equal(document.querySelector(".cart-unit-price").textContent,"S$13.80/ 份");
  assert(document.querySelector('.cart-dish-copy small').textContent.includes('加芝麻酱'));
  assert(document.querySelector('.cart-dish-copy small').textContent.includes('加面'));
  const minus = document.querySelector('[data-cart-delta="-1"]');
  click(minus); await store.flush();
  assert.equal(store.items[0].qty,1);
  assert.equal(run("total(store.items)"),20.6);
  assert(document.querySelector(".cart-dish-copy small").textContent.includes("9颗"));
  console.log("ROUND 5 PASS — tray click targets, paired cart variants, full kitchen options, quantities, totals and gallery/list continuity.");

  click("#closeSheet"); await until(()=>!browserHistory.state?.atelierSheet);
  click("#languageButton");
  assert.equal(document.querySelector(".lunch-service").textContent,"LUNCH MENU");
  choosePreparation("tossed");
  click('[data-dish="lunch-v2-chicken-cabbage"]');
  assert.equal(document.querySelector("#sheetTitle").textContent,"Chicken & Cabbage Dumplings");
  assert.equal(document.querySelector('[data-lunch-option="noodles"][data-value="true"]').textContent,'Add noodles +S$3');
  click("#closeSheet"); await until(()=>!browserHistory.state?.atelierSheet);
  click("#languageButton");
  assert.equal(run("MENU.filter(d=>!dishNameParts.has(d.cn)).length"),0,"Reviewed Chinese word boundaries for all 35 names");
  run('showPaper()');
  assert.equal(document.querySelectorAll('.paper-row[data-recommendation]').length,6);
  click('[data-recommendation="boiled-dumplings"]');
  assert.equal(document.querySelectorAll('[data-boiled-filling]').length,5);
  click("#closeSheet"); await until(()=>!browserHistory.state?.atelierSheet);
  browserHistory.forward(); await until(()=>run('modal')==='filling');
  assert.equal(document.querySelectorAll('[data-boiled-filling]').length,5,"Forward restores the correct filling chooser");
  click("#closeSheet"); await until(()=>!browserHistory.state?.atelierSheet);
  assert(!document.querySelector("#menuList").textContent.includes("示意图"));
  assert.equal(animations.length,0,"Reduced motion avoids JS movement");
  assert.equal(run("'spark' in icons"),false);
  click("#tray");
  document.querySelector("#cartNote").value = "测试订单，不制作";
  click('[data-action="review"]'); await until(()=>run("modal")==="review");
  assert(document.querySelector(".receipt-lines").textContent.includes("9颗"));
  network.loseOrderResponse = true;
  click('[data-action="submit"]');
  await until(()=>!run("submitting"));
  await store.poll();
  assert.equal(store.order,null,"Accepted order recovered by its request id after lost response");
  assert.equal(store.orders.length,1);
  assert.equal(store.orders[0].total,20.6);
  assert.equal(store.orders[0].items[0].price,13.8);
  assert(store.orders[0].items[0].style.includes('辣 · 加芝麻酱 · 加面'));
  assert.equal(store.items.length,0);
  assert(document.querySelector(".receipt-lines").textContent.includes("9颗"));
  console.log("ROUND 8 PASS — bilingual controls, Chinese words, accessible buttons, reduced motion, receipt option persistence and lost-response recovery.");
  click('#closeSheet'); await until(()=>!browserHistory.state?.atelierSheet);
  assert(document.querySelector('[data-recommendation="red-oil-chaoshou"] .dish-price').textContent.includes('S$5.80'));
  click('.dish-add[data-recommendation="red-oil-chaoshou"]');
  assert.equal(run('detail.id'),'lunch-v4-red-oil-chaoshou');
  assert.equal(document.querySelector('#sheetTitle').textContent,'红油抄手');
  assert.equal(document.querySelector('.detail-price').textContent,'S$5.80');
  assert.equal(document.querySelector('[data-lunch-option="prep"]'),null);
  assert.equal(document.querySelector('[data-lunch-option="spicy"]'),null);
  click('[data-lunch-option="pieces"][data-value="9"]');
  assert.equal(document.querySelector('.detail-price').textContent,'S$9.20');
  click('[data-detail-delta="1"]');
  assert.equal(document.querySelector('[data-action="add-detail"] strong').textContent,'S$18.40');
  click('[data-action="add-detail"]'); await store.flush();
  await until(()=>!browserHistory.state?.atelierSheet);
  assert.equal(store.items[0].id,'lunch-v4-red-oil-chaoshou');
  assert.equal(store.items[0].style,'红油 · 9颗');
  assert.equal(run('total(store.items)'),18.4);
  click('#tray');
  assert(document.querySelector('.cart-dish-copy').textContent.includes('红油抄手'));
  click('[data-cart-dish="lunch-v4-red-oil-chaoshou"]');
  assert.equal(document.querySelector('.detail-price').textContent,'S$9.20');
  click('#closeSheet'); await until(()=>run('modal')==='cart');
  click('[data-action="review"]'); await until(()=>run('modal')==='review');
  assert(document.querySelector('.receipt-lines').textContent.includes('红油抄手'));
  click('[data-action="submit"]'); await until(()=>!run('submitting')); await store.poll();
  const chaoshouOrder=store.orders.find(o=>o.items.some(i=>i.id==='lunch-v4-red-oil-chaoshou'));
  assert(chaoshouOrder);
  assert.equal(chaoshouOrder.total,18.4);
  assert.equal(chaoshouOrder.items[0].name,'红油抄手');
  assert.equal(chaoshouOrder.items[0].price,9.2);
  assert.equal(chaoshouOrder.items[0].style,'红油 · 9颗');
  console.log('CHAOSHOU PASS — enabled recommendation, both portions, fixed red-oil method, cart/reopen, checkout and authoritative independent receipt.');
  const originalNickname = store.nickname;
  const originalOrderCount = store.orders.length;
  run('showCart()');
  for (const value of ['小陈', '', originalNickname]) {
    click('[data-action="nickname"]');
    assert.equal(run('modal'), 'profile');
    assert.equal(document.querySelectorAll('#sheetBody h2').length, 1);
    assert.equal(document.querySelector('#sheetTitle').textContent, '设置称呼');
    assert.equal(document.querySelector('.nickname-form label'), null, 'No duplicate large question heading');
    assert.equal(document.querySelector('#nickname').getAttribute('aria-describedby'), 'nicknameHint');
    assert(document.querySelector('#nickname').getAttribute('aria-label').includes('选填'));
    assert(document.querySelector('#nicknameHint').textContent.includes('不填'));
    assert.equal(document.querySelector('[data-action="save-nickname"]').textContent, '保存');
    document.querySelector('#nickname').value = value;
    click('[data-action="save-nickname"]');
    assert.equal(store.nickname, value);
    assert.equal(run('modal'), 'cart');
    assert.equal(store.orders.length, originalOrderCount, 'Saving a name never places an order');
  }
  click('[data-action="nickname"]');
  document.querySelector('#nickname').value = '未保存';
  click('#closeSheet'); await until(()=>!browserHistory.state?.atelierSheet);
  assert.equal(store.nickname, originalNickname, 'Close cancels unsaved edits');
  run('showCart()'); click('[data-action="nickname"]');
  document.querySelector('#nickname').value = originalNickname;
  const enterName = new window.Event('keydown', {bubbles:true, cancelable:true});
  enterName.key = 'Enter';
  document.querySelector('#nickname').dispatchEvent(enterName);
  assert.equal(run('modal'), 'cart', 'Enter saves the optional name');
  assert.equal(store.orders.length, originalOrderCount);
  click('#closeSheet'); await until(()=>!browserHistory.state?.atelierSheet);
  click('#languageButton'); run('showCart()'); click('[data-action="nickname"]');
  assert.equal(document.querySelector('#sheetTitle').textContent, 'Set name');
  assert.equal(document.querySelector('[data-action="save-nickname"]').textContent, 'Save');
  assert.equal(document.querySelector('#nickname').getAttribute('aria-label'), 'Name (optional)');
  click('#closeSheet'); await until(()=>!browserHistory.state?.atelierSheet);
  click('#languageButton');
  console.log('PROFILE PASS — compact single-heading editor, accessible optional name, save/clear/cancel, no order mutation.');
} finally { timers.forEach(id=>clearTimeout(id)); }
