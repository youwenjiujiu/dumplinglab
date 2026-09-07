import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
const output=new URL('./test-output/add-confirmation/',import.meta.url).pathname;
await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
try {
  for(const width of [320,390,724]) for(const lang of ['zh','en']) {
    const context=await browser.newContext({viewport:{width,height:844},reducedMotion:'reduce'});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:7898/?lang=${lang}`);
    await page.locator('[data-fulfilment="takeaway"]').click();
    await page.locator('.dish-add[data-recommendation="chive-fried"]').click();
    await page.locator('[data-action="add-detail"]').click();
    await page.locator('body > #toast[data-kind="added"]').waitFor();
    await page.locator('#trayPictures img').first().evaluate(img=>img.decode());
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    assert.equal(await page.locator('#toast > span').first().innerText(),lang==='zh'?'已加入':'Added');
    assert((await page.locator('.toast-announcement').textContent()).length>10,'dish and quantity remain available to screen readers');
    assert.equal(await page.locator('#toast').getAttribute('role'),'status');
    const geometry=await page.locator('#toast').evaluate(el=>{
      const r=el.getBoundingClientRect(), tray=document.querySelector('.table-tray').getBoundingClientRect(),s=getComputedStyle(el);
      return {w:r.width,h:r.height,left:r.left,right:r.right,bottom:r.bottom,trayTop:tray.top,bg:s.backgroundColor,pointer:s.pointerEvents};
    });
    assert(geometry.w<130 && geometry.h<=44,'small confirmation, no long dish label');
    assert(geometry.left>=0 && geometry.right<=width);
    assert(geometry.bottom<=geometry.trayTop-10,'clear of cart controls');
    assert.equal(geometry.bg,'rgb(255, 255, 255)');
    assert.equal(geometry.pointer,'none');
    await page.screenshot({path:`${output}added-${lang}-${width}.png`});
    await page.locator('#toast').waitFor({state:'hidden',timeout:3000});
    await page.locator('#tray').click();
    await page.locator('[data-cart-delta="-1"]').click();
    await page.locator('#toast [data-action="undo-remove"]').waitFor();
    assert.equal(await page.locator('#toast').getAttribute('data-kind'),'undo');
    assert.notEqual(await page.locator('#toast').evaluate(el=>getComputedStyle(el).pointerEvents),'none','undo is still interactive');
    await page.locator('[data-action="undo-remove"]').click();
    assert.equal(await page.locator('.shared-dish').count(),1,'undo restores the removed item');
    assert.deepEqual(errors,[]);
    await context.close();
    console.log(`PASS add confirmation ${width} ${lang}: compact white pill, survives detail close, expires, undo intact`);
  }
} finally { await browser.close(); }
console.log(output);
