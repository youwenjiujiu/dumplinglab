// Diagnostic main-thread cadence in a local headless browser. This does not
// measure physical phone/compositor FPS and does not enforce flaky timing gates.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'}),rows=[];
try{
 for(const [width,height,density] of [[390,844,3],[1440,900,1]])for(const rate of [1,4]){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:density}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>Object.defineProperty(navigator,'connection',{value:{saveData:false,effectiveType:'4g',downlink:10}}));
  const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate});
  await cdp.send('Performance.enable');
  await page.goto('http://127.0.0.1:7903/?lang=zh');
  await page.evaluate(async()=>{await document.fonts.ready;await document.querySelector('#stageImage').decode()});
  for(const scene of [1,2,0]){
   await page.locator(`[data-course-index="${scene}"]`).click();await page.waitForFunction(i=>document.querySelector(`[data-course-index="${i}"]`).getAttribute('aria-pressed')==='true',scene);
   await page.waitForFunction(()=>document.getAnimations().filter(a=>a.effect?.target?.id==='stageImage').every(a=>a.playState==='finished'));
  }
  for(const mode of ['selection','scroll']){
   const before=await cdp.send('Performance.getMetrics');
   const sample=await page.evaluate(mode=>new Promise(resolve=>{
    const intervals=[],longTasks=[],observer=new PerformanceObserver(list=>longTasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration}))));
    observer.observe({type:'longtask'});let start=0,last=0,action=-1;
    const story=document.querySelector('#cinema'),stage=document.querySelector('#productStage'),header=document.querySelector('.site-header');
    const offset=story.offsetTop-header.offsetHeight,travel=story.offsetHeight-stage.offsetHeight;
    function tick(now){
     if(!start)start=now;if(last)intervals.push(now-last);last=now;const elapsed=now-start;
     if(mode==='selection'){
      const next=Math.min(2,Math.floor(elapsed/1400));if(action!==next){action=next;document.querySelector(next===2?'#previousCourse':'#nextCourse').click()}
     }else{
      const phase=Math.min(elapsed/4500,1),progress=(1-Math.cos(phase*Math.PI*2))*.325;
      scrollTo({top:offset+travel*progress,behavior:'instant'});
     }
     if(elapsed<4500){requestAnimationFrame(tick);return}
     observer.disconnect();const sorted=[...intervals].sort((a,b)=>a-b);
     resolve({duration:elapsed,callbacks:intervals.length,medianMs:sorted[Math.floor(sorted.length*.5)],p95Ms:sorted[Math.floor(sorted.length*.95)],maxMs:sorted.at(-1),gapsOver33Ms:intervals.filter(n=>n>33.5).length,longTasks});
    }requestAnimationFrame(tick);
   }),mode);
   const after=await cdp.send('Performance.getMetrics'),metric=(report,name)=>report.metrics.find(m=>m.name===name)?.value||0;
   const work=Object.fromEntries(['TaskDuration','LayoutDuration','RecalcStyleDuration'].map(name=>[name,metric(after,name)-metric(before,name)]));
   rows.push({width,height,density,cpuSlowdown:rate,mode,...sample,work});console.log(JSON.stringify(rows.at(-1)));
  }
  assert.deepEqual(errors,[]);await page.close();
 }
}finally{await browser.close()}
await writeFile(out+'/report.json',JSON.stringify({source:'Headless Chromium RAF and main-thread timing; not physical-device FPS',rows,productionWrites:0},null,2));
