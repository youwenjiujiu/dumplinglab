import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
const engine=process.argv.includes('--webkit')?'webkit':'chrome';
const browser=await(engine==='webkit'?webkit.launch({headless:true}):chromium.launch({channel:'chrome',headless:true}));
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});let pending;
 await page.route('**/hero-chilli-wontons-v1*.webp',route=>{pending=route});
 await page.goto('http://127.0.0.1:7903/?lang=zh');await page.locator('#stageImage').evaluate(e=>e.decode());
 await page.locator('#nextCourse').click();await page.waitForFunction(()=>document.querySelector('#courseControl').getAttribute('aria-busy')==='true');
 await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));await page.waitForFunction(()=>document.body.dataset.motionHidden==='true');
 while(!pending)await new Promise(setImmediate);await pending.continue();
 await page.waitForFunction(()=>document.body.dataset.course==='chilli');
 assert.equal(await page.locator('.dish-ghost').count(),0);
 assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.effect.target.id==='stageImage').length),0);
 await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.waitForFunction(()=>document.body.dataset.motionHidden==='false');await page.locator('#stageImage').evaluate(e=>e.decode());
 assert.equal(await page.locator('body').getAttribute('data-course'),'chilli');
 await writeFile(`${out}/report.json`,JSON.stringify({engine,selectionRetained:true,noOffscreenTransition:true,noOrphanGhost:true},null,2));
}finally{await browser.close()}
console.log(JSON.stringify({engine,passed:true}));
