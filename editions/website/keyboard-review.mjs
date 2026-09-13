import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
const browser=await(process.argv.includes('--webkit')?webkit.launch({headless:true}):chromium.launch({channel:'chrome',headless:true}));
// Default macOS WebKit reserves plain Tab for form controls. Option/Alt+Tab
// includes links, matching Safari's native keyboard-navigation preference.
const tabKey=process.argv.includes('--webkit')?'Alt+Tab':'Tab';
const report=[];
try{
 for(const [width,js] of [[1440,true],[390,true],[390,false]]){
  const page=await browser.newPage({viewport:{width,height:900},javaScriptEnabled:js,reducedMotion:'reduce'});
  await page.goto('http://127.0.0.1:7903/?lang=zh');await page.keyboard.press(tabKey);
  assert.equal(await page.locator('.skip').evaluate(e=>e===document.activeElement),true);
  assert.equal(await page.locator('.skip').textContent(),js?'跳转到正文':'Skip to content');
  await page.screenshot({path:`${out}/${width}-${js}-skip.png`});await page.keyboard.press('Enter');
  assert.equal(await page.locator('#main').evaluate(e=>e===document.activeElement),true);
  await page.keyboard.press(tabKey);assert.equal(await page.locator('.stage-order').evaluate(e=>e===document.activeElement),true);
  const dead=await page.locator('a,button').evaluateAll(nodes=>nodes.filter(e=>e.getBoundingClientRect().width&&getComputedStyle(e).visibility!=='hidden'&&!e.closest('[inert]')&&!e.textContent.trim()&&!e.getAttribute('aria-label')&&!e.querySelector('img[alt]')).map(e=>e.outerHTML));assert.deepEqual(dead,[]);
  report.push({width,js,tabKey,skipFocus:true,nextFocusMainAction:true,unnamedVisibleControls:0});await page.close();
 }
}finally{await browser.close()}
await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:true,cases:report.length,evidence:out}));
