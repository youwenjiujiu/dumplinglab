// Local network failures only. Never writes catalogue, orders or inventory.
import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const out=process.argv[2],baseline=process.argv[3];assert(out&&baseline);await mkdir(out,{recursive:true});
const engine=process.argv.includes('--webkit')?'webkit':'chrome';
const browser=await(engine==='webkit'?webkit.launch():chromium.launch({channel:'chrome'}));
const rows=[];
const selectors=['#space','.space-heading','.space-copy','.space-layout figure','.space-layout figure>img','#visit','.visit-front','.visit-front>img','.visit-copy','.visit-order'];
async function geometry(page){return page.evaluate(selectors=>Object.fromEntries(selectors.map(s=>{const r=document.querySelector(s).getBoundingClientRect();return[s,{width:r.width,height:r.height,x:r.x,y:r.y+scrollY}]})),selectors)}
async function ready(page,size){await page.evaluate(size=>document.documentElement.style.fontSize=size+'%',size);await page.evaluate(()=>document.fonts.ready);for(const selector of ['.space-layout figure>img','.visit-front>img']){await page.locator(selector).scrollIntoViewIfNeeded();await page.waitForFunction(s=>{const img=document.querySelector(s);return img.complete&&img.naturalWidth>0},selector);await page.locator(selector).evaluate(img=>img.decode())}}
try{
 for(const width of [320,390,820,1440])for(const lang of ['zh','en'])for(const size of [100,200]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'}),errors=[],writes=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>{if(new URL(r.request().url()).origin!=='http://127.0.0.1:7903')return r.abort();if(!['GET','HEAD'].includes(r.request().method())){writes.push(r.request().url());return r.abort()}return r.continue()});
  await page.route('**/site/site.js',async r=>r.fulfill({contentType:'application/javascript',body:await readFile(baseline+'/site/site.js')}));
  await page.route('**/site/campaign.css',async r=>r.fulfill({contentType:'text/css',body:await readFile(baseline+'/site/campaign.css')}));
  await page.goto('http://127.0.0.1:7903/?lang='+lang);await ready(page,size);const original=await geometry(page);
  await page.unroute('**/site/site.js');await page.unroute('**/site/campaign.css');
  await page.reload();await ready(page,size);const normal=await geometry(page);
  assert.deepEqual(normal,original,'Successful place-photo geometry must remain identical');
  await page.route('**/site/interior.webp*',r=>r.abort());await page.route('**/site/front.webp*',r=>r.abort());
  await page.reload();await page.evaluate(size=>document.documentElement.style.fontSize=size+'%',size);await page.evaluate(()=>document.fonts.ready);
  for(const id of ['space','visit']){
   await page.locator('#'+id).scrollIntoViewIfNeeded();
   await page.waitForFunction(id=>document.getElementById(id).dataset.photoUnavailable==='true',id);
   const section=page.locator('#'+id);
   assert(await section.locator('.place-photo-status').isVisible());
   assert.equal(await section.locator('figure>img').isVisible(),false);
   assert.match(await section.locator('.place-photo-status').textContent(),lang==='zh'?/照片暂未加载/:/Photo temporarily unavailable/);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   if(size===100)await page.screenshot({path:out+'/'+width+'-'+lang+'-'+id+'.png'});
  }
  const failed=await geometry(page);assert(failed['#space'].height<normal['#space'].height,'Missing photo must not leave a photo-height void');
  const links=await page.locator('#visit a').evaluateAll(links=>links.map(a=>a.href));assert(links.some(s=>s.includes('google.com/maps'))&&links.some(s=>s.includes('/order?lang='+lang)));
  await page.locator('#language').click();assert.match(await page.locator('#space .place-photo-status').textContent(),lang==='zh'?/Photo temporarily unavailable/:/照片暂未加载/);
  // Model a later successful image response, including the error-load race.
  await page.unroute('**/site/interior.webp*');await page.unroute('**/site/front.webp*');
  await page.evaluate(()=>{for(const img of document.querySelectorAll('.space-layout figure>img,.visit-front>img')){img.loading='eager';img.src=img.src+'?recovered=119'}});
  await page.waitForFunction(()=>['space','visit'].every(id=>!document.getElementById(id).dataset.photoUnavailable));
  assert.equal(await page.locator('.place-photo-status:visible').count(),0);
  await page.locator('#language').click();await ready(page,size);
  assert.deepEqual(await geometry(page),original,'Recovered photographs must restore the original layout');
  assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);rows.push({width,lang,size,normalGeometryUnchanged:true,compactFallback:true,languageChanges:true,restored:true,writes,errors});await page.close();
 }
}finally{await browser.close()}
await writeFile(out+'/report.json',JSON.stringify({engine,rows},null,2));console.log(JSON.stringify({engine,passed:true,cases:rows.length}));
