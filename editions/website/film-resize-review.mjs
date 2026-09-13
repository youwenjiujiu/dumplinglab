// Real video playback in isolated loopback browser contexts; no external writes.
import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
const engine=process.argv.includes('--webkit')?'webkit':'chrome';
const browser=await(engine==='webkit'?webkit.launch({headless:true}):chromium.launch({channel:'chrome',headless:true}));
const report=[];
try{
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:7903/?lang=zh');
 await page.locator('#filmToggle').scrollIntoViewIfNeeded();await page.locator('#filmToggle').click();
 await page.waitForFunction(()=>!document.querySelector('#brandFilm').paused&&document.querySelector('#brandFilm').videoWidth===720);
 await page.locator('#brandFilm').evaluate(v=>v.currentTime=5);
 await page.setViewportSize({width:1440,height:900});
 await page.locator('#filmScreen').scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>{const v=document.querySelector('#brandFilm');return!v.paused&&v.videoWidth===1600&&v.currentTime>=5});
 const wide=await page.locator('#brandFilm').evaluate(v=>({src:v.getAttribute('src'),time:v.currentTime,width:v.videoWidth,paused:v.paused}));
 assert(wide.time<8,'preserved position, not a restart');report.push({wide});
 await page.screenshot({path:`${out}/wide-playing.png`});
 await page.locator('#filmToggle').click();await page.waitForFunction(()=>document.querySelector('#brandFilm').paused);
 const pausedTime=await page.locator('#brandFilm').evaluate(v=>v.currentTime);
 await page.setViewportSize({width:390,height:844});await page.locator('#filmScreen').scrollIntoViewIfNeeded();
 const paused=await page.locator('#brandFilm').evaluate(v=>({src:v.getAttribute('src'),time:v.currentTime,paused:v.paused}));
 assert(paused.paused);assert.equal(paused.src,wide.src,'no replacement download while paused');assert(Math.abs(paused.time-pausedTime)<.2);
 await page.locator('#filmToggle').click();
 await page.waitForFunction(()=>{const v=document.querySelector('#brandFilm');return!v.paused&&v.videoWidth===720&&v.currentTime>=5});
 const phone=await page.locator('#brandFilm').evaluate(v=>({src:v.getAttribute('src'),time:v.currentTime,width:v.videoWidth,paused:v.paused}));
 report.push({paused,phone});await page.screenshot({path:`${out}/phone-resumed.png`});assert.deepEqual(errors,[]);
}finally{await browser.close()}
await writeFile(`${out}/report.json`,JSON.stringify({engine,report},null,2));console.log(JSON.stringify({engine,passed:true,playingResize:true,pausedResize:true}));
