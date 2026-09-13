import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
const engine=process.argv.includes('--webkit')?'webkit':'chrome';
const browser=await(engine==='webkit'?webkit.launch({headless:true}):chromium.launch({channel:'chrome',headless:true}));
const report=[];
try{
 for(const width of [320,360,390,430,440])for(const size of [100,200]){
  const page=await browser.newPage({viewport:{width,height:844},reducedMotion:'reduce'});
  await page.goto('http://127.0.0.1:7903/?lang=en');await page.evaluate(size=>document.documentElement.style.fontSize=size+'%',size);await page.evaluate(()=>document.fonts.ready);
  for(const scene of [0,1,2]){
   await page.locator(`[data-course-index="${scene}"]`).click();await page.waitForFunction(i=>document.querySelector(`[data-course-index="${i}"]`).getAttribute('aria-pressed')==='true',scene);
   await page.locator('#stageImage').evaluate(e=>e.decode());
   const boxes=await page.evaluate(()=>{const e=document.querySelector('#stageWord'),node=e.firstChild,r=document.createRange();r.setStart(node,node.textContent.indexOf('\n')+1);r.setEnd(node,node.textContent.length);return {title:r.getBoundingClientRect().toJSON(),caption:document.querySelector('#stageCaption').getBoundingClientRect().toJSON(),overflow:document.documentElement.scrollWidth>innerWidth+1}});
   assert(!boxes.overflow);assert(boxes.title.bottom+8<=boxes.caption.top,`${width}/${size}/${scene}: headline/caption collision`);
   if(size===100&&width===390)await page.screenshot({path:`${out}/scene-${scene}.png`});
   report.push({width,size,scene,...boxes});
  }await page.close();
 }
}finally{await browser.close()}
await writeFile(`${out}/report.json`,JSON.stringify({engine,cases:report},null,2));console.log(JSON.stringify({engine,passed:report.length}));
