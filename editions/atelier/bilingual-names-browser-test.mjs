import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {launchBrowser} from './browser-test-runtime.mjs';
const browser=await launchBrowser();const out=new URL('test-output/bilingual-names/',import.meta.url);await mkdir(out,{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});await page.goto('http://127.0.0.1:7898/?lang=zh');await page.locator('[data-fulfilment="takeaway"]').click();
 const card=page.locator('[data-recommendation="chive-fried"].dish-open');
 for(const width of [390,1280]){
  await page.setViewportSize({width,height:900});
  for(const lang of ['zh','en']){
   if(await page.locator('html').getAttribute('lang')!==(lang==='zh'?'zh-CN':'en'))await page.locator('#languageButton').click();
   await card.locator('.dish-english').waitFor({state:'hidden'});
   const text=await card.innerText();assert.equal(text.includes('韭菜虾仁猪肉煎饺'),lang==='zh');assert.equal(text.includes('Potstickers'),lang==='en');
   await card.screenshot({path:new URL(`${lang}-${width}.png`,out).pathname});
  }
 }
 console.log('PASS separate Chinese and English dish names at 390px and 1280px.');
}finally{await browser.close()}
