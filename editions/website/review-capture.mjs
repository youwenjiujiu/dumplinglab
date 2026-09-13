// Full-resolution evidence of the implementation. These are browser captures,
// not generated design mockups. Kept outside the deployable website directory.
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile,access} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
if(!process.argv[2])throw new Error('Pass an explicit checkpoint directory');
const out=resolve(process.argv[2]),bundleIndex=process.argv.indexOf('--bundle');
const bundle=bundleIndex<0?null:resolve(process.argv[bundleIndex+1]);
const exists=await access(resolve(out,'capture-manifest.json')).then(()=>true,()=>false);
if(exists&&!process.argv.includes('--replace'))throw new Error('Checkpoint already exists; use a new directory');
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const scenes=['fried','chilli','broth'],manifest=[];
try{
 for(const [device,width,height,density] of [['desktop',1440,900,2],['phone',390,844,3]]){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:density,reducedMotion:'reduce'});
  if(bundle)await page.route('http://127.0.0.1:7903/**',async route=>{
   const path=new URL(route.request().url()).pathname;if(path.startsWith('/api/'))return route.continue();
   const file=resolve(bundle,'.'+(path==='/'?'/index.html':path));
   if(!file.startsWith(bundle+sep))return route.abort();
   const contentType={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'}[extname(file)]||'application/octet-stream';
   try{await route.fulfill({body:await readFile(file),contentType})}catch{await route.fulfill({status:404,body:'Archive asset unavailable'})}
  });
  await page.goto('http://127.0.0.1:7903/?lang=zh');await page.evaluate(async()=>{await document.fonts.ready;await document.querySelector('.logo img').decode()});
  for(let i=0;i<scenes.length;i++){
   await page.locator(`[data-course-index="${i}"]`).click();await page.waitForFunction(key=>document.querySelector('#productStage').dataset.course===key,scenes[i]);await page.locator('#stageImage').evaluate(e=>e.decode());
   const file=`${device}-${scenes[i]}.png`;await page.screenshot({path:resolve(out,file)});manifest.push({file,viewport:{width,height},density,scene:scenes[i],source:'Actual local Chromium screenshot'});
  }
  await page.locator('[data-course-index="0"]').click();
  for(const section of ['film','food','space','visit']){
   await page.locator('#'+section).evaluate(e=>scrollTo({top:e.offsetTop-document.querySelector('.site-header').offsetHeight,behavior:'instant'}));
   await page.locator('#'+section+' img').evaluateAll(images=>Promise.all(images.filter(e=>e.getBoundingClientRect().width>0).map(e=>e.decode())));
   const file=`${device}-${section}.png`;await page.screenshot({path:resolve(out,file)});manifest.push({file,viewport:{width,height},density,section,source:'Actual local Chromium screenshot'});
  }
  await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
  const footerFile=`${device}-footer.png`;await page.screenshot({path:resolve(out,footerFile)});manifest.push({file:footerFile,viewport:{width,height},density,section:'footer',source:'Actual local Chromium screenshot'});
  await page.goto('http://127.0.0.1:7903/?lang=en');await page.evaluate(()=>document.fonts.ready);
  for(let i=0;i<scenes.length;i++){
   await page.locator(`[data-course-index="${i}"]`).click();await page.waitForFunction(key=>document.querySelector('#productStage').dataset.course===key,scenes[i]);await page.locator('#stageImage').evaluate(e=>e.decode());
   const file=`${device}-en-${scenes[i]}.png`;await page.screenshot({path:resolve(out,file)});manifest.push({file,viewport:{width,height},density,scene:scenes[i],language:'en',source:'Actual local Chromium screenshot'});
  }
  await page.close();
 }
}finally{await browser.close()}
await writeFile(resolve(out,'capture-manifest.json'),JSON.stringify({captured:new Date().toISOString(),archiveBundle:bundle,publicDeployment:false,captures:manifest},null,2));console.log(out);
