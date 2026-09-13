import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
const engine=process.argv.includes('--webkit')?'webkit':'chrome';
const browser=await(engine==='webkit'?webkit.launch():chromium.launch({channel:'chrome'}));
const cases=[];
try{
 for(const width of [390,1440])for(const lang of ['zh','en']){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*poster.webp',r=>r.abort());
  await page.goto('http://127.0.0.1:7903/?lang='+lang);
  await page.locator('#filmScreen').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.querySelector('#filmScreen').dataset.posterUnavailable==='true');
  assert(await page.locator('#filmFallback').isVisible());
  assert.equal(await page.locator('.cinema-poster').evaluate(i=>getComputedStyle(i).visibility),'hidden');
  assert.match(await page.locator('#filmFallback').innerText(),lang==='zh'?/封面暂未加载/:/Preview unavailable/);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:out+'/'+width+'-'+lang+'-fallback.png'});
  await page.locator('#filmToggle').click();
  await page.waitForFunction(()=>document.querySelector('#filmScreen').dataset.filmReady==='true');
  assert.equal(await page.locator('#filmFallback').isVisible(),false,'Playing video replaces the failed poster');
  await page.locator('#filmToggle').click();
  await page.locator('#brandFilm').evaluate(v=>v.dispatchEvent(new Event('error')));
  assert(await page.locator('#filmFallback').isVisible(),'A later video failure restores the intentional frame');
  assert.equal(await page.locator('#filmToggle').getAttribute('aria-label'),lang==='zh'?'重试播放':'Retry film');
  await page.unroute('**/*poster.webp');
  await page.locator('.cinema-poster').evaluate(i=>{const p=i.closest('picture');p.querySelector('source').srcset+='?recovered';i.src+='?recovered'});
  await page.waitForFunction(()=>document.querySelector('#filmScreen').dataset.posterUnavailable==='false');
  assert.equal(await page.locator('#filmFallback').isVisible(),false);
  assert.equal(await page.locator('.cinema-poster').evaluate(i=>getComputedStyle(i).visibility),'visible');
  assert.deepEqual(errors,[]);cases.push({width,lang,posterFailure:true,videoStillPlayable:true,videoFailure:true,posterRecovered:true});await page.close();
 }
 {
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await page.route('**/*poster.webp',r=>r.abort());
  await page.route('**/*.mp4',r=>r.abort());
  await page.goto('http://127.0.0.1:7903/?lang=zh');
  await page.locator('#filmToggle').click();
  await page.waitForFunction(()=>document.querySelector('#filmToggle').getAttribute('aria-label')==='重试播放');
  assert(await page.locator('#filmFallback').isVisible());
  await page.unroute('**/*.mp4');await page.locator('#filmToggle').click();
  await page.waitForFunction(()=>document.querySelector('#filmScreen').dataset.filmReady==='true');
  assert.equal(await page.locator('#filmFallback').isVisible(),false);
  cases.push({networkPosterAndVideoFailure:true,videoRetryRecovered:true});await page.close();
 }
}finally{await browser.close()}
await writeFile(out+'/report.json',JSON.stringify({engine,cases},null,2));console.log(JSON.stringify({engine,passed:true,cases:cases.length}));
