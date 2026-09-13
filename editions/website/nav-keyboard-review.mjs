import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
const engine=process.argv.includes('--webkit')?'webkit':'chrome';
const browser=await(engine==='webkit'?webkit.launch({headless:true}):chromium.launch({channel:'chrome',headless:true}));
const report=[];
try{
 for(const [width,height,size] of [[390,844,100],[820,1180,100],[1024,390,200]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  await page.goto('http://127.0.0.1:7903/?lang=zh');await page.evaluate(s=>document.documentElement.style.fontSize=s+'%',size);await page.evaluate(()=>document.fonts.ready);
  await page.locator('#navToggle').focus();await page.keyboard.press('Enter');
  assert(await page.locator('#mainNav a').nth(0).evaluate(e=>e===document.activeElement));
  for(let i=1;i<3;i++){await page.keyboard.press(engine==='webkit'?'Alt+Tab':'Tab');assert(await page.locator('#mainNav a').nth(i).evaluate(e=>e===document.activeElement))}
  await page.keyboard.press(engine==='webkit'?'Alt+Tab':'Tab');assert(await page.locator('#language').evaluate(e=>e===document.activeElement));assert.equal(await page.locator('#mainNav').isVisible(),false);
  await page.locator('#navToggle').focus();await page.keyboard.press('Enter');await page.keyboard.press('Escape');
  assert(await page.locator('#navToggle').evaluate(e=>e===document.activeElement));assert.equal(await page.locator('#mainNav').isVisible(),false);
  assert.equal(await page.evaluate(()=>scrollY),0);report.push({width,height,size,firstLinkFocused:true,tabLeavesAndCloses:true,escapeRestoresToggle:true,tabKey:engine==='webkit'?'Alt+Tab':'Tab'});await page.close();
 }
}finally{await browser.close()}
await writeFile(`${out}/report.json`,JSON.stringify({engine,cases:report},null,2));console.log(JSON.stringify({engine,passed:report.length}));
