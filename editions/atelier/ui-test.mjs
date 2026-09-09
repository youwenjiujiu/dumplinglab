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
    const path = script.getAttribute("src"),
      response = await fetch(origin + path);
    assert.equal(response.status, 200, path);
    vm.runInContext(await response.text(), context, { filename: path });
  }
  const store = run("store");
  assert.equal(run("'spark' in icons"), false, "Recommendation does not use a generic AI sparkle");
  assert.equal(document.querySelector("#planButton svg").getAttribute("aria-hidden"), "true");
  assert.equal(document.querySelector("#planButton").textContent, "推荐搭配");
  await until(() => store.status === "synced");
  assert.equal(run("modal"), "cart");
  assert(document.querySelector(".table-empty"));
  assert.equal(run("MENU.filter(d => !dishNameParts.has(d.cn)).length"), 0, "Every current Chinese dish has reviewed word boundaries");
  assert.equal(document.querySelector('[data-dish="beijing-pork-guotie"] .dish-name').textContent, "北京猪肉锅贴");
  assert.equal(document.querySelector('[data-dish="beijing-pork-guotie"] .dish-name .dish-word:nth-of-type(2)').textContent, "猪肉");
  click('[data-action="nickname"]');
  document.querySelector("#nickname").value = "小陈";
  click('[data-action="save-nickname"]');
  assert.equal(store.nickname, "小陈");
  click('[data-action="close"]');
  for (const id of [
    "beijing-pork-guotie",
    "jp-chicken-gyoza",
    "hk-crab-roe-wonton",
  ]) {
    click(`[data-add="${id}"]`);
    await store.flush();
  }
  assert.equal(store.items.length, 3);
  assert.equal(
    document.querySelector('[data-table-count="beijing-pork-guotie"]')
      .textContent,
    "本桌已有 1 份",
  );
  for (const target of [".table-tray", "#trayPictures img", "#trayTotal", "#trayActionLabel"]) {
    click(target);
    assert.equal(run("modal"), "cart", `The full tray opens from ${target}`);
    click("#closeSheet");
    await until(() => !browserHistory.state?.atelierSheet);
  }
  const rack = document.querySelector("#trayPictures");
  const trayPointer = (type, x) => {
    const event = new window.Event(type, { bubbles: true });
    Object.assign(event, { pointerId: 7, clientX: x, clientY: 10 });
    rack.dispatchEvent(event);
  };
  trayPointer("pointerdown", 10);
  trayPointer("pointermove", 45);
  trayPointer("pointerup", 45);
  click("#trayPictures img");
  assert.equal(run("modal"), null, "Swiping the photo strip does not open the cart");
  const enterTray = new window.Event("keydown", { bubbles: true, cancelable: true });
  enterTray.key = "Enter";
  rack.dispatchEvent(enterTray);
  assert.equal(run("modal"), "cart", "Photo strip is keyboard operable");
  click("#closeSheet");
  await until(() => !browserHistory.state?.atelierSheet);
  click("#tray");
  assert.equal(document.querySelectorAll(".shared-dish").length, 3);
  assert.equal(document.querySelector("#sheetTitle").textContent, "本桌点单");
  assert.equal(document.querySelector(".table-number strong").textContent, table);
  assert([...document.querySelectorAll(".cart-author")].every((node) => !node.textContent), "Do not repeat self-attribution on every dish");
  document.querySelector(".cart-scroll").scrollTop = 120;
  run("SharedTable.open()");
  assert.equal(document.querySelector(".cart-scroll").scrollTop, 0, "Fresh cart entry starts at its heading");
  click('[data-cart-delta="-1"][data-id="jp-chicken-gyoza"]');
  await store.flush();
  assert.equal(store.items.some((i) => i.id === "jp-chicken-gyoza"), false);
  assert.equal(document.querySelector('[data-action="undo-remove"]'), null);
  run('add(dish("jp-chicken-gyoza"), null, 1)');
  await store.flush();
  const photo = document.querySelector(".cart-photo img");
  click("[data-table-layout]");
  assert.equal(document.querySelector(".cart-dishes").dataset.layout, "list");
  assert.equal(
    document.querySelector(".cart-photo img"),
    photo,
    "Layout switch preserves actual image nodes",
  );
  click("[data-table-layout]");
  assert.equal(document.querySelector(".cart-dishes").dataset.layout, "table");
  const plus = click('.cart-quantity [data-cart-delta="1"]');
  await store.flush();
  assert.equal(store.items[0].qty, 2);
  assert.equal(
    document.activeElement.dataset.cartDelta,
    "1",
    "Quantity control focus survives render",
  );
  click("[data-cart-dish]");
  assert.equal(run("modal"), "dish");
  assert.equal(document.querySelector("#closeSheet").textContent, "←");
  const plate = document.querySelector(".detail-image");
  const pointer = (type, x, y) => {
    const event = new window.Event(type, { bubbles: true, cancelable: true });
    Object.assign(event, { pointerId: 1, clientX: x, clientY: y, button: 0, isPrimary: true });
    plate.dispatchEvent(event);
  };
  pointer("pointerdown", 0, 0);
  pointer("pointermove", 100, 2);
  assert.equal(plate.getAttribute("aria-valuenow"), "15");
  pointer("pointermove", 1000, 2);
  assert.equal(plate.getAttribute("aria-valuenow"), "22", "Rotation is bounded");
  pointer("pointerup", 1000, 2);
  pointer("pointerdown", 0, 0);
  pointer("pointermove", 1, 50);
  pointer("pointermove", -100, 51);
  assert.equal(plate.getAttribute("aria-valuenow"), "22", "Vertical scroll does not rotate the dish");
  const reset = new window.Event("keydown", { bubbles: true, cancelable: true });
  reset.key = "Home";
  plate.dispatchEvent(reset);
  assert.equal(plate.getAttribute("aria-valuenow"), "0");
  const stillImage = plate.querySelector("img");
  pointer("pointerdown", 0, 0);
  pointer("pointermove", 60, 0);
  pointer("pointerup", 60, 0);
  const detailPlus = click('[data-detail-delta="1"]');
  assert.equal(document.querySelector(".detail-image img"), stillImage, "Changing portions does not reload the photo");
  assert.equal(plate.getAttribute("aria-valuenow"), "9", "Rotation survives quantity changes");
  assert.equal(document.activeElement, detailPlus, "Detail quantity focus is stable");
  assert.equal(document.querySelector('[data-action="add-detail"] strong').textContent, "S$19.60");
  click("#closeSheet");
  assert.equal(run("modal"), "cart");
  const peer = {
    opId: crypto.randomUUID(),
    deviceId: crypto.randomUUID(),
    table,
    group: "A",
    kind: "delta",
    dishId: "jp-chicken-gyoza",
    delta: 1,
    actorName: "小李",
  };
  await fetch(origin + "/api/cart", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(peer),
  });
  await store.poll();
  assert.match(
    document.querySelector("#tableActivity").textContent,
    /小李端上了/,
  );
  assert.match(
    document.querySelector('[data-cart-key="jp-chicken-gyoza|"] .cart-author')
      .textContent,
    /小李/,
  );
  const note = document.querySelector("#cartNote");
  note.value = "不要香菜";
  note.dispatchEvent(new window.Event("input", { bubbles: true }));
  click('[data-action="review"]');
  await until(() => run("modal") === "review");
  assert.match(
    document.querySelector(".paper-receipt").textContent,
    /不要香菜/,
  );
  assert.equal(
    document.querySelector(".receipt-stamp"),
    null,
    "No stamp before confirmation",
  );
  network.loseOrderResponse = true;
  click('[data-action="submit"]');
  await until(() => Boolean(store.order) && !run("submitting"));
  assert.match(document.querySelector("#reviewUpdate").textContent, /结果还未确认/);
  assert.equal(document.querySelector(".receipt-stamp"), null, "Uncertain requests are not marked successful");
  const uncertainId = store.order.requestId;
  await store.poll();
  await until(() => run("modal") === "success");
  assert.equal(store.orders[0].id, uncertainId, "Authoritative polling resolves the exact original request");
  assert.equal(document.querySelector(".receipt-stamp").textContent, "已提交");
  assert.equal(store.items.length, 0);
  assert.equal(store.orders.length, 1);
  assert.equal(store.orders[0].note, "不要香菜");
  assert.match(
    document.querySelector(".paper-receipt").textContent,
    /未发送至真实厨房/,
  );
  click('[data-action="ordered"]');
  await store.poll();
  assert(document.querySelector(".placed-receipts"));
  assert.equal(
    animations.length,
    0,
    "Reduced motion never flies, scales or stamps through JS",
  );
  // Missing surfaces, interrupted updates and normal-motion paths stay safe.
  reduced = false;
  run("TableMotion.reconcile(null, new Map()); TableMotion.capture(null)");
  click("#closeSheet");
  click('[data-add="beijing-pork-guotie"]');
  await store.flush();
  click("#tray");
  const imageBefore = document.querySelector(".cart-photo img");
  click("[data-table-layout]");
  click("[data-table-layout]");
  assert.equal(document.querySelector(".cart-photo img"), imageBefore);
  assert(animations.length > 0, "Normal-motion layout transition runs");
  click("#closeSheet");
  for (const id of ["jp-chicken-gyoza", "hk-crab-roe-wonton", ...run("MENU.filter(d => d.img && !d.styles && !['beijing-pork-guotie', 'jp-chicken-gyoza', 'hk-crab-roe-wonton'].includes(d.id)).slice(0, 3).map(d => d.id)")]) {
    click(`[data-add="${id}"]`);
    await store.flush();
  }
  assert.equal(document.querySelectorAll("#trayPictures img").length, 6, "All six selected dishes are in the tray");
  assert.equal(document.querySelector(".tray-more"), null);
  assert.equal(document.querySelector("#tray").contains(document.querySelector("#trayPictures")), false, "Scrolling photos is independent of the checkout button");
  click("#planButton");
  assert.equal(document.querySelector("#sheetEyebrow").textContent, "");
  assert.equal(document.querySelector("#sheetTitle").textContent, "推荐搭配");
  await until(() => browserHistory.state?.atelierSheet);
  browserHistory.back();
  await until(() => run("modal") === null);
  // Discovery: composition, bilingual tokens, persistent filter context and reset.
  assert.equal(browserHistory.state.external, "preserved", "Dialog navigation preserves parent state");
  browserHistory.forward();
  await until(() => run("modal") === "planner");
  click("#closeSheet");
  await until(() => !browserHistory.state?.atelierSheet);
  click("#tray");
  click("[data-cart-dish]");
  browserHistory.back();
  await until(() => run("modal") === "cart");
  browserHistory.back();
  await until(() => run("modal") === null);
  click("#searchButton");
  const searchInput = document.querySelector("#searchInput");
  const inputSearch = (value) => {
    searchInput.value = value;
    searchInput.dispatchEvent(new window.Event("input", { bubbles: true }));
  };
  searchInput.dispatchEvent(new window.Event("compositionstart", { bubbles: true }));
  inputSearch("bei");
  await new Promise((resolve) => later(resolve, 210));
  assert.equal(run("search"), "", "IME composition does not render incomplete syllables");
  searchInput.value = "pork Beijing";
  searchInput.dispatchEvent(new window.Event("compositionend", { bubbles: true }));
  await until(() => document.querySelectorAll(".dish-card").length === 2);
  assert(document.querySelector('[data-dish="beijing-pork-guotie"]'));
  assert(document.querySelector('[data-dish="beijing-zhajiang-noodles"]'), "Search includes the documented pork ingredient, not only the title");
  assert.match(document.querySelector("#searchSummaryText").textContent, /2 道菜/);
  click("#languageButton");
  assert.equal(document.querySelectorAll(".dish-card").length, 2, "Language does not change search matching");
  assert.match(document.querySelector("#searchSummaryText").textContent, /2 dishes/);
  click("#languageButton");
  const escapeSearch = new window.Event("keydown", { bubbles: true, cancelable: true });
  escapeSearch.key = "Escape";
  searchInput.dispatchEvent(escapeSearch);
  assert.equal(document.querySelector("#searchPanel").hidden, true);
  assert.equal(document.querySelector("#searchSummary").hidden, false, "Collapsed search keeps active conditions visible");
  click("#resetSearchFilters");
  assert.equal(document.querySelector("#searchSummary").hidden, true);
  assert.equal(document.querySelectorAll(".dish-card").length, run("MENU.length"));
  click("#searchButton");
  inputSearch("ＰＯＲＫ　ＢＥＩＪＩＮＧ");
  await until(() => document.querySelectorAll(".dish-card").length === 2);
  click('[data-filter="veg"]');
  assert(document.querySelector(".empty-state"), "Search and dietary label filters intersect");
  assert.equal(document.activeElement.dataset.filter, "veg");
  click('#categoryScroll [data-category="noodles"]');
  assert.equal(run("search"), "");
  assert.equal(run("filter"), "all");
  assert.equal(run("activeCategory"), "noodles");
  assert.equal(document.querySelectorAll(".dish-card").length, run("MENU.length"));
  const styledDish = run("MENU.find(d => d.styles?.length > 1)");
  click(`[data-add="${styledDish.id}"]`);
  const stylePhoto = document.querySelector(".detail-image img");
  click(`[data-style="${styledDish.styles[1]}"]`);
  assert.equal(document.querySelector(".detail-image img"), stylePhoto, "Changing preparation keeps the photo mounted");
  click('[data-action="add-detail"]');
  await store.flush();
  click("#tray");
  click(`[data-cart-dish="${styledDish.id}"][data-cart-key="${styledDish.id}|${styledDish.styles[1]}"]`);
  assert.equal(document.querySelector(".styles .active").dataset.style, styledDish.styles[1], "Opening a selected dish retains its preparation");
  const missingPhoto = document.querySelector(".detail-image img");
  missingPhoto.dispatchEvent(new window.Event("error", { bubbles: true }));
  assert(document.querySelector(".detail-image.image-unavailable"));
  assert.equal(document.querySelector(".detail-image").getAttribute("role"), "group");
  assert.equal(document.querySelector("#sheetTitle").textContent, styledDish.cn, "Dish name remains available after photo failure");
  click('[data-detail-delta="1"]');
  assert.equal(document.querySelector(".dish-action .quantity b").textContent, "2");
  click("[data-image-retry]");
  assert.match(missingPhoto.src, /retry=/);
  assert.equal(document.querySelector("[data-image-retry]").disabled, true);
  missingPhoto.dispatchEvent(new window.Event("load", { bubbles: true }));
  assert.equal(document.querySelector(".image-fallback"), null);
  assert.equal(document.querySelector(".detail-image").getAttribute("role"), null);
  assert.equal(document.querySelector(".detail-image img"), missingPhoto);
  click("#closeSheet");
  click("#closeSheet");
  for (const id of run("MENU.filter(d => d.img && !d.styles && !store.items.some(i => i.id === d.id)).slice(0, 5).map(d => d.id)")) {
    click(`[data-add="${id}"]`);
    await store.flush();
  }
  assert.equal(document.querySelectorAll("#trayPictures [data-id]").length, 12, "All 12 distinct selected dishes remain in the tray");
  click("#tray");
  assert.equal(document.querySelectorAll(".shared-dish").length, 12);
  const largeTablePhotos = [...document.querySelectorAll(".cart-photo img")];
  click("[data-table-layout]");
  click("[data-table-layout]");
  assert.deepEqual([...document.querySelectorAll(".cart-photo img")], largeTablePhotos, "Large-table layout changes retain every photograph");
  const sharedNoteBase = store.note;
  const peerEdit = async (data) => {
    const response = await fetch(origin + "/api/cart", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ opId: crypto.randomUUID(), deviceId: peer.deviceId, table, group: "A", actorName: "小李", ...data }),
    });
    assert.equal(response.status, 200);
  };
  await peerEdit({ kind: "note", baseNote: sharedNoteBase, note: "不要葱" });
  const conflictNote = document.querySelector("#cartNote");
  conflictNote.focus();
  conflictNote.value = "少盐";
  conflictNote.dispatchEvent(new window.Event("input", { bubbles: true }));
  await until(() => Boolean(store.noteConflict));
  assert.equal(conflictNote.value, "少盐", "Local note draft survives a remote conflict");
  assert.match(document.querySelector("#noteConflict").textContent, /不要葱/);
  assert.equal(document.querySelector('[data-action="review"]').disabled, true);
  click('[data-note-choice="remote"]');
  assert.equal(store.noteConflict, null);
  assert.equal(document.querySelector("#cartNote").value, "不要葱");
  click('[data-action="review"]');
  await until(() => run("modal") === "review");
  await peerEdit({ kind: "delta", dishId: "beijing-pork-guotie", delta: 1 });
  await store.poll();
  assert.match(document.querySelector("#reviewUpdate").textContent, /新加的菜/);
  assert.equal(document.querySelector('[data-action="submit"]').disabled, false, "Later additions do not alter the confirmed selection");
  await peerEdit({ kind: "delta", dishId: "beijing-pork-guotie", delta: -1 });
  await store.poll();
  assert.equal(document.querySelector('[data-action="submit"]').disabled, true, "Removing after review requires a new confirmation");
  assert.match(document.querySelector("#reviewUpdate").textContent, /重新确认/);
  assert.equal(run("MENU.every(d => { const text = I18N.dishes[d.id]?.flavor || d.flavor; return chineseCopyUnits(text).join('') === text; })"), true, "Wrapping preserves every ingredient description");
  assert.equal(run("chineseCopyUnits('鸡肉、土豆与手工宽面，酱香微辣。').includes('手工宽面') || chineseCopyUnits('鸡肉、土豆与手工宽面，酱香微辣。').includes('与手工宽面，')"), true);
  assert.equal(document.querySelector("#menuList").textContent.includes("示意图"), false);
  document.querySelector("#previewNotice")?.remove();
  run("renderChrome()");
  assert.equal(document.querySelector("#previewNotice"), null, "Production HTML can omit the preview banner");
  for (const animation of animations)
    assert(
      !JSON.stringify(animation).includes("NaN"),
      "Motion has finite transforms",
    );
  console.log(
    "PASS: UI boot, selection, 12-dish continuity, style preservation, photo retry, undo, native-history simulation, bilingual/IME search, note-conflict resolution, review freshness, lost-response confirmation, receipts and reduced motion. DOM-only; layout is not visually verified.",
  );
} finally {
  timers.forEach((id) => clearTimeout(id));
}
