// Native pixel samples avoid the browser screencast's lossy intermediate.
// Retain actual wall-clock timing, never upscale or accelerate the capture.
import {chromium} from 'playwright';
import {mkdir,mkdtemp,writeFile,access} from 'node:fs/promises';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const out=resolve(process.argv[2]||'');assert(process.argv[2],'Pass an output directory');assert(!out.includes("'")&&!out.includes('\n'));
const desktop=process.argv.includes('--desktop'),device=desktop?'desktop':'phone';
const heroOnly=process.argv.includes('--hero-only');
const language=process.argv.includes('--english')?'en':'zh';
const heroCloseup=heroOnly&&process.argv.includes('--hero-closeup');
const compact=process.argv.includes('--compact');
const highResolution=process.argv.includes('--high-resolution');
assert(!highResolution||desktop,'High-resolution desktop mode requires --desktop; phone already captures at 2×');
const viewport=desktop?{width:1440,height:900}:{width:390,height:844},density=desktop?(highResolution?4/3:1):2;
const target=resolve(out,heroOnly?`dumpling-lab-hero-${device}.mp4`:desktop?'dumpling-lab-browser-motion.mp4':'dumpling-lab-phone-motion.mp4');
assert(!(await access(target).then(()=>true,()=>false)),'Use a fresh recording checkpoint');
await mkdir(out,{recursive:true});const frameDir=await mkdtemp(resolve(out,device+'-frames-'));
const browser=await chromium.launch({channel:'chrome'});
const context=await browser.newContext({viewport,deviceScaleFactor:density,isMobile:!desktop,hasTouch:!desktop});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>Object.defineProperty(navigator,'connection',{value:{saveData:false,effectiveType:'4g',downlink:10}}));
const hold=ms=>page.evaluate(ms=>new Promise(resolve=>{const start=performance.now();function tick(now){if(now-start>=ms)resolve();else requestAnimationFrame(tick)}requestAnimationFrame(tick)}),ms);
const scroll=async top=>{await page.evaluate(top=>scrollTo({top,behavior:'smooth'}),top);await hold(1000)};
const scrollTo=selector=>page.locator(selector).evaluate(el=>scrollY+el.getBoundingClientRect().top-document.querySelector('.site-header').offsetHeight).then(scroll);
let running=false,captureError=null,capture;const frames=[],chapters=[];
const mark=(course,view)=>chapters.push({course,view,seconds:frames.length?(performance.now()-frames[0].time)/1000:0});
try{
 await page.goto('http://127.0.0.1:7903/?lang='+language);await page.evaluate(async()=>{await document.fonts.ready;await document.querySelector('#stageImage').decode()});
 running=true;
 capture=(async()=>{
  let next=performance.now();
  while(running){
   const delay=next-performance.now();if(delay>0)await new Promise(r=>setTimeout(r,delay));
   if(!running)break;
   const start=performance.now(),bytes=await page.screenshot({type:'jpeg',quality:92,scale:'device'}),end=performance.now();
   const file=resolve(frameDir,`frame-${String(frames.length).padStart(5,'0')}.jpg`);
   frames.push({file,time:(start+end)/2,captureMs:end-start});await writeFile(file,bytes);
   next=Math.max(next+1000/24,performance.now());
  }
 })().catch(error=>{captureError=error;running=false});
 if(heroOnly){
  for(const course of ['fried','chilli','broth']){
   if(course!=='fried')await page.locator('#nextCourse')[desktop?'click':'tap']();
   await page.waitForFunction(course=>document.querySelector('#productStage').dataset.course===course,course);
   await page.evaluate(async()=>{await Promise.all([...document.querySelectorAll('.ingredient-badge:not([hidden]) img')].map(i=>i.decode()))});
   await page.mouse.move(viewport.width/2,viewport.height-12);
   mark(course,'hero');await hold(compact?2200:4000);
   if(heroCloseup){
    await scroll(await page.locator('#cinema').evaluate(el=>el.offsetTop-document.querySelector('.site-header').offsetHeight+(el.offsetHeight-document.querySelector('#productStage').offsetHeight)*.65));
    await page.waitForFunction(()=>document.querySelector('#productStage').dataset.detail==='true');
    assert.equal(await page.locator('#productStage').getAttribute('data-course'),course);
    assert(await page.locator('#film').evaluate(el=>el.getBoundingClientRect().top>=innerHeight),'Close-up does not expose lower sections');
    mark(course,'closeup');await hold(compact?2600:4500);
    await scroll(0);await hold(compact?600:1200);
   }
  }
  assert.equal(await page.evaluate(()=>scrollY),0,'Hero recording finishes at the opening');
  assert(await page.locator('#film').evaluate(el=>el.getBoundingClientRect().top>=innerHeight),'Lower sections stay outside the recording');
 }else{
 await hold(1500);
 for(const control of ['#nextCourse','#nextCourse','#previousCourse']){await page.locator(control)[desktop?'click':'tap']();await hold(1800)}
 for(const progress of [.25,.35,.65]){await scroll(await page.locator('#cinema').evaluate((el,p)=>el.offsetTop-document.querySelector('.site-header').offsetHeight+(el.offsetHeight-document.querySelector('#productStage').offsetHeight)*p,progress));await hold(850)}
 await scrollTo('#film');await hold(650);await scrollTo('#filmScreen');await hold(1900);
 for(const section of ['#food','#space','#visit']){await scrollTo(section);await hold(1100)}
 await scroll(await page.evaluate(()=>document.documentElement.scrollHeight));await hold(1300);
 await scroll(0);await hold(850);
 }
}finally{running=false;await capture;await context.close();await browser.close()}
if(captureError)throw captureError;assert.deepEqual(errors,[]);assert(frames.length>100);
const intervals=frames.slice(1).map((f,i)=>f.time-frames[i].time),lastDuration=1000/24;
const duration=(frames.at(-1).time-frames[0].time+lastDuration)/1000;
let concat='ffconcat version 1.0\n';
for(let i=0;i<frames.length;i++)concat+=`file '${frames[i].file}'\noption framerate 1000\nduration ${((intervals[i]||lastDuration)/1000).toFixed(6)}\n`;
concat+=`file '${frames.at(-1).file}'\noption framerate 1000\n`;
const list=resolve(frameDir,'frames.ffconcat');await writeFile(list,concat);
execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-f','concat','-safe','0','-i',list,'-vf','fps=24,scale=in_range=pc:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709,format=yuv420p','-c:v','libx264','-preset','fast','-crf','18','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-movflags','+faststart',target]);
const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','stream=width,height,duration,r_frame_rate','-of','json',target],{encoding:'utf8'})).streams[0];
assert.equal(probe.width,viewport.width*density);assert.equal(probe.height,viewport.height*density);assert(Math.abs(+probe.duration-duration)<.15,'Preserve real elapsed motion, never accelerate a screenshot sequence');
const sorted=[...intervals].sort((a,b)=>a-b);
const report={source:`Actual ${viewport.width}×${viewport.height} CSS viewport at ${density}× device density; real-time screenshot sampling, not an upscaled screencast`,language,scope:heroOnly?(heroCloseup?'All three Heroes and their individual scroll close-ups; no lower sections':'Hero and navigation only; no scrolling or lower sections'):'Full page',chapters,frames:frames.length,duration,averageSampleFps:frames.length/duration,p95FrameIntervalMs:sorted[Math.floor(sorted.length*.95)],encoded:probe,productionWrites:0,frameDir};
await writeFile(resolve(out,device+'-recording.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({target,...report},null,2));
