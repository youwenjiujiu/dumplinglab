import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
const engine=process.argv.includes('--webkit')?'webkit':'chrome';
const browser=await(engine==='webkit'?webkit.launch({headless:true}):chromium.launch({channel:'chrome',headless:true}));
const report=[];
try{
 for(const width of [390,820,1440,1920,2560])for(const size of [150,200]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:7903/?lang=en');await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(size=>document.documentElement.style.fontSize=size+'%',size);
  await page.waitForFunction(()=>document.querySelector('#cinema').dataset.fitsViewport==='false');
  assert.equal(await page.locator('#productStage').evaluate(e=>getComputedStyle(e).position),'relative');
  const heights=await page.evaluate(()=>['#cinema','#productStage'].map(s=>document.querySelector(s).offsetHeight));assert(Math.abs(heights[0]-heights[1])<=1);
  await page.locator('#motionToggle').scrollIntoViewIfNeeded();assert.equal(await page.locator('#productStage').getAttribute('data-detail'),'false');
  const boxes=await page.locator('#courseChoices,#motionToggle').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().toJSON()));
  assert(boxes[0].right<=boxes[1].left||boxes[0].bottom<=boxes[1].top,'enlarged controls do not overlap');
  await page.screenshot({path:`${out}/${width}-${size}.png`});
  await page.evaluate(()=>document.documentElement.style.fontSize='100%');await page.waitForFunction(()=>document.querySelector('#cinema').dataset.fitsViewport==='true');
  assert.equal(await page.locator('#productStage').evaluate(e=>getComputedStyle(e).position),'sticky');
  assert.deepEqual(errors,[]);report.push({width,size,ordinaryFlow:true,normalMotionRestored:true});await page.close();
 }
}finally{await browser.close()}
await writeFile(`${out}/report.json`,JSON.stringify({engine,report},null,2));console.log(JSON.stringify({engine,passed:true,cases:report.length}));
