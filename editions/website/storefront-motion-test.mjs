import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
const out='output/website-storefront-motion-v1';await mkdir(out,{recursive:true});
const old=await readFile(`${out}/before/index.html`,'utf8'),now=await readFile('editions/website/index.html','utf8');
const hero=s=>s.match(/<section class="product-story"[\s\S]*?<\/section>/)[0];
assert.equal(hero(old),hero(now));
for(const name of ['stage.js','stage.css','campaign.css'])assert.equal(await readFile(`${out}/before/${name}`,'utf8'),await readFile(`editions/website/${name}`,'utf8'));
const browser=await chromium.launch({channel:'chrome'});
try{
 for(const width of [1440,390,320]){
  const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:7903/',{waitUntil:'networkidle'});
  const sketch=page.locator('dl-storefront-sketch');
  assert.equal(await sketch.count(),1);
  assert.equal(await sketch.getAttribute('data-phase'),'waiting');
  await sketch.evaluate(el=>{el._completions=0;el.addEventListener('motion-complete',()=>el._completions++)});
  await sketch.scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.querySelector('dl-storefront-sketch').dataset.phase==='playing');
  await page.waitForTimeout(850); // Let the existing chapter entrance settle.
  const before=await sketch.boundingBox();
  for(const [label,time]of [['early',250],['middle',1600],['complete',3600]]){
   await sketch.evaluate((el,t)=>el.seek(t),time);
   await page.waitForTimeout(80);
   await sketch.screenshot({path:`${out}/${width}-${label}.png`});
   assert.deepEqual(await sketch.boundingBox(),before,'No host layout shift');
  }
  await sketch.evaluate(el=>el.restart());
  await page.waitForTimeout(300);
  const progress=await sketch.evaluate(el=>el._animations.at(-1).currentTime);
  assert(progress>0,'Replay draws immediately');
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
  await page.waitForTimeout(200);
  const stopped=await sketch.evaluate(el=>el._animations.at(-1).currentTime);
  await page.waitForTimeout(300);
  assert.equal(await sketch.evaluate(el=>el._animations.at(-1).currentTime),stopped,'Offscreen pause');
  await sketch.scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.querySelector('dl-storefront-sketch').dataset.phase==='settled');
  assert.equal(await sketch.evaluate(el=>el._completions),1);
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
  await page.waitForTimeout(100);
  await sketch.scrollIntoViewIfNeeded();
  assert.equal(await sketch.getAttribute('data-phase'),'settled','No automatic loop on re-entry');
  await page.locator('#visit').screenshot({path:`${out}/${width}-visit.png`});
  const address=page.locator('.address-link');await address.focus();
  assert.equal(await address.evaluate(el=>el===document.activeElement),true);
  assert.match(await address.getAttribute('href'),/google.com\/maps\/search/);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.deepEqual(errors,[]);
  console.log(`${width}: staged drawing, fixed host, one-shot, offscreen pause, Maps and errors pass`);
  await page.close();
 }
 for(const mode of ['reduced','no-js','menu-unavailable']){
  const page=await browser.newPage({viewport:{width:390,height:1000},reducedMotion:mode==='reduced'?'reduce':'no-preference',javaScriptEnabled:mode!=='no-js'});
  if(mode==='menu-unavailable')await page.route('**/site/catalogue-bootstrap.js',r=>r.abort());
  await page.goto('http://127.0.0.1:7903/',{waitUntil:'networkidle'});
  const sketch=page.locator('dl-storefront-sketch');await sketch.scrollIntoViewIfNeeded();
  if(mode==='reduced')assert.equal(await sketch.getAttribute('data-phase'),'settled');
  if(mode==='no-js')assert(await sketch.locator('svg').isVisible());
  if(mode==='menu-unavailable')await page.waitForFunction(()=>document.querySelector('dl-storefront-sketch').dataset.phase==='settled');
  await sketch.screenshot({path:`out/${mode}.png`.replace('out/',out+'/')});
  console.log(`${mode}: readable illustration fallback pass`);await page.close();
 }
}finally{await browser.close()}
