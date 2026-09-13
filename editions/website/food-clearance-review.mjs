// Project the actual food alpha into the viewport, rather than treating the
// transparent square around each cutout as a solid object. Shadow is excluded.
import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
const engine=process.argv.includes('--webkit')?'webkit':'chrome';
const density=process.argv.includes('--dense')?3:1;
const sweep=process.argv.includes('--sweep');
const viewports=sweep?[[320,760],[390,760],[390,844],[430,932]]:[320,390,430].map(width=>[width,900]);
const phases=sweep?[.16,.2,.24,.28,.32,.36,.4]:[.25,.35];
const browser=await(engine==='webkit'?webkit.launch():chromium.launch({channel:'chrome'}));
const cases=[];
try{
 for(const [width,height] of viewports)for(const lang of ['zh','en']){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:density});await page.goto('http://127.0.0.1:7903/?lang='+lang);await page.evaluate(()=>document.fonts.ready);
  for(const scene of [0,1,2]){
   await page.locator(`[data-course-index="${scene}"]`).click();await page.waitForFunction(scene=>document.querySelector(`[data-course-index="${scene}"]`).getAttribute('aria-pressed')==='true',scene);
   await page.locator('#stageImage').evaluate(img=>img.decode());await page.mouse.move(0,0);
   await page.waitForFunction(()=>document.getAnimations().filter(a=>a.effect?.target?.id==='stageImage').every(a=>a.playState==='finished')&&getComputedStyle(document.querySelector('#productStage')).getPropertyValue('--pointer-x')==='0px');
   await page.evaluate(()=>{for(const a of document.getAnimations())if(a.effect?.target?.classList.contains('product-float')){a.pause();a.currentTime=0}});
   for(const progress of phases){
    await page.evaluate(p=>{const story=document.querySelector('#cinema'),stage=document.querySelector('#productStage'),header=document.querySelector('.site-header');scrollTo({top:story.offsetTop-header.offsetHeight+(story.offsetHeight-stage.offsetHeight)*p,behavior:'instant'})},progress);
    await page.waitForFunction(p=>Math.abs(new DOMMatrixReadOnly(getComputedStyle(document.querySelector('#storyProgress')).transform).a-p)<.002,progress);
    const result=await page.evaluate(()=>{
     const detailStyle=getComputedStyle(document.querySelector('#stageDetail'));
     const detailOpacity=+getComputedStyle(document.querySelector('#productStage')).getPropertyValue('--detail-opacity');
     if(detailStyle.visibility==='hidden'||detailOpacity===0)return{collisions:[],detailOpacity,visibleCopy:false};
     const img=document.querySelector('#stageImage'),product=document.querySelector('#stageProduct'),style=getComputedStyle(product),box=product.getBoundingClientRect(),matrix=new DOMMatrixReadOnly(style.transform);
     const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(img,0,0);const rgba=context.getImageData(0,0,canvas.width,canvas.height).data;
     const regions=['#stageDetail>.eyebrow','#detailTitle','#detailCopy'].flatMap(selector=>{const range=document.createRange();range.selectNodeContents(document.querySelector(selector));return[...range.getClientRects()].filter(r=>r.width>0).map(r=>({selector,left:r.left+2,right:r.right-2,top:r.top+2,bottom:r.bottom-2}))});
     const collisions=[];
     for(const region of regions){let count=0;
      for(let y=0;y<canvas.height;y+=5)for(let x=0;x<canvas.width;x+=5){if(rgba[(y*canvas.width+x)*4+3]<128)continue;
       const localX=((x+.5)/canvas.width-.5)*parseFloat(style.width),localY=((y+.5)/canvas.height-.5)*parseFloat(style.height);
       const pointX=box.x+box.width/2+matrix.a*localX+matrix.c*localY,pointY=box.y+box.height/2+matrix.b*localX+matrix.d*localY;
       if(pointX>region.left&&pointX<region.right&&pointY>region.top&&pointY<region.bottom)count++;
      }
      if(count)collisions.push({selector:region.selector,samples:count});
     }
     return{collisions,detailOpacity,visibleCopy:true};
    });
    cases.push({width,height,lang,scene,progress,...result});
    if(result.collisions.length)await page.screenshot({path:`${out}/${width}x${height}-${lang}-${scene}-${progress}-overlap.png`});
   }
  }
  await page.close();
 }
}finally{await browser.close()}
const overlaps=cases.filter(c=>c.collisions.length);await writeFile(out+'/report.json',JSON.stringify({engine,density,cases,overlaps},null,2));console.log(JSON.stringify({engine,density,cases:cases.length,overlaps:overlaps.length,out},null,2));
if(!process.argv.includes('--audit'))assert.equal(overlaps.length,0,'Food must clear readable close-up copy');
