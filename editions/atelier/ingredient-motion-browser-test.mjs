import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({channel:'chrome'});
try {
  for(const reduced of ['no-preference','reduce']) {
    const page=await browser.newPage({viewport:{width:390,height:900},reducedMotion:reduced});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:7898/');
    await page.locator('.recommendation-card').first().waitFor();
    const open=()=>page.evaluate(()=>{const d=dish('lunch-v2-pork-chive-shrimp');openDish(d,d.styles.find(s=>{const v=d.variants[s];return v.prep==='tossed'&&!v.spicy&&!v.sesame&&!v.noodles&&!v.legacy&&v.pieces===5;}));});
    await open();
    if(reduced==='no-preference'){
      await page.waitForFunction(()=>document.querySelector('dl-ingredient-reveal')?.dataset.motionState==='playing');
      const evidence=await page.locator('dl-ingredient-reveal').evaluate(el=>{
        el.seek(180);
        return {delays:el.animations.map(a=>a.effect.getTiming().delay),iterations:el.animations.map(a=>a.effect.getTiming().iterations),opacities:[...el.querySelectorAll('.ingredient-name')].map(n=>getComputedStyle(n).opacity)};
      });
      assert.deepEqual(evidence.delays,[0,70,140,210]);
      assert(evidence.iterations.every(n=>n===1));
      assert(new Set(evidence.opacities).size>1,'names stagger rather than arriving together');
      const frame=await page.locator('#detailIngredients').boundingBox();
      await page.locator('dl-ingredient-reveal').evaluate(e=>e.play());
      await page.waitForFunction(()=>document.querySelector('dl-ingredient-reveal').dataset.motionState==='complete');
      const after=await page.locator('#detailIngredients').boundingBox();
      assert.equal(after.height,frame.height);assert.equal(after.width,frame.width);
    } else assert.equal(await page.locator('dl-ingredient-reveal').evaluate(e=>e.animations.length),0);
    await page.locator('[data-lunch-option="sesame"][data-value="true"]').click();
    assert.equal(await page.locator('[data-motion-new="true"]').count(),1,'only new sesame animates');
    assert.equal(await page.locator('[data-motion-new="true"]').getAttribute('data-ingredient-key'),'芝麻酱');
    await page.locator('[data-lunch-option="pieces"][data-value="9"]').click();
    assert.equal(await page.locator('[data-motion-new="true"]').count(),0,'portion changes never replay ingredients');
    await page.locator('[data-lunch-option="sesame"][data-value="false"]').click();
    assert.equal(await page.locator('[data-ingredient-key="芝麻酱"]').count(),0);
    await page.locator('#closeSheet').click();await open();
    if(reduced==='no-preference') {
      await page.waitForFunction(()=>document.querySelector('dl-ingredient-reveal').dataset.motionState==='playing');
      await page.emulateMedia({reducedMotion:'reduce'});
      await page.waitForFunction(()=>document.querySelector('dl-ingredient-reveal').animations.length===0);
    }
    assert.equal(await page.locator('.detail-image img').evaluate(e=>getComputedStyle(e).transform),'none');
    assert.equal(await page.locator('details, .ingredient-disclosure').count(),0);
    assert.deepEqual(errors,[]);console.log(`PASS ${reduced}: stagger, fixed allocation, added-only motion, quantity, replay, reduced preference and static dish photo`);
    await page.close();
  }
}finally{await browser.close();}
