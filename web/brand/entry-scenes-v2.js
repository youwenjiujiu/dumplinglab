// Custom semantic scene, derived from the project-local motion packaging baseline.
// The native surrounding button owns all navigation and accessibility.
(() => {
  if(typeof customElements==='undefined'||customElements.get('dl-entry-scene-v2'))return;
  const CSS=`
    :host{display:block;width:100%;aspect-ratio:260/220;position:relative;contain:layout style;pointer-events:none;--red:#e51b00;--cream:#fef6e6;--dark:#a62412}
    *{box-sizing:border-box}i{display:block;position:absolute;font-style:normal}
    .stage{width:260px;height:220px;position:absolute;left:0;top:0;transform-origin:0 0;overflow:hidden}
    .halo{left:18px;top:25px;width:224px;height:171px;border-radius:50%;background:radial-gradient(ellipse,#fef6e6 5%,#fffaf1 54%,#fff0 73%)}
    .ground{left:28px;top:185px;width:205px;height:13px;border-radius:50%;background:radial-gradient(ellipse,#53341a1c,transparent 70%)}
    .chair{width:43px;height:116px;top:75px;z-index:1}.chair.left{left:28px}.chair.right{left:190px}
    .chair .back{left:3px;top:0;width:36px;height:72px;border:3px solid #aaaea9;border-radius:21px 21px 4px 4px;box-shadow:inset 1px 0 white,1px 0 white;background:linear-gradient(105deg,#e6bc81,#f1d6a9 55%,#d8a263);background-clip:padding-box}
    .chair .seat{left:0;top:61px;width:43px;height:13px;border-radius:50%;background:linear-gradient(#f0d7b1,#c98944);box-shadow:0 3px 0 #a9aaa5}
    .chair .leg{top:72px;width:3px;height:42px;background:linear-gradient(90deg,#808882,#e5e8e2,#9da39c);transform-origin:top}
    .chair .leg.a{left:5px;transform:rotate(7deg)}.chair .leg.b{right:5px;transform:rotate(-7deg)}
    .table{left:64px;top:102px;width:135px;height:92px;z-index:2}
    .table .stem{left:63px;top:24px;width:9px;height:54px;background:linear-gradient(90deg,#979f96,#f3f4ed 40%,#a6ada4)}
    .table .foot{left:34px;top:79px;width:70px;height:11px;border-radius:50%;background:linear-gradient(#d5d9d0,#919a90);box-shadow:0 2px 0 #737d72}
    .table .top{inset:0 0 auto;height:43px;border-radius:50%;background:linear-gradient(150deg,#ff6b47,var(--red) 56%,#c3331c);border:3px solid #f7eee0;box-shadow:0 3px 0 #acb2a9,0 5px 0 #919b90}
    .plate{left:97px;top:109px;width:66px;height:25px;z-index:3;border-radius:50%;background:radial-gradient(ellipse,#f2e2c4 45%,#fffef7 48%,#fffdf4 66%,#e1c6a6 72%);box-shadow:0 3px 0 #dec5a7}
    .dumpling{width:17px;height:16px;background:linear-gradient(145deg,#fceac8,#e5b56a);mask:url('/brand/dumpling-symbol.svg') center/contain no-repeat;filter:drop-shadow(0 1px 0 #966526)}
    .plate .dumpling:nth-child(1){left:9px;top:2px;rotate:-30deg}.plate .dumpling:nth-child(2){left:25px;top:0;rotate:5deg}.plate .dumpling:nth-child(3){left:40px;top:3px;rotate:30deg}
    .sticks{left:168px;top:103px;width:3px;height:33px;background:#fff4d9;rotate:-38deg;z-index:3;box-shadow:5px 0 0 #fff4d9}
    .steam{left:111px;top:81px;z-index:4;width:43px;height:28px;opacity:0}
    .steam i{width:7px;height:24px;border-left:1.5px solid #bb9a73;border-radius:50%;left:0}.steam i:nth-child(2){left:16px;top:-4px}.steam i:nth-child(3){left:32px;top:2px}
    .bag{position:absolute;left:136px;top:74px;width:82px;height:117px;z-index:3}
    .bag-back{inset:0;background:#dc3d25;clip-path:polygon(0 0,80% 0,100% 10%,100% 93%,80% 100%,0 90%)}
    .handle{left:19px;top:-32px;width:29px;height:43px;border:3px solid var(--red);border-radius:16px 16px 0 0;border-bottom:0;z-index:4;box-shadow:inset 1px 0 #fff6}
    .handle.back{left:34px;top:-36px;border-color:#be3821;z-index:0}
    .bag-front{inset:7px 15px 0 0;background:linear-gradient(115deg,#fffaf0,#f1dbb8);border:1px solid #d8b58b;box-shadow:inset -4px 0 0 #e1c19844;z-index:3}
    .bag-front:before{content:'';position:absolute;left:29px;top:-1px;width:8px;height:17px;background:var(--red)}
    .bag-front img{position:absolute;width:47px;height:48px;left:10px;top:35px;object-fit:contain}
    .bag-side{right:0;top:0;width:16px;height:117px;background:linear-gradient(90deg,#ef5738,#b72c17);clip-path:polygon(0 0,100% 10%,100% 93%,0 100%);z-index:4}
    .box{position:absolute;left:39px;top:133px;width:102px;height:59px;z-index:2;opacity:0}
    .box-base{inset:16px 0 0;background:linear-gradient(110deg,#fff5e1 0 72%,#e74127 73%);clip-path:polygon(0 0,100% 0,91% 76%,23% 100%,4% 58%);border-bottom:1px solid #dabe93}
    .box-top,.lid{left:0;top:0;width:102px;height:34px;clip-path:polygon(0 17%,75% 0,100% 57%,24% 100%)}
    .box-top{background:#ddba8c}.lid{background:linear-gradient(135deg,#fff9ea 0 70%,#f0d4a8);transform-origin:70% 0;z-index:4;box-shadow:inset 0 -2px 0 #cb9d6d}
    .lid:after{content:'';position:absolute;left:45px;top:7px;width:19px;height:17px;background:var(--red);mask:url('/brand/dumpling-symbol.svg') center/contain no-repeat}
    .box-food{left:18px;top:3px;width:65px;height:22px;z-index:3}.box-food .dumpling:nth-child(1){left:0;top:5px}.box-food .dumpling:nth-child(2){left:19px;top:0}.box-food .dumpling:nth-child(3){left:38px;top:5px}
  `;
  const food='<i class="dumpling"></i><i class="dumpling"></i><i class="dumpling"></i>';
  const chair=side=>`<i class="chair ${side}"><i class="back"></i><i class="seat"></i><i class="leg a"></i><i class="leg b"></i></i>`;
  class EntryScene extends HTMLElement {
    constructor(){
      super();this.animations=[];this.running=false;this.didEnter=false;
      this.attachShadow({mode:'open'});
      this.reduced=matchMedia('(prefers-reduced-motion: reduce)');
      this.onReduce=()=>{if(this.reduced.matches)this.reset();};
      this.onHover=()=>{if(!this.running)this.restart();};
      this.onVisibility=()=>{if(document.hidden){this.resumeOnVisible=this.running;this.pause();}else if(this.resumeOnVisible){this.resumeOnVisible=false;this.play();}};
    }
    connectedCallback(){
      this.mode=this.getAttribute('mode')==='takeaway'?'takeaway':'dinein';
      this.duration=this.mode==='dinein'?2400:2700;
      const scene=this.mode==='dinein'?`${chair('left')}${chair('right')}<i class="table"><i class="stem"></i><i class="foot"></i><i class="top"></i></i><i class="plate">${food}</i><i class="sticks"></i><i class="steam"><i></i><i></i><i></i></i>`:`<i class="bag"><i class="handle back"></i><i class="bag-back"></i><i class="bag-front"><img src="/brand/order-packaging-lockup.svg" alt=""></i><i class="bag-side"></i><i class="handle"></i></i><i class="box"><i class="box-base"></i><i class="box-top"></i><i class="box-food">${food}</i><i class="lid"></i></i>`;
      this.shadowRoot.innerHTML=`<style>${CSS}</style><div class="stage" aria-hidden="true"><i class="halo"></i><i class="ground"></i>${scene}</div>`;
      this.stage=this.shadowRoot.querySelector('.stage');
      this.resize=new ResizeObserver(()=>{this.stage.style.transform=`scale(${this.clientWidth/260})`;});this.resize.observe(this);
      this.owner=this.closest('button');
      for(const event of ['pointerenter','focus','click'])this.owner?.addEventListener(event,this.onHover);
      this.reduced.addEventListener('change',this.onReduce);document.addEventListener('visibilitychange',this.onVisibility);
      this.visible=new IntersectionObserver(entries=>{
        if(entries.some(e=>e.isIntersecting)&&!this.didEnter){this.didEnter=true;this.restart();this.visible.disconnect();}
      },{threshold:.4});this.visible.observe(this);
      this.emit('motion-ready');
    }
    emit(name){this.dispatchEvent(new CustomEvent(name,{bubbles:true,composed:true}));}
    reset(){this.animations.forEach(a=>a.cancel());this.animations=[];this.running=false;}
    track(selector,frames,delay,duration){
      const node=this.shadowRoot.querySelector(selector);
      if(node)this.animations.push(node.animate(frames,{delay,duration,easing:'cubic-bezier(.22,.72,.18,1)',fill:'both',iterations:1}));
    }
    restart(){
      this.reset();if(this.reduced.matches||document.hidden)return;
      this.running=true;
      if(this.mode==='dinein'){
        this.track('.chair.left',[{transform:'translateX(-23px)'},{transform:'none'}],0,650);
        this.track('.chair.right',[{transform:'translateX(23px)'},{transform:'none'}],90,650);
        this.track('.plate',[{transform:'translate(8px,-28px)',opacity:0},{transform:'none',opacity:1}],450,650);
        this.track('.steam',[{opacity:0,transform:'translateY(5px)'},{opacity:.8,offset:.25},{opacity:0,transform:'translateY(-12px)'}],1100,1100);
      }else{
        this.track('.box',[{opacity:1,transform:'none',offset:0},{opacity:1,transform:'none',offset:.46},{opacity:1,transform:'translate(90px,-103px) scale(.62)',offset:.64},{opacity:0,transform:'translate(98px,-13px) scale(.62)',offset:.77},{opacity:0,transform:'translate(98px,-13px) scale(.62)',offset:1}],0,2700);
        this.track('.box-food',[{transform:'translateY(-18px)',opacity:0},{transform:'none',opacity:1}],100,520);
        this.track('.lid',[{transform:'perspective(200px) rotateX(110deg)'},{transform:'perspective(200px) rotateX(0deg)'}],650,550);
        this.track('.bag',[{transform:'none'},{transform:'translateY(-6px)',offset:.48},{transform:'none'}],1950,650);
      }
      const batch=this.animations;this.emit('motion-play');
      Promise.all(batch.map(a=>a.finished)).then(()=>{if(this.animations===batch){this.running=false;this.emit('motion-complete');}}).catch(()=>{});
    }
    pause(){this.animations.forEach(a=>a.pause());this.running=false;this.emit('motion-pause');}
    play(){if(this.reduced.matches)return;if(!this.animations.length){this.restart();return;}this.animations.forEach(a=>a.play());this.running=true;this.emit('motion-play');}
    seek(ms){if(!this.animations.length)this.restart();this.animations.forEach(a=>{a.pause();a.currentTime=Math.max(0,Math.min(this.duration,ms));});this.running=false;this.emit('motion-seek');}
    setProgress(p){this.seek(p*this.duration);}
    disconnectedCallback(){this.reset();this.resize?.disconnect();this.visible?.disconnect();this.reduced.removeEventListener('change',this.onReduce);document.removeEventListener('visibilitychange',this.onVisibility);for(const event of ['pointerenter','focus','click'])this.owner?.removeEventListener(event,this.onHover);}
  }
  customElements.define('dl-entry-scene-v2',EntryScene);
})();
