import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
const engine=process.argv.includes('--webkit')?'webkit':'chrome';
const browser=await(engine==='webkit'?webkit.launch({headless:true}):chromium.launch({channel:'chrome',headless:true}));
const report=[];
try{
 for(const width of [320,390,1440])for(const lang of ['zh','en']){
  const name='Handcrafted Golden Pork Shrimp and Chive Potstickers '.repeat(3).slice(0,120),cn='韭菜鲜虾猪肉手工焦香煎饺'.repeat(10).slice(0,120);
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
  await page.route('**/api/catalog',async route=>{const response=await route.fetch(),data=await response.json();data.revision+=1000;data.items=data.items.map(d=>d.id==='lunch-v2-pork-chive-shrimp'?{...d,name,cn}:d);await route.fulfill({response,json:data})});
  await page.goto('http://127.0.0.1:7903/?lang='+lang);await page.evaluate(()=>CatalogClient.ready);await page.evaluate(()=>document.fonts.ready);await page.locator('#stageImage').evaluate(e=>e.decode());
  const state=await page.locator('#stageName').evaluate(e=>({name:e.textContent,height:e.getBoundingClientRect().height,lineHeight:parseFloat(getComputedStyle(e).lineHeight)}));
  assert.equal(state.name,lang==='zh'?cn:name);assert(state.height<=state.lineHeight*2+1,'teaser remains within two lines');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:`${out}/${width}-${lang}.png`});report.push({width,lang,...state});await page.close();
 }
}finally{await browser.close()}
await writeFile(`${out}/report.json`,JSON.stringify({engine,report},null,2));console.log(JSON.stringify({engine,passed:true,cases:report.length}));
