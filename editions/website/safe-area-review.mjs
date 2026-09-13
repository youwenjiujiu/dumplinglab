// Simulated CSS safe-area values, not a claim of physical iPhone testing.
import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
const engine=process.argv.includes('--webkit')?'webkit':'chrome';
const browser=await(engine==='webkit'?webkit.launch({headless:true}):chromium.launch({channel:'chrome',headless:true}));
const report=[];
try{
 for(const [width,height,safe] of [[390,844,{top:47,bottom:34,left:0,right:0}],[844,390,{top:0,bottom:21,left:47,right:47}],[320,568,{top:20,bottom:0,left:0,right:0}]])for(const lang of ['zh','en']){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  await page.goto('http://127.0.0.1:7903/?lang='+lang);
  await page.evaluate(s=>{for(const [key,value]of Object.entries(s))document.documentElement.style.setProperty('--safe-'+key,value+'px')},safe);
  await page.evaluate(async()=>{await document.fonts.ready;await document.querySelector('#stageImage').decode();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))});
  const geometry=await page.evaluate(()=>{
   const box=s=>{const r=document.querySelector(s).getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom}};
   return{logo:box('.logo'),actions:box('.header-actions'),title:box('.stage-title'),caption:box('#stageCaption'),cta:box('.stage-order'),choices:box('#courseChoices'),motion:box('#motionToggle'),previous:box('#previousCourse'),next:box('#nextCourse'),overflow:document.documentElement.scrollWidth>innerWidth};
  });
  assert(!geometry.overflow);
  for(const [key,r]of Object.entries(geometry))if(typeof r==='object'){
   assert(r.x>=safe.left-1&&r.right<=width-safe.right+1,`${width}/${lang}/${key}: notch intrusion`);
   assert(r.bottom<=height-safe.bottom+1,`${width}/${lang}/${key}: bottom inset intrusion`);
  }
  assert(geometry.logo.y>=safe.top);
  assert(geometry.cta.bottom<=Math.min(geometry.choices.y,geometry.motion.y),`${width}/${lang}: CTA/control collision`);
  if(width>760)assert(geometry.title.bottom+12<=geometry.caption.y,`${width}/${lang}: title/caption collision`);
  await page.screenshot({path:`${out}/${width}-${lang}.png`});report.push({width,height,lang,safe,geometry});await page.close();
 }
}finally{await browser.close()}
await writeFile(`${out}/report.json`,JSON.stringify({engine,simulatedInsets:true,cases:report},null,2));console.log(JSON.stringify({engine,passed:true,cases:report.length}));
