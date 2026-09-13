// Read-only local browser checks for independent script-download failures.
import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
const engine=process.argv.includes('--webkit')?'webkit':'chrome';
const textSize=process.argv.includes('--large-text')?200:100;
const browser=await(engine==='webkit'?webkit.launch():chromium.launch({channel:'chrome'}));
const rows=[];
try{
 for(const width of [320,390,820,1440])for(const lang of ['zh','en'])for(const failure of ['site','bootstrap','both-ui-and-motion']){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'}),errors=[],writes=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>{const request=r.request(),url=new URL(request.url());if(url.origin!=='http://127.0.0.1:7903')return r.abort();if(!['GET','HEAD'].includes(request.method())){writes.push(url.pathname);return r.abort()}if((failure==='bootstrap'&&url.pathname==='/site/catalogue-bootstrap.js')||(failure!=='bootstrap'&&url.pathname==='/site/site.js')||(failure==='both-ui-and-motion'&&url.pathname==='/site/stage.js'))return r.abort();return r.continue()});
  await page.goto('http://127.0.0.1:7903/?lang='+lang);await page.evaluate(size=>document.documentElement.style.fontSize=size+'%',textSize);await page.evaluate(()=>document.fonts.ready);
  assert(await page.locator('html').evaluate(e=>e.classList.contains('site-ui-unavailable')));
  assert.equal(await page.locator('#navToggle').isVisible(),false);assert.equal(await page.locator('#language').isVisible(),false);
  assert.equal(await page.locator('#mainNav a:visible').count(),3);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  const targets=await page.evaluate(()=>['.logo','.header-actions','#mainNav'].map(s=>document.querySelector(s).getBoundingClientRect().toJSON()));
  assert(targets[0].right<=targets[1].left+1||targets[0].bottom<=targets[1].top+1,'Header brand and ordering action remain separate');
  assert(targets[2].top>=Math.max(targets[0].bottom,targets[1].bottom)-1,'Static links have their own row');
  if(width===390&&lang==='zh')await page.screenshot({path:out+'/'+failure+'-opening.png'});
  await page.locator('#mainNav a[href="#food"]').click();await page.waitForURL(url=>url.hash==='#food');
  assert(await page.locator('.site-ui-fallback').isVisible());
  assert.match(await page.locator('.site-ui-fallback').textContent(),lang==='zh'?/菜单预览暂未加载/:/Menu preview unavailable/);
  assert.equal(await page.locator('.site-ui-fallback a').getAttribute('href'),'/order?lang='+lang);
  if(width===390&&lang==='zh')await page.screenshot({path:out+'/'+failure+'-menu.png'});
  await page.locator('.site-ui-fallback a').click();await page.waitForURL('**/order?lang='+lang);
  await page.waitForFunction(()=>typeof store!=='undefined');assert.equal(await page.evaluate(()=>store.items.length),0);
  await page.locator('[data-fulfilment=takeaway]').click();assert.equal(await page.evaluate(()=>store.items.length),0);
  assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);rows.push({width,lang,failure,nativeNavigation:true,localizedOrderLink:true,emptyCart:true,errors,writes});await page.close();
 }
}finally{await browser.close()}
await writeFile(out+'/report.json',JSON.stringify({engine,textSize,rows},null,2));console.log(JSON.stringify({engine,textSize,passed:true,cases:rows.length}));
