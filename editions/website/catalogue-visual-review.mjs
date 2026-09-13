// Mock GET responses exercise the real catalogue client's filtering. Only local
// reads; mocked state lives in the browser. No admin API or inventory writes.
import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
const browser=await(process.argv.includes('--webkit')?webkit.launch({headless:true}):chromium.launch({channel:'chrome',headless:true}));
const cases=[];
try{
 for(const [width,height] of [[1440,900],[390,844],[844,390]]){
  const page=await browser.newPage({viewport:{width,height}});let mode='empty',revision=100;
  await page.route('**/api/catalog',async route=>{
   const response=await route.fetch(),data=await response.json();
   const featured=['lunch-v2-pork-chive-shrimp','lunch-v4-red-oil-chaoshou','lunch-v2-century-egg-noodles'];
   data.revision+=revision++;
   data.items=data.items.filter(d=>mode!=='deleted'||!featured.includes(d.id)).map(d=>({...d,active:mode==='single'?d.id===featured[2]:mode!=='empty',soldOut:mode==='soldout'}));
   await route.fulfill({response,json:data});
  });
  await page.goto('http://127.0.0.1:7903/?lang=zh');await page.evaluate(()=>CatalogClient.ready);
  await page.locator('#stageImage').evaluate(e=>e.decode());await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('#courseControl').isVisible(),false);assert.equal(await page.locator('#cinema').getAttribute('data-enhanced'),'false');
  assert.equal(await page.locator('#stageProduct').evaluate(e=>getComputedStyle(e).transform),'none');assert.equal(await page.locator('.product-float').evaluate(e=>getComputedStyle(e).animationName),'none');
  assert.equal(await page.locator('.stage-order>span').first().textContent(),'查看菜单');
  await page.screenshot({path:`${out}/${width}-empty.png`});cases.push({width,emptyBrandScene:true,noFoodControls:true,noTiltedRoom:true});
  mode='soldout';await page.evaluate(()=>CatalogClient.refresh());
  await page.locator('#stageImage').evaluate(e=>e.decode());assert.match(await page.locator('#stageTaste').textContent(),/售罄/);assert(await page.locator('.food-stock').count()>0);
  await page.screenshot({path:`${out}/${width}-sold-out.png`});cases.push({width,soldOutStatusVisible:true});
  mode='normal';await page.evaluate(()=>CatalogClient.refresh());
  await page.locator('#stageImage').evaluate(e=>e.decode());assert.equal(await page.locator('#productStage').getAttribute('data-empty'),'false');assert.equal(await page.locator('.stage-order>span').first().textContent(),'现在开吃');cases.push({width,normalSceneRestored:true});
  if(width===390){
   await page.locator('#cinema').evaluate(e=>scrollTo({top:e.offsetTop+(e.offsetHeight-document.querySelector('#productStage').offsetHeight)*.65,behavior:'instant'}));
   await page.waitForFunction(()=>document.querySelector('#productStage').dataset.detail==='true');
  }
  await page.locator('[data-course-index="0"]').focus();const beforeFocusRecovery=await page.evaluate(()=>scrollY);
  mode='single';await page.evaluate(()=>CatalogClient.refresh());await page.locator('#stageImage').evaluate(e=>e.decode());
  assert.equal(await page.locator('#courseControl').isVisible(),false);assert.equal(await page.locator('body').getAttribute('data-course'),'broth');
  assert(await page.locator('.site-header .order-link').evaluate(e=>e===document.activeElement));
  assert(Math.abs(await page.evaluate(()=>scrollY)-beforeFocusRecovery)<2,'catalogue focus recovery does not scroll the page');
  await page.screenshot({path:`${out}/${width}-single.png`});cases.push({width,singleDishNoDeadCarousel:true,focusRecovered:true});
  mode='deleted';await page.evaluate(()=>CatalogClient.refresh());assert.equal(await page.locator('#productStage').getAttribute('data-empty'),'true');assert.equal(await page.locator('#courseControl').isVisible(),false);cases.push({width,deletedFeaturedItemsNotResurrected:true});
  await page.close();
 }
}finally{await browser.close()}
await writeFile(out+'/report.json',JSON.stringify(cases,null,2));console.log(JSON.stringify({passed:true,cases:cases.length,productionWrites:0,evidence:out}));
