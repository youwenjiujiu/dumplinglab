import {clamp,stagePose,nextCourseIndex,settleValue} from './motion-math.mjs';

const $=s=>document.querySelector(s),story=$('#cinema'),stage=$('#productStage');
const product=$('#stageProduct'),photo=$('#stageImage'),detail=$('#stageDetail');
const reduce=matchMedia('(prefers-reduced-motion: reduce)'),mobile=matchMedia('(max-width:760px)');
const courses=[
 {id:'chive-fried',key:'fried',image:'/img/l/potstickers-pork-shrimp-chive-cutaway-v1.webp',word:['DUMPLINGS','一口焦香'],mark:'煎',name:['Pork, Shrimp & Chive Potstickers','韭菜虾仁猪肉煎饺'],taste:['Golden edges. A juicy centre.','焦香的边，鲜嫩的馅。'],title:['That first\ncrisp bite.','焦香，\n就在这一口。'],copy:['Pork, shrimp and chives, tucked beneath a golden pan-fried edge.','猪肉、虾仁和韭菜，包进一口金黄焦香。']},
 {id:'red-oil-chaoshou',key:'chilli',image:'/img/l/sichuan-red-oil-chaoshou-placeholder.webp',word:['CHILLI OIL','红油上头'],mark:'拌',name:['Chao Shou in Chilli Oil','红油抄手'],taste:['A little heat. Another bite.','红油一拌，又想一口。'],title:['Silky folds.\nA little fire.','红油很香，\n抄手很软。'],copy:['Soft wontons, a spoonful of chilli oil, and a reason to reach for one more.','柔软的抄手，裹上红油。下一口，筷子已经伸过去了。']},
 {id:'century-egg-noodles',key:'broth',image:'/img/l/lunch-v2-century-egg-noodles-generated-v1-appetite-v1.webp',word:['NOODLES','好好嗦面'],mark:'拌',name:['Century Egg Noodles','销魂皮蛋面'],taste:['Rich century egg. Fresh scallions.','皮蛋浓香，葱花清香。'],title:['Give it\na good toss.','拌开浓香，\n好好嗦面。'],copy:['Century egg, chopped scallions and noodles. Toss together, and tuck in.','皮蛋、葱花、面条，拌在一起，每一口都浓香。']}
];
// Campaign cutouts are separate from catalogue photographs. All three passed
// food-identity and real-alpha inspection before integration.
for(const course of courses)course.fallbackImage=course.image;
Object.assign(courses[0],{dishId:'lunch-v10-pork-chive-shrimp-fried',image:'/site/media/hero-potstickers-v1.webp',word:['CRISPY\nDUMPLINGS','焦香四溢\n一口多汁'],tags:[['Crisp edges','焦脆的边'],['Pork & shrimp','猪肉 · 虾仁'],['Chives','韭菜鲜香']]});
Object.assign(courses[1],{dishId:'lunch-v4-red-oil-chaoshou',image:'/site/media/hero-chilli-wontons-v1.webp',word:['HOT\nWONTONS','红油一拌\n好戏开场'],tags:[['Chilli oil','红油'],['Silky folds','柔软的皮'],['One more bite','再来一口']]});
Object.assign(courses[2],{dishId:'lunch-v2-century-egg-noodles',image:'/site/media/hero-century-egg-noodles-v3.webp',word:['CENTURY EGG\nNOODLES','销魂皮蛋\n好好嗦面'],tags:[['Century egg','皮蛋浓香'],['Fresh scallions','葱花清香'],['Tossed noodles','拌面']]});
let current=0,requested=0,available=[0,1,2],selectedToken=0,animations=[],ghost=null,catalogueSignature='',selectionStatus='',detailSoundPlayed=false;
const savedMotion=()=>{try{return globalThis.localStorage?.getItem('dumplinglab:motion')}catch{return null}};
const rememberMotion=paused=>{try{globalThis.localStorage?.setItem('dumplinglab:motion',paused?'paused':'playing')}catch{}};
const constrainedConnection=()=>{const connection=navigator.connection;return !!connection?.saveData||['slow-2g','2g','3g'].includes(connection?.effectiveType)||(connection?.downlink>0&&connection.downlink<1.5)};
let paused=reduce.matches||!!navigator.connection?.saveData,visible=true,frame=0,progress=0,targetProgress=0;
let pointer={x:0,y:0},pointerPose={x:0,y:0},lastDraw=0,pageAway=false,interacted=false;
const imageCache=new Map();
const callouts=()=>['flavorTag1','flavorTag2','flavorTag3','ingredientBadge1','ingredientBadge2','ingredientBadge3'].map(id=>$('#'+id)).filter(node=>node&&!node.hidden);
const badgeImages={fried:['ingredient-prawn-v2','ingredient-chives-v2'],chilli:['ingredient-pork-v1','ingredient-wrappers-v1','ingredient-chilli-v1'],broth:['ingredient-century-egg-v1','ingredient-scallions-v1','ingredient-noodles-v1']};
for(let i=1;i<=3;i++){
 const image=$('#ingredientImage'+i),badge=$('#ingredientBadge'+i);
 image?.addEventListener('load',()=>{badge.dataset.imageReady='true'});
 image?.addEventListener('error',()=>{badge.dataset.imageReady='false'});
}
const emitStageSound=(kind,extra={})=>stage.dispatchEvent(new CustomEvent('stage-sound',{detail:{kind,at:performance.now(),...extra}}));
function revealCallouts(delay=400){
 const nodes=callouts();
 if(nodes.length&&motionAllowed()&&stage.dataset.detail!=='true')emitStageSound('callouts',{count:nodes.length});
 nodes.forEach((node,i)=>animate(node,[
  {opacity:0,translate:(i<3?'24px':'-20px')+' 12px',scale:'.42',offset:0},
  {opacity:1,translate:'0 -2px',scale:'1.035',offset:.72},
  {opacity:1,translate:'0 0',scale:'1',offset:1}
 ],{duration:480,delay:delay+i*85,easing:'cubic-bezier(.2,.75,.25,1)'}));
}
async function retractCallouts(){
 const exits=callouts().map((node,i)=>animate(node,[
  {opacity:1,translate:'0 0',scale:'1'},
  {opacity:0,translate:(i<3?'32px':'-32px')+' 8px',scale:'.42'}
 ],{duration:170,delay:i*28,easing:'cubic-bezier(.55,0,.8,.45)',fill:'forwards'})).filter(Boolean);
 if(!exits.length)return;
 await Promise.allSettled(exits.map(a=>a.finished));
 for(const a of exits)a.cancel();
}
const knownImageFallbacks=new Map();
const displayImage=course=>knownImageFallbacks.get(course.image)||course.image;
const heroSizes='(max-width:760px) 100vw, (max-width:1050px) 78vw, 53vw';
const heroSources=src=>courses.some(c=>c.image===src)?`${src.replace(/\.webp$/,'-800.webp')} 800w, ${src} 1254w`:'';
const zh=()=>document.documentElement.lang==='zh';
const text=(a)=>a[zh()?1:0];
const catalogue=()=>globalThis.LUNCH_RECOMMENDATIONS||[];
function record(index){
 const c=courses[index];if(!c)return null;
 // The live client removes inactive recommendations. Keep the stable dish ID
 // so a missing recommendation cannot resurrect an inactive/deleted product.
 const r=catalogue().find(r=>r.id===c.id),dish=globalThis.MENU?.find(d=>d.id===(r?.dishId||c.dishId));
 const initialized=Array.isArray(globalThis.MENU)&&Array.isArray(globalThis.LUNCH_RECOMMENDATIONS);
 const active=initialized?!!dish&&dish.active!==false:true;
 return {...c,name:r?[r.name,r.cn]:c.name,image:dish?.imageUrl||c.image,active,soldOut:!!dish?.soldOut};
}
function preload(src){
 if(!imageCache.has(src))imageCache.set(src,new Promise((resolve,reject)=>{
  const img=new Image();const timer=setTimeout(()=>{imageCache.delete(src);reject(new Error('Image timed out'))},6000);
  img.onload=async()=>{try{await img.decode?.();clearTimeout(timer);resolve(img)}catch{clearTimeout(timer);imageCache.delete(src);reject(new Error('Image decode failed'))}};
  img.onerror=()=>{clearTimeout(timer);imageCache.delete(src);reject(new Error('Image unavailable'))};img.sizes=heroSizes;img.srcset=heroSources(src);img.src=src;
 }));
 return imageCache.get(src);
}
function cancelTransition(){for(const a of animations)a.cancel();animations=[];ghost?.remove();ghost=null}
const motionAllowed=()=>!paused&&!reduce.matches&&visible&&!document.hidden&&!pageAway;
function animate(node,keyframes,options={}){
 if(!motionAllowed()||!node?.animate)return;
 const a=node.animate(keyframes,{duration:760,easing:'cubic-bezier(.18,.8,.2,1)',fill:'backwards',...options});animations.push(a);
 a.finished.then(()=>{animations=animations.filter(x=>x!==a)},()=>{});return a;
}
function updateScrollCue(){
 const cue=$('.scroll-cue');if(!cue)return;
 const closeup=!reduce.matches&&story.dataset.enhanced==='true'&&story.dataset.fitsViewport!=='false'&&innerHeight>650;
 const detailVisible=stage.dataset.detail==='true';
 const href=!closeup?'#food':detailVisible?'#film':'#closeup';
 const label=text(!closeup?['Explore the menu.','往下，看看菜单。']:detailVisible?['On to the details.','往下，看看细节。']:['Keep going. It gets closer.','往下，再近一点。']);
 if(cue.getAttribute('href')!==href)cue.setAttribute('href',href);
 const span=cue.querySelector('span:last-child');if(span.textContent!==label)span.textContent=label;
}
function selectionFeedback(){
 if(!selectionStatus)return;
 const message=text(selectionStatus==='loading'?['Loading the next dish…','正在加载下一道…']:['Image unavailable. Please try again.','图片暂未加载，请再试一次。']);
 $('#stageTaste').textContent=message;$('#detailCopy').textContent=message;
}
function labels(){
 const motion=text(paused?['Play motion','播放动效']:['Pause motion','暂停动效']);
 const motionToggle=$('#motionToggle');
 if(motionToggle){motionToggle.hidden=true;$('#motionLabel').textContent=motion;motionToggle.setAttribute('aria-label',motion);motionToggle.setAttribute('aria-pressed',String(!paused));$('#motionToggle .motion-symbol').textContent=paused?'▶':'Ⅱ'}
 document.body.dataset.motionPaused=String(paused);document.body.dataset.motionHidden=String(!visible||document.hidden||pageAway);document.body.dataset.reducedMotion=String(reduce.matches);
 $('#previousCourse').setAttribute('aria-label',text(['Previous dish','上一道菜']));$('#nextCourse').setAttribute('aria-label',text(['Next dish','下一道菜']));
 $('#courseControl').setAttribute('aria-label',text(['Choose a dish','切换菜品']));filmLabels();updateScrollCue();
}
function render(){
 const focused=document.activeElement,control=$('#courseControl');
 const c=record(current),empty=current<0;
 stage.dataset.empty=String(empty);
 story.dataset.enhanced=String(!reduce.matches&&!empty);
 document.body.dataset.course=empty?'empty':c.key;
 document.querySelector('meta[name="theme-color"]')?.setAttribute('content',empty?'#2c080d':({fried:'#9b252d',chilli:'#2c080d',broth:'#f7e6c9'}[c.key]));
 if(empty){
  $('#stageWord').textContent=text(['DUMPLING LAB','店里见']);$('#stageName').textContent=text(['A seat on Circular Road','来 Circular Road 坐坐']);
  $('#stageTaste').textContent=text(['See the menu for current availability.','最新供应情况请查看菜单。']);$('#stageCharacter').textContent='坐';$('#stageCount').textContent='DUMPLING LAB';
  $('#detailTitle').textContent=text(['Pull up\na chair.','坐下来，\n好好吃饭。']);$('#detailCopy').textContent=text(['49 Circular Road, Singapore.','新加坡 Circular Road 49 号。']);
  photo.srcset='';photo.src='/site/interior.webp';photo.alt=$('#stageName').textContent;$('#stageOrbit').hidden=true;
 }else{
  const source=displayImage(c);
  stage.dataset.course=c.key;photo.sizes=heroSizes;photo.srcset=heroSources(source);photo.src=source;photo.alt=text(c.name);
  $('#stageWord').textContent=text(c.word);$('#stageName').textContent=text(c.name);$('#stageCharacter').textContent=c.mark;
  $('#stageCount').textContent=String(available.indexOf(current)+1).padStart(2,'0')+' / '+String(available.length).padStart(2,'0');
  $('#stageTaste').textContent=c.soldOut?text(['Currently sold out · explore the menu','暂时售罄 · 看看其他菜品']):text(c.taste);
  $('#detailTitle').textContent=text(c.title);$('#detailCopy').textContent=text(c.copy);
  $('#stageOrbit').hidden=false;
  c.tags.forEach((tag,i)=>$('#flavorTag'+(i+1)).textContent=text(tag));
  stage.dataset.ingredientCount=String(badgeImages[c.key].length);
  for(let i=0;i<3;i++){
   const image=$('#ingredientImage'+(i+1)),badge=$('#ingredientBadge'+(i+1));if(!image)continue;
   const name=badgeImages[c.key][i];badge.hidden=!name;if(!name)continue;
   const src='/site/media/'+name+'.webp';
   if(image.getAttribute('src')!==src){badge.dataset.imageReady='false';image.src=src}
   if(image.complete)badge.dataset.imageReady=String(image.naturalWidth>0);
  }
 }
 $('#previousCourse').disabled=$('#nextCourse').disabled=available.length<2;
 $('#courseControl').hidden=available.length<2;
 if(control.contains?.(focused)&&(control.hidden||focused?.hidden)){
  (control.hidden?$('.site-header .order-link'):$('#nextCourse'))?.focus({preventScroll:true});
 }
 const orderLabel=document.querySelector('.stage-order>span');
 if(orderLabel)orderLabel.textContent=text(empty?['Explore the menu','查看菜单']:['LET’S EAT','现在开吃']);
 selectionFeedback();labels();resize();
}
async function select(index,direction=1){
 if(!available.includes(index))return false;
 interacted=true;
 requested=index;const token=++selectedToken;
 // Choosing the visible dish is also a way to cancel a pending selection.
 // Do not refetch/reannounce an unchanged, already available scene.
 if(index===current&&stage.dataset.imageUnavailable!=='true'){
  const hadFeedback=!!selectionStatus;selectionStatus='';$('#courseControl').setAttribute('aria-busy','false');cancelTransition();
  if(hadFeedback)render();return true;
 }
 $('#courseControl').setAttribute('aria-busy','true');
 selectionStatus='loading';selectionFeedback();
 try{await preload(displayImage(record(index)))}catch{
  if(token===selectedToken){selectionStatus='failed';selectionFeedback();$('#courseControl').setAttribute('aria-busy','false');requested=current}return false;
 }
 if(token!==selectedToken)return false;
 selectionStatus='';cancelTransition();
 if(index===current){$('#courseControl').setAttribute('aria-busy','false');render();return true}
 render();
 // Retract the old callouts before changing their copy/palette. Awaiting the
 // cancellable animations preserves latest-intent selection and pause safety.
 await retractCallouts();
 if(token!==selectedToken)return false;
 $('#courseControl').setAttribute('aria-busy','false');
 // A user can select another dish before the opening image arrives. Only a
 // fully presented outgoing image is eligible for the animated exit layer.
 if(motionAllowed()&&photo.animate&&photo.complete&&photo.naturalWidth&&stage.dataset.imageReady==='true'){ghost=photo.cloneNode();ghost.removeAttribute('id');ghost.alt='';ghost.setAttribute('aria-hidden','true');ghost.className='dish-ghost';photo.parentElement.append(ghost)}
 current=index;detailSoundPlayed=false;render();
 if(motionAllowed()&&stage.dataset.detail==='true'){detailSoundPlayed=true;emitStageSound('glide')}
 const outgoing=ghost;
 // Travel beyond the viewport edge before removal; fading an only half-exited
 // food cutout leaves a large translucent silhouette beside the next dish.
 const exitTravel=Math.max(160,(stage.clientWidth||innerWidth)/Math.max(1,product.clientWidth||stage.clientWidth||innerWidth)*50+110);
 const exit=outgoing&&animate(outgoing,[{opacity:1,transform:'translateX(0) rotate(0deg)'},{opacity:1,transform:`translateX(${-direction*exitTravel}%) rotate(${-direction*24}deg)`}],{duration:520,fill:'forwards'});
 exit?.finished.then(()=>{outgoing.remove();if(ghost===outgoing)ghost=null},()=>{});
 animate(photo,[{opacity:1,transform:`perspective(1200px) translate3d(${direction*120}%,12%,0) rotateY(${direction*-18}deg) rotate(${direction*17}deg) scale(.8)`},{opacity:1,transform:'perspective(1200px) translate3d(0,0,0) rotateY(0deg) rotate(0deg) scale(1)'}],{duration:900});
 animate($('#stageWord'),[{opacity:0,translate:`${direction*16}% 0`},{opacity:1,translate:'0 0'}],{duration:900});
 animate($('#stageCaption'),[{opacity:0,translate:'0 18px'},{opacity:1,translate:'0 0'}],{duration:500,delay:180});
 animate($('#stageDetail'),[{translate:'0 18px'},{translate:'0 0'}],{duration:580});
 revealCallouts();
 return true;
}
function refreshCatalogue(){
 const signature=JSON.stringify(courses.map((_,i)=>{const r=record(i);return[r.active,r.soldOut,r.image,r.name]}));
 if(signature===catalogueSignature)return;
 catalogueSignature=signature;
 ++selectedToken;selectionStatus='';cancelTransition();$('#courseControl').setAttribute('aria-busy','false');
 available=courses.map((_,i)=>i).filter(i=>record(i).active);
 if(!available.includes(current))current=available.find(i=>!record(i).soldOut)??available[0]??-1;
 requested=current;render();
}
function photoUnavailable(){
 const c=record(current),fallback=c?.fallbackImage;
 if(fallback&&!photo.src.endsWith(fallback)){
  photo.srcset='';photo.src=fallback;return;
 }
 stage.dataset.imageUnavailable='true';
 releaseFilmPoster();
 if(c)knownImageFallbacks.delete(c.image);
 story.dataset.enhanced='false';schedule();
 $('#stageTaste').textContent=text(['See the menu for photos and availability.','菜品图片与供应情况，请查看菜单。']);
}
photo.addEventListener('error',photoUnavailable);
function revealDecodedPhoto(){
 const source=photo.currentSrc||photo.src;
 if(typeof photo.decode!=='function'){stage.dataset.imageReady='true';releaseFilmPoster();return}
 photo.decode().then(()=>{if((photo.currentSrc||photo.src)===source&&photo.naturalWidth){stage.dataset.imageReady='true';releaseFilmPoster()}}).catch(()=>{});
}
photo.addEventListener('load',()=>{
 revealDecodedPhoto();
 const c=record(current);if(c?.fallbackImage&&photo.src.endsWith(c.fallbackImage)&&c.image!==c.fallbackImage)knownImageFallbacks.set(c.image,c.fallbackImage);
 delete stage.dataset.imageUnavailable;story.dataset.enhanced=String(!reduce.matches&&current>=0);schedule();
});
function measure(){
 const rect=story.getBoundingClientRect(),height=stage.getBoundingClientRect().height;
 const top=document.querySelector('.site-header').getBoundingClientRect().height;
 targetProgress=story.dataset.enhanced==='true'&&rect.height>height+1?clamp((top-rect.top)/Math.max(1,rect.height-height)):0;
 return {width:stage.clientWidth||innerWidth,height};
}
function draw(timestamp){
 frame=0;if(document.hidden||pageAway||!visible)return;
 const box=measure(),still=paused||reduce.matches;
 const elapsed=Number.isFinite(timestamp)&&lastDraw?timestamp-lastDraw:1000/60;
 lastDraw=Number.isFinite(timestamp)?timestamp:0;
 progress=still?targetProgress:settleValue(progress,targetProgress,elapsed);
 for(const axis of ['x','y'])pointerPose[axis]=still?0:settleValue(pointerPose[axis],pointer[axis],elapsed);
 const p=stagePose(progress,box.width,box.height,mobile.matches,still);
 for(const [key,value] of Object.entries({'plate-x':p.x+'px','plate-y':p.y+'px','plate-scale':p.scale,'plate-turn':p.turn+'deg','intro-opacity':p.intro,'detail-opacity':p.detail,'detail-y':p.detailY+'px','title-y':p.titleY+'px','orbit-shift':p.orbit+'px','pointer-x':pointerPose.x*8+'px','pointer-y':pointerPose.y*5+'px','pointer-ry':pointerPose.x*3+'deg'}))stage.style.setProperty('--'+key,String(value));
 const detailVisible=p.detail>.04;
 stage.dataset.detail=String(detailVisible);detail.inert=p.detail<.9;
 if(detailVisible&&!detailSoundPlayed&&motionAllowed()){detailSoundPlayed=true;emitStageSound('glide')}
 updateScrollCue();
 $('#storyProgress').style.transform=`scaleX(${progress})`;
 if(!still&&(progress!==targetProgress||pointerPose.x!==pointer.x||pointerPose.y!==pointer.y))schedule();else lastDraw=0;
}
function schedule(){if(!frame&&!document.hidden&&!pageAway&&visible)frame=requestAnimationFrame(draw)}
function resize(){
 const h=document.querySelector('.site-header').getBoundingClientRect().height;
 document.documentElement.style.setProperty('--header-height',h+'px');schedule();
 // Two-line catalogue names remain available without encroaching on the food.
 // Only their extra line height changes the opening pose; the close-up stays put.
 if(typeof getComputedStyle==='function'){
  const extra=[$('#stageName'),$('#stageTaste')].reduce((sum,node)=>{const height=node.getBoundingClientRect().height,line=parseFloat(getComputedStyle(node).lineHeight);return sum+Math.max(0,height-(Number.isFinite(line)?line:height))},0);
  stage.style.setProperty('--caption-extra',extra+'px');
 }
 story.dataset.fitsViewport=String(stage.getBoundingClientRect().height<=innerHeight-h+1);
 updateScrollCue();
}

// The film remains a secondary detail, loaded only when it is visible or requested.
const video=$('#brandFilm'),film=$('#filmScreen');
const poster=$('.cinema-poster'),posterFallback=$('#filmFallback');
function posterState(failed){film.dataset.posterUnavailable=String(failed);posterFallback.hidden=!failed}
poster?.addEventListener('error',()=>posterState(true));
poster?.addEventListener('load',()=>posterState(false));
// Native lazy loading can fetch this offscreen poster before the priority food.
// Release it after the food decodes, or immediately when the film is visited.
function releaseFilmPoster(){if(film)film.dataset.posterReleased='true'}
let filmVisible=false,filmPaused=paused||constrainedConnection(),filmFailed=false,playToken=0,filmResumeTime=0;
const filmPoster=()=>mobile.matches?video.dataset.posterMobile:video.dataset.posterWide;
if(poster&&video)poster.src=filmPoster();
if(poster?.complete&&poster.currentSrc&&!poster.naturalWidth)posterState(true);
function filmLabels(){
 if(!$('#filmToggle'))return; // The gallery now plays without an overlay control.
 const playing=!filmPaused&&!video.paused;
 const loading=playing&&video.readyState<3;
 const action=text(filmFailed?['Retry motion','重试播放']:playing?['Pause motion','暂停画面']:['Play motion','播放画面']);
 $('#filmLabel').textContent=loading?text(['Loading film…','正在加载…']):action;$('#filmToggle').setAttribute('aria-label',action);$('#filmToggle').setAttribute('aria-pressed',String(playing));$('#filmToggle').setAttribute('aria-busy',String(loading));$('#filmSymbol').textContent=playing?'Ⅱ':'▶';
}
async function playFilm(){
 if(!video)return; // The kitchen process chapter uses still photography.
 const token=++playToken;
 if(filmPaused||!filmVisible||document.hidden||pageAway){video.pause();filmLabels();return}
 releaseFilmPoster();
 video.poster=filmPoster();
 const source=mobile.matches?video.dataset.mobile:video.dataset.wide;
 if(video.getAttribute('src')!==source){
  filmResumeTime=video.getAttribute('src')&&Number.isFinite(video.currentTime)?video.currentTime:0;
  delete film.dataset.filmReady;video.src=source;video.load();
 }
 video.muted=true;
 try{await video.play();if(filmPaused||!filmVisible||document.hidden||pageAway)video.pause()}
 catch{if(token===playToken)filmPaused=true}
 filmLabels();
}
$('#filmToggle')?.addEventListener('click',()=>{
 if(filmFailed){filmFailed=false;video.removeAttribute('src');filmPaused=false}else filmPaused=!video.paused;
 if(!filmPaused){filmVisible=true;labels()}
 playFilm();schedule();
});
video?.addEventListener('playing',()=>{film.dataset.filmReady='true';filmFailed=false;filmLabels()});
for(const event of ['play','pause','waiting','canplay'])video?.addEventListener(event,filmLabels);
video?.addEventListener('loadedmetadata',()=>{if(filmResumeTime>0&&Number.isFinite(video.duration)){video.currentTime=Math.min(filmResumeTime,Math.max(0,video.duration-.1));filmResumeTime=0}});
video?.addEventListener('error',()=>{filmFailed=true;filmPaused=true;delete film.dataset.filmReady;filmLabels()});
// Paint the fine progress line with decoded video frames, not the coarse
// timeupdate cadence. Unsupported browsers keep the event-based fallback.
let filmFrame=0;
const paintFilmProgress=()=>{$('#filmProgress').style.transform=`scaleX(${clamp(video.currentTime/(video.duration||12))})`};
function stopFilmProgress(){if(filmFrame){video.cancelVideoFrameCallback?.(filmFrame);filmFrame=0}paintFilmProgress()}
function followFilmProgress(){
 if(filmFrame||typeof video.requestVideoFrameCallback!=='function'||video.paused||video.ended||document.hidden||pageAway||!filmVisible)return;
 filmFrame=video.requestVideoFrameCallback(()=>{filmFrame=0;paintFilmProgress();followFilmProgress()});
}
video?.addEventListener('playing',followFilmProgress);
for(const event of ['pause','waiting','ended','emptied','error'])video?.addEventListener(event,stopFilmProgress);
video?.addEventListener('timeupdate',paintFilmProgress);
$('#motionToggle')?.addEventListener('click',()=>{paused=!paused;rememberMotion(paused);cancelTransition();filmPaused=paused;labels();playFilm();schedule()});
$('#previousCourse').addEventListener('click',()=>select(nextCourseIndex(requested,-1,available),-1));
$('#nextCourse').addEventListener('click',()=>select(nextCourseIndex(requested,1,available),1));
$('#courseControl').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const next=e.key==='Home'?available[0]:e.key==='End'?available.at(-1):nextCourseIndex(requested,e.key==='ArrowLeft'?-1:1,available);select(next,e.key==='ArrowLeft'?-1:1)});
let touch=null;
stage.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch')return;if(e.isPrimary===false||e.target.closest('a,button')){touch=null;return}touch={id:e.pointerId,x:e.clientX,y:e.clientY}});
stage.addEventListener('pointerup',e=>{if(!touch||(touch.id!==undefined&&touch.id!==e.pointerId))return;const dx=e.clientX-touch.x,dy=e.clientY-touch.y;touch=null;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.8)select(nextCourseIndex(requested,dx<0?1:-1,available),dx<0?1:-1)});
stage.addEventListener('pointercancel',()=>{touch=null});
stage.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'||paused||reduce.matches)return;const r=stage.getBoundingClientRect();pointer={x:clamp((e.clientX-r.left)/r.width*2-1,-1,1),y:clamp((e.clientY-r.top)/r.height*2-1,-1,1)};schedule()},{passive:true});
stage.addEventListener('pointerleave',()=>{pointer={x:0,y:0};schedule()});
addEventListener('scroll',schedule,{passive:true});addEventListener('resize',resize,{passive:true});
addEventListener('site-language-changed',render);
addEventListener('catalog-updated',refreshCatalogue);
document.addEventListener('visibilitychange',()=>{labels();playFilm();if(document.hidden){cancelTransition();if(frame)cancelAnimationFrame(frame);frame=0}else schedule()});
reduce.addEventListener('change',()=>{if(reduce.matches){paused=true;filmPaused=true;cancelTransition()}labels();playFilm();schedule()});
mobile.addEventListener('change',()=>{
 if(!video)return;
 // Resize the film crop, not its playback intent. Paused/offscreen films never
 // start downloading a replacement until the user plays or returns to them.
 $('.cinema-poster').src=filmPoster();
 if(video.getAttribute('src'))video.poster=filmPoster();
 playFilm();
});
addEventListener('pagehide',()=>{pageAway=true;++selectedToken;cancelTransition();video?.pause();++playToken;if(frame)cancelAnimationFrame(frame);frame=0;labels()});
addEventListener('pageshow',()=>{pageAway=false;$('#courseControl').setAttribute('aria-busy','false');requested=current;if(selectionStatus==='loading'){selectionStatus='';render()}labels();playFilm();schedule()});
if('IntersectionObserver' in globalThis){
 const observer=new IntersectionObserver(entries=>{for(const e of entries){if(e.target===story){visible=e.isIntersecting;if(!visible){cancelTransition();if(frame)cancelAnimationFrame(frame);frame=0}labels();schedule()}else{filmVisible=e.isIntersecting;if(filmVisible)releaseFilmPoster();playFilm()}}});observer.observe(story);if(film)observer.observe(film);
}
if('ResizeObserver' in globalThis){const layoutObserver=new ResizeObserver(resize);layoutObserver.observe(document.querySelector('.site-header'));layoutObserver.observe(stage);layoutObserver.observe($('#stageTaste'))}
story.dataset.enhanced=String(!reduce.matches);
refreshCatalogue();resize();
revealDecodedPhoto();
if(photo.complete&&!photo.naturalWidth)photoUnavailable();
// A single settling gesture on the first decoded food image. It never delays
// content, never advances the selected dish, and never moves the user's page.
if(typeof photo.decode==='function'){
 const openingImage=photo.src;
 photo.decode().then(()=>{
  // Warm only the other two local campaign assets after the priority hero is
  // decoded. Data saver and reported slow links keep unseen assets on demand;
  // explicit selection still uses the same loader, never a disabled control.
  const warm=()=>{if(pageAway||document.hidden||!visible||constrainedConnection())return;for(const index of available){const src=record(index).image;if(index!==current&&heroSources(src))preload(src).catch(()=>{})}};
  if('requestIdleCallback' in globalThis)requestIdleCallback(warm,{timeout:2000});else requestAnimationFrame(warm);
 }).catch(()=>{});
 photo.decode().then(()=>{
  if(interacted||paused||reduce.matches||document.hidden||pageAway||photo.src!==openingImage||targetProgress>.08)return;
  animate(photo,[{transform:'translateY(8%) rotate(7deg) scale(.91)'},{transform:'translateY(0) rotate(0deg) scale(1)'}],{duration:1050});
  animate($('#stageWord'),[{translate:'0 16px'},{translate:'0 0'}],{duration:900});
  revealCallouts(320);
 }).catch(()=>{});
}
// No timers advance dishes; selection changes only on an explicit user action.

// Film gallery enhancement only. No changes to the approved product stage.
{
 const gallery=document.querySelector('#film.film-gallery');
 if(gallery){
  const detail=gallery.querySelector('.film-detail-image img');
  const fallback=gallery.querySelector('.film-detail-fallback');
  const showDetailError=()=>{detail.style.visibility='hidden';fallback.hidden=false};
  detail.addEventListener('error',showDetailError);
  detail.addEventListener('load',()=>{detail.style.visibility='';fallback.hidden=true});
  if(detail.complete&&!detail.naturalWidth)showDetailError();
  // Single, staggered entrance; no ongoing animation or scroll hijack.
  if('IntersectionObserver' in globalThis){
   const entrances=new Set();
   const observer=new IntersectionObserver(entries=>{
    for(const entry of entries)if(entry.isIntersecting){
     observer.unobserve(entry.target);
     if(reduce.matches||paused)continue;
     const animation=entry.target.animate([{opacity:0,transform:'translateY(28px)'},{opacity:1,transform:'translateY(0)'}],{duration:760,delay:entry.target.classList.contains('film-detail')?100:0,easing:'cubic-bezier(.2,.7,.2,1)'});
     entrances.add(animation);animation.finished.then(()=>entrances.delete(animation),()=>entrances.delete(animation));
    }
   },{threshold:.12});
   gallery.querySelectorAll('.film-gallery-item').forEach(el=>observer.observe(el));
   const settle=()=>{for(const a of entrances)a.cancel();entrances.clear()};
   reduce.addEventListener('change',settle);
   document.querySelector('#motionToggle')?.addEventListener('click',settle);
   addEventListener('pagehide',settle);
  }
 }
}
