/* Dumpling Lab — table menu.
   The iOS app's experience, rebuilt for the browser: 3D tiles that tilt
   under the finger, a FLIP hero flight into the dish page, canvas steam,
   and a steamer-basket cart. No dependencies. */

"use strict";

// Visible error trap for on-device debugging.
addEventListener("error", e => {
  const el = document.createElement("div");
  el.style.cssText = "position:fixed;top:60px;left:8px;right:8px;z-index:999;background:#b00;color:#fff;font:12px monospace;padding:8px;border-radius:8px;white-space:pre-wrap;";
  el.textContent = "JS ERROR: " + e.message + " @ " + (e.filename||"").split("/").pop() + ":" + e.lineno;
  document.body ? document.body.appendChild(el) : addEventListener("DOMContentLoaded", () => document.body.appendChild(el));
});

const $ = (s, el = document) => el.querySelector(s);
const fmt = n => "$" + (Number.isInteger(n) ? n : n.toFixed(2));

const TABLE = new URLSearchParams(location.search).get("table");
if (TABLE) $("#tableTag").textContent = `Table ${TABLE} · ${TABLE}号桌`;

/* ============================== Procedural art ==============================
   Dishes without photography get the app's studio illustration language,
   as parametric SVG: crescent dumplings with pleats, bowls, plates, cups. */

function shade(hex, f) { // f<0 darkens, f>0 lightens toward white
  const v = hex.match(/\w\w/g).map(h => parseInt(h, 16));
  const t = f < 0 ? 0 : 255, a = Math.abs(f);
  return "#" + v.map(c => Math.round(c + (t - c) * a).toString(16).padStart(2, "0")).join("");
}

function dumplingSVG(d, crisped) {
  const skin = d.skin, dark = shade(skin, -0.3), lite = shade(skin, 0.45);
  const one = (w, x, y, o) => {
    const crispGrad = crisped
      ? `<path d="M6,39 C11,64 29,66 47,66 C65,66 83,64 88,39 C76,4 18,4 6,39 Z"
           fill="url(#crisp${d.id})" opacity="0.9"/>` : "";
    return `<g transform="translate(${x} ${y}) scale(${w / 94})" opacity="${o}">
      <path d="M6,39 C11,64 29,66 47,66 C65,66 83,64 88,39 C76,4 18,4 6,39 Z" fill="url(#skin${d.id})"/>
      ${crispGrad}
      <path d="M10,37 C22,12 72,12 84,37" fill="none" stroke="${dark}" stroke-width="1.6" opacity="0.5" stroke-linecap="round"/>
      ${[0.16, 0.3, 0.44, 0.58, 0.72, 0.86].map(t => {
        const px = 10 + t * 74, py = 37 - Math.sin(t * Math.PI) * 22;
        const len = 13 + Math.sin(t * Math.PI) * 6, lean = (t - 0.5) * 14;
        return `<path d="M${px},${py} q${lean * 0.4},${len * 0.55} ${lean},${len}"
          fill="none" stroke="${dark}" stroke-width="1.4" opacity="0.55" stroke-linecap="round"/>
          <path d="M${px - 1},${py - 1} q${lean * 0.4},${len * 0.55} ${lean},${len}"
          fill="none" stroke="#ffffff" stroke-width="0.8" opacity="0.5" stroke-linecap="round"/>`;
      }).join("")}
    </g>`;
  };
  return `<svg viewBox="0 0 120 100">
    <defs>
      <radialGradient id="skin${d.id}" cx="0.36" cy="0.28" r="0.9">
        <stop offset="0" stop-color="${lite}"/><stop offset="0.55" stop-color="${skin}"/>
        <stop offset="1" stop-color="${shade(skin, -0.12)}"/>
      </radialGradient>
      <linearGradient id="crisp${d.id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0.5" stop-color="${d.accent}" stop-opacity="0"/>
        <stop offset="1" stop-color="${d.accent}"/>
      </linearGradient>
    </defs>
    <ellipse cx="60" cy="88" rx="42" ry="7" fill="rgba(0,0,0,0.30)"/>
    ${one(56, 6, 34, 0.92)}${one(54, 58, 36, 0.88)}${one(78, 21, 12, 1)}
  </svg>`;
}

function bunSVG(d) {
  const skin = d.skin, lite = shade(skin, 0.5);
  const bun = (r, x, y) => `
    <circle cx="${x}" cy="${y}" r="${r}" fill="url(#bun${d.id})"/>
    <path d="M${x - r * 0.35},${y - r * 0.45} q${r * 0.35},-${r * 0.28} ${r * 0.7},0"
      fill="none" stroke="${shade(skin, -0.25)}" stroke-width="1.6" opacity="0.6" stroke-linecap="round"/>
    <ellipse cx="${x}" cy="${y + r * 0.55}" rx="${r * 0.72}" ry="${r * 0.3}" fill="${d.accent}" opacity="0.28"/>`;
  return `<svg viewBox="0 0 120 100">
    <defs><radialGradient id="bun${d.id}" cx="0.36" cy="0.3" r="0.95">
      <stop offset="0" stop-color="${lite}"/><stop offset="1" stop-color="${shade(skin, -0.1)}"/>
    </radialGradient></defs>
    <ellipse cx="60" cy="88" rx="44" ry="7" fill="rgba(0,0,0,0.3)"/>
    <path d="M14,74 a46,14 0 0 1 92,0 v6 a46,14 0 0 1 -92,0 Z" fill="#946f4a"/>
    <ellipse cx="60" cy="74" rx="46" ry="13" fill="#c29e75"/>
    ${bun(17, 32, 62)}${bun(17, 88, 62)}${bun(22, 60, 52)}
  </svg>`;
}

function bowlSVG(d, kind) {
  const s = d.skin;
  let surface = "";
  if (kind === "noodles") surface = [0.3, 0.45, 0.6, 0.72].map(t =>
    `<path d="M28,${44 + t * 16} C 44,${38 + t * 16} 76,${50 + t * 16} 92,${43 + t * 16}"
      fill="none" stroke="${shade(s, -0.32)}" stroke-width="2" opacity="0.55" stroke-linecap="round"/>`).join("") +
    `<circle cx="79" cy="47" r="7.5" fill="#f7ecd9"/><circle cx="79" cy="47" r="3.6" fill="#f0b53e"/>`;
  if (kind === "rice") surface = Array.from({length: 26}, (_, i) => {
    const a = i * 2.4, r = Math.sqrt((i % 13) / 13) * 24;
    return `<ellipse cx="${60 + Math.cos(a) * r}" cy="${50 + Math.sin(a) * r * 0.5}" rx="3" ry="1.6"
      fill="#fffef8" opacity="0.9" transform="rotate(${i * 37} ${60 + Math.cos(a) * r} ${50 + Math.sin(a) * r * 0.5})"/>`;
  }).join("") + `<circle cx="72" cy="44" r="2.4" fill="${d.accent}"/>`;
  if (kind === "wontons") surface = [[46, 49], [62, 45], [76, 50]].map(([x, y]) =>
    `<path d="M${x - 9},${y + 4} q2,-10 9,-11 q8,1 10,9 q-3,7 -10,7 q-7,-1 -9,-5 Z"
      fill="#fdf6ea" stroke="${shade(s, -0.15)}" stroke-width="0.8"/>`).join("");
  if (kind === "broth") surface = `<ellipse cx="52" cy="46" rx="12" ry="4.5" fill="#ffffff" opacity="0.3"/>`;
  return `<svg viewBox="0 0 120 100">
    <defs><radialGradient id="soup${d.id}" cx="0.42" cy="0.35" r="0.85">
      <stop offset="0" stop-color="${shade(s, 0.25)}"/><stop offset="1" stop-color="${shade(s, -0.15)}"/>
    </radialGradient></defs>
    <ellipse cx="60" cy="88" rx="42" ry="7" fill="rgba(0,0,0,0.3)"/>
    <path d="M18,46 C22,74 40,82 60,82 C80,82 98,74 102,46" fill="#f2efe8"/>
    <path d="M18,46 C22,74 40,82 60,82 C80,82 98,74 102,46" fill="url(#shadeBowl)" opacity="0.15"/>
    <ellipse cx="60" cy="46" rx="42" ry="12.5" fill="#fbfaf6"/>
    <ellipse cx="60" cy="47" rx="37" ry="10" fill="url(#soup${d.id})"/>
    ${surface}
    <g transform="translate(40 42) rotate(-12)">
      <rect x="0" y="0" width="2.6" height="9" rx="1.3" fill="#5f8766"/>
      <rect x="5" y="-1" width="2.6" height="9" rx="1.3" fill="#4c7253"/>
    </g>
  </svg>`;
}

function plateSVG(d, leaves) {
  const bits = Array.from({length: leaves ? 12 : 10}, (_, i) => {
    const a = i * 2.4 + 0.7, r = Math.sqrt(((i * 7) % 10) / 10) * 20;
    const x = 60 + Math.cos(a) * r, y = 48 + Math.sin(a) * r * 0.55 - 3;
    const rot = (i * 53) % 180, c = shade(d.skin, ((i % 4) - 1.5) * 0.07);
    return leaves
      ? `<path d="M${x},${y - 7} q7,7 0,14 q-7,-7 0,-14 Z" fill="${c}" transform="rotate(${rot} ${x} ${y})"/>`
      : `<rect x="${x - 7}" y="${y - 4.5}" width="14" height="9" rx="3.4" fill="${c}" transform="rotate(${rot} ${x} ${y})"/>
         <ellipse cx="${x - 2.5}" cy="${y - 2}" rx="3" ry="1.6" fill="#ffffff" opacity="0.35" transform="rotate(${rot} ${x} ${y})"/>`;
  }).join("");
  return `<svg viewBox="0 0 120 100">
    <ellipse cx="60" cy="86" rx="44" ry="7" fill="rgba(0,0,0,0.26)"/>
    <ellipse cx="60" cy="58" rx="46" ry="16" fill="#f4f1ea"/>
    <ellipse cx="60" cy="56" rx="38" ry="12.5" fill="#fbfaf6"/>
    ${bits}
    <circle cx="72" cy="42" r="2.2" fill="${d.accent}"/>
  </svg>`;
}

function cupSVG(d) {
  return `<svg viewBox="0 0 120 100">
    <defs><linearGradient id="cup${d.id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${shade(d.skin, 0.2)}"/><stop offset="1" stop-color="${shade(d.skin, -0.08)}"/>
    </linearGradient></defs>
    <ellipse cx="60" cy="88" rx="30" ry="6" fill="rgba(0,0,0,0.26)"/>
    <path d="M36,30 C36,58 42,76 48,80 Q60,86 72,80 C78,76 84,58 84,30 Q60,24 36,30 Z" fill="url(#cup${d.id})"/>
    <path d="M36,30 C36,58 42,76 48,80 L50,80 C44,70 40,52 40,31 Z" fill="#ffffff" opacity="0.4"/>
    <ellipse cx="60" cy="29" rx="24" ry="7" fill="${d.accent}"/>
    ${[0, 1, 2, 3].map(i => `<circle cx="${48 + i * 8}" cy="${24 - (i % 2) * 3}" r="3.4" fill="#fffdf6" opacity="0.9"/>`).join("")}
    <rect x="72" y="12" width="3" height="10" rx="1.5" fill="#5f8766" transform="rotate(18 73 17)"/>
  </svg>`;
}

function artFor(d) {
  if (d.img) return `<img src="img/${d.img}" alt="${d.name}" loading="lazy" draggable="false">`;
  switch (d.art) {
    case "pleatedDumpling": return dumplingSVG(d, false);
    case "pleatedDumplingCrisped": return dumplingSVG(d, true);
    case "soupDumpling": return bunSVG(d);
    case "noodleBowl": return bowlSVG(d, "noodles");
    case "riceBowl": return bowlSVG(d, "rice");
    case "soupBowl": return bowlSVG(d, "broth");
    case "wonton": return bowlSVG(d, "wontons");
    case "sidePlate": return plateSVG(d, false);
    case "greens": return plateSVG(d, true);
    case "dessertCup": return cupSVG(d);
    default: return dumplingSVG(d, false);
  }
}

/* ============================== Featured reel ============================== */

const featured = MENU.filter(d => d.featured);
const reel = $("#reel"), dots = $("#reelDots");

featured.forEach((d, i) => {
  const s = document.createElement("div");
  s.className = "slide";
  s.innerHTML = `
    <div class="stage3d"><div class="food">${artFor(d)}</div></div>
    <div class="badges">
      ${d.best ? '<span class="badge-pill red">Best Seller</span>' : ""}
      ${d.chef ? '<span class="badge-pill wood">Chef’s Choice</span>' : ""}
    </div>
    <h2>${d.name}</h2>
    <div class="cn-name">${d.cn}</div>
    <p class="flavor">${d.flavor}</p>
    <div class="price">${fmt(d.price)}</div>`;
  s.addEventListener("click", () => openDetail(d, s.querySelector(".stage3d")));
  reel.appendChild(s);
  const dot = document.createElement("i");
  if (i === 0) dot.className = "on";
  dots.appendChild(dot);
});

reel.addEventListener("scroll", () => {
  const i = Math.round(reel.scrollLeft / reel.clientWidth);
  [...dots.children].forEach((el, j) => el.classList.toggle("on", j === i));
  const d = featured[Math.max(0, Math.min(i, featured.length - 1))];
  if (d) $("#heroGlow").style.setProperty("--glow-c", d.glow + "b0");
}, { passive: true });
$("#heroGlow").style.setProperty("--glow-c", featured[0].glow + "b0");

/* ============================== Menu chapters ============================== */

const menuEl = $("#menu"), railEl = $("#railInner");
const chapterEls = {};

SECTIONS.forEach((sec, idx) => {
  const dishes = MENU.filter(d => d.section === sec);
  if (!dishes.length) return;

  const chip = document.createElement("button");
  chip.className = "chip" + (idx === 0 ? " on" : "");
  chip.textContent = sec;
  chip.addEventListener("click", () => {
    chapterEls[sec].scrollIntoView({ behavior: "smooth", block: "start" });
  });
  railEl.appendChild(chip);

  const ch = document.createElement("section");
  ch.className = "chapter";
  ch.dataset.section = sec;
  ch.innerHTML = `
    <div class="num">CHAPTER ${String(idx + 1).padStart(2, "0")}</div>
    <h2>${sec}</h2>
    <div class="tagline">${TAGLINES[sec]}</div>
    <div class="grid"></div>`;
  const grid = ch.querySelector(".grid");

  dishes.forEach((d, i) => {
    const t = document.createElement("div");
    t.className = "tile";
    t.style.setProperty("--float-delay", (i * 0.6) + "s");
    t.innerHTML = `
      <div class="stage" style="--tile-glow:${d.glow}1f">
        <div class="food">${artFor(d)}</div>
        <button class="quick-add" aria-label="Add">+</button>
      </div>
      <div class="caption">
        <div class="name">${d.best || d.chef ? '<span class="dot">•</span>' : ""}${d.name}</div>
        <div class="meta">
          <span class="price">${fmt(d.price)}</span>
          ${d.spice ? `<span class="spice">${"🌶".repeat(Math.min(d.spice, 3))}</span>` : ""}
          ${d.pieces ? `<span class="pieces">${d.pieces} pc</span>` : ""}
        </div>
      </div>`;
    attachTilt(t);
    t.querySelector(".quick-add").addEventListener("click", e => {
      e.stopPropagation();
      addToCart(d, 1);
    });
    t.addEventListener("click", () => openDetail(d, t.querySelector(".stage")));
    grid.appendChild(t);
  });

  menuEl.appendChild(ch);
  chapterEls[sec] = ch;
});

// Rail follows scroll
const chips = [...railEl.children];
const sectionList = Object.entries(chapterEls);
addEventListener("scroll", () => {
  let active = 0;
  sectionList.forEach(([_, el], i) => {
    if (el.getBoundingClientRect().top < 140) active = i;
  });
  chips.forEach((c, i) => c.classList.toggle("on", i === active));
  const chip = chips[active];
  if (chip) chip.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
}, { passive: true });

/* ============================== 3D tilt ============================== */

function attachTilt(tile) {
  const stage = tile.querySelector(".stage");
  let raf = null;
  const move = e => {
    const r = stage.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    const x = (p.clientX - r.left) / r.width - 0.5;
    const y = (p.clientY - r.top) / r.height - 0.5;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      stage.style.transform = `rotateY(${x * 16}deg) rotateX(${-y * 16}deg) scale(1.03)`;
      raf = null;
    });
  };
  const end = () => {
    tile.classList.remove("tilting");
    stage.style.transform = "";
  };
  tile.addEventListener("touchstart", () => tile.classList.add("tilting"), { passive: true });
  tile.addEventListener("touchmove", move, { passive: true });
  tile.addEventListener("touchend", end);
  tile.addEventListener("touchcancel", end);
  tile.addEventListener("mouseenter", () => tile.classList.add("tilting"));
  tile.addEventListener("mousemove", move);
  tile.addEventListener("mouseleave", end);
}

/* ============================== Detail (FLIP flight) ============================== */

const detail = $("#detail");
let currentDish = null, qty = 1;

function openDetail(d, fromEl) {
  currentDish = d; qty = 1;
  haptic();

  // Build content
  $("#detailGlow").style.setProperty("--glow-c", d.glow + "b8");
  $(".detail-hero").style.setProperty("--hero-glow-bg", shade(d.glow, -0.1));
  $("#detailArt").innerHTML = `<div class="food">${artFor(d)}</div>`;
  $("#detailCaption").innerHTML = `
    <div class="badges">
      <span class="badge-pill wood">Handmade Daily</span>
      ${d.best ? '<span class="badge-pill red">Best Seller</span>'
        : d.chef ? '<span class="badge-pill red">Chef’s Choice</span>' : ""}
    </div>
    <h2>${d.name}</h2>
    <div class="cn-name">${d.cn}</div>
    <div class="meta">${d.kcal} kcal · ${fmt(d.price)}${d.pieces ? ` · ${d.pieces} pieces` : ""}</div>`;

  const calFrac = Math.min(d.kcal / 900, 1);
  $("#detailBody").innerHTML = `
    <section>
      <div class="overline">The Flavor</div>
      <div class="flavor-text">${d.flavor}</div>
    </section>
    <section class="kitchen-card">
      <div class="overline">From the Kitchen</div>
      <p>${d.story}</p>
      <div class="sig">— Chef Lin</div>
    </section>
    <section>
      <div class="overline">What's Inside</div>
      <div class="ingredients">${d.ingredients.map(i =>
        `<div class="ing"><div class="em">${i.emoji}</div><div class="nm">${i.name}</div></div>`).join("")}
      </div>
    </section>
    <section>
      <div class="overline">On the Scale</div>
      <div class="nutrition">
        <div class="dial">
          <svg width="100" height="100">
            <circle cx="50" cy="50" r="43" fill="none" stroke="var(--cream-deep)" stroke-width="8"/>
            <circle cx="50" cy="50" r="43" fill="none" stroke="url(#dialGrad)" stroke-width="8"
              stroke-linecap="round" stroke-dasharray="${270 * calFrac} 999"
              style="stroke-dasharray:0 999; transition: stroke-dasharray 1.1s cubic-bezier(0.22,1,0.36,1) 0.45s;"
              class="dial-arc"/>
            <defs><linearGradient id="dialGrad"><stop offset="0" stop-color="var(--wood)"/><stop offset="1" stop-color="var(--red)"/></linearGradient></defs>
          </svg>
          <div class="val"><b>${d.kcal}</b><span>kcal</span></div>
        </div>
        <div class="macros">
          ${[["Protein", d.protein, 45, "var(--red)"], ["Carbs", d.carbs, 80, "var(--wood)"], ["Fat", d.fat, 40, "#b39b6d"]].map(([n, v, m, c]) => `
            <div class="macro">
              <div class="row"><b>${n}</b><span>${v} g</span></div>
              <div class="track"><div class="fill" data-w="${Math.min(v / m, 1) * 100}" style="background:${c}"></div></div>
            </div>`).join("")}
        </div>
      </div>
      <div class="spice-row">
        <b>Spice</b>
        <span class="flames">${d.spice ? "🔥".repeat(d.spice) : "—"}</span>
        <span>${["Not spicy", "Mild", "Medium", "Hot", "Fiery"][d.spice]}</span>
      </div>
    </section>
    ${d.allergens.length || d.sauce ? `<section>
      ${d.sauce ? `<div class="overline">Recommended Sauce</div>
        <div class="flavor-text" style="font-size:15px; margin-bottom:14px;">${d.sauce}</div>` : ""}
      ${d.allergens.length ? `<div class="overline">Allergens</div>
        <div class="chips">${d.allergens.map(a => `<span class="chip-sm">${a}</span>`).join("")}</div>` : ""}
    </section>` : ""}`;

  renderDetailBar();

  // FLIP: fly the food from the tile to the detail hero
  const fromRect = fromEl ? fromEl.getBoundingClientRect() : null;
  detail.hidden = false;
  document.body.style.overflow = "hidden";

  requestAnimationFrame(() => {
    detail.classList.add("open");
    detail.scrollTop = 0;
    const toRect = $("#detailArt").getBoundingClientRect();
    if (fromRect) {
      const flyer = document.createElement("div");
      flyer.id = "flyer";
      flyer.innerHTML = artFor(d);
      flyer.style.cssText = `left:${fromRect.left}px; top:${fromRect.top}px;
        width:${fromRect.width}px; height:${fromRect.height}px;
        transition: all 0.52s cubic-bezier(0.22, 1, 0.36, 1);`;
      document.body.appendChild(flyer);
      $("#detailArt").style.opacity = "0";
      requestAnimationFrame(() => {
        flyer.style.left = toRect.left + "px";
        flyer.style.top = toRect.top + "px";
        flyer.style.width = toRect.width + "px";
        flyer.style.height = toRect.height + "px";
      });
      setTimeout(() => {
        $("#detailArt").style.opacity = "1";
        flyer.remove();
      }, 540);
    }
    // Staged reveal, like the app: art lands → info fades in → bars fill
    setTimeout(() => {
      detail.classList.add("staged");
      $(".dial-arc").style.strokeDasharray = `${270 * calFrac} 999`;
      detail.querySelectorAll(".fill").forEach(f => f.style.width = f.dataset.w + "%");
    }, 480);
    startSteam($("#steamCanvas"));
  });
}

function renderDetailBar() {
  $("#detailBar").innerHTML = `
    <div class="qty">
      <button id="qMinus">−</button><b>${qty}</b><button id="qPlus">+</button>
    </div>
    <button class="add-btn" id="addBtn">
      <span>Add to steamer</span><strong>${fmt(currentDish.price * qty)}</strong>
    </button>`;
  $("#qMinus").onclick = () => { if (qty > 1) { qty--; renderDetailBar(); haptic(); } };
  $("#qPlus").onclick = () => { qty++; renderDetailBar(); haptic(); };
  $("#addBtn").onclick = () => {
    addToCart(currentDish, qty);
    closeDetail();
    openCart();
  };
}

function closeDetail() {
  detail.classList.remove("open", "staged");
  stopSteam();
  setTimeout(() => {
    detail.hidden = true;
    if ($("#cart").hidden) document.body.style.overflow = "";
  }, 300);
}
$("#detailClose").addEventListener("click", closeDetail);

/* ============================== Steam (canvas) ============================== */

let steamRAF = null;
function startSteam(canvas) {
  const ctx = canvas.getContext("2d");
  const resize = () => {
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
  };
  resize();
  const parts = [];
  const spawn = () => parts.push({
    x: canvas.width / 2 + (Math.random() - 0.5) * canvas.width * 0.16,
    y: canvas.height * 0.52,
    r: (14 + Math.random() * 22) * devicePixelRatio,
    a: 0, life: 0, max: 240 + Math.random() * 120,
    vx: (Math.random() - 0.5) * 0.3, sway: Math.random() * Math.PI * 2,
  });
  const tick = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (parts.length < 26 && Math.random() < 0.3) spawn();
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life++;
      p.y -= (0.55 + p.r * 0.008) * devicePixelRatio;
      p.x += Math.sin(p.life * 0.02 + p.sway) * 0.5 + p.vx;
      p.r *= 1.0035;
      const t = p.life / p.max;
      p.a = t < 0.2 ? t / 0.2 : 1 - (t - 0.2) / 0.8;
      if (t >= 1) { parts.splice(i, 1); continue; }
      // Soft-edged puff via radial gradient — no canvas filter needed (iOS-safe).
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      g.addColorStop(0, `rgba(255, 252, 246, ${p.a * 0.14})`);
      g.addColorStop(0.6, `rgba(255, 252, 246, ${p.a * 0.07})`);
      g.addColorStop(1, "rgba(255, 252, 246, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 7);
      ctx.fill();
    }
    steamRAF = requestAnimationFrame(tick);
  };
  stopSteam();
  tick();
}
function stopSteam() { if (steamRAF) cancelAnimationFrame(steamRAF); steamRAF = null; }

/* ============================== Cart ============================== */

const cart = new Map(); // id -> qty
const saved = localStorage.getItem("dl-cart");
if (saved) try { JSON.parse(saved).forEach(([k, v]) => cart.set(k, v)); } catch (_) {}

function persist() { localStorage.setItem("dl-cart", JSON.stringify([...cart])); }
function cartCount() { return [...cart.values()].reduce((a, b) => a + b, 0); }
function cartTotal() { return [...cart].reduce((a, [id, q]) => a + MENU.find(d => d.id === id).price * q, 0); }

function addToCart(d, n) {
  cart.set(d.id, (cart.get(d.id) || 0) + n);
  persist(); syncDock();

/* Debug hooks: #dish=<id> opens a dish page, #cart opens the steamer. */
function runHashHook() {
  const h = location.hash;
  if (h.startsWith("#dish=")) {
    const d = MENU.find(x => x.id === h.slice(6));
    if (d) setTimeout(() => openDetail(d, null), 400);
  } else if (h === "#cart") {
    if (!cart.size) { addToCart(MENU[0], 2); addToCart(MENU.find(d => d.id === "beef-yolk-bowl"), 1); addToCart(MENU.find(d => d.id === "mango-sago"), 2); }
    setTimeout(openCart, 400);
  }
}
addEventListener("load", runHashHook);
addEventListener("hashchange", runHashHook); haptic(true);
  const dock = $("#dockCart");
  dock.classList.remove("pulse"); void dock.offsetWidth; dock.classList.add("pulse");
}

function syncDock() {
  const n = cartCount();
  $("#cartBadge").hidden = n === 0;
  $("#cartBadge").textContent = n;
  $("#dockTotal").textContent = n ? fmt(cartTotal()) : "";
}

function openCart() {
  renderCart();
  $("#cartScrim").hidden = false; $("#cart").hidden = false;
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => { $("#cartScrim").classList.add("open"); $("#cart").classList.add("open"); });
}
function closeCart() {
  $("#cartScrim").classList.remove("open"); $("#cart").classList.remove("open");
  setTimeout(() => {
    $("#cartScrim").hidden = true; $("#cart").hidden = true;
    if (detail.hidden) document.body.style.overflow = "";
  }, 400);
}
$("#dockCart").addEventListener("click", openCart);
$("#cartScrim").addEventListener("click", closeCart);

function renderCart() {
  const items = $("#cartItems");
  const n = cartCount();
  $("#cartSubtitle").textContent = n
    ? `${n} pieces, ready for the kitchen${TABLE ? ` · Table ${TABLE}` : ""}`
    : "";
  if (!n) {
    items.innerHTML = `<div class="cart-empty">The steamer is empty.<br>空蒸笼等着好菜 — 去菜单挑几样吧。</div>`;
    $("#cartTotals").innerHTML = "";
    $("#sendOrder").style.display = "none";
    return;
  }
  $("#sendOrder").style.display = "";
  items.innerHTML = [...cart].map(([id, q]) => {
    const d = MENU.find(x => x.id === id);
    return `<div class="cart-line">
      <div class="thumb">${artFor(d)}</div>
      <div class="info"><div class="nm">${d.name}</div><div class="pr">${fmt(d.price)}</div></div>
      <div class="qty">
        <button data-id="${id}" data-d="-1">−</button><b>${q}</b><button data-id="${id}" data-d="1">+</button>
      </div>
    </div>`;
  }).join("");
  items.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
    const id = b.dataset.id, q = (cart.get(id) || 0) + Number(b.dataset.d);
    if (q <= 0) cart.delete(id); else cart.set(id, q);
    persist(); syncDock();

/* Debug hooks: #dish=<id> opens a dish page, #cart opens the steamer. */
function runHashHook() {
  const h = location.hash;
  if (h.startsWith("#dish=")) {
    const d = MENU.find(x => x.id === h.slice(6));
    if (d) setTimeout(() => openDetail(d, null), 400);
  } else if (h === "#cart") {
    if (!cart.size) { addToCart(MENU[0], 2); addToCart(MENU.find(d => d.id === "beef-yolk-bowl"), 1); addToCart(MENU.find(d => d.id === "mango-sago"), 2); }
    setTimeout(openCart, 400);
  }
}
addEventListener("load", runHashHook);
addEventListener("hashchange", runHashHook); renderCart(); haptic();
  }));
  const kcal = [...cart].reduce((a, [id, q]) => a + MENU.find(d => d.id === id).kcal * q, 0);
  $("#cartTotals").innerHTML = `
    <div class="row"><span>Kitchen total · 合计</span><b>${fmt(cartTotal())}</b></div>
    <div class="row"><span>Estimated calories</span><b>≈ ${kcal} kcal</b></div>
    <div class="row"><span>Steam time</span><b>about 12 min</b></div>`;
  $("#sendTotal").textContent = fmt(cartTotal());
}

$("#sendOrder").addEventListener("click", () => {
  // In production this POSTs to the ordering backend with the table number.
  const order = { table: TABLE, items: [...cart], total: cartTotal(), at: new Date().toISOString() };
  console.log("ORDER →", JSON.stringify(order));
  cart.clear(); persist(); syncDock();

/* Debug hooks: #dish=<id> opens a dish page, #cart opens the steamer. */
function runHashHook() {
  const h = location.hash;
  if (h.startsWith("#dish=")) {
    const d = MENU.find(x => x.id === h.slice(6));
    if (d) setTimeout(() => openDetail(d, null), 400);
  } else if (h === "#cart") {
    if (!cart.size) { addToCart(MENU[0], 2); addToCart(MENU.find(d => d.id === "beef-yolk-bowl"), 1); addToCart(MENU.find(d => d.id === "mango-sago"), 2); }
    setTimeout(openCart, 400);
  }
}
addEventListener("load", runHashHook);
addEventListener("hashchange", runHashHook); closeCart();
  $("#orderedNote").textContent =
    (TABLE ? `Table ${TABLE} · ` : "") + "The kitchen has your order.\nAbout twelve minutes of good things ahead.";
  $("#ordered").hidden = false;
  startSteam($("#orderSteam"));
  haptic(true);
});
$("#orderedDone").addEventListener("click", () => {
  $("#ordered").hidden = true;
  stopSteam();
  document.body.style.overflow = "";
});

/* ============================== Haptics-ish ============================== */

function haptic(strong) {
  if (navigator.vibrate) navigator.vibrate(strong ? 18 : 8);
}

syncDock();

/* Debug hooks: #dish=<id> opens a dish page, #cart opens the steamer. */
function runHashHook() {
  const h = location.hash;
  if (h.startsWith("#dish=")) {
    const d = MENU.find(x => x.id === h.slice(6));
    if (d) setTimeout(() => openDetail(d, null), 400);
  } else if (h === "#cart") {
    if (!cart.size) { addToCart(MENU[0], 2); addToCart(MENU.find(d => d.id === "beef-yolk-bowl"), 1); addToCart(MENU.find(d => d.id === "mango-sago"), 2); }
    setTimeout(openCart, 400);
  }
}
addEventListener("load", runHashHook);
addEventListener("hashchange", runHashHook);
