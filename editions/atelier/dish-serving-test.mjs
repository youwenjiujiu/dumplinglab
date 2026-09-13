import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source = await readFile(new URL('../../web/brand/dish-serving-v2.js',import.meta.url),'utf8');
vm.runInNewContext(source,{}); // SSR-safe
assert(!/fetch\(|localStorage|\/api\//.test(source));
class Element {
  constructor(){this.events={};this.nodes=new Map();this.isConnected=true;this.complete=true;this.naturalWidth=1280;this.dataset={heat:'hot'};}
  attachShadow(){return this.shadowRoot=new Element();}
  querySelector(s){if(!this.nodes.has(s))this.nodes.set(s,new Element());return this.nodes.get(s);}
  querySelectorAll(){return [this.querySelector('one'),this.querySelector('two'),this.querySelector('three')];}
  addEventListener(k,f){this.events[k]=f;} removeEventListener(k){delete this.events[k];}
  setAttribute(){} dispatchEvent(){}
  animate(frames,options){return {frames,options,currentTime:0,playState:'running',finished:new Promise(()=>{}),cancel(){this.playState='idle';},pause(){this.playState='paused';},play(){this.playState='running';}};}
}
const registry=new Map(),preference={matches:false,addEventListener(){},removeEventListener(){}},doc=new Element();
doc.documentElement={lang:'zh'};doc.hidden=false;
const context=vm.createContext({HTMLElement:Element,customElements:{get:k=>registry.get(k),define:(k,v)=>registry.set(k,v)},matchMedia:()=>preference,document:doc,CustomEvent:class{}});
vm.runInContext(source,context);vm.runInContext(source,context);
const motion=new(registry.get('dl-dish-serving'))();motion.parentElement=new Element();motion.connectedCallback();
assert.equal(motion.animations.length,4,'Cached hot photo starts plate and three wisps');
assert.equal(motion.animations[0].frames[0].opacity,.25,'Immediate visible starting frame');
assert.equal(motion.animations[0].frames.at(-1).transform,'none','Original photo rests undistorted');
assert(motion.animations.slice(1).every(a=>a.options.delay>=1300),'Steam follows plate arrival');
assert(!source.includes('<button'),'No replay button or transparent tap overlay');
assert(!source.includes("addEventListener('click'"),'Photo does not intercept taps');
const old=motion.animations.slice();motion.restart();
assert(old.every(a=>a.playState==='idle'),'Replay cancels all previous tracks');
motion.pause();assert(motion.animations.every(a=>a.playState==='paused'));
motion.setProgress(.5);assert(motion.animations.every(a=>a.currentTime===2530));
motion.play();doc.hidden=true;motion.onVisibility();assert(motion.animations.every(a=>a.playState==='paused'));
doc.hidden=false;motion.onVisibility();assert(motion.animations.every(a=>a.playState==='running'));
motion.host.dataset.heat='none';motion.restart();assert.equal(motion.animations.length,1,'Cold items never steam');
preference.matches=true;motion.onPreference();motion.restart();assert.equal(motion.animations.length,0);
preference.matches=false;motion.restart();motion.host.stopPlateMotion();assert.equal(motion.animations.length,0,'Sheet close cleans up');
motion.photo.naturalWidth=0;motion.restart();assert.equal(motion.animations.length,0,'Broken/undecoded photo stays still');
motion.photo.naturalWidth=1280;motion.photo.events.load();assert.equal(motion.animations.length,1,'Decode triggers playback');
motion.disconnectedCallback();assert.equal(motion.animations.length,0);assert(!motion.photo.events.load);
const app=await readFile(new URL('app.js',import.meta.url),'utf8');
assert(app.includes('document.createElement("dl-dish-serving")'));
const build=await readFile(new URL('build-production.mjs',import.meta.url),'utf8');assert(build.includes('brand/dish-serving-v2.js'));
console.log('PASS dish serving: cached/load/replay, hot/cold, reduced motion, visibility and cleanup');
