// The shopfront moves in as one connected 2D object.
const Base = globalThis.HTMLElement ?? class {};
const DURATION = 2200;
const PHOTO = '/brand/restaurant-front-cutout-v1.webp';
const EASE = 'cubic-bezier(.4,0,.6,1)';
export class DumplingStorefrontInk extends Base {
  constructor() {
    super();
    this._time = 0;
    this._animations = [];
    this._generation = 0;
  }
  async connectedCallback() {
    const generation = ++this._generation;
    this._reduced = matchMedia('(prefers-reduced-motion: reduce)');
    this._onReduced = () => { if (this._reduced.matches) this.seek(DURATION); };
    this._onVisibility = () => this._syncPlayback();
    this._reduced.addEventListener('change', this._onReduced);
    document.addEventListener('visibilitychange', this._onVisibility);
    const source = this.querySelector('img');
    try { await source.decode(); } catch { return; }
    if (!this.isConnected || generation !== this._generation) return;
    const shadow = this.shadowRoot || this.attachShadow({mode:'open'});
    // The restaurant's shopfront photo (same as the website), cut out without the neighbouring walls.
    shadow.innerHTML = `<style>
      :host{display:block;position:relative}
      .scene{position:absolute;inset:0;pointer-events:none}
      svg{display:block;width:100%;height:100%;overflow:visible}
      .building{transform:translate(-48px,64px);opacity:0}
    </style>
    <div class="scene" aria-hidden="true"><svg viewBox="0 0 694 562" xmlns="http://www.w3.org/2000/svg">
      <g class="building"><image href="${PHOTO}" width="694" height="562"/></g>
    </svg></div>`;
    const animate = (selector, frames, options) => {
      const animation = shadow.querySelector(selector).animate(frames, {fill:'both',easing:EASE,...options});
      animation.pause(); animation.currentTime = 0;
      this._animations.push(animation);
    };
    // Move the actual connected building, not a wipe boundary. Static source
    // crops only remove the unwanted annex; they never animate or reveal parts.
    animate('.building',[
      {transform:'translate(-48px,64px)',opacity:0,offset:0},
      {transform:'translate(-36px,48px)',opacity:1,offset:.22},
      {transform:'translate(0px,0px)',opacity:1,offset:1}
    ],{duration:DURATION});
    this._animations.at(-1).onfinish = () => { this.dataset.phase='settled'; this._time=DURATION; this._emit('motion-complete'); };
    this.dataset.renderState = 'ready';
    this.dataset.phase = 'waiting';
    this._emit('motion-ready');
    this._observer = new IntersectionObserver(entries => {
      this._visible = entries[0].isIntersecting;
      if (this._visible && !this._started) { this._started=true; if(this._reduced.matches) this.seek(DURATION); }
      this._syncPlayback();
    }, {threshold:.2});
    this._observer.observe(this);
  }
  _emit(name) { this.dispatchEvent(new CustomEvent(name,{bubbles:true,composed:true})); }
  _syncPlayback() {
    if(!this._started || this.dataset.phase==='settled' || this._manual) return;
    if(this._visible && !document.hidden) this.play(); else this.pause();
  }
  play() {
    if(this._reduced?.matches) { this.seek(DURATION); return; }
    this._manual=false; this.dataset.phase='playing';
    this._animations.forEach(animation=>animation.play()); this._emit('motion-play');
  }
  pause() { this._animations.forEach(animation=>animation.pause()); this._emit('motion-pause'); }
  restart() { this._manual=false; this._animations.forEach(animation=>{animation.currentTime=0;}); this.play(); }
  seek(milliseconds) {
    this._manual=true; this._time=Math.max(0,Math.min(DURATION,milliseconds));
    this._animations.forEach(animation=>{animation.pause(); animation.currentTime=this._time;});
    this.dataset.phase=this._time===DURATION?'settled':'paused'; this._emit('motion-seek');
  }
  setProgress(progress) { this.seek(progress*DURATION); }
  inspect() { return {mode:'2d',duration:DURATION,phase:this.dataset.phase,layers:this._animations.length,animating:this._animations.some(a=>a.playState==='running')}; }
  disconnectedCallback() {
    this._generation++; this._observer?.disconnect();
    this._reduced?.removeEventListener('change',this._onReduced);
    document.removeEventListener('visibilitychange',this._onVisibility);
    this._animations.forEach(animation=>animation.cancel()); this._animations=[];
    this._started=false; this._manual=false;
  }
}
if(globalThis.customElements && !customElements.get('dumpling-storefront-ink')) customElements.define('dumpling-storefront-ink',DumplingStorefrontInk);
