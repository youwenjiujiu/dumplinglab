// Fresh local contexts, no order submission or production requests.
import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
const engine=process.argv.includes('--webkit')?'webkit':'chrome';
const browser=await(engine==='webkit'?webkit.launch():chromium.launch({channel:'chrome'}));
const cases=[];
try{
 for(const width of [320,390,820])for(const lang of ['zh','en']){
  const page=await browser.newPage({viewport:{width,height:844},reducedMotion:'reduce'}),writes=[],errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>{if(new URL(r.request().url()).origin!=='http://127.0.0.1:7903')return r.abort();if(!['GET','HEAD'].includes(r.request().method())){writes.push(r.request().url());return r.abort()}return r.continue()});
  await page.goto('http://127.0.0.1:7903/order?lang='+lang);
  await page.locator('[data-fulfilment=takeaway]').click();await page.locator('#websiteHome').scrollIntoViewIfNeeded();
  const geometry=await page.evaluate(()=>{
   const link=document.querySelector('#websiteHome'),touch=link.querySelector('[aria-hidden]'),footer=link.closest('footer');
   const rect=()=>({footer:footer.getBoundingClientRect().toJSON(),text:link.querySelector('#footerCopy').getBoundingClientRect().toJSON()});
   const before=rect(),r=link.getBoundingClientRect(),target=touch.getBoundingClientRect();
   const hits=[-21,-10,0,10,21].map(d=>document.elementFromPoint(r.x+r.width/2,r.y+r.height/2+d)?.closest('a')===link);
   const style=link.getAttribute('style');link.removeAttribute('style');touch.style.display='none';const baseline=rect();
   link.setAttribute('style',style);touch.style.removeProperty('display');
   return{before,baseline,hits,target:target.toJSON(),font:getComputedStyle(link).fontSize};
  });
  assert(geometry.hits.every(Boolean),'The complete 44px target must receive the link');
  assert.deepEqual(geometry.before.footer,geometry.baseline.footer,'Touch expansion must not resize or move the footer');
  for(const key of ['x','y','width','height'])assert(Math.abs(geometry.before.text[key]-geometry.baseline.text[key])<.1,'Copyright geometry must be unchanged within inline subpixel rounding');
  assert(geometry.target.top>=geometry.before.footer.top&&geometry.target.bottom<=geometry.before.footer.bottom);
  await page.screenshot({path:out+'/'+width+'-'+lang+'.png'});
  // Click outside the visible lettering, not merely the normal anchor centre.
  await page.mouse.click(geometry.target.x+geometry.target.width/2,geometry.target.y+2);
  await page.waitForURL(url=>url.pathname==='/'&&url.searchParams.get('lang')===lang);
  assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);cases.push({width,lang,geometry,writes,errors});await page.close();
 }
}finally{await browser.close()}
await writeFile(out+'/report.json',JSON.stringify({engine,cases},null,2));
console.log(JSON.stringify({engine,cases:cases.length,passed:true}));
