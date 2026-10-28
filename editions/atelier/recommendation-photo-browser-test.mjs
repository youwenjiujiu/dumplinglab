import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {launchBrowser} from './browser-test-runtime.mjs';
const catalog=await fetch('https://order.dumplinglab.sg/api/catalog').then(r=>r.json());
const browser=await launchBrowser();
const output=new URL('test-output/recommendation-photo/',import.meta.url);await mkdir(output,{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.route('**/api/catalog',r=>r.fulfill({json:catalog}));
 await page.route('**/api/catalog-image?*',async r=>{const response=await fetch('https://order.dumplinglab.sg'+new URL(r.request().url()).pathname+new URL(r.request().url()).search);await r.fulfill({status:response.status,body:Buffer.from(await response.arrayBuffer()),contentType:response.headers.get('content-type')});});
 await page.goto('http://127.0.0.1:7898/?lang=zh');
 await page.locator('[data-fulfilment="takeaway"]').click();
 await page.waitForFunction(()=>!document.querySelector('#sheet')?.classList.contains('open'));
 const card=page.locator('[data-recommendation="chive-fried"].dish-open');
 await card.waitFor();
 const expected=catalog.items.find(d=>d.id==='lunch-v10-pork-chive-shrimp-fried').imageUrl;
 await page.waitForFunction(expected=>document.querySelector('[data-recommendation="chive-fried"] img')?.getAttribute('src')===expected,expected);
 await card.locator('img').evaluate(img=>img.decode());
 assert.equal(await card.locator('img').getAttribute('src'),expected);
 await card.screenshot({path:new URL('phone.png',output).pathname});
 await page.setViewportSize({width:1280,height:900});await card.screenshot({path:new URL('desktop.png',output).pathname});
 console.log('PASS recommendation displays the actual merchant-uploaded potsticker image on mobile and desktop. Screenshots saved.');
}finally{await browser.close()}
