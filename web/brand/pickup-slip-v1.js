// Inspired by the physical-paper interaction at github.com/jal-co/boarding-pass.
// Independent vanilla implementation; no external fonts, airline assets or barcode.
// This changes presentation only. The slot retains the real server-issued QR code.
(() => {
  if(typeof customElements==='undefined'||customElements.get('dl-pickup-slip'))return;
  class PickupSlip extends HTMLElement {
    constructor(){
      super();this.progress=0;this.drag=null;this.detached=false;
      this.attachShadow({mode:'open'}).innerHTML=`<style>
      :host{display:block;margin:0 -20px;background:#fcf9f6;overflow:hidden;--tear:0;--shift:0px;--turn:0deg;color:#983f32}
      .paper{position:relative;background:#fffdf8;transform:translateX(var(--shift)) rotate(var(--turn));transform-origin:left top;transition:transform 240ms cubic-bezier(.22,.72,.18,1);box-shadow:0 3px 9px #37221910}
      .dragging{transition:none}
      .seam{height:12px;background:radial-gradient(circle at 5px 0,transparent 4px,#fffdf8 4.5px) 0 0/10px 12px repeat-x}
      .bridges{position:absolute;top:0;left:0;right:0;height:2px;background:repeating-linear-gradient(90deg,#cabaa7 0 3px,transparent 3px 10px);clip-path:inset(0 0 0 calc(var(--tear)*100%))}
      button{font-family:inherit;font-size:12px;font-weight:500;line-height:1.4;width:100%;min-height:44px;padding:10px 20px;display:flex;justify-content:space-between;gap:12px;border:0;background:transparent;color:inherit;cursor:grab;touch-action:pan-y;text-align:left}
      button:focus-visible{outline:2px solid currentColor;outline-offset:-3px}
      .dragging button{cursor:grabbing}
      .arrow{font-size:19px;line-height:1}
      .hint{margin:0;padding:0 20px 12px;color:#8d8276;font:11px/1.5 sans-serif}
      ::slotted(.pickup-code){margin-inline:0!important;background:transparent!important}
      @media(prefers-reduced-motion:reduce){.paper{transition:none;transform:none!important}}
      </style><div class="paper"><div class="seam" aria-hidden="true"></div><div class="bridges" aria-hidden="true"></div><button type="button" aria-pressed="false"><span></span><span class="arrow" aria-hidden="true">→</span></button><slot></slot><p class="hint"></p></div>`;
      this.paper=this.shadowRoot.querySelector('.paper');this.button=this.shadowRoot.querySelector('button');
      this.button.addEventListener('pointerdown',e=>{
        if(e.button!==0 || this.detached)return;
        this.drag={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};
        this.button.setPointerCapture(e.pointerId);this.paper.classList.add('dragging');
      });
      this.button.addEventListener('pointermove',e=>{
        if(!this.drag||this.drag.id!==e.pointerId)return;
        const dx=e.clientX-this.drag.x,dy=e.clientY-this.drag.y;
        if(Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>8){this.end(true);return;}
        this.drag.moved ||= Math.abs(dx)>6;
        this.paint(Math.max(this.progress,Math.min(1,Math.max(0,dx)/90)));
      });
      this.button.addEventListener('pointerup',()=>this.end(false));
      this.button.addEventListener('pointercancel',()=>this.end(true));
      this.button.addEventListener('lostpointercapture',()=>{if(this.drag)this.end(true);});
      this.button.addEventListener('click',e=>{
        if(this.skipClick&&e.detail!==0){this.skipClick=false;return;}
        this.setDetached(!this.detached);
      });
      this.button.addEventListener('keydown',e=>{
        if(e.key==='ArrowRight'&&!this.detached){e.preventDefault();this.paint(Math.min(1,this.progress+.2));if(this.progress>=1)this.setDetached(true);}
        if(e.key==='Escape'||e.key==='ArrowLeft'){e.preventDefault();e.stopPropagation();this.setDetached(false);}
      });
    }
    connectedCallback(){this.updateCopy();}
    get english(){return this.getAttribute('lang')==='en';}
    updateCopy(){
      this.button.querySelector('span').textContent=this.detached?(this.english?'Pickup slip · put back':'取餐联已展开 · 收好'):(this.english?'Pull right or tap to unfold':'向右拉开取餐联，也可轻点');
      this.button.setAttribute('aria-pressed',String(this.detached));
      this.shadowRoot.querySelector('.hint').textContent=this.english?'Opening this slip does not collect the order.':'展开凭证不会完成取餐，请由店员核销。';
    }
    paint(progress){this.progress=progress;this.style.setProperty('--tear',progress);this.style.setProperty('--shift',`${progress*7}px`);this.style.setProperty('--turn',`${progress*1.4}deg`);}
    setDetached(value){this.detached=value;this.paint(value?1:0);this.style.setProperty('--turn','0deg');this.updateCopy();}
    end(cancelled){
      const drag=this.drag;if(!drag)return;this.drag=null;this.paper.classList.remove('dragging');
      this.skipClick=drag.moved;
      if(drag.moved)this.setDetached(!cancelled&&this.progress>=.8);
      if(this.button.hasPointerCapture(drag.id))this.button.releasePointerCapture(drag.id);
    }
  }
  customElements.define('dl-pickup-slip',PickupSlip);
})();
