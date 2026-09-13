// Refined native vector artwork; original brand symbol preserved.
// Custom semantic choreography; only the existing button's visual layer moves.
(() => {
  if (typeof customElements === 'undefined' || customElements.get('dl-dinein-serving')) return;
  class DineinServing extends HTMLElement {
    constructor() {
      super(); this.animations = []; this.running = false; this.duration = 5200;
      this.attachShadow({mode: 'open'}).innerHTML = `<style>
        :host{display:block;width:100%;aspect-ratio:260/220;contain:layout style;pointer-events:none}
        svg{display:block;width:100%;height:auto;overflow:hidden}
        .hand,.plate,.steam{transform-box:view-box}
        .plate{transform-origin:120px 131px}.hand{opacity:0}
        .steam{opacity:0}
      </style><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 220" shape-rendering="geometricPrecision">
<defs><symbol id="dumpling" viewBox="42 24 58 76"><path fill="currentColor" fill-rule="nonzero" d="M86.1875 63.390625C85.746094 63.820312 85.136719 64.097656 84.46875 64.097656H81.59375C80.246094 64.097656 79.15625 63.015625 79.15625 61.671875C79.15625 60.992188 79.429688 60.382812 79.875 59.953125C80.304688 59.511719 80.914062 59.234375 81.59375 59.234375H84.46875C85.816406 59.234375 86.90625 60.324219 86.90625 61.671875C86.90625 62.347656 86.628906 62.945312 86.1875 63.390625M85.570312 83.070312V83.082031C85.15625 84.355469 83.78125 85.054688 82.503906 84.640625L79.058594 83.519531C77.78125 83.109375 77.085938 81.746094 77.496094 80.46875V80.457031C77.910156 79.179688 79.273438 78.484375 80.550781 78.894531L84.007812 80.015625C85.285156 80.429688 85.980469 81.792969 85.570312 83.070312M79.058594 39.820312L82.503906 38.699219C83.78125 38.277344 85.15625 38.984375 85.570312 40.261719V40.269531C85.980469 41.546875 85.285156 42.914062 84.007812 43.328125L80.550781 44.445312C79.273438 44.859375 77.910156 44.152344 77.496094 42.875C77.417969 42.628906 77.378906 42.375 77.378906 42.128906C77.378906 41.097656 78.027344 40.152344 79.058594 39.820312M96 80.09375C96.226562 75.871094 97.207031 73.042969 98.082031 70.546875C99.03125 67.769531 99.9375 65.148438 99.859375 61.101562C99.78125 56.878906 98.71875 54.355469 97.597656 51.683594C96.578125 49.179688 95.5 46.605469 95.351562 42.597656C95.222656 38.367188 96.226562 32.210938 98.335938 27.417969C98.660156 26.671875 98.589844 25.804688 98.140625 25.109375C97.699219 24.421875 96.933594 24 96.105469 24H79.980469C59.21875 24 42.320312 40.898438 42.320312 61.671875C42.320312 82.429688 59.21875 99.34375 79.980469 99.34375H96.734375C97.53125 99.34375 98.277344 98.941406 98.730469 98.292969C99.179688 97.632812 99.296875 96.816406 99.023438 96.0625C96.707031 89.738281 95.695312 85.417969 96 80.09375"/></symbol></defs>
<g transform="translate(0 20)"><ellipse cx="130" cy="196" rx="100" ry="5" fill="#69291e" opacity=".055"/>
<g stroke="#e51b00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <g class="chair-left">
    <path d="m32 140-4 48m42-46 8 46" fill="none"/>
    <path d="m30 137-3-57c-1-16 8-26 21-26s22 9 23 24l4 54" fill="#fff"/>
    <path d="m36 125-3-45c-1-12 5-19 15-19 9 0 16 7 17 18l3 46" fill="none" stroke-width="1.4"/>
    <path d="m29 135 41-5 17 11v6l-43 7-15-11Z" fill="#bd2a19"/>
    <path d="m29 135 41-5 17 11-43 7Z" fill="#e51b00"/>
    <path d="m32 136 38-4 13 8" fill="none" stroke="#fff" stroke-width="1.2" opacity=".65"/>
  </g>
  <g class="chair-right">
    <path d="m228 140 4 48m-42-46-8 46" fill="none"/>
    <path d="m230 137 3-57c1-16-8-26-21-26s-22 9-23 24l-4 54" fill="#fff"/>
    <path d="m224 125 3-45c1-12-5-19-15-19-9 0-16 7-17 18l-3 46" fill="none" stroke-width="1.4"/>
    <path d="m231 135-41-5-17 11v6l43 7 15-11Z" fill="#bd2a19"/>
    <path d="m231 135-41-5-17 11 43 7Z" fill="#e51b00"/>
    <path d="m228 136-38-4-13 8" fill="none" stroke="#fff" stroke-width="1.2" opacity=".65"/>
  </g>
</g>
<g class="table">
  <ellipse cx="130" cy="190" rx="32" ry="6" fill="#bd2a19"/>
  <ellipse cx="130" cy="187.5" rx="32" ry="6" fill="#e51b00"/>
  <path d="M125 127h10v58c0 3-10 3-10 0Z" fill="#e51b00"/>
  <path d="M127 133v49" stroke="#ffab91" stroke-width="1.4"/>
  <path d="M58 104v7c0 17 32 30 72 30s72-13 72-30v-7Z" fill="#bd2a19"/>
  <ellipse cx="130" cy="104" rx="72" ry="29" fill="#fff" stroke="#e51b00" stroke-width="1.8"/>
  <ellipse cx="130" cy="104" rx="66" ry="24" fill="#e51b00"/>
  <path d="M69 113c12 11 38 18 61 18s50-7 61-18" fill="none" stroke="#ffb6a3" stroke-width="1" opacity=".65"/>
</g>
</g><g transform="translate(40 25) scale(.7)"><g class="hand" fill="#fff" stroke="#e51b00" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round">
 <path d="M235 133 281 143 279 175 227 161Z" fill="#e51b00"/>
 <path d="m226 132 13 3-7 30-13-5Z"/>
 <path d="m226 137-23-7c-8-3-16-2-24 3l-24 11-27-2c-6 0-7 7-1 10l33 12c7 3 15 3 22 1l40-11Z"/>
 <path d="m129 149 31 8c5 1 10 0 15-2m-34-7 22 5m13-15-11 7"/>
</g>
<g class="plate">
 <path d="M43 133c3 23 31 35 77 35s74-12 77-35" fill="#e51b00"/>
 <ellipse cx="120" cy="131" rx="77" ry="27" fill="#fff" stroke="#e51b00" stroke-width="2.2"/>
 <ellipse cx="120" cy="131" rx="67" ry="20" fill="none" stroke="#e51b00" stroke-width="1.2"/>
 <g color="#e51b00">
  <use href="#dumpling" x="74" y="113" width="20" height="27" transform="rotate(65 84 127)"/>
  <use href="#dumpling" x="108" y="107" width="20" height="27" transform="rotate(75 118 121)"/>
  <use href="#dumpling" x="141" y="117" width="20" height="27" transform="rotate(95 151 131)"/>
  <use href="#dumpling" x="108" y="130" width="20" height="27" transform="rotate(75 118 144)"/>
 </g>
</g>
<g fill="none" stroke="#e51b00" stroke-width="2" stroke-linecap="round">
 <path class="steam s1" d="M96 99c-8-10 7-16 0-26"/>
 <path class="steam s2" d="M120 95c-8-10 7-16 0-26"/>
 <path class="steam s3" d="M143 99c-8-10 7-16 0-26"/>
</g></g></svg>
`;
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
        if (entries.some(e => e.isIntersecting)) { this.visible.disconnect(); if(this.isConnected) this.restart(); }
      }, {threshold: .4}); this.visible.observe(this);
    }
    reset() { this.animations.forEach(a => a.cancel()); this.animations = []; this.running = false; this.resume = false; }
    track(selector, frames) {
      this.animations.push(this.shadowRoot.querySelector(selector).animate(
        frames.map(frame => ({...frame, easing: 'cubic-bezier(.22,.72,.18,1)'})),
        {duration: this.duration, easing: 'linear', fill: 'both', iterations: 1}));
    }
    restart() {
      this.reset(); if (this.reduced.matches || document.hidden) return; this.running = true;
      const arrival = [
        {transform: 'translate(64px,-24px)', opacity: 1, offset: 0},
        {transform: 'none', opacity: 1, offset: .34}
      ];
      this.track('.plate', [...arrival, {transform: 'none', opacity: 1, offset: 1}]);
      this.track('.hand', [...arrival,
        {transform: 'none', opacity: 1, offset: .4},
        {transform: 'translate(9px,8px)', opacity: 1, offset: .47},
        {transform: 'translate(110px,22px)', opacity: 1, offset: .64},
        {transform: 'translate(110px,22px)', opacity: 0, offset: .66},
        {transform: 'translate(110px,22px)', opacity: 0, offset: 1}
      ]);
      for (const [selector, stagger] of [['.s1', 0], ['.s2', .045], ['.s3', .09]]) {
        this.track(selector, [
          {transform: 'translateY(7px)', opacity: 0, offset: 0},
          {transform: 'translateY(7px)', opacity: 0, offset: .4 + stagger},
          {transform: 'translateY(0)', opacity: .72, offset: .47 + stagger},
          {transform: 'translateY(-18px)', opacity: 0, offset: .60 + stagger},
          {transform: 'translateY(7px)', opacity: 0, offset: .61 + stagger},
          {transform: 'translateY(0)', opacity: .72, offset: .69 + stagger},
          {transform: 'translateY(-18px)', opacity: 0, offset: .82 + stagger},
          {transform: 'translateY(-18px)', opacity: 0, offset: 1}]);
      }
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
  customElements.define('dl-dinein-serving', DineinServing);
})();
