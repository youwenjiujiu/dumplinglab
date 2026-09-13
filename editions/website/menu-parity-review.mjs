// Compare homepage prices/names against the existing ordering presenter.
// Price changes are mocked GET data only; no catalogue, cart or payment writes.
import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
const engine=process.argv.includes('--webkit')?'webkit':'chrome';
const browser=await(engine==='webkit'?webkit.launch():chromium.launch({channel:'chrome'}));
const snapshot=await(await fetch('http://127.0.0.1:7903/api/catalog')).json(),cases=[];
try{
 for(const lang of ['zh','en'])for(const updated of [false,true]){
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'}),writes=[];
  const data=structuredClone(snapshot);
  if(updated){data.revision+=1000;data.items=data.items.map(d=>({...d,price:Math.round((d.price+1.11)*100)/100}))}
  await page.route('**/*',route=>{
   const request=route.request(),url=new URL(request.url());
   if(url.origin!=='http://127.0.0.1:7903')return route.abort();
   if(!['GET','HEAD'].includes(request.method())){writes.push(request.method()+' '+url.pathname);return route.abort()}
   if(url.pathname==='/api/catalog')return route.fulfill({json:data});
   return route.continue();
  });
  await page.goto('http://127.0.0.1:7903/?lang='+lang);await page.evaluate(()=>CatalogClient.ready);
  const displayed=await page.locator('.food-item').evaluateAll(cards=>cards.map(card=>({id:card.dataset.dishId,name:card.querySelector('h3').textContent,amount:Number(card.querySelector('.food-price').textContent.match(/S\$([\d.]+)/)[1])})));
  assert.equal(displayed.length,3);
  await page.locator('.site-header .order-link').click();await page.waitForURL('**/order?lang='+lang);
  await page.waitForFunction(()=>typeof LunchMenu!=='undefined'&&typeof store!=='undefined');
  const expected=await page.evaluate(async ids=>{
   await CatalogClient.ready;
   return ids.map(id=>{const r=LUNCH_RECOMMENDATIONS.find(r=>r.dishId===id);return{id,name:language==='zh'?r.cn:r.name,amount:OrderPricing.inclusive(LunchMenu.recommendationPrice(r))}});
  },displayed.map(d=>d.id));
  assert.deepEqual(displayed,expected);assert.deepEqual(writes,[]);
  cases.push({lang,updated,matched:displayed});await page.close();
 }
}finally{await browser.close()}
await writeFile(out+'/report.json',JSON.stringify({engine,cases},null,2));console.log(JSON.stringify({engine,passed:true,cases:cases.length,productionWrites:0}));
