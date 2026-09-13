// Compare normal-type geometry with the last accepted pre-large-type stylesheet.
import {chromium,webkit} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const [out,baseline]=process.argv.slice(2);assert(out&&baseline);await mkdir(out,{recursive:true});
const css=await readFile(resolve(baseline,'site/campaign.css'),'utf8');
const engine=process.argv.includes('--webkit')?'webkit':'chrome';
const browser=await(engine==='webkit'?webkit.launch():chromium.launch({channel:'chrome'})),rows=[];
try{
 for(const width of [1440,1920,2560])for(const height of [760,780,800,900,1080,1440]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  await page.goto('http://127.0.0.1:7903/?lang=zh');await page.evaluate(()=>document.fonts.ready);
  const read=()=>page.locator('#productStage,#stageProduct,#stageCaption').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return[r.x,r.y,r.width,r.height]}));
  const current=await read();
  // Later identical rules win over current rules; reset only the new minimum.
  await page.addStyleTag({content:css+'\n.product-stage{min-height:max(680px,35rem)}'});
  const previous=await read();assert.deepEqual(current,previous,width+'x'+height);
  rows.push({width,height,unchanged:true});await page.close();
 }
}finally{await browser.close()}
await writeFile(out+'/report.json',JSON.stringify({engine,baseline,rows},null,2));console.log(JSON.stringify({engine,normalGeometryUnchanged:true,cases:rows.length}));
