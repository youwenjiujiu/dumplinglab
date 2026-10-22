// Real browser inference in an isolated loopback preview. No production writes.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const state=await mkdtemp(resolve(tmpdir(),'dumpling-cutout-test-'));
const server=spawn(process.execPath,['editions/atelier/preview.mjs'],{cwd:root,env:{...process.env,PORT:'0',DL_PREVIEW_DATA:state},stdio:['ignore','pipe','pipe']});
let browser;
try {
 const origin=await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('Preview startup timed out')),10000);
  server.once('error',e=>{clearTimeout(timer);reject(e)});
  server.stdout.on('data',chunk=>{const m=chunk.toString().match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(timer);resolve(m[0])}});
 });
 assert.equal((await fetch(origin+'/api/online').then(r=>r.json())).config.preview,true);
 browser=await chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext({viewport:{width:1280,height:900}});
 await context.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/catalog-admin.html');
 await page.locator('[name=password]').fill('preview-only');await page.locator('#loginButton').click();
 await page.locator('[data-mode=image]').first().click();
 await page.locator('#photoFile').setInputFiles(process.env.DL_CUTOUT_TEST_IMAGE||resolve(root,'web/img/l/lunch-mini-pork-rice-generated-v1.webp'));
 await page.locator('#formMessage').filter({hasText:'照片已上传并预览'}).waitFor();
 const original=await page.locator('[name=imageUrl]').inputValue();
 await page.locator('#removeBackground').click();
 await page.locator('#formMessage').filter({hasText:'抠图完成'}).waitFor({timeout:100000});
 const cutout=await page.locator('[name=imageUrl]').inputValue();assert.notEqual(cutout,original);
 await page.locator('#photoPreview').evaluate(img=>img.decode());
 const alpha=await page.locator('#photoPreview').evaluate(img=>{
  const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
  const x=c.getContext('2d');x.drawImage(img,0,0);const p=x.getImageData(0,0,c.width,c.height).data;
  let plateRim=0;
  // This fixture's top rim is neutral white, while food-only extraction starts
  // here with red garnish or transparency. Check the actual rendered alpha/RGB.
  for(let y=Math.floor(c.height*.26);y<c.height*.31;y++)for(let x=Math.floor(c.width*.4);x<c.width*.6;x++){
   const i=(y*c.width+x)*4;if(p[i+3]>240&&Math.min(p[i],p[i+1],p[i+2])>210&&Math.max(p[i],p[i+1],p[i+2])-Math.min(p[i],p[i+1],p[i+2])<12)plateRim++;
  }
  let transparent=0,opaque=0;for(let i=3;i<p.length;i+=4){if(p[i]===0)transparent++;if(p[i]>240)opaque++}
  return {plateRim,width:c.width,height:c.height,transparent,opaque,pixels:c.width*c.height};
 });
 assert.equal(alpha.width,alpha.height);assert(alpha.transparent>alpha.pixels*.15);assert(alpha.opaque>alpha.pixels*.2);
 if(process.env.DL_CUTOUT_EXPECT_WHITE_PLATE==='1')assert(alpha.plateRim>alpha.pixels*.006,'White plate top rim must remain opaque, not just the food');
 if(process.env.DL_CUTOUT_PLATE_FIXTURE){
  const fixture=process.env.DL_CUTOUT_PLATE_FIXTURE;
  const plateSamples={
   '1040':[[700,335],[420,500],[1100,930],[1590,780],[1220,490]],
   '1048':[[960,320],[400,650],[1500,650],[960,1020],[420,800],[1490,850]],
   // Red peppers are food, not a red plate rim: protect the large white dish.
   '1030':[[960,320],[700,390],[400,650],[1500,650],[960,1020],[420,800],[1490,850]]
  };
  assert(plateSamples[fixture],`Unknown plate fixture ${fixture}`);
  const samples=plateSamples[fixture];
  const check=await page.evaluate(async({url,samples})=>{
   const worker=new Worker('/vendor/cutout/worker.js?v=plate-regression2',{type:'module'});
   try{
    const blob=await fetch(url).then(r=>r.blob());
    const result=await new Promise((resolve,reject)=>{
     worker.onerror=e=>reject(Error(e.message));worker.onmessage=({data})=>{if(data.error)reject(Error(data.error));else if(data.blob)resolve(data)};
     worker.postMessage({id:123,blob});
    });
    const bitmap=await createImageBitmap(result.blob),c=document.createElement('canvas');c.width=bitmap.width;c.height=bitmap.height;
    const ctx=c.getContext('2d');ctx.drawImage(bitmap,0,0);bitmap.close();
    const g=result.source;
    return {recovered:result.plateRecovered,curved:result.curved,points:samples.map(([x,y])=>{
     const px=Math.round(x/1919*g.width-g.x+g.offsetX),py=Math.round(y/1279*g.height-g.y+g.offsetY);
     return {x,y,alpha:ctx.getImageData(px,py,1,1).data[3]};
    })};
   }finally{worker.terminate()}
  },{url:original,samples});
  assert(check.recovered,'Plate contour must be detected');
  if(fixture==='1040')assert(check.curved,'Tilted red rim must use a continuous curve, not straight polygon edges');
  for(const p of check.points)assert(p.alpha>=245,`Plate rim/interior at ${p.x},${p.y} must remain opaque (alpha ${p.alpha})`);
 }
 await page.locator('#undoCutout').click();assert.equal(await page.locator('[name=imageUrl]').inputValue(),original);
 await page.locator('#removeBackground').click();await page.locator('#cancelCutout').click();
 await page.locator('#formMessage').filter({hasText:'已取消'}).waitFor();assert.equal(await page.locator('[name=imageUrl]').inputValue(),original);
 await page.locator('#removeBackground').click();await page.locator('#formMessage').filter({hasText:'抠图完成'}).waitFor({timeout:100000});
 const saved=await page.locator('[name=imageUrl]').inputValue();
 await page.locator('#save').click();await page.locator('#editor').waitFor({state:'hidden'});
 await page.locator('[data-mode=image]').first().click();assert.equal(await page.locator('[name=imageUrl]').inputValue(),saved,'Saved alpha image survives editor reload');
 await page.locator('#photoPreview').evaluate(img=>img.decode());
 assert.equal(await page.locator('#save').isDisabled(),false);assert.deepEqual(errors,[]);
 console.log('PASS real browser cutout: photo upload, actual WASM/model inference, transparent square, original-image undo, cancellation, save/reopen. No production or external photo-service calls.');
} finally {
 await browser?.close();server.kill('SIGTERM');
 await new Promise(resolve=>server.exitCode!==null?resolve():server.once('exit',resolve));
 await rm(state,{recursive:true,force:true});
}
