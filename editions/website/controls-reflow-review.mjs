import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
const engine=process.argv.includes('--webkit')?'webkit':'chrome';
const browser=await(engine==='webkit'?webkit.launch({headless:true}):chromium.launch({channel:'chrome',headless:true}));
const report=[];
try{
 for(const [width,height]of [[320,568],[320,844],[390,844],[320,1600]])for(const lang of ['zh','en'])for(const size of [100,200]){
  const page=await browser.newPage({viewport:{width,height}});
  await page.addInitScript(()=>localStorage.setItem('dumplinglab:motion','paused'));
  await page.goto(`http://127.0.0.1:7903/?lang=${lang}`);await page.evaluate(size=>document.documentElement.style.fontSize=size+'%',size);await page.evaluate(()=>document.fonts.ready);
  for(const scene of [0,1,2]){await page.locator(`[data-course-index="${scene}"]`).click();await page.waitForFunction(i=>document.querySelector(`[data-course-index="${i}"]`).getAttribute('aria-pressed')==='true',scene)}
  const geometry=await page.evaluate(()=>({buttons:[...document.querySelectorAll('#courseChoices button,#motionToggle')].map(e=>e.getBoundingClientRect().toJSON()),order:document.querySelector('.stage-order').getBoundingClientRect().toJSON()}));
  const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
  for(let i=0;i<geometry.buttons.length;i++){
   assert(!overlap(geometry.buttons[i],geometry.order),`${width}/${height}/${lang}/${size}: CTA collision`);
   for(let j=i+1;j<geometry.buttons.length;j++)assert(!overlap(geometry.buttons[i],geometry.buttons[j]),`${width}/${height}/${lang}/${size}: control collision`);
  }
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  if(width===320&&height===844&&lang==='en'&&size===200)await page.screenshot({path:`${out}/large-controls.png`});
  report.push({width,height,lang,size,clickableScenes:3,...geometry});await page.close();
 }
}finally{await browser.close()}
await writeFile(`${out}/report.json`,JSON.stringify({engine,cases:report},null,2));console.log(JSON.stringify({engine,passed:report.length}));
