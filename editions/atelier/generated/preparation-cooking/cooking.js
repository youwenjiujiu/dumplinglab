// Semantic cooking illustrations. The enclosing button owns selection and focus.
(() => {
  const steam = `<g class="steam" style="--delay:0s"><path d="M84 65c-12-13 12-17 0-31"/></g><g class="steam" style="--delay:-1.1s"><path d="M119 55c-12-13 12-17 0-31"/></g><g class="steam" style="--delay:-2.2s"><path d="M153 64c-12-13 12-17 0-31"/></g>`;
  const food = (x,y,a=0,cls='',fried=false) => `<g transform="translate(${x} ${y}) rotate(${a})"><g class="${cls}"><use href="#${fried?'golden':'dumpling'}"/></g></g>`;
  const bubbles = (oil=false) => `<g class="${oil?'oil':'water'}">${[[65,84],[93,102],[143,98],[169,79],[119,74]].map(([x,y],i)=>`<circle class="bubble" cx="${x}" cy="${y}" r="${oil?2:3}" style="--delay:-${i*.37}s"/>`).join('')}</g>`;
  const pot = liquid => `<g stroke="#b8b3a9" stroke-width="1.1"><path d="M43 83C16 71 20 111 43 105M197 83c27-12 23 28 0 22" fill="none" stroke="#5d5a52" stroke-width="7"/><path d="M43 83v43c0 40 154 40 154 0V83" fill="url(#steel)"/><ellipse cx="120" cy="83" rx="77" ry="30" fill="#eee9df"/><ellipse cx="120" cy="83" rx="70" ry="25" fill="${liquid}" stroke="#b4ac99"/></g>`;
  const defs = `<defs>
    <linearGradient id="dough" x2=".3" y2="1"><stop stop-color="#fff7dd"/><stop offset=".65" stop-color="#e8d6ac"/><stop offset="1" stop-color="#c7ac75"/></linearGradient>
    <linearGradient id="steel" x2="0" y2="1"><stop stop-color="#f1efea"/><stop offset=".5" stop-color="#d6d1c6"/><stop offset="1" stop-color="#aaa397"/></linearGradient>
    <linearGradient id="broth" x2="0" y2="1"><stop stop-color="#e9cd72"/><stop offset="1" stop-color="#bea25a"/></linearGradient>
    <linearGradient id="ceramic" x2="0" y2="1"><stop stop-color="#f4ead8"/><stop offset="1" stop-color="#bfb09a"/></linearGradient>
    <g id="dumpling"><path d="M-22 7C-20-4-10-14 0-15 10-14 20-4 22 7 12 17-12 17-22 7Z" fill="url(#dough)" stroke="#bfa57b" stroke-width=".8"/><path d="M0-13-1 8M-5-11-8 6M5-11l5 17M-11-6-15 6M11-6l6 12" fill="none" stroke="#af956e" stroke-width="1.25" stroke-linecap="round"/><path d="M-18 8Q0 16 18 8" fill="none" stroke="#fff9e7" stroke-width="2"/></g>
    <g id="golden"><use href="#dumpling"/><path d="M-20 7Q0 15 20 7L16 12Q0 21-16 12Z" fill="#b76f2d"/><path d="m-11 12 3 1m12 1 3-1m-6 1h2" stroke="#e9b258" stroke-width="2"/></g>
    <clipPath id="pot-water"><ellipse cx="120" cy="83" rx="69" ry="24"/></clipPath>
  </defs>`;
  const scenes = {
    soup: () => `${pot('url(#broth)')}<g fill="#7f8b50"><ellipse cx="84" cy="77" rx="3" ry="1.4"/><ellipse cx="145" cy="90" rx="3" ry="1.4"/><ellipse cx="117" cy="73" rx="3" ry="1.4"/></g><ellipse class="ripple" cx="119" cy="86" rx="29" ry="9" fill="none" stroke="#f5e4a0"/><g class="ladle"><path d="m179 28-33 54" stroke="#655c4d" stroke-width="7" stroke-linecap="round"/><ellipse cx="140" cy="87" rx="20" ry="10" fill="#a69b86" stroke="#766b59"/><ellipse cx="140" cy="85" rx="17" ry="7" fill="url(#broth)"/></g><path class="drip" d="M129 65v13" stroke="#d6b963" stroke-width="2" stroke-linecap="round"/>${steam}`,
    tossed: () => `<path d="M42 103q9 61 78 62 69-1 78-62" fill="url(#ceramic)" stroke="#b9aa93"/><ellipse cx="120" cy="103" rx="78" ry="34" fill="#eee2c8" stroke="#c5b697"/><ellipse cx="120" cy="103" rx="64" ry="24" fill="#9d703d"/>${food(85,102,-25,'toss-food')}${food(150,110,18,'toss-food')}${food(117,119,5)}${food(151,87,30)}<g class="chopsticks">${food(110,91,0)}<path d="m187 20-89 73m103-68-82 72" fill="none" stroke="#70513b" stroke-width="4.5" stroke-linecap="round"/><path d="m187 20-16 13m30-8-15 13" fill="none" stroke="#974937" stroke-width="5" stroke-linecap="round"/></g>${steam}`,
    boiled: () => `${pot('#d5d4b1')}<g clip-path="url(#pot-water)">${food(79,84,-15,'bob')}${food(122,78,10,'bob later')}${food(159,89,-12,'bob')}${bubbles()}<path class="ripple" d="M62 91q20 7 40 0t40 0t35 0" fill="none" stroke="#f7f3da" stroke-width="1.5"/></g>${steam}`,
    fried: () => `<path d="m184 105 43 25" stroke="#343430" stroke-width="13" stroke-linecap="round"/><path d="m211 121 14 8" stroke="#6e6b60" stroke-width="4" stroke-linecap="round"/><path d="M36 97v10c0 44 168 44 168 0V97" fill="#484941"/><ellipse cx="120" cy="97" rx="84" ry="40" fill="#656358" stroke="#393c35" stroke-width="3"/><ellipse cx="120" cy="97" rx="76" ry="33" fill="#4e5147"/>${food(81,87,-18,'',true)}${food(124,77,8,'',true)}${food(159,98,32,'',true)}${food(116,113,0,'',true)}${bubbles(true)}${steam}`
  };
  class CookingMotion extends (globalThis.HTMLElement || class {}) {
    constructor(){super();this.attachShadow?.({mode:'open'});this.visible=false;this.manualPause=false;this.onVisibility=()=>this.sync();}
    connectedCallback(){
      const mode=scenes[this.getAttribute('mode')]?this.getAttribute('mode'):'soup';
      this.shadowRoot.innerHTML=`<style>
        :host{display:block;width:100%;height:100%}svg{display:block;width:100%;height:100%;overflow:visible}
        .steam{fill:none;stroke:#a9a59b;stroke-width:2;stroke-linecap:round;opacity:.42;animation:steam 3.2s ease-in-out infinite;animation-delay:var(--delay)}
        .bubble{fill:none;stroke:#f9f1cd;stroke-width:1.3;transform-box:fill-box;transform-origin:center;animation:bubble 2s ease-out infinite;animation-delay:var(--delay)}
        .oil .bubble{stroke:#eac77c;animation-duration:1.3s}.bob{animation:bob 2.8s ease-in-out infinite}.later{animation-delay:-1.2s}
        .ripple{transform-box:fill-box;transform-origin:center;animation:ripple 3s ease-in-out infinite}
        .ladle{transform-origin:176px 31px;animation:scoop 4.6s ease-in-out infinite}.drip{animation:drip 4.6s ease-in-out infinite}
        .chopsticks{transform-origin:188px 23px;animation:toss 4.2s ease-in-out infinite}.toss-food{animation:bob 4.2s ease-in-out infinite}
        svg *{animation-play-state:paused}:host([data-playing="true"]) svg *{animation-play-state:running}
        @keyframes steam{0%{transform:translateY(6px);opacity:0}25%{opacity:.42}80%{opacity:.12}100%{transform:translateY(-18px);opacity:0}}
        @keyframes bubble{0%,25%{transform:scale(.3);opacity:0}45%{opacity:.7}100%{transform:scale(1.6);opacity:0}}
        @keyframes bob{0%,100%{transform:translateY(1px) rotate(-2deg)}50%{transform:translateY(-2px) rotate(2deg)}}
        @keyframes ripple{0%,100%{transform:scaleX(.9);opacity:.25}50%{transform:scaleX(1.05);opacity:.65}}
        @keyframes scoop{0%,15%,100%{transform:none}45%,65%{transform:translate(-3px,-11px) rotate(9deg)}}
        @keyframes drip{0%,45%,75%,100%{opacity:0;transform:translateY(0)}50%{opacity:.8}70%{opacity:0;transform:translateY(21px)}}
        @keyframes toss{0%,15%,100%{transform:none}45%{transform:translate(-6px,-14px) rotate(-9deg)}70%{transform:translate(4px,-3px) rotate(5deg)}}
        @media(prefers-reduced-motion:reduce){svg *{animation:none!important}.steam{opacity:.32}.drip{opacity:0}}
      </style><svg viewBox="0 0 240 190" aria-hidden="true">${defs}<ellipse cx="120" cy="168" rx="70" ry="6" fill="#403b32" opacity=".055"/>${scenes[mode]()}</svg>`;
      this.preference=matchMedia('(prefers-reduced-motion: reduce)');this.preference.addEventListener?.('change',this.onVisibility);
      document.addEventListener('visibilitychange',this.onVisibility);
      if(globalThis.IntersectionObserver){this.observer=new IntersectionObserver(es=>{this.visible=es[0].isIntersecting;this.sync();});this.observer.observe(this);}else this.visible=true;
      this.sync();this.emit('motion-ready');
    }
    disconnectedCallback(){this.observer?.disconnect();this.preference?.removeEventListener?.('change',this.onVisibility);document.removeEventListener('visibilitychange',this.onVisibility);this.pause();}
    animations(){return this.shadowRoot?.querySelector('svg')?.getAnimations?.({subtree:true})||[];}
    sync(){this.dataset.playing=String(this.visible&&!document.hidden&&!this.preference?.matches&&!this.manualPause);}
    emit(name){this.dispatchEvent(new Event(name,{bubbles:true,composed:true}));}
    pause(){this.manualPause=true;this.sync();this.animations().forEach(a=>a.pause());this.emit('motion-pause');}
    play(){this.manualPause=false;this.sync();if(this.dataset.playing==='true')this.animations().forEach(a=>a.play());this.emit('motion-play');}
    restart(){this.animations().forEach(a=>a.currentTime=0);this.play();}
    seek(ms){this.pause();this.animations().forEach(a=>a.currentTime=Math.max(0,ms));this.emit('motion-seek');}
    setProgress(p){this.seek(Math.max(0,Math.min(1,p))*4600);}
  }
  if(globalThis.customElements&&!customElements.get('dl-preparation-motion'))customElements.define('dl-preparation-motion',CookingMotion);
})();
