// Fresh browser, local preview only. Synthetic visualViewport is a keyboard-layout
// regression fixture, not a claim of real iPhone/Safari keyboard verification.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const output=await mkdtemp(join(tmpdir(),'dumpling-mobile-controls-'));
const browser=await chromium.launch({channel:'chrome'});
try {
  for(const width of [320,390,768]) {
    const context=await browser.newContext({viewport:{width,height:900},hasTouch:true,reducedMotion:'reduce'});
    await context.addInitScript(()=>{
      const original=window.visualViewport, fixture=new EventTarget();
      let height=null, top=0;
      Object.defineProperties(fixture,{
        height:{get:()=>height??original.height}, offsetTop:{get:()=>top},
        width:{get:()=>original.width}, scale:{get:()=>1},
      });
      Object.defineProperty(window,'visualViewport',{value:fixture});
      window.setKeyboardViewport=(h,t=0)=>{height=h;top=t;fixture.dispatchEvent(new Event('resize'));};
    });
    const page=await context.newPage(), errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:7898/');
    await page.locator('.recommendation-card').first().waitFor();
    assert.equal(await page.locator('#tableButton').innerText(),'选择桌号');
    assert(!/[—⌄]/.test(await page.locator('#tableButton').innerText()));
    assert(await page.locator('.header-actions').evaluate(e=>e.getBoundingClientRect().right<=innerWidth));
    await page.locator('#tableButton').tap();
    assert.equal(await page.locator('#tableEntry').evaluate(e=>e===document.activeElement),false,'no forced keyboard on entry');
    assert.equal(await page.locator('#tableEntryForm button').innerText(),'确认桌号','header entry is not checkout review');
    assert.equal(await page.locator('#closeSheet .icon').evaluate(e=>getComputedStyle(e).width),'18px');
    assert.equal(await page.locator('#closeSheet').evaluate(e=>getComputedStyle(e).outlineStyle),'none');
    const close=await page.locator('#closeSheet').boundingBox();
    assert(close.width>=44&&close.height>=44,'small glyph, usable hit target');
    await page.locator('#tableEntry').tap();
    await page.evaluate(()=>setKeyboardViewport(360,20));
    if(width<=760) {
      await page.waitForFunction(()=>document.documentElement.classList.contains('keyboard-open'));
      const bounds=await page.locator('#sheet').boundingBox();
      assert(bounds.y>=20&&bounds.y+bounds.height<=381,'table sheet fits above keyboard');
      for(const selector of ['#tableEntry','#tableEntryForm button']) {
        const box=await page.locator(selector).boundingBox();
        assert(box.y>=bounds.y&&box.y+box.height<=380,`${selector} visible above keyboard`);
      }
      await page.screenshot({path:join(output,`table-keyboard-${width}.png`)});
    }
    await page.locator('#closeSheet').tap();
    await page.evaluate(()=>setKeyboardViewport(null));
    await page.locator('[data-lunch-prep="soup"]').tap();
    assert.equal(await page.locator('#fillingStepTitle').evaluate(e=>getComputedStyle(e).outlineStyle),'none','no blue heading focus rectangle after touch');
    await page.locator('#searchButton').tap();
    await page.evaluate(()=>setKeyboardViewport(360,20));
    const originalCount=await page.locator('.search-result').count();
    await page.locator('#searchInput').evaluate(e=>{
      e.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));
      e.value='zhu';
      e.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true}));
      e.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,isComposing:true}));
    });
    await page.waitForTimeout(220);
    assert.equal(await page.locator('.search-result').count(),originalCount,'IME intermediate spelling is not a submitted search');
    assert(await page.locator('#searchInput').evaluate(e=>e===document.activeElement));
    await page.locator('#searchInput').evaluate(e=>e.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true})));
    await page.locator('#searchInput').fill('猪肉');
    await page.waitForFunction(()=>document.querySelectorAll('.search-result').length===4);
    assert.match(await page.locator('#searchSummaryText').innerText(),/4 道菜/);
    const names=await page.locator('.search-result strong').allTextContents();
    assert.equal(new Set(names).size,4,'unique results, including previously hidden fillings');
    for(const selector of ['#searchInput','#cancelSearch','.search-result:first-child']) {
      const box=await page.locator(selector).boundingBox();
      assert(box.y>=20&&box.y+box.height<=380,`${selector} fits keyboard-reduced visible area`);
    }
    await page.screenshot({path:join(output,`search-keyboard-${width}.png`)});
    await page.locator('#searchInput').press('Enter');
    assert.equal(await page.locator('#searchInput').evaluate(e=>e===document.activeElement),false,'Search key dismisses keyboard');
    await page.evaluate(()=>setKeyboardViewport(null));
    const selectedPhoto=await page.locator('.search-result-open img').first().getAttribute('src');
    await page.locator('.search-result-open').first().tap();
    await page.locator('#lunchOptions').waitFor();
    assert.equal((await page.locator('.detail-image img').getAttribute('src')).replace('/l/','/s/'),selectedPhoto,'search thumbnail and default detail preparation match');
    assert(await page.locator('[data-lunch-option="prep"]').count()>0,'search result can choose preparation');
    await page.locator('#closeSheet').tap();
    await page.locator('#cancelSearch').tap();
    assert(await page.locator('#searchPanel').isHidden());
    assert.equal(await page.locator('body').evaluate(e=>e.classList.contains('search-open')),false);
    assert.equal(await page.locator('body').evaluate(e=>e.style.overflow),'');
    await page.locator('#searchButton').tap();
    await page.locator('#searchInput').fill('不存在的菜品');
    await page.waitForFunction(()=>document.querySelector('#searchSummaryText').textContent.includes('0 道菜'));
    assert.equal(await page.locator('.search-result').count(),0);
    await page.locator('#cancelSearch').tap();
    // Keyboard users still get a visible focus indicator.
    await page.locator('#tableButton').focus();
    await page.locator('#tableButton').press('Enter');
    await page.locator('#closeSheet').focus();
    assert.equal(await page.locator('#closeSheet').evaluate(e=>getComputedStyle(e).outlineStyle),'solid');
    await page.keyboard.press('Escape');
    assert(await page.locator('#sheet').isHidden());
    await page.locator('#languageButton').tap();
    assert.equal(await page.locator('#tableButton').innerText(),'Set table');
    await page.locator('#searchButton').tap();
    assert.equal(await page.locator('#cancelSearch').innerText(),'Cancel');
    await page.locator('#cancelSearch').tap();
    assert.deepEqual(errors,[]);
    await context.close();
    console.log(`PASS ${width}: clear table action, small close target, touch/keyboard focus, table keyboard geometry, searchable unique fillings, visible cancel/results, Enter, zero results, language`);
  }
  console.log(`Screenshots: ${output}. Synthetic keyboard viewport; not real iPhone Safari.`);
} finally {await browser.close();}
