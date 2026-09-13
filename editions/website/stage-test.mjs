// Isolated state/animation lifecycle tests. These are not browser visual tests.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {clamp,stagePose,nextCourseIndex,settleValue} from './motion-math.mjs';
const code=(await readFile(new URL('./stage.js',import.meta.url),'utf8')).replace(/^import .*?;\n/,'');
class Element{
 constructor(){this.dataset={};this.attributes={};this.listeners={};this.style={setProperty:(k,v)=>this.style[k]=v};this.children=[];this.hidden=false;this.paused=true;this.src='';this.currentTime=3;this.duration=12;this.clientWidth=1440;this.rect={top:76,left:0,width:1440,height:824};this.parentElement=this;this.animations=[];}
 addEventListener(k,fn){(this.listeners[k]??=[]).push(fn)}
 emit(k,e={}){for(const fn of this.listeners[k]||[])fn(e)}
 setAttribute(k,v){this.attributes[k]=v}getAttribute(k){return k==='src'?this.src:this.attributes[k]}removeAttribute(k){if(k==='src')this.src='';else delete this.attributes[k]}
 getBoundingClientRect(){return this.rect}focus(){this.focused=true}closest(){return false}
 append(n){this.children.push(n)}remove(){this.removed=true}cloneNode(){const n=new Element();n.src=this.src;return n}
 animate(frames,options){const a={frames,options,canceled:false,finished:options.duration===170?Promise.resolve():new Promise(()=>{}),cancel(){this.canceled=true}};this.animations.push(a);return a}
 load(){this.loads=(this.loads||0)+1}pause(){this.paused=true}
 async play(){if(this.rejectPlay)throw new Error('Blocked');this.paused=false;this.emit('playing')}
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function setup({reduced=false,mobile=false,saveData=false,imageFailure=false,delayedImages=false,noObservers=false,rejectPlay=false}={}){
 const names=['cinema','productStage','stageProduct','stageImage','stageDetail','stageWord','stageName','stageTaste','stageCharacter','stageCount','detailTitle','detailCopy','stageOrbit','orbitLeft','orbitRight','courseControl','previousCourse','nextCourse','motionLabel','motionToggle','storyProgress','stageCaption','brandFilm','filmScreen','filmLabel','filmToggle','filmSymbol','filmProgress','language'];
 names.push('flavorTag1','flavorTag2','flavorTag3','filmFallback');
 const nodes=Object.fromEntries(names.map(k=>['#'+k,new Element()]));
 nodes['#stageImage'].complete=true;nodes['#stageImage'].naturalWidth=1254;nodes['#productStage'].dataset.imageReady='true';
 for(const key of ['.site-header','.cinema-poster','#motionToggle .motion-symbol'])nodes[key]=new Element();
 nodes['.site-header'].rect.height=76;nodes['#cinema'].rect.height=1980;
 const choices=[new Element(),new Element(),new Element()];
 const doc=new Element();doc.documentElement=new Element();doc.documentElement.lang='en';doc.body=new Element();doc.hidden=false;
 doc.querySelector=s=>nodes[s];doc.querySelectorAll=()=>choices;
 const global=new Element(),reduce=new Element(),mobileQuery=new Element();reduce.matches=reduced;mobileQuery.matches=mobile;
 const vid=nodes['#brandFilm'];vid.dataset={wide:'/wide.mp4',mobile:'/mobile.mp4',posterWide:'/wide.webp',posterMobile:'/mobile.webp'};vid.rejectPlay=rejectPlay;
 const frames=new Map();let frameNo=0;const images=[],timers=new Map();let timerNo=0,observer;
 class TestImage{set src(src){this.url=src;images.push(this);if(!delayedImages)queueMicrotask(()=>imageFailure?this.onerror():this.onload())}}
 class Observer{constructor(fn){observer=this;this.fn=fn}observe(){}}
 const context={document:doc,navigator:{connection:{saveData}},matchMedia:s=>s.includes('reduced')?reduce:mobileQuery,Image:TestImage,
 innerWidth:1440,innerHeight:900,queueMicrotask,clamp,stagePose,nextCourseIndex,settleValue,
 setTimeout:fn=>{timers.set(++timerNo,fn);return timerNo},clearTimeout:id=>timers.delete(id),
 requestAnimationFrame:fn=>{frames.set(++frameNo,fn);return frameNo},cancelAnimationFrame:id=>frames.delete(id),addEventListener:(...args)=>global.addEventListener(...args),
 MENU:[{id:'a'},{id:'b'},{id:'c'}],LUNCH_RECOMMENDATIONS:[{id:'chive-fried',dishId:'a',name:'Fried',cn:'煎饺'},{id:'red-oil-chaoshou',dishId:'b',name:'Chilli',cn:'红油'},{id:'century-egg-noodles',dishId:'c',name:'Century Egg Noodles',cn:'销魂皮蛋面'}]};
 if(!noObservers)context.IntersectionObserver=Observer;
 vm.runInNewContext(code,context);
 const flush=()=>{let i=0;while(frames.size&&i++<100){const work=[...frames.values()];frames.clear();for(const fn of work)fn()}assert(i<100,'RAF converges; no permanent loop')};
 return {nodes,choices,doc,global,reduce,mobileQuery,context,vid,images,timers,flush,frames,observe:(id,show)=>observer.fn([{target:nodes[id],isIntersecting:show}])};
}
let scenarios=0;
for(const hidden of [false,true]){
 const s=setup({delayedImages:true});s.nodes['#nextCourse'].emit('click');
 if(hidden){s.doc.hidden=true;s.doc.emit('visibilitychange')}else s.observe('#cinema',false);
 s.images[0].onload();await tick();
 assert.equal(s.nodes['#stageName'].textContent,'Chilli');assert.equal(s.nodes['#stageImage'].animations.length,0);assert.equal(s.nodes['#stageImage'].children.length,0,'no hidden-page exit ghost');scenarios++;
}
{
 const s=setup();s.nodes['#nextCourse'].emit('click');await tick();
 const animation=s.nodes['#stageImage'].animations.at(-1);
 s.context.MENU[0].price=99;s.global.emit('catalog-updated');
 assert.equal(animation.canceled,false,'unrelated catalogue price changes do not interrupt hero motion');scenarios++;
}
{
 const s=setup({mobile:true});s.observe('#filmScreen',true);await tick();assert.equal(s.vid.poster,'/mobile.webp');s.vid.currentTime=5;
 s.mobileQuery.matches=false;s.mobileQuery.emit('change');await tick();assert.equal(s.vid.src,'/wide.mp4');assert.equal(s.vid.poster,'/wide.webp');
 s.vid.emit('loadedmetadata');assert.equal(s.vid.currentTime,5);assert(!s.vid.paused);
 s.nodes['#filmToggle'].emit('click');await tick();const loads=s.vid.loads;
 s.mobileQuery.matches=true;s.mobileQuery.emit('change');await tick();assert(s.vid.paused);assert.equal(s.vid.loads,loads);
 s.nodes['#filmToggle'].emit('click');await tick();assert.equal(s.vid.src,'/mobile.mp4');scenarios++;
}
{
 const s=setup();s.flush();assert.equal(s.nodes['#stageName'].textContent,'Fried');assert.equal(s.vid.loads,undefined);assert.equal(s.nodes['#cinema'].dataset.enhanced,'true');assert.equal(s.doc.body.dataset.motionPaused,'false');
 s.nodes['#nextCourse'].emit('click');await tick();assert.equal(s.nodes['#stageName'].textContent,'Chilli');assert(s.nodes['#stageImage'].animations.length);
 assert(s.nodes['#stageImage'].children.at(-1).animations.every(a=>a.frames.every(f=>f.opacity===1)),'outgoing food remains opaque');
 s.nodes['#previousCourse'].emit('click');await tick();assert.equal(s.nodes['#stageName'].textContent,'Fried');
 s.nodes['#nextCourse'].focus();s.nodes['#courseControl'].emit('keydown',{key:'End',preventDefault(){}});await tick();assert.equal(s.nodes['#stageName'].textContent,'Century Egg Noodles');assert(s.nodes['#nextCourse'].focused,'keyboard selection retains the arrow focus');
 s.doc.documentElement.lang='zh';s.global.emit('site-language-changed');await tick();assert.equal(s.nodes['#stageWord'].textContent,'销魂皮蛋\n好好嗦面');assert.equal(s.nodes['#motionLabel'].textContent,'暂停动效');
 s.nodes['#cinema'].rect.top=-800;s.global.emit('scroll');s.flush();assert.equal(s.nodes['#productStage'].dataset.detail,'true');assert.equal(s.nodes['#stageDetail'].inert,false);assert(Number(s.nodes['#productStage'].style['--plate-scale'])>1);
 s.nodes['#motionToggle'].emit('click');s.flush();assert.equal(s.doc.body.dataset.motionPaused,'true');
 s.nodes['#courseControl'].emit('keydown',{key:'Home',preventDefault(){}});await tick();assert.equal(s.nodes['#stageName'].textContent,'煎饺');assert.equal(s.vid.loads,undefined);scenarios+=7;
}
{
 const s=setup({delayedImages:true});s.nodes['#nextCourse'].emit('click');s.nodes['#nextCourse'].emit('click');
 assert.equal(s.images.length,2);s.images[1].onload();await tick();assert.equal(s.nodes['#stageName'].textContent,'Century Egg Noodles');s.images[0].onload();await tick();assert.equal(s.nodes['#stageName'].textContent,'Century Egg Noodles','late previous image cannot overwrite latest selection');assert.equal(s.nodes['#courseControl'].attributes['aria-busy'],'false');scenarios++;
}
{
 const s=setup({imageFailure:true});s.nodes['#nextCourse'].emit('click');await tick();assert.equal(s.nodes['#stageName'].textContent,'Fried');assert.match(s.nodes['#stageTaste'].textContent,/unavailable/);assert.equal(s.nodes['#courseControl'].attributes['aria-busy'],'false');scenarios++;
}
{
 const s=setup({delayedImages:true});s.nodes['#nextCourse'].emit('click');for(const fn of s.timers.values())fn();await tick();assert.equal(s.nodes['#stageName'].textContent,'Fried');assert.equal(s.nodes['#courseControl'].attributes['aria-busy'],'false');scenarios++;
}
{
 const s=setup();s.context.MENU[0].active=false;s.global.emit('catalog-updated');assert.equal(s.nodes['#stageName'].textContent,'Chilli');s.nodes['#previousCourse'].emit('click');await tick();assert.equal(s.nodes['#stageName'].textContent,'Century Egg Noodles','arrow skips inactive dish');s.nodes['#nextCourse'].emit('click');await tick();
 s.context.MENU[1].soldOut=true;s.global.emit('catalog-updated');assert.match(s.nodes['#stageTaste'].textContent,/sold out/);
 s.context.MENU[1].imageUrl='https://example.com/custom.webp';s.context.LUNCH_RECOMMENDATIONS[1].name='Updated name';s.global.emit('catalog-updated');assert.equal(s.nodes['#stageImage'].src,'https://example.com/custom.webp');assert.equal(s.nodes['#stageName'].textContent,'Updated name');
 s.context.MENU.forEach(d=>d.active=false);s.global.emit('catalog-updated');assert.equal(s.nodes['#stageImage'].src,'/site/interior.webp');assert.equal(s.nodes['#courseControl'].hidden,true);
 s.context.MENU[2].active=true;s.global.emit('catalog-updated');assert.equal(s.nodes['#stageName'].textContent,'Century Egg Noodles');assert(s.nodes['#nextCourse'].disabled);scenarios+=5;
 s.context.LUNCH_RECOMMENDATIONS=[];s.context.MENU.forEach(d=>d.active=false);s.global.emit('catalog-updated');assert.equal(s.nodes['#courseControl'].hidden,true,'filtered recommendations cannot resurrect inactive items');scenarios++;
}
for(const options of [{reduced:true},{saveData:true}]){
 const s=setup(options);s.flush();assert.equal(s.doc.body.dataset.motionPaused,'true');s.observe('#filmScreen',true);await tick();assert.equal(s.vid.loads,undefined);
 s.nodes['#filmToggle'].emit('click');await tick();assert(!s.vid.paused);assert.equal(s.doc.body.dataset.motionPaused,'true','Explicit film playback does not re-enable decorative motion');scenarios++;
}
{
 const s=setup({mobile:true,rejectPlay:true});s.observe('#filmScreen',true);await tick();assert.equal(s.vid.src,'/mobile.mp4');assert(s.vid.paused);assert.equal(s.nodes['#filmLabel'].textContent,'Play motion');
 s.vid.rejectPlay=false;s.nodes['#filmToggle'].emit('click');await tick();assert(!s.vid.paused);
 s.doc.hidden=true;s.doc.emit('visibilitychange');await tick();assert(s.vid.paused);assert.equal(s.frames.size,0);
 s.doc.hidden=false;s.doc.emit('visibilitychange');await tick();assert(!s.vid.paused);
 s.observe('#filmScreen',false);await tick();assert(s.vid.paused);
 s.vid.emit('error');assert.equal(s.nodes['#filmScreen'].dataset.filmReady,undefined);assert.equal(s.nodes['#filmLabel'].textContent,'Retry motion');
 s.nodes['#filmToggle'].emit('click');await tick();assert(!s.vid.paused);assert.equal(s.vid.loads,2);
 s.global.emit('pagehide');assert(s.vid.paused);s.global.emit('pageshow');await tick();assert(!s.vid.paused);
 s.reduce.matches=true;s.reduce.emit('change');await tick();assert(s.vid.paused);scenarios+=8;
}
{
 const s=setup({noObservers:true});s.flush();assert.equal(s.vid.loads,undefined);s.nodes['#filmToggle'].emit('click');await tick();assert(!s.vid.paused);scenarios++;
}
{
 const s=setup();const stage=s.nodes['#productStage'];stage.emit('pointerdown',{pointerType:'touch',clientX:280,clientY:300,target:new Element()});stage.emit('pointerup',{clientX:100,clientY:305});await tick();assert.equal(s.nodes['#stageName'].textContent,'Chilli');
 stage.emit('pointerdown',{pointerType:'touch',clientX:280,clientY:300,target:new Element()});stage.emit('pointerup',{clientX:260,clientY:500});await tick();assert.equal(s.nodes['#stageName'].textContent,'Chilli','vertical scrolling never changes selection');scenarios++;
 stage.emit('pointerdown',{pointerType:'touch',pointerId:1,isPrimary:true,clientX:150,clientY:300,target:new Element()});
 stage.emit('pointerdown',{pointerType:'touch',pointerId:2,isPrimary:false,clientX:240,clientY:300,target:new Element()});
 stage.emit('pointerup',{pointerId:1,clientX:20,clientY:300});await tick();assert.equal(s.nodes['#stageName'].textContent,'Chilli','a second touch cancels the dish swipe');scenarios++;
}
for(const width of [320,390,760,1440,2560])for(const height of [498,750,1080])for(const p of [-1,0,.1,.35,.7,1,2])for(const still of [true,false]){
 const pose=stagePose(p,width,height,width<=760,still);assert(Object.values(pose).every(Number.isFinite));assert(pose.scale>=.82&&pose.scale<=1.2);assert(pose.intro>=0&&pose.intro<=1);assert(pose.detail>=0&&pose.detail<=1);
}
assert.equal(nextCourseIndex(0,-1,[0,1,2]),2);assert.equal(nextCourseIndex(1,1,[1]),1);assert.equal(nextCourseIndex(0,1,[]),-1);
{
 const s=setup();s.context.MENU=[];s.context.LUNCH_RECOMMENDATIONS=undefined;s.global.emit('catalog-updated');
 assert.equal(s.nodes['#courseControl'].hidden,false,'partially loaded script data is not authoritative empty stock');
 s.context.LUNCH_RECOMMENDATIONS=[];s.global.emit('catalog-updated');assert.equal(s.nodes['#courseControl'].hidden,true);scenarios++;
}
{
 const response=hz=>{let x=0;for(let i=0;i<hz/4;i++)x=settleValue(x,1,1000/hz);return x};
 assert(Math.abs(response(60)-response(120))<1e-8,'250 ms response is refresh-rate independent');
 const s=setup();s.flush();const stage=s.nodes['#productStage'];
 stage.emit('pointermove',{pointerType:'mouse',clientX:1440,clientY:800});s.flush();
 assert.equal(stage.style['--pointer-x'],'8px');
 stage.emit('pointerleave');s.flush();assert.equal(stage.style['--pointer-x'],'0px');assert.equal(s.frames.size,0);
 scenarios++;
}
console.log(JSON.stringify({ok:true,scenarios,spatialBounds:true,productionWrites:0,browserVisualQA:false},null,2));
