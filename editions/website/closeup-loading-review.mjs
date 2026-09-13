import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
const engine=process.argv.includes('--webkit')?'webkit':'chrome';
const browser=await(engine==='webkit'?webkit.launch({headless:true}):chromium.launch({channel:'chrome',headless:true}));
const report=[];
try{
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900}});let release;
  const held=new Promise(r=>release=r);
  await page.addInitScript(()=>Object.defineProperty(navigator,'connection',{value:{saveData:true}}));
  await page.route('**/hero-chilli-wontons-v1*.webp',async route=>{await held;await route.abort()});
  await page.goto('http://127.0.0.1:7903/?lang=zh');await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(()=>{const e=document.querySelector('#cinema');scrollTo({top:e.offsetTop+(e.offsetHeight-document.querySelector('#productStage').offsetHeight)*.65,behavior:'instant'})});
  await page.waitForFunction(()=>document.querySelector('#productStage').dataset.detail==='true');
  await page.locator('[data-course-index="1"]').click();
  assert.equal(await page.locator('#detailCopy').textContent(),'正在加载下一道…');assert(await page.locator('#detailCopy').isVisible());
  await page.locator('#language').click();assert.equal(await page.locator('#detailCopy').textContent(),'Loading the next dish…');
  release();await page.waitForFunction(()=>document.querySelector('#courseControl').getAttribute('aria-busy')==='false');
  assert.equal(await page.locator('#detailCopy').textContent(),'Image unavailable. Please try again.');
  await page.screenshot({path:`${out}/${width}-failure.png`});
  await page.locator('[data-course-index="2"]').click();await page.waitForFunction(()=>document.querySelector('#productStage').dataset.course==='broth');
  assert.match(await page.locator('#detailCopy').textContent(),/warm broth/);assert.equal(await page.locator('#detailCopy').getAttribute('aria-live'),'polite');
  report.push({width,closeupLoadingVisible:true,languagePreserved:true,errorVisible:true,nextDishRestoresCopy:true});await page.close();
 }
}finally{await browser.close()}
await writeFile(`${out}/report.json`,JSON.stringify({engine,cases:report},null,2));console.log(JSON.stringify({engine,passed:report.length}));
