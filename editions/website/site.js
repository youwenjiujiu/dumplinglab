(()=>{
 const stage=document.querySelector('#productStage');
 const AudioEngine=globalThis.AudioContext||globalThis.webkitAudioContext;
 if(!stage||!AudioEngine||globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
 let context=null,armed=false,loading=null,activeCue=null;
 const buffers={};
 const sources={
  callouts5:'/site/media/hero-callout-pops-5-source-v1.wav',
  callouts6:'/site/media/hero-callout-pops-6-source-v1.wav',
  glide:'/site/media/hero-closeup-glide-source-v1.wav'
 };
 const ensure=async()=>{
  context||=(new AudioEngine());
  try{
   if(context.state==='suspended')await context.resume();
   loading||=Promise.all(Object.entries(sources).map(async([name,url])=>{
    const response=await fetch(url);if(!response.ok)throw new Error('Sound unavailable');buffers[name]=await context.decodeAudioData(await response.arrayBuffer());
   })).catch(()=>{});
   await loading;armed=context.state==='running'&&Object.keys(buffers).length===Object.keys(sources).length;
  }catch{armed=false}
 };
 const play=(name,offset=0,volume=1)=>{
  if(!armed||document.hidden||!buffers[name])return;
  offset=Math.max(0,offset);if(offset>=buffers[name].duration)return;
  try{activeCue?.stop()}catch{}
  const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffers[name];gain.gain.value=volume;
  source.connect(gain).connect(context.destination);activeCue=source;source.onended=()=>{if(activeCue===source)activeCue=null};source.start(0,offset);
 };
 const cue=event=>{
  const kind=event.detail?.kind,name=kind==='callouts'?(event.detail.count>5?'callouts6':'callouts5'):kind;
  if(!Object.hasOwn(sources,name)||document.body.dataset.motionPaused==='true')return;
  const requestedAt=Number(event.detail?.at)||performance.now();
  // Keep the cue on the animation clock even when first-use decoding is late.
  // The elapsed portion is skipped instead of shifting every accent backward.
  void ensure().then(()=>play(name,(performance.now()-requestedAt)/1000));
 };
 for(const event of ['pointerdown','touchstart','keydown','wheel'])addEventListener(event,ensure,{once:true,passive:true});
 stage.addEventListener('stage-sound',cue);
 addEventListener('pagehide',()=>{try{activeCue?.stop()}catch{}context?.close()});
})();

(()=>{
 // The static ordering links and chapter navigation remain usable when the
 // initial catalogue script cannot load. Do not attach half-working controls.
 if(!Array.isArray(globalThis.MENU)||!Array.isArray(globalThis.LUNCH_RECOMMENDATIONS)){document.documentElement.classList.add('site-ui-unavailable');return}
 // The marketing site is English-only. Ordering keeps its own language preference.
 const language='en';
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const chosen=['red-oil-chaoshou','roe-wonton-noodles','century-egg-noodles'];
 let catalogueUnavailable=globalThis.CatalogClient?.status==='unavailable',lastMenuMarkup=null,retryingCatalogue=false;
 const menuContainer=document.querySelector('#featuredMenu');
 // Match each lazy photo to its real column, including enlarged-text reflow.
 // Static sizes remain a useful fallback in browsers without size observation.
 const photoSizes=typeof ResizeObserver==='function'?new ResizeObserver(entries=>{
  for(const entry of entries){const img=entry.target.querySelector('img[srcset]');if(img&&entry.contentRect.width>0)img.sizes=Math.ceil(entry.contentRect.width)+'px'}
 }):null;
 // A failed photo keeps its space and meaningful link, never a broken-image
 // glyph. Capture covers lazy images inserted by later catalogue refreshes.
 menuContainer.addEventListener('error',event=>{
  if(event.target.tagName==='IMG')event.target.closest('.food-image')?.setAttribute('data-unavailable','true');
 },true);
 menuContainer.addEventListener('load',event=>{
  if(event.target.tagName==='IMG')event.target.closest('.food-image')?.removeAttribute('data-unavailable');
 },true);
 // A missing location photo becomes a compact, readable chapter, not a tall
 // broken-image panel. Keep the supplied address, caption and links intact.
 for(const img of document.querySelectorAll('.space-layout figure>img,.visit-front>img')){
  const figure=img.closest('figure'),section=img.closest('section');
  const status=document.createElement('span');status.className='place-photo-status';status.hidden=true;status.setAttribute('role','status');
  status.dataset.en='Photo temporarily unavailable';status.dataset.zh='照片暂未加载';
  status.textContent=language==='zh'?status.dataset.zh:status.dataset.en;
  const caption=figure.querySelector('figcaption');
  // A translated caption replaces its own textContent when language changes.
  // Keep the separate status outside that translation boundary.
  (caption&&!caption.hasAttribute('data-en')?caption:figure).append(status);
  const update=failed=>{status.hidden=!failed;if(failed){figure.dataset.photoUnavailable='true';section.dataset.photoUnavailable='true'}else{delete figure.dataset.photoUnavailable;delete section.dataset.photoUnavailable}};
  img.addEventListener('error',()=>update(true));img.addEventListener('load',()=>update(false));
  if(img.complete&&img.currentSrc&&!img.naturalWidth)update(true);
 }
 const imagePath=(r,size='l',transparent=false)=>'/img/'+size+'/'+(transparent?r.img:globalThis.DL_MENU_ART?.[r.img]||r.img).replace(/\.(png|jpe?g|webp)$/i,'.webp');
 function renderMenu(){
  const records=globalThis.LUNCH_RECOMMENDATIONS||[];
  const active=r=>r&&!r.chooseFilling&&MENU.some(d=>d.id===r.dishId&&d.active!==false);
  const available=r=>active(r)&&!r.pending&&!MENU.find(d=>d.id===r.dishId).soldOut;
  const ranked=[...chosen.map(id=>records.find(r=>r.id===id)),...records].filter(active);
  const unique=ranked.filter((r,i)=>ranked.findIndex(other=>other.id===r.id)===i);
  const picks=[...unique.filter(available),...unique.filter(r=>!available(r))].slice(0,3);
  const signature=records.find(r=>r.id==='chive-fried');
  const hero=available(signature)?signature:unique.find(available),heroImage=document.querySelector('#heroImage');
  if(hero){
   const dish=MENU.find(d=>d.id===hero.dishId),name=language==='zh'?hero.cn:hero.name;
   heroImage.src=dish.imageUrl||imagePath(hero,'l',true);heroImage.alt=name;
   document.querySelector('#heroDishName').textContent=name;
   document.querySelector('#heroDishLink').setAttribute('aria-label',name);
  }else{
   heroImage.src='/site/interior.webp';heroImage.alt=language==='zh'?'Dumpling Lab 店内空间':'Inside Dumpling Lab';
   document.querySelector('#heroDishName').textContent=language==='zh'?'来店里坐坐':'A seat on Circular Road';
   document.querySelector('#heroDishLink').setAttribute('aria-label',language==='zh'?'查看菜单':'Explore the menu');
  }
  document.querySelector('#heroDish').classList.toggle('space-fallback',!hero);
  const markup=picks.map(r=>{
   const dish=MENU.find(d=>d.id===r.dishId);
   const amount=dish.price+(r.noodles?LUNCH_NOODLE_EXTRA:0);
   const name=language==='zh'?r.cn:r.name;
   const responsive=dish.imageUrl?'':` srcset="${esc(imagePath(r,'s'))} 720w, ${esc(imagePath(r,'l'))} 1254w" sizes="(max-width: 760px) 43vw, (max-width: 1760px) calc((90vw - 64px) / 3), calc((100vw - 240px) / 3)"`;
   return `<article class="food-item" data-dish-id="${esc(dish.id)}"><a class="food-image" href="/order?lang=${language}" aria-label="${esc(name)}" data-missing-label="${language==='zh'?'图片暂不可用\n查看菜单 ↗︎':'Photo unavailable\nSee menu ↗︎'}"><img src="${esc(dish.imageUrl||imagePath(r))}"${responsive} alt="${esc(name)}" width="540" height="470" loading="lazy" decoding="async"></a><div class="food-caption"><div><h3><a href="/order?lang=${language}">${esc(name)}</a></h3>${!available(r)?`<span class="food-stock">${language==='zh'?'暂时售罄':'Currently sold out'}</span>`:''}</div><span class="food-price">${language==='en'?'<small>From </small>':''}S$${amount.toFixed(2)}${language==='zh'?'<small> 起</small>':''}</span></div></article>`;
  }).join('')||`<div class="menu-empty"><p class="eyebrow">DUMPLING LAB / MENU</p><p>${language==='zh'?'精选菜品暂未展示。最新供应情况，请查看完整菜单。':'Featured dishes are not displayed right now. See the full menu for current availability.'}</p></div>`;
  if(lastMenuMarkup!==markup){
   const focused=document.activeElement,inside=menuContainer.contains?.(focused);
   const dishId=inside?focused.closest('.food-item')?.dataset.dishId:null;
   const focusIndex=inside?[...menuContainer.querySelectorAll('.food-item')].indexOf(focused.closest('.food-item')):0;
   const focusSelector=inside&&focused.closest('.food-image')?'.food-image':'h3 a';
   photoSizes?.disconnect();menuContainer.innerHTML=markup;lastMenuMarkup=markup;
   if(photoSizes)menuContainer.querySelectorAll('.food-image').forEach(el=>photoSizes.observe(el));
   if(inside){
    const cards=[...menuContainer.querySelectorAll('.food-item')];
    const replacement=cards.find(el=>el.dataset.dishId===dishId)||cards[Math.min(Math.max(0,focusIndex),cards.length-1)];
    (replacement?.querySelector(focusSelector)||document.querySelector('.section-intro>.text-link'))?.focus({preventScroll:true});
   }
  }
  const note=document.querySelector('#catalogNote');note.hidden=!catalogueUnavailable;note.textContent=catalogueUnavailable?(language==='zh'?'菜单暂未刷新，价格与供应情况请以点餐页为准。':'Menu updates are temporarily unavailable. Check ordering for current prices and availability.'):'';
  const status=document.querySelector('#catalogStatus'),retry=document.querySelector('#catalogRetry');
  const retryHadFocus=retry&&document.activeElement===retry;
  if(status)status.hidden=!catalogueUnavailable;
  if(retry){retry.hidden=!catalogueUnavailable;retry.setAttribute('aria-disabled',String(retryingCatalogue));retry.setAttribute('aria-busy',String(retryingCatalogue));retry.textContent=language==='zh'?(retryingCatalogue?'正在更新…':'重新加载菜单'):(retryingCatalogue?'Updating…':'Retry menu')}
  if(retryHadFocus&&!catalogueUnavailable)document.querySelector('.section-intro>.text-link')?.focus({preventScroll:true});
 }
 function render(){
  document.documentElement.lang=language;
  document.querySelectorAll('[data-en]').forEach(el=>el.textContent=el.dataset[language]);
  document.querySelectorAll('[data-alt-en]').forEach(el=>el.alt=language==='zh'?el.dataset.altZh:el.dataset.altEn);
  document.querySelectorAll('a[href^="/order"]').forEach(a=>a.href='/order?lang='+language);
  renderMenu();
  document.querySelector('#mainNav').setAttribute('aria-label',language==='zh'?'网站导航':'Main navigation');
  document.querySelector('.logo').setAttribute('aria-label',language==='zh'?'Dumpling Lab · 回到顶部':'Dumpling Lab · Back to top');
  navigationLabel();
  // Emit after the shared language state and DOM have both changed. Browser
  // microtasks can run between click listeners, so listener order is not a contract.
  globalThis.dispatchEvent?.(new Event('site-language-changed'));
 }
 const toggle=document.querySelector('#navToggle'),nav=document.querySelector('#mainNav');
 function navigationLabel(){const open=toggle.getAttribute('aria-expanded')==='true';toggle.setAttribute('aria-label',language==='zh'?(open?'关闭导航菜单':'打开导航菜单'):(open?'Close navigation':'Open navigation'))}
 function close(){nav.dataset.open='false';toggle.setAttribute('aria-expanded','false');navigationLabel()}
 toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));nav.dataset.open=String(open);navigationLabel();if(open)nav.querySelector('a')?.focus({preventScroll:true})});
 nav.addEventListener('click',e=>{if(e.target.closest('a'))close()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&toggle.getAttribute('aria-expanded')==='true'){close();toggle.focus()}});
 document.addEventListener('pointerdown',e=>{if(toggle.getAttribute('aria-expanded')==='true'&&!nav.contains(e.target)&&!toggle.contains(e.target))close()});
 document.addEventListener('focusin',e=>{if(toggle.getAttribute('aria-expanded')==='true'&&!nav.contains(e.target)&&!toggle.contains(e.target))close()});
 if('matchMedia' in globalThis)matchMedia('(max-width:1200px)').addEventListener('change',close);
 let navigationWidth=innerWidth;
 addEventListener('resize',()=>{if(innerWidth!==navigationWidth){navigationWidth=innerWidth;close()}},{passive:true});
 globalThis.addEventListener('catalog-updated',()=>{catalogueUnavailable=false;renderMenu()});
 globalThis.addEventListener('catalog-available',()=>{catalogueUnavailable=false;renderMenu()});
 globalThis.addEventListener('catalog-unavailable',()=>{catalogueUnavailable=true;renderMenu()});
 document.querySelector('#catalogRetry')?.addEventListener('click',async()=>{
  if(retryingCatalogue||!globalThis.CatalogClient)return;
  retryingCatalogue=true;renderMenu();
  try{await CatalogClient.refresh()}catch{}finally{retryingCatalogue=false;catalogueUnavailable=CatalogClient.status!=='ready';renderMenu()}
 });
 render();
 // Section orientation remains a navigation affordance, not a scroll controller.
 if('IntersectionObserver' in globalThis){
  const sections=['cinema','film','food','space','visit'].map(id=>document.getElementById(id)).filter(Boolean);
  const links=[...nav.querySelectorAll('a')];
  const orientation=new IntersectionObserver(entries=>{
   const entry=entries.filter(e=>e.isIntersecting).at(-1);if(!entry)return;
   for(const link of links){if(link.hash==='#'+entry.target.id)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current')}
  },{rootMargin:'-20% 0px -65% 0px',threshold:0});
  for(const section of sections)orientation.observe(section);
 }
 // A small, bounded camera drift in the owner's supplied space reference. No
 // synthetic 3D geometry; no animation loop when the section is off screen.
 const room=document.querySelector('.space-layout figure');
 if(room&&'IntersectionObserver' in globalThis){
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');let visible=false,frame=0;
  const still=()=>reduced.matches||document.body.dataset.motionPaused!=='false'||document.hidden;
  const draw=()=>{frame=0;if(!visible)return;const r=room.getBoundingClientRect();const p=Math.max(0,Math.min(1,(innerHeight-r.top)/(innerHeight+r.height)));room.style.setProperty('--room-y',(still()?0:(p-.5)*52)+'px')};
  const schedule=()=>{if(visible&&!frame)frame=requestAnimationFrame(draw)};
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)schedule();else if(frame){cancelAnimationFrame(frame);frame=0}}).observe(room);
  addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});
  reduced.addEventListener('change',schedule);document.addEventListener('visibilitychange',schedule);
  new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['data-motion-paused']});
 }
 // A short editorial entrance, once per chapter. Content is visible by default;
 // unsupported/paused motion never leaves an invisible section behind.
 if('IntersectionObserver' in globalThis&&typeof globalThis.Element?.prototype?.animate==='function'){
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),seen=new WeakSet(),shownDishes=new Set(),running=new Map();
  const still=()=>reduced.matches||document.body.dataset.motionPaused!=='false'||document.hidden;
  const finish=()=>{for(const a of running.values())a.cancel();running.clear()};
  const observer=new IntersectionObserver(entries=>{
   for(const entry of entries){
    const node=entry.target;if(!entry.isIntersecting||seen.has(node))continue;
    seen.add(node);observer.unobserve(node);
    const card=node.classList.contains('food-item');
    const process=node.matches('.kitchen-grid figure');
    // An existing dish is not a new entrance when live pricing or language
    // replaces its markup. Only genuinely unseen dishes get a first reveal.
    if(card&&node.dataset.dishId){if(shownDishes.has(node.dataset.dishId))continue;shownDishes.add(node.dataset.dishId)}
    if(still())continue;
    // Fast scrolling on a slow connection must not animate an empty image box.
    if((card||process)&&[...node.querySelectorAll('img')].some(img=>!img.complete||!img.naturalWidth))continue;
    const itemIndex=(card||process)?[...node.parentElement.children].indexOf(node):0;
    const delay=card?Math.min(itemIndex,2)*85:process?Math.min(itemIndex,3)*90:0;
    const frames=[{opacity:card?1:0,translate:`0 ${card?42:process?30:26}px`},{opacity:1,translate:'0 0'}];
    const animation=node.animate(frames,{duration:card?780:process?720:680,delay,easing:'cubic-bezier(.18,.75,.25,1)',fill:'backwards'});
    running.set(node,animation);animation.finished.then(()=>running.delete(node),()=>running.delete(node));
   }
  },{threshold:.15});
  const watch=()=>document.querySelectorAll('.section-intro h2,.food-item,.kitchen-grid figure,.space-heading h2,.visit-copy,.visit-order').forEach(node=>{if(!seen.has(node))observer.observe(node)});
  watch();new MutationObserver(watch).observe(document.querySelector('#featuredMenu'),{childList:true});
  new MutationObserver(()=>{if(still())finish()}).observe(document.body,{attributes:true,attributeFilter:['data-motion-paused']});
  reduced.addEventListener('change',()=>{if(still())finish()});document.addEventListener('visibilitychange',()=>{if(still())finish()});
  document.addEventListener('focusin',event=>{for(const [node,a]of running)if(node.contains(event.target)){a.cancel();running.delete(node)}});
  addEventListener('pagehide',finish);
 }
})();

// Photo-cutout finale: pick -> dip -> offer to the viewer -> eat.
// No background loop, timers, audio or connection to ordering/cart state.
(()=>{
 const scene=document.querySelector('#pickScene');if(!scene)return;
 const pieces=[...scene.querySelectorAll('.pick-piece')],status=document.querySelector('#pickStatus'),replay=document.querySelector('#pickReplay');
 const cleanDumpling='/site/media/pick-dumpling-v1.webp',dippedDumpling='/site/media/pick-dumpling-dipped-v1.webp',dippedPreload=new Image();dippedPreload.src=dippedDumpling;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let ready=false,loading=false,busy=false,animations=[],generation=0,active=null,dipTimer=0;
 const remaining=()=>pieces.filter(p=>!p.hidden);
 const still=()=>reduced.matches||document.body.dataset.motionPaused==='true';
 const discover=()=>{scene.dataset.discovered='true';pieces.forEach(p=>p.removeAttribute('data-invite'))};
 const invite=()=>{if(scene.dataset.discovered!=='true')remaining()[0]?.setAttribute('data-invite','true')};
 function reset(){
  generation++;clearTimeout(dipTimer);dipTimer=0;animations.forEach(a=>a.cancel());animations=[];busy=false;active=null;
  scene.dataset.state=ready?(remaining().length?'ready':'empty'):'loading';
  pieces.forEach(p=>{const food=p.querySelector('.pick-food');if(food?.getAttribute('src')!==cleanDumpling)food.src=cleanDumpling;p.classList.remove('is-picked');p.removeAttribute('data-dipped');p.removeAttribute('aria-disabled')});
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
  piece.removeAttribute('data-dipped');
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
  const sticks=[...piece.querySelectorAll('.pick-sticks')].map(el=>el.animate([
   {opacity:0,translate:'18% -22%',offset:0},
   {opacity:1,translate:'0 0',offset:.11},
   {opacity:1,translate:'0 0',offset:.90},
   {opacity:0,translate:'22% -24%',offset:1}
  ],{duration,easing:'linear',fill:'both'}));
  dipTimer=setTimeout(()=>{if(token===generation&&busy){piece.querySelector('.pick-food').src=dippedDumpling;piece.dataset.dipped='true'}},duration*.505);
  animations=[movement,food,...sticks];
  await Promise.allSettled(animations.map(a=>a.finished));
  if(token!==generation)return;
  eat(piece);
 }
 pieces.forEach(p=>{p.addEventListener('click',()=>{discover();play(p)});p.addEventListener('pointerenter',discover,{once:true});p.addEventListener('focus',discover,{once:true})});
 replay.addEventListener('click',()=>{
  if(!ready||busy)return;
  pieces.forEach(p=>{p.hidden=false;p.disabled=false});reset();replay.hidden=true;status.textContent='A fresh plate. Help yourself.';
  pieces[0].focus({preventScroll:true});
 });
 const load=async()=>{
  if(loading||ready)return;loading=true;
  try{
   await Promise.all([...scene.querySelectorAll('img'),dippedPreload].map(img=>{img.loading='eager';return img.decode()}));
   ready=true;scene.dataset.state='ready';pieces.forEach(p=>p.disabled=false);invite();
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
