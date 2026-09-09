// Illustrative diners, not a live headcount. Enclosing buttons own all actions.
(() => {
  class SharingMotion extends (globalThis.HTMLElement || class {}) {
    constructor() {
      super(); this.attachShadow?.({mode:'open'}); this.jobs=[]; this.run=0;
      this.activate=()=>this.restart();
      this.onPreference=()=>{if(this.preference.matches)this.finish();};
    }
    connectedCallback() {
      const separate=this.getAttribute('mode')==='separate';
      const type=separate?'separate':'together';
      const version=separate?'v7':'v5';
      const ticket=x=>`<g transform="translate(${x} 2)"><path class="ticket" d="M-11 0h22v24l-4-2-4 2-3-2-4 2-3-2-4 2z"/><path class="receipt-ink" d="M-6 6H6M-6 11H6M-6 16H1"/></g>`;
      this.shadowRoot.innerHTML=`<style>
        :host{display:block;width:100%;color:var(--red,#983f32)}
        .scene{position:relative;aspect-ratio:1;background:#fff;overflow:hidden}
        img{display:block;width:100%;height:100%;object-fit:contain}
        svg{display:block;width:100%;height:28px;overflow:visible}
        .ticket{fill:#fff;stroke:currentColor;stroke-width:1;stroke-linejoin:round}
        .receipt-ink{fill:none;stroke:currentColor;stroke-width:1;stroke-linecap:round}
      </style><div class="scene" data-scene="${type}">
        <img src="/img/s/dining-${type}-${version}.webp" alt="" width="720" height="720" decoding="async">
      </div><svg viewBox="0 0 200 28" aria-hidden="true"><g class="tickets">${separate?ticket(58)+ticket(142):ticket(100)}</g></svg>`;
      this.button=this.closest('button');
      this.button?.addEventListener('pointerenter',this.activate);
      this.button?.addEventListener('focus',this.activate);
      this.preference=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
      this.preference?.addEventListener?.('change',this.onPreference);
      this.emit('motion-ready');
      this.frame=globalThis.requestAnimationFrame?.(()=>{if(this.isConnected)this.restart();});
    }
    disconnectedCallback() {
      globalThis.cancelAnimationFrame?.(this.frame); this.clear();
      this.button?.removeEventListener('pointerenter',this.activate);
      this.button?.removeEventListener('focus',this.activate);
      this.preference?.removeEventListener?.('change',this.onPreference);
    }
    emit(name){this.dispatchEvent(new CustomEvent(name,{bubbles:true,composed:true}));}
    clear(){this.run++;this.jobs.forEach(a=>a.cancel());this.jobs=[];}
    finish(){this.clear();this.dataset.motionState='complete';}
    restart() {
      this.clear();
      if(this.preference?.matches){this.finish();return;}
      const run=this.run;
      const animate=(selector,frames,options)=>{
        for(const el of this.shadowRoot.querySelectorAll(selector)){
          const a=el.animate?.(frames,{duration:650,easing:'cubic-bezier(.22,.72,.18,1)',...options});
          if(a)this.jobs.push(a);
        }
      };
      this.dataset.motionState='playing';this.emit('motion-play');
      animate('.tickets',[{opacity:0,transform:'translateY(-9px)'},{opacity:1,transform:'none'}],{duration:350,delay:600,fill:'backwards'});
      Promise.all(this.jobs.map(a=>a.finished.catch(()=>{}))).then(()=>{
        if(this.run===run){this.finish();this.emit('motion-complete');}
      });
    }
    pause(){this.jobs.forEach(a=>a.pause());this.emit('motion-pause');}
    play(){if(this.preference?.matches)return this.finish();if(!this.jobs.length)return this.restart();this.jobs.forEach(a=>a.play());this.emit('motion-play');}
    seek(ms){if(this.preference?.matches)return this.finish();if(!this.jobs.length)this.restart();this.jobs.forEach(a=>{a.pause();a.currentTime=Math.max(0,Math.min(950,ms));});this.emit('motion-seek');}
    setProgress(n){this.seek(n*950);}
  }
  if(globalThis.customElements&&!customElements.get('dl-sharing-motion'))customElements.define('dl-sharing-motion',SharingMotion);
})();
