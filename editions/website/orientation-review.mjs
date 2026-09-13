// Local viewport changes model layout transitions, not physical Safari chrome.
import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
const engine=process.argv.includes('--webkit')?'webkit':'chrome';
const browser=await(engine==='webkit'?webkit.launch():chromium.launch({channel:'chrome'}));
const rows=[];
try{
 for(const lang of ['zh','en']){
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:7903/?lang='+lang);await page.evaluate(()=>document.fonts.ready);
  await page.locator('[data-course-index="1"]').click();
  await page.waitForFunction(()=>document.querySelector('[data-course-index="1"]').getAttribute('aria-pressed')==='true');
  await page.locator('#stageImage').evaluate(img=>img.decode());
  await page.waitForFunction(()=>document.getAnimations().filter(a=>a.effect?.target?.id==='stageImage').every(a=>a.playState==='finished'));
  await page.evaluate(()=>{const story=document.querySelector('#cinema'),stage=document.querySelector('#productStage');scrollTo({top:story.offsetTop-document.querySelector('.site-header').offsetHeight+(story.offsetHeight-stage.offsetHeight)*.35,behavior:'instant'})});
  await page.waitForFunction(()=>+getComputedStyle(document.querySelector('#productStage')).getPropertyValue('--detail-opacity')>.94);
  for(const [width,height] of [[390,760],[390,844],[844,390],[390,844]]){
   await page.setViewportSize({width,height});
   await page.waitForFunction(()=>document.querySelector('#cinema').dataset.fitsViewport===String(document.querySelector('#productStage').getBoundingClientRect().height<=innerHeight-document.querySelector('.site-header').getBoundingClientRect().height+1));
   assert.equal(await page.locator('[data-course-index="1"]').getAttribute('aria-pressed'),'true');
   assert.equal(await page.locator('html').getAttribute('lang'),lang);
   assert.equal(await page.locator('.dish-ghost').count(),0);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.screenshot({path:`${out}/${lang}-${rows.length}-${width}x${height}.png`});
   rows.push({lang,width,height,selectedScene:1,geometry:await page.locator('#productStage').evaluate(el=>({top:el.getBoundingClientRect().top,height:el.getBoundingClientRect().height,detailOpacity:getComputedStyle(el).getPropertyValue('--detail-opacity')}))});
  }
  await page.locator('.logo').click();await page.waitForFunction(()=>scrollY<2);
  await page.locator('#nextCourse').click();await page.waitForFunction(()=>document.querySelector('[data-course-index="2"]').getAttribute('aria-pressed')==='true');
  assert(await page.locator('.stage-order').evaluate(a=>new URL(a.href).searchParams.get('lang')===document.documentElement.lang));
  assert.deepEqual(errors,[]);await page.close();
 }
}finally{await browser.close()}
await writeFile(out+'/report.json',JSON.stringify({engine,rows,physicalToolbarTest:false},null,2));
console.log(JSON.stringify({engine,passed:true,viewportChanges:rows.length,physicalToolbarTest:false}));
