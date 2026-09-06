import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
const release = process.argv[2];
assert.match(release || "", /\/dumplinglab-release-[A-Za-z0-9]+$/);
const html = await readFile(resolve(release,"index.html"),"utf8");
assert.match(html,/data-environment="production"/);
assert.match(html,/<title>Dumpling Lab · 午餐菜单<\/title>/);
assert.doesNotMatch(html,/id="previewNotice"|本地体验版/);
const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1].split("?")[0]);
assert(scripts.indexOf("/lunch-menu.js") > scripts.indexOf("/menu-data.js"));
assert(scripts.indexOf("/lunch-menu.js") < scripts.indexOf("/cart-store.js"));
const ctx = vm.createContext({});
for (const file of ["menu-data.js","i18n.js","lunch-archive.js","lunch-menu.js"]) vm.runInContext(await readFile(resolve(release,file),"utf8"),ctx);
assert.equal(ctx.MENU.length,35);
assert.equal(vm.runInContext("I18N.sections.dumplings",ctx),"自选口味");
for (const path of scripts) execFileSync(process.execPath,["--check",resolve(release,"."+path)]);
for (const path of [...html.matchAll(/(?:src|href)="(\/[^"?]+)(?:\?[^"]*)?"/g)].map(m=>m[1])) {
  assert((await stat(resolve(release,"."+path))).isFile(),path);
}
assert.equal([...ctx.MENU,...ctx.LUNCH_PREPARATIONS,...ctx.LUNCH_RECOMMENDATIONS].filter(d=>!d.img).length, 0, "Do not publish any current dish or preparation without its image");
for (const dish of [...ctx.MENU,...ctx.LUNCH_PREPARATIONS,...ctx.LUNCH_RECOMMENDATIONS]) for (const img of [dish.img,...Object.values(dish.preparationImages || {})]) for (const size of ["s","l"]) {
  assert((await stat(resolve(release,"img",size,img.replace(/\.(png|jpe?g|webp)$/i,".webp")))).size>0);
}
const css = await readFile(resolve(release,"shared-table.css"),"utf8");
assert.match(css,/grid-template-rows: subgrid/);
assert.match(css,/\.lunch-options button \{ min-height: 44px/);
assert.match(css,/\.lunch-options > div \{ display: flex; flex-wrap: wrap/);
assert.match(css,/\.dish-image img \{\s*position: absolute/);
const api = await readFile(resolve(release,"server/order-core.js"),"utf8");
assert.match(api,/import "\.\.\/lunch-menu.js"/);
const config = JSON.parse(await readFile(resolve(release,"vercel.json"),"utf8"));
assert(config.headers[0].headers.some(h=>h.key==="Cache-Control"&&h.value==="no-store"));
console.log("ROUND 9 PASS — exact production package, 35-item client/server agreement, assets, syntax, cache refresh, preview banner removal. Layout checks are structural, not browser screenshots.");
