// Opening food/name separation, using opaque cutout pixels, not image padding.
import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
const engine=process.argv.includes('--webkit')?'webkit':'chrome';
const longNames=process.argv.includes('--long-names');
const largeText=process.argv.includes('--large-text');
const textSize=Number(process.argv.find(value=>value.startsWith('--text-size='))?.split('=')[1]||200);assert(textSize>=100&&textSize<=300);
const browser=await(engine==='webkit'?webkit.launch():chromium.launch({channel:'chrome'})),rows=[];
try{
 for(const [width,height] of [[1440,900],[1920,1080],[2560,1440],[820,1180],[390,844],[430,932],[320,760],[320,568]])for(const lang of ['zh','en']){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  if(longNames)await page.route('**/api/catalog',async route=>{const response=await route.fetch(),data=await response.json();data.revision+=1000;data.items=data.items.map(d=>({...d,name:'Catalogue item name for layout testing '.repeat(5).slice(0,120),cn:'用于排版测试的较长菜品名称'.repeat(10).slice(0,120)}));await route.fulfill({response,json:data})});
  await page.goto('http://127.0.0.1:7903/?lang='+lang);await page.evaluate(()=>document.fonts.ready);
  if(largeText)await page.addStyleTag({content:':root{font-size:'+textSize+'%!important}'});
  if(longNames)await page.evaluate(()=>CatalogClient.ready);
  for(const scene of [0,1,2]){
   await page.locator(`[data-course-index="${scene}"]`).click();await page.waitForFunction(i=>document.querySelector(`[data-course-index="${i}"]`).getAttribute('aria-pressed')==='true',scene);
   await page.locator('#stageImage').evaluate(img=>img.decode());
   await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
   const result=await page.evaluate(()=>{
    const img=document.querySelector('#stageImage'),product=document.querySelector('#stageProduct'),style=getComputedStyle(product),box=product.getBoundingClientRect(),matrix=new DOMMatrixReadOnly(style.transform);
    const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);const rgba=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    const range=document.createRange();range.selectNodeContents(document.querySelector('.stage-caption h2'));
    const titleBox=document.querySelector('.stage-caption h2').getBoundingClientRect();
    const regions=[...range.getClientRects()].map(r=>({left:Math.max(r.left,titleBox.left),right:Math.min(r.right,titleBox.right),top:Math.max(r.top,titleBox.top),bottom:Math.min(r.bottom,titleBox.bottom)})).filter(r=>r.right>r.left&&r.bottom>r.top),points=[];
    for(let y=0;y<canvas.height;y+=5)for(let x=0;x<canvas.width;x+=5){if(rgba[(y*canvas.width+x)*4+3]<128)continue;
     const lx=((x+.5)/canvas.width-.5)*parseFloat(style.width),ly=((y+.5)/canvas.height-.5)*parseFloat(style.height);
     points.push({x:box.x+box.width/2+matrix.a*lx+matrix.c*ly,y:box.y+box.height/2+matrix.b*lx+matrix.d*ly});
    }
    const gaps=regions.map(r=>{const matching=points.filter(p=>p.x>r.left&&p.x<r.right);return matching.length?r.top-Math.max(...matching.map(p=>p.y)):Infinity});
    return{gap:Math.min(...gaps),headerGap:Math.min(...points.map(p=>p.y))-document.querySelector('.site-header').getBoundingClientRect().bottom,collisions:regions.reduce((n,r)=>n+points.filter(p=>p.x>r.left&&p.x<r.right&&p.y>r.top&&p.y<r.bottom).length,0)};
   });
   rows.push({width,height,lang,scene,...result});
   if(result.gap<8||result.headerGap<0)await page.screenshot({path:`${out}/${width}x${height}-${lang}-${scene}.png`});
  }
  assert.deepEqual(errors,[]);await page.close();
 }
}finally{await browser.close()}
await writeFile(out+'/report.json',JSON.stringify({engine,longNames,largeText,textSize,rows},null,2));console.log(JSON.stringify({engine,longNames,largeText,textSize,cases:rows.length,tightest:[...rows].sort((a,b)=>a.gap-b.gap).slice(0,10)},null,2));
if(!process.argv.includes('--audit'))assert(rows.every(r=>r.collisions===0),'Opening food must not overlap its name');
