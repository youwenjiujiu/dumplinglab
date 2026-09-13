import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
const engine=process.argv.includes('--webkit')?'webkit':'chrome';
const browser=await(engine==='webkit'?webkit.launch({headless:true}):chromium.launch({channel:'chrome',headless:true}));
const report=[];
try{
 for(const [width,height] of [[1440,900],[1920,1080],[2560,1440],[1200,900],[1440,750],[390,844]])for(const lang of ['zh','en']){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
  const page=await context.newPage(),requests=[];
  page.on('request',r=>{if(r.url().includes('ingredient-chilli'))requests.push(r.url())});
  await page.goto(`http://127.0.0.1:7903/?lang=${lang}`);await page.evaluate(()=>document.fonts.ready);
  assert.equal(requests.length,0,'Opening scene must not fetch a chilli decoration');
  await page.locator('[data-course-index="1"]').click();await page.waitForFunction(()=>document.querySelector('#productStage').dataset.course==='chilli');
  const expected=width>1200&&height>750;
  const detail=await page.locator('#flavorTag1').evaluate(e=>{
   const p=getComputedStyle(e,'::before'),r=e.getBoundingClientRect();
   return {content:p.content,background:p.backgroundImage,x:r.x,y:r.y,width:r.width,height:r.height,overflow:document.documentElement.scrollWidth>innerWidth};
  });
  assert.equal(detail.content==='""',expected);assert(!detail.overflow);
  if(expected){
   await page.evaluate(async()=>{const i=new Image();i.src='/site/media/ingredient-chilli-v1.webp';await i.decode()});
   assert(detail.x>100&&detail.y>100,'Badge stays within scene margins');
   await page.screenshot({path:`${out}/${width}-${lang}.png`});
  }else assert.equal(requests.length,0,'Compact layout must not download unused accent');
  await page.locator('[data-course-index="2"]').click();await page.waitForFunction(()=>document.querySelector('#productStage').dataset.course==='broth');
  assert.notEqual(await page.locator('#flavorTag1').evaluate(e=>getComputedStyle(e,'::before').content),'""');
  report.push({width,height,lang,accent:expected});await context.close();
 }
 await writeFile(`${out}/report.json`,JSON.stringify({engine,cases:report},null,2));
}finally{await browser.close()}
console.log(JSON.stringify({engine,passed:report.length}));
