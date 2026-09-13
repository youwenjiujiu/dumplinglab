import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
// Intentionally capture a pending resource. WebKit can keep document.fonts.ready
// pending with that resource; do not make this failure-state screenshot wait
// for page readiness. This option affects the test process, never the website.
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY='1';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
const engine=process.argv.includes('--webkit')?'webkit':'chrome';
const browser=await(engine==='webkit'?webkit.launch():chromium.launch({channel:'chrome'}));
const cases=[];
try{
 for(const mode of ['delayed-image','early-selection','delayed-module','failed-module','no-js']){
  const page=await browser.newPage({viewport:{width:390,height:844},javaScriptEnabled:mode!=='no-js'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  let release;
  const barrier=new Promise(resolve=>release=resolve);
  if(mode==='delayed-image'||mode==='early-selection')await page.route('**/hero-potstickers-v1*.webp',async route=>{await barrier;await route.continue()});
  if(mode==='delayed-module')await page.route('**/site/stage.js',async route=>{await barrier;await route.continue()});
  if(mode==='failed-module')await page.route('**/site/stage.js',route=>route.abort());
  await page.goto('http://127.0.0.1:7903/?lang=zh',{waitUntil:'commit'});
  await page.locator('#stageProduct').waitFor({state:'attached'});
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('#productStage')).backgroundColor==='rgb(155, 37, 45)');
  if(mode==='early-selection'){
   await page.waitForFunction(()=>document.body.dataset.motionPaused==='false');
   await page.locator('[data-course-index="1"]').click();
   await page.waitForFunction(()=>document.querySelector('#productStage').dataset.course==='chilli');
   assert.equal(await page.locator('.dish-ghost').count(),0,'An undelivered opening must not become a partial outgoing layer');
   await page.waitForFunction(()=>document.querySelector('#productStage').dataset.imageReady==='true');
   release();
  }else if(mode==='delayed-image'||mode==='delayed-module'){
   await page.waitForFunction(()=>document.documentElement.classList.contains('has-js'));
   assert.equal(await page.locator('#stageProduct').evaluate(el=>getComputedStyle(el).visibility),'hidden');
   assert.equal(await page.locator('#stageName').isVisible(),true);
   await page.screenshot({path:out+'/'+mode+'-pending.png'});release();
   await page.waitForFunction(()=>document.querySelector('#productStage').dataset.imageReady==='true');
  }else{
   await page.waitForFunction(()=>!document.documentElement.classList.contains('has-js'));
  }
  await page.locator('#stageImage').evaluate(img=>img.decode());
  assert.equal(await page.locator('#stageProduct').evaluate(el=>getComputedStyle(el).visibility),'visible');
  await page.screenshot({path:out+'/'+mode+'-ready.png'});
  assert.deepEqual(errors,[]);cases.push({mode,completeHeroVisible:true});await page.close();
 }
}finally{await browser.close()}
await writeFile(out+'/report.json',JSON.stringify({engine,cases},null,2));console.log(JSON.stringify({engine,passed:true,cases:cases.length}));
