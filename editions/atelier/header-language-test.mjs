import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const out=new URL('./generated/header-spacing/verified/',import.meta.url).pathname;
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'});
try {
  for(const width of [320,390,768]) {
    const page=await browser.newPage({viewport:{width,height:844},reducedMotion:'reduce'});
    await page.goto('http://127.0.0.1:7898/?table=A1');
    const close=page.getByRole('button',{name:'关闭 / Close',exact:true});if(await close.isVisible())await close.click();
    const language=page.locator('#languageButton'),mode=page.locator('#fulfilmentButton');
    const initial=await language.boundingBox(),modeBounds=await mode.boundingBox();
    assert(initial.width>=44&&initial.height>=44,'Language hit target remains at least 44px');
    assert(initial.x+initial.width<=width-4,'Language control stays inside the screen');
    assert(initial.x>=modeBounds.x+modeBounds.width,'Language control does not overlap order mode');
    assert.equal(await language.evaluate(e=>getComputedStyle(e).insetInlineStart),'8px');
    await page.locator('.masthead').screenshot({path:`${out}header-${width}.png`});
    await language.click();assert.equal(await language.innerText(),'中文');
    await language.click();assert.equal(await language.innerText(),'EN');
    assert.deepEqual(await mode.boundingBox(),modeBounds,'Toggle does not move order mode');
    await page.close();console.log(`PASS ${width}: EN shifts right 8px, 44px target, no overlap/overflow, both language toggles work`);
  }
} finally {await browser.close();}
