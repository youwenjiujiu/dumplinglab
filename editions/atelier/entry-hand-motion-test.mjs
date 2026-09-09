import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import sharp from 'sharp';
const out=new URL('./generated/entry-hand-motion-v1/verified/',import.meta.url).pathname;
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'});
try {
 for(const width of [320,390,768]) for(const reducedMotion of ['no-preference','reduce']) {
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion});const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:7898/?table=A1');
  const dine=page.locator('dl-dinein-serving'),take=page.locator('dl-takeaway-pickup');
  await dine.waitFor();await page.waitForFunction(()=>document.querySelector('dl-dinein-serving')?.shadowRoot);
  await page.waitForFunction(()=>document.querySelector('dl-takeaway-pickup')?.shadowRoot);
  for(const button of await page.locator('.entry-choices button').all()) {
   assert.equal(await button.evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)');
   assert.equal(await button.evaluate(e=>getComputedStyle(e).borderTopColor),'rgba(0, 0, 0, 0)');
  }
  assert.equal(await dine.locator('.table').count(),1,'Table is retained');
  assert.equal(await take.locator('.box').count(),1,'User requested the original takeaway animation restored');
  const bounds=await page.locator('.entry-choices').boundingBox();
  if(reducedMotion==='no-preference') {
   for(const progress of [0,.34,.5,.75,1]) {
    await dine.evaluate((e,p)=>e.setProgress(p),progress);await take.evaluate((e,p)=>e.setProgress(p),progress);
    assert.deepEqual(await page.locator('.entry-choices').boundingBox(),bounds,'Labels and allocation remain fixed');
    if(width===390)await page.locator('#sheet').screenshot({path:`${out}motion-${progress}.png`});
   }
   await dine.evaluate(e=>e.restart());assert(await dine.evaluate(e=>e.running));
   await dine.evaluate(e=>e.pause());assert(await dine.evaluate(e=>e.animations.every(a=>a.playState==='paused')));
  } else {
   assert.equal(await dine.evaluate(e=>e.animations.length),0);assert.equal(await take.evaluate(e=>e.animations.length),0);
  }
  await page.locator('#sheet').screenshot({path:`${out}entry-${width}-${reducedMotion}.png`});
  await page.locator('[data-fulfilment="dinein"]').click();
  await page.locator('#fulfilmentButton').waitFor();
  assert.equal(await page.locator('#fulfilmentButton').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(250, 247, 245)');
  assert.equal(await page.locator('.fulfilment-mode-icon').getAttribute('src'),'/brand/header-dinein-v1.svg');
  await page.locator('.masthead').screenshot({path:`${out}header-${width}.png`});
  assert.deepEqual(errors,[]);await page.close();
  console.log(`PASS entry ${width} ${reducedMotion}: transparent, stable controls, table retained, hand motions, readable resting state`);
 }
 const page=await browser.newPage({viewport:{width:390,height:900},reducedMotion:'reduce'});
 await page.goto('http://127.0.0.1:7898/?table=A1');await page.locator('[data-fulfilment="dinein"]').click();
 const tossed=page.locator('[data-lunch-prep="tossed"]');await tossed.scrollIntoViewIfNeeded();
 assert((await tossed.locator('img').getAttribute('src')).endsWith('appetite-v3.webp'));
 await page.locator('.lunch-preparations img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
 await page.locator('.lunch-preparations').screenshot({path:`${out}preparations.png`});
 const visibleWidths=[];
 for(const kind of ['scallion','chilli','red-oil']) {
  const b=page.locator(`[data-dish="lunch-v2-mince-${kind}-noodles"]`).first();await b.scrollIntoViewIfNeeded();
  const i=b.locator('img');await i.evaluate(e=>e.decode());
  const buf=await i.screenshot();const {data,info}=await sharp(buf).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let x0=info.width,x1=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){let j=(y*info.width+x)*4;const lo=Math.min(...data.subarray(j,j+3)),hi=Math.max(...data.subarray(j,j+3));if(lo<180&&hi-lo>18){x0=Math.min(x0,x);x1=Math.max(x1,x)}}
  visibleWidths.push(x1-x0);await b.screenshot({path:`${out}size-${kind}.png`});
 }
 assert(Math.max(...visibleWidths)-Math.min(...visibleWidths)<=4,`Visible bowls agree within 4px: ${visibleWidths}`);
 console.log('PASS new tossed image loaded; actual visible noodle bowl widths:',visibleWidths);
 await page.locator('#fulfilmentButton').click();await page.locator('[data-fulfilment="takeaway"]').click();
 await page.waitForFunction(()=>document.querySelector('.fulfilment-mode-icon')?.getAttribute('src')==='/brand/header-takeaway-v1.svg');
 await page.close();
} finally {await browser.close();}
