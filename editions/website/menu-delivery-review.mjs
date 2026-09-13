import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
const engine=process.argv.includes('--webkit')?'webkit':'chrome';
const browser=await(engine==='webkit'?webkit.launch({headless:true}):chromium.launch({channel:'chrome',headless:true}));
const report=[];
try{
 for(const [width,scale] of [[1024,1],[1440,1],[390,1],[320,2]]){
  const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:2,reducedMotion:'reduce'});
  await page.goto('http://127.0.0.1:7903/?lang=zh');await page.evaluate(()=>CatalogClient.ready);
  await page.evaluate(scale=>document.documentElement.style.fontSize=scale*100+'%',scale);
  await page.locator('#food').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>[...document.querySelectorAll('.food-image img')].every(img=>img.complete&&img.naturalWidth>0));
  await page.waitForFunction(()=>[...document.querySelectorAll('.food-image img')].every(img=>Math.abs(parseFloat(img.sizes)-img.parentElement.getBoundingClientRect().width)<1.1));
  const images=await page.locator('.food-image img').evaluateAll(imgs=>imgs.map(img=>({sizes:img.sizes,width:img.parentElement.getBoundingClientRect().width,source:img.currentSrc})));
  if(width===1024)assert(images.every(img=>img.source.includes('/img/s/')),'Tablet cards use the sufficient 720px image instead of the old two-column large image');
  assert(images.every(img=>Math.abs(parseFloat(img.sizes)-img.width)<1.1));
  await page.screenshot({path:`${out}/${width}-${scale}.png`});
  report.push({width,scale,images});await page.close();
 }
}finally{await browser.close()}
await writeFile(`${out}/report.json`,JSON.stringify({engine,cases:report},null,2));console.log(JSON.stringify({engine,passed:report.length}));
