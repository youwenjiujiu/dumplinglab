import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const out=resolve('output/website-boiled-gallery-v1');await mkdir(out,{recursive:true});
const before=await readFile(resolve(out,'index-before.html'),'utf8'),after=await readFile('editions/website/index.html','utf8');
const excludeFilm=s=>s.replace(/    <section class="film-section[\s\S]*?(?=    <section class="food-section")/,'');
assert.equal(excludeFilm(before),excludeFilm(after),'Hero and every section outside film unchanged');
const scopeStage=s=>s.replace(/const filmPoster=.*?;\n/,'').replace(/const action=text\(filmFailed\?[^\n]+/,'').replace(/ if\(!\$\('#filmToggle'\)\)return;[^\n]*\n/,'').replace("$('#filmToggle')?.addEventListener","$('#filmToggle').addEventListener");
assert.equal(scopeStage(await readFile(resolve(out,'stage-before.js'),'utf8')),scopeStage(await readFile('editions/website/stage.js','utf8')),'Only film poster and film labels may change in stage logic');
const section=after.match(/<section class="film-section[\s\S]*?<\/section>/)[0];
assert.doesNotMatch(section,/dumpling-film-|campaign-macro|golden|potsticker|焦脆|焦香/i,'No residual panfried gallery content');
const browser=await chromium.launch({channel:'chrome'}),results=[];
try{
 for(const variant of [
 {name:'desktop-en',width:1440,height:1000,lang:'en'},
 {name:'desktop-zh',width:1440,height:1000,lang:'zh'},
 {name:'phone-en',width:390,height:844,lang:'en'},
 {name:'phone-zh',width:390,height:844,lang:'zh'},
 {name:'small-reduced',width:320,height:740,lang:'en',reduced:true},
 {name:'phone-no-js',width:390,height:844,lang:'en',noJS:true},
 {name:'desktop-large-text',width:1280,height:900,lang:'en',large:true},
 ]){
 const context=await browser.newContext({viewport:{width:variant.width,height:variant.height},reducedMotion:variant.reduced?'reduce':'no-preference',javaScriptEnabled:!variant.noJS});
 const page=await context.newPage(),errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 await page.goto('http://127.0.0.1:7903/?lang='+variant.lang,{waitUntil:'networkidle'});
 await page.evaluate(()=>document.fonts.ready);
 if(variant.large)await page.addStyleTag({content:'html{font-size:200%!important}'});
 await page.locator('#film').evaluate(el=>scrollTo(0,scrollY+el.getBoundingClientRect().top-document.querySelector('.site-header').offsetHeight));
 await page.locator('.film-detail-image img').evaluate(i=>i.decode());await page.waitForTimeout(1000);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow: '+variant.name);
 if(!variant.noJS){
  assert.equal(await page.locator('#filmTitle').innerText(),variant.lang==='zh'?'鲜嫩这一口。':'A softer side.');
  if(variant.reduced)assert(await page.locator('#brandFilm').evaluate(v=>v.paused),'Reduced motion paused');
  else{
   await page.locator('#filmScreen').scrollIntoViewIfNeeded();
   await page.waitForFunction(()=>!document.querySelector('#brandFilm').paused);
   assert((await page.locator('#brandFilm').evaluate(v=>v.currentSrc)).includes('boiled-film-'));
   assert.equal(await page.locator('#filmToggle').count(),0,'No overlay playback button');
   assert(await page.locator('#brandFilm').evaluate(v=>v.muted));
  }
 }
 await page.screenshot({path:resolve(out,variant.name+'.png')});
 await page.locator('#film').screenshot({path:resolve(out,variant.name+'-section.png'),animations:'disabled'});
 assert.deepEqual(errors,[]);
 assert(!requests.some(u=>/dumpling-film-|campaign-macro/.test(u)),'Old fried media not requested');
 if(!variant.noJS){await page.locator('#food').scrollIntoViewIfNeeded();await page.waitForTimeout(200);assert(await page.locator('#brandFilm').evaluate(v=>v.paused));}
 results.push({name:variant.name,errors});await context.close();
 }
}finally{await browser.close()}
await writeFile(resolve(out,'checks.json'),JSON.stringify({ok:true,protectedSectionsUnchanged:true,results},null,2));
console.log(JSON.stringify({ok:true,variants:results.length,protectedSectionsUnchanged:true,productionWrites:0}));
