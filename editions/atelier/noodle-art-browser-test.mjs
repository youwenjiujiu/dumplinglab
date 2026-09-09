import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const out=new URL('./generated/red-oil-noodles-v1/verified/',import.meta.url).pathname;
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'});
try {
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:7898/?table=A1');
  const close=page.getByRole('button',{name:'关闭 / Close',exact:true});if(await close.isVisible())await close.click();
  const images=[];
  for(const kind of ['chilli','red-oil']) {
    const button=page.locator(`.dish-open[data-dish="lunch-v2-mince-${kind}-noodles"]`);
    await button.scrollIntoViewIfNeeded();
    const photo=button.locator('img');
    await photo.evaluate(i=>i.decode());
    const source=await photo.getAttribute('src');images.push(source);
    assert(source.endsWith(`lunch-mince-${kind}-noodles-generated-v1-appetite-v1.webp`));
    await button.screenshot({path:`${out}${kind}-list.png`});
    await button.click();
    const detail=page.locator('.detail-image img');await detail.evaluate(i=>i.decode());
    assert.equal(await detail.getAttribute('src'),source.replace('/s/','/l/'),'Detail uses the exact same dish art as its menu card');
    assert.equal(await page.locator('.detail-price').innerText(),'$10.80','Image correction must not change price');
    await page.locator('#sheet').screenshot({path:`${out}${kind}-detail.png`});
    await page.locator('#closeSheet').click();
  }
  assert.notEqual(images[0],images[1]);assert.deepEqual(errors,[]);
  console.log('PASS: chilli and red-oil noodles have distinct loaded images; list/detail agree; both prices preserved; no browser errors.');
} finally {await browser.close();}
