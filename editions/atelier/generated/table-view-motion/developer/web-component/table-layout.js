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
  // Dish detail photographs are static; cart layout/fly feedback stays separate.
  globalThis.TableMotion = { capture, reconcile, rect, fly, reduce };
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
