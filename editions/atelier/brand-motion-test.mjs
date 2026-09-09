// Local VM interaction contracts, not browser/visual QA or real order mutation.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const read=name=>readFile(new URL('../../web/brand/'+name,import.meta.url),'utf8');
class Node {
  constructor(){this.events={};this.nodes=new Map();this.attrs={};this.props={};this.isConnected=true;this.classList={add(){},remove(){},contains(){return false;}};this.style={setProperty:(k,v)=>this.props[k]=v,removeProperty:k=>delete this.props[k]};}
  attachShadow(){return this.shadowRoot=new Node();}
  querySelector(key){if(!this.nodes.has(key))this.nodes.set(key,new Node());return this.nodes.get(key);}
  addEventListener(key,fn){this.events[key]=fn;} removeEventListener(key){delete this.events[key];}
  setAttribute(key,value){this.attrs[key]=value;} getAttribute(key){return this.attrs[key]??null;}
  setPointerCapture(id){this.capture=id;} hasPointerCapture(id){return this.capture===id;} releasePointerCapture(){this.capture=null;}
  closest(){return null;} dispatchEvent(){} contains(){return false;}
  focus(){}
  animate(frames,options){this.lastAnimation={frames,options};return{finished:new Promise(()=>{}),cancel(){this.cancelled=true;},pause(){this.paused=true;},play(){this.paused=false;}};}
}
const registry=new Map(),preference={matches:false,addEventListener(){},removeEventListener(){}};
const context=vm.createContext({HTMLElement:Node,customElements:{get:k=>registry.get(k),define:(k,v)=>registry.set(k,v)},matchMedia:()=>preference,document:{hidden:false},CustomEvent:class{},IntersectionObserver:class{observe(){}disconnect(){}}});
for(const file of ['serving-motion-v1.js','pickup-slip-v1.js']){
  const source=await read(file);vm.runInNewContext(source,{}); // SSR-safe guard
  assert(!/fetch\(|\/api\/|localStorage|sessionStorage/.test(source),'Visual component has no order/payment/persistence authority');
  vm.runInContext(source,context);vm.runInContext(source,context); // duplicate registration safe
}
const slip=new(registry.get('dl-pickup-slip'))();slip.connectedCallback();
assert.equal(slip.detached,false);assert(slip.shadowRoot.innerHTML.includes('<slot>'),'Actual QR stays in the slot, never synthesized');
slip.button.events.click({detail:0});assert(slip.detached,'Keyboard click unfolds');
assert.equal(slip.props['--turn'],'0deg','Unfolded QR rests flat for scanning');
slip.button.events.click({detail:0});assert(!slip.detached,'Second activation restores');
slip.button.events.pointerdown({button:0,pointerId:1,clientX:0,clientY:0});
slip.button.events.pointermove({pointerId:1,clientX:91,clientY:1});
slip.button.events.pointerup();slip.button.events.click({detail:1});
assert(slip.detached,'Synthetic click after drag does not reattach');
slip.setDetached(false);
slip.button.events.pointerdown({button:0,pointerId:2,clientX:0,clientY:0});
slip.button.events.pointermove({pointerId:2,clientX:20,clientY:0});slip.button.events.pointercancel();
assert(!slip.detached);assert.equal(slip.progress,0,'Cancelled gesture restores');
for(let i=0;i<5;i++)slip.button.events.keydown({key:'ArrowRight',preventDefault(){}});
assert(slip.detached,'Arrow keys unfold without dragging');
slip.button.events.keydown({key:'Escape',preventDefault(){},stopPropagation(){}});assert(!slip.detached);
slip.setAttribute('lang','en');slip.updateCopy();assert(slip.button.querySelector('span').textContent.includes('Pull right'));
const serving=new(registry.get('dl-serving-motion'))();serving.connectedCallback();serving.restart();
assert.equal(serving.animations.length,3);assert.equal(serving.shadowRoot.querySelector('.dumpling').lastAnimation.options.duration,720);
serving.pause();assert(serving.animations.every(a=>a.paused));serving.setProgress(.5);assert(serving.animations.every(a=>a.currentTime===360));
preference.matches=true;serving.onPreference();assert.equal(serving.animations.length,0);serving.restart();assert.equal(serving.animations.length,0,'Reduced motion never starts');serving.disconnectedCallback();
const depth=await read('menu-depth-v1.js');vm.runInNewContext(depth,{});
const doc=new Node(),win=new Node(),host=new Node();host.closest=()=>host;host.getBoundingClientRect=()=>({left:0,top:0,width:100,height:100});
let scheduled;const depthContext=vm.createContext({document:doc,window:win,matchMedia:q=>({matches:!q.includes('reduced'),addEventListener(){}}),requestAnimationFrame:fn=>(scheduled=fn,1),cancelAnimationFrame(){}});
vm.runInContext(depth,depthContext);
doc.events.pointermove({target:host,pointerType:'mouse',clientX:1000,clientY:-500});scheduled();
assert.equal(host.props['--food-rx'],'5deg');assert.equal(host.props['--food-ry'],'7deg','Tilt is clamped');
doc.events.scroll();assert.deepEqual(host.props,{},'Scrolling resets all photo transforms');
doc.events.pointermove({target:host,pointerType:'touch',clientX:50,clientY:50});assert.deepEqual(host.props,{},'Touch scrolling is not captured');
const css=await readFile(new URL('shared-table.css',import.meta.url),'utf8');
assert(/\.order-banner-pattern i\s*\{[^}]*mask:\s*url\('\/brand\/dumpling-symbol\.svg'\)/.test(css),'Banner motifs use the exact original brand vector');
for(const animation of ['dl-plate-arrive','dl-card-open','dl-check-draw','dl-slip-print','dl-steam-rise','dl-bag-lift','dl-seal-press','dl-banner-reveal'])assert(css.includes('@keyframes '+animation));
assert(css.includes('pickup-ticket:not([data-motion-settled]) [aria-current="step"]'));
assert(css.includes('@media (prefers-reduced-motion: no-preference)'));
// Execute the actual local receipt preview's scripts against a lightweight DOM.
// This catches missing globals/assets without claiming visual/browser validation.
const previewDocument=new Node();previewDocument.querySelector('#previewStage').value='ready';
const preview=await read('order-details-preview-v4.html');
const previewContext=vm.createContext({document:previewDocument,window:new Node(),location:{search:''},URLSearchParams,matchMedia:()=>preference,setInterval(){}});
for(const match of preview.matchAll(/<script(?: src="([^"]+)")?>([\s\S]*?)<\/script>/g)){
  const code=match[1]?await fetch('http://127.0.0.1:7898'+match[1]).then(r=>{assert.equal(r.status,200,match[1]);return r.text();}):match[2];
  vm.runInContext(code,previewContext);
}
assert(previewDocument.querySelector('#sheetBody').innerHTML.includes('<dl-pickup-slip'));
assert(previewDocument.querySelector('#sheetBody').innerHTML.includes('pairing-banner-backdrop-v6.webp'));
assert(previewDocument.querySelector('#sheetBody').innerHTML.includes('class="order-banner-dish" src="/img/l/potstickers-pork-shrimp-chive-cutaway-v1.webp"'),'Banner reuses the original menu photo directly');
assert(/\.order-brand-banner \.order-banner-dish\s*\{[^}]*height: auto;[^}]*object-fit: contain;/.test(css),'Original plate is neither stretched nor cropped');
assert(previewDocument.querySelector('#sheetBody').innerHTML.includes('class="order-banner-pattern" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i>'));
// Entry scenes animate independent parts, but never intercept the real button.
const entrySource=await read('entry-scenes-v2.js');vm.runInNewContext(entrySource,{});
const entryDoc=new Node();entryDoc.hidden=false;
const entryPreference={matches:false,addEventListener(){},removeEventListener(){}};
const entryCtx=vm.createContext({HTMLElement:Node,customElements:{get:k=>registry.get(k),define:(k,v)=>registry.set(k,v)},matchMedia:()=>entryPreference,document:entryDoc,CustomEvent:class{},IntersectionObserver:class{observe(){}disconnect(){}},ResizeObserver:class{observe(){}disconnect(){}}});
vm.runInContext(entrySource,entryCtx);
for(const mode of ['dinein','takeaway']){
  const scene=new(registry.get('dl-entry-scene-v2'))();scene.setAttribute('mode',mode);scene.connectedCallback();scene.restart();
  assert.equal(scene.animations.length,4,'Four independent part tracks');
  assert(scene.running);scene.pause();assert(scene.animations.every(a=>a.paused));
  scene.setProgress(.5);assert(scene.animations.every(a=>a.currentTime===scene.duration/2));
  const previous=scene.animations;scene.restart();assert(previous.every(a=>a.cancelled),'Replay cleans up the previous run');
  if(mode==='dinein')assert(scene.shadowRoot.querySelector('.chair.left').lastAnimation.frames[0].transform.includes('-23px'));
  else{
    assert(scene.shadowRoot.querySelector('.lid').lastAnimation.frames[0].transform.includes('rotateX'));
    assert(scene.shadowRoot.querySelector('.box').lastAnimation.frames.some(f=>f.transform.includes('-103px')),'Box travels above bag opening before dropping behind front');
  }
  entryPreference.matches=true;scene.onReduce();scene.restart();assert.equal(scene.animations.length,0,'Reduced motion holds the complete static scene');entryPreference.matches=false;
  scene.disconnectedCallback();assert.equal(scene.animations.length,0);
}
assert(!/fetch\(|\/api\/|preventDefault|stopPropagation|setTimeout/.test(entrySource),'Entry motion never changes, delays or blocks mode selection');
const fulfilmentSource=await readFile(new URL('fulfilment.js',import.meta.url),'utf8');
assert(fulfilmentSource.includes('/brand/entry-dinein-v3.svg')&&fulfilmentSource.includes('/brand/entry-takeaway-v5.svg'),'Current standalone hand motions are wired into entry');
const app=await readFile(new URL('app.js',import.meta.url),'utf8');
assert(app.includes('image?.complete && image.naturalWidth'),'Cached image entrance waits for a decoded photo');
assert(app.includes('host.classList.add("is-served")'),'New image load triggers its entrance');
const hotPredicate=app.slice(app.indexOf('function detailIsHot'),app.indexOf('function renderDetail'));
const hotCtx=vm.createContext({});vm.runInContext(hotPredicate,hotCtx);
assert(vm.runInContext('detailIsHot({section:"noodles"}, "tossed")',hotCtx));
assert(!vm.runInContext('detailIsHot({section:"drinks"}, "cold")',hotCtx));
const pickupSource=await read('takeaway-pickup-v5.js');vm.runInNewContext(pickupSource,{});vm.runInContext(pickupSource,entryCtx);
assert(!pickupSource.includes('<img')&&!pickupSource.includes('ResizeObserver'),'Takeaway renders responsive native SVG instead of rescaling image layers');
assert(pickupSource.includes('shape-rendering="geometricPrecision"'));
const pickupScene=new(registry.get('dl-takeaway-pickup'))();pickupScene.connectedCallback();pickupScene.restart();
assert.equal(pickupScene.animations.length,5,'Restored box, hand, grip, carrying bag and shadow tracks');
const grip=pickupScene.shadowRoot.querySelector('.fingers').lastAnimation.frames;
const carrying=pickupScene.shadowRoot.querySelector('.carry').lastAnimation.frames;
assert(grip.find(frame=>frame.transform==='scaleY(.7)').offset<carrying.find(frame=>frame.transform.includes('-18px')).offset,'Fingers close before bag lift');
assert(pickupScene.shadowRoot.querySelector('.hand').lastAnimation.frames.some(frame=>frame.opacity===1),'Hand is visible during pickup');
pickupScene.setProgress(.5);assert(pickupScene.animations.every(a=>a.currentTime===2600));
assert(pickupScene.shadowRoot.innerHTML.includes('<g class="hand"'),'Full-size outlined hand replaces tiny CSS glove');
assert(!/entryReplay|重播动画|Replay animation/.test(fulfilmentSource),'Entry animations play automatically without a visible replay control');
entryPreference.matches=true;pickupScene.onReduced();assert.equal(pickupScene.animations.length,0);entryPreference.matches=false;
pickupScene.disconnectedCallback();
assert(!/fetch\(|\/api\/|preventDefault|setTimeout/.test(pickupSource));
assert(fulfilmentSource.includes('<dl-takeaway-pickup class="entry-art"'),'Accepted hand pickup is wired in real entry');
const diningSource=await read('dinein-serving-v3.js');
const diningStatic=await read('entry-dinein-v3.svg');
const takeawayStatic=await read('entry-takeaway-v5.svg');
const originalDining=await read('entry-dinein-v1.svg');
const symbolOf=s=>s.match(/<symbol id="dumpling"[\s\S]*?<\/symbol>/)?.[0];
assert.equal(symbolOf(diningStatic),symbolOf(originalDining),'Brand dumpling geometry remains exact');
assert.equal(symbolOf(takeawayStatic),symbolOf(originalDining));
assert.equal(symbolOf(diningSource),symbolOf(originalDining));
assert.equal(symbolOf(pickupSource),symbolOf(originalDining));
assert(!diningSource.includes('cx="99" cy="87"')&&!diningStatic.includes('cx="99" cy="87"'),'The distracting sauce-dot is absent from both animated and static entry artwork');
vm.runInNewContext(diningSource,{});vm.runInContext(diningSource,entryCtx);
const diningScene=new(registry.get('dl-dinein-serving'))();diningScene.connectedCallback();diningScene.restart();
assert.equal(diningScene.animations.length,6,'Restored two chairs, plate and three steam strokes');
assert(diningSource.includes('class="table"'),'Dining table must remain in the scene');
const leftChair=diningScene.shadowRoot.querySelector('.chair-left').lastAnimation.frames;
const rightChair=diningScene.shadowRoot.querySelector('.chair-right').lastAnimation.frames;
const plateFrames=diningScene.shadowRoot.querySelector('.plate').lastAnimation.frames;
assert(leftChair.some(f=>f.transform==='translate(-18px,5px)'));
assert(rightChair.some(f=>f.transform==='translate(18px,5px)'));
assert(plateFrames.find(f=>f.opacity===1).offset>=.19,'Plate arrives after chairs pull out');
for(const selector of ['.s1','.s2','.s3']) {
  const frames=diningScene.shadowRoot.querySelector(selector).lastAnimation.frames;
  assert(frames.find(f=>f.opacity>0).offset>=.4,'Steam appears only after the food lands');
  assert.equal(frames.at(-1).opacity,0);
}
diningScene.pause();assert(diningScene.animations.every(a=>a.paused));
diningScene.play();assert(diningScene.animations.every(a=>!a.paused));
diningScene.setProgress(.5);assert(diningScene.animations.every(a=>a.currentTime===2600));
const cancelledDining=diningScene.animations;diningScene.restart();assert(cancelledDining.every(a=>a.cancelled),'Replay cancels the previous sequence');
entryPreference.matches=true;diningScene.onReduced();assert.equal(diningScene.animations.length,0);diningScene.restart();assert.equal(diningScene.animations.length,0);entryPreference.matches=false;
diningScene.restart();const removedDining=diningScene.animations;diningScene.disconnectedCallback();assert(removedDining.every(a=>a.cancelled));
assert(!/fetch\(|\/api\/|preventDefault|localStorage|setTimeout/.test(diningSource));
assert(fulfilmentSource.includes('<dl-dinein-serving class="entry-art"'),'Real entry uses serving animation with original SVG fallback');
assert(diningSource.includes('this.visible.observe(this)') && diningSource.includes('if(this.isConnected) this.restart()'),'Dine-in starts automatically when visible, without a replay button');
console.log('PASS brand motion VM contracts: gesture/cancel/keyboard, readable QR, no API authority, replay/pause/reduced-motion, bounded tilt, native touch scroll. Not browser QA.');
