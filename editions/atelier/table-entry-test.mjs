import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const storage = new Map();
let rejectWrites = false;
const context = vm.createContext({
  Event, EventTarget, crypto, console, addEventListener() {},
  document: { addEventListener() {} },
  localStorage: {
    getItem: key => storage.get(key) || null,
    setItem: (key, value) => { if (rejectWrites) throw Error("Storage blocked"); storage.set(key, value); },
  },
});
for (const file of ["../../web/menu-data.js", "../../web/lunch-menu.js", "cart-store.js"])
  vm.runInContext(await readFile(new URL(file, import.meta.url), "utf8"), context);
const make = () => vm.runInContext('new TableCart(null, "B")', context);
let draft = make();
draft.mutate({ kind: "delta", dishId: "lunch-v2-pork-rice", style: null, delta: 2 });
const original = storage.get("atelier:browse:B");
assert.throws(() => draft.bindTable(""));
assert.throws(() => draft.bindTable("A 1"));
assert.equal(storage.get("atelier:browse:B"), original);
rejectWrites = true;
assert.throws(() => draft.bindTable("QAENTRY"), /无法保存桌号/);
assert.equal(draft.table, null);
assert.equal(draft.items[0].qty, 2);
rejectWrites = false;
storage.set("atelier:QAENTRY:B", JSON.stringify({ order: { requestId: "unconfirmed" } }));
assert.throws(() => draft.bindTable("QAENTRY"), /待确认/);
assert.equal(draft.table, null);
storage.set("atelier:QAENTRY:B", JSON.stringify({
  remote: { items: [{ id: "lunch-v2-pickled-radish", qty: 1 }], orders: [], opIds: [] },
  pending: [{ opId: "peer", kind: "delta", dishId: "lunch-v2-water", delta: 1, table: "QAENTRY", group: "B" }],
}));
draft.bindTable(" qaentry ");
assert.equal(draft.table, "QAENTRY");
assert.equal(draft.group, "B");
assert.equal(draft.items.length, 3, "Existing table selections and unsent operations retained");
assert(draft.pending.every(op => op.table === "QAENTRY" && op.group === "B"));
assert.equal(make().items.length, 0);
assert.throws(() => draft.bindTable("OTHER"), /已经选择桌号/);

// Simulate interruption between writing the table and clearing the browsing key.
storage.set("atelier:browse:B", original);
const retry = make();
retry.bindTable("QAENTRY");
assert.equal(retry.items.find(i => i.id === "lunch-v2-pork-rice").qty, 2);
assert.equal(retry.pending.length, 2, "Stable operation IDs prevent duplicate handoff");
console.log("PASS: table validation, storage failure, pending order guard, existing table/cart merge, group isolation, reload, interrupted handoff and duplicate prevention.");

// Reload an old saved lunch draft: old names/prices are never silently reused.
storage.set("atelier:browse:B", JSON.stringify({
  remote: {items:[{id:"lunch-mini-pork-rice",qty:1}],orders:[{id:"historic",total:5.5,items:[{id:"lunch-mini-pork-rice",name:"Mini 卤肉饭",price:5.5,qty:1}]}],opIds:[]},
  pending:[{opId:"old",kind:"delta",dishId:"lunch-pork-chive",style:"煎 · 5颗",delta:1}],
}));
const retired=make();
assert.equal(retired.items.length,0);
assert.equal(retired.pending.length,0);
assert.equal(retired.retiredPending.length,1);
assert.equal(retired.orders[0].items[0].name,"Mini 卤肉饭");
assert.equal(retired.orders[0].total,5.5);
console.log("PASS: old lunch cache is quarantined; historic receipt names and totals survive the menu revision.");

// A newly created SKU may not exist in the static menu while /api/catalog loads.
const customId='custom-11111111-2222-4333-8444-555555555555';
storage.set('atelier:browse:B',JSON.stringify({remote:{items:[],orders:[],opIds:[]},pending:[{opId:'custom-op',kind:'delta',dishId:customId,delta:1}]}));
const customDraft=make();
assert.equal(customDraft.pending.length,1,'Keep custom pending operations before live catalogue arrives');
assert.equal(customDraft.retiredPending.length,0);
vm.runInContext(`MENU.push({id:'${customId}',cn:'新菜',name:'New Dish',section:'cold',price:4.5})`,context);
assert.equal(customDraft.items[0].id,customId,'Selection becomes visible after catalogue hydration');
console.log('PASS: custom SKU offline selection survives catalogue-loading race.');
