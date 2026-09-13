import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
const engine=process.argv.includes('--webkit')?'webkit':'chrome';
const browser=await(engine==='webkit'?webkit.launch({headless:true}):chromium.launch({channel:'chrome',headless:true}));
const report=[];
try{
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900}});
  await page.goto('http://127.0.0.1:7903/?lang=zh');await page.locator('#motionToggle').click();
  for(const scene of [0,1,2]){
   await page.locator(`[data-course-index="${scene}"]`).click();await page.waitForFunction(scene=>document.querySelector(`[data-course-index="${scene}"]`).getAttribute('aria-pressed')==='true',scene);
   await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.waitForFunction(()=>document.querySelector('#productStage').dataset.detail==='false');
   await page.evaluate(()=>{const e=document.querySelector('#cinema');scrollTo({top:e.offsetTop+(e.offsetHeight-document.querySelector('#productStage').offsetHeight)*.65,behavior:'instant'})});
   await page.waitForFunction(()=>document.querySelector('#productStage').dataset.detail==='true');
   const style=await page.locator('#previousCourse').evaluate(e=>{const s=getComputedStyle(e);return {background:s.backgroundColor,color:s.color,transition:s.transitionDuration}});
   assert.equal(style.background,'rgba(0, 0, 0, 0)','The first close-up frame must not retain the outgoing cream button fill');
   assert.equal(style.transition,'0s');
   await page.screenshot({path:`${out}/${width}-${scene}.png`});report.push({width,scene,...style});
  }
  await page.close();
 }
}finally{await browser.close()}
await writeFile(`${out}/report.json`,JSON.stringify({engine,cases:report},null,2));console.log(JSON.stringify({engine,passed:report.length}));
