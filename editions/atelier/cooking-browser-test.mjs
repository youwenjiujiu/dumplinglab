import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const output=await mkdtemp(join(tmpdir(),'dumpling-cooking-'));
const browser=await chromium.launch({channel:'chrome'});
try{
  for(const width of [320,390,768]){
    const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'no-preference'});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:7898/?table=A1');
    await page.locator('.preparation-photo img').first().waitFor();
    await page.locator('.lunch-preparations').scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>[...document.querySelectorAll('.preparation-photo img')].every(e=>e.complete&&e.naturalWidth>0));
    assert.equal(await page.locator('dl-preparation-motion').count(),0,'rejected cooking cartoons must not return');
    assert.equal(await page.locator('script[src*="cooking-motion"]').count(),0);
    assert.equal(await page.locator('.preparation-photo img').count(),4);
    for(const mode of ['soup','tossed','boiled','fried']){
      const photo=page.locator(`[data-lunch-prep="${mode}"] .preparation-photo img`);
      assert((await photo.getAttribute('src')).includes(`preparation-${mode}-generated-v3.webp`));
      assert(await photo.isVisible(),'actual food photo is visible, not a hidden fallback');
    }
    await page.locator('.lunch-preparations').screenshot({path:join(output,`cooking-${width}.png`)});
    await page.emulateMedia({reducedMotion:'reduce'});
    assert(await page.locator('.preparation-photo img').evaluateAll(es=>es.every(e=>e.getAnimations().length===0)));
    for(const [mode,count] of [['soup',3],['tossed',8],['boiled',5],['fried',5]]){
      await page.locator(`[data-lunch-prep="${mode}"]`).click();
      assert.equal(await page.locator('#section-dumplings .dish-card').count(),count);
      const edit=page.locator('.edit-preparation');
      assert.equal((await edit.innerText()).trim(),'');
      assert.equal(await edit.getAttribute('aria-label'),'修改做法');
      const aligned=await page.locator('.lunch-chosen-flavor').evaluate(e=>{
        const a=e.querySelector('strong').getBoundingClientRect(),b=e.querySelector('button').getBoundingClientRect();return Math.abs(a.y+a.height/2-b.y-b.height/2)<1;
      });assert(aligned,'method label and edit icon aligned');
      await edit.click();
    }
    await page.locator('.dish-add[data-recommendation="roe-wonton-noodles"]').click();
    await page.waitForFunction(()=>document.querySelector('.detail-image img')?.complete&&document.querySelector('.detail-image img')?.naturalWidth);
    assert.equal(await page.locator('#sheetTitle').innerText(),'鲜虾蟹籽云吞面');
    assert((await page.locator('.detail-image img').getAttribute('src')).includes('wonton-soup-noodles'));
    await page.screenshot({path:join(output,`noodle-detail-${width}.png`)});
    assert.deepEqual(errors,[]);await page.close();console.log(`PASS ${width}: four visible food photos, rejected cartoons absent, immediate selection, aligned pencil, noodle photo/name. Cooking animation withdrawn, not redesigned.`);
  }
  console.log(`Cooking screenshots: ${output}`);
}finally{await browser.close();}
