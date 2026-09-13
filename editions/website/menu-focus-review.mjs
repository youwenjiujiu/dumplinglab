// Local, in-memory catalogue changes only. Never saves inventory or prices.
import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
const engine=process.argv.includes('--webkit')?'webkit':'chrome';
const browser=await(engine==='webkit'?webkit.launch({headless:true}):chromium.launch({channel:'chrome',headless:true}));
const report=[];
try{
 for(const selector of ['.food-image','h3 a'])for(const index of [0,2]){
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await page.goto('http://127.0.0.1:7903/?lang=zh');await page.evaluate(()=>CatalogClient.ready);
  const card=page.locator('.food-item').nth(index);await card.locator(selector).focus();
  const y=await page.evaluate(()=>scrollY),id=await card.getAttribute('data-dish-id');
  await page.evaluate(id=>{MENU.find(d=>d.id===id).price+=1;dispatchEvent(new Event('catalog-updated'))},id);
  assert(await card.locator(selector).evaluate(e=>e===document.activeElement));assert.equal(await page.evaluate(()=>scrollY),y);
  await page.evaluate(id=>{MENU.find(d=>d.id===id).active=false;dispatchEvent(new Event('catalog-updated'))},id);
  assert(await card.locator(selector).evaluate(e=>e===document.activeElement));
  await page.evaluate(()=>{MENU.forEach(d=>d.active=false);dispatchEvent(new Event('catalog-updated'))});
  assert(await page.locator('.section-intro>.text-link').evaluate(e=>e===document.activeElement));
  report.push({selector,index,priceFocusRetained:true,removedFocusMovesToNeighbour:true,emptyFocusMovesToMenu:true});await page.close();
 }
}finally{await browser.close()}
await writeFile(`${out}/report.json`,JSON.stringify({engine,cases:report,productionWrites:0},null,2));console.log(JSON.stringify({engine,passed:report.length}));
