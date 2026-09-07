// Local, fresh contexts. No production orders. Keyboard geometry is synthetic.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const output=await mkdtemp(join(tmpdir(),'dumpling-form-layout-'));
const browser=await chromium.launch({channel:'chrome'});
try {
  for(const width of [320,390,768]) for(const lang of ['zh','en']) {
    const context=await browser.newContext({viewport:{width,height:900},hasTouch:true,reducedMotion:'reduce'});
    await context.addInitScript(()=>{
      const native=visualViewport, mock=new EventTarget();let height=null,top=0;
      Object.defineProperties(mock,{height:{get:()=>height??native.height},offsetTop:{get:()=>top},width:{get:()=>native.width},scale:{get:()=>1}});
      Object.defineProperty(window,'visualViewport',{value:mock});
      window.keyboardFixture=(h,t=0)=>{height=h;top=t;mock.dispatchEvent(new Event('resize'));};
    });
    const page=await context.newPage(), errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:7898/');
    await page.locator('[data-fulfilment="dinein"]').click();
    await page.locator('.recommendation-card').first().waitFor();
    if(lang==='en')await page.locator('#languageButton').tap();
    const assertGap=async (a,b,min=12)=>{
      const x=await page.locator(a).boundingBox(),y=await page.locator(b).boundingBox();
      assert(y.y-(x.y+x.height)>=min-1,`${a} → ${b}: real gap at least ${min}px`);
    };
    const assertScrim=async()=>{
      assert(await page.locator('html').evaluate(e=>e.classList.contains('has-open-sheet')));
      const scrim=await page.locator('html').evaluate(e=>{
        const s=getComputedStyle(e,'::before');return {position:s.position,top:parseFloat(s.top),bottom:parseFloat(s.bottom),background:s.backgroundColor};
      });
      assert.equal(scrim.position,'fixed');assert(scrim.top<0&&scrim.bottom<0,'scrim overscans viewport on both ends');
      assert.notEqual(scrim.background,'rgba(0, 0, 0, 0)');
      assert.equal(await page.locator('#sheet').evaluate(e=>getComputedStyle(e,'::backdrop').backdropFilter),'none');
      assert.equal(await page.locator('body').evaluate(e=>getComputedStyle(e).position),'fixed');
    };
    await page.locator('#tableButton').tap();
    assert.equal(await page.locator('#sheetTitle').innerText(),lang==='zh'?'输入桌号':'Table number');
    assert(await page.locator('#sheetEyebrow').isHidden());
    assert.equal(await page.locator('#tableEntry').evaluate(e=>e===document.activeElement),false);
    await assertGap('#tableEntry','#tableEntryForm button');await assertScrim();
    await page.locator('#tableEntry').tap();await page.evaluate(()=>keyboardFixture(360,28));
    if(width<=760){
      await page.waitForFunction(()=>document.documentElement.classList.contains('keyboard-open'));
      const b=await page.locator('#tableEntryForm button').boundingBox();assert(b.y+b.height<=388);
    }
    await assertGap('#tableEntry','#tableEntryForm button');
    await page.screenshot({path:join(output,`table-${lang}-${width}.png`)});
    await page.locator('#tableEntry').fill('#');await page.locator('#tableEntry').press('Enter');
    await page.waitForFunction(()=>document.querySelector('#tableEntryError').textContent.length>0);
    await assertGap('#tableEntry','#tableEntryError');await assertGap('#tableEntryError','#tableEntryForm button');
    assert.equal(await page.locator('#tableEntryError').getAttribute('role'),'alert');
    await page.locator('#closeSheet').tap();await page.evaluate(()=>keyboardFixture(null));
    assert.equal(await page.locator('html').evaluate(e=>e.classList.contains('has-open-sheet')),false);
    assert.notEqual(await page.locator('body').evaluate(e=>getComputedStyle(e).position),'fixed');

    // Add a browsing-only draft to exercise notes, name and checkout entry.
    await page.locator('.dish-add[data-recommendation="chive-fried"]').tap();
    await page.locator('[data-action="add-detail"]').tap();
    await page.locator('#tray').tap();
    assert.equal(await page.locator('.shared-dish').count(),1,'browsing draft added before note/name checks');
    await page.locator('[data-action="nickname"]').tap();
    assert.equal(await page.locator('#nickname').evaluate(e=>e===document.activeElement),false);
    await page.locator('#nickname').tap();await page.evaluate(()=>keyboardFixture(360,28));
    await page.locator('#nickname').fill('youwen');
    await assertGap('#nickname','#nicknameHint');await assertGap('#nicknameHint','[data-action="save-nickname"]');
    await assertScrim();
    await page.screenshot({path:join(output,`name-${lang}-${width}.png`)});
    await page.locator('[data-action="save-nickname"]').tap();await page.evaluate(()=>keyboardFixture(null));
    assert.equal(await page.locator('#sheet').getAttribute('data-mode'),'cart',JSON.stringify(errors));
    assert.equal(await page.locator('.shared-dish').count(),1,JSON.stringify(errors));
    await page.locator('#cartNote').tap();
    await page.locator('#cartNote').fill(lang==='zh'?'不要香菜':'No coriander');
    await page.evaluate(()=>keyboardFixture(420,28));
    if(width<=760){
      await page.waitForFunction(()=>{
        const r=document.querySelector('#cartNote').getBoundingClientRect();return r.top>=28&&r.bottom<=448;
      });
      const footer=await page.locator('.cart-checkout').boundingBox();assert(footer.y+footer.height<=448);
    }
    assert.equal(await page.locator('#cartNote').evaluate(e=>getComputedStyle(e).fontSize),'16px');
    await assertScrim();
    await page.screenshot({path:join(output,`note-${lang}-${width}.png`)});
    await page.locator('#cartNote').blur();await page.evaluate(()=>keyboardFixture(null));
    await page.locator('[data-action="review"]').tap();
    await page.locator('#tableEntryForm').waitFor();
    assert.equal(await page.locator('#tableEntryForm button').innerText(),lang==='zh'?'继续':'Continue');
    await assertGap('#tableEntry','#tableEntryForm button');
    await page.locator('#closeSheet').tap();

    // Modal and search should restore the exact page scroll instead of jumping.
    await page.evaluate(()=>window.scrollTo({top:600,behavior:'instant'}));
    const before=await page.evaluate(()=>scrollY);
    await page.locator('#categoryButton').tap();await assertScrim();
    await page.locator('#closeSheet').tap();
    assert(Math.abs(await page.evaluate(()=>scrollY)-before)<2,'modal restores document scroll');
    await page.locator('#searchButton').tap();
    assert.equal(await page.locator('.search-result').count(),0);
    await page.locator('#cancelSearch').tap();
    assert(Math.abs(await page.evaluate(()=>scrollY)-before)<2,'search restores document scroll');
    assert.deepEqual(errors,[]);
    await context.close();console.log(`PASS ${lang} ${width}: table + validation gaps, nickname + hint + button gaps, note/checkout keyboard frame, continuous scrim and restored scroll`);
  }
  console.log(`Screenshots: ${output}. Keyboard simulation, not a real iPhone.`);
}finally{await browser.close();}
