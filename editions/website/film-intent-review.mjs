import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
const engine=process.argv.includes('--webkit')?'webkit':'chrome';
const browser=await(engine==='webkit'?webkit.launch({headless:true}):chromium.launch({channel:'chrome',headless:true}));
const report=[];
try{
 for(const reducedMotion of ['no-preference','reduce']){
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion});
  await page.addInitScript(()=>localStorage.setItem('dumplinglab:motion','paused'));
  await page.goto('http://127.0.0.1:7903/?lang=zh');await page.waitForFunction(()=>document.body.dataset.motionPaused==='true');
  await page.locator('#filmToggle').click();await page.waitForFunction(()=>!document.querySelector('#brandFilm').paused&&document.querySelector('#filmScreen').dataset.filmReady==='true');
  assert.equal(await page.locator('body').getAttribute('data-motion-paused'),'true');
  assert.equal(await page.evaluate(()=>localStorage.getItem('dumplinglab:motion')),'paused');
  assert.equal(await page.locator('.product-float').evaluate(e=>getComputedStyle(e).animationName),'none');
  assert.equal(await page.locator('#filmToggle').getAttribute('aria-label'),'暂停短片');
  if(reducedMotion==='reduce')assert.equal(await page.locator('#motionToggle').isVisible(),false);
  else{
   await page.evaluate(()=>document.querySelector('#motionToggle').click());
   await page.waitForFunction(()=>document.body.dataset.motionPaused==='false');
   await page.evaluate(()=>document.querySelector('#motionToggle').click());
   await page.waitForFunction(()=>document.body.dataset.motionPaused==='true'&&document.querySelector('#brandFilm').paused);
  }
  report.push({reducedMotion,filmOnlyPlayback:true,savedPausePreserved:true,globalPauseStopsFilm:reducedMotion==='no-preference',nonfunctionalMotionToggleHidden:reducedMotion==='reduce'});await page.close();
 }
}finally{await browser.close()}
await writeFile(`${out}/report.json`,JSON.stringify({engine,cases:report},null,2));console.log(JSON.stringify({engine,passed:report.length}));
