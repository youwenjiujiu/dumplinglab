import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
const engine=process.argv.includes('--webkit')?'webkit':'chrome';
const browser=await(engine==='webkit'?webkit.launch({headless:true}):chromium.launch({channel:'chrome',headless:true}));
try{
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await page.goto('http://127.0.0.1:7903/?lang=zh');await page.evaluate(()=>CatalogClient.ready);
 const before=await page.locator('#featuredMenu').textContent();
 await page.evaluate(()=>{
  window.captionChanges=0;new MutationObserver(records=>window.captionChanges+=records.length).observe(document.querySelector('#stageCaption'),{childList:true,subtree:true,characterData:true});
  const dish=MENU.find(d=>d.id==='lunch-v4-red-oil-chaoshou');dish.price+=1;
  dispatchEvent(new Event('catalog-updated'));
 });
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(r)));
 assert.notEqual(await page.locator('#featuredMenu').textContent(),before,'visible menu prices still refresh');
 assert.equal(await page.evaluate(()=>window.captionChanges),0,'unchanged live hero caption is not rewritten');
 await writeFile(`${out}/report.json`,JSON.stringify({engine,menuRefreshed:true,unchangedHeroQuiet:true,productionWrites:0},null,2));
}finally{await browser.close()}
console.log(JSON.stringify({engine,passed:true}));
