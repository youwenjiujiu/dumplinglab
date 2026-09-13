import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
const engine=process.argv.includes('--webkit')?'webkit':'chrome';
const browser=await(engine==='webkit'?webkit.launch({headless:true}):chromium.launch({channel:'chrome',headless:true}));
const report=[];
try{
 for(const width of [320,390,1440])for(const lang of ['zh','en']){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
  const name='W'.repeat(120),cn='手工鲜虾韭菜猪肉煎饺'.repeat(12).slice(0,120);
  await page.route('**/api/catalog',async route=>{const response=await route.fetch(),data=await response.json();data.revision+=1000;data.items=data.items.map(d=>({...d,name,cn,soldOut:true}));await route.fulfill({response,json:data})});
  await page.goto(`http://127.0.0.1:7903/?lang=${lang}`);await page.evaluate(()=>CatalogClient.ready);
  await page.locator('#food').scrollIntoViewIfNeeded();await page.evaluate(()=>document.fonts.ready);
  await page.locator('.food-image img').evaluateAll(imgs=>Promise.all(imgs.map(img=>{img.loading='eager';return img.decode()})));
  const state=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,cards:[...document.querySelectorAll('.food-caption')].map(e=>{
   const name=e.querySelector('h3 a'),sub=e.querySelector('.food-sub'),price=e.querySelector('.food-price'),box=e.getBoundingClientRect();
   return {name:name.textContent,nameLines:name.offsetHeight/parseFloat(getComputedStyle(name).lineHeight),subLines:sub.offsetHeight/parseFloat(getComputedStyle(sub).lineHeight),priceInside:price.getBoundingClientRect().right<=box.right+1,stock:!!e.querySelector('.food-stock')};
  })}));
  assert(!state.overflow);assert(state.cards.every(c=>c.name===(lang==='zh'?cn:name)&&c.nameLines<=3.1&&c.subLines<=2.1&&c.priceInside&&c.stock));
  await page.screenshot({path:`${out}/${width}-${lang}.png`});report.push({width,lang,...state});await page.close();
 }
}finally{await browser.close()}
await writeFile(`${out}/report.json`,JSON.stringify({engine,cases:report},null,2));console.log(JSON.stringify({engine,passed:report.length}));
