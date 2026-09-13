import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
const engine=process.argv.includes('--webkit')?'webkit':'chrome';
const browser=await(engine==='webkit'?webkit.launch({headless:true}):chromium.launch({channel:'chrome',headless:true}));
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 await page.goto('http://127.0.0.1:7903/?lang=zh');await page.evaluate(()=>document.fonts.ready);
 const cue=page.locator('.scroll-cue');assert.equal(await cue.getAttribute('href'),'#closeup');
 await cue.click();await page.waitForFunction(()=>document.querySelector('.scroll-cue').getAttribute('href')==='#film');assert.match(await cue.textContent(),/细节/);
 await page.locator('#language').click();assert.match(await cue.textContent(),/details/);
 await cue.click();await page.waitForFunction(()=>Math.abs(document.querySelector('#film').getBoundingClientRect().top-document.querySelector('.site-header').offsetHeight-20)<3);
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.waitForFunction(()=>document.querySelector('.scroll-cue').getAttribute('href')==='#food');
 assert.match(await cue.textContent(),/menu/);
 const staticPage=await browser.newPage({viewport:{width:1440,height:900},javaScriptEnabled:false});await staticPage.goto('http://127.0.0.1:7903/');assert.equal(await staticPage.locator('.scroll-cue').isVisible(),false);
 await writeFile(`${out}/report.json`,JSON.stringify({engine,introToCloseup:true,closeupToFilm:true,reducedToMenu:true,noJsNoMisleadingCue:true},null,2));
}finally{await browser.close()}
console.log(JSON.stringify({engine,passed:true}));
