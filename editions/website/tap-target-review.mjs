import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
const engine=process.argv.includes('--webkit')?'webkit':'chrome';
const browser=await(engine==='webkit'?webkit.launch({headless:true}):chromium.launch({channel:'chrome',headless:true}));
const report=[];
try{
 for(const width of [320,390,760])for(const lang of ['zh','en']){
  const page=await browser.newPage({viewport:{width,height:844},reducedMotion:'reduce'});
  await page.goto('http://127.0.0.1:7903/?lang='+lang);await page.evaluate(()=>document.fonts.ready);
  const targets=await page.locator('.site-header button,.site-header .order-link,#courseControl button,#motionToggle,.stage-order').evaluateAll(es=>es.filter(e=>e.checkVisibility()).map(e=>{const r=e.getBoundingClientRect();return{id:e.id,label:e.textContent,x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}}));
  for(const t of targets){assert(t.w>=43.9&&t.h>=43.9,`${width}/${lang}/${t.id}: target too small`);assert(t.x>=0&&t.right<=width,`${width}/${lang}: clipped target`)}
  for(let i=0;i<targets.length;i++)for(let j=i+1;j<targets.length;j++){
   const a=targets[i],b=targets[j];assert(!(a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y),`${width}/${lang}: overlapping targets ${a.id}/${b.id}`);
  }
  await page.screenshot({path:`${out}/${width}-${lang}.png`});report.push({width,lang,targets});await page.close();
 }
 const page=await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:844}});await page.goto('http://127.0.0.1:7903/');assert.equal(await page.locator('#language').isVisible(),false);assert(await page.locator('.stage-order').isVisible());
}finally{await browser.close()}
await writeFile(`${out}/report.json`,JSON.stringify({engine,report},null,2));console.log(JSON.stringify({engine,passed:true,cases:report.length,noJsDeadLanguageRemoved:true}));
