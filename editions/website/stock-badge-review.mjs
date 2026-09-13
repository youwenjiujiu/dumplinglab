import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
const engine=process.argv.includes('--webkit')?'webkit':'chrome';
const browser=await(engine==='webkit'?webkit.launch({headless:true}):chromium.launch({channel:'chrome',headless:true}));
const report=[];
try{
 for(const width of [390,1440])for(const lang of ['zh','en']){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});let soldOut=true,revision=1000;
  await page.route('**/api/catalog',async route=>{const response=await route.fetch(),data=await response.json();data.revision+=revision++;data.items=data.items.map(d=>({...d,soldOut}));await route.fulfill({response,json:data})});
  await page.goto(`http://127.0.0.1:7903/?lang=${lang}`);await page.evaluate(()=>CatalogClient.ready);
  await page.locator('#food').scrollIntoViewIfNeeded();await page.evaluate(()=>document.fonts.ready);
  await page.locator('.food-image img').evaluateAll(imgs=>Promise.all(imgs.map(img=>{img.loading='eager';return img.decode()})));
  assert.equal(await page.locator('.food-stock').count(),3);
  for(const badge of await page.locator('.food-stock').all())assert(await badge.evaluate(e=>{const a=e.getBoundingClientRect(),b=e.closest('.food-item').getBoundingClientRect();return a.left>=b.left&&a.right<=b.right+1&&a.bottom<=b.bottom+1}));
  await page.screenshot({path:`${out}/${width}-${lang}.png`});
  soldOut=false;await page.evaluate(()=>CatalogClient.refresh());assert.equal(await page.locator('.food-stock').count(),0);
  assert(await page.locator('.food-image img').evaluateAll(imgs=>imgs.every(img=>getComputedStyle(img).opacity==='1')));
  report.push({width,lang,badgesWithinCards:true,restockRemovesBadges:true,foodPhotosUndimmed:true});await page.close();
 }
}finally{await browser.close()}
await writeFile(`${out}/report.json`,JSON.stringify({engine,cases:report},null,2));console.log(JSON.stringify({engine,passed:report.length}));
