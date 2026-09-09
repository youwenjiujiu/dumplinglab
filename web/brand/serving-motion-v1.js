// Custom semantic derivative of generated/brand-serving-v1: serve, then settle.
// The original brand silhouette is a mask; no reconstructed or AI-redrawn logo.
(() => {
  if (typeof customElements === 'undefined' || customElements.get('dl-serving-motion')) return;
  class ServingMotion extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({mode:'open'}).innerHTML = `<style>
        :host{display:inline-block;position:relative;width:24px;height:24px;contain:layout style;color:var(--order-accent,#e51b00)}
        i{position:absolute;display:block;box-sizing:border-box}
        .dumpling{width:17px;height:16px;left:3.5px;top:2px;background:currentColor;mask:url('/brand/dumpling-symbol.svg') center/contain no-repeat}
        .plate{width:23px;height:7px;left:.5px;bottom:1px;border:1.3px solid currentColor;border-radius:50%}
        .chopsticks{width:14px;height:4px;top:0;right:0;border-top:1px solid currentColor;border-bottom:1px solid currentColor;transform:rotate(-35deg);transform-origin:right center;opacity:0}
      </style><i class="plate"></i><i class="dumpling"></i><i class="chopsticks"></i>`;
      this.animations = [];
      this.reduce = matchMedia('(prefers-reduced-motion: reduce)');
      this.onPreference = () => { if(this.reduce.matches) this.reset(); };
    }
    connectedCallback() {
      this.reduce.addEventListener('change',this.onPreference);
      this.parentControl=this.closest('button');
      this.onActivate=()=>this.restart();
      this.parentControl?.addEventListener('pointerenter',this.onActivate);
      this.parentControl?.addEventListener('focus',this.onActivate);
      this.parentControl?.addEventListener('click',this.onActivate);
      this.observer = new IntersectionObserver(entries=>{
        if(entries.some(e=>e.isIntersecting)){this.restart();this.observer.disconnect();}
      },{threshold:.5});
      this.observer.observe(this);
    }
    reset() { this.animations.forEach(a=>a.cancel());this.animations=[]; }
    restart() {
      this.reset();
      if(this.reduce.matches || document.hidden) return;
      const duration=720,easing='cubic-bezier(.22,.72,.18,1)';
      const tracks=[
        ['.dumpling',[{transform:'translate(5px,-5px) rotate(-12deg)'},{transform:'translate(0,0) rotate(0)',offset:.62},{transform:'none'}]],
        ['.chopsticks',[{opacity:0,transform:'translateY(-3px) rotate(-35deg)'},{opacity:1,transform:'translateY(0) rotate(-35deg)',offset:.16},{opacity:1,transform:'translate(-3px,3px) rotate(-35deg)',offset:.48},{opacity:0,transform:'translate(2px,-4px) rotate(-35deg)',offset:.82},{opacity:0}]],
        ['.plate',[{transform:'none'},{transform:'none',offset:.52},{transform:'scaleY(.78)',offset:.67},{transform:'none'}]],
      ];
      this.animations=tracks.map(([selector,frames])=>this.shadowRoot.querySelector(selector).animate(frames,{duration,easing}));
      this.dispatchEvent(new CustomEvent('motion-play',{bubbles:true,composed:true}));
      const active=this.animations;
      Promise.all(active.map(a=>a.finished)).then(()=>{
        if(this.animations===active)this.dispatchEvent(new CustomEvent('motion-complete',{bubbles:true,composed:true}));
      }).catch(()=>{});
    }
    play(){ if(!this.animations.length)this.restart();else this.animations.forEach(a=>a.play()); }
    pause(){this.animations.forEach(a=>a.pause());}
    seek(ms){if(!this.animations.length)this.restart();this.animations.forEach(a=>{a.pause();a.currentTime=Math.max(0,Math.min(720,ms));});}
    setProgress(progress){this.seek(progress*720);}
    disconnectedCallback(){
      this.reset();this.observer?.disconnect();this.reduce.removeEventListener('change',this.onPreference);
      for(const event of ['pointerenter','focus','click'])this.parentControl?.removeEventListener(event,this.onActivate);
    }
  }
  customElements.define('dl-serving-motion',ServingMotion);
})();
