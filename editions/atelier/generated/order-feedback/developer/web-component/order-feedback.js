// Project-local semantic adaptation. The generated extrusion baseline is not loaded.
(() => {
  const media = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)");
  const reduced = () => !!media?.matches;
  const easing = "cubic-bezier(0.23,1,0.32,1)";
  const active = new Set();
  let flight = null;
  class ValueMotion extends (globalThis.HTMLElement || class {}) {
    constructor() {
      super();
      this.attachShadow?.({ mode: "open" });
      if (this.shadowRoot) this.shadowRoot.innerHTML = '<style>:host{display:inline-block;font:inherit;color:inherit;font-variant-numeric:tabular-nums}span{display:inline-block}</style><span><slot></slot></span>';
    }
    connectedCallback() { this.dispatchEvent(new Event("motion-ready")); }
    disconnectedCallback() { this.stop(); }
    stop() { this.animation?.cancel(); this.animation = null; active.delete(this); }
    set value(value) {
      const next = String(value), previous = this.textContent;
      if (next === previous) return;
      this.stop(); this.textContent = next;
      if (!previous || !next || !this.isConnected || reduced()) return;
      this.direction = Number(next.replace(/[^\d.]/g, "")) < Number(previous.replace(/[^\d.]/g, "")) ? -1 : 1;
      this.restart();
    }
    get value() { return this.textContent; }
    restart() {
      this.stop(); if (reduced()) return;
      this.animation = this.shadowRoot?.querySelector("span")?.animate?.([
        { transform: `translateY(${3 * (this.direction || 1)}px)`, opacity: 0.65 },
        { transform: "none", opacity: 1 },
      ], { duration: 150, easing });
      if (!this.animation) return;
      active.add(this); this.dispatchEvent(new Event("motion-play"));
      const animation = this.animation;
      animation.finished.then(() => {
        if (this.animation === animation) { this.animation = null; active.delete(this); this.dispatchEvent(new Event("motion-complete")); }
      }).catch(() => {});
    }
    play() { this.restart(); }
    pause() { this.animation?.pause(); }
    seek(ms) { if (this.animation) { this.animation.pause(); this.animation.currentTime = Math.max(0, Math.min(150, ms)); } }
    setProgress(p) { this.seek(p * 150); }
  }
  if (globalThis.customElements && !customElements.get("dl-value-motion")) customElements.define("dl-value-motion", ValueMotion);
  const text = (node, next) => {
    if (!node || node.textContent === String(next)) return;
    let value = node.querySelector("dl-value-motion");
    if (!value) {
      value = document.createElement("dl-value-motion");
      value.value = node.textContent;
      node.replaceChildren(value);
    }
    value.value = next;
  };
  const receive = target => {
    if (reduced() || !target?.isConnected) return;
    target.animate?.([{ transform: "translateY(2px) scale(.97)" }, { transform: "none" }], { duration: 150, easing });
  };
  const transfer = (src, from, target) => {
    flight?.cancel(); flight = null;
    if (reduced() || !from?.width || !target?.isConnected || document.querySelector("dialog[open]")) return;
    const rect = target.getBoundingClientRect(), rack = target.closest(".tray-pictures")?.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const size = 38, startX = from.left + from.width / 2 - size / 2, startY = from.top + from.height / 2 - size / 2;
    let endX = rect.left + rect.width / 2 - size / 2;
    if (rack?.width) endX = Math.max(rack.left, Math.min(endX, rack.left + rack.width - size));
    const dx = endX - startX, dy = rect.top + rect.height / 2 - size / 2 - startY;
    const image = new Image(); image.src = src; image.className = "tray-flight"; image.alt = ""; image.setAttribute("aria-hidden", "true");
    Object.assign(image.style, { position: "fixed", left: `${startX}px`, top: `${startY}px`, width: `${size}px`, height: `${size}px`, objectFit: "contain", pointerEvents: "none", zIndex: "80" });
    document.body.append(image);
    const animation = image.animate?.([
      { transform: "scale(.94)", opacity: 0.7 },
      { offset: 0.5, transform: `translate(${dx * .5}px,${dy * .5 - 10}px)`, opacity: 1 },
      { transform: `translate(${dx}px,${dy}px) scale(.92)`, opacity: 0 },
    ], { duration: 280, easing });
    if (!animation) { image.remove(); return; }
    const job = { cancel() { animation.cancel(); image.remove(); } }; flight = job;
    animation.finished.then(() => { if (flight === job) receive(target); }).catch(() => {}).finally(() => { image.remove(); if (flight === job) flight = null; });
  };
  media?.addEventListener?.("change", () => { if (reduced()) { active.forEach(node => node.stop()); flight?.cancel(); flight = null; } });
  globalThis.OrderFeedback = { text, receive, transfer };
  if (globalThis.TableMotion) globalThis.TableMotion.fly = transfer;
})();
