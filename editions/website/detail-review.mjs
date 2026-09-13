// Review every selected food in the scroll close-up, including the tall noodle
// artwork. Fresh local contexts only; this does not submit or modify orders.
import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
const browser=await(process.argv.includes('--webkit')?webkit.launch({headless:true}):chromium.launch({channel:'chrome',headless:true}));
const results=[];
try{
 for(const [width,height] of [[1440,900],[768,1024],[390,844]])for(const lang of ['zh','en']){
  const page=await browser.newPage({viewport:{width,height}});
  await page.goto('http://127.0.0.1:7903/?lang='+lang);await page.evaluate(async()=>{await document.fonts.ready;await document.querySelector('#stageImage').decode()});
  await page.locator('#motionToggle').click();
  await page.evaluate(()=>{const e=document.querySelector('#cinema');scrollTo({top:e.offsetTop+(e.offsetHeight-document.querySelector('#productStage').offsetHeight)*.65,behavior:'instant'})});
  await page.waitForFunction(()=>document.querySelector('#productStage').dataset.detail==='true');
  for(const i of [0,1,2]){
   await page.locator(`[data-course-index="${i}"]`).click();
   await page.waitForFunction(i=>document.querySelector(`[data-course-index="${i}"]`).getAttribute('aria-pressed')==='true',i);
   await page.locator('#stageImage').evaluate(e=>e.decode());
   const layout=await page.evaluate(()=>{
    const rect=s=>document.querySelector(s).getBoundingClientRect().toJSON();
    const matrix=new DOMMatrixReadOnly(getComputedStyle(document.querySelector('#stageProduct')).transform);
    return {detail:rect('#stageDetail'),header:rect('.site-header'),previous:rect('#previousCourse'),next:rect('#nextCourse'),image:rect('#stageImage'),stage:rect('#productStage'),overflow:document.documentElement.scrollWidth>innerWidth+1,interactive:!document.querySelector('#stageDetail').inert,rotation:Math.atan2(matrix.b,matrix.a)*180/Math.PI,background:getComputedStyle(document.querySelector('#productStage')).backgroundColor};
   });
   assert(!layout.overflow);assert(layout.interactive);assert(layout.detail.top>=layout.header.bottom-1,`${width}/${lang}/${i}: detail under header`);
   assert(Math.abs(layout.rotation-12)<.01,'Scroll rotation must not be overridden by local CSS');
   if(i===2)assert.equal(layout.background,'rgb(247, 230, 201)','Light scene palette must switch atomically');
   assert(layout.detail.bottom<=layout.stage.bottom,`${width}/${lang}/${i}: clipped detail`);
   await page.screenshot({path:`${out}/${width}-${lang}-${i}-detail.png`});results.push({width,height,lang,scene:i,layout});
  }
  await page.close();
 }
}finally{await browser.close()}
await writeFile(out+'/report.json',JSON.stringify(results,null,2));console.log(JSON.stringify({passed:true,cases:results.length,evidence:out}));
