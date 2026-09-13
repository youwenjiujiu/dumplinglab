import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
const engine=process.argv.includes('--webkit')?'webkit':'chrome';
const browser=await(engine==='webkit'?webkit.launch({headless:true}):chromium.launch({channel:'chrome',headless:true}));
const report=[];
try{
 for(const width of [768,820,1024,1200,1201,1280,1440])for(const size of [100,200])for(const lang of ['zh','en']){
  const height=width===1024?390:900,page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  await page.goto('http://127.0.0.1:7903/?lang='+lang);await page.evaluate(s=>document.documentElement.style.fontSize=s+'%',size);await page.evaluate(()=>document.fonts.ready);
  const boxes=await page.locator('.logo,#mainNav,.header-actions').evaluateAll(es=>es.map(e=>({visible:e.checkVisibility(),...e.getBoundingClientRect().toJSON()})));
  const [logo,nav,actions]=boxes;assert(actions.left>=logo.right,`${width}/${size}/${lang}: logo/actions collision`);
  if(nav.visible)assert(nav.left>=logo.right&&nav.right<=actions.left,`${width}/${size}/${lang}: desktop navigation collision`);
  else{
   await page.locator('#navToggle').click();const open=await page.locator('#mainNav').boundingBox();assert(open.x>=0&&open.x+open.width<=width&&open.y+open.height<=height+1,`${width}/${size}/${lang}: clipped drawer`);
   await page.keyboard.press('Escape');assert.equal(await page.locator('#mainNav').isVisible(),false);
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  report.push({width,height,size,lang,boxes});await page.close();
 }
}finally{await browser.close()}
await writeFile(`${out}/report.json`,JSON.stringify({engine,report},null,2));console.log(JSON.stringify({engine,passed:true,cases:report.length}));
