// Existing transparent food photos, not generated 3D geometry or a 360° model.
(() => {
  if (typeof document === 'undefined') return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const fine=matchMedia('(hover: hover) and (pointer: fine)');
  let active=null, frame=0, point=null;
  const selector='.dish-image, .addon-scene';
  function reset(){
    cancelAnimationFrame(frame);frame=0;
    if(active){active.classList.remove('food-depth-active');for(const key of ['--food-rx','--food-ry','--food-sx','--food-sy'])active.style.removeProperty(key);}
    active=null;
  }
  function move(event){
    if(reduced.matches || !fine.matches || event.pointerType==='touch')return;
    const host=event.target.closest?.(selector);
    if(!host || host.classList.contains('image-unavailable')){reset();return;}
    if(active!==host){reset();active=host;active.classList.add('food-depth-active');}
    point={x:event.clientX,y:event.clientY};
    if(frame)return;
    frame=requestAnimationFrame(()=>{
      frame=0;if(!active?.isConnected){reset();return;}
      const rect=active.getBoundingClientRect();
      const x=Math.max(-1,Math.min(1,(point.x-rect.left)/Math.max(1,rect.width)*2-1));
      const y=Math.max(-1,Math.min(1,(point.y-rect.top)/Math.max(1,rect.height)*2-1));
      active.style.setProperty('--food-rx',`${-y*5}deg`);
      active.style.setProperty('--food-ry',`${x*7}deg`);
      active.style.setProperty('--food-sx',`${-x*3}px`);
      active.style.setProperty('--food-sy',`${6-y*2}px`);
    });
  }
  document.addEventListener('pointermove',move,{passive:true});
  document.addEventListener('pointerout',e=>{if(active&&!active.contains(e.relatedTarget))reset();},{passive:true});
  document.addEventListener('scroll',reset,{passive:true,capture:true});
  document.addEventListener('visibilitychange',reset);
  document.addEventListener('pointercancel',reset);
  window.addEventListener('blur',reset);
  reduced.addEventListener('change',reset);fine.addEventListener('change',reset);
})();
