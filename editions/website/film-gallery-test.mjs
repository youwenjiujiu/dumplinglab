import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const out=resolve('output/website-film-gallery-v1');await mkdir(out,{recursive:true});
const before=await readFile(resolve(out,'index-before.html'),'utf8');
const after=await readFile('editions/website/index.html','utf8');
const withoutFilm=s=>s.replace(/    <section class="film-section[\s\S]*?(?=    <section class="food-section")/,'');
assert.equal(withoutFilm(after),withoutFilm(before),'Hero, navigation, menu, space and visit markup unchanged');
const campaign=await readFile('editions/website/campaign.css','utf8');
const withoutGallery=campaign.replace(/\n\/\* Up-close editorial gallery\.[\s\S]*?@media\(forced-colors:active\)\{#film\.film-gallery[^\n]*\n/,'').replace(/\/\* Preserve the entire sharing plate[^\n]*\n(?:#film\[data-subject=boiled\][^\n]*\n){3}/,'');
assert.equal(withoutGallery,await readFile(resolve(out,'campaign-before.css'),'utf8'),'All pre-existing styles preserved; added styles scoped to #film');
const excludeFilmConfig=s=>s.replace(/const filmPoster=.*?;\n/,'').replace(/const action=text\(filmFailed\?[^\n]+/,'').replace(/ if\(!\$\('#filmToggle'\)\)return;[^\n]*\n/,'').replace("$('#filmToggle')?.addEventListener","$('#filmToggle').addEventListener");
assert(excludeFilmConfig(await readFile('editions/website/stage.js','utf8')).startsWith(excludeFilmConfig(await readFile(resolve(out,'stage-before.js'),'utf8')).trimEnd()),'Original stage logic preserved apart from film config; film-only enhancement appended');
const browser=await chromium.launch({channel:'chrome'}),results=[];
try{
 for(const variant of [
  {name:'desktop-en',width:1440,height:1000,lang:'en'},
  {name:'desktop-zh',width:1440,height:1000,lang:'zh'},
  {name:'phone-en',width:390,height:844,lang:'en'},
  {name:'phone-zh',width:390,height:844,lang:'zh'},
  {name:'small-reduced',width:320,height:740,lang:'en',reduce:true},
  {name:'phone-no-js',width:390,height:844,lang:'en',noJS:true},
  {name:'desktop-large-text',width:1280,height:900,lang:'en',large:true},
 ]){
  const context=await browser.newContext({viewport:{width:variant.width,height:variant.height},reducedMotion:variant.reduce?'reduce':'no-preference',javaScriptEnabled:!variant.noJS});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:7903/?lang='+variant.lang,{waitUntil:'networkidle'});
  await page.evaluate(()=>document.fonts.ready);
  if(variant.large)await page.addStyleTag({content:'html{font-size:200%!important}'});
  await page.locator('#film').evaluate(el=>scrollTo(0,el.getBoundingClientRect().top+scrollY-document.querySelector('.site-header').offsetHeight));
  await page.locator('.film-detail-image img').evaluate(i=>i.decode());
  await page.waitForTimeout(1100);
  const bounds=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,items:[...document.querySelectorAll('#film .film-gallery-item')].map(e=>{const r=e.getBoundingClientRect();return{left:r.left,right:r.right,width:r.width}})}));
  assert(bounds.scroll<=bounds.width+1,variant.name+' no horizontal overflow');
  assert(bounds.items.every(r=>r.width>100&&r.left>=0&&r.right<=bounds.width+1),variant.name+' media in viewport');
  if(!variant.noJS){
   const title=await page.locator('#filmTitle').innerText();assert.equal(title,variant.lang==='zh'?'鲜嫩这一口。':'A softer side.');
   const video=page.locator('#brandFilm');
   if(variant.reduce)assert(await video.evaluate(v=>v.paused),'Reduced motion does not autoplay');
   else{
    // At 200% text, the heading can push the video below the first viewport.
    await page.locator('#filmScreen').scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>!document.querySelector('#brandFilm').paused);
    assert.equal(await page.locator('#filmToggle').count(),0,'No overlay playback button');
    assert(await video.evaluate(v=>v.muted),'Film never gains unwanted audio');
   }
  }
  await page.screenshot({path:resolve(out,variant.name+'.png')});
  await page.locator('#film').screenshot({path:resolve(out,variant.name+'-section.png'),animations:'disabled'});
  if(!variant.noJS){
   await page.locator('#food').scrollIntoViewIfNeeded();await page.waitForTimeout(180);
   assert(await page.locator('#brandFilm').evaluate(v=>v.paused),'Offscreen video pauses');
  }
  assert.deepEqual(errors,[],variant.name+' page errors');
  results.push({name:variant.name,bounds,errors});await context.close();
 }
}finally{await browser.close()}
await writeFile(resolve(out,'checks.json'),JSON.stringify({ok:true,protectedSectionsUnchanged:true,productionWrites:0,results},null,2));
console.log(JSON.stringify({ok:true,variants:results.length,protectedSectionsUnchanged:true,productionWrites:0}));
