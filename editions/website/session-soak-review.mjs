// Repeated local interaction with fresh browser state. GC-normalized counters
// are diagnostic retained-state samples, not total GPU/browser memory usage.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'}),rows=[];
try{
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:3});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');
 await page.goto('http://127.0.0.1:7903/?lang=zh');await page.evaluate(()=>document.fonts.ready);
 async function select(scene){
  await page.locator(`[data-course-index="${scene}"]`).click();
  await page.waitForFunction(i=>document.querySelector(`[data-course-index="${i}"]`).getAttribute('aria-pressed')==='true',scene);
  await page.waitForFunction(()=>document.getAnimations().filter(a=>a.effect?.target?.id==='stageImage').every(a=>a.playState==='finished'));
 }
 for(const scene of [1,2,0])await select(scene);
 async function sample(round){
  await cdp.send('HeapProfiler.collectGarbage');
  const counters=await cdp.send('Memory.getDOMCounters'),metrics=await cdp.send('Performance.getMetrics');
  const row={round,...counters,heapUsed:metrics.metrics.find(m=>m.name==='JSHeapUsedSize')?.value,ghosts:await page.locator('.dish-ghost').count()};
  assert.equal(row.ghosts,0);rows.push(row);console.log(JSON.stringify(row));
 }
 await sample(0);
 for(let round=1;round<=5;round++){
  for(let cycle=0;cycle<4;cycle++)for(const scene of [1,2,0])await select(scene);
  await page.locator('#language').click();
  await page.locator('#navToggle').click();await page.locator('#navToggle').click();
  await page.evaluate(()=>{const story=document.querySelector('#cinema'),stage=document.querySelector('#productStage');scrollTo({top:story.offsetTop-document.querySelector('.site-header').offsetHeight+(story.offsetHeight-stage.offsetHeight)*.65,behavior:'instant'})});
  await page.waitForFunction(()=>+getComputedStyle(document.querySelector('#productStage')).getPropertyValue('--detail-opacity')>.99);
  await page.locator('.logo').click();await page.waitForFunction(()=>scrollY<2);
  await sample(round);
 }
 assert.deepEqual(errors,[]);
 // Detached temporary transition nodes may lag a GC cycle. Sustained growth
 // beyond a small fixed allowance is a regression worth investigating.
 assert(rows.at(-1).nodes<=rows[1].nodes+30,'Retained DOM must not grow with every scene switch');
 assert(rows.at(-1).jsEventListeners<=rows[1].jsEventListeners+10,'Listeners must not accumulate per switch');
}finally{await browser.close()}
await writeFile(out+'/report.json',JSON.stringify({selectionChanges:63,rows,scope:'Local Chromium, GC-normalized DOM/JS counters; excludes GPU memory',productionWrites:0},null,2));
