// Isolated local browser; no kitchen orders or real share messages.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const out=new URL('./generated/sharing-art-v7/verified/',import.meta.url).pathname;
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'}),errors=[];
try {
  for(const width of [320,390,768]) {
    const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
    page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>{Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.__shareCapture=data;}});});
    await page.goto('http://127.0.0.1:7898/?table=A1');
    const close=page.getByRole('button',{name:'关闭 / Close',exact:true});if(await close.isVisible())await close.click();
    const spacing=await page.locator('#dineinControls').evaluate(e=>{const r=e.getBoundingClientRect(),b=e.querySelector('#tableButton').getBoundingClientRect();return {above:b.top-r.top,below:r.bottom-b.bottom};});
    assert(spacing.above>=12&&spacing.below>=12,'Table button has breathing room above and below');
    assert(Math.abs(spacing.above-spacing.below)<1,'Table button is vertically centered');
    await page.locator('#dineinControls').screenshot({path:`${out}table-button-${width}.png`});
    await page.locator('#tableButton').click();
    const cards=page.locator('.sharing-options'),photos=cards.locator('img');
    await photos.first().waitFor();
    await page.waitForFunction(()=>[...document.querySelectorAll('dl-sharing-motion')].every(e=>{const i=e.shadowRoot.querySelector('img');return i.complete&&i.naturalWidth>0;}));
    const sources=await photos.evaluateAll(es=>es.map(e=>e.currentSrc));
    assert.equal(sources.length,2);assert.equal(new Set(sources).size,2);
    assert(sources[0].endsWith('dining-together-v5.webp'));assert(sources[1].endsWith('dining-separate-v7.webp'));
    assert.match(await page.locator('.sharing-note').innerText(),/朋友、同事或拼桌/);
    assert(await page.locator('#sheet').evaluate(e=>e.scrollWidth<=e.clientWidth),'No mobile overflow');
    assert.equal(await cards.locator('[mode="shared"] .ticket').count(),1);
    assert.equal(await cards.locator('[mode="separate"] .ticket').count(),2);
    await cards.screenshot({path:`${out}cards-${width}.png`});
    await page.locator('[data-action="share"]').click();
    await page.waitForFunction(()=>window.__shareCapture);
    assert.equal(new URL(await page.evaluate(()=>window.__shareCapture.url)).searchParams.get('table'),'A1');
    await page.locator('[data-action="separate"]').click();
    await page.waitForURL(url=>/^P[A-Z0-9]{5}$/.test(url.searchParams.get('group')||''));
    assert.equal(new URL(page.url()).searchParams.get('table'),'A1');
    await page.close();
    console.log(`PASS ${width}: v5 together/v7 strangers load, independent-order clarification, table-button spacing, layout fits, shared link preserved, separate group preserves table`);
  }
  assert.deepEqual(errors,[]);
} finally { await browser.close(); }
