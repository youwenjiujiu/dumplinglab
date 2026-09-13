// Real local navigation and browser history. Report BFCache only when the
// browser actually marks pageshow.persisted; do not infer it from goBack().
import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {cacheableFixture} from './cacheable-fixture.mjs';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
const engine=process.argv.includes('--webkit')?'webkit':'chrome';
// Playwright normally disables Chromium's BFCache. Explicitly opt in for this
// test, then still require pageshow.persisted before claiming cache coverage.
const requestBFCache=process.argv.includes('--bfcache');
const bundleIndex=process.argv.indexOf('--bundle');
const fixture=bundleIndex>=0?await cacheableFixture(process.argv[bundleIndex+1]):null;
const origin=fixture?.origin||'http://127.0.0.1:7903';
const browser=await(engine==='webkit'?webkit.launch():chromium.launch({channel:'chrome',...(requestBFCache?{ignoreDefaultArgs:['--disable-back-forward-cache']}: {})}));
const cases=[];
try{
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.pageReturns=[];addEventListener('pageshow',e=>pageReturns.push({persisted:e.persisted}));if(!localStorage.getItem('dumplinglab:motion'))localStorage.setItem('dumplinglab:motion','paused')});
  await page.goto(origin+'/?lang=zh');
  await page.locator('#filmToggle').click();await page.waitForFunction(()=>!document.querySelector('#brandFilm').paused&&document.querySelector('#brandFilm').readyState>=3);
  await page.locator('#brandFilm').evaluate(v=>v.currentTime=4.5);
  await page.waitForFunction(()=>{const v=document.querySelector('#brandFilm');return !v.seeking&&v.readyState>=3&&v.currentTime>=4.5});
  const before=await page.evaluate(()=>({scroll:scrollY,paused:document.body.dataset.motionPaused,time:document.querySelector('#brandFilm').currentTime,timeOrigin:performance.timeOrigin,pageShows:pageReturns.length}));
  // A BFCache restoration has pageshow, not a second document load event.
  await page.goto(origin+'/review');await page.goBack({waitUntil:'commit'});
  await page.waitForFunction(before=>document.body.dataset.motionPaused==='true'&&(performance.timeOrigin===before.timeOrigin?window.pageReturns?.length>before.pageShows:window.pageReturns?.length>0),before);
  const persisted=await page.evaluate(()=>pageReturns.at(-1).persisted);
  if(persisted)await page.waitForFunction(()=>!document.querySelector('#brandFilm').paused&&document.querySelector('#brandFilm').currentTime>=4.5);
  else assert(await page.locator('#brandFilm').evaluate(v=>v.paused),'A new document respects the saved decorative-motion pause');
  await page.waitForFunction(()=>document.querySelector('#productStage').dataset.imageReady==='true');
  const result=await page.evaluate(()=>({persisted:pageReturns.at(-1).persisted,scroll:scrollY,language:document.documentElement.lang,paused:document.body.dataset.motionPaused,filmPaused:document.querySelector('#brandFilm').paused,time:document.querySelector('#brandFilm').currentTime,overflow:document.documentElement.scrollWidth>innerWidth,notRestoredReasons:performance.getEntriesByType('navigation')[0]?.notRestoredReasons?.toJSON?.()||null}));
  assert.equal(result.language,'zh');assert.equal(result.paused,before.paused);assert(!result.overflow);assert.equal(await page.locator('.dish-ghost').count(),0);assert.deepEqual(errors,[]);
  await page.screenshot({path:`${out}/${width}-returned.png`});cases.push({width,before,returned:result});await page.close();
 }
}finally{await browser.close();await fixture?.close()}
await writeFile(out+'/report.json',JSON.stringify({engine,requestBFCache,cacheableBuildFixture:!!fixture,cases},null,2));console.log(JSON.stringify({engine,requestBFCache,cacheableBuildFixture:!!fixture,passed:true,cases},null,2));
