import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const out='output/website-pick-dumpling-v2';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
const url='http://127.0.0.1:7903/#play';
const pauseAt=(p,time)=>p.locator('#pickScene').evaluate((x,t)=>x.getAnimations({subtree:true}).forEach(a=>{a.pause();a.currentTime=t}),time);
const finish=p=>p.locator('#pickScene').evaluate(x=>x.getAnimations({subtree:true}).forEach(a=>a.finish()));
try{
 for(const width of [1440,390,320]){
  const p=await browser.newPage({viewport:{width,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(url);await p.locator('#play').scrollIntoViewIfNeeded();
  await p.waitForFunction(()=>document.querySelector('#pickScene').dataset.state==='ready');
  assert.deepEqual(await p.locator('.brand-chapters>section').evaluateAll(xs=>xs.map(x=>x.id)),['food','film','space','visit','play']);
  assert.equal(await p.locator('#film .kitchen-grid img').count(),4);
  assert.equal(await p.locator('#pickReplay').isVisible(),false);
  await p.locator('#play').screenshot({path:out+'/'+width+'-idle.png'});
  const piece=p.locator('.pick-piece').first(),before=await piece.boundingBox(),layoutBefore=await p.locator('#play').boundingBox();
  await piece.click();await pauseAt(p,2100);
  await p.locator('.pick-piece').nth(2).evaluate(x=>x.click());
  assert.equal(await p.locator('.is-picked').count(),1,'Rapid clicks cannot start a second bite');
  await p.locator('#play').screenshot({path:out+'/'+width+'-dip.png'});
  await pauseAt(p,3500);
  const offered=await piece.boundingBox();
  assert(offered.width>before.width*2.5,'Dumpling approaches the viewer, instead of returning to plate');
  assert(await piece.evaluate(x=>Number(getComputedStyle(x).zIndex)>Number(getComputedStyle(document.querySelector('.pick-sauce-lip')).zIndex)),'Offered dumpling is in front of the sauce dish');
  await p.locator('#play').screenshot({path:out+'/'+width+'-offered.png'});
  await finish(p);
  await p.waitForFunction(()=>document.querySelectorAll('.pick-piece[hidden]').length===1);
  assert.equal(await p.locator('.pick-piece:not([hidden])').count(),7);
  assert.equal(await p.locator('.is-picked').count(),0);
  assert.match(await p.locator('#pickStatus').textContent(),/for you/);
  assert.equal(await p.locator('#pickReplay').isVisible(),false);
  assert(await p.locator('.pick-piece').nth(1).evaluate(x=>x===document.activeElement),'Focus moves to an uneaten dumpling');
  await p.keyboard.press('Enter');await pauseAt(p,900);await p.keyboard.press('Escape');
  assert.equal(await p.locator('#pickScene').getAttribute('data-state'),'ready');
  assert.equal(await p.locator('.pick-piece:not([hidden])').count(),7,'Cancel does not eat another dumpling');
  // Eat each remaining piece; preserve page layout and offer replay only at empty.
  for(let i=0;i<7;i++){
   await p.locator('.pick-piece:not([hidden])').first().click();await finish(p);
   await p.waitForFunction(n=>document.querySelectorAll('.pick-piece:not([hidden])').length===n,6-i);
  }
  assert.equal(await p.locator('#pickScene').getAttribute('data-state'),'empty');
  assert(await p.locator('#pickReplay').isVisible());
  assert(await p.locator('#pickReplay').evaluate(x=>x===document.activeElement));
  const layoutAfter=await p.locator('#play').boundingBox();
  assert(Math.abs(layoutBefore.height-layoutAfter.height)<2,'No layout jump when the plate empties');
  await p.locator('#play').screenshot({path:out+'/'+width+'-empty.png'});
  await p.locator('#pickReplay').click();
  assert.equal(await p.locator('.pick-piece:not([hidden])').count(),8);
  assert.equal(await p.locator('#pickReplay').isVisible(),false);
  assert.equal(await p.locator('#pickScene').getAttribute('data-state'),'ready');
  assert.equal(await p.locator('dl-storefront-sketch').count(),0);
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.deepEqual(errors,[]);await p.close();
  console.log(width+': dip -> viewer -> consumed, no return; cancel, focus, empty/replay, layout pass');
 }
 const p=await browser.newPage({viewport:{width:390,height:900},reducedMotion:'reduce'});
 await p.goto(url);await p.locator('#play').scrollIntoViewIfNeeded();
 await p.waitForFunction(()=>document.querySelector('#pickScene').dataset.state==='ready');
 for(let i=0;i<8;i++)await p.locator('.pick-piece:not([hidden])').first().click();
 assert.equal(await p.locator('#pickScene').getAttribute('data-state'),'empty');
 assert.equal(await p.locator('#pickScene').evaluate(x=>x.getAnimations({subtree:true}).length),0);
 await p.locator('#pickReplay').click();assert.equal(await p.locator('.pick-piece:not([hidden])').count(),8);
 console.log('Reduced motion: each bite is consumed without travel, replay works');
}finally{await browser.close()}
