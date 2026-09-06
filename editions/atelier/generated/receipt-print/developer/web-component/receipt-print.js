// Original receipt-surface choreography; decorative only, never performs an order mutation.
(() => {
  const duration = 1320;
  const easing = 'cubic-bezier(.22,.72,.18,1)';
  class ReceiptPrint extends (globalThis.HTMLElement || class {}) {
    constructor() {
      super();
      this.jobs = [];
      this.attachShadow?.({mode:'open'});
      if (this.shadowRoot) this.shadowRoot.innerHTML = `<style>
        :host{display:block;position:relative;isolation:isolate}
        .machine{position:relative;height:18px;margin:0 -7px;z-index:2;background:linear-gradient(#514b43,#292621);border:1px solid #211f1b;border-radius:7px;box-shadow:0 3px 6px #29251c25}
        .slit{position:absolute;inset:6px 12px 5px;border-radius:4px;background:#11110f;box-shadow:0 1px 0 #ffffff1f}
        .output{position:relative;margin-top:-6px;padding:0 4px 14px;overflow:hidden}
        .output::after{content:'';position:absolute;inset:0 4px auto;height:9px;background:linear-gradient(#201d2440,transparent);pointer-events:none}
        .paper{position:relative;transform-origin:top center;filter:drop-shadow(0 6px 6px #27251d16)}
        ::slotted(article){margin:0!important}
      </style><div class="machine" aria-hidden="true"><div class="slit"></div></div><div class="output"><div class="paper"><slot></slot></div></div>`;
      this.onPreference = () => { if(this.media?.matches) this.finish(); };
    }
    connectedCallback() {
      this.media = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
      this.media?.addEventListener?.('change',this.onPreference);
      this.dataset.motionState = 'complete';
      this.emit('motion-ready');
    }
    disconnectedCallback() { this.clear(); this.media?.removeEventListener?.('change',this.onPreference); }
    emit(type) { this.dispatchEvent(new Event(type,{bubbles:true,composed:true})); }
    clear() { this.run = (this.run || 0) + 1; this.jobs.forEach(a=>a.cancel()); this.jobs=[]; }
    animatePart(node,frames,timing) {
      const a=node?.animate?.(frames,{duration,easing,fill:'both',...timing});
      if(a) this.jobs.push(a);
    }
    restart() {
      this.clear();
      if(!this.isConnected || this.media?.matches || !this.shadowRoot?.querySelector('.paper')?.animate) { this.dataset.motionState='complete'; return; }
      const run=this.run;
      this.dataset.motionState='printing';
      const paper=this.shadowRoot.querySelector('.paper');
      this.animatePart(paper,[
        {clipPath:'inset(0 0 100% 0)',transform:'translateY(-6px)',offset:0},
        {clipPath:'inset(0 0 100% 0)',transform:'translateY(-6px)',offset:.075},
        {clipPath:'inset(0 0 79% 0)',transform:'translateY(-4px)',offset:.22},
        {clipPath:'inset(0 0 79% 0)',transform:'translateY(-4px)',offset:.245},
        {clipPath:'inset(0 0 52% 0)',transform:'translateY(-2px)',offset:.42},
        {clipPath:'inset(0 0 52% 0)',transform:'translateY(-2px)',offset:.445},
        {clipPath:'inset(0 0 23% 0)',transform:'translateY(-1px)',offset:.63},
        {clipPath:'inset(0 0 23% 0)',transform:'translateY(-1px)',offset:.655},
        {clipPath:'inset(0 0 0% 0)',transform:'translateY(0)',offset:.81},
        {clipPath:'inset(0 0 0% 0)',transform:'translateY(0)',offset:1},
      ],{easing:'linear'});
      const article=this.querySelector('.paper-receipt');
      const top=article?.getBoundingClientRect().top || 0, height=Math.max(1,article?.getBoundingClientRect().height || 1);
      this.querySelectorAll('.receipt-masthead,.receipt-heading h2,.receipt-meta,.receipt-dish-strip,.receipt-lines > div,.receipt-note,.receipt-sum,.paper-receipt > footer').forEach(node=>{
        const delay=Math.min(1000,140 + Math.max(0,node.getBoundingClientRect().top-top)/height*880);
        this.animatePart(node,[{opacity:0,transform:'translateY(-2px)'},{opacity:1,transform:'none'}],{delay,duration:180});
      });
      this.animatePart(this.querySelector('.receipt-stamp'),[
        {opacity:0,transform:'rotate(-8deg) scale(1.12)'},
        {opacity:1,transform:'rotate(-8deg) scale(1)'},
      ],{delay:1080,duration:240});
      this.emit('motion-play');
      Promise.all(this.jobs.map(a=>a.finished)).then(()=>{
        if(this.run!==run || !this.isConnected)return;
        this.jobs.forEach(a=>a.cancel());this.jobs=[];
        this.dataset.motionState='complete';this.emit('motion-complete');
      }).catch(()=>{});
    }
    finish() { const was=this.dataset.motionState==='printing';this.clear();this.dataset.motionState='complete';if(was)this.emit('motion-complete'); }
    pause() { this.jobs.forEach(a=>a.pause());this.emit('motion-pause'); }
    play() { if(this.jobs.length)this.jobs.forEach(a=>a.play());else this.restart(); }
    seek(ms) { if(!this.jobs.length)this.restart();this.jobs.forEach(a=>{a.pause();a.currentTime=Math.max(0,Math.min(duration,ms));});this.emit('motion-seek'); }
    setProgress(p) { this.seek(Math.max(0,Math.min(1,p))*duration); }
  }
  if(globalThis.customElements && !customElements.get('dl-receipt-print'))customElements.define('dl-receipt-print',ReceiptPrint);
})();
