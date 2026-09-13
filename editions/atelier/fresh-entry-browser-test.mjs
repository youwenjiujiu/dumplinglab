// Fresh, isolated browser contexts. Production requests are read-only.
import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const origin=process.argv[2] || 'http://127.0.0.1:7898';
const out=new URL('./test-output/fresh-entry/',import.meta.url);
await mkdir(out,{recursive:true});
for(const [name,type] of [['chrome',chromium],['webkit',webkit]]) {
  const browser=await type.launch({headless:true,...(name==='chrome'?{channel:'chrome'}:{})});
  try {
    for(const mode of ['takeaway','dinein']) {
      const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,
        userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.64'});
      const page=await context.newPage(),writes=[],errors=[];
      await page.route('**/api/**', async route=>{
        if(route.request().method()!=='GET'){writes.push(route.request().method()+' '+new URL(route.request().url()).pathname);return route.abort();}
        return route.continue();
      });
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto(origin);
      await page.locator(`[data-fulfilment="${mode}"]`).tap();
      assert.equal(await page.locator('#trayPictures img').count(),0,'Fresh entry must not select a dish');
      assert.equal(await page.locator('#trayLabel').innerText(),'尚未选菜');
      if(mode==='takeaway') {
        for(const category of ['noodles','sides','drinks']) {
          const tab=page.locator(`#categoryScroll [data-category="${category}"]`);
          await tab.tap();
          assert.equal(await page.locator('#trayPictures img').count(),0,'Browsing categories cannot add dishes');
        }
        await page.reload();
        await page.locator('[data-fulfilment="takeaway"]').tap();
        assert.equal(await page.locator('#trayPictures img').count(),0,'Empty cart remains empty after reload');
        assert.equal(await page.locator('#trayLabel').innerText(),'尚未选菜');
      }
      await page.screenshot({path:new URL(`${new URL(origin).hostname}-${name}-${mode}.png`,out).pathname});
      assert.deepEqual(writes,[],'No cart/order/payment writes while simply entering or browsing');
      assert.deepEqual(errors,[]);
      console.log(`PASS ${name} ${mode}: fresh entry/reload empty; zero API writes; WeChat-style mobile user agent`);
      await context.close();
    }
  } finally {await browser.close();}
}
