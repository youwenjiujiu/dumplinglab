import {launchBrowser,browserEngine} from './browser-test-runtime.mjs';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const out=new URL('./generated/header-spacing/verified/',import.meta.url).pathname;
await mkdir(out,{recursive:true});
const browser=await launchBrowser();
try {
  for(const width of [320,360,390,430,768]) for(const orderMode of ['takeaway','dinein']) {
    const page=await browser.newPage({viewport:{width,height:844},deviceScaleFactor:2,reducedMotion:'reduce'});
    await page.route('**/*',route=>new URL(route.request().url()).origin==='http://127.0.0.1:7898'&&route.request().method()==='GET'?route.continue():route.abort());
    await page.goto('http://127.0.0.1:7898/');
    await page.locator(`[data-fulfilment="${orderMode}"]`).click();
    await page.locator('#sheet').waitFor({state:'hidden'});
    const language=page.locator('#languageButton'),mode=page.locator('#fulfilmentButton');
    const initial=await language.boundingBox(),modeBounds=await mode.boundingBox();
    assert(initial.width>=44&&initial.height>=44,'Language hit target remains at least 44px');
    assert(initial.x+initial.width<=width-4,'Language control stays inside the screen');
    assert(initial.x>=modeBounds.x+modeBounds.width,'Language control does not overlap order mode');
    assert.equal(await language.evaluate(e=>getComputedStyle(e).insetInlineStart),width<=360?'6px':'8px');
    const bell=page.locator('#serviceButton');
    if(await bell.isVisible()){const b=await bell.boundingBox();assert(initial.x>=b.x+b.width,'No overlap with service bell');}
    await page.locator('.masthead').screenshot({path:`${out}header-${browserEngine}-${orderMode}-${width}.png`});
    await language.click();assert.equal(await language.innerText(),'中文');
    await language.click();assert.equal(await language.innerText(),'EN');
    assert.deepEqual(await mode.boundingBox(),modeBounds,'Toggle does not move order mode');
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.close();console.log(`PASS ${browserEngine} ${orderMode} ${width}: EN shifts right, 44px target, no overlap/overflow, both language toggles work`);
  }
} finally {await browser.close();}
