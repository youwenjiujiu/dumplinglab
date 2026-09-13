// Whole-page typography review: the hero alone cannot establish a polished site.
import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
const browser=await(process.argv.includes('--webkit')?webkit.launch({headless:true}):chromium.launch({channel:'chrome',headless:true}));
const report=[];
try{
 for(const width of [1440,390,320])for(const lang of ['zh','en'])for(const size of [100,200]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
  await page.goto('http://127.0.0.1:7903/?lang='+lang);await page.evaluate(size=>document.documentElement.style.fontSize=size+'%',size);await page.evaluate(()=>document.fonts.ready);await page.locator('.logo img').evaluate(e=>e.decode());
  for(const id of ['film','food','space','visit']){
   await page.locator('#'+id).evaluate(e=>scrollTo({top:e.offsetTop-document.querySelector('.site-header').offsetHeight,behavior:'instant'}));
   await page.locator('#'+id+' img').evaluateAll(images=>Promise.all(images.filter(e=>e.getBoundingClientRect().width>0).map(e=>e.decode().catch(()=>{}))));
   const state=await page.evaluate(id=>{
    const box=s=>document.querySelector(s).getBoundingClientRect().toJSON();
    const heading=box('.space-heading'),copy=box('.space-copy');
    return {id,overflow:document.documentElement.scrollWidth>innerWidth+1,heading,copy,spaceCopyCollision:heading.right>copy.left&&heading.left<copy.right&&heading.bottom>copy.top&&heading.top<copy.bottom};
   },id);
   await page.screenshot({path:`${out}/${width}-${lang}-${size}-${id}.png`});report.push({width,lang,size,...state});
   assert(!state.overflow,`${width}/${lang}/${size}/${id}: page overflow`);
  }
  await page.close();
 }
}finally{await browser.close()}
await writeFile(out+'/report.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({cases:report.length,overlapCases:report.filter(s=>s.id==='space'&&s.spaceCopyCollision).map(s=>({width:s.width,lang:s.lang,size:s.size})),evidence:out}));
