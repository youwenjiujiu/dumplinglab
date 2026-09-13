import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
// Pending-image cases must not make WebKit's screenshot wait on page fonts.
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY='1';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
const engine=process.argv.includes('--webkit')?'webkit':'chrome';
const browser=await(engine==='webkit'?webkit.launch():chromium.launch({channel:'chrome'}));
const cases=[];
try{
 for(const mode of ['hero-first','visit-before-hero','reduced-motion','failed-module','no-js']){
  const page=await browser.newPage({viewport:{width:390,height:844},javaScriptEnabled:mode!=='no-js',reducedMotion:mode==='reduced-motion'?'reduce':'no-preference'});
  const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(/poster\.webp|\.mp4/.test(r.url()))requests.push(r.url())});
  await page.addInitScript(()=>localStorage.setItem('dumplinglab:motion','paused'));
  let release;const barrier=new Promise(resolve=>release=resolve);
  if(['hero-first','visit-before-hero','reduced-motion'].includes(mode))await page.route('**/hero-potstickers-v1*.webp',async route=>{await barrier;await route.continue()});
  if(mode==='failed-module')await page.route('**/site/stage.js',route=>route.abort());
  await page.goto('http://127.0.0.1:7903/?lang=zh',{waitUntil:'domcontentloaded'});
  if(['hero-first','visit-before-hero','reduced-motion'].includes(mode)){
   await page.waitForFunction(()=>document.body.dataset.motionPaused==='true');
   await page.waitForTimeout(250);
   assert.equal(requests.length,0,'Poster must not compete with the blocked hero');
   if(mode==='hero-first'){
    release();await page.waitForFunction(()=>document.querySelector('#productStage').dataset.imageReady==='true');
    await page.waitForFunction(()=>document.querySelector('#filmScreen').dataset.posterReleased==='true');
   }
  }
  await page.locator('#filmScreen').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>{const img=document.querySelector('.cinema-poster');return img.complete&&img.naturalWidth>0&&getComputedStyle(img.parentElement).display!=='none'});
  assert.equal(requests.some(url=>url.endsWith('.mp4')),false,'Paused film must remain a poster');
  assert.deepEqual(errors,[]);await page.screenshot({path:out+'/'+mode+'.png'});
  release();cases.push({mode,visiblePoster:true,noPrematureVideo:true});await page.close();
 }
}finally{await browser.close()}
await writeFile(out+'/report.json',JSON.stringify({engine,cases},null,2));console.log(JSON.stringify({engine,passed:true,cases:cases.length}));
