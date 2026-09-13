import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
const engine=process.argv.includes('--webkit')?'webkit':'chrome';
const browser=await(engine==='webkit'?webkit.launch({headless:true}):chromium.launch({channel:'chrome',headless:true}));
const report=[];
try{
 for(const reducedMotion of ['no-preference','reduce']){
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion});
  await page.addInitScript(()=>{window.chapterCalls=[];const animate=Element.prototype.animate;Element.prototype.animate=function(frames,options){if(this.matches('.section-intro h2,.food-item,.space-heading h2,.visit-copy,.visit-order,.footer-line'))window.chapterCalls.push({className:this.className,delay:options.delay,frames});return animate.call(this,frames,options)}});
  await page.goto('http://127.0.0.1:7903/?lang=zh');await page.evaluate(()=>document.fonts.ready);
  await page.waitForFunction(()=>document.querySelector('.food-item'));
  await page.locator('#featuredMenu img').evaluateAll(images=>Promise.all(images.map(img=>{img.loading='eager';return img.decode()})));
  await page.locator('#food').evaluate(e=>scrollTo({top:e.offsetTop-100,behavior:'instant'}));
  await page.waitForFunction(()=>document.querySelector('.food-item'));
  if(reducedMotion==='no-preference'){
   await page.waitForFunction(()=>window.chapterCalls.some(x=>x.className==='food-item'));
   const calls=await page.evaluate(()=>window.chapterCalls);
   assert.deepEqual(calls.filter(x=>x.className==='food-item').map(x=>x.delay),[0,85,170]);
   assert(calls.filter(x=>x.className==='food-item').every(x=>x.frames.every(f=>f.opacity===1)),'food stays opaque during movement');
   await page.evaluate(()=>{for(const a of document.getAnimations())if(a.effect.target.matches('.food-item,.section-intro h2')){a.pause();a.currentTime=320}});
   await page.screenshot({path:`${out}/food-entrance.png`});
   await page.evaluate(()=>{for(const a of document.getAnimations())if(a.effect.target.matches('.food-item,.section-intro h2'))a.finish()});
   const count=calls.length;
   await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   await page.locator('#food').evaluate(e=>scrollTo({top:e.offsetTop-100,behavior:'instant'}));
   await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   assert.equal(await page.evaluate(()=>window.chapterCalls.length),count,'chapter entrance plays only once');
   await page.locator('#space').scrollIntoViewIfNeeded();
   await page.waitForFunction(n=>window.chapterCalls.length>n,count);
   await page.evaluate(()=>document.body.dataset.motionPaused='true');
   await page.waitForFunction(()=>document.getAnimations().every(a=>!a.effect.target.matches('.space-heading h2')));
   const pausedCount=await page.evaluate(()=>window.chapterCalls.length);
   await page.locator('#visit').scrollIntoViewIfNeeded();await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   assert.equal(await page.evaluate(()=>window.chapterCalls.length),pausedCount,'paused later chapters remain static');
   report.push({reducedMotion,stagger:[0,85,170],pauseRevealsContent:true});
  }else{
   await page.locator('#space').scrollIntoViewIfNeeded();await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   assert.equal(await page.evaluate(()=>window.chapterCalls.length),0);report.push({reducedMotion,noEntrances:true});
  }
  await page.close();
 }
}finally{await browser.close()}
await writeFile(`${out}/report.json`,JSON.stringify({engine,report},null,2));console.log(JSON.stringify({engine,passed:true}));
