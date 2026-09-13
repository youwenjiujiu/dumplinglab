// Original brand artwork. Reach -> grip -> lift -> carry; no order-state authority.
(() => {
  if (typeof customElements === 'undefined' || customElements.get('dl-takeaway-pickup')) return;
  class TakeawayPickup extends HTMLElement {
    constructor() {
      super(); this.animations = []; this.running = false; this.duration = 5200;
      this.attachShadow({mode: 'open'}).innerHTML = `<style>
        :host{display:block;position:relative;width:100%;aspect-ratio:260/220;contain:layout style;pointer-events:none}
        *{box-sizing:border-box}
        .stage{position:absolute;inset:0 auto auto 0;width:260px;height:220px;transform-origin:0 0;overflow:hidden;color:#e51b00}
        .ground{position:absolute;left:38px;top:183px;width:194px;height:12px;border-radius:50%;background:#28221b0b}
        .carry,.box{position:absolute;inset:0;transform-origin:150px 28px}.carry{z-index:2}.box{z-index:3}
        img{display:block;width:260px;height:220px;max-width:none;pointer-events:none}
        .hand{position:absolute;inset:0;width:260px;height:220px;opacity:0;overflow:visible;z-index:2}
        .fingers{transform-origin:149px 25px}
      </style><div class="stage" aria-hidden="true"><div class="ground"></div>
        <div class="carry"><img src="/brand/entry-takeaway-bag-v3.svg" alt="">
          <svg class="hand" viewBox="0 0 260 220" fill="#fffaf2" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <path fill="currentColor" d="M191 4 271-24 280 16 204 39Z"/>
            <path d="m181 8 17-6 12 35-17 6Z"/>
            <path d="M184 11c-12-3-19 2-27 7l-13 5c-8 3-12 7-11 12 1 4 5 5 9 2l9-6 6 8c6 7 14 5 22 1l14-6Z"/>
            <g class="fingers">
              <path d="m141 27-1 16c0 7 8 7 9 1l2-18"/>
              <path d="m150 26-1 19c0 7 8 7 9 0l1-20"/>
              <path d="m159 25-1 17c0 6 8 7 9 0l1-16"/>
            </g>
            <path d="M176 19c-10-6-18-3-22 5l-6 10c-3 5-1 8 3 8 3 0 5-3 7-6l7-9"/>
          </svg>
        </div><div class="box"><img src="/brand/entry-takeaway-box-v3.svg" alt=""></div>
      </div>`;
      this.reduced = matchMedia('(prefers-reduced-motion: reduce)');
      this.onReduced = () => { if (this.reduced.matches) this.reset(); };
      this.onReplay = () => { if (!this.running) this.restart(); };
      this.onVisibility = () => {
        if (document.hidden) { this.resume = this.running; this.pause(); }
        else if (this.resume) { this.resume = false; this.play(); }
      };
    }
    connectedCallback() {
      this.resize = new ResizeObserver(() => {
        this.shadowRoot.querySelector('.stage').style.transform = `scale(${this.clientWidth / 260})`;
      }); this.resize.observe(this);
      this.owner = this.closest('button');
      for (const event of ['pointerenter', 'focus']) this.owner?.addEventListener(event, this.onReplay);
      this.reduced.addEventListener('change', this.onReduced);
      document.addEventListener('visibilitychange', this.onVisibility);
      this.visible = new IntersectionObserver(entries => {
        if (entries.some(e => e.isIntersecting)) { this.visible.disconnect(); this.startWhenLoaded(); }
      }, {threshold: .4}); this.visible.observe(this);
    }
    async startWhenLoaded() {
      await Promise.all([...this.shadowRoot.querySelectorAll('img')].map(img => img.decode().catch(() => {})));
      if (this.isConnected) this.restart();
    }
    reset() { this.animations.forEach(a => a.cancel()); this.animations = []; this.running = false; this.resume = false; }
    track(selector, frames) {
      this.animations.push(this.shadowRoot.querySelector(selector).animate(
        frames.map(frame => ({...frame, easing: 'cubic-bezier(.33,.05,.18,1)'})),
        {duration: this.duration, easing: 'linear', fill: 'both', iterations: 1}));
    }
    restart() {
      this.reset(); if (this.reduced.matches || document.hidden) return; this.running = true;
      this.track('.box', [
        {transform: 'none', opacity: 1, offset: 0}, {transform: 'none', opacity: 1, offset: .03},
        {transform: 'translate(45px,-103px) scale(.65)', opacity: 1, offset: .15},
        {transform: 'translate(70px,-25px) scale(.65)', opacity: 0, offset: .23},
        {transform: 'translate(70px,-25px) scale(.65)', opacity: 0, offset: .82},
        {transform: 'none', opacity: 0, offset: .86}, {transform: 'none', opacity: 1, offset: .92},
        {transform: 'none', opacity: 1, offset: 1}]);
      this.track('.hand', [
        {transform: 'translate(70px,-65px)', opacity: 0, offset: 0},
        {transform: 'translate(70px,-65px)', opacity: 1, offset: .03},
        {transform: 'none', opacity: 1, offset: .29}, {transform: 'none', opacity: 1, offset: .79},
        {transform: 'none', opacity: 0, offset: .82}, {transform: 'none', opacity: 0, offset: 1}]);
      this.track('.fingers', [
        {transform: 'scaleY(1)', offset: 0}, {transform: 'scaleY(1)', offset: .29},
        {transform: 'scaleY(.7)', offset: .35}, {transform: 'scaleY(.7)', offset: 1}]);
      this.track('.carry', [
        {transform: 'none', opacity: 1, offset: 0}, {transform: 'none', opacity: 1, offset: .37},
        {transform: 'translate(0,-18px) rotate(-3deg)', opacity: 1, offset: .48},
        {transform: 'translate(0,-18px) rotate(-3deg)', opacity: 1, offset: .55},
        {transform: 'translate(168px,-42px) rotate(7deg)', opacity: 1, offset: .77},
        {transform: 'translate(168px,-42px) rotate(7deg)', opacity: 0, offset: .82},
        {transform: 'none', opacity: 0, offset: .86}, {transform: 'none', opacity: 1, offset: .92},
        {transform: 'none', opacity: 1, offset: 1}]);
      this.track('.ground', [
        {opacity: 1, transform: 'none', offset: 0}, {opacity: 1, transform: 'none', offset: .37},
        {opacity: .4, transform: 'scale(.8)', offset: .48}, {opacity: 0, transform: 'scale(.6)', offset: .77},
        {opacity: 0, transform: 'none', offset: .86}, {opacity: 1, transform: 'none', offset: .92},
        {opacity: 1, transform: 'none', offset: 1}]);
      const active = this.animations;
      Promise.all(active.map(a => a.finished)).then(() => {
        if (this.animations === active) { this.running = false; this.dispatchEvent(new CustomEvent('motion-complete', {bubbles: true, composed: true})); }
      }).catch(() => {});
    }
    pause() { this.animations.forEach(a => a.pause()); this.running = false; }
    play() { if (this.reduced.matches || document.hidden) return; if (!this.animations.length) { this.restart(); return; } this.animations.forEach(a => a.play()); this.running = true; }
    seek(ms) { if (!this.animations.length) this.restart(); this.animations.forEach(a => { a.pause(); a.currentTime = Math.max(0, Math.min(this.duration, ms)); }); this.running = false; }
    setProgress(progress) { this.seek(progress * this.duration); }
    disconnectedCallback() {
      this.reset(); this.resize?.disconnect(); this.visible?.disconnect();
      this.reduced.removeEventListener('change', this.onReduced); document.removeEventListener('visibilitychange', this.onVisibility);
      for (const event of ['pointerenter', 'focus']) this.owner?.removeEventListener(event, this.onReplay);
    }
  }
  customElements.define('dl-takeaway-pickup', TakeawayPickup);
})();
