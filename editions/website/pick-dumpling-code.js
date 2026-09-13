// Photo-cutout finale: pick -> dip -> offer to the viewer -> eat.
// No background loop, timers, audio or connection to ordering/cart state.
(()=>{
 const scene=document.querySelector('#pickScene');if(!scene)return;
 const pieces=[...scene.querySelectorAll('.pick-piece')],status=document.querySelector('#pickStatus'),replay=document.querySelector('#pickReplay');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let ready=false,loading=false,busy=false,animations=[],generation=0,active=null;
 const remaining=()=>pieces.filter(p=>!p.hidden);
 const still=()=>reduced.matches||document.body.dataset.motionPaused==='true';
 function reset(){
  generation++;animations.forEach(a=>a.cancel());animations=[];busy=false;active=null;
  scene.dataset.state=ready?(remaining().length?'ready':'empty'):'loading';
  pieces.forEach(p=>{p.classList.remove('is-picked');p.removeAttribute('aria-disabled')});
 }
 function eat(piece){
  const hadFocus=piece.contains(document.activeElement);
  piece.hidden=true;piece.disabled=true;
  reset();const next=remaining();
  replay.hidden=next.length>0;
  status.textContent=next.length?'That one’s for you. Another?':'Last bite. All yours.';
  if(hadFocus)(next[0]||replay).focus({preventScroll:true});
 }
 async function play(piece){
  if(!ready||busy||piece.hidden)return;
  busy=true;active=piece;const token=++generation;
  scene.dataset.state='playing';pieces.forEach(p=>p.setAttribute('aria-disabled','true'));
  status.textContent='';
  if(still()){eat(piece);return;}
  piece.classList.add('is-picked');
  const x=piece.style.getPropertyValue('--x'),y=piece.style.getPropertyValue('--y');
  const base='translate(-50%,-50%) rotate(var(--tilt))';
  const duration=4100;
  const movement=piece.animate([
   {left:x,top:y,transform:base,offset:0},
   {left:x,top:y,transform:base,offset:.12},
   {left:x,top:'26%',transform:'translate(-50%,-50%) rotate(-6deg) scale(1.08)',offset:.25},
   {left:'83%',top:'45%',transform:'translate(-50%,-50%) rotate(9deg) scale(1.08)',offset:.39},
   {left:'83%',top:'68%',transform:'translate(-50%,-50%) rotate(9deg)',offset:.48},
   {left:'83%',top:'68%',transform:'translate(-50%,-50%) rotate(9deg)',offset:.54},
   {left:'66%',top:'30%',transform:'translate(-50%,-50%) rotate(0deg) scale(1.15)',offset:.66},
   {left:'50%',top:'48%',transform:'translate(-50%,-50%) rotate(-3deg) scale(2.4)',offset:.80},
   {left:'50%',top:'53%',transform:'translate(-50%,-50%) rotate(-3deg) scale(3.25)',offset:.90},
   {left:'50%',top:'53%',transform:'translate(-50%,-50%) rotate(-3deg) scale(3.25)',offset:1}
  ].map(frame=>({...frame,zIndex:frame.offset>.54?7:5,easing:'ease-in-out'})),{duration,easing:'linear',fill:'both'});
  const food=piece.querySelector('.pick-food').animate([
   {opacity:1,filter:'drop-shadow(2px 8px 5px #50382029)',offset:0},
   {opacity:1,filter:'drop-shadow(2px 8px 5px #50382029)',offset:.78},
   {opacity:1,filter:'drop-shadow(0 22px 18px #50382035)',offset:.87},
   {opacity:0,filter:'blur(2px)',offset:.93},
   {opacity:0,filter:'blur(2px)',offset:1}
  ],{duration,easing:'linear',fill:'both'});
  const sticks=piece.querySelector('.pick-sticks').animate([
   {opacity:0,translate:'18% -22%',offset:0},
   {opacity:1,translate:'0 0',offset:.11},
   {opacity:1,translate:'0 0',offset:.90},
   {opacity:0,translate:'22% -24%',offset:1}
  ],{duration,easing:'linear',fill:'both'});
  animations=[movement,food,sticks];
  await Promise.allSettled(animations.map(a=>a.finished));
  if(token!==generation)return;
  eat(piece);
 }
 pieces.forEach(p=>p.addEventListener('click',()=>play(p)));
 replay.addEventListener('click',()=>{
  if(!ready||busy)return;
  pieces.forEach(p=>{p.hidden=false;p.disabled=false});reset();replay.hidden=true;status.textContent='A fresh plate. Help yourself.';
  pieces[0].focus({preventScroll:true});
 });
 const load=async()=>{
  if(loading||ready)return;loading=true;
  try{
   await Promise.all([...scene.querySelectorAll('img')].map(img=>{img.loading='eager';return img.decode()}));
   ready=true;scene.dataset.state='ready';pieces.forEach(p=>p.disabled=false);
  }catch{scene.dataset.state='unavailable';status.textContent='This interaction is unavailable. Please refresh to try again.';}
 };
 const watcher=new IntersectionObserver(entries=>{
  for(const e of entries){if(e.isIntersecting){if(!ready&&scene.dataset.state==='loading')load()}else if(busy){reset();status.textContent='';}}
 },{rootMargin:'120px'});watcher.observe(scene);
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&busy){reset();status.textContent=''}});
 const respectMotion=()=>{if(still()&&busy)eat(active)};
 reduced.addEventListener('change',respectMotion);
 new MutationObserver(respectMotion).observe(document.body,{attributes:true,attributeFilter:['data-motion-paused']});
 scene.addEventListener('keydown',e=>{if(e.key==='Escape'&&busy){reset();status.textContent=''}});
 addEventListener('pagehide',()=>{if(busy)reset()});
})();
