import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
const out='output/website-brand-chapters-v1';
await mkdir(out,{recursive:true});
const old=await readFile(`${out}/before/index.html`,'utf8');
const current=await readFile('editions/website/index.html','utf8');
const hero=html=>html.match(/<section class="product-story"[\s\S]*?<\/section>/)[0];
const withoutMotionButton=markup=>markup.replace(/<button id="motionToggle"[\s\S]*?<\/button>/,'');
assert.equal(hero(current),withoutMotionButton(hero(old)),'Hero changes only by removing the requested motion button');
for(const name of ['stage.css','campaign.css']){
 assert.equal(await readFile(`editions/website/${name}`,'utf8'),await readFile(`${out}/before/${name}`,'utf8'),`${name} is untouched`);
}
const browser=await chromium.launch({channel:'chrome'});
try{
 for(const width of [1440,390,320]){
  const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:7903/?lang=zh',{waitUntil:'networkidle'});
  await page.evaluate(()=>document.fonts.ready);
  await page.locator('#nextCourse').click();
  await page.waitForFunction(()=>document.querySelector('#stageWord').textContent.includes('WONTONS'));
  assert.equal(await page.locator('html').getAttribute('lang'),'en');
  assert.equal(await page.locator('#language,.site-footer,#brandFilm,#filmToggle,#kitchenFilm').count(),0);
  assert.deepEqual(await page.locator('.brand-chapters>section').evaluateAll(xs=>xs.map(x=>x.id)),['food','film','space','visit','play']);
  for(const id of ['food','film','space','visit','play']){
   const section=page.locator('#'+id);
   await section.scrollIntoViewIfNeeded();
   await section.locator('img').evaluateAll(xs=>Promise.race([Promise.all(xs.filter(x=>x.getClientRects().length).map(x=>{x.loading='eager';return x.decode()})),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Visible image decode timed out')),10000))]));
   await page.waitForTimeout(900);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width} ${id}: no horizontal overflow`);
   await section.screenshot({path:`${out}/${width}-${id}.png`});
  }
  assert.equal(await page.locator('.food-item').count(),3);
  assert.equal(await page.locator('.pick-piece').count(),8);
  assert.equal(await page.locator('dl-storefront-sketch').count(),0);
  assert.equal(await page.locator('#film .kitchen-grid img').count(),5);
  assert.equal(await page.locator('#film .pick-scene').count(),0);
  assert.equal(await page.locator('#pickScene').getAttribute('data-state'),'ready');
  assert.match(await page.locator('.address-link').getAttribute('href'),/google.com\/maps\/search/);
  assert(await page.locator('.brand-chapters a[href^="/order"]').evaluateAll(xs=>xs.every(x=>new URL(x.href).searchParams.get('lang')==='en')));
  const geometry=await page.locator('.food-caption').evaluateAll(xs=>xs.map(x=>({caption:x.getBoundingClientRect().toJSON(),title:x.querySelector('h3').getBoundingClientRect().toJSON(),price:x.querySelector('.food-price').getBoundingClientRect().toJSON()})));
  for(const {title,price}of geometry)assert(price.top>=title.bottom-1,'Prices below complete names');
  const space=await page.locator('.space-heading').evaluate(x=>getComputedStyle(x).position);
  assert.equal(space,'static','Space heading does not cover photography');
  assert.deepEqual(errors,[]);
  console.log(`${width}: chapters, assets, wrapping, maps, English-only and Hero switching pass`);
  await page.close();
 }
 const page=await browser.newPage({viewport:{width:390,height:900},reducedMotion:'reduce'});
 await page.goto('http://127.0.0.1:7903/',{waitUntil:'networkidle'});
 await page.evaluate(()=>document.documentElement.style.fontSize='200%');
 for(const id of ['food','film','space','visit','play']){
  await page.locator('#'+id).scrollIntoViewIfNeeded();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`200% ${id}: no horizontal overflow`);
 }
 console.log('Hero source unchanged; 200% type and reduced motion pass');
}finally{await browser.close()}
