import {clamp,scrollProgress,cameraPose,shouldPlay} from './motion-math.mjs';
const hero=document.querySelector('#cinema'),video=document.querySelector('#brandFilm');
const button=document.querySelector('#motionToggle'),label=document.querySelector('#motionLabel');
const stage=document.querySelector('#depthStage'),section=document.querySelector('#closeup');
const reduce=matchMedia('(prefers-reduced-motion: reduce)'),narrow=matchMedia('(max-width: 760px)');
const posterURL=narrow.matches?'/site/media/dumpling-film-mobile-v1-poster.webp':'/site/media/dumpling-film-wide-v1-poster.webp';
video.poster=posterURL;document.querySelector('.cinema-poster').src=posterURL;
let paused=reduce.matches||!!navigator.connection?.saveData,heroVisible=true,stageVisible=false,failed=false;
let frame=0,depth=null,depthPending=false,depthFailed=false,pointerX=0,pointerY=0,playEpoch=0;
const abort=new AbortController(),signal=abort.signal;
function labels(){
 const zh=document.documentElement.lang==='zh';
 const text=failed?(zh?'重试播放':'Retry motion'):paused?(zh?'播放动效':'Play motion'):(zh?'暂停动效':'Pause motion');
 label.textContent=text;button.setAttribute('aria-label',text);button.setAttribute('aria-pressed',String(!paused));
 button.querySelector('.motion-symbol').textContent=paused?'▶':'Ⅱ';
 document.body.dataset.motionPaused=String(paused);
}
function draw(){
 frame=0;if(document.hidden)return;
 const rect=section.getBoundingClientRect();
 const progress=scrollProgress(rect.top,rect.height,innerHeight);
 if(depth&&stageVisible){
  const p=cameraPose((paused||reduce.matches) ? .5 : progress,paused?0:pointerX,paused?0:pointerY,narrow.matches);
  depth.mesh.rotation.set(p.rx,p.ry,p.rz);depth.mesh.position.set(p.x,p.y,0);
  depth.mesh.scale.setScalar(p.scale);depth.camera.position.z=p.z;
  depth.renderer.render(depth.scene,depth.camera);
 }
}
function schedule(){if(!frame&&!document.hidden)frame=requestAnimationFrame(draw)}
function resetDepth(){if(depth){delete stage.dataset.ready;depth.renderer.dispose();depth.geometry.dispose();depth.material.dispose();depth.texture.dispose();depth=null}}
async function prepareDepth(){
 if(depth||depthPending||depthFailed||paused||reduce.matches||!stageVisible)return;
 depthPending=true;
 let renderer,geometry,material,texture;
 try{
  const T=await import('/vendor/three.module.js');
  if(signal.aborted)return;
  renderer=new T.WebGLRenderer({canvas:document.querySelector('#depthCanvas'),alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.outputColorSpace=T.SRGBColorSpace;
  texture=await new T.TextureLoader().loadAsync('/site/media/campaign-macro-v1.webp');
  if(signal.aborted){renderer.dispose();texture.dispose();return}
  texture.colorSpace=T.SRGBColorSpace;
  const aspect=texture.image.width/texture.image.height;
  geometry=new T.PlaneGeometry(3.5*aspect,3.5);
  material=new T.MeshBasicMaterial({map:texture,side:T.DoubleSide});
  const mesh=new T.Mesh(geometry,material),scene=new T.Scene(),camera=new T.PerspectiveCamera(43,1,.1,30);
  scene.add(mesh);camera.position.set(0,0,5.5);
  depth={renderer,mesh,scene,camera,geometry,material,texture};resize();draw();stage.dataset.ready='true';
 }catch{renderer?.dispose();geometry?.dispose();material?.dispose();texture?.dispose();depth=null;depthFailed=true;delete stage.dataset.ready}
 finally{depthPending=false}
}
function resize(){
 if(!depth)return;
 const {width,height}=stage.getBoundingClientRect();if(!width||!height)return;
 depth.renderer.setSize(width,height,false);depth.camera.aspect=width/height;depth.camera.updateProjectionMatrix();schedule();
}
async function playback(){
 const epoch=++playEpoch;
 if(!shouldPlay({paused,visible:heroVisible,hidden:document.hidden})){video.pause();return}
 if(!video.getAttribute('src')){video.src=narrow.matches?video.dataset.mobile:video.dataset.wide;video.load()}
 video.muted=true;
 try{await video.play();if(epoch!==playEpoch||!shouldPlay({paused,visible:heroVisible,hidden:document.hidden}))video.pause()}
 catch{if(epoch===playEpoch){paused=true;labels();schedule()}}
}
button.hidden=false;
button.addEventListener('click',()=>{if(failed){failed=false;video.removeAttribute('src');paused=false}else paused=!paused;labels();playback();prepareDepth();schedule()},{signal});
video.addEventListener('playing',()=>{hero.dataset.filmReady='true';failed=false;labels()},{signal});
video.addEventListener('error',()=>{failed=true;paused=true;delete hero.dataset.filmReady;labels()},{signal});
video.addEventListener('timeupdate',()=>{document.querySelector('#filmProgress').style.transform=`scaleX(${clamp(video.currentTime/(video.duration||12))})`},{signal});
document.querySelector('#language').addEventListener('click',()=>queueMicrotask(labels),{signal});
const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.target===hero){heroVisible=entry.isIntersecting;playback()}else{stageVisible=entry.isIntersecting;prepareDepth();schedule()}}},{threshold:0});
observer.observe(hero);observer.observe(stage);
addEventListener('scroll',()=>{if(stageVisible&&!paused&&!reduce.matches)schedule()},{passive:true,signal});
addEventListener('resize',resize,{passive:true,signal});
section.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'||paused||reduce.matches)return;const r=section.getBoundingClientRect();pointerX=((e.clientX-r.left)/r.width-.5)*2;pointerY=(e.clientY/innerHeight-.5)*2;schedule()},{passive:true,signal});
section.addEventListener('pointerleave',()=>{pointerX=pointerY=0;schedule()},{signal});
document.addEventListener('visibilitychange',()=>{playback();schedule()},{signal});
reduce.addEventListener('change',()=>{if(reduce.matches){paused=true;resetDepth()}labels();playback();prepareDepth();schedule()},{signal});
document.querySelector('#depthCanvas').addEventListener('webglcontextlost',e=>{e.preventDefault();depthFailed=true;resetDepth()},{signal});
addEventListener('pagehide',()=>{video.pause();if(frame)cancelAnimationFrame(frame);frame=0;resetDepth()},{signal});
addEventListener('pageshow',()=>{playback();prepareDepth()},{signal});
labels();playback();
