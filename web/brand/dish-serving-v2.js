// Photo-based serving choreography, not a reconstructed 360-degree food model.
(() => {
  if (typeof customElements === 'undefined' || customElements.get('dl-dish-serving')) return;
  class DishServing extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({mode:'open'});
      this.animations = [];
      this.preference = matchMedia('(prefers-reduced-motion: reduce)');
      this.onPreference = () => this.reset();
      this.onLoad = () => this.restart();
      this.onVisibility = () => {
        if (document.hidden) { this.resumeOnVisible = this.animations.some(a => a.playState === 'running'); this.pause(); }
        else if (this.resumeOnVisible) { this.resumeOnVisible = false; this.play(); }
      };
    }
    connectedCallback() {
      this.host = this.parentElement;
      this.photo = this.host.querySelector('img');
      // Playback is automatic; no visible control or invisible tap overlay.
      this.shadowRoot.innerHTML = '<style>:host{display:none;pointer-events:none}</style>';
      this.host.stopPlateMotion = () => this.reset();
      this.photo?.addEventListener('load', this.onLoad);
      this.photo?.addEventListener('error', this.onPreference);
      this.preference.addEventListener('change', this.onPreference);
      document.addEventListener('visibilitychange', this.onVisibility);
      if (this.photo?.complete && this.photo.naturalWidth) this.restart();
    }
    reset() { this.resumeOnVisible = false; this.animations.forEach(a => a.cancel()); this.animations = []; }
    restart() {
      this.reset();
      if (!this.isConnected || this.preference.matches || document.hidden || !this.photo?.naturalWidth) return;
      const timing = {duration:2800,fill:'none',easing:'linear'};
      this.animations.push(this.photo.animate([
        {offset:0,transform:'perspective(800px) translate(64px,-24px) rotate(-9deg) scale(.88)',opacity:.25,easing:'cubic-bezier(.22,.72,.18,1)'},
        {offset:.43,transform:'perspective(800px) translate(0,-8px) rotate(-1deg) scale(1)',opacity:1,easing:'cubic-bezier(.33,.05,.18,1)'},
        {offset:.57,transform:'none',opacity:1},
        {offset:1,transform:'none',opacity:1}
      ],timing));
      if (this.host.dataset.heat === 'hot') {
        this.host.querySelectorAll('.detail-steam i').forEach((wisp,index) => {
          this.animations.push(wisp.animate([
            {offset:0,transform:'translateY(12px) scaleX(.7)',opacity:0},
            {offset:.15,opacity:.6},
            {offset:1,transform:'translateY(-34px) scaleX(1.2)',opacity:0}
          ],{duration:1700,delay:1300+index*180,iterations:2,fill:'none',easing:'ease-out'}));
        });
      }
      this.dispatchEvent(new CustomEvent('motion-play'));
      Promise.all(this.animations.map(a => a.finished)).then(() => this.dispatchEvent(new CustomEvent('motion-complete'))).catch(() => {});
    }
    play() { if(this.preference.matches || document.hidden) return; this.animations.forEach(a => a.play()); }
    pause() { this.animations.forEach(a => a.pause()); }
    seek(milliseconds) { this.pause(); this.animations.forEach(a => { a.currentTime = Math.max(0,Math.min(5060,milliseconds)); }); }
    setProgress(progress) { this.seek(Math.max(0,Math.min(1,progress))*5060); }
    disconnectedCallback() {
      this.reset();
      this.photo?.removeEventListener('load',this.onLoad);
      this.photo?.removeEventListener('error',this.onPreference);
      this.preference.removeEventListener('change',this.onPreference);
      document.removeEventListener('visibilitychange',this.onVisibility);
      if(this.host) delete this.host.stopPlateMotion;
    }
  }
  customElements.define('dl-dish-serving',DishServing);
})();
