// Project-local adaptation of the generated icon: rearrange plates, no extrusion.
// Timing and causal order are documented in /motion-plan.json.
(() => {
  const duration = 480,
    easing = "cubic-bezier(.22,.72,.18,1)";
  const reduce = () =>
    globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const rect = (node) => {
    const r = node.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  };
  const capture = (root) =>
    new Map(
      [...(root?.querySelectorAll("[data-motion-key]") || [])].map((node) => [
        node.dataset.motionKey,
        rect(node),
      ]),
    );
  const reconcile = (root, before, ms = duration) => {
    if (!root || reduce() || !before) return;
    root.querySelectorAll("[data-motion-key]").forEach((node) => {
      node.getAnimations?.().forEach((a) => a.cancel());
      const from = before.get(node.dataset.motionKey),
        to = rect(node);
      if (!to.width || !to.height) return;
      if (!from?.width || !from.height) {
        node.animate?.(
          [
            { opacity: 0, transform: "translateY(10px)" },
            { opacity: 1, transform: "none" },
          ],
          { duration: ms, easing },
        );
        return;
      }
      const dx = from.left - to.left,
        dy = from.top - to.top,
        sx = from.width / to.width,
        sy = from.height / to.height;
      if (
        Math.abs(dx) + Math.abs(dy) + Math.abs(sx - 1) + Math.abs(sy - 1) <
        0.05
      )
        return;
      node.animate?.(
        [
          {
            transformOrigin: "0 0",
            transform: `translate(${dx}px,${dy}px) scale(${sx},${sy})`,
          },
          { transformOrigin: "0 0", transform: "none" },
        ],
        { duration: ms, easing },
      );
    });
  };
  const fly = (src, from, target) => {
    if (reduce() || !from?.width || !target?.isConnected) return;
    // A closed detail sheet transfers into the real tray on the next frame.
    if (document.querySelector("dialog[open]")) return;
    const to = rect(target),
      image = new Image();
    image.src = src;
    image.alt = "";
    Object.assign(image.style, {
      position: "fixed",
      left: `${from.left}px`,
      top: `${from.top}px`,
      width: `${from.width}px`,
      height: `${from.height}px`,
      objectFit: "contain",
      pointerEvents: "none",
      zIndex: "80",
      transformOrigin: "0 0",
    });
    image.setAttribute("aria-hidden", "true");
    document.body.append(image);
    const animation = image.animate(
      [
        { transform: "none", opacity: 1 },
        {
          offset: 0.38,
          transform: `translate(${(to.left - from.left) * 0.35}px,${(to.top - from.top) * 0.35 - 28}px) scale(.8)`,
          opacity: 1,
        },
        {
          transform: `translate(${to.left - from.left}px,${to.top - from.top}px) scale(${to.width / from.width},${to.height / from.height})`,
          opacity: 0.4,
        },
      ],
      { duration: 520, easing },
    );
    animation.finished.catch(() => {}).finally(() => image.remove());
  };
  // A single photograph rotates in its own plane; this is not a 3D model.
  const attachPlate = (host) => {
    const img = host?.querySelector("img");
    if (!img || host.dataset.rotatable) return;
    host.dataset.rotatable = "true";
    let angle = 0, gesture = null;
    let intro = null, introStarted = false;
    const preference = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
    const stopIntro = () => {
      if (intro) {
        const matrix = globalThis.DOMMatrixReadOnly ? new DOMMatrixReadOnly(getComputedStyle(img).transform) : null;
        const yaw = matrix ? Math.atan2(matrix.m31, matrix.m11) * 180 / Math.PI : 0;
        host.style.setProperty('--plate-auto-angle', `${yaw}deg`);
        intro.cancel(); intro = null;
      }
      host.dataset.plateMotion = 'idle';
    };
    const autoTurn = () => {
      if (introStarted || !host.isConnected || !host.closest('dialog')?.open) return;
      introStarted = true;
      if (reduce() || !img.naturalWidth || !img.animate) return;
      host.dataset.plateMotion = 'turning';
      intro = img.animate([
        {transform:'perspective(900px) rotateY(0deg)'},
        {transform:'perspective(900px) rotateY(18deg)'},
        {transform:'perspective(900px) rotateY(-18deg)'},
        {transform:'perspective(900px) rotateY(0deg)'},
      ],{duration:10000,easing:'ease-in-out',iterations:Infinity});
    };
    const onPreference = () => { if(preference.matches){stopIntro();host.style.removeProperty('--plate-auto-angle');} };
    host.stopPlateMotion = () => {
      introStarted = true; stopIntro(); img.removeEventListener('load',autoTurn);
      preference?.removeEventListener?.('change',onPreference);
    };
    preference?.addEventListener?.('change',onPreference);
    if(img.complete)autoTurn();else img.addEventListener('load',autoTurn,{once:true});
    img.draggable = false;
    const paint = (value) => {
      angle = Math.max(-22, Math.min(22, value));
      host.style.setProperty("--plate-angle", `${angle}deg`);
      host.setAttribute("aria-valuenow", String(Math.round(angle)));
    };
    host.addEventListener("pointerdown", (e) => {
      if (host.classList.contains("image-unavailable")) return;
      if (e.isPrimary === false || (e.button !== undefined && e.button !== 0)) return;
      introStarted = true; stopIntro();
      gesture = { id: e.pointerId, x: e.clientX, y: e.clientY, start: angle, dragging: false };
    });
    host.addEventListener("pointermove", (e) => {
      if (!gesture || e.pointerId !== gesture.id) return;
      const dx = e.clientX - gesture.x, dy = e.clientY - gesture.y;
      if (!gesture.dragging) {
        if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) { gesture = null; return; }
        if (Math.abs(dx) < 8) return;
        gesture.dragging = true;
        host.setPointerCapture?.(e.pointerId);
        host.classList.add("is-turning");
      }
      e.preventDefault();
      paint(gesture.start + dx * 0.15);
    });
    const finish = () => { gesture = null; host.classList.remove("is-turning"); };
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) host.addEventListener(type, finish);
    host.addEventListener("keydown", (e) => {
      if (host.classList.contains("image-unavailable")) return;
      if (!["ArrowLeft", "ArrowRight", "Home"].includes(e.key)) return;
      introStarted = true; stopIntro();
      e.preventDefault();
      if(e.key === "Home")host.style.removeProperty('--plate-auto-angle');
      paint(e.key === "Home" ? 0 : angle + (e.key === "ArrowLeft" ? -3 : 3));
    });
    paint(0);
  };
  globalThis.TableMotion = { capture, reconcile, rect, fly, reduce, attachPlate };
  class TableViewMotion extends (globalThis.HTMLElement || class {}) {
    static get observedAttributes() {
      return ["layout", "accent", "duration"];
    }
    constructor() {
      super();
      if (!this.attachShadow) return;
      this.attachShadow({ mode: "open" });
    }
    connectedCallback() {
      this.shadowRoot.innerHTML = `<style>:host{display:inline-block;width:24px;height:24px;color:inherit;vertical-align:middle}svg{width:100%;height:100%;display:block;overflow:visible}.dot{transition:transform var(--duration,480ms) cubic-bezier(.22,.72,.18,1)}.line{transition:opacity var(--duration,480ms)}@media(prefers-reduced-motion:reduce){.dot,.line{transition:none}}</style><svg viewBox="0 0 100 100" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="5">${[0, 1, 2, 3].map((i) => `<g class="dot"><circle r="12"/></g><path class="line" d="M43 ${17 + i * 22}h43"/>`).join("")}</g></svg>`;
      this.update();
      this.dispatchEvent(new Event("motion-ready"));
    }
    attributeChangedCallback() {
      this.update();
    }
    update() {
      if (!this.shadowRoot?.firstChild) return;
      this.style.setProperty(
        "--duration",
        `${Number(this.getAttribute("duration")) || duration}ms`,
      );
      this.setProgress(this.getAttribute("layout") === "list" ? 1 : 0);
    }
    setProgress(p) {
      p = Math.max(0, Math.min(1, p));
      this.progress = p;
      const grid = [
        [27, 27],
        [73, 27],
        [27, 73],
        [73, 73],
      ];
      this.shadowRoot
        ?.querySelectorAll(".dot")
        .forEach(
          (node, i) =>
            (node.style.transform = `translate(${grid[i][0] + (20 - grid[i][0]) * p}px,${grid[i][1] + (17 + i * 22 - grid[i][1]) * p}px)`),
        );
      this.shadowRoot
        ?.querySelectorAll(".line")
        .forEach((node) => (node.style.opacity = String(p)));
    }
    seek(ms) {
      this.setProgress(ms / duration);
    }
    pause() {
      this.shadowRoot
        ?.getAnimations?.({ subtree: true })
        .forEach((a) => a.pause());
    }
    play() {
      this.update();
    }
    restart() {
      const target = this.getAttribute("layout") === "list" ? 1 : 0;
      if (reduce()) {
        this.setProgress(target);
        return;
      }
      this.setProgress(1 - target);
      requestAnimationFrame(() => this.setProgress(target));
    }
  }
  if (globalThis.customElements && !customElements.get("dl-table-view-motion"))
    customElements.define("dl-table-view-motion", TableViewMotion);
})();
