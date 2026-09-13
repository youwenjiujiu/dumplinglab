// Isolated local QA, using this repository's existing Playwright dependency.
// Does not attach to the user's Chrome profile, cookies or open tabs.
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
const pass=process.argv[2]||'structural-pass',clay=!['material-pass','surface-pass','lighting-pass','interaction-pass','optimization-pass'].includes(pass);
const dir=new URL('./generated/storefront-3d/',import.meta.url).pathname;
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'});
try{
 const page=await browser.newPage({viewport:{width:705,height:610},deviceScaleFactor:1});
 page.on('pageerror',e=>{throw e;});
 for(const view of ['front','left','right','hero']){
  await page.goto(`http://127.0.0.1:7898/brand/storefront-review.html?view=${view}${clay?'&clay=1':''}`);
  await page.locator('body[data-ready="true"]').waitFor();
  await page.screenshot({path:`${dir}${pass}-${view}.png`});
  console.log(view,await page.locator('#stats').textContent());
 }
}finally{await browser.close();}
