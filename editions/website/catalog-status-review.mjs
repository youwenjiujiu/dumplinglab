import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
const engine=process.argv.includes('--webkit')?'webkit':'chrome';
const browser=await(engine==='webkit'?webkit.launch({headless:true}):chromium.launch({channel:'chrome',headless:true}));
const report=[];
try{
 for(const earlyFailure of [false,true]){
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  let mode=earlyFailure?'fail':'ready',reads=0,release;
  const gate=new Promise(resolve=>release=resolve);
  if(earlyFailure)await page.route('**/site/site.js',async route=>{await gate;await route.continue()});
  await page.route('**/api/catalog',async route=>{reads++;if(mode==='fail')await route.fulfill({status:503,body:'Unavailable'});else await route.fulfill({response:await route.fetch()})});
  await page.goto('http://127.0.0.1:7903/?lang=zh',{waitUntil:'commit'});
  if(earlyFailure){await page.waitForFunction(()=>globalThis.CatalogClient?.status==='unavailable');release()}
  await page.waitForLoadState('domcontentloaded');await page.evaluate(()=>CatalogClient.ready);
  if(earlyFailure)assert.equal(await page.locator('#catalogNote').getAttribute('hidden'),null);
  mode='ready';await page.evaluate(()=>CatalogClient.refresh());assert.equal(await page.locator('#catalogNote').getAttribute('hidden'),'');
  const content=await page.locator('#featuredMenu').textContent();
  mode='fail';await page.evaluate(()=>CatalogClient.refresh());assert.equal(await page.locator('#catalogNote').getAttribute('hidden'),null);
  mode='ready';const before=reads;await page.evaluate(()=>Promise.all([CatalogClient.refresh(),CatalogClient.refresh(),CatalogClient.refresh()]));
  assert.equal(reads-before,1);assert.equal(await page.locator('#catalogNote').getAttribute('hidden'),'');assert.equal(await page.locator('#featuredMenu').textContent(),content);
  report.push({earlyFailure,recoveryWithoutRevisionChange:true,concurrentReadsCoalesced:true,productionWrites:0});await page.close();
 }
}finally{await browser.close()}
await writeFile(`${out}/report.json`,JSON.stringify({engine,cases:report},null,2));console.log(JSON.stringify({engine,passed:report.length}));
