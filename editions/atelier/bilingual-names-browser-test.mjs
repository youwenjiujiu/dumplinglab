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
   if(await page.locator('html').getAttribute('lang')!==lang)await page.locator('#languageButton').click();
   await card.locator('.dish-english').waitFor({state:'visible'});
   const text=await card.innerText();assert(text.includes('韭菜虾仁猪肉煎饺'));assert(text.includes('Potstickers'));
   await card.screenshot({path:new URL(`${lang}-${width}.png`,out).pathname});
  }
 }
 console.log('PASS bilingual names: Chinese/English both visible at 390px and 1280px; language switch keeps both names.');
}finally{await browser.close()}
