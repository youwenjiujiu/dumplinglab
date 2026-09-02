/* Dumpling Lab — the opening moment: featured dishes on the turntable.

   One slide is live at a time. A dish with a production model spins slowly
   in real 3D (the guest can grab it); a dish with only a photo floats as the
   photograph; everything else is its line drawing. Swipe or use the arrows.
   Only one WebGL context ever exists here, so phones stay cool. */

export function mountShowcase(host, options) {
  const { dishes, stage, render, onChange, onWake } = options;
  let index = 0;
  let view = null;          // the live 3D viewer, if any
  let timer = 0;
  let touched = false;
  const slides = new Map();

  const slideFor = (dish) => {
    if (slides.has(dish.id)) return slides.get(dish.id);
    const el = document.createElement("div");
    el.className = "sc-slide";
    el.dataset.id = dish.id;
    // The printed plate shows first. Underneath sits the thing that comes
    // alive on touch: the 3D model, or the colour photograph.
    const print = options.printFor?.(dish);
    if (dish.model) {
      const s = document.createElement("div");
      s.className = "three-stage";
      el.appendChild(s);
    } else if (print && dish.img) {
      const f = document.createElement("div");
      f.className = "sc-flat";
      f.innerHTML = `<img src="img/${dish.img}" alt="" draggable="false">`;
      el.appendChild(f);
    } else {
      const f = document.createElement("div");
      f.className = "sc-flat";
      f.innerHTML = render(dish);
      el.appendChild(f);
    }
    if (print) {
      const pr = document.createElement("div");
      pr.className = "sc-print";
      pr.innerHTML = `<img src="${print}" alt="" draggable="false">`;
      el.appendChild(pr);
    } else {
      el.classList.add("alive");
    }
    stage.appendChild(el);
    slides.set(dish.id, el);
    return el;
  };

  const show = async (next, direction = 1) => {
    const prev = dishes[index];
    index = (next + dishes.length) % dishes.length;
    const dish = dishes[index];
    if (view) { view.dispose(); view = null; }
    for (const [id, el] of slides) {
      if (id === prev?.id && id !== dish.id) { el.classList.remove("on"); el.classList.toggle("off-left", direction > 0); }
      else if (id !== dish.id) el.classList.remove("on", "off-left");
    }
    const el = slideFor(dish);
    el.classList.remove("off-left");
    requestAnimationFrame(() => el.classList.add("on"));
    onChange?.(dish, index);
    if (dish.model) {
      const s = el.querySelector(".three-stage");
      s.classList.remove("model-loaded");
      s.innerHTML = "";
      const { mountGeneratedDish3D } = await import("./model3d.js?v=12");
      if (dishes[index] !== dish) return;
      view = mountGeneratedDish3D(s, {
        modelURL: `models/production/${dish.model}`,
        label: dish.cn,
        idle: !print && !touched,
        onFirstTouch: () => { touched = true; clearInterval(timer); if (!el.classList.contains("alive")) { el.classList.add("alive"); stage.dataset.justWoke = "1"; onWake?.(dish); } },
      });
    }
  };

  // swipe (horizontal) on the stage — vertical scrolling stays with the page
  let sx = 0, sy = 0, tracking = false;
  stage.addEventListener("pointerdown", e => { sx = e.clientX; sy = e.clientY; tracking = true; });
  stage.addEventListener("pointerup", e => {
    if (!tracking) return; tracking = false;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4 && !dishes[index].model) show(index + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
  });
  host.querySelector("#scPrev")?.addEventListener("click", () => { clearInterval(timer); show(index - 1, -1); });
  host.querySelector("#scNext")?.addEventListener("click", () => { clearInterval(timer); show(index + 1, 1); });

  show(0, 1);
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    timer = setInterval(() => { if (!document.hidden) show(index + 1, 1); }, 9000);
  }
  return {
    current: () => dishes[index],
    alive: () => slides.get(dishes[index]?.id)?.classList.contains("alive") ?? true,
    wake: () => { const el = slides.get(dishes[index]?.id); if (el) { el.classList.add("alive"); touched = true; clearInterval(timer); onWake?.(dishes[index]); } },
    go: (i) => { clearInterval(timer); show(i, 1); },
    dispose() { clearInterval(timer); view?.dispose(); },
  };
}
