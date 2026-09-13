import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
const engine=process.argv.includes('--webkit')?'webkit':'chrome';
const browser=await(engine==='webkit'?webkit.launch({headless:true}):chromium.launch({channel:'chrome',headless:true}));
const report=[];
try{
 for(const width of [320,390,1440,2560])for(const lang of ['zh','en'])for(const enlarged of [false,true]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
  await page.goto(`http://127.0.0.1:7903/?lang=${lang}`);if(enlarged)await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  await page.evaluate(()=>document.fonts.ready);await page.locator('.visit-front img').scrollIntoViewIfNeeded();await page.locator('.visit-front img').evaluate(img=>img.decode());
  await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
  const state=await page.locator('.site-footer').evaluate(e=>{
   const mark=e.querySelector('.footer-mark'),r=new Range();r.selectNodeContents(mark);const text=r.getBoundingClientRect(),box=mark.getBoundingClientRect();
   return {overflow:document.documentElement.scrollWidth>innerWidth,markFits:text.left>=box.left-1&&text.right<=box.right+1,bottomGap:e.getBoundingClientRect().bottom-e.querySelector('.footer-bottom').getBoundingClientRect().bottom,height:e.offsetHeight};
  });
  assert(!state.overflow&&state.markFits,`${width}/${lang}/${enlarged}: brand word line overflows`);assert(state.bottomGap<=21,'No empty trailing footer panel');
  if(!enlarged&&lang==='zh')await page.screenshot({path:`${out}/${width}.png`});
  report.push({width,lang,enlarged,...state});await page.close();
 }
 const fallback=await browser.newPage({viewport:{width:320,height:900},reducedMotion:'reduce'});
 await fallback.route('**/LilitaOne-Regular.woff2',r=>r.abort());await fallback.goto('http://127.0.0.1:7903/');await fallback.evaluate(()=>document.fonts.ready);
 assert(await fallback.locator('.footer-mark').evaluate(e=>{const r=new Range();r.selectNodeContents(e);const b=r.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth}),'Fallback font must not overflow');
 await fallback.close();
}finally{await browser.close()}
await writeFile(`${out}/report.json`,JSON.stringify({engine,cases:report,fontFallback:true},null,2));console.log(JSON.stringify({engine,passed:report.length}));
