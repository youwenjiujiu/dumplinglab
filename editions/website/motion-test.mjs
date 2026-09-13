// VM interaction checks, not browser/GPU visual acceptance.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {clamp,smooth,scrollProgress,cameraPose,shouldPlay} from './motion-math.mjs';
assert.equal(clamp(NaN),0);assert.equal(scrollProgress(10,1000,800),0);assert.equal(scrollProgress(-100,1000,800),.5);assert.equal(scrollProgress(-300,1000,800),1);
assert.equal(smooth(0),0);assert.equal(smooth(1),1);
for(const p of [-1,0,.25,.5,.75,1,2])for(const narrow of [true,false])for(const pointer of [-2,0,2]){
 const pose=cameraPose(p,pointer,pointer,narrow);assert(Object.values(pose).every(Number.isFinite));assert(pose.z>=4.85&&pose.z<=5.5);assert(Math.abs(pose.ry)<.25);
}
assert(!shouldPlay({paused:true,visible:true,hidden:false}));assert(!shouldPlay({paused:false,visible:false,hidden:false}));assert(!shouldPlay({paused:false,visible:true,hidden:true}));
const source=(await readFile(new URL('./cinema.js',import.meta.url),'utf8')).replace(/^import .*?;\n/,'').replace("import('/vendor/three.module.js')",'loadThree()');
class Node{
 constructor(){this.dataset={};this.attributes={};this.events={};this.style={};this.hidden=true;this.paused=true;this.loads=0;this.plays=0;this.currentTime=3;this.duration=12;this.symbol={textContent:''};}
 getAttribute(key){return key==='src'?this.src:this.attributes[key]}
 setAttribute(key,value){this.attributes[key]=value}
 removeAttribute(key){if(key==='src')delete this.src;else delete this.attributes[key]}
 querySelector(){return this.symbol}
 addEventListener(type,fn){(this.events[type]??=[]).push(fn)}
 emit(type,event={}){for(const fn of this.events[type]||[])fn(event)}
 load(){this.loads++}
 async play(){this.plays++;if(this.rejectPlay)throw new Error('Gesture required');this.paused=false;this.emit('playing')}
 pause(){this.paused=true}
 getBoundingClientRect(){return {width:1000,height:1200,top:-300,left:0}}
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function setup({reduced=false,mobile=false,saveData=false,rejectPlay=false}={}){
 const nodes=Object.fromEntries(['cinema','brandFilm','motionToggle','motionLabel','depthStage','closeup','depthCanvas','language','filmProgress'].map(id=>['#'+id,new Node()]));
 nodes['.cinema-poster']=new Node();const vid=nodes['#brandFilm'];vid.rejectPlay=rejectPlay;vid.dataset={wide:'/wide.mp4',mobile:'/mobile.mp4'};
 const doc=new Node();doc.documentElement={lang:'zh'};doc.body={dataset:{}};doc.hidden=false;doc.querySelector=s=>nodes[s];
 const global=new Node(),reducedQuery=new Node();reducedQuery.matches=reduced;let observer,imports=0,frame=0;
 const frames=new Map();
 class Observer{constructor(fn){this.fn=fn;observer=this}observe(){}disconnect(){}}
 const context={document:doc,navigator:{connection:{saveData}},matchMedia:q=>q.includes('reduced')?reducedQuery:{matches:mobile},innerHeight:800,devicePixelRatio:2,AbortController,queueMicrotask,IntersectionObserver:Observer,requestAnimationFrame:fn=>{frames.set(++frame,fn);return frame},cancelAnimationFrame:id=>frames.delete(id),addEventListener:(...args)=>global.addEventListener(...args),loadThree:async()=>{imports++;throw new Error('Simulated GPU unavailable')},clamp,scrollProgress,cameraPose,shouldPlay};
 vm.runInNewContext(source,context);
 return {nodes,vid,doc,global,reducedQuery,observe:(key,visible)=>observer.fn([{target:nodes[key],isIntersecting:visible}]),imports:()=>imports};
}
let scenarios=0;
{
 const s=setup();await tick();assert.equal(s.vid.src,'/wide.mp4');assert.equal(s.vid.paused,false);assert.equal(s.nodes['#cinema'].dataset.filmReady,'true');assert.equal(s.nodes['#motionLabel'].textContent,'暂停动效');assert.equal(s.nodes['#motionToggle'].hidden,false);
 s.nodes['#motionToggle'].emit('click');await tick();assert(s.vid.paused);assert.equal(s.doc.body.dataset.motionPaused,'true');assert.equal(s.nodes['#motionLabel'].textContent,'播放动效');
 s.nodes['#motionToggle'].emit('click');await tick();assert(!s.vid.paused);
 s.doc.hidden=true;s.doc.emit('visibilitychange');await tick();assert(s.vid.paused);
 s.doc.hidden=false;s.doc.emit('visibilitychange');await tick();assert(!s.vid.paused);
 s.observe('#cinema',false);await tick();assert(s.vid.paused);s.observe('#cinema',true);await tick();assert(!s.vid.paused);
 s.doc.documentElement.lang='en';s.nodes['#language'].emit('click');await tick();assert.equal(s.nodes['#motionLabel'].textContent,'Pause motion');
 s.vid.emit('timeupdate');assert.equal(s.nodes['#filmProgress'].style.transform,'scaleX(0.25)');
 s.observe('#depthStage',true);await tick();assert.equal(s.imports(),1);assert.equal(s.nodes['#depthStage'].dataset.ready,undefined);s.observe('#depthStage',true);await tick();assert.equal(s.imports(),1,'failed GPU is not retried on every scroll');
 s.global.emit('pagehide');assert(s.vid.paused);s.global.emit('pageshow');await tick();assert(!s.vid.paused);
 scenarios+=8;
}
for(const options of [{reduced:true},{saveData:true}]){
 const s=setup(options);await tick();assert.equal(s.vid.src,undefined);assert.equal(s.vid.plays,0);s.observe('#depthStage',true);await tick();assert.equal(s.imports(),0);
 s.nodes['#motionToggle'].emit('click');await tick();assert.equal(s.vid.src,'/wide.mp4');assert(!s.vid.paused,'explicit play is permitted');scenarios++;
}
{
 const s=setup({mobile:true,rejectPlay:true});await tick();assert.equal(s.vid.src,'/mobile.mp4');assert.equal(s.vid.poster,'/site/media/dumpling-film-mobile-v1-poster.webp');assert.equal(s.doc.body.dataset.motionPaused,'true');
 s.vid.rejectPlay=false;s.nodes['#motionToggle'].emit('click');await tick();assert(!s.vid.paused);
 s.vid.emit('error');assert.equal(s.nodes['#cinema'].dataset.filmReady,undefined);assert.equal(s.nodes['#motionLabel'].textContent,'重试播放');
 s.nodes['#motionToggle'].emit('click');await tick();assert(!s.vid.paused);assert.equal(s.vid.loads,2);scenarios+=3;
}
{
 const s=setup();await tick();s.reducedQuery.matches=true;s.reducedQuery.emit('change');await tick();assert(s.vid.paused);assert.equal(s.doc.body.dataset.motionPaused,'true');scenarios++;
}
console.log(JSON.stringify({ok:true,scenarios,cameraBounds:true,browserGPUVerification:false,productionWrites:0},null,2));
