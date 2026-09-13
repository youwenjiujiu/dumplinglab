import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
const engine=process.argv.includes('--webkit')?'webkit':'chrome';
const browser=await(engine==='webkit'?webkit.launch({headless:true}):chromium.launch({channel:'chrome',headless:true}));
const report=[];
try{
 for(const lang of ['zh','en']){
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});let release;
  const held=new Promise(r=>release=r);
  await page.route('**/dumpling-film-mobile-v1.mp4',async route=>{await held;await route.continue()});
  await page.goto(`http://127.0.0.1:7903/?lang=${lang}`);
  await page.locator('#filmToggle').click();await page.waitForFunction(()=>document.querySelector('#filmToggle').getAttribute('aria-busy')==='true');
  assert.equal(await page.locator('#filmLabel').textContent(),lang==='zh'?'正在加载…':'Loading film…');
  assert.equal(await page.locator('#filmToggle').isEnabled(),true);
  await page.screenshot({path:`${out}/${lang}-loading.png`});
  await page.locator('#filmToggle').click();await page.waitForFunction(()=>document.querySelector('#filmToggle').getAttribute('aria-busy')==='false');
  release();await page.waitForFunction(()=>document.querySelector('#brandFilm').readyState>=1);
  assert(await page.locator('#brandFilm').evaluate(v=>v.paused),'Late bytes do not override the pause chosen during loading');
  await page.locator('#filmToggle').click();await page.waitForFunction(()=>document.querySelector('#filmScreen').dataset.filmReady==='true'&&!document.querySelector('#brandFilm').paused);
  assert.equal(await page.locator('#filmToggle').getAttribute('aria-busy'),'false');
  assert.equal(await page.locator('#filmLabel').textContent(),lang==='zh'?'暂停短片':'Pause film');
  report.push({lang,loadingVisible:true,pauseDuringLoading:true,retryPlays:true});await page.close();
 }
}finally{await browser.close()}
await writeFile(`${out}/report.json`,JSON.stringify({engine,cases:report},null,2));console.log(JSON.stringify({engine,passed:report.length}));
