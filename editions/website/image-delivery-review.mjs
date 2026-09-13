import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
const browser=await(process.argv.includes('--webkit')?webkit.launch({headless:true}):chromium.launch({channel:'chrome',headless:true}));
const cases=[];
try{
 for(const [density,saveData,effectiveType,downlink] of [[2,false],[3,false],[2,true],[2,false,'slow-2g',.05],[2,false,'2g',.1],[2,false,'3g',.8],[2,false,'4g',1],[2,false,'4g',10]]){
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:density});
  const constrained=saveData||['slow-2g','2g','3g'].includes(effectiveType)||(downlink>0&&downlink<1.5);
  await page.addInitScript(connection=>Object.defineProperty(navigator,'connection',{value:connection}),{saveData,effectiveType,downlink});
  await page.goto('http://127.0.0.1:7903/?lang=zh');await page.locator('#stageImage').evaluate(e=>e.decode());
  if(!constrained)await page.waitForFunction(()=>performance.getEntriesByType('resource').filter(e=>/hero-(chilli|wonton)/.test(e.name)).length===2);
  else await page.evaluate(()=>new Promise(resolve=>{if('requestIdleCallback'in window)requestIdleCallback(()=>resolve());else requestAnimationFrame(()=>requestAnimationFrame(resolve))}));
  const result=await page.evaluate(()=>({image:document.querySelector('#stageImage').currentSrc,assets:performance.getEntriesByType('resource').filter(e=>/hero-.*\.webp/.test(e.name)).map(e=>({name:new URL(e.name).pathname,start:e.startTime,end:e.responseEnd})),course:document.querySelector('#productStage').dataset.course}));
  assert(result.image.endsWith(density===2?'hero-potstickers-v1-800.webp':'hero-potstickers-v1.webp'));
  assert.equal(result.course,'fried','Preloading must never select a dish');
  const first=result.assets.find(e=>e.name.includes('potstickers')),others=result.assets.filter(e=>!e.name.includes('potstickers'));
  if(constrained){
   assert.equal(others.length,0);
   await page.locator('[data-course-index="1"]').click();
   await page.waitForFunction(()=>document.querySelector('#productStage').dataset.course==='chilli');
   assert(await page.locator('#stageImage').evaluate(img=>img.complete&&img.naturalWidth>0),'Explicit dish selection remains usable on constrained links');
  }else{assert.equal(others.length,2);assert(others.every(e=>e.start>=first.end),'Future assets must not compete with the priority hero request')}
  cases.push({density,saveData,effectiveType,downlink,constrained,...result});await page.close();
 }
}finally{await browser.close()}
await writeFile(out+'/report.json',JSON.stringify(cases,null,2));console.log(JSON.stringify({passed:true,cases:cases.length,evidence:out}));
