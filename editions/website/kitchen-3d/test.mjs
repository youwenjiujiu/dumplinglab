import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const out='output/website-kitchen-3d-v1';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
try{for(const variant of [{width:1440},{width:390},{width:320,reduce:true},{width:390,noJS:true}]){
 const page=await browser.newPage({viewport:{width:variant.width,height:900},reducedMotion:variant.reduce?'reduce':'no-preference',javaScriptEnabled:!variant.noJS}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:7903/?lang=zh',{waitUntil:'networkidle'});
 const video=page.locator('#kitchenFilm');assert.equal(await video.count(),1);assert.equal(await page.locator('.kitchen-grid').count(),0);
 await video.scrollIntoViewIfNeeded();
 if(!variant.reduce&&!variant.noJS){
  await page.waitForFunction(()=>{const v=document.querySelector('#kitchenFilm');return !v.paused&&v.currentTime>.1});
  assert.equal(await video.evaluate(v=>v.duration),23);assert(await video.evaluate(v=>v.muted&&v.loop&&v.playsInline));
  await video.evaluate(v=>v.pause());
  await page.locator('#cinema').scrollIntoViewIfNeeded();await video.scrollIntoViewIfNeeded();await page.waitForTimeout(350);
  assert(await video.evaluate(v=>v.paused),'A manual pause is preserved on re-entry');
  await video.evaluate(v=>v.play());
  await page.locator('#cinema').scrollIntoViewIfNeeded();await page.waitForTimeout(250);assert(await video.evaluate(v=>v.paused),'Offscreen pauses');
  await video.scrollIntoViewIfNeeded();await page.waitForFunction(()=>!document.querySelector('#kitchenFilm').paused);
 }else{assert(await video.evaluate(v=>v.paused),'Reduced motion / no-JS stays still with manual controls')}
 assert(await video.evaluate(v=>v.controls));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.screenshot({path:`${out}/website-${variant.width}${variant.reduce?'-reduce':variant.noJS?'-nojs':''}.png`});
 if(!variant.noJS){await page.locator('#cinema').scrollIntoViewIfNeeded();await page.locator('#nextCourse').click();await page.waitForFunction(()=>document.querySelector('#stageWord').textContent.includes('WONTONS'))}
 assert.deepEqual(errors,[]);console.log(JSON.stringify({...variant,ok:true}));await page.close();
}}finally{await browser.close()}
