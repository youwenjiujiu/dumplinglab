// Pixel alpha checks for a WebKit preview-notice paint defect. Local browser
// contexts only; production-shaped HTML is a fixture, not a live deployment.
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import sharp from 'sharp';
import {launchBrowser,browserEngine} from './browser-test-runtime.mjs';
const origin='http://127.0.0.1:7898';
const config=await fetch(`${origin}/api/online`).then(r=>r.json());
assert.equal(config.config?.preview,true,'paint checks must stay on the simulated local preview');
const source=await readFile(new URL('./index.html',import.meta.url),'utf8');
const releaseShape=source.replace('<html lang="zh-CN">','<html lang="zh-CN" data-environment="production">').replace(/<div class="preview-notice" id="previewNotice">[\s\S]*?<\/div>/,'');
const output=new URL(`./test-output/surface-paint/${browserEngine}/`,import.meta.url).pathname;
await mkdir(output,{recursive:true});
const browser=await launchBrowser();
try {
  for(const width of [320,390,724]) for(const lang of ['zh','en']) for(const preview of [true,false]) {
    const context=await browser.newContext({viewport:{width,height:844},reducedMotion:'reduce'});
    const page=await context.newPage();
    if(!preview)await page.route(`${origin}/?lang=${lang}`,r=>r.fulfill({contentType:'text/html',body:releaseShape}));
    await page.goto(`${origin}/?lang=${lang}`);
    await page.locator('.entry-art').first().waitFor();
    await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.querySelectorAll('.entry-art')].map(img=>img.decode()));});
    assert.equal(await page.locator('#previewNotice').count(),preview?1:0);
    const screenshot=await page.screenshot({path:`${output}${preview?'preview':'release-shape'}-${lang}-${width}.png`});
    const {data,info}=await sharp(screenshot).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    let transparent=0;
    for(let y=0;y<18;y++)for(let x=0;x<width;x++)if(data[(y*info.width+x)*info.channels+3]!==255)transparent++;
    assert.equal(transparent,0,`${browserEngine} ${width}/${lang}/${preview?'preview':'release-shape'}: the top surface must have no transparent paint holes`);
    // Away from the label, both top corners are the same white paper + scrim.
    const pixel=(x,y)=>[...data.slice((y*info.width+x)*info.channels,(y*info.width+x)*info.channels+3)];
    assert.deepEqual(pixel(5,5),pixel(width-6,5),'scrim tone remains continuous across the full width');
    await page.locator('[data-fulfilment="takeaway"]').click();
    assert.equal(await page.locator('#sheet').isVisible(),false);
    // Mode rendering and the bilingual fit pass finish before the next paint.
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const size=await page.evaluate(()=>({page:document.documentElement.scrollWidth,viewport:innerWidth}));
    assert(size.page<=size.viewport,`${browserEngine} ${width}/${lang}/${preview}: paint isolation must not change page width: ${JSON.stringify(size)}`);
    await context.close();
    console.log(`PASS ${browserEngine} ${width} ${lang} ${preview?'preview':'release-shape'}: opaque paper surface, continuous scrim, chooser remains usable`);
  }
}finally{await browser.close();}
