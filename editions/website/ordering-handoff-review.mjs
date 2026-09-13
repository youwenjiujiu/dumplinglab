// Local navigation only: never submit an order, payment, or cart operation.
import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
const engine=process.argv.includes('--webkit')?'webkit':'chrome';
const browser=await(engine==='webkit'?webkit.launch():chromium.launch({channel:'chrome'}));
const cases=[];
try{
 for(const lang of ['zh','en'])for(const switchLanguage of [false,true]){
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'}),writes=[],errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{
   const request=route.request(),url=new URL(request.url());
   if(url.origin!=='http://127.0.0.1:7903')return route.abort();
   if(!['GET','HEAD'].includes(request.method())){writes.push({url:url.pathname,method:request.method()});return route.abort()}
   return route.continue();
  });
  await page.goto('http://127.0.0.1:7903/?lang='+lang);
  await page.locator('.site-header .order-link').click();await page.waitForURL('**/order?lang='+lang);
  await page.waitForFunction(()=>typeof store!=='undefined');
  assert.equal(await page.evaluate(()=>store.items.length),0,'A fresh homepage visit must not seed the ordering cart');
  await page.locator('[data-fulfilment=takeaway]').click();
  assert.equal(await page.evaluate(()=>store.items.length),0,'Choosing takeaway must not add a portion');
  const orderingLanguage=await page.evaluate(()=>language);
  assert.equal(orderingLanguage,lang);
  if(switchLanguage)await page.locator('#languageButton').click();
  const expectedLanguage=switchLanguage?(lang==='zh'?'en':'zh'):lang;
  const home=page.locator('a:has(#footerCopy)');
  const homeHref=await home.getAttribute('href');
  await home.click();await page.waitForURL(url=>url.pathname==='/');
  const returnedLanguage=await page.locator('html').getAttribute('lang');
  cases.push({lang,switchLanguage,expectedLanguage,homeHref,returnedLanguage,emptyCart:true,writes});
  await page.screenshot({path:out+'/'+lang+'-'+switchLanguage+'-returned.png'});
  assert.deepEqual(errors,[]);await page.close();
 }
}finally{await browser.close()}
await writeFile(out+'/report.json',JSON.stringify({engine,cases},null,2));
if(!process.argv.includes('--audit'))for(const c of cases){assert.equal(c.homeHref,'/?lang='+c.expectedLanguage,'New-tab links retain the current ordering language');assert.equal(c.returnedLanguage,c.expectedLanguage,'Return from ordering must retain the selected language');assert.deepEqual(c.writes,[])}
console.log(JSON.stringify({engine,cases},null,2));
