// Actual local browser captures for the reduced hero hierarchy, not mockups.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
const browser=await chromium.launch(),cases=[];
try{
 for(const [device,width,height,density] of [['desktop',1440,900,2],['phone',390,844,3]])for(const lang of ['zh','en']){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:density});
  const page=await context.newPage(),errors=[],writes=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{
   const r=route.request();
   if(!['GET','HEAD'].includes(r.method())){writes.push(r.url());return route.abort()}
   return new URL(r.url()).origin==='http://127.0.0.1:7903'?route.continue():route.abort();
  });
  await page.goto('http://127.0.0.1:7903/?lang='+lang);
  await page.locator('#productStage[data-image-ready=true]').waitFor();
  await page.evaluate(()=>document.fonts.ready);
  await page.locator('#motionToggle').click();
  assert.equal(await page.locator('.stage-meta,.scroll-cue,#courseChoices,[data-course-index]').count(),0);
  assert.equal(await page.locator('#courseControl button').count(),2);
  assert.equal(await page.locator('.stage-caption h2').evaluate(e=>e.getBoundingClientRect().width),1);
  assert.equal(await page.locator('#motionToggle').getAttribute('aria-label'),lang==='zh'?'播放动效':'Play motion');
  for(const course of ['fried','chilli','broth']){
   if(course!=='fried')await page.locator('#nextCourse').click();
   await page.waitForFunction(key=>document.querySelector('#productStage').dataset.course===key,course);
   await page.evaluate(()=>document.querySelector('#stageImage').decode());
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   const filename=`${device}-${lang}-${course}.png`;
   await page.screenshot({path:out+'/'+filename});cases.push({device,lang,course,filename,width,height,density});
  }
  await page.locator('#nextCourse').focus();await page.keyboard.press('Home');
  await page.waitForFunction(()=>document.querySelector('#productStage').dataset.course==='fried');
  assert(await page.locator('#nextCourse').evaluate(e=>e===document.activeElement));
  assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);await context.close();
 }
}finally{await browser.close()}
await writeFile(out+'/capture-manifest.json',JSON.stringify({capturedAt:new Date().toISOString(),localPreview:'http://127.0.0.1:7903',cases,productionWrites:0},null,2));
console.log(JSON.stringify({passed:true,captures:cases.length,out}));
