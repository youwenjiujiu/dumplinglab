import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const out='output/website-kitchen-process-v1';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
try{for(const width of [1440,390,320]){
 const page=await browser.newPage({viewport:{width,height:1000}}),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 await page.goto('http://127.0.0.1:7903/?lang=zh',{waitUntil:'networkidle'});
 await page.locator('#nextCourse').click();
 await page.waitForFunction(()=>document.querySelector('#stageWord').textContent.includes('WONTONS'));
 await page.locator('#film').scrollIntoViewIfNeeded();
 await page.locator('.kitchen-grid img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
 assert.equal(await page.locator('.kitchen-grid img').count(),4);
 assert.equal(await page.locator('#brandFilm,#filmToggle').count(),0);
 assert.equal(await page.locator('#filmTitle').innerText(),'In the kitchen.');
 assert.equal(await page.locator('html').getAttribute('lang'),'en');
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.locator('#film').screenshot({path:`${out}/${width}.png`});
 await page.setViewportSize({width:width===1440?390:1440,height:1000});
 await page.waitForTimeout(100);
 assert.deepEqual(errors,[]);assert(!requests.some(u=>/boiled-film-|boiled-sharing-v1/.test(u)));
 console.log(width+': four images, no old film, Hero switch and resize passed');
 await page.close();
}}finally{await browser.close()}
