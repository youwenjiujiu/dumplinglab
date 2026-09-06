// Fit each language line independently; no text rewriting and no order-state access.
(() => {
  if (!document.createRange?.().getBoundingClientRect) return;
  const selectors = '.bilingual > [lang], .dish-name, .dish-english, .section-heading .translation, .detail-other:not(:has(.bilingual)), .detail-top h1, .filling-picker strong, .filling-picker small:not(:has(.bilingual)):not(.price-from), .receipt-item-copy > strong, .receipt-item-copy > small[lang], .preparation-label > strong, .preparation-label > small, .category-choice > strong, .category-choice > .translation';
  let frame=0;
  const observed=new WeakSet();
  const resize=new ResizeObserver(()=>schedule());
  function fit() {
    frame=0;
    const lines=[...document.querySelectorAll(selectors)].filter(el=>el.getClientRects().length&&el.textContent.trim());
    for(const el of lines) {
      if(el.style.getPropertyValue('--fit-font'))el.style.removeProperty('--fit-font');
      if(el.parentElement&&!observed.has(el.parentElement)){observed.add(el.parentElement);resize.observe(el.parentElement);}
    }
    const sizes=lines.map(el=>{
      const box=el.getBoundingClientRect(),style=getComputedStyle(el);
      const available=box.width-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);
      // A Range measures glyphs, including inline word spans, not the allocated box.
      const range=document.createRange();range.selectNodeContents(el);
      const width=range.getBoundingClientRect().width;
      return {el,size:parseFloat(style.fontSize),available,width};
    });
    const groups=new Map();
    for(const item of sizes) {
      const {el,size,available,width}=item;
      const next=available>0&&width>available+.25 ? Math.max(1,Math.floor(size*available/width*100)/100) : size;
      const section=el.matches('.dish-name') ? el.closest('.menu-section') : null;
      if(section) {
        const group=groups.get(section)||{size:next,lines:[]};
        group.size=Math.min(group.size,next);group.lines.push(el);groups.set(section,group);
      } else if(next<size)el.style.setProperty('--fit-font',`${next}px`);
    }
    // Titles in the same category always share one size, even when lengths differ.
    for(const group of groups.values())for(const el of group.lines)el.style.setProperty('--fit-font',`${group.size}px`);
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(fit);}
  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,characterData:true});
  window.addEventListener('resize',schedule,{passive:true});
  document.fonts?.ready.then(schedule);
  document.fonts?.addEventListener?.('loadingdone',schedule);
  schedule();
})();
