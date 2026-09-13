import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
const browser=await(process.argv.includes('--webkit')?webkit.launch({headless:true}):chromium.launch({channel:'chrome',headless:true}));
const report=[];
try{
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900}});
  await page.goto('http://127.0.0.1:7903/?lang=zh');await page.evaluate(async()=>{await document.fonts.ready;await document.querySelector('#stageImage').decode()});
  for(const progress of [.15,.25,.35,.45,.6]){
   await page.evaluate(p=>{const e=document.querySelector('#cinema');scrollTo({top:e.offsetTop-document.querySelector('.site-header').offsetHeight+(e.offsetHeight-document.querySelector('#productStage').offsetHeight)*p,behavior:'instant'})},progress);
   await page.waitForFunction(p=>Math.abs(new DOMMatrixReadOnly(getComputedStyle(document.querySelector('#storyProgress')).transform).a-p)<.002,progress);
   const state=await page.locator('#productStage').evaluate(e=>{const s=getComputedStyle(e);return {intro:+s.getPropertyValue('--intro-opacity'),detail:+s.getPropertyValue('--detail-opacity'),detailInteractive:!document.querySelector('#stageDetail').inert,overflow:document.documentElement.scrollWidth>innerWidth}});
   assert(!state.overflow);assert.equal(state.detailInteractive,state.detail>=.9);
   await page.screenshot({path:`${out}/${width}-${progress}.png`});report.push({width,progress,...state});
  }
  await page.close();
 }
}finally{await browser.close()}
await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({frames:report.length}));
