// Original approved artwork split into bag/box layers, with a flat glove hand.
// One physical story: pack the box, grip the handle, lift and carry away.
(() => {
  if(typeof customElements==='undefined'||customElements.get('dl-takeaway-pickup'))return;
  class TakeawayPickup extends HTMLElement {
    constructor(){
      super();this.animations=[];this.running=false;this.duration=3600;
      this.attachShadow({mode:'open'}).innerHTML=`<style>
      :host{display:block;position:relative;width:100%;aspect-ratio:260/220;contain:layout style;pointer-events:none}
      *{box-sizing:border-box}.stage{position:absolute;left:0;top:0;width:260px;height:220px;transform-origin:0 0;overflow:hidden;color:#e51b00}
      .ground{position:absolute;left:38px;top:183px;width:194px;height:14px;border-radius:50%;background:#28221b0b}
      .carry,.box{position:absolute;inset:0;transform-origin:150px 35px}.carry{z-index:2}.box{z-index:3}
      img{display:block;width:260px;height:220px;max-width:none;pointer-events:none}
      .hand{position:absolute;left:133px;top:13px;width:36px;height:42px;opacity:0;z-index:2}
      .sleeve{position:absolute;left:8px;top:-42px;width:27px;height:49px;background:currentColor;transform:rotate(-7deg);border-radius:0 0 3px 3px}
      .cuff{position:absolute;left:6px;top:0;width:29px;height:10px;background:white;border:2px solid currentColor;transform:rotate(-7deg);border-radius:2px}
      .palm{position:absolute;left:7px;top:8px;width:25px;height:22px;border:2px solid currentColor;border-radius:5px 6px 9px 10px;background:white}
      .thumb{position:absolute;left:1px;top:13px;width:13px;height:12px;border:2px solid currentColor;border-radius:8px 4px 6px 8px;background:white;transform:rotate(-28deg);z-index:2}
      .fingers{position:absolute;left:11px;top:22px;width:23px;height:13px;transform-origin:top}
      .fingers i{position:absolute;top:0;width:7px;height:12px;border:1.5px solid currentColor;border-radius:2px 2px 5px 5px;background:white}
      .fingers i:nth-child(2){left:5px;height:13px}.fingers i:nth-child(3){left:10px;height:12px}.fingers i:nth-child(4){left:15px;height:10px}
      </style><div class="stage" aria-hidden="true"><div class="ground"></div><div class="carry"><img src="/brand/entry-takeaway-bag-v3.svg" alt=""><div class="hand"><div class="sleeve"></div><div class="cuff"></div><div class="palm"></div><div class="thumb"></div><div class="fingers"><i></i><i></i><i></i><i></i></div></div></div><div class="box"><img src="/brand/entry-takeaway-box-v3.svg" alt=""></div></div>`;
      this.reduced=matchMedia('(prefers-reduced-motion: reduce)');
      this.onReduced=()=>{if(this.reduced.matches)this.reset();};
      this.onReplay=()=>{if(!this.running)this.restart();};
      this.onVisibility=()=>{if(document.hidden){this.resume=this.running;this.pause();}else if(this.resume){this.resume=false;this.play();}};
    }
    connectedCallback(){
      this.resize=new ResizeObserver(()=>{this.shadowRoot.querySelector('.stage').style.transform=`scale(${this.clientWidth/260})`;});this.resize.observe(this);
      this.owner=this.closest('button');for(const event of ['pointerenter','focus','click'])this.owner?.addEventListener(event,this.onReplay);
      this.reduced.addEventListener('change',this.onReduced);document.addEventListener('visibilitychange',this.onVisibility);
      this.visible=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){this.visible.disconnect();this.startWhenLoaded();}},{threshold:.4});this.visible.observe(this);
    }
    async startWhenLoaded(){
      await Promise.all([...this.shadowRoot.querySelectorAll('img')].map(img=>img.decode().catch(()=>{})));
      if(this.isConnected)this.restart();
    }
    reset(){this.animations.forEach(a=>a.cancel());this.animations=[];this.running=false;}
    track(selector,frames){this.animations.push(this.shadowRoot.querySelector(selector).animate(frames.map(frame=>({...frame,easing:'cubic-bezier(.22,.72,.18,1)'})),{duration:this.duration,easing:'linear',fill:'both',iterations:1}));}
    restart(){
      this.reset();if(this.reduced.matches||document.hidden)return;this.running=true;
      this.track('.box',[
        {transform:'none',opacity:1,offset:0},{transform:'translate(45px,-103px) scale(.65)',opacity:1,offset:.13},
        {transform:'translate(70px,-25px) scale(.65)',opacity:0,offset:.25},{transform:'translate(70px,-25px) scale(.65)',opacity:0,offset:.84},
        {transform:'none',opacity:0,offset:.9},{transform:'none',opacity:1,offset:1}]);
      this.track('.hand',[
        {transform:'translateY(-75px)',opacity:0,offset:0},{transform:'translateY(-75px)',opacity:0,offset:.15},
        {transform:'translateY(0)',opacity:1,offset:.32},{transform:'none',opacity:1,offset:.78},
        {transform:'translateY(-75px)',opacity:0,offset:.84},{transform:'translateY(-75px)',opacity:0,offset:1}]);
      this.track('.fingers',[
        {transform:'scaleY(1.15)',offset:0},{transform:'scaleY(1.15)',offset:.32},
        {transform:'scaleY(.7)',offset:.38},{transform:'scaleY(.7)',offset:1}]);
      this.track('.carry',[
        {transform:'none',opacity:1,offset:0},{transform:'none',opacity:1,offset:.39},
        {transform:'translate(0,-16px) rotate(-3deg)',opacity:1,offset:.51},
        {transform:'translate(168px,-60px) rotate(5deg)',opacity:1,offset:.77},
        {transform:'translate(168px,-60px) rotate(5deg)',opacity:0,offset:.82},
        {transform:'none',opacity:0,offset:.88},{transform:'none',opacity:1,offset:1}]);
      this.track('.ground',[{opacity:1,offset:0},{opacity:1,offset:.39},{opacity:.1,offset:.77},{opacity:.1,offset:.88},{opacity:1,offset:1}]);
      const active=this.animations;
      Promise.all(active.map(a=>a.finished)).then(()=>{if(this.animations===active){this.running=false;this.dispatchEvent(new CustomEvent('motion-complete',{bubbles:true,composed:true}));}}).catch(()=>{});
    }
    pause(){this.animations.forEach(a=>a.pause());this.running=false;}
    play(){if(this.reduced.matches)return;if(!this.animations.length){this.restart();return;}this.animations.forEach(a=>a.play());this.running=true;}
    seek(ms){if(!this.animations.length)this.restart();this.animations.forEach(a=>{a.pause();a.currentTime=Math.max(0,Math.min(this.duration,ms));});this.running=false;}
    setProgress(progress){this.seek(progress*this.duration);}
    disconnectedCallback(){this.reset();this.resize?.disconnect();this.visible?.disconnect();this.reduced.removeEventListener('change',this.onReduced);document.removeEventListener('visibilitychange',this.onVisibility);for(const event of ['pointerenter','focus','click'])this.owner?.removeEventListener(event,this.onReplay);}
  }
  customElements.define('dl-takeaway-pickup',TakeawayPickup);
})();
