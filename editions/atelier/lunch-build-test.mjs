import assert from "node:assert/strict";
import { readFile, stat, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
import { createHash } from "node:crypto";
const release = process.argv[2];
assert.match(release || "", /\/dumplinglab-release-[A-Za-z0-9]+$/);
const html = await readFile(resolve(release,"index.html"),"utf8");
assert.match(html,/data-environment="production"/);
assert.match(html,/<title>Dumpling Lab<\/title>/);
assert.doesNotMatch(html,/id="previewNotice"|本地体验版/);
const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1].split("?")[0]);
assert(scripts.indexOf("/lunch-menu.js") > scripts.indexOf("/menu-data.js"));
assert(scripts.indexOf("/lunch-menu.js") < scripts.indexOf("/cart-store.js"));
assert(scripts.includes('/error-copy.js'), 'bilingual error boundary must ship');
assert(scripts.indexOf('/error-copy.js') < scripts.indexOf('/app.js'), 'error boundary loads before callers');
for (const match of html.matchAll(/(?:src|href)="(\/[^"?]+\.(?:js|css))(?:\?v=([a-f0-9]+))?"/g)) {
  assert.match(match[2] || '', /^[a-f0-9]{12}$/, `asset needs a content version: ${match[1]}`);
  const hash=createHash('sha256').update(await readFile(resolve(release,'.'+match[1]))).digest('hex').slice(0,12);
  assert.equal(match[2],hash,`cache version matches shipped bytes: ${match[1]}`);
}
const ctx = vm.createContext({});
for (const file of ["menu-data.js","i18n.js","lunch-archive.js","lunch-menu.js"]) vm.runInContext(await readFile(resolve(release,file),"utf8"),ctx);
assert.equal(ctx.MENU.length,49);   // 41 on sale + 8 retired kept for old receipts
const onSale=ctx.MENU.filter(d=>d.active!==false);assert.equal(onSale.length,41);
assert.equal(JSON.stringify(onSale.filter(d=>!d.img).map(d=>d.cn)),"[]","Do not publish a dish on sale without its photo");
for(const d of onSale)for(const img of [d.img,...Object.values(d.preparationImages||{})].filter(Boolean))for(const size of ["s","l"])assert((await stat(resolve(release,"img",size,img.replace(/\.(png|jpe?g|webp)$/i,".webp")))).size>0,img);
assert.equal(vm.runInContext("I18N.sections.dumplings",ctx),"自选");
for (const path of scripts) execFileSync(process.execPath,["--check",resolve(release,"."+path)]);
for (const dir of ['api','server']) for (const file of await readdir(resolve(release,dir))) {
  if (file.endsWith('.js')) execFileSync(process.execPath,['--check',resolve(release,dir,file)]);
}
execFileSync(process.execPath,['--check',resolve(release,'catalog-admin.js')]);
const cutoutAssets=JSON.parse(await readFile(resolve(release,'vendor/cutout/assets.json'),'utf8'));
for(const [file,hash] of Object.entries(cutoutAssets))assert.equal(createHash('sha256').update(await readFile(resolve(release,'vendor/cutout',file))).digest('hex'),hash,`cutout asset integrity: ${file}`);
execFileSync(process.execPath,['--check',resolve(release,'vendor/cutout/worker.js')]);
for(const file of ['ONNX-LICENSE.txt','U2NET-LICENSE.txt','NOTICE.txt'])assert((await stat(resolve(release,'vendor/cutout',file))).size>0);
const adminHtml=await readFile(resolve(release,'catalog-admin.html'),'utf8');
assert(adminHtml.includes('id="removeBackground"'),'Cutout action ships with admin');
assert(!adminHtml.includes('ort.wasm.min.mjs'),'Inference runtime is loaded only on demand');

for (const path of [...html.matchAll(/(?:src|href)="(\/[^"?]+)(?:\?[^"]*)?"/g)].map(m=>m[1])) {
  assert((await stat(resolve(release,"."+path))).isFile(),path);
}
// 2026-10-20 店主选定的新菜专属图（Codex 生成后挑选），不是借用其他菜的照片。
for(const [id,img] of [['lunch-v5-onsen-egg','lunch-v5-onsen-egg-placeholder.png'],['lunch-v5-pork-corn','lunch-chicken-corn-generated-v1.png']])assert.equal(ctx.MENU.find(d=>d.id===id).img,img,id);
assert.equal(ctx.MENU.filter(d=>d.active!==false).length,41);
assert(ctx.LUNCH_SETS.every(s=>s.price===null&&s.orderable===false));
for (const dish of [...ctx.MENU,...ctx.LUNCH_PREPARATIONS,...ctx.LUNCH_RECOMMENDATIONS]) for (const img of [dish.img,...Object.values(dish.preparationImages || {})].filter(Boolean)) for (const size of ["s","l"]) {
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
console.log("ROUND 9 PASS — exact production package, October menu client/server agreement, assets, syntax, cache refresh, preview banner removal. Layout checks are structural, not browser screenshots.");
