// Native responsive SVG, not transformed SVG image layers. Original mark retained.
(() => {
  if (typeof customElements === 'undefined' || customElements.get('dl-takeaway-pickup')) return;
  class TakeawayPickup extends HTMLElement {
    constructor() {
      super(); this.animations = []; this.running = false; this.duration = 5200;
      this.attachShadow({mode: 'open'}).innerHTML = `<style>
        :host{display:block;width:100%;aspect-ratio:260/220;contain:layout style;pointer-events:none}
        .stage{display:block;width:100%;height:auto;overflow:hidden;color:#9c3d39}
        .carry,.box,.hand,.fingers,.ground{transform-box:view-box}
        .carry,.box{transform-origin:150px 28px}
        .hand{opacity:0}
        .fingers{transform-origin:149px 25px}
        .ground{transform-origin:135px 194px}
      </style><svg class="stage" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 220" aria-hidden="true" shape-rendering="geometricPrecision"><defs><symbol id="dumpling" viewBox="42 24 58 76"><path fill="currentColor" fill-rule="nonzero" d="M86.1875 63.390625C85.746094 63.820312 85.136719 64.097656 84.46875 64.097656H81.59375C80.246094 64.097656 79.15625 63.015625 79.15625 61.671875C79.15625 60.992188 79.429688 60.382812 79.875 59.953125C80.304688 59.511719 80.914062 59.234375 81.59375 59.234375H84.46875C85.816406 59.234375 86.90625 60.324219 86.90625 61.671875C86.90625 62.347656 86.628906 62.945312 86.1875 63.390625M85.570312 83.070312V83.082031C85.15625 84.355469 83.78125 85.054688 82.503906 84.640625L79.058594 83.519531C77.78125 83.109375 77.085938 81.746094 77.496094 80.46875V80.457031C77.910156 79.179688 79.273438 78.484375 80.550781 78.894531L84.007812 80.015625C85.285156 80.429688 85.980469 81.792969 85.570312 83.070312M79.058594 39.820312L82.503906 38.699219C83.78125 38.277344 85.15625 38.984375 85.570312 40.261719V40.269531C85.980469 41.546875 85.285156 42.914062 84.007812 43.328125L80.550781 44.445312C79.273438 44.859375 77.910156 44.152344 77.496094 42.875C77.417969 42.628906 77.378906 42.375 77.378906 42.128906C77.378906 41.097656 78.027344 40.152344 79.058594 39.820312M96 80.09375C96.226562 75.871094 97.207031 73.042969 98.082031 70.546875C99.03125 67.769531 99.9375 65.148438 99.859375 61.101562C99.78125 56.878906 98.71875 54.355469 97.597656 51.683594C96.578125 49.179688 95.5 46.605469 95.351562 42.597656C95.222656 38.367188 96.226562 32.210938 98.335938 27.417969C98.660156 26.671875 98.589844 25.804688 98.140625 25.109375C97.699219 24.421875 96.933594 24 96.105469 24H79.980469C59.21875 24 42.320312 40.898438 42.320312 61.671875C42.320312 82.429688 59.21875 99.34375 79.980469 99.34375H96.734375C97.53125 99.34375 98.277344 98.941406 98.730469 98.292969C99.179688 97.632812 99.296875 96.816406 99.023438 96.0625C96.707031 89.738281 95.695312 85.417969 96 80.09375"/></symbol></defs><ellipse class="ground" cx="135" cy="194" rx="97" ry="5" fill="#69291e" opacity=".055"/><g class="carry"><g class="bag" stroke="#9c3d39" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round">
  <path d="M150 61V36c0-19 29-17 29 5v27" fill="none" stroke-width="2.6"/>
  <path d="m111 65 27-11 82 19-36 7Z" fill="#fff4e5"/>
  <path d="m118 65 20-7 72 16-26 3Z" fill="#80312e" stroke="none"/>
  <path d="m184 79 36-6-6 104-30 12Z" fill="#9c3d39"/>
  <path d="m184 79 13-13 23 7-25 8-5 89 24 7-30 12Z" fill="#873430" stroke="none"/>
  <path d="m197 82-5 87 16 7" fill="none" stroke="#d9aaa7" stroke-width="1.1"/>
  <path d="m111 65 73 14v110l-84-18Z" fill="#fffaf2"/>
  <path d="m112 71 65 12v98l-70-14Z" fill="none" stroke="#f0d4c5" stroke-width="1"/>
  <path d="M130 73V43c0-23 31-20 31 3v32" fill="none" stroke-width="2.8"/>
  <path d="M133 73v-29c0-7 3-12 8-13" fill="none" stroke="#d9aaa7" stroke-width=".85"/>
  <circle cx="144" cy="124" r="21" fill="#9c3d39" stroke="none"/>
  <use href="#dumpling" x="134" y="110" width="20" height="27" color="#fffaf2" stroke="none" transform="rotate(90 144 124)"/>
</g><g class="hand" fill="#fffaf2" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <path fill="currentColor" d="M191 4 271-24 280 16 204 39Z"/>
            <path d="m181 8 17-6 12 35-17 6Z"/>
            <path d="M184 11c-12-3-19 2-27 7l-13 5c-8 3-12 7-11 12 1 4 5 5 9 2l9-6 6 8c6 7 14 5 22 1l14-6Z"/>
            <g class="fingers">
              <path d="m141 27-1 16c0 7 8 7 9 1l2-18"/>
              <path d="m150 26-1 19c0 7 8 7 9 0l1-20"/>
              <path d="m159 25-1 17c0 6 8 7 9 0l1-16"/>
            </g>
            <path d="M176 19c-10-6-18-3-22 5l-6 10c-3 5-1 8 3 8 3 0 5-3 7-6l7-9"/>
          </g></g><g class="box"><g class="box-art" stroke="#9c3d39" stroke-width="1.8" stroke-linejoin="round">
  <path d="m32 134 64-14 46 30-71 18Z" fill="#fffaf2"/>
  <path d="m39 134 56-11 38 25-61 15Z" fill="#fceadd" stroke="#edb39e" stroke-width="1"/>
  <g color="#9c3d39" stroke="none">
    <use href="#dumpling" x="60" y="131" width="13" height="18" transform="rotate(62 66 140)"/>
    <use href="#dumpling" x="82" y="127" width="13" height="18" transform="rotate(62 88 136)"/>
    <use href="#dumpling" x="90" y="143" width="13" height="18" transform="rotate(62 96 152)"/>
  </g>
  <path d="m32 134 39 24 71-8-8 29-64 15-33-24Z" fill="#fffaf2"/>
  <path d="m32 134 39 24-1 36-33-24Z" fill="#fceadd"/>
  <path d="m71 158-1 36" fill="none"/>
  <path d="m37 137 35 24 64-9" fill="none" stroke="#eaa58f" stroke-width="1"/>
  <path d="m101 155 15-2-7 32-14 3Z" fill="#9c3d39" stroke="none"/>
</g></g></svg>`;
      this.reduced = matchMedia('(prefers-reduced-motion: reduce)');
      this.onReduced = () => { if (this.reduced.matches) this.reset(); };
      this.onReplay = () => { if (!this.running) this.restart(); };
      this.onVisibility = () => {
        if (document.hidden) { this.resume = this.running; this.pause(); }
        else if (this.resume) { this.resume = false; this.play(); }
      };
    }
    connectedCallback() {
      this.owner = this.closest('button');
      for (const event of ['pointerenter', 'focus']) this.owner?.addEventListener(event, this.onReplay);
      this.reduced.addEventListener('change', this.onReduced);
      document.addEventListener('visibilitychange', this.onVisibility);
      this.visible = new IntersectionObserver(entries => {
        if (entries.some(e => e.isIntersecting)) { this.visible.disconnect(); this.startWhenLoaded(); }
      }, {threshold: .4}); this.visible.observe(this);
    }
    startWhenLoaded() { if (this.isConnected) this.restart(); }
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
        {opacity: .055, transform: 'none', offset: 0}, {opacity: .055, transform: 'none', offset: .37},
        {opacity: .025, transform: 'scale(.8)', offset: .48}, {opacity: 0, transform: 'scale(.6)', offset: .77},
        {opacity: 0, transform: 'none', offset: .86}, {opacity: .055, transform: 'none', offset: .92},
        {opacity: .055, transform: 'none', offset: 1}]);
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
      this.reset(); this.visible?.disconnect();
      this.reduced.removeEventListener('change', this.onReduced); document.removeEventListener('visibilitychange', this.onVisibility);
      for (const event of ['pointerenter', 'focus']) this.owner?.removeEventListener(event, this.onReplay);
    }
  }
  customElements.define('dl-takeaway-pickup', TakeawayPickup);
})();
