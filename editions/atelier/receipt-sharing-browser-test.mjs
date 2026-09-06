// Local-only, fresh Chrome contexts; never submits production orders.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const origin='http://127.0.0.1:7898';
const output=await mkdtemp(join(tmpdir(),'dumpling-receipt-sharing-'));
const browser=await chromium.launch({headless:true,channel:'chrome'});
const errors=[];
async function pageFor(width,motion='reduce') {
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:motion});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  await page.goto(`${origin}/?table=QM${crypto.randomUUID().slice(0,7).toUpperCase()}`);
  await page.locator('.recommendation-card').first().waitFor();
  await page.evaluate(()=>document.fonts.ready);
  return {context,page};
}
try {
  for(const width of [320,390,768]) {
    const {context,page}=await pageFor(width);
    assert.equal(await page.locator('#menuList').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 255, 255)');
    assert.equal(await page.evaluate(()=>getComputedStyle(document.body,'::after').content),'none');
    await page.locator('.dish-add[data-recommendation="boiled-dumplings"]').click();
    for(const el of await page.locator('.filling-price').all()) {
      const r=await el.evaluate(e=>({text:e.textContent,wrap:getComputedStyle(e).whiteSpace,overflow:e.scrollWidth>e.clientWidth+1}));
      assert.equal(r.wrap,'nowrap');assert(!r.overflow,'price stays on one line');
      assert(!r.text.includes('S$'));
    }
    assert(!(await page.locator('.filling-picker').innerText()).includes('↗'));
    assert(await page.locator('#sheet').evaluate(e=>e.scrollWidth<=e.clientWidth));
    if(width===390)await page.screenshot({path:join(output,'filling-390.png')});
    await page.locator('#closeSheet').click();
    await page.locator('[data-lunch-prep="tossed"]').click();
    assert.equal(await page.locator('.lunch-chosen-flavor strong').innerText(),'干拌');
    assert(!(await page.locator('.lunch-chosen-flavor').innerText()).includes('↗'));
    assert(!(await page.locator('body').innerText()).includes('S$'));
    await page.locator('#tableButton').click();
    assert.equal(await page.locator('dl-sharing-motion .scene').count(),2);
    await page.waitForFunction(()=>[...document.querySelectorAll('dl-sharing-motion')].every(e=>[...e.shadowRoot.querySelectorAll('img')].every(i=>i.complete&&i.naturalWidth>0)));
    assert.equal(await page.locator('dl-sharing-motion[mode="shared"] .ticket').count(),1);
    assert.equal(await page.locator('dl-sharing-motion[mode="separate"] .ticket').count(),2);
    assert(!(await page.locator('#sheet').innerText()).includes('同一链接'));
    for(const action of ['share','separate'])assert(await page.locator(`.sharing-option[data-action="${action}"]`).isVisible());
    assert(await page.locator('#sheet').evaluate(e=>e.scrollWidth<=e.clientWidth));
    if(width===390)await page.screenshot({path:join(output,'people-table-390.png')});
    assert.equal(await page.locator('dl-sharing-motion').first().evaluate(e=>e.jobs.length),0);
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.locator('#sheet').evaluate(e=>Promise.all(e.getAnimations().map(a=>a.finished.catch(()=>{}))));
    const scene=page.locator('dl-sharing-motion').first();
    const before=await scene.boundingBox();
    await scene.evaluate(e=>{e.restart();e.seek(450);});
    assert.equal(await scene.getAttribute('data-motion-state'),'playing');
    assert.deepEqual(await scene.boundingBox(),before);
    if(width===390)await page.screenshot({path:join(output,'people-table-motion-mid.png')});
    await scene.evaluate(e=>e.play());
    await page.waitForFunction(()=>document.querySelector('dl-sharing-motion').dataset.motionState==='complete');
    await scene.evaluate(e=>e.restart());
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForFunction(()=>document.querySelector('dl-sharing-motion').jobs.length===0);
    await context.close();
    console.log(`PASS ${width}: white surfaces, price line, prep, people, two groups, replay/reduced motion`);
  }
  for(const reduced of [false,true]) {
    const {context,page}=await pageFor(390,reduced?'reduce':'no-preference');
    await page.locator('.dish-add[data-recommendation="red-oil-chaoshou"]').click();
    await page.locator('[data-action="add-detail"]').click();
    await page.locator('#sheet').waitFor({state:'hidden'});
    await page.locator('#tray').click();
    await page.locator('[data-action="review"]').click();
    await page.locator('[data-action="submit"]').waitFor();
    let release;const gate=new Promise(r=>release=r);const payloads=[];
    await page.route('**/api/order',async route=>{
      if(route.request().method()!=='POST')return route.continue();
      payloads.push(route.request().postDataJSON());
      if(payloads.length===1 && !reduced)return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,error:'QA temporary interruption'})});
      await gate;return route.continue();
    });
    await page.locator('[data-action="submit"]').click();
    if(!reduced) {
      await page.waitForFunction(()=>document.querySelector('[data-action="submit"]')?.dataset.orderState==='error');
      assert.equal(await page.locator('dl-receipt-print').count(),0);
      await page.locator('[data-action="submit"]').click();
    }
    await page.waitForFunction(()=>document.querySelector('[data-action="submit"]')?.getAttribute('aria-busy')==='true');
    assert.equal(await page.locator('dl-receipt-print').count(),0,'no fake success before acknowledgment');
    assert(await page.locator('[data-action="submit"]').isDisabled());
    await page.locator('[data-action="submit"]').evaluate(e=>e.click());
    await page.screenshot({path:join(output,`receipt-pending-${reduced}.png`)});
    assert.equal(payloads.length,reduced?1:2,'disabled click cannot duplicate request');
    release();
    await page.locator('dl-receipt-print').waitFor();
    const receipt=page.locator('dl-receipt-print');
    if(!reduced) {
      assert.equal(await receipt.getAttribute('data-motion-state'),'printing');
      assert.deepEqual(payloads[0],payloads[1],'safe retry reuses identical order request');
      await receipt.evaluate(e=>e.seek(650));
      await page.screenshot({path:join(output,'receipt-motion-mid.png')});
      await receipt.evaluate(e=>e.play());
    }
    await page.waitForFunction(()=>document.querySelector('dl-receipt-print')?.dataset.motionState==='complete');
    assert((await receipt.innerText()).includes('红油抄手'));
    assert((await receipt.innerText()).includes('$5.80'));
    const photo=receipt.locator('.receipt-line-photo');
    assert(await photo.isVisible(),'ordered dish photo printed next to its name');
    await page.waitForFunction(()=>[...document.querySelectorAll('dl-receipt-print .receipt-line-photo')].every(i=>i.complete&&i.naturalWidth>0));
    assert(!(await receipt.innerText()).includes('S$'));
    assert.equal(await receipt.evaluate(e=>e.jobs.length),0);
    await page.screenshot({path:join(output,`receipt-complete-${reduced}.png`)});
    await page.locator('[data-action="ordered"]').click();
    assert.equal(await page.locator('dl-receipt-print').count(),0,'history stays static');
    assert.equal(await page.locator('.placed-receipts .paper-receipt').count(),1,'one authoritative order');
    await context.close();console.log(`PASS receipt ${reduced?'reduced':'normal'}: acknowledgment, retry, no duplicate, print, history`);
  }
  assert.deepEqual(errors,[]);
  console.log(`Browser QA passed. Screenshots: ${output}`);
} finally {await browser.close();}
