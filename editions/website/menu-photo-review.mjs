import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
const engine=process.argv.includes('--webkit')?'webkit':'chrome';
const browser=await(engine==='webkit'?webkit.launch({headless:true}):chromium.launch({channel:'chrome',headless:true}));
const report=[];
try{
 for(const width of [390,1440])for(const lang of ['zh','en']){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
  await page.route('**/img/**/*.webp',r=>r.abort());
  await page.goto(`http://127.0.0.1:7903/?lang=${lang}`);await page.evaluate(()=>CatalogClient.ready);
  await page.locator('#food').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>[...document.querySelectorAll('.food-image')].every(e=>e.dataset.unavailable==='true'));
  assert.equal(await page.locator('.food-image').count(),3);
  for(const card of await page.locator('.food-image').all()){
   assert.equal(await card.locator('img').isVisible(),false);assert(await card.getAttribute('aria-label'));
   assert.match(await card.getAttribute('data-missing-label'),lang==='zh'?/查看菜单/:/See menu/);
   const box=await card.boundingBox();assert(box.width>100&&box.height>100);
  }
  const first=page.locator('.food-image').first();await first.focus();
  await page.evaluate(()=>dispatchEvent(new Event('catalog-updated')));
  assert(await first.evaluate(e=>e===document.activeElement),'Unchanged catalogue retains focused failed-photo link');
  await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:`${out}/${width}-${lang}.png`});
  await page.unroute('**/img/**/*.webp');
  await page.locator('.food-image img').first().evaluate(img=>{img.removeAttribute('srcset');img.src=img.src+'?retry=review'});
  await page.waitForFunction(()=>{const e=document.querySelector('.food-image');return !e.dataset.unavailable&&e.querySelector('img').naturalWidth>0});
  assert(await first.locator('img').isVisible());
  report.push({width,lang,failedTile:true,focusRetained:true,recovered:true});await page.close();
 }
}finally{await browser.close()}
await writeFile(`${out}/report.json`,JSON.stringify({engine,cases:report},null,2));console.log(JSON.stringify({engine,passed:report.length}));
