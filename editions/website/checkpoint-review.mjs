import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
const engine=process.argv.includes('--webkit')?'webkit':'chrome';
const browser=await(engine==='webkit'?webkit.launch():chromium.launch({channel:'chrome'}));
const origin='http://127.0.0.1:7903';
const checkpoint=process.argv.find(value=>/^\d+$/.test(value))||'100';
const rows=[];
try{
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/review/'+checkpoint);
  await page.locator('img').evaluateAll(images=>Promise.all(images.map(img=>{img.loading='eager';return img.decode()})));
  assert.equal(await page.locator('img').count(),17);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.route('**/phone-en-broth.png',r=>r.abort());
  await page.locator('[data-review-lang=en]').click();
  await page.waitForFunction(()=>document.querySelector('#reviewLanguageStatus').textContent.includes('保留上一组'));
  assert.equal(await page.locator('.card img[src*="-en-"]').count(),0);
  await page.unroute('**/phone-en-broth.png');
  await page.locator('[data-review-lang=en]').click();
  await page.waitForFunction(()=>document.querySelector('[data-review-lang=en]').getAttribute('aria-pressed')==='true');
  assert.equal(await page.locator('.card img[src*="-en-"]').count(),6);
  assert(await page.locator('.card img[src*="-en-"]').evaluateAll(images=>images.every(img=>img.complete&&img.naturalWidth>0&&[...img.closest('.card').querySelectorAll('a')].every(a=>a.href===img.src))));
  await page.locator('[data-review-lang=zh]').click();
  await page.waitForFunction(()=>document.querySelector('[data-review-lang=zh]').getAttribute('aria-pressed')==='true');
  await page.locator('[data-review-lang=en]').click();
  await page.waitForFunction(()=>document.querySelector('[data-review-lang=en]').getAttribute('aria-pressed')==='true');
  await page.evaluate(()=>{document.querySelector('[data-review-lang=zh]').click();document.querySelector('[data-review-lang=en]').click()});
  await page.waitForFunction(()=>document.querySelector('#reviewLanguages').getAttribute('aria-busy')==='false');
  assert.equal(await page.locator('.card img[src*="-en-"]').count(),6);
  const recordings=page.locator('video'),videoCount=await recordings.count();
  assert.equal(videoCount,+checkpoint>=110?2:1);
  for(let index=0;index<videoCount;index++){
   const video=recordings.nth(index);await video.scrollIntoViewIfNeeded();
   await video.evaluate(async video=>{video.muted=true;await video.play();video.currentTime=10});
   await page.waitForFunction(i=>{const v=document.querySelectorAll('video')[i];return v.currentTime>=10&&v.readyState>=2},index);
   if(+checkpoint>=110)assert(await recordings.evaluateAll((videos,i)=>videos.every((v,j)=>j===i||v.paused),index));
  }
  for(const archive of [114,111,110,105,100,80,61,49,35])assert.equal((await page.request.get(origin+'/review/'+archive)).status(),200);
  assert.equal((await page.request.get(origin+'/review-media/100/capture-manifest.json')).status(),404);
  assert.equal((await page.request.get(origin+'/review-media/110/phone-recording.json')).status(),404);
  assert.equal((await page.request.get(origin+'/review-media/111/capture-manifest.json')).status(),404);
  assert.equal((await page.request.get(origin+'/review-media/114/capture-manifest.json')).status(),404);
  assert.equal((await page.request.get(origin+'/review-media/114/phone-recording.json')).status(),404);
  assert.equal((await page.request.get(origin+'/review-media/120/capture-manifest.json')).status(),404);
  assert.equal((await page.request.get(origin+'/review-media/120/desktop-recording.json')).status(),404);
  assert.equal((await page.request.get(origin+'/review-media/120/phone-recording.json')).status(),404);
  assert.deepEqual(errors,[]);rows.push({engine,width,images:17,heroVariants:6,atomicFailure:true,latestIntent:true,videoSeek:true});
  await page.close();
 }
 const page=await browser.newPage({javaScriptEnabled:false});await page.goto(origin+'/review/'+checkpoint);
 assert.equal(await page.locator('#reviewLanguages').isVisible(),false);assert.equal(await page.locator('.card img').count(),16);await page.close();
 console.log(JSON.stringify({ok:true,rows,noJavaScript:true},null,2));
}finally{await browser.close()}
