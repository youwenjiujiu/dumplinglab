import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
const engine=process.argv.includes('--webkit')?'webkit':'chrome';
const browser=await(engine==='webkit'?webkit.launch({headless:true}):chromium.launch({channel:'chrome',headless:true}));
const report=[];
try{
 for(const width of [390,1440])for(const reducedMotion of ['no-preference','reduce']){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion});
  await page.addInitScript(()=>{window.footerCalls=0;const original=Element.prototype.animate;Element.prototype.animate=function(...args){if(this.classList.contains('footer-mark'))window.footerCalls++;return original.apply(this,args)}});
  await page.goto('http://127.0.0.1:7903/?lang=zh');await page.evaluate(()=>document.fonts.ready);
  await page.locator('.visit-front img').evaluate(img=>{img.loading='eager';return img.decode()});
  await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
  if(reducedMotion==='no-preference'){
   await page.waitForFunction(()=>window.footerCalls===1);
   await page.evaluate(()=>{for(const a of document.getAnimations())if(a.effect.target.classList.contains('footer-mark')){a.pause();a.currentTime=300}});
   await page.screenshot({path:`${out}/${width}-reveal.png`});
   await page.evaluate(()=>document.body.dataset.motionPaused='true');
   await page.waitForFunction(()=>getComputedStyle(document.querySelector('.footer-mark')).clipPath==='none');
   await page.evaluate(()=>{document.body.dataset.motionPaused='false';scrollTo({top:0,behavior:'instant'})});
   await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
   await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));assert.equal(await page.evaluate(()=>window.footerCalls),1);
  }else{
   await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));assert.equal(await page.evaluate(()=>window.footerCalls),0);
  }
  assert.equal(await page.locator('.footer-mark').evaluate(e=>getComputedStyle(e).clipPath),'none');
  report.push({width,reducedMotion,onceOnly:true,staticContentVisible:true});await page.close();
 }
}finally{await browser.close()}
await writeFile(`${out}/report.json`,JSON.stringify({engine,cases:report},null,2));console.log(JSON.stringify({engine,passed:report.length}));
