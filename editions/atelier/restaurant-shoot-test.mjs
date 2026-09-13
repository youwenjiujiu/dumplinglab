// Archived shoot integrity + active original-menu regression checks; no browser QA.
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import vm from 'node:vm';
import sharp from 'sharp';
const release=process.argv[2];
const web=new URL('../../web/',import.meta.url);
const ctx=vm.createContext({});
for(const file of ['menu-data.js','i18n.js','lunch-archive.js','lunch-menu.js']) vm.runInContext(await readFile(new URL(file,web),'utf8'),ctx);
const business=()=>JSON.stringify(ctx.MENU.map(({img,photography,...d})=>d));
const before=business(),version=ctx.MENU_VERSION;
const originalPreparations=JSON.stringify(ctx.LUNCH_PREPARATIONS);
const originals = structuredClone({menu:ctx.MENU,recommendations:ctx.LUNCH_RECOMMENDATIONS,preparations:ctx.LUNCH_PREPARATIONS});
vm.runInContext(await readFile(new URL('./photography.js',import.meta.url),'utf8'),ctx);
assert.equal(business(),before,'photo replacement must not change names, IDs, prices, variants or recipes');
assert.equal(ctx.MENU_VERSION,version,'no cart invalidation for a visual change');
assert.equal(ctx.MENU.filter(d=>d.photography).length,10);
assert.equal(JSON.stringify(ctx.LUNCH_PREPARATIONS),originalPreparations,'all four preparation illustrations remain original');
assert(ctx.MENU.filter(d=>d.kind==='dumpling').every(d=>!d.photography),'do not guess opaque dumpling fillings');
assert(ctx.MENU.filter(d=>d.section==='drinks').every(d=>!d.photography),'no drinks were supplied');
const app=await readFile(new URL('./app.js',import.meta.url),'utf8');
const helper=app.slice(app.indexOf('const combinationPresentation ='),app.indexOf('const description ='));
vm.runInContext(helper+'\nglobalThis.photoForTest=photo;',ctx);
for(const size of ['s','l']) for(const d of [...ctx.MENU,...ctx.LUNCH_RECOMMENDATIONS,...ctx.LUNCH_PREPARATIONS]) {
  const path=ctx.photoForTest(d,size);
  assert((await stat(new URL('.'+path,web))).size>0,`missing ${path}`);
}
for(const number of ctx.DL_PHOTOGRAPHY.shots) for(const size of ['s','l']) {
  const path=new URL(`img/${size}/${ctx.DL_PHOTOGRAPHY.file(number)}`,web);
  const meta=await sharp(path.pathname).metadata();
  assert.equal(meta.format,'webp');assert.equal(meta.width,size==='s'?720:1440);
  assert(!meta.exif,'camera metadata omitted from public assets');
}
assert.equal(ctx.DL_PHOTOGRAPHY.cutouts.length,11);
for(const number of ctx.DL_PHOTOGRAPHY.cutouts) for(const size of ['s','l']) {
  const path=new URL(`img/${size}/${ctx.DL_PHOTOGRAPHY.menuFile(number)}`,web);
  const meta=await sharp(path.pathname).metadata();
  assert(meta.hasAlpha,`${number} must have actual transparency`);
  assert.equal(meta.width,size==='s'?720:1440,'do not crop/enlarge the dish');
  const alpha=(await sharp(path.pathname).stats()).channels.at(-1);
  assert.equal(alpha.min,0);assert.equal(alpha.max,255);
}
const html=await readFile(new URL('./index.html',import.meta.url),'utf8');
assert(!html.includes('/photography.js'),'active menu must not apply photographer mappings');
assert(!html.includes('/restaurant.css'),'active menu must not load archived photo sizing');
ctx.MENU=originals.menu;ctx.LUNCH_RECOMMENDATIONS=originals.recommendations;ctx.LUNCH_PREPARATIONS=originals.preparations;
for (const size of ['s','l']) for(const d of [...ctx.MENU,...ctx.LUNCH_RECOMMENDATIONS,...ctx.LUNCH_PREPARATIONS]) {
  for (const style of [undefined,...Object.keys(d.variants||{})]) {
    const path=ctx.photoForTest(d,size,style);
    assert(!path.includes('shoot-20260908-'),`original dish restored: ${d.id}`);
    assert((await stat(new URL('.'+path,web))).size>0,`missing original ${path}`);
    if(release) assert((await stat(resolve(release,'.'+path))).size>0,`missing original from build ${path}`);
  }
}
const css=await readFile(new URL('./restaurant.css',import.meta.url),'utf8');
assert.doesNotMatch(css,/:root\s*\{|\.dish-grid\s*\{|\.dish-name\s*\{|\.dish-add\s*\{|\.fulfilment-switch\s*\{/,'photo compatibility must not replace the online menu design');
const sharedCss=await readFile(new URL('./shared-table.css',import.meta.url),'utf8');
assert.match(sharedCss,/grid-template-rows: subgrid/,'retain online menu alignment rules');
assert.match(html,/<meta name="theme-color" content="#954b3d"/);
assert(!html.includes('class="restaurant-front"'),'remove experimental storefront panel');
assert.match(css,/object-fit: contain/);
assert.doesNotMatch(css,/background: #e9edf0/,'no grey tile behind the transparent cutout');
if(release){
  for(const path of ['photography.js','restaurant.css','brand/restaurant-front-20260908.webp','img/s/shoot-20260908-0752-cutout.webp']) await assert.rejects(stat(resolve(release,path)),e=>e.code==='ENOENT','archived shoot stays out of release');
  await assert.rejects(stat(resolve(release,'photo-review.html')),e=>e.code==='ENOENT','local review does not ship');
}
console.log('PASS original menu photos restored, all variants/assets available, shoot override disabled, archived photos intact, prices and online theme preserved'+(release?', release asset parity':''));
