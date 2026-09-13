// Extended actual-browser visual/interaction review. All contexts are fresh;
// all requests stay on the isolated local preview; no live order operations.
import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import sharp from 'sharp';
const out=process.argv[2];assert(out,'Pass an evidence directory');await mkdir(out,{recursive:true});
const engine=process.argv.includes('--webkit')?'webkit':'chrome';
const browser=await(engine==='webkit'?webkit.launch({headless:true}):chromium.launch({channel:'chrome',headless:true}));
const report=[];
async function ready(page){await page.evaluate(async()=>{await document.fonts.ready;await document.querySelector('#stageImage').decode()});await settle(page)}
async function settle(page){await page.waitForFunction(()=>document.getAnimations().filter(a=>a.effect?.target?.id==='stageImage').every(a=>a.playState==='finished'))}
// A decoded image with a nonempty DOM box can still disappear at compositor
// boundaries. Compare actual pixels with its hidden state, not just geometry.
async function assertFoodPainted(page,label){
 const normal=await page.screenshot();
 await page.locator('.product-float').evaluate(e=>e.style.visibility='hidden');
 const hidden=await page.screenshot();
 await page.locator('.product-float').evaluate(e=>e.style.removeProperty('visibility'));
 const [a,b]=await Promise.all([normal,hidden].map(p=>sharp(p).removeAlpha().raw().toBuffer()));
 let changed=0;for(let i=0;i<a.length;i+=3)if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>45)changed++;
 const size=page.viewportSize();assert(changed>size.width*size.height*.015,`${label}: food decoded but did not paint`);
}
async function geometry(page){return page.evaluate(()=>{
 const box=s=>{const e=document.querySelector(s),r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}};
 return {width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth+1,
  previous:box('#previousCourse'),next:box('#nextCourse'),header:box('.site-header'),logo:box('.logo'),actions:box('.header-actions'),cta:box('.stage-order'),caption:box('#stageCaption'),imageLoaded:document.querySelector('#stageImage').naturalWidth>0};
})}
try{
 for(const [width,height] of [[1920,1080],[2560,1440],[768,1024],[820,1180],[430,932],[390,844],[320,568],[844,390],[1024,600],[1440,650]])for(const lang of ['zh','en']){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:width<=900});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>new URL(r.request().url()).origin==='http://127.0.0.1:7903'?r.continue():r.abort());
  await page.goto('http://127.0.0.1:7903/?lang='+lang);await ready(page);
  const start=await geometry(page);assert(!start.overflow,`${width}/${lang}: document overflow`);assert(start.imageLoaded);
  assert(start.previous.right<start.next.x,`${width}/${lang}: arrow order/overlap`);
  assert(start.actions.x>=start.logo.right-1||start.actions.y>=start.logo.bottom-1,`${width}/${lang}: header collision`);
  assert(start.cta.y>=start.caption.bottom,`${width}/${lang}: CTA and caption overlap`);
  if(width<=480||height<=650)assert(start.cta.bottom<=height,`${width}/${lang}: CTA below first viewport`);
  await page.screenshot({path:`${out}/${width}-${lang}-opening.png`});
  if(height<=650&&width>760)await assertFoodPainted(page,`${width}/${lang}`);
  for(const key of ['chilli','broth','fried']){await page.locator('#nextCourse').click();await page.waitForFunction(key=>document.querySelector('#productStage').dataset.course===key,key);await ready(page);await settle(page);}
  // Rapid taps must settle on the latest intent, with no lingering ghost nodes.
  await page.evaluate(()=>{document.querySelector('#nextCourse').click();document.querySelector('#nextCourse').click()});
  await page.waitForFunction(()=>document.querySelector('#productStage').dataset.course==='broth');await settle(page);
  assert.equal(await page.locator('.dish-ghost').count(),0);
  // Keyboard navigation follows the same scene state.
  await page.locator('#nextCourse').focus();await page.keyboard.press('Home');await page.waitForFunction(()=>document.querySelector('#productStage').dataset.course==='fried');
  assert.equal(await page.locator('#nextCourse').evaluate(e=>e===document.activeElement),true);
  if(width<=760){await page.locator('#navToggle').click();assert.equal(await page.locator('#mainNav').getAttribute('data-open'),'true');await page.keyboard.press('Escape');assert.equal(await page.locator('#mainNav').getAttribute('data-open'),'false');}
  assert.deepEqual(errors,[]);report.push({width,height,lang,start,rapidSelection:true,keyboard:true,errors});await context.close();
 }
 for(const width of [1440,390,320]){
  const page=await browser.newPage({viewport:{width,height:width===320?568:900},reducedMotion:'reduce'});
  await page.goto('http://127.0.0.1:7903/?lang=zh');await page.evaluate(()=>document.documentElement.style.fontSize='200%');await ready(page);
  const large=await geometry(page);assert(!large.overflow,`${width}: enlarged text overflow`);assert(large.cta.y>=large.caption.bottom,`${width}: enlarged CTA collision`);
  await page.screenshot({path:`${out}/${width}-large-text.png`});report.push({width,enlargedText:true,large});await page.close();
 }
 // Actual transition composition sampled by scrubbing the browser's Web Animations.
 const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();
 await page.goto('http://127.0.0.1:7903/?lang=zh');await ready(page);await page.locator('#nextCourse').click();await page.waitForFunction(()=>document.querySelector('#productStage').dataset.course==='chilli');
 for(const time of [120,320,620,900]){await page.evaluate(t=>{for(const a of document.getAnimations()){a.pause();a.currentTime=t}},time);await page.screenshot({path:`${out}/transition-${time}.png`});}
 await context.close();
}finally{await browser.close()}
await writeFile(`${out}/report.json`,JSON.stringify({engine,cases:report},null,2));console.log(JSON.stringify({engine,cases:report.length,passed:true,evidence:out}));
