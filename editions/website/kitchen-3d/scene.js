// Procedural 3D animation. No generated stills or photographic motion claims.
import * as T from '/three.js';
const W=innerWidth,H=innerHeight,scene=new T.Scene();scene.background=new T.Color('#59131d');
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(W,H);renderer.setPixelRatio(1);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;document.body.prepend(renderer.domElement);
const camera=new T.PerspectiveCamera(38,W/H,.1,100);camera.position.set(6,7,9);
const ambient=new T.HemisphereLight('#fff3d6','#59111c',1.1);scene.add(ambient);
const key=new T.DirectionalLight('#ffedc7',4);key.position.set(-4,9,5);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-7,right:7,top:7,bottom:-7,near:.1,far:30});key.shadow.normalBias=.03;key.shadow.bias=-.0002;key.shadow.radius=4;scene.add(key);
const rim=new T.DirectionalLight('#ffc9a4',2);rim.position.set(5,5,-4);scene.add(rim);
// A small studio reflection environment gives metal a readable surface.
const env=new T.Scene();env.background=new T.Color('#887a70');
for(const [x,y,z,sx,sy,sz]of [[-5,4,0,.1,7,8],[4,5,2,4,.1,8],[0,3,-5,8,5,.1]]){const m=new T.Mesh(new T.BoxGeometry(sx,sy,sz),new T.MeshBasicMaterial({color:'#fff1d4'}));m.position.set(x,y,z);env.add(m)}
const pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(env,.08).texture;
const mat=(color,roughness=.6,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
const cream=mat('#eee0b8',.63),edge=mat('#eddeb3',.6),wood=mat('#a26935',.58),woodDark=mat('#633d25',.65),steel=mat('#bfc6c7',.25,.87),darkSteel=mat('#33343b',.34,.85),red=mat('#871c29',.35),plateMat=mat('#f7ecd4',.2);
// Seeded, low-contrast dough grain: surface texture rather than photo cutouts.
let seed=537;function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
const texCanvas=document.createElement('canvas');texCanvas.width=texCanvas.height=128;const ctx=texCanvas.getContext('2d'),pix=ctx.createImageData(128,128);for(let i=0;i<pix.data.length;i+=4){const v=195+random()*45;pix.data[i]=pix.data[i+1]=pix.data[i+2]=v;pix.data[i+3]=255}ctx.putImageData(pix,0,0);const grain=new T.CanvasTexture(texCanvas);grain.wrapS=grain.wrapT=T.RepeatWrapping;grain.repeat.set(3,3);cream.bumpMap=grain;cream.bumpScale=.018;
const wc=document.createElement('canvas');wc.width=wc.height=512;const wx=wc.getContext('2d');wx.fillStyle='#aa7647';wx.fillRect(0,0,512,512);for(let i=0;i<2100;i++){const x=random()*512,y=random()*512;wx.strokeStyle=i%3?'rgba(63,32,15,.09)':'rgba(249,211,159,.14)';wx.lineWidth=.25+random()*.7;wx.beginPath();wx.moveTo(x,y);wx.bezierCurveTo(x+random()*4,y+25,x-random()*6,y+65,x+random()*3,y+120);wx.stroke()}const woodTexture=new T.CanvasTexture(wc);woodTexture.colorSpace=T.SRGBColorSpace;wood.map=woodTexture;wood.color.set('#b69060');wood.bumpMap=woodTexture;wood.bumpScale=.02;
function mesh(geo,material,parent=scene){const m=new T.Mesh(geo,material);m.castShadow=m.receiveShadow=true;parent.add(m);return m}
function sphere(r,material,parent){return mesh(new T.SphereGeometry(r,28,20),material,parent)}
function cylinder(r1,r2,h,material,parent){return mesh(new T.CylinderGeometry(r1,r2,h,64),material,parent)}
function tube(points,r,material,parent){return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),72,r,8,false),material,parent)}
const floor=mesh(new T.PlaneGeometry(200,200),mat('#59131d',.8));floor.rotation.x=-Math.PI/2;floor.position.y=-.06;
// Restrained red tile backdrop, no unrelated kitchen props.
const wall=mesh(new T.PlaneGeometry(200,100),mat('#441018',.8));wall.position.set(0,3.5,-5);
for(let i=-7;i<8;i++)for(let j=0;j<5;j++){const tile=mesh(new T.BoxGeometry(.94,.94,.045),red);tile.position.set(i*.99,j*.99+.45,-4.97)}
const prep=new T.Group();scene.add(prep);
const board=mesh(new T.BoxGeometry(6.4,.23,4.3),wood,prep);board.position.y=.13;
for(let i=-3;i<=3;i++){const line=mesh(new T.BoxGeometry(.009,.003,4.1),woodDark,prep);line.position.set(i*.79,.248,0)}
// Flour stays on the board. Deliberately not a dramatic airborne cloud.
const flourPos=[];for(let i=0;i<600;i++)flourPos.push((random()-.5)*5.9,.255,(random()-.5)*3.9);
const fg=new T.BufferGeometry();fg.setAttribute('position',new T.Float32BufferAttribute(flourPos,3));prep.add(new T.Points(fg,new T.PointsMaterial({color:'#f5e3c0',size:.018,transparent:true,opacity:.65})));
// Foldable wrapper: its two half-discs rise around the filling and meet at a pleated seam.
function wrapper(parent,r=1.45){
 const N=72,M=40,pos=[],uv=[],ix=[];for(let i=0;i<=N;i++)for(let j=0;j<=M;j++){pos.push(0,0,0);uv.push(i/N,j/M)}
 for(let i=0;i<N;i++)for(let j=0;j<M;j++){const a=i*(M+1)+j,b=a+M+1;ix.push(a,b,a+1,b,b+1,a+1)}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);const material=cream.clone();material.side=T.DoubleSide;
 const obj=mesh(g,material,parent);
 const update=(fold=0,pleat=0)=>{const a=g.attributes.position;for(let i=0;i<=N;i++){const x=(i/N*2-1)*r,arc=Math.sqrt(Math.max(0,r*r-x*x));for(let j=0;j<=M;j++){const v=j/M*2-1,phi=fold*Math.PI/2,s=Math.abs(v),body=Math.sin(Math.PI*s)*.66*Math.sin(phi)*Math.pow(1-x*x/(r*r),.7);const z=v*arc*Math.cos(phi)+Math.sign(v)*body;const ripple=Math.sin(i/N*Math.PI*20)*.032*pleat*Math.pow(s,6);const y=s*arc*Math.sin(phi)*.66+ripple+.018;const k=i*(M+1)+j;a.setXYZ(k,x,y,z+Math.sign(v)*ripple*.55)}}a.needsUpdate=true;g.computeVertexNormals();g.computeBoundingSphere()};update();return {obj,update};
}
const doughGroup=new T.Group();doughGroup.position.y=.27;prep.add(doughGroup);const dough=wrapper(doughGroup);
const rolling=new T.Group();prep.add(rolling);const barrel=cylinder(.2,.2,3.65,woodDark,rolling);barrel.rotation.z=Math.PI/2;
for(const x of [-2.05,2.05]){const handle=cylinder(.105,.105,.55,wood,rolling);handle.rotation.z=Math.PI/2;handle.position.x=x;const cap=sphere(.107,wood,rolling);cap.position.x=x+Math.sign(x)*.26}
for(let i=0;i<6;i++){const ball=sphere(.2,cream,prep);ball.scale.set(1.1,.8,1);ball.position.set(-2.6+i*.43,.42,-1.65)}
const filling=new T.Group();doughGroup.add(filling);const pink=mat('#b78569',.74),pale=mat('#d6ab83',.7),green=mat('#3e642e',.66);
for(let i=0;i<95;i++){const a=random()*Math.PI*2,r=Math.sqrt(random())*.59;const bit=sphere(.075+random()*.05,i%7===0?green:i%3===0?pale:pink,filling);bit.scale.set(1,.55+random()*.6,.7+random()*.7);bit.position.set(Math.cos(a)*r,.1+Math.sqrt(1-r/.65)*.3+random()*.08,Math.sin(a)*r*.72)}
function spoon(parent){const g=new T.Group();parent.add(g);const bowl=sphere(.58,steel,g);bowl.scale.set(.8,.1,1.15);const handle=mesh(new T.BoxGeometry(.15,.075,2.4),steel,g);handle.position.z=-1.5;return g}
const fillingSpoon=spoon(prep);
function dumpling(parent,scale=1){const g=new T.Group();parent.add(g);const w=wrapper(g);w.update(1,1);g.scale.setScalar(scale);const points=[];for(let i=0;i<=50;i++){const x=(i/50*2-1)*1.45;points.push(new T.Vector3(x,Math.sqrt(Math.max(0,1.45**2-x*x))*.66+.024+Math.sin(i/50*Math.PI*20)*.032,0))}tube(points,.035,edge,g);return g}
// Steel pot, visible open rim and water rather than an opaque capped cylinder.
function pot(parent,scale=1){const g=new T.Group();parent.add(g);g.scale.setScalar(scale);
 const pts=[[0,0],[1.55,0],[1.65,.12],[1.69,1.65],[1.74,1.73],[1.7,1.79],[1.64,1.73],[1.59,.13],[0,.13]].map(([x,y])=>new T.Vector2(x,y));mesh(new T.LatheGeometry(pts,96),steel,g);
 for(const x of [-2,2]){const ring=mesh(new T.TorusGeometry(.36,.065,12,40),steel,g);ring.rotation.x=Math.PI/2;ring.position.set(x,1.3,0);const mount=mesh(new T.BoxGeometry(.4,.13,.2),steel,g);mount.position.set(x*.87,1.3,0)}
 const water=mesh(new T.CircleGeometry(1.61,72),new T.MeshPhysicalMaterial({color:'#536b70',roughness:.12,metalness:.62,transparent:true,opacity:.76}),g);water.rotation.x=-Math.PI/2;water.position.y=1.47;
 const bubbles=[];for(let i=0;i<42;i++){const r=Math.sqrt(random())*1.48,a=random()*Math.PI*2;const b=sphere(.018+random()*.024,new T.MeshStandardMaterial({color:'#b4c9ca',roughness:.1,metalness:.35,transparent:true,opacity:.5}),g);b.scale.y=.35;b.position.set(Math.cos(a)*r,1.48,Math.sin(a)*r);bubbles.push(b)}
 return {g,water,bubbles};}
const boiling=new T.Group();scene.add(boiling);const stove=mesh(new T.BoxGeometry(4.6,.3,4),darkSteel,boiling);stove.position.y=.1;const mainPot=pot(boiling);mainPot.g.position.y=.3;
const drops=[];for(let i=0;i<5;i++)drops.push(dumpling(boiling,.4));
// Soft steam sprites with deterministic drift, exported as actual changing frames.
const sc=document.createElement('canvas');sc.width=sc.height=64;const sx=sc.getContext('2d'),gradient=sx.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'rgba(255,241,216,.5)');gradient.addColorStop(1,'rgba(255,241,216,0)');sx.fillStyle=gradient;sx.fillRect(0,0,64,64);const steamTex=new T.CanvasTexture(sc),steam=[];
for(let i=0;i<22;i++){const sprite=new T.Sprite(new T.SpriteMaterial({map:steamTex,transparent:true,opacity:.2,depthWrite:false}));boiling.add(sprite);steam.push(sprite)}
const splashes=[];for(let i=0;i<35;i++)splashes.push(sphere(.027,mat('#d7ddcf',.15,.25),boiling));
// Serving scene: food is carried by the skimmer, then slides onto the plate.
const serving=new T.Group();scene.add(serving);const servingPot=pot(serving,.72);servingPot.g.position.set(-2.8,0,-.5);
const dish=mesh(new T.LatheGeometry([[0,.08],[1.6,.08],[1.85,.13],[2.02,.3],[2.1,.34],[2.1,.4],[2.03,.42],[1.85,.25],[1.5,.18],[0,.18]].map(([x,y])=>new T.Vector2(x,y)),96),plateMat,serving);dish.position.x=1.3;
const plated=[];for(let i=0;i<5;i++){const d=dumpling(serving,.4);const a=i/5*Math.PI*2;d.position.set(1.3+Math.cos(a)*.92,.2,Math.sin(a)*.92);d.rotation.y=-a;plated.push(d)}
const skimmer=new T.Group();serving.add(skimmer);
const rimSkim=mesh(new T.TorusGeometry(.72,.035,10,64),steel,skimmer);rimSkim.rotation.x=Math.PI/2;
for(let i=-5;i<=5;i++){const z=i*.12,len=Math.sqrt(Math.max(0,.7*.7-z*z));tube([new T.Vector3(-len,-.04,z),new T.Vector3(0,-.16,z),new T.Vector3(len,-.04,z)],.012,steel,skimmer)}
for(let i=-5;i<=5;i++){const x=i*.12,len=Math.sqrt(Math.max(0,.7*.7-x*x));tube([new T.Vector3(x,-.04,-len),new T.Vector3(x,-.16,0),new T.Vector3(x,-.04,len)],.01,steel,skimmer)}
const sh=mesh(new T.BoxGeometry(.105,.065,2.7),steel,skimmer);sh.position.z=-1.95;
const carried=[dumpling(serving,.35),dumpling(serving,.35)];
const clamp=x=>Math.min(1,Math.max(0,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x)},mix=(a,b,t)=>a+(b-a)*t;
const boundaries=[0,4.5,7.5,12,18,23],titles=['Roll.','Fill.','Fold.','Boil.','Serve.'];
window.renderFrame=function(time){
 const t=((time%23)+23)%23;let shot=boundaries.findIndex((v,i)=>i<5&&t>=v&&t<boundaries[i+1]);if(shot<0)shot=0;const u=t-boundaries[shot],duration=boundaries[shot+1]-boundaries[shot],p=u/duration;
 document.getElementById('title').textContent=titles[shot];document.getElementById('count').textContent=`0${shot+1} / 05`;document.querySelectorAll('.chapter').forEach((e,i)=>e.classList.toggle('active',i===shot));
 const transition=Math.max(1-clamp(u/.22),1-clamp((duration-u)/.22));document.getElementById('veil').style.opacity=transition*.96;
 prep.visible=shot<3;boiling.visible=shot===3;serving.visible=shot===4;
 rolling.visible=shot===0;filling.visible=shot===1||shot===2;fillingSpoon.visible=shot===1;
 doughGroup.rotation.set(0,0,0);doughGroup.scale.set(1,1,1);doughGroup.position.set(0,.27,0);
 if(shot===0){const flatten=ease(p*.95);dough.update(0);doughGroup.scale.set(mix(.67,1,flatten),1,mix(.67,1,flatten));rolling.position.set(0,.48,Math.sin(u*3.4)*.85);rolling.rotation.x=u*3.4;camera.position.set(5.5,6.8,8.4);camera.lookAt(0,.1,0)}
 if(shot===1){dough.update(0);const enter=ease(u/1.2),leave=ease((u-1.7)/.9),deposit=ease((u-1.05)/.5);fillingSpoon.position.set(mix(-1.2,0,enter)+leave*1.4,.47+(1-enter)*1.2+leave*1.5,mix(-1.8,0,enter)-leave*.7);fillingSpoon.rotation.set(-.2-enter*.12+leave*.6,0,-leave*.25);filling.scale.setScalar(.8);filling.position.set(mix(fillingSpoon.position.x,0,deposit),mix(fillingSpoon.position.y-.22,.07,deposit),mix(fillingSpoon.position.z,0,deposit));camera.position.set(4,6.5,6.3);camera.lookAt(0,.2,0)}
 if(shot===2){const fold=ease((u-.45)/2.4),pleat=ease((u-2.4)/1.1);dough.update(fold,pleat);filling.scale.setScalar(.8);filling.position.set(0,.07+fold*.18,0);filling.visible=fold<.84;doughGroup.rotation.y=mix(-.18,.22,ease(p));camera.position.set(4.8,4.6,7.8);camera.lookAt(0,.5,0)}
 if(shot===3){camera.position.set(5.8,6.9,8.5);camera.lookAt(0,1.15,0);mainPot.bubbles.forEach((b,i)=>{const phase=(u*1.4+i*.183)%1;b.scale.setScalar(.5+Math.sin(phase*Math.PI)*.9);b.position.y=1.48+Math.sin(phase*Math.PI)*.07});
 drops.forEach((d,i)=>{const age=u-.35-i*.49,fall=clamp(age/.75);d.visible=age>=0;const a=i*2.4;d.position.set(Math.cos(a)*.85,age<.75?mix(4.4,1.78,fall*fall):1.73+Math.sin(u*2+i)*.06,Math.sin(a)*.76);d.rotation.set(age<.75?fall*.35:Math.PI/2-.15,i*.8+Math.sin(u+i)*.12,0)});
 steam.forEach((s,i)=>{const v=(u*.23+i/steam.length)%1;s.position.set(Math.sin(i*4.1+u*.4)*(.7+v*.3),1.8+v*2,Math.cos(i*2.7)*.7);s.scale.setScalar(.55+v*.9);s.material.opacity=Math.sin(v*Math.PI)*.15});
 splashes.forEach((s,i)=>{const age=(u-.35-(i%5)*.49-.75);s.visible=age>0&&age<.55;if(s.visible){const a=i*2.4,dist=.4+age*1.7;s.position.set(Math.cos(a)*dist,1.8+age*2.5-age*age*6,Math.sin(a)*dist)}});
 }
 if(shot===4){const travel=ease(u/2.6),tip=ease((u-2.45)/.8),release=ease((u-2.9)/.8);camera.position.set(6.8,6.2,9.4);camera.lookAt(0,1,0);skimmer.position.set(mix(-2.8,1.3,travel),mix(1.6,1.35,travel)+Math.sin(travel*Math.PI)*1.45,-.4);skimmer.rotation.z=tip*.7;skimmer.rotation.y=-.3;
 carried.forEach((d,i)=>{d.position.set(skimmer.position.x+mix((i-.5)*.5,(i-.5)*.8,release),mix(skimmer.position.y+.03,.2,release),mix(-.4,.1+(i-.5)*.65,release));d.rotation.set(0,i*.5,tip*.2*(1-release))});
 }
 renderer.render(scene,camera);return {shot,time:t,triangles:renderer.info.render.triangles};
};
await document.fonts.ready;window.renderFrame(1);window.ready=true;
if(!new URLSearchParams(location.search).has('capture')){const start=performance.now();function loop(){window.renderFrame((performance.now()-start)/1000);requestAnimationFrame(loop)}loop()}
