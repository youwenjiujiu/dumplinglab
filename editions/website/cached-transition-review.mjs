import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {cacheableFixture} from './cacheable-fixture.mjs';
const [out,bundle]=process.argv.slice(2);assert(out&&bundle);await mkdir(out,{recursive:true});
const fixture=await cacheableFixture(bundle),browser=await chromium.launch({channel:'chrome',ignoreDefaultArgs:['--disable-back-forward-cache']}),rows=[];
try{
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.pageShows=[];addEventListener('pageshow',e=>pageShows.push(e.persisted))});
  await page.goto(fixture.origin+'/?lang=zh');await page.evaluate(()=>document.fonts.ready);
  for(const scene of [1,2,1]){
   await page.locator(`[data-course-index="${scene}"]`).click();await page.waitForFunction(i=>document.querySelector(`[data-course-index="${i}"]`).getAttribute('aria-pressed')==='true',scene);
   await page.waitForFunction(()=>document.getAnimations().filter(a=>a.effect?.target?.id==='stageImage').every(a=>a.playState==='finished'));
  }
  await page.locator('#nextCourse').click();await page.waitForFunction(()=>document.body.dataset.course==='broth');
  assert(await page.locator('#stageImage').evaluate(img=>img.getAnimations().some(a=>a.playState==='running')),'Leave during an actual food transition');
  await page.goto(fixture.origin+'/review');await page.goBack({waitUntil:'commit'});
  await page.waitForFunction(()=>window.pageShows?.at(-1)===true);
  assert.equal(await page.locator('body').getAttribute('data-course'),'broth');
  assert.equal(await page.locator('.dish-ghost').count(),0);
  assert.equal(await page.locator('#courseControl').getAttribute('aria-busy'),'false');
  assert(await page.locator('#stageImage').evaluate(img=>img.complete&&img.naturalWidth>0&&img.getAnimations().every(a=>a.playState!=='running')));
  await page.locator('#nextCourse').click();await page.waitForFunction(()=>document.body.dataset.course==='fried');
  await page.waitForFunction(()=>document.getAnimations().filter(a=>a.effect?.target?.id==='stageImage').every(a=>a.playState==='finished'));
  assert.equal(await page.locator('.dish-ghost').count(),0);assert.deepEqual(errors,[]);
  await page.screenshot({path:`${out}/${width}-after-return.png`});rows.push({width,persisted:true,interruptedTransitionRetainedScene:true,noGhost:true,nextSelectionWorks:true});await page.close();
 }
}finally{await browser.close();await fixture.close()}
await writeFile(out+'/report.json',JSON.stringify({rows,productionWrites:0,cacheableLocalBuild:true},null,2));console.log(JSON.stringify({passed:true,rows},null,2));
