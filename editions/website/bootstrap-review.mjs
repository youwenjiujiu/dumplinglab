import {chromium,webkit} from 'playwright';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {catalogueBootstrap} from './catalogue-bootstrap.mjs';
const original=vm.createContext({}),snapshot=vm.createContext({});
for(const path of ['menu-data.js','lunch-archive.js','lunch-menu.js','brand/menu-appetite-v1.js'])vm.runInContext(await readFile('web/'+path,'utf8'),original);
const code=await catalogueBootstrap('web');vm.runInContext(code,snapshot);
assert.equal(snapshot.MENU.length,original.MENU.length);
for(const dish of snapshot.MENU)for(const [key,value] of Object.entries(dish))assert.equal(value,original.MENU.find(d=>d.id===dish.id)[key]);
assert.equal(JSON.stringify(snapshot.LUNCH_RECOMMENDATIONS),JSON.stringify(original.LUNCH_RECOMMENDATIONS));
for(const recommendation of snapshot.LUNCH_RECOMMENDATIONS)assert.equal(snapshot.DL_MENU_ART[recommendation.img],original.DL_MENU_ART[recommendation.img]);
assert.equal(snapshot.LUNCH_NOODLE_EXTRA,original.LUNCH_NOODLE_EXTRA);
const engine=process.argv.includes('--webkit')?'webkit':'chrome';
const browser=await(engine==='webkit'?webkit.launch():chromium.launch({channel:'chrome'}));
const cases=[];
try{
 for(const lang of ['zh','en'])for(const offline of [true,false]){
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'}),requests=[],errors=[];
  page.on('request',r=>requests.push(new URL(r.url()).pathname));page.on('pageerror',e=>errors.push(e.message));
  if(offline)await page.route('**/api/catalog',r=>r.abort());
  await page.goto('http://127.0.0.1:7903/?lang='+lang);
  await page.waitForFunction(()=>document.querySelectorAll('.food-item').length===3);
  await page.locator('#stageImage').evaluate(img=>img.decode());
  assert.equal(await page.locator('#productStage').getAttribute('data-course'),'fried');
  assert.equal(await page.locator('#featuredMenu').innerText().then(s=>s.includes('S$10.20')),true);
  assert.equal(requests.some(path=>/^\/(menu-data|lunch-archive|lunch-menu)\.js$/.test(path)),false);
  assert.equal(requests.includes('/site/catalogue-bootstrap.js'),true);
  if(offline)await page.waitForFunction(()=>document.querySelector('#catalogStatus').hidden===false);
  assert.deepEqual(errors,[]);cases.push({lang,offline,menu:true,hero:true,legacyRequests:0});await page.close();
 }
}finally{await browser.close()}
console.log(JSON.stringify({engine,bytes:Buffer.byteLength(code),exactDisplayData:true,cases},null,2));
