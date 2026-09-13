// The 1.2 MB Three.js module is requested only near the footer, not at menu startup.
class DumplingStorefront extends HTMLElement {
  connectedCallback(){
    this._generation=(this._generation||0)+1;const generation=this._generation;
    this._observer=new IntersectionObserver(async entries=>{
      const entry=entries[0];this._visible=entry.isIntersecting;
      if(this._stage){this._stage.setActive(this._visible);return;}
      if(!entry.isIntersecting||this._loading)return;
      this._loading=true;
      try{const {mountStorefront}=await import('./storefront-stage-v1.js');if(!this.isConnected||generation!==this._generation)return;const stage=await mountStorefront(this);if(!this.isConnected||generation!==this._generation){stage.dispose();return;}this._stage=stage;stage.setActive(this._visible);}
      catch(error){this.dataset.renderState='fallback';console.warn('Storefront illustration fallback:',error.message);}
    },{rootMargin:'80px 0px',threshold:0});this._observer.observe(this);
  }
  disconnectedCallback(){this._generation++;this._observer?.disconnect();this._stage?.dispose();this._stage=null;this._loading=false;}
}
if(!customElements.get('dumpling-storefront'))customElements.define('dumpling-storefront',DumplingStorefront);
