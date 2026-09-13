import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
const browser=await(process.argv.includes('--webkit')?webkit.launch({headless:true}):chromium.launch({channel:'chrome',headless:true}));
const results=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 await page.goto('http://127.0.0.1:7903/?lang=zh');await page.locator('#stageImage').evaluate(e=>e.decode());
 await page.mouse.move(1400,550);
 await page.waitForFunction(()=>parseFloat(getComputedStyle(document.querySelector('#productStage')).getPropertyValue('--pointer-x'))>7);
 const tilted=await page.locator('.product-float').evaluate(e=>getComputedStyle(e).transform);assert.notEqual(tilted,'none');
 await page.mouse.move(20,30);
 await page.waitForFunction(()=>getComputedStyle(document.querySelector('#productStage')).getPropertyValue('--pointer-x')==='0px');
 await page.locator('#motionToggle').click();await page.mouse.move(1400,550);
 assert.equal(await page.locator('#productStage').evaluate(e=>getComputedStyle(e).getPropertyValue('--pointer-x')),'0px');
 results.push({pointerSettles:true,pointerReturnsToRest:true,pausedPointerStill:true});
 for(const id of ['food','space','visit']){
  await page.locator(`#mainNav a[href="#${id}"]`).click();
  await page.waitForFunction(id=>document.querySelector(`#mainNav a[href="#${id}"]`).getAttribute('aria-current')==='location',id);
  const top=await page.locator('#'+id).evaluate(e=>e.getBoundingClientRect().top);
  assert(top>=-1,`${id}: native navigation overshot section`);
  await page.screenshot({path:`${out}/nav-${id}.png`});
 }
 results.push({sectionLocation:true,nativeAnchors:true});
 await page.close();
 const phone=await browser.newPage({viewport:{width:390,height:844}});
 await phone.goto('http://127.0.0.1:7903/?lang=zh');await phone.locator('#navToggle').click();
 assert.equal(await phone.locator('#mainNav').getAttribute('data-open'),'true');
 await phone.locator('#language').click();assert.equal(await phone.locator('#navToggle').getAttribute('aria-expanded'),'false');
 await phone.locator('#navToggle').click();await phone.setViewportSize({width:844,height:390});
 await phone.waitForFunction(()=>document.querySelector('#navToggle').getAttribute('aria-expanded')==='false');
 await phone.setViewportSize({width:390,height:844});assert.equal(await phone.locator('#mainNav').isVisible(),false);
 results.push({mobileOutsideDismiss:true,rotationClearsMenuState:true});await phone.close();
}finally{await browser.close()}
await writeFile(out+'/report.json',JSON.stringify(results,null,2));console.log(JSON.stringify({passed:true,cases:results.length,evidence:out}));
