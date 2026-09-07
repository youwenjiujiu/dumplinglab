// Fresh local contexts only; no orders, cart writes or production requests.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const shots=await mkdtemp(join(tmpdir(),'dumpling-ingredients-'));
const origin=process.env.ATELIER_TEST_URL || 'http://127.0.0.1:7898/';
const browser=await chromium.launch({channel:'chrome'});
try {
  for(const width of [320,390,768]) {
    const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'no-preference'});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin);
    await page.locator('.recommendation-card').first().waitFor();
    const dishes=await page.evaluate(()=>MENU.map(d=>({id:d.id,style:d.styles?.[0]||null,items:d.ingredientInfo?.items,note:d.ingredientInfo?.note,complete:d.ingredientInfo?.completeRecipe})));
    assert.equal(dishes.length,35);
    for(const lang of ['zh','en']) {
      if(lang==='en')await page.locator('#languageButton').click();
      for(const d of dishes) {
        assert.equal(d.complete,false,'unconfirmed recipe must not be marked complete');
        assert(d.items.length || d.note,`Missing data ${d.id}`);
        await page.evaluate(({id,style})=>openDish(dish(id),style),d);
        await page.locator('#detailIngredients').waitFor();
        assert.equal(await page.locator('.detail-image img').evaluate(e=>e.getAnimations().length),0,'detail photo must not auto-rotate');
        assert.equal(await page.locator('.detail-image img').evaluate(e=>getComputedStyle(e).transform),'none');
        assert.equal(await page.locator('.detail-image').getAttribute('role'),null);
        assert.equal(await page.locator('#ingredientHeading').innerText(),lang==='zh'?'主要食材':'Main ingredients');
        const content=await page.locator('#detailIngredients').innerText();
        for(const item of d.items)assert(content.includes(item[lang==='zh'?'cn':'en']),`${d.id}: ${JSON.stringify(item)}`);
        if(d.note)assert(content.includes(d.note[lang==='zh'?0:1]));
        const clipped=await page.locator('#detailIngredients').evaluate(e=>e.scrollWidth>e.clientWidth+1);
        assert.equal(clipped,false,`${d.id} at ${width} overflow`);
        const title=await page.locator('#sheetTitle').boundingBox(),price=await page.locator('.detail-price').boundingBox();
        assert(title.x+title.width<=price.x-8,`${d.id}: title must leave a gap before price`);
        const titleOverflow=await page.locator('#sheetTitle').evaluate(e=>e.scrollWidth>e.clientWidth+1);
        assert.equal(titleOverflow,false,`${d.id}: title text exceeds allocated column`);
        assert(await page.locator('#sheetBody .fineprint').innerText().then(t=>t.includes(lang==='zh'?'非完整配料表':'not a complete ingredient list')));
        if(d.id==='lunch-v2-mince-scallion-noodles')await page.screenshot({path:join(shots,`noodles-${lang}-${width}.png`)});
        await page.locator('#closeSheet').click();
      }
      // A recommendation is a preset of the same dish, not a second ingredient record.
      await page.locator('.dish-add[data-recommendation="roe-wonton-noodles"]').click();
      assert((await page.locator('.ingredient-list').innerText()).includes(lang==='zh'?'面条':'Noodles'));
      assert((await page.locator('.ingredient-list').innerText()).includes(lang==='zh'?'高汤':'Broth'));
      await page.locator('#closeSheet').click();
      await page.evaluate(()=>{const d=dish('lunch-v2-pork-chive-shrimp');openDish(d,d.styles.find(s=>{const v=d.variants[s];return v.prep==='tossed'&&!v.legacy&&!v.spicy&&!v.sesame&&!v.noodles&&v.pieces===5;}));});
      await page.locator('[data-lunch-option="sesame"][data-value="true"]').click();
      await page.locator('[data-lunch-option="noodles"][data-value="true"]').click();
      await page.locator('[data-lunch-option="spicy"][data-value="true"]').click();
      let text=await page.locator('.ingredient-list').innerText();
      for(const word of lang==='zh'?['芝麻酱','面条','辣味调料']:['Sesame sauce','Noodles','Spicy seasoning'])assert(text.includes(word));
      await page.locator('[data-lunch-option="pieces"][data-value="9"]').click();
      assert.equal(await page.locator('.ingredient-list').innerText(),text,'quantity does not duplicate ingredients');
      await page.locator('#detailIngredients').scrollIntoViewIfNeeded();
      await page.screenshot({path:join(shots,`extras-${lang}-${width}.png`)});
      await page.locator('[data-lunch-option="prep"][data-value="boiled"]').click();
      text=await page.locator('.ingredient-list').innerText();
      for(const word of lang==='zh'?['芝麻酱','面条','辣味调料']:['Sesame sauce','Noodles','Spicy seasoning'])assert(!text.includes(word),'removed extra remains visible');
      await page.locator('#closeSheet').click();
      // The language control is outside the modal: switch, then reopen detail.
      await page.locator('#languageButton').click();
      await page.evaluate(()=>openDish(dish('lunch-v2-oyster-lettuce')));
      assert.equal(await page.locator('#ingredientHeading').innerText(),lang==='zh'?'Main ingredients':'主要食材');
      await page.locator('#closeSheet').click();
      await page.locator('#languageButton').click();
      console.log(`PASS ${width} ${lang}: all 35 details, unknown recipe notes, presets, dynamic extras, portion stability, language and width`);
    }
    assert.deepEqual(errors,[]);await context.close();
  }
  console.log(`Screenshots: ${shots}`);
} finally {await browser.close();}
