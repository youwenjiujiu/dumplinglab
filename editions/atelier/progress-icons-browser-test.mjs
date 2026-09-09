import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import sharp from 'sharp';
const out=new URL('./generated/progress-icons-v2/verified/',import.meta.url).pathname;
await mkdir(out,{recursive:true});
const stages=['received','preparing','ready','collected'];
for(const s of stages){
 const input=new URL(`../../web/img/s/progress-${s}-${['preparing','collected'].includes(s)?'v3':'v2'}.webp`,import.meta.url);
 const metadata=await sharp(input.pathname).metadata();assert(metadata.hasAlpha,`${s} preserves alpha`);
 const {data,info}=await sharp(input.pathname).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let transparent=0;for(let i=3;i<data.length;i+=4)if(data[i]===0)transparent++;
 assert(transparent/(info.width*info.height)>.2,`${s} has a genuine transparent background`);
}
const browser=await chromium.launch({headless:true,channel:'chrome'});
try {
 for(const width of [320,390,768]) {
  const page=await browser.newPage({viewport:{width,height:960},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:7898/?table=A1');await page.locator('[data-fulfilment="dinein"]').click();
  for(let i=0;i<4;i++) {
   // Render the actual UI function with local fixtures, never create an order or call a payment API.
   await page.evaluate(index=>{
    const order={id:'icon-art-review',mode:'takeaway',status:'paid',pickup:{number:'T0061',date:'09 / 09 / 2026',qr:'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"/%3E'},...(index>=1?{preparingAt:1}:{}),...(index>=2?{readyAt:2}:{}),...(index>=3?{collectedAt:3}:{})};
    let host=document.querySelector('#iconArtReview');if(!host){host=document.createElement('div');host.id='iconArtReview';host.style.cssText='position:fixed;inset:0;z-index:99999;background:white;padding:20px;overflow:auto;max-width:560px;margin:auto';document.body.append(host)}
    host.innerHTML=Fulfilment.pickupTicket(order);
   },i);
   const ticket=page.locator('#iconArtReview');const icons=ticket.locator('.progress-generated-icon');
   assert.equal(await icons.count(),4);await icons.evaluateAll(imgs=>Promise.all(imgs.map(im=>im.decode())));
   assert.equal(await ticket.locator('[aria-current="step"] .progress-art').getAttribute('class'),`progress-art progress-art--${stages[i]}`);
   assert.equal(await ticket.locator('[aria-current="step"] img').evaluate(e=>getComputedStyle(e).filter),'none');
   assert.equal(await ticket.locator('.pickup-qr').count(),i===3?0:1);
   const row=ticket.locator('.pickup-progress');const bounds=await row.boundingBox();assert(bounds.width<=width-40);
   await row.screenshot({path:`${out}${width}-${stages[i]}.png`});
  }
  assert.deepEqual(errors,[]);await page.close();console.log(`PASS ${width}: four transparent loaded icons, real stage selection, current highlight, QR retirement`);
 }
}finally{await browser.close()}
