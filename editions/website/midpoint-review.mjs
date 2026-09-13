import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {stagePose} from './motion-math.mjs';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
assert(stagePose(.25,1440,814).detail>=.49,'Near-view copy must bridge the old mid-scroll empty beat');
assert(stagePose(.35,1440,814).detail>=.95,'Copy is fully readable before the close-up camera settles');
const engine=process.argv.includes('--webkit')?'webkit':'chrome';
const browser=await(engine==='webkit'?webkit.launch():chromium.launch({channel:'chrome'}));
const cases=[];
try{
 for(const width of [390,1440])for(const lang of ['zh','en']){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:7903/?lang='+lang);await page.evaluate(()=>document.fonts.ready);
  for(const scene of [0,1,2]){
   await page.locator(`[data-course-index="${scene}"]`).click();
   await page.waitForFunction(scene=>document.querySelector(`[data-course-index="${scene}"]`).getAttribute('aria-pressed')==='true',scene);
   await page.locator('#stageImage').evaluate(img=>img.decode());
   await page.waitForFunction(()=>document.getAnimations().filter(a=>a.effect?.target?.id==='stageImage').every(a=>a.playState==='finished'));
   for(const progress of [.16,.25,.35]){
    await page.evaluate(p=>{const story=document.querySelector('#cinema'),stage=document.querySelector('#productStage'),header=document.querySelector('.site-header');scrollTo({top:story.offsetTop-header.offsetHeight+(story.offsetHeight-stage.offsetHeight)*p,behavior:'instant'})},progress);
    await page.waitForFunction(p=>Math.abs(new DOMMatrixReadOnly(getComputedStyle(document.querySelector('#storyProgress')).transform).a-p)<.002,progress);
    const result=await page.evaluate(()=>{const stage=document.querySelector('#productStage'),detail=document.querySelector('#stageDetail'),header=document.querySelector('.site-header');return{alpha:+getComputedStyle(stage).getPropertyValue('--detail-opacity'),inert:detail.inert,linkVisible:getComputedStyle(detail.querySelector('a')).visibility==='visible',top:detail.getBoundingClientRect().top,headerBottom:header.getBoundingClientRect().bottom,bottom:detail.getBoundingClientRect().bottom,stageBottom:stage.getBoundingClientRect().bottom,overflow:document.documentElement.scrollWidth>innerWidth}});
    const expected=stagePose(progress,width,900,width<=760).detail;
    assert(Math.abs(result.alpha-expected)<.025);assert.equal(result.linkVisible,!result.inert);assert(!result.overflow);assert(result.top>=result.headerBottom);assert(result.bottom<=result.stageBottom);
    const intro=await page.evaluate(()=>['.stage-title','.stage-tags'].map(selector=>{const s=getComputedStyle(document.querySelector(selector));return{visibility:s.visibility,opacity:+s.opacity}}));
    assert(intro.every(item=>item.visibility==='visible'),'Early close-up copy must not cut off the outgoing typography');
    if(progress===.16)assert(intro.every(item=>item.opacity>(width<=760?.15:.3)&&item.opacity<(width<=760?.23:.5)),'Outgoing layers follow their fade instead of disappearing');
    await page.screenshot({path:`${out}/${width}-${lang}-${scene}-${progress}.png`});cases.push({width,lang,scene,progress,...result});
   }
  }
  assert.deepEqual(errors,[]);await page.close();
 }
}finally{await browser.close()}
await writeFile(out+'/report.json',JSON.stringify({engine,cases},null,2));console.log(JSON.stringify({engine,passed:true,cases:cases.length}));
