import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2];if(!out)throw new Error('Pass a screenshot output directory');
await mkdir(out,{recursive:true});
const browser=await (process.argv.includes('--webkit')?webkit.launch({headless:true}):chromium.launch({channel:'chrome',headless:true}));
const report=[];
try{
 for(const [width,height] of [[1440,900],[390,844],[320,568],[844,390]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:width<900});
  const page=await context.newPage(),errors=[],failures=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failures.push([r.status(),r.url()])});
  await page.route('**/*',route=>new URL(route.request().url()).origin==='http://127.0.0.1:7903'?route.continue():route.abort());
  await page.goto('http://127.0.0.1:7903/?lang=zh');
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(i=>i.loading!=='lazy').map(i=>i.decode().catch(()=>{})))});
  await page.waitForFunction(()=>document.getAnimations().filter(a=>a.effect?.target?.id==='stageImage').every(a=>a.playState==='finished'));
  await page.screenshot({path:`${out}/${width}-start.png`});
  const boxes=()=>page.evaluate(()=>{
   const box=s=>{const n=document.querySelector(s),r=n.getBoundingClientRect(),c=getComputedStyle(n);return {x:r.x,y:r.y,w:r.width,h:r.height,opacity:c.opacity,visibility:c.visibility,text:n.innerText}};
   return {viewport:[innerWidth,innerHeight],overflow:document.documentElement.scrollWidth>innerWidth,stage:box('#productStage'),image:box('#stageImage'),caption:box('#stageCaption'),detail:box('#stageDetail'),controls:box('#courseControl'),order:box('.stage-order'),header:box('.site-header')};
  });
  const states={start:await boxes()};
  await page.locator('#nextCourse').click();await page.waitForFunction(()=>document.querySelector('#stageName').textContent==='红油抄手');
  await page.waitForFunction(()=>document.getAnimations().filter(a=>a.effect?.target?.id==='stageImage').every(a=>a.playState==='finished'));
  await page.screenshot({path:`${out}/${width}-chilli.png`});
  await page.evaluate(()=>{const el=document.querySelector('#cinema');window.scrollTo({top:el.offsetTop+Math.max(0,el.offsetHeight-document.querySelector('#productStage').offsetHeight)*.7,behavior:'instant'})});
  await page.waitForFunction(()=>!document.querySelector('#stageDetail').inert||innerHeight<=650);
  await page.screenshot({path:`${out}/${width}-closeup.png`});states.closeup=await boxes();
  await page.locator('#language').click();
  await page.waitForFunction(()=>document.querySelector('#stageWord').textContent==='HOT\nWONTONS');
  assert.equal(await page.locator('#motionLabel').innerText(),'Pause motion');
  const orderText=await page.locator('.site-header .order-link').evaluate(el=>({height:el.children[0].getBoundingClientRect().height,lineHeight:parseFloat(getComputedStyle(el.children[0]).lineHeight)}));
  assert(orderText.height<=orderText.lineHeight+1,`${width}: header ordering label must not wrap`);
  assert(!(await boxes()).overflow,`${width}: horizontal overflow`);
  await page.screenshot({path:`${out}/${width}-english.png`});states.english=await boxes();
  await page.locator('#motionToggle').click();assert.equal(await page.locator('body').getAttribute('data-motion-paused'),'true');
  await page.locator('#motionToggle').click();assert.equal(await page.locator('body').getAttribute('data-motion-paused'),'false');
  await page.locator('#film').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/${width}-film.png`});
  await page.screenshot({path:`${out}/${width}-full.png`,fullPage:true});
  await page.locator('.site-header .order-link').click();await page.waitForURL('**/order?lang=en');
  assert.equal(await page.title(),'Dumpling Lab');
  assert.deepEqual(errors,[],`${width}: runtime errors`);assert.deepEqual(failures,[],`${width}: HTTP failures`);
  report.push({width,height,errors,failures,states,languageSynchronized:true,headerSingleLine:true,orderingNavigation:true,pauseToggle:true});await context.close();
 }
 const reduced=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const reducedPage=await reduced.newPage();await reducedPage.goto('http://127.0.0.1:7903/?lang=zh');
 await reducedPage.waitForFunction(()=>document.body.dataset.motionPaused==='true');
 assert.equal(await reducedPage.locator('#brandFilm').getAttribute('src'),null);
 assert.equal(await reducedPage.locator('#cinema').getAttribute('data-enhanced'),'false');
 await reducedPage.locator('#nextCourse').click();await reducedPage.waitForFunction(()=>document.querySelector('#stageName').textContent==='红油抄手');
 await reducedPage.screenshot({path:`${out}/reduced-motion.png`});
 report.push({reducedMotion:true,videoNotAutoloaded:true,selectionWorks:true});await reduced.close();
}finally{await browser.close()}
await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
