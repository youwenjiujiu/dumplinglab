// Lab-only mobile loading check under explicitly simulated network/CPU limits.
// These timings are not real-user Core Web Vitals or physical phone results.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
const cdp=await page.context().newCDPSession(page);
await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:93750});
await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
await page.addInitScript(()=>{
 window.loadingMetrics={lcp:[],shifts:[],heroPresentedAt:null};
 new MutationObserver(entries=>{if(entries.some(e=>e.target.id==='productStage'&&e.target.dataset.imageReady==='true')&&loadingMetrics.heroPresentedAt===null)requestAnimationFrame(()=>requestAnimationFrame(()=>{loadingMetrics.heroPresentedAt=performance.now()}))}).observe(document,{subtree:true,attributes:true,attributeFilter:['data-image-ready']});
 new PerformanceObserver(list=>{for(const e of list.getEntries())loadingMetrics.lcp.push({time:e.startTime,size:e.size,node:e.element?.id,url:e.url})}).observe({type:'largest-contentful-paint',buffered:true});
 new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)loadingMetrics.shifts.push({value:e.value,time:e.startTime,sources:e.sources.map(s=>({node:s.node?.id||s.node?.className||s.node?.tagName,previous:s.previousRect.toJSON(),current:s.currentRect.toJSON()}))})}).observe({type:'layout-shift',buffered:true});
});
try{
 await page.goto('http://127.0.0.1:7903/?lang=zh',{waitUntil:'domcontentloaded'});
 await page.screenshot({path:out+'/dom-ready.png'});
 await page.evaluate(async()=>{await document.fonts.ready;await document.querySelector('#stageImage').decode()});
 await page.waitForFunction(()=>document.getAnimations().filter(a=>a.effect?.target?.id==='stageImage').every(a=>a.playState==='finished'));
 await page.screenshot({path:out+'/loaded.png'});
 const report=await page.evaluate(()=>({simulation:'390×844 DPR 2; 150 ms RTT, 1.6 Mbps down, 4× CPU slowdown; localhost',...loadingMetrics,paints:performance.getEntriesByType('paint').map(e=>({name:e.name,time:e.startTime})),resources:performance.getEntriesByType('resource').map(e=>({name:new URL(e.name).pathname,start:e.startTime,duration:e.duration,bytes:e.transferSize})),videoRequested:!!document.querySelector('#brandFilm').getAttribute('src')}));
 assert(!report.videoRequested,'Offscreen film must not compete for opening bandwidth');
 await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({evidence:out,lcp:report.lcp.at(-1),heroPresentedAt:report.heroPresentedAt,layoutShifts:report.shifts.reduce((a,b)=>a+b.value,0),offscreenFilmNotRequested:true}));
}finally{await browser.close()}
