// Fresh local-only browser contexts; production is never mutated.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const origin='http://127.0.0.1:7898';
const output=await mkdtemp(join(tmpdir(),'dumpling-design-audit-'));
const browser=await chromium.launch({headless:true,channel:'chrome'});
const errors=[];
const loaded=async page=>page.waitForFunction(()=>[...document.querySelectorAll('#sheet img')].every(i=>i.complete&&i.naturalWidth>0));
try {
  for(const width of [320,390,768]) {
    const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
    await page.goto(`${origin}/?table=QA${crypto.randomUUID().slice(0,7)}`);
    await page.locator('.recommendation-card').first().waitFor();
    await page.evaluate(()=>document.fonts.ready);
    assert.equal(await page.locator('#menuList').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 255, 255)');
    assert(!(await page.locator('body').innerText()).includes('S$'));
    assert.equal(await page.locator('.section-count').count(),0);
    await page.locator('#categoryButton').click();await loaded(page);
    assert.equal(await page.locator('.category-directory .category-choice').count(),5);
    assert.equal(await page.locator('.category-directory .category-choice small').count(),0);
    assert(await page.locator('#sheet').evaluate(e=>e.scrollWidth<=e.clientWidth));
    await page.screenshot({path:join(output,`categories-${width}.png`)});
    await page.locator('[data-action="planner"]').click();
    assert.equal(await page.locator('#sheet').getAttribute('data-mode'),'planner');
    await page.locator('#closeSheet').click();
    await page.locator('#tableButton').click();
    await page.waitForFunction(()=>[...document.querySelectorAll('dl-sharing-motion')].every(e=>[...e.shadowRoot.querySelectorAll('img')].every(i=>i.complete&&i.naturalWidth>0)));
    for(const src of await page.locator('dl-sharing-motion img').evaluateAll(es=>es.map(e=>e.src)))assert(src.includes('-v4.webp'));
    await page.screenshot({path:join(output,`sharing-${width}.png`)});
    await page.locator('#closeSheet').click();
    await page.locator('#tray').click();
    assert.equal(await page.locator('.empty-plate').count(),0);
    assert.equal(await page.locator('[data-table-layout]').count(),0);
    assert((await page.locator('#sheet').boundingBox()).height<640,'empty cart is content-sized');
    assert.equal(await page.locator('.cart-checkout').isVisible(),false,'no duplicate CTA');
    await page.screenshot({path:join(output,`empty-${width}.png`)});
    await page.locator('[data-action="nickname"]').click();
    await page.locator('#nickname').fill('youwen');await page.locator('[data-action="save-nickname"]').click();
    await page.locator('#closeSheet').click();
    await page.locator('[data-lunch-prep="fried"]').click();
    assert.equal(await page.locator('.lunch-chosen-flavor strong').innerText(),'煎');
    assert.equal(await page.locator('[data-lunch-next],.order-progress').count(),0);
    assert(await page.locator('#section-dumplings .dish-card').count()>0);
    assert(await page.locator('.lunch-chosen-flavor img').isVisible());
    await page.screenshot({path:join(output,`filling-${width}.png`)});
    await page.locator('#section-dumplings .dish-add[data-add]').first().click();await loaded(page);
    assert.equal(await page.locator('.detail-image img').evaluate(e=>e.getAnimations().length),0,'reduced motion stays still');
    await page.locator('#closeSheet').click();
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.locator('#section-dumplings .dish-add[data-add]').first().click();await loaded(page);
    assert.equal(await page.locator('.detail-image img').evaluate(e=>e.getAnimations().length),0,'photo stays static even without reduced motion');
    assert.equal(await page.locator('.detail-image img').evaluate(e=>getComputedStyle(e).transform),'none');
    assert.equal(await page.locator('.detail-image').getAttribute('role'),null,'static image is not announced as a slider');
    await page.locator('[data-action="add-detail"]').click();
    await page.locator('#tray').click();await page.locator('[data-action="review"]').click();
    await page.locator('[data-action="submit"]').click();
    await page.locator('.receipt-submitter').waitFor();
    assert.equal(await page.locator('.receipt-submitter strong').innerText(),'youwen');
    await page.waitForFunction(()=>document.querySelector('dl-receipt-print')?.dataset.motionState==='complete');await loaded(page);
    await page.screenshot({path:join(output,`receipt-${width}.png`)});
    await page.locator('[data-action="ordered"]').click();
    assert.equal(await page.locator('.receipt-submitter strong').innerText(),'youwen');
    await page.locator('#closeSheet').click();await page.locator('#languageButton').click();
    await page.waitForFunction(()=>document.documentElement.lang==='en');
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const typography=await page.locator('.menu-section').evaluateAll(sections=>sections.map(s=>{
      const names=[...s.querySelectorAll('.dish-name')];
      return {sizes:[...new Set(names.map(e=>getComputedStyle(e).fontSize))],overflow:names.some(e=>e.scrollWidth>e.clientWidth+1)};
    }));
    for(const entry of typography){assert(entry.sizes.length<=1,'consistent title size per category');assert(!entry.overflow,'no title overflow');for(const size of entry.sizes)assert(parseFloat(size)>=14,'readable English size');}
    assert(!(await page.locator('body').innerText()).includes('S$'));
    await context.close();console.log(`PASS ${width}: categories, new assets, empty state, actual checkout attribution, step flow, rotation, language typography`);
  }
  // Read-only verification against the user's already saved order, not new attribution.
  const page=await browser.newPage({viewport:{width:390,height:900},reducedMotion:'reduce'});
  await page.goto(`${origin}/?table=A1&group=P614D9`);
  await page.locator('#tray').click();await page.locator('[data-cart-tab="ordered"]').click();
  await page.locator('.paper-receipt').first().waitFor();
  const receipt=page.locator('.paper-receipt').filter({hasText:'#1460'});
  assert.equal(await receipt.locator('.receipt-submitter strong').innerText(),'youwen');
  await receipt.screenshot({path:join(output,'saved-order-1460.png')});
  assert.deepEqual(errors,[]);console.log(`Screenshots: ${output}`);
}finally{await browser.close();}
