// DOM interaction checks, not a browser or pixel-level motion test.
// NODE_PATH=<temporary test dependencies>/node_modules node editions/atelier/ui-test.mjs
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import vm from "node:vm";
const { parseHTML } = createRequire(import.meta.url)("linkedom");
const origin = "http://127.0.0.1:7898",
  table = ("QD" + crypto.randomUUID().slice(0, 8)).toUpperCase();
const { window, document } = parseHTML(
  await readFile(new URL("./index.html", import.meta.url), "utf8"),
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
    search: `?table=${table}`,
    hash: "#cart",
    href: `${origin}/?table=${table}#cart`,
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
const until = async (fn) => {
  for (let i = 0; i < 200; i++) {
    if (fn()) return;
    await new Promise((r) => setTimeout(r, 5));
  }

  throw Error("UI state timed out");
};
try {
  for (const script of document.querySelectorAll("script[src]")) {
    const path = script.getAttribute("src"), response = await fetch(origin + path);
    assert.equal(response.status,200,path);
    vm.runInContext(await response.text(),context,{filename:path});
  }
  const store = run("store");
  await until(()=>store.status==="synced");
  assert.equal(run("MENU.length"),32);
  click("#closeSheet");
  await until(()=>!browserHistory.state?.atelierSheet);
  assert.equal(document.querySelector("#section-dumplings .dish-grid").children.length,0,"No filling before choosing preparation");
  assert.equal(document.querySelectorAll("[data-lunch-prep]").length,4);
  assert(document.querySelector(".lunch-service").textContent.includes("午餐"));
  for (const [prep,count] of [["soup",9],["tossed",9],["boiled",6],["fried",6]]) {
    click('[data-lunch-prep="'+prep+'"]');
    assert.equal(document.querySelectorAll("#section-dumplings .dish-card").length,count,prep);
    assert.equal(document.querySelector('[data-lunch-prep="'+prep+'"]').getAttribute("aria-pressed"),"true");
  }
  assert(document.querySelector('[data-dish="lunch-pork-chive"] .dish-price').textContent.includes("S$6.50"));
  click('[data-lunch-prep="tossed"]');
  click('[data-dish="lunch-pork-chive"]');
  assert.equal(run("detail.variants[detailStyle].prep"),"tossed");
  click('[data-lunch-option="pieces"][data-value="10"]');
  click('[data-lunch-option="spicy"][data-value="true"]');
  click('[data-lunch-option="sesame"][data-value="true"]');
  click('[data-lunch-option="noodles"][data-value="true"]');
  assert.equal(document.querySelector(".detail-price").textContent,"S$12.30");
  click('[data-detail-delta="1"]');
  assert.equal(document.querySelector('[data-action="add-detail"] strong').textContent,"S$24.60");
  click('[data-lunch-option="prep"][data-value="fried"]');
  assert.equal(document.querySelector('[data-lunch-option="noodles"]'),null);
  assert.equal(document.querySelector('[data-lunch-option="spicy"]'),null);
  assert.equal(document.querySelector(".detail-price").textContent,"S$10.80");
  click('[data-lunch-option="prep"][data-value="tossed"]');
  click('[data-lunch-option="spicy"][data-value="true"]');
  click('[data-lunch-option="sesame"][data-value="true"]');
  click('[data-lunch-option="noodles"][data-value="true"]');
  click('[data-action="add-detail"]');
  await store.flush();
  assert.equal(store.items[0].qty,2);
  assert.equal(run("total(store.items)"),24.6);
  await until(()=>!browserHistory.state?.atelierSheet);
  click('[data-lunch-prep="boiled"]');
  click('[data-dish="lunch-pork-chive"]');
  assert.equal(run("detail.variants[detailStyle].pieces"),5);
  click('[data-action="add-detail"]'); await store.flush();
  await until(()=>!browserHistory.state?.atelierSheet);
  assert.equal(store.items.length,2,"Distinct preparations/portions do not merge");
  assert.equal(run("total(store.items)"),30.1);
  click('[data-lunch-prep="soup"]');
  click('[data-dish="lunch-prawn-roe-wonton"]');
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
  assert.equal(document.querySelector(".cart-unit-price").textContent,"S$12.30/ 份");
  const minus = document.querySelector('[data-cart-delta="-1"]');
  click(minus); await store.flush();
  assert.equal(store.items[0].qty,1);
  assert.equal(run("total(store.items)"),17.8);
  assert(document.querySelector(".cart-dish-copy small").textContent.includes("10颗"));
  console.log("ROUND 5 PASS — tray click targets, paired cart variants, full kitchen options, quantities, totals and gallery/list continuity.");

  click("#closeSheet"); await until(()=>!browserHistory.state?.atelierSheet);
  click("#languageButton");
  assert.equal(document.querySelector(".lunch-service").textContent,"LUNCH MENU");
  click('[data-lunch-prep="tossed"]');
  click('[data-dish="lunch-chicken-cabbage"]');
  assert.equal(document.querySelector("#sheetTitle").textContent,"Chicken & Cabbage Dumplings");
  assert.equal(document.querySelector('[data-lunch-option="noodles"][data-value="true"]').textContent,"Add noodles +S$2.50");
  click("#closeSheet"); await until(()=>!browserHistory.state?.atelierSheet);
  click("#languageButton");
  assert.equal(run("MENU.filter(d=>!dishNameParts.has(d.cn)).length"),0,"Reviewed Chinese word boundaries for all 32 names");
  assert(!document.querySelector("#menuList").textContent.includes("示意图"));
  assert.equal(animations.length,0,"Reduced motion avoids JS movement");
  assert.equal(run("'spark' in icons"),false);
  click("#tray");
  document.querySelector("#cartNote").value = "测试订单，不制作";
  click('[data-action="review"]'); await until(()=>run("modal")==="review");
  assert(document.querySelector(".receipt-lines").textContent.includes("加芝麻酱"));
  network.loseOrderResponse = true;
  click('[data-action="submit"]');
  await until(()=>!run("submitting"));
  await store.poll();
  assert.equal(store.order,null,"Accepted order recovered by its request id after lost response");
  assert.equal(store.orders.length,1);
  assert.equal(store.orders[0].total,17.8);
  assert.equal(store.orders[0].items[0].price,12.3);
  assert.equal(store.items.length,0);
  assert(document.querySelector(".receipt-lines").textContent.includes("10颗"));
  console.log("ROUND 8 PASS — bilingual controls, Chinese words, accessible buttons, reduced motion, receipt option persistence and lost-response recovery.");
} finally { timers.forEach(id=>clearTimeout(id)); }
