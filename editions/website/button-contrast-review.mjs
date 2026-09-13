import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
const engine=process.argv.includes('--webkit')?'webkit':'chrome';
const browser=await(engine==='webkit'?webkit.launch({headless:true}):chromium.launch({channel:'chrome',headless:true}));
const report=[];
const luminance=color=>{const rgb=color.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722};
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
 await page.goto('http://127.0.0.1:7903/?lang=zh');
 for(const scene of [0,1,2]){
  await page.locator(`[data-course-index="${scene}"]`).click();await page.waitForFunction(i=>document.querySelector(`[data-course-index="${i}"]`).getAttribute('aria-pressed')==='true',scene);
  for(const selector of ['.site-header .order-link','.stage-order'])for(const state of ['normal','hover','focus']){
   const button=page.locator(selector);await page.mouse.move(1,1);
   if(state==='hover')await button.hover();if(state==='focus')await button.focus();
   const colors=await button.evaluate(e=>{const s=getComputedStyle(e);return {color:s.color,background:s.backgroundColor}});
   const a=luminance(colors.color),b=luminance(colors.background),contrast=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
   assert(contrast>=4.5,`${scene}/${selector}/${state}: ${contrast}`);report.push({scene,selector,state,contrast,...colors});
  }
 }
}finally{await browser.close()}
await writeFile(`${out}/report.json`,JSON.stringify({engine,cases:report},null,2));console.log(JSON.stringify({engine,passed:report.length,minimumContrast:Math.min(...report.map(r=>r.contrast))}));
