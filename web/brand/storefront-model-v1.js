import * as THREE from '../vendor/three.module.js';

export function createDumplingStorefront({clay=false,tonal=false}={}) {
  const root=new THREE.Group(); root.name='root'; root.scale.y=1.26;
  const parts=new Map([['root',root]]), materials={};
  const palette=tonal?{red:0xa7614c,plaster:0xc2a086,wood:0xa77659,metal:0xd8bea2,glass:0xd9c7af,tile:0x784737,cream:0xe4c5a6}:{red:0xb82d1d,plaster:0xe6d6b7,wood:0xaa7341,metal:0xb8b6a8,glass:0xc7dbd4,tile:0x192d38,cream:0xfff2d5};
  for(const [id,color] of Object.entries(palette)) materials[id]=new THREE.MeshStandardMaterial({color:clay?0x777777:color,roughness:.7});
  const ready=[];
  if(!clay){
    materials.red.roughness=.62;materials.plaster.roughness=.92;materials.wood.roughness=.5;materials.metal.metalness=.55;materials.metal.roughness=.28;materials.tile.roughness=.34;
    if(!tonal)materials.red.color.set(0xa32222);
    if(tonal){materials.metal.metalness=.2;materials.metal.roughness=.55;materials.tile.roughness=.7;}
    const c=document.createElement('canvas');c.width=c.height=1024;const ctx=c.getContext('2d');ctx.fillStyle='#b5814b';ctx.fillRect(0,0,1024,1024);
    for(let j=0;j<310;j++){const y=j*3.4;ctx.strokeStyle=`rgba(84,42,19,${.04+(j%9)*.006})`;ctx.lineWidth=.5+(j%4)*.4;ctx.beginPath();for(let x=0;x<=1024;x+=8){const yy=y+Math.sin(x*.008+j*.13)*2+Math.sin(x*.023+j)*.8;x?ctx.lineTo(x,yy):ctx.moveTo(x,yy);}ctx.stroke();}
    const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(.8,.8);materials.wood.map=tex;materials.wood.color.set(tonal?0xcbb6a8:0xeee5d8);
    const rough=new Uint8Array(1024*1024*4);for(let i=0;i<1024*1024;i++){const x=i%1024,y=Math.floor(i/1024),v=175+Math.round(Math.sin(y*.2+x*.008)*5+Math.sin(y*1.7)*3);rough.set([v,v,v,255],i*4);}
    const roughTex=new THREE.DataTexture(rough,1024,1024);roughTex.needsUpdate=true;roughTex.wrapS=roughTex.wrapT=THREE.RepeatWrapping;materials.wood.roughnessMap=roughTex;
    const normal=new Uint8Array(1024*1024*4);for(let i=0;i<1024*1024;i++){const x=i%1024,y=Math.floor(i/1024);normal.set([128,128+Math.round(Math.cos(y*.2+x*.008)*4),255,255],i*4);}const nt=new THREE.DataTexture(normal,1024,1024);nt.needsUpdate=true;materials.wood.normalMap=nt;materials.wood.normalScale.set(.14,.14);
  }
  function part(id,parent='root',pos=[0,0,0]) {
    const g=new THREE.Group();g.name=id;g.position.fromArray(pos);parts.get(parent).add(g);parts.set(id,g);
    g.userData={partId:id,home:pos.slice(),collider:{type:'box'},sockets:{origin:[0,0,0]}};return g;
  }
  function box(parent,w,h,d,x,y,z,mat='plaster') {
    const bevel=Math.min(.012,w/8,h/8,d/8);
    const shape=new THREE.Shape();shape.moveTo(-w/2+bevel,-h/2+bevel);shape.lineTo(w/2-bevel,-h/2+bevel);shape.lineTo(w/2-bevel,h/2-bevel);shape.lineTo(-w/2+bevel,h/2-bevel);shape.closePath();
    const geo=new THREE.ExtrudeGeometry(shape,{depth:d-2*bevel,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:2,steps:1});geo.translate(0,0,-d/2+bevel);
    const m=new THREE.Mesh(geo,materials[mat]);m.position.set(x,y,z);m.castShadow=mat!=='glass';m.receiveShadow=mat!=='glass';parent.add(m);return m;
  }
  function bentTube(parent,points,r=.018,mat='metal') {
    const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    const m=new THREE.Mesh(new THREE.TubeGeometry(path,24,r,8,false),materials[mat]);m.castShadow=true;parent.add(m);return m;
  }
  function awning(g,w) {
    const shape=new THREE.Shape();shape.moveTo(0,.94);shape.lineTo(-.94,.16);shape.lineTo(-.94,.075);shape.lineTo(0,.855);shape.closePath();
    const geo=new THREE.ExtrudeGeometry(shape,{depth:w-.025,bevelEnabled:true,bevelSegments:2,bevelSize:.01,bevelThickness:.01,steps:1});geo.rotateY(Math.PI/2);geo.translate(-w/2,0,0);
    const roof=new THREE.Mesh(geo,materials.red);roof.castShadow=true;roof.receiveShadow=true;g.add(roof);
    box(g,w,.1,.065,0,.1,.94,'red');
    const sideShape=new THREE.Shape();sideShape.moveTo(0,.88);sideShape.lineTo(-.9,.12);sideShape.lineTo(0,.12);sideShape.closePath();
    for(const x of [-w/2+.012,w/2-.037]) {const geom=new THREE.ExtrudeGeometry(sideShape,{depth:.025,bevelEnabled:false});geom.rotateY(Math.PI/2);geom.translate(x,0,0);const m=new THREE.Mesh(geom,materials.red);m.castShadow=true;g.add(m);}
  }
  function rod(parent,a,b,r=.019,mat='metal') {
    const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),delta=bv.clone().sub(av);
    const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,delta.length(),10),materials[mat]);m.position.copy(av.add(bv).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());m.castShadow=true;parent.add(m);return m;
  }
  const shell=part('shell');
  // Keep the bar INSIDE the dining room. The old shallow shell made its three
  // oversize bottle shelves read as a shop-window display (owner correction).
  box(part('floor','shell'),6,.12,5.4,0,-.06,-.7);
  box(part('back-wall','shell'),5.8,3.8,.12,0,1.9,-3.1);
  box(part('left-wall','shell'),.12,3.8,4.3,-2.84,1.9,-.95);
  box(part('right-wall','shell'),.12,3.8,4.3,2.84,1.9,-.95);
  // Thin top closure and skirting keep the diorama architectural, not an open crate.
  box(shell,5.8,.10,4.3,0,3.78,-.95);
  box(shell,.08,.78,4.18,-2.75,.39,-.95,'wood');box(shell,.08,.78,4.18,2.75,.39,-.95,'wood');
  const facade=part('facade','root',[0,0,1.2]);
  materials.glass.transparent=true;materials.glass.opacity=clay?.18:.10;materials.glass.depthWrite=false;materials.glass.roughness=.12;
  function windowFrame(g,x,y,w,h){
    box(g,w,h,.03,x,y,0,'glass');
    for(const xx of [x-w/2,x+w/2])box(g,.075,h+.075,.12,xx,y,0,'red');
    for(const yy of [y-h/2,y+h/2])box(g,w+.075,.075,.12,x,yy,0,'red');
  }
  windowFrame(part('window-left','facade'),-1.65,1.66,2.15,3.2);
  const door=part('door','facade',[-.5,0,0]);windowFrame(door,.76,1.66,1.52,3.2);
  windowFrame(part('window-right','facade'),2,2,1.4,2.45);
  const mullions=part('mullions','facade');
  for(const [x,w] of [[-1.65,2.2],[.26,1.57],[2,1.47]])box(mullions,w,.07,.14,x,2.84,0,'red');
  box(mullions,2.2,.07,.14,-1.65,1.05,0,'red');box(mullions,1.47,.07,.14,2,1.2,0,'red');
  box(mullions,.14,3.4,.22,1.16,1.7,0,'plaster');
  const tiles=part('tiles','facade',[2,.39,0]);box(tiles,1.48,.78,.07,0,0,-.025,'plaster');
  const tileGeo=new THREE.BoxGeometry(.096,.118,.025),tileMesh=new THREE.InstancedMesh(tileGeo,materials.tile,14*6);let ti=0;const tileDummy=new THREE.Object3D();
  for(let row=0;row<6;row++)for(let col=0;col<14;col++){tileDummy.position.set(-.689+col*.106,-.325+row*.13,.027);tileDummy.updateMatrix();tileMesh.setMatrixAt(ti++,tileDummy.matrix);}tileMesh.castShadow=true;tileMesh.receiveShadow=true;tiles.add(tileMesh);
  const handle=part('door-handle','door',[1.28,1.35,.11]);rod(handle,[0,0,0],[0,.3,0]);
  const canopy=part('canopy','root',[-.83,3.4,1.2]);
  awning(canopy,3.95);
  const small=part('side-canopy','root',[2,3.4,1.2]);
  awning(small,1.55);
  for(const [id,x] of [['stool-left',-2.07],['stool-right',-.96]]) {
    const g=part(id,'root',[x,0,1.76]);
    function woodPanel(w,h,d,x,y,z,r){const shape=new THREE.Shape();shape.moveTo(-w/2+r,-h/2);shape.lineTo(w/2-r,-h/2);shape.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);shape.lineTo(w/2,h/2-r);shape.quadraticCurveTo(w/2,h/2,w/2-r,h/2);shape.lineTo(-w/2+r,h/2);shape.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);shape.lineTo(-w/2,-h/2+r);shape.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);const geo=new THREE.ExtrudeGeometry(shape,{depth:d,bevelEnabled:true,bevelSize:.006,bevelThickness:.006,bevelSegments:2,curveSegments:5});geo.translate(0,0,-d/2);const m=new THREE.Mesh(geo,materials.wood);m.position.set(x,y,z);m.castShadow=true;g.add(m);return m;}
    const seat=woodPanel(.64,.47,.045,0,.89,0,.07);seat.rotation.x=-Math.PI/2;
    woodPanel(.6,.24,.042,0,1.2,-.22,.06);
    const rails=part(id==='stool-left'?'stool-rails-left':'stool-rails-right',id);
    for(const sx of [-1,1])for(const sz of [-1,1])rod(rails,[sx*.29,0,sz*.25],[sx*.24,.89,sz*.19]);
    bentTube(rails,[[-.24,.88,-.19],[-.24,1.24,-.23],[-.19,1.3,-.23],[.19,1.3,-.23],[.24,1.24,-.23],[.24,.88,-.19]]);
    rod(rails,[-.27,.3,.23],[.27,.3,.23]);
  }
  const interior=part('interior','shell');
  // Reference: stainless service counter, red rear wall and ONE high shelf.
  // Small bottles belong above that counter, behind the tables, not at the facade.
  box(interior,3.05,2.9,.045,.25,1.45,-3.02,'red');
  const barCounter=box(interior,2.75,.91,.64,.12,.455,-2.48,'metal');barCounter.userData.storefrontRole='bar-counter';
  box(interior,2.88,.065,.76,.12,.95,-2.48,'metal');
  box(interior,.9,1.12,.12,-.2,1.63,-2.94,'metal');
  box(interior,1.75,.06,.34,-.12,2.24,-2.78,'metal');
  for(let i=0;i<9;i++){
    const x=-.86+i*.185,h=.16+(i%3)*.02,y=2.28;
    const bottle=new THREE.Mesh(new THREE.CylinderGeometry(.031,.037,h,10),materials[i%3?'tile':'wood']);bottle.position.set(x,y+h/2,-2.77);bottle.userData.storefrontRole='bar-bottle';bottle.castShadow=true;interior.add(bottle);
    rod(interior,[x,y+h,-2.77],[x,y+h+.044,-2.77],.014,'tile');
    box(interior,.043,.045,.012,x,y+h*.45,-2.727,'cream');
  }
  for(const x of [-1.8,.1,1.95]) {
    box(interior,1,.06,.65,x,.82,.22,'wood');
    for(const dx of [-.4,.4])for(const dz of [-.23,.23])rod(interior,[x+dx,0,.22+dz],[x+dx,.8,.22+dz],.025,'wood');
    box(interior,.57,.055,.5,x,.47,.8,'wood');box(interior,.56,.35,.055,x,.83,1.02,'wood');
    for(const dx of [-.23,.23])for(const dz of [-.2,.2])rod(interior,[x+dx,0,.8+dz],[x+dx,.47,.8+dz],.025,'wood');
  }
  const lights=part('interior-lights','interior');for(const x of [-1.4,1.2])box(lights,.5,.045,.24,x,2.9,-.35,'cream');
  const lampMaterial=materials.cream.clone();lampMaterial.emissive=new THREE.Color(0xffba65);lampMaterial.emissiveIntensity=clay?0:1.4;lights.children.forEach(m=>m.material=lampMaterial);materials.lamps=lampMaterial;
  if(!clay){const glow=new THREE.PointLight(0xffcf87,8,7,2);glow.position.set(0,2.5,.35);lights.add(glow);root.userData.interiorLight=glow;}
  const logo=part('canopy-logo','canopy'),pattern=part('canopy-pattern','side-canopy');
  if(!clay){
    function decal(g,url,w,h,x,y,z,repeat=false){
      ready.push(new Promise(resolve=>{const img=new Image();img.onload=()=>{const c=document.createElement('canvas');c.width=1024;c.height=repeat?1024:512;const ctx=c.getContext('2d');
        if(repeat){for(let row=0;row<5;row++)for(let col=0;col<6;col++)ctx.drawImage(img,col*171+24,row*205+20,115,151);}else ctx.drawImage(img,0,0,1024,512);
        ctx.globalCompositeOperation='source-in';ctx.fillStyle=tonal?'#ecd1b3':'#fff0d3';ctx.fillRect(0,0,c.width,c.height);
        const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));m.name=`${g.name}-decal`;m.userData={partId:g.name,explodeWithParent:true};m.position.set(x,y,z);m.rotation.x=-.878;g.add(m);resolve();};img.onerror=()=>resolve();img.src=url;}));
    }
    decal(logo,'/brand/dumpling-lab-primary.png',2.1,.75,-.46,.515,.538);
    decal(pattern,'/brand/dumpling-symbol.svg',1.47,1.17,0,.51,.536,true);
  }
  root.userData.ready=Promise.all(ready);
  // One semantic part definition drives picking and exploded inspection.
  for(const [id,g] of parts){g.userData.restPosition=g.position.toArray();g.userData.restScale=g.scale.toArray();g.userData.collider={type:'box',bounds:new THREE.Box3().setFromObject(g)};}
  root.traverse(o=>{if(o.isMesh){let p=o.parent;while(p&&!parts.has(p.name))p=p.parent;const id=p?.name||'root';o.name ||= `${id}-mesh-${o.id}`;o.userData.partId=id;o.userData.explodeWithParent=true;}});
  const motionParts=['shell','facade','canopy','side-canopy','stool-left','stool-right'];
  function explode(amount){for(const id of motionParts){const g=parts.get(id),p=g.userData.restPosition;g.position.set(p[0]*(1+amount),p[1]+amount*(id==='shell'?-.3:id.includes('canopy')?1.5:.1),p[2]*(1+amount));}}
  root.userData.sculptRuntime={parts,materials,version:1,motionParts,explode};
  return root;
}
