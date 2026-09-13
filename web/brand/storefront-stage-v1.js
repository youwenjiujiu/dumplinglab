import * as THREE from '../vendor/three.module.js';
import {createDumplingStorefront} from './storefront-model-v1.js';

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const ease=t=>1-Math.pow(1-clamp(t),3);
const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};

export async function mountStorefront(host,{review=false,clay=false}={}) {
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power',preserveDrawingBuffer:review});
  renderer.setPixelRatio(Math.max(1,Math.min(devicePixelRatio||1,1.5)));
  renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.localClippingEnabled=true;
  const canvas=renderer.domElement;canvas.setAttribute('aria-hidden','true');host.append(canvas);
  const scene=new THREE.Scene(),model=createDumplingStorefront({clay});scene.add(model);
  const {parts,materials,motionParts,explode}=model.userData.sculptRuntime;
  scene.add(new THREE.HemisphereLight(0xfff0dc,0x8d5d47,1.15));
  const key=new THREE.DirectionalLight(0xffead2,1.7);key.position.set(-3.5,7,6);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.normalBias=.035;key.shadow.bias=-.0003;
  Object.assign(key.shadow.camera,{left:-5,right:5,top:7,bottom:-4,near:.1,far:25});key.shadow.radius=4;scene.add(key);
  const fill=new THREE.DirectionalLight(0xf5e8d8,.65);fill.position.set(5,4,4);scene.add(fill);
  // A short soft contact shadow grounds the miniature without a long dark wedge
  // across the brand background. Geometry still receives real directional shadows.
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;const shadowCtx=shadowCanvas.getContext('2d');const gradient=shadowCtx.createRadialGradient(64,64,15,64,64,64);gradient.addColorStop(0,'rgba(38,17,9,.22)');gradient.addColorStop(.55,'rgba(38,17,9,.11)');gradient.addColorStop(1,'rgba(38,17,9,0)');shadowCtx.fillStyle=gradient;shadowCtx.fillRect(0,0,128,128);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(7.5,4.3),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));ground.rotation.x=-Math.PI/2;ground.position.set(0,-.17,.6);scene.add(ground);
  const camera=new THREE.OrthographicCamera(-4,4,3.5,-3.5,.1,70);
  let active=false,disposed=false,frame=0,last=0,elapsed=0,settled=false,yaw=.10,targetYaw=.10,pitch=.10,targetPitch=.10,doorOpen=false,doorAngle=0,exploded=0,fixedView=null;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  if(reduce.matches){elapsed=3;settled=true;}
  const target=new THREE.Vector3(0,2.58,.25);
  const sequence=[['shell',0,.8],['facade',.13,.85],['canopy',.38,.85],['side-canopy',.52,.85],['stool-left',.76,.65],['stool-right',.91,.65]];
  function pose(seconds){
    for(const [id,delay,duration] of sequence){const g=parts.get(id),rest=g.userData.restPosition,t=ease((seconds-delay)/duration);g.position.fromArray(rest);g.rotation.set(0,0,0);g.scale.set(1,1,1);g.visible=seconds>=delay;
      if(id.includes('canopy')){g.position.y-=(1-t)*.65;g.rotation.x=-(1-t)*.7;g.scale.z=.15+t*.85;}
      else{g.position.y-=(1-t)*(id.includes('stool')?.65:3.8);if(id.includes('stool'))g.position.z+=(1-t)*.35;}
    }
    const lightOn=smooth((seconds-1.35)/.8);if(model.userData.interiorLight)model.userData.interiorLight.intensity=.8+lightOn*1.8;
    if(materials.lamps)materials.lamps.emissiveIntensity=lightOn*1.5;
    if(exploded)explode(exploded);
    const door=parts.get('door');door.rotation.y=doorAngle;
    host.dataset.phase=seconds>=2.4?'settled':seconds<.4?'building':seconds<1.4?'assembling':'lighting';
  }
  function cameraPose(){
    if(fixedView){camera.position.fromArray(fixedView);camera.lookAt(target);return;}
    const r=14;camera.position.set(Math.sin(yaw)*r,2.58+Math.sin(pitch)*r,.25+Math.cos(yaw)*r);camera.lookAt(target);
  }
  function render(){pose(elapsed);cameraPose();renderer.render(scene,camera);host.dataset.triangles=String(renderer.info.render.triangles);host.dataset.drawCalls=String(renderer.info.render.calls);}
  function tick(now){frame=0;if(disposed||!active||document.hidden)return;const dt=last?Math.min((now-last)/1000,.05):0;last=now;
    if(!settled){elapsed+=dt;if(elapsed>=2.7){elapsed=2.7;settled=true;}}
    const alpha=reduce.matches?1:1-Math.exp(-dt*9);yaw+=(targetYaw-yaw)*alpha;pitch+=(targetPitch-pitch)*alpha;
    const targetDoor=doorOpen?-.55:0;doorAngle+=(targetDoor-doorAngle)*alpha;
    render();if(!settled||Math.abs(yaw-targetYaw)+Math.abs(pitch-targetPitch)+Math.abs(doorAngle-targetDoor)>.0008)frame=requestAnimationFrame(tick);
  }
  function wake(){if(active&&!disposed&&!frame&&!document.hidden){last=0;frame=requestAnimationFrame(tick);}}
  function resize(){const {width,height}=host.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height,false);const aspect=width/height,span=Math.max(3.7,4.25/aspect);camera.left=-span*aspect;camera.right=span*aspect;camera.top=span;camera.bottom=-span;camera.updateProjectionMatrix();if(active)render();}
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);
  let pointer=null;
  const down=e=>{if(!e.isPrimary||e.button!==0)return;pointer={id:e.pointerId,x:e.clientX,y:e.clientY,yaw:targetYaw,moved:false};};
  const move=e=>{if(reduce.matches)return;const r=host.getBoundingClientRect();
    if(pointer&&e.pointerId===pointer.id){const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;if(Math.abs(dx)>7&&Math.abs(dx)>Math.abs(dy)){pointer.moved=true;if(!host.hasPointerCapture(e.pointerId))host.setPointerCapture(e.pointerId);targetYaw=clamp(pointer.yaw+dx/r.width*.95,-.5,.5);wake();}}
    else if(e.pointerType==='mouse'){targetYaw=.10+(e.clientX-r.left-r.width/2)/r.width*.06;targetPitch=.10-(e.clientY-r.top-r.height/2)/r.height*.025;wake();}
  };
  const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();
  function pick(x,y){const r=host.getBoundingClientRect();ndc.set((x-r.left)/r.width*2-1,1-(y-r.top)/r.height*2);ray.setFromCamera(ndc,camera);return ray.intersectObject(model,true)[0]?.object.userData.partId||null;}
  const up=e=>{if(!pointer||pointer.id!==e.pointerId)return;const didMove=pointer.moved;pointer=null;if(host.hasPointerCapture(e.pointerId))host.releasePointerCapture(e.pointerId);if(!didMove){const part=pick(e.clientX,e.clientY);host.dataset.selectedPart=part||'';if(part){doorOpen=!doorOpen;if(reduce.matches)doorAngle=doorOpen?-.55:0;wake();}}};
  const cancel=()=>{pointer=null;};const leave=()=>{if(!pointer){targetYaw=.10;targetPitch=.10;wake();}};
  const keydown=e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();targetYaw=clamp(targetYaw+(e.key==='ArrowLeft'?-.12:.12),-.5,.5);wake();}else if(e.key==='Enter'||e.key===' '){e.preventDefault();doorOpen=!doorOpen;wake();}};
  const visibility=()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;last=0;}else wake();};
  const reduced=()=>{if(reduce.matches){elapsed=3;settled=true;yaw=targetYaw;pitch=targetPitch;doorAngle=doorOpen?-.55:0;}wake();};
  const lost=e=>{e.preventDefault();host.dataset.renderState='fallback';cancelAnimationFrame(frame);frame=0;};
  const restored=()=>{host.dataset.renderState='ready';wake();};
  for(const [event,fn] of Object.entries({pointerdown:down,pointermove:move,pointerup:up,pointercancel:cancel,pointerleave:leave,keydown}))host.addEventListener(event,fn);
  document.addEventListener('visibilitychange',visibility);reduce.addEventListener('change',reduced);canvas.addEventListener('webglcontextlost',lost);canvas.addEventListener('webglcontextrestored',restored);
  await model.userData.ready;
  const groundClip=new THREE.Plane(new THREE.Vector3(0,1,0),.16);
  model.traverse(o=>{if(o.isMesh){for(const material of Array.isArray(o.material)?o.material:[o.material])material.clippingPlanes=[groundClip];}});
  resize();render();host.dataset.renderState='ready';
  return {
    setActive(value){active=value;if(value)wake();else{cancelAnimationFrame(frame);frame=0;last=0;}},
    setTime(value){elapsed=clamp(value,0,3);settled=true;render();},
    setView(view){fixedView={front:[0,2.58,14],left:[7,5.5,11],right:[-7,5.5,11],hero:null}[view]??null;render();},
    setExploded(value){exploded=value;render();},
    inspect(){const interiorLayout=[];model.traverse(o=>{if(o.userData.storefrontRole)interiorLayout.push({role:o.userData.storefrontRole,position:o.position.toArray()});});return {parts:[...parts.keys()],motionParts,interiorLayout,triangles:renderer.info.render.triangles,drawCalls:renderer.info.render.calls,phase:host.dataset.phase,active,animating:!!frame};},
    dispose(){disposed=true;cancelAnimationFrame(frame);resizeObserver.disconnect();document.removeEventListener('visibilitychange',visibility);reduce.removeEventListener('change',reduced);canvas.removeEventListener('webglcontextlost',lost);canvas.removeEventListener('webglcontextrestored',restored);
      for(const [event,fn] of Object.entries({pointerdown:down,pointermove:move,pointerup:up,pointercancel:cancel,pointerleave:leave,keydown}))host.removeEventListener(event,fn);
      const geometries=new Set(),mats=new Set(Object.values(materials)),textures=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])mats.add(m);});for(const g of geometries)g.dispose();for(const m of mats){for(const v of Object.values(m))if(v?.isTexture)textures.add(v);m.dispose();}for(const t of textures)t.dispose();renderer.dispose();canvas.remove();
    }
  };
}
