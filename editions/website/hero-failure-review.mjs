import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
const engine=process.argv.includes('--webkit')?'webkit':'chrome';
const browser=await(engine==='webkit'?webkit.launch({headless:true}):chromium.launch({channel:'chrome',headless:true}));
const report=[];
try{
 for(const bothFail of [false,true]){
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/hero-potstickers-v1*.webp',r=>r.abort());
  if(bothFail)await page.route('**/potstickers-pork-shrimp-chive-cutaway-v1.webp',r=>r.abort());
  await page.goto('http://127.0.0.1:7903/?lang=zh');
  if(bothFail){
   await page.waitForFunction(()=>document.querySelector('#productStage').dataset.imageUnavailable==='true');
   assert.equal(await page.locator('#stageProduct').isVisible(),false);
   assert.equal(await page.locator('#cinema').getAttribute('data-enhanced'),'false');
  }else{
   await page.waitForFunction(()=>{const img=document.querySelector('#stageImage');return img.src.includes('/img/l/')&&img.naturalWidth>0});
   assert(await page.locator('#stageImage').isVisible());
  }
  assert(await page.locator('.stage-order').isVisible());
  await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:`${out}/${bothFail?'text-fallback':'catalogue-fallback'}.png`});
  await page.locator('[data-course-index="1"]').click();await page.waitForFunction(()=>document.body.dataset.course==='chilli'&&document.querySelector('#stageImage').naturalWidth>0&&!document.querySelector('#productStage').dataset.imageUnavailable);
  assert(await page.locator('#stageProduct').isVisible());assert.deepEqual(errors,[]);
  report.push({bothFail,recoveredOnNext:true});await page.close();
 }
}finally{await browser.close()}
await writeFile(`${out}/report.json`,JSON.stringify({engine,report},null,2));console.log(JSON.stringify({engine,passed:true,cases:report.length}));
