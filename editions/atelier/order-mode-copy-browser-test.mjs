// Local browsing and cart edits only; no orders, calls or payments.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
const output = new URL('./test-output/order-mode-copy/', import.meta.url).pathname;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
try {
  for (const width of [320, 390, 1280]) for (const mode of ['dinein','takeaway','delivery']) {
    const context = await browser.newContext({ viewport:{width,height:900}, reducedMotion:'reduce' });
    const page=await context.newPage(), errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto('http://127.0.0.1:7898/');
    await page.locator(`[data-fulfilment="${mode}"]`).click();
    for (const lang of ['en','zh']) {
      await page.locator('#languageButton').click();
      const remote=mode!=='dinein';
      const check=async()=>{
        assert.equal(await page.locator('#trayActionLabel').innerText(),remote?(lang==='zh'?'查看订单':'View order'):(lang==='zh'?'查看本桌':'View table'));
        const aria=await page.locator('#tray').getAttribute('aria-label');
        if(remote)assert(!/本桌|our table/i.test(aria),'remote accessible name never mentions table');
        assert.equal(await page.locator('#desktopTicket .ticket-table').count(),remote?0:1,'no fake table for remote orders');
        const title=await page.locator('#desktopTicket h3').innerText();
        if(remote)assert.equal(title,mode==='takeaway'?(lang==='zh'?'打包自取':'Pickup'):(lang==='zh'?'外送':'Delivery'));
        if(mode==='delivery')assert.equal(await page.locator('.ticket-summary > span').innerText(),lang==='zh'?'预估总额':'Estimated total');
      };
      await check();
      await page.locator('.dish-add[data-recommendation="chicken-fried"]').click();
      await page.locator('[data-action="add-detail"]').click();
      await check();
      if(remote)assert(!/本桌|view table/i.test(await page.locator('#trayPictures').getAttribute('aria-label')));
      await page.screenshot({path:`${output}${mode}-${lang}-${width}.png`});
      await page.locator('#tray').click();
      await page.locator('[data-cart-delta="-1"]').click();
      await page.locator('#closeSheet').click();
      await check();
    }
    assert.deepEqual(errors,[]);
    await context.close();
    console.log(`PASS mode-specific labels after language/add/remove: ${width} ${mode}`);
  }
} finally { await browser.close(); }
