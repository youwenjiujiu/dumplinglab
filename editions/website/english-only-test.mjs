import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
const out='output/website-english-only-v1';
await mkdir(out,{recursive:true});
// Text-only changes must not touch the approved Hero's motion or styling.
for(const file of ['stage.js','campaign.css'])assert.equal(await readFile(`editions/website/${file}`,'utf8'),await readFile(`${out}/${file}`,'utf8'));
const browser=await chromium.launch({channel:'chrome'}),results=[];
try{
 for(const variant of [
  {name:'desktop-old-zh-link',width:1440,height:1000,query:'?lang=zh'},
  {name:'mobile-saved-zh',width:390,height:844,query:''},
  {name:'small-reduced',width:320,height:740,query:'?lang=xx',reduced:true},
  {name:'no-js',width:390,height:844,query:'?lang=zh',noJS:true}
 ]){
  const context=await browser.newContext({viewport:{width:variant.width,height:variant.height},javaScriptEnabled:!variant.noJS,reducedMotion:variant.reduced?'reduce':'no-preference'});
  await context.addInitScript(()=>localStorage.setItem('atelier-language','zh'));
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:7903/'+variant.query,{waitUntil:'networkidle'});
  await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('html').getAttribute('lang'),'en');
  assert.equal(await page.locator('#language,.site-footer,.footer-mark,#filmToggle').count(),0);
  assert.doesNotMatch(await page.locator('body').innerText(),/[\u3400-\u9fff]/);
  assert.equal(await page.locator('#foodTitle').innerText(),'On the menu.');
  assert.equal((await page.locator('#spaceTitle').innerText()).replace(/\s+/g,' '),'Pull up a chair.');
  assert.equal(await page.locator('.space-copy p').innerText(),'Come for a bowl. Stay for a while.');
  assert.equal(await page.locator('#visitTitle').innerText(),'Visit us.');
  assert.equal(await page.locator('.visit-front figcaption').count(),0);
  assert.equal((await page.locator('body').innerText()).match(/49 Circular Road/g)?.length,1);
  assert.equal(await page.locator('main > section:last-child').getAttribute('id'),'visit');
  if(!variant.noJS){
   assert.equal(await page.evaluate(()=>localStorage.getItem('atelier-language')),'zh');
   assert.equal(await page.locator('.food-item').count(),3);
   await page.locator('#nextCourse').click();
   await page.waitForFunction(()=>document.querySelector('#stageWord').textContent.includes('WONTONS'));
   assert.doesNotMatch(await page.locator('#cinema').innerText(),/[\u3400-\u9fff]/);
   await page.locator('#filmScreen').scrollIntoViewIfNeeded();
   if(!variant.reduced)await page.waitForFunction(()=>!document.querySelector('#brandFilm').paused);
  }
  await page.locator('#space').scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await page.screenshot({path:`${out}/${variant.name}-space.png`});
  await page.evaluate(()=>scrollTo(0,document.body.scrollHeight));
  await page.waitForTimeout(800);
  await page.screenshot({path:`${out}/${variant.name}-end.png`});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.deepEqual(errors,[]);
  results.push({name:variant.name,ok:true});await context.close();
 }
 await writeFile(`${out}/checks.json`,JSON.stringify(results,null,2));
 console.log(JSON.stringify(results,null,2));
}finally{await browser.close()}
