import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
const engine=process.argv.includes('--webkit')?'webkit':'chrome';
const browser=await(engine==='webkit'?webkit.launch():chromium.launch({channel:'chrome'}));
const cases=[];
try{
 for(const connection of [{saveData:true},{effectiveType:'slow-2g',downlink:.05},{effectiveType:'2g',downlink:.1},{effectiveType:'3g',downlink:.8},{effectiveType:'4g',downlink:1},{effectiveType:'4g',downlink:10}]){
  const page=await browser.newPage({viewport:{width:390,height:844}}),requests=[],errors=[];
  page.on('request',r=>{if(r.url().endsWith('.mp4'))requests.push(r.url())});page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(value=>Object.defineProperty(navigator,'connection',{value}),connection);
  await page.goto('http://127.0.0.1:7903/?lang=zh');await page.locator('#filmScreen').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>{const r=document.querySelector('#filmScreen').getBoundingClientRect();return r.top<innerHeight&&r.bottom>0});
  // Allow both intersection delivery and its resulting video intent to settle.
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const constrained=connection.downlink!==10;
  if(constrained){
   assert.equal(await page.locator('#brandFilm').getAttribute('src'),null);assert.equal(requests.length,0);
   assert.equal(await page.locator('#filmToggle').getAttribute('aria-label'),'播放短片');
   await page.locator('#filmToggle').click();
  }
  await page.waitForFunction(()=>{const v=document.querySelector('#brandFilm');return!v.paused&&v.readyState>=3});
  assert(requests.length>0);assert.equal(await page.locator('#filmToggle').getAttribute('aria-label'),'暂停短片');
  assert.equal(await page.locator('body').getAttribute('data-motion-paused'),String(!!connection.saveData));
  await page.locator('#filmToggle').click();assert(await page.locator('#brandFilm').evaluate(v=>v.paused));
  assert.deepEqual(errors,[]);cases.push({connection,automaticPlayback:!constrained,manualPlaybackVerified:constrained,pause:true});await page.close();
 }
}finally{await browser.close()}
console.log(JSON.stringify({engine,passed:true,cases},null,2));
