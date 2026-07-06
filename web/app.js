/* Dumpling Lab — table menu.
   The iOS app's experience, rebuilt for the browser: 3D tiles that tilt
   under the finger, a FLIP hero flight into the dish page, canvas steam,
   and a steamer-basket cart. Fully bilingual. No dependencies. */

"use strict";

// Visible error trap for on-device debugging.
addEventListener("error", e => {
  const el = document.createElement("div");
  el.style.cssText = "position:fixed;top:60px;left:8px;right:8px;z-index:999;background:#b00;color:#fff;font:12px monospace;padding:8px;border-radius:8px;white-space:pre-wrap;";
  el.textContent = "JS ERROR: " + e.message + " @ " + (e.filename || "").split("/").pop() + ":" + e.lineno;
  document.body ? document.body.appendChild(el) : addEventListener("DOMContentLoaded", () => document.body.appendChild(el));
});

const $ = (s, el = document) => el.querySelector(s);
// Singapore dollars. Swap CURRENCY when a new market opens.
const CURRENCY = "S$";
const fmt = n => CURRENCY + (Number.isInteger(n) ? n : n.toFixed(2));

const TABLE = new URLSearchParams(location.search).get("table");

/* ============================== Language ============================== */

const urlLang = new URLSearchParams(location.search).get("lang");
let lang = urlLang || localStorage.getItem("dl-lang")
  || ((navigator.language || "").toLowerCase().startsWith("zh") ? "zh" : "en");
if (lang !== "zh" && lang !== "en") lang = "en";

const L = () => I18N.ui[lang];
const secName = s => lang === "zh" ? I18N.sections[s] : s;
const secTagline = s => lang === "zh" ? I18N.taglines[s] : TAGLINES[s];
const dishName = d => lang === "zh" ? d.cn : d.name;
const dishSub = d => lang === "zh" ? d.name : d.cn;
const dishFlavor = d => lang === "zh" ? ((I18N.dishes[d.id] || {}).flavor || d.flavor) : d.flavor;
const dishStory = d => lang === "zh" ? ((I18N.dishes[d.id] || {}).story || d.story) : d.story;
const dishSauce = d => d.sauce ? (lang === "zh" ? (I18N.sauces[d.sauce] || d.sauce) : d.sauce) : null;
const ingName = n => lang === "zh" ? (I18N.ingredients[n] || n) : n;
const allergen = a => lang === "zh" ? (I18N.allergens[a] || a) : a;

function setLang(next) {
  lang = next;
  localStorage.setItem("dl-lang", lang);
  renderAll();
}

/* ============================== Procedural art ============================== */

function shade(hex, f) {
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

// If a photo 404s (e.g. not uploaded yet), fall back to procedural art in place.
window.__artFallback = (img, id) => {
  const d = MENU.find(x => x.id === id);
  if (!d || !img.parentElement) return;
  d.img = null;
  img.parentElement.innerHTML = artFor(d);
};

function svgArtFor(d) {
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

function artFor(d) {
  if (d.img) return `<img src="img/${d.img}" alt="${dishName(d)}" loading="lazy" draggable="false"
    onerror="__artFallback(this, '${d.id}')">`;
  return svgArtFor(d);
}

/* ===================== Gaussian splat transitions =====================
   Every dish can dissolve into a cloud of soft gaussian points sampled
   from its own pixels, fly as vapor, and reassemble somewhere else.
   This replaces the flat FLIP flight between grid and card views. */

const splatCache = new Map();

function artImage(d) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    if (d.img) img.src = "img/" + d.img;
    else img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
      svgArtFor(d).replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" '));
  });
}

async function splatPoints(d) {
  if (splatCache.has(d.id)) return splatCache.get(d.id);
  const W = 64, H = 52;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const cx = cv.getContext("2d", { willReadFrequently: true });
  const src = await artImage(d);
  const sc = Math.min(W / (src.width || W), H / (src.height || H));
  const dw = (src.width || W) * sc, dh = (src.height || H) * sc;
  cx.drawImage(src, (W - dw) / 2, (H - dh) / 2, dw, dh);
  const px = cx.getImageData(0, 0, W, H).data;
  const pts = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    if (px[i + 3] > 60) pts.push({
      u: (x + 0.5) / W, v: (y + 0.5) / H,
      c: `rgba(${px[i]},${px[i + 1]},${px[i + 2]},`,
      a: px[i + 3] / 255,
    });
  }
  const target = 1500;
  const out = pts.length > target
    ? Array.from({ length: target }, (_, k) => pts[Math.floor(k * pts.length / target)])
    : pts;
  splatCache.set(d.id, out);
  return out;
}

const SPLAT_SLOW = new URLSearchParams(location.search).get("splatslow");

function splatTransition(d, fromRect, toRect, opts = {}) {
  const done = () => opts.onDone && opts.onDone();
  const fix = r => (r && r.width > 20 && r.height > 20) ? r
    : { left: innerWidth / 2 - 90, top: innerHeight + 40, width: 180, height: 150 };
  fromRect = fix(fromRect); toRect = fix(toRect);
  splatPoints(d).then(pts => {
    if (opts.count && pts.length > opts.count) {
      pts = Array.from({ length: opts.count }, (_, k) => pts[Math.floor(k * pts.length / opts.count)]);
    }
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const cvs = document.createElement("canvas");
    cvs.className = "splat-layer";
    cvs.width = innerWidth * dpr; cvs.height = innerHeight * dpr;
    document.body.appendChild(cvs);
    const ctx = cvs.getContext("2d");
    const DUR = (opts.duration || 720) * (SPLAT_SLOW ? 6 : 1);
    const t0 = performance.now();
    const seeds = pts.map(() => ({
      dly: Math.random() * 0.22,
      arcX: (Math.random() - 0.5) * 190,
      arcY: -40 - Math.random() * 110,
      swirl: Math.random() * Math.PI * 2,
      spin: 4 + Math.random() * 5,
      r: 0.8 + Math.random() * 1.6,
    }));
    const ease = t => 1 - Math.pow(1 - t, 3);

    function frame(now) {
      const T = Math.min((now - t0) / DUR, 1);
      ctx.clearRect(0, 0, cvs.width, cvs.height);
      const sizeScale = ((1 - T) * fromRect.width + T * toRect.width) / 165;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i], sd = seeds[i];
        let t = Math.min(Math.max((T - sd.dly) / (1 - sd.dly), 0), 1);
        t = ease(t);
        const x0 = fromRect.left + p.u * fromRect.width;
        const y0 = fromRect.top + p.v * fromRect.height;
        const x1 = toRect.left + p.u * toRect.width;
        const y1 = toRect.top + p.v * toRect.height;
        const mx = (x0 + x1) / 2 + sd.arcX, my = (y0 + y1) / 2 + sd.arcY;
        const q = 1 - t;
        const bx = q * q * x0 + 2 * q * t * mx + t * t * x1;
        const by = q * q * y0 + 2 * q * t * my + t * t * y1;
        const scatter = Math.sin(Math.PI * t);          // loose mid-flight
        const x = bx + Math.cos(sd.swirl + t * sd.spin) * 20 * scatter;
        const y = by + Math.sin(sd.swirl + t * sd.spin) * 13 * scatter;
        const size = Math.max(0.5, (sd.r + scatter * 1.4) * sizeScale) * dpr;
        ctx.fillStyle = p.c + (p.a * (0.85 - 0.35 * scatter)).toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(x * dpr, y * dpr, size, 0, 7);
        ctx.fill();
      }
      if (T >= 0.86 && !frame.revealed) { frame.revealed = true; opts.onNearEnd && opts.onNearEnd(); }
      if (T < 1) requestAnimationFrame(frame);
      else { cvs.remove(); done(); }
    }
    requestAnimationFrame(frame);
  }).catch(done);
}

/* ============================== Rendering ============================== */

const featured = MENU.filter(d => d.featured);

function renderStatic() {
  $("#tableTag").textContent = TABLE ? L().table(TABLE) : "";
  $("#heroTagline").textContent = L().tagline;
  $("#langToggle").textContent = lang === "zh" ? "EN" : "中文";
  $("#bellBtn").title = L().waiter;
  $("#dockLabel").textContent = lang === "zh" ? "蒸笼 · The Steamer" : "The Steamer · 蒸笼";
  $("#colophonLine").textContent = L().colophon;
  $("#orderedTitle").textContent = lang === "zh" ? "开始蒸了 · It’s steaming" : "It’s steaming · 开始蒸了";
  $("#orderedDone").textContent = L().back;
  $("#vHint").textContent = L().voyageHint;
  $("#vEndTitle").textContent = L().voyageEnd;
  $("#vEndSub").textContent = L().voyageEndSub;
  $("#searchBox").placeholder = L().search;
}

/* ---------- The Voyage: a scroll-flight through the signature dishes.
   True 3D: dishes live at depths along a corridor; scrolling dollies the
   camera through them. Tap the dish in focus to open it. ---------- */

const SPACING = 1050;                   // z-distance between dishes
let vNodes = [], vFocus = -1, vBuilt = false;

function buildVoyage() {
  const world = $("#vWorld");
  world.innerHTML = "";
  const lat = Math.min(innerWidth * 0.22, 170);
  vNodes = featured.map((d, i) => {
    const el = document.createElement("div");
    el.className = "v-dish";
    el.innerHTML = artFor(d);
    world.appendChild(el);
    return { el, d, lateral: (i % 2 ? 1 : -1) * lat, drift: (i % 3 - 1) * 30 };
  });
  $("#voyage").style.height = ((featured.length + 1.9) * 100) + "vh";
  vBuilt = true;
  updateVoyage();
}

function voyageCaption(d) {
  return `
    <div class="badges">
      ${d.best ? `<span class="badge-pill red">${L().bestSeller}</span>` : ""}
      ${d.chef ? `<span class="badge-pill wood">${L().chefsChoice}</span>` : ""}
    </div>
    <h2>${dishName(d)}</h2>
    <div class="cn-name">${dishSub(d)}</div>
    <div class="price">${fmt(d.price)}</div>
    <div class="tap">${lang === "zh" ? "点按查看 · TAP" : "TAP TO OPEN · 点按查看"}</div>`;
}

function updateVoyage() {
  if (!vBuilt) return;
  const voyage = $("#voyage");
  const vh = innerHeight;
  const span = voyage.offsetHeight - vh;
  const y = Math.min(Math.max(-voyage.getBoundingClientRect().top, 0), span);
  const p = span > 0 ? y / span : 0;

  // Debug: ?vp=0.4 pins the flight at a fixed progress for screenshots.
  const vpOverride = new URLSearchParams(location.search).get("vp");
  const prog = vpOverride !== null ? parseFloat(vpOverride) : p;

  const totalDepth = (featured.length + 0.6) * SPACING;
  const camZ = prog * totalDepth;

  // Title sinks away as the flight begins
  const title = $("#vTitle");
  title.style.opacity = Math.max(0, 1 - prog * 13);
  title.style.transform = `translateY(${-prog * 380}px)`;

  let focus = -1, focusDist = 1e9;
  vNodes.forEach((n, i) => {
    const rel = (i + 1) * SPACING - camZ;      // distance ahead of the camera
    if (rel < -260 || rel > 3400) { n.el.style.opacity = "0"; n.el.style.visibility = "hidden"; return; }
    n.el.style.visibility = "visible";
    // Dishes surface out of the fog only once the flight has begun.
    const fadeIn = Math.min(1, Math.max(0, (2600 - rel) / 900)) * Math.min(1, prog * 9);
    const fadeOut = rel < 60 ? Math.max(0, (rel + 260) / 320) : 1;
    // Dishes deeper in the corridor recede into the dark - only the
    // focused dish is fully lit, the next one is a dim silhouette.
    const depthDim = Math.min(1, Math.max(0.1, 1.18 - rel / 1350));
    n.el.style.opacity = (fadeIn * fadeOut * depthDim).toFixed(3);
    const sway = Math.sin((camZ + i * 700) * 0.0011) * 14;
    n.el.style.transform =
      `translate3d(${n.lateral + sway}px, ${n.drift}px, ${-rel}px) rotateY(${n.lateral * -0.09}deg)`;
    const d = Math.abs(rel - 210);
    if (rel > -120 && d < focusDist) { focusDist = d; focus = i; }
  });

  // Caption follows the dish in focus
  const cap = $("#vCaption");
  if (focus !== vFocus) {
    vFocus = focus;
    if (focus >= 0) cap.innerHTML = voyageCaption(vNodes[focus].d);
    const g = focus >= 0 ? vNodes[focus].d.glow : featured[0].glow;
    $("#heroGlow").style.setProperty("--glow-c", g + "b0");
  }
  const capVis = focus >= 0 && focusDist < 460 && prog > 0.035 ? 1 - focusDist / 460 : 0;
  cap.style.opacity = capVis.toFixed(3);
  cap.style.transform = `translateY(${(1 - capVis) * 12}px)`;

  // Arrival card
  const endP = Math.max(0, (camZ - (featured.length * SPACING + 320)) / (0.6 * SPACING - 320));
  $("#vEnd").style.opacity = Math.min(1, endP).toFixed(3);
}

let voyageRAF = null;
addEventListener("scroll", () => {
  if (voyageRAF) return;
  voyageRAF = requestAnimationFrame(() => { voyageRAF = null; updateVoyage(); });
}, { passive: true });
addEventListener("resize", updateVoyage, { passive: true });

// Tap the dish in focus to open it
$(".v-stage").addEventListener("click", () => {
  if (vFocus >= 0 && parseFloat($("#vCaption").style.opacity || 0) > 0.35) {
    const n = vNodes[vFocus];
    openDetail(n.d, n.el);
  }
});

let chapterEls = {};
let tileIndex = [];

function renderMenu() {
  const menuEl = $("#menu"), railEl = $("#railInner");
  menuEl.innerHTML = ""; railEl.innerHTML = "";
  chapterEls = {};
  tileIndex = [];

  SECTIONS.forEach((sec, idx) => {
    const dishes = MENU.filter(d => d.section === sec);
    if (!dishes.length) return;

    const chip = document.createElement("button");
    chip.className = "chip" + (idx === 0 ? " on" : "");
    chip.textContent = secName(sec);
    chip.addEventListener("click", () => {
      haptic();
      const railH = $("#rail").offsetHeight;
      const y = chapterEls[sec].getBoundingClientRect().top + scrollY - railH + 6;
      scrollTo({ top: y, behavior: "smooth" });
      // Heights can settle during the glide - re-align once at the end.
      clearTimeout(chip._fix);
      chip._fix = setTimeout(() => {
        const y2 = chapterEls[sec].getBoundingClientRect().top + scrollY - railH + 6;
        if (Math.abs(y2 - scrollY) > 24) scrollTo({ top: y2, behavior: "smooth" });
      }, 620);
    });
    railEl.appendChild(chip);

    const ch = document.createElement("section");
    ch.className = "chapter";
    ch.innerHTML = `
      <div class="num">${L().chapter(String(idx + 1).padStart(2, "0"))}</div>
      <h2>${secName(sec)} <span class="sec-sub">${lang === "zh" ? sec : I18N.sections[sec]}</span></h2>
      <div class="tagline">${secTagline(sec)}</div>
      <div class="grid"></div>`;
    const grid = ch.querySelector(".grid");

    dishes.forEach((d, i) => {
      const t = document.createElement("div");
      t.className = "tile" + (d.soldOut ? " sold" : "");
      t.dataset.id = d.id;
      t.style.setProperty("--float-delay", (i * 0.6) + "s");
      t.innerHTML = `
        <div class="stage" style="--tile-glow:${d.glow}1f">
          <div class="food">${artFor(d)}</div>
          ${d.soldOut ? `<div class="sold-tag">${L().soldOut}</div>`
                      : `<button class="quick-add" aria-label="Add">+</button>`}
        </div>
        <div class="caption">
          <div class="name">${d.best || d.chef ? '<span class="dot">•</span>' : ""}${dishName(d)}</div>
          <div class="meta">
            <span class="price">${fmt(d.price)}</span>
            ${d.spice ? `<span class="spice">${"🌶".repeat(Math.min(d.spice, 3))}</span>` : ""}
            ${d.pieces ? `<span class="pieces">${d.pieces} ${L().pieces}</span>` : ""}
          </div>
        </div>`;
      attachTilt(t);
      if (!d.soldOut) {
        t.querySelector(".quick-add").addEventListener("click", e => {
          e.stopPropagation();
          addToCart(d, 1, t.querySelector(".food"));
        });
        t.addEventListener("click", () => openDetail(d, t.querySelector(".stage")));
      }
      grid.appendChild(t);
      tileIndex.push({ el: t, d, chapter: ch });
    });

    menuEl.appendChild(ch);
    chapterEls[sec] = ch;
  });

  updateTileBadges();

  // Pause floats offscreen — 36 animated tiles shouldn't tax the phone.
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => e.target.classList.toggle("offstage", !e.isIntersecting));
  }, { rootMargin: "120px" });
  menuEl.querySelectorAll(".tile").forEach(t => io.observe(t));
}

/* ---------- Search & dietary filters ---------- */

let filterMode = "all", query = "";

function buildFinder() {
  const box = $("#filters");
  box.innerHTML = "";
  [["all", L().fAll], ["veg", "🌱 " + L().fVeg], ["spicy", "🌶 " + L().fSpicy], ["noPork", "🚫 " + L().fNoPork]]
    .forEach(([mode, label]) => {
      const b = document.createElement("button");
      b.className = "f-chip" + (filterMode === mode ? " on" : "");
      b.textContent = label;
      b.addEventListener("click", () => {
        filterMode = filterMode === mode ? "all" : mode;
        haptic();
        buildFinder(); applyFilter();
      });
      box.appendChild(b);
    });
}

function dishMatches(d) {
  if (filterMode === "veg" && !d.veg) return false;
  if (filterMode === "spicy" && d.spice < 2) return false;
  if (filterMode === "noPork" && d.meat === "pork") return false;
  if (query) {
    const q = query.toLowerCase();
    if (!d.name.toLowerCase().includes(q) && !d.cn.includes(query)) return false;
  }
  return true;
}

function applyFilter() {
  const visible = new Map();
  tileIndex.forEach(({ el, d, chapter }) => {
    const ok = dishMatches(d);
    el.style.display = ok ? "" : "none";
    visible.set(chapter, (visible.get(chapter) || 0) + (ok ? 1 : 0));
  });
  let any = false;
  const chips = [...$("#railInner").children];
  Object.values(chapterEls).forEach((ch, i) => {
    const n = visible.get(ch) || 0;
    ch.style.display = n ? "" : "none";
    if (chips[i]) chips[i].style.display = n ? "" : "none";
    if (n) any = true;
  });
  const empty = $("#noResults");
  empty.hidden = any;
  empty.textContent = L().noResults;
}

let searchTimer = null;
$("#searchBox").addEventListener("input", e => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { query = e.target.value.trim(); applyFilter(); }, 160);
});

/* ---------- Toast ---------- */

let toastTimer = null;
function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add("show"));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => { el.hidden = true; }, 300);
  }, 1800);
}

/* ---------- Call a server ---------- */

$("#bellBtn").addEventListener("click", () => {
  // In production this pings the floor staff with the table number.
  console.log("WAITER →", TABLE);
  haptic(true);
  toast(L().waiterToast);
});

// Rail follows scroll
addEventListener("scroll", () => {
  const pinned = $("#rail").getBoundingClientRect().top <= 2;
  $("#topChrome").classList.toggle("tucked", pinned);
  const chips = [...$("#railInner").children];
  const list = Object.values(chapterEls);
  if (!chips.length) return;
  let active = 0;
  const railH = $("#rail").offsetHeight + 10;
  list.forEach((el, i) => { if (el.getBoundingClientRect().top < railH) active = i; });
  chips.forEach((c, i) => c.classList.toggle("on", i === active));
  const chip = chips[active], railInner = $("#railInner");
  if (chip) railInner.scrollTo({
    left: chip.offsetLeft - railInner.clientWidth / 2 + chip.offsetWidth / 2,
    behavior: "smooth",
  });
}, { passive: true });

function renderAll() {
  renderStatic();
  if (!vBuilt) { buildVoyage(); startSteam($("#voyageSteam")); }
  else { vFocus = -1; updateVoyage(); }
  buildFinder();
  renderMenu();
  applyFilter();
  syncDock();
  if (!$("#detail").hidden && currentDish) fillDetail(currentDish);
  if (!$("#cart").hidden) renderCart();
}

$("#langToggle").addEventListener("click", () => {
  haptic();
  setLang(lang === "zh" ? "en" : "zh");
});

/* ============================== 3D tilt ============================== */

function attachTilt(tile) {
  const stage = tile.querySelector(".stage");
  let raf = null, t0 = null, p0 = null, active = false, dead = false;
  const apply = p => {
    const r = stage.getBoundingClientRect();
    const x = (p.clientX - r.left) / r.width - 0.5;
    const y = (p.clientY - r.top) / r.height - 0.5;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      stage.style.transform = `rotateY(${x * 16}deg) rotateX(${-y * 16}deg) scale(1.03)`;
      raf = null;
    });
  };
  const end = () => {
    active = false; dead = false; p0 = null;
    tile.classList.remove("tilting");
    stage.style.transform = "";
  };
  tile.addEventListener("touchstart", e => {
    t0 = performance.now(); p0 = e.touches[0]; active = false; dead = false;
  }, { passive: true });
  tile.addEventListener("touchmove", e => {
    if (dead) return;
    const p = e.touches[0];
    if (!active) {
      const dy = Math.abs(p.clientY - p0.clientY);
      // A vertical swipe soon after touch = the user is scrolling, not playing.
      if (dy > 12 && performance.now() - t0 < 160) { dead = true; return; }
      if (performance.now() - t0 > 140) { active = true; tile.classList.add("tilting"); }
      else return;
    }
    apply(p);
  }, { passive: true });
  tile.addEventListener("touchend", end);
  tile.addEventListener("touchcancel", end);
  tile.addEventListener("mouseenter", () => tile.classList.add("tilting"));
  tile.addEventListener("mousemove", e => apply(e));
  tile.addEventListener("mouseleave", end);
}

/* ============================== Detail (FLIP flight) ============================== */

const detail = $("#detail");
let currentDish = null, qty = 1, detailOrigin = null;

function fillDetail(d) {
  $("#detailGlow").style.setProperty("--glow-c", d.glow + "b8");
  $(".detail-hero").style.setProperty("--hero-glow-bg", shade(d.glow, -0.1));
  $("#detailArt").innerHTML = `<div class="food">${artFor(d)}</div>`;
  $("#detailCaption").innerHTML = `
    <div class="badges">
      <span class="badge-pill wood">${L().handmade}</span>
      ${d.best ? `<span class="badge-pill red">${L().bestSeller}</span>`
        : d.chef ? `<span class="badge-pill red">${L().chefsChoice}</span>` : ""}
    </div>
    <h2>${dishName(d)}</h2>
    <div class="cn-name">${dishSub(d)}</div>
    <div class="meta">${d.kcal} ${L().kcal} · ${fmt(d.price)}${d.pieces ? ` · ${d.pieces} ${L().pieces}` : ""}</div>`;

  const pairs = (d.pairings || []).map(id => MENU.find(x => x.id === id)).filter(Boolean);
  $("#detailBody").innerHTML = `
    <section>
      <div class="overline">${L().theFlavor}</div>
      <div class="flavor-text">${dishFlavor(d)}</div>
    </section>
    <section class="kitchen-card">
      <div class="overline">${L().fromKitchen}</div>
      <p>${dishStory(d)}</p>
      <div class="sig">${L().chefSig}</div>
    </section>
    <section>
      <div class="overline">${L().whatsInside}</div>
      <div class="ingredients">${d.ingredients.map(i =>
        `<div class="ing"><div class="em">${i.emoji}</div><div class="nm">${ingName(i.name)}</div></div>`).join("")}
      </div>
    </section>
    <section>
      <div class="overline">${L().onTheScale}</div>
      <div class="nutrition">
        <div class="dial">
          <svg width="100" height="100">
            <circle cx="50" cy="50" r="43" fill="none" stroke="var(--cream-deep)" stroke-width="8"/>
            <circle cx="50" cy="50" r="43" fill="none" stroke="url(#dialGrad)" stroke-width="8"
              stroke-linecap="round"
              style="stroke-dasharray:0 999; transition: stroke-dasharray 1.1s cubic-bezier(0.22,1,0.36,1) 0.45s;"
              class="dial-arc"/>
            <defs><linearGradient id="dialGrad"><stop offset="0" stop-color="var(--wood)"/><stop offset="1" stop-color="var(--red)"/></linearGradient></defs>
          </svg>
          <div class="val"><b>${d.kcal}</b><span>${L().kcal}</span></div>
        </div>
        <div class="macros">
          ${[[lang === "zh" ? "蛋白质" : "Protein", d.protein, 45, "var(--red)"],
             [lang === "zh" ? "碳水" : "Carbs", d.carbs, 80, "var(--wood)"],
             [lang === "zh" ? "脂肪" : "Fat", d.fat, 40, "#b39b6d"]].map(([n, v, m, c]) => `
            <div class="macro">
              <div class="row"><b>${n}</b><span>${v} g</span></div>
              <div class="track"><div class="fill" data-w="${Math.min(v / m, 1) * 100}" style="background:${c}"></div></div>
            </div>`).join("")}
        </div>
      </div>
      <div class="spice-row">
        <b>${L().spice}</b>
        <span class="flames">${d.spice ? "🔥".repeat(d.spice) : "—"}</span>
        <span>${L().spiceLevels[d.spice]}</span>
      </div>
    </section>
    ${d.allergens.length || d.sauce ? `<section>
      ${d.sauce ? `<div class="overline">${L().recSauce}</div>
        <div class="flavor-text" style="font-size:15px; margin-bottom:14px;">${dishSauce(d)}</div>` : ""}
      ${d.allergens.length ? `<div class="overline">${L().allergens}</div>
        <div class="chips">${d.allergens.map(a => `<span class="chip-sm">${allergen(a)}</span>`).join("")}</div>` : ""}
    </section>` : ""}
    ${pairs.length ? `<section>
      <div class="overline">${L().lovelyWith}</div>
      <div class="pairings">${pairs.map(p => `
        <button class="pairing" data-id="${p.id}">
          <div class="p-art">${artFor(p)}</div>
          <div class="p-name">${dishName(p)}</div>
          <div class="p-price">${fmt(p.price)}</div>
        </button>`).join("")}
      </div>
    </section>` : ""}`;

  $("#detailBody").querySelectorAll(".pairing").forEach(b =>
    b.addEventListener("click", () => {
      const p = MENU.find(x => x.id === b.dataset.id);
      if (!p) return;
      detail.classList.remove("staged");
      haptic();
      setTimeout(() => openDetail(p, b.querySelector(".p-art"), true), 60);
    }));

  renderDetailBar();
}

function openDetail(d, fromEl, alreadyOpen) {
  currentDish = d; qty = 1;
  detailOrigin = fromEl || null;
  haptic();
  fillDetail(d);

  const fromRect = fromEl ? fromEl.getBoundingClientRect() : null;
  detail.hidden = false;
  document.body.style.overflow = "hidden";

  requestAnimationFrame(() => {
    detail.classList.add("open");
    if (!alreadyOpen) detail.scrollTop = 0;
    else detail.scrollTo({ top: 0, behavior: "smooth" });
    const toRect = $("#detailArt").getBoundingClientRect();
    if (fromRect) {
      // The dish dissolves into gaussian splats, drifts as vapor,
      // and reassembles on the hero stage.
      const art = $("#detailArt");
      art.style.opacity = "0";
      if (fromEl) fromEl.style.opacity = "0";
      splatTransition(d, fromRect, toRect, {
        onNearEnd: () => {
          art.style.transition = "opacity 0.3s ease, transform 0.5s cubic-bezier(0.3, 1.6, 0.6, 1)";
          art.style.transform = "scale(0.92)";
          art.style.opacity = "1";
          requestAnimationFrame(() => { art.style.transform = "scale(1)"; });
          setTimeout(() => { art.style.transition = ""; art.style.transform = ""; }, 550);
        },
        onDone: () => { if (fromEl) fromEl.style.opacity = ""; },
      });
    }
    setTimeout(() => {
      detail.classList.add("staged");
      const arc = $(".dial-arc");
      if (arc) arc.style.strokeDasharray = `${270 * Math.min(currentDish.kcal / 900, 1)} 999`;
      detail.querySelectorAll(".fill").forEach(f => f.style.width = f.dataset.w + "%");
    }, fromRect ? 480 : 120);
    startSteam($("#steamCanvas"));
  });
}

function renderDetailBar() {
  $("#detailBar").innerHTML = `
    <div class="qty">
      <button id="qMinus">−</button><b>${qty}</b><button id="qPlus">+</button>
    </div>
    <button class="add-btn" id="addBtn">
      <span>${L().addToSteamer}</span><strong>${fmt(currentDish.price * qty)}</strong>
    </button>`;
  $("#qMinus").onclick = () => { if (qty > 1) { qty--; renderDetailBar(); haptic(); } };
  $("#qPlus").onclick = () => { qty++; renderDetailBar(); haptic(); };
  $("#addBtn").onclick = () => {
    addToCart(currentDish, qty, $("#detailArt"));
    setTimeout(() => { closeDetail(); openCart(); }, 480);
  };
}

function closeDetail() {
  // Reverse flight: the hero dissolves into splats that settle back
  // into the tile it came from, while the page fades in beneath.
  const d = currentDish, origin = detailOrigin;
  const art = $("#detailArt");
  detail.classList.remove("open", "staged");
  stopSteam($("#steamCanvas"));
  if (d && origin && origin.isConnected) {
    const to = origin.getBoundingClientRect();
    const visible = to.width > 20 && to.bottom > 0 && to.top < innerHeight;
    if (visible) {
      const from = art.getBoundingClientRect();
      art.style.opacity = "0";
      origin.style.opacity = "0";
      splatTransition(d, from, to, { duration: 620, onDone: () => {
        origin.style.opacity = "";
        art.style.opacity = "";
      }});
    }
  }
  setTimeout(() => {
    detail.hidden = true;
    detail.style.transform = "";
    $("#detailArt").style.opacity = "";
    if ($("#cart").hidden) document.body.style.overflow = "";
  }, 300);
}
$("#detailClose").addEventListener("click", closeDetail);

// Drag the hero down to dismiss — sheets should follow the finger.
(() => {
  const hero = $(".detail-hero");
  let startY = null, dy = 0;
  hero.addEventListener("touchstart", e => {
    if (detail.scrollTop > 4) return;
    startY = e.touches[0].clientY; dy = 0;
  }, { passive: true });
  hero.addEventListener("touchmove", e => {
    if (startY === null) return;
    dy = e.touches[0].clientY - startY;
    if (dy > 0) {
      detail.style.transition = "none";
      detail.style.transform = `translateY(${Math.pow(dy, 0.86)}px)`;
    }
  }, { passive: true });
  hero.addEventListener("touchend", () => {
    if (startY === null) return;
    detail.style.transition = "transform 0.35s cubic-bezier(0.22,1,0.36,1), opacity 0.28s ease";
    if (dy > 110) { detail.style.transform = "translateY(105%)"; closeDetail(); }
    else detail.style.transform = "";
    startY = null;
  });
})();

/* ============================== Steam (canvas) ============================== */

const steamState = new Map();
function startSteam(canvas) {
  const ctx = canvas.getContext("2d");
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;
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
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      g.addColorStop(0, `rgba(255, 252, 246, ${p.a * 0.14})`);
      g.addColorStop(0.6, `rgba(255, 252, 246, ${p.a * 0.07})`);
      g.addColorStop(1, "rgba(255, 252, 246, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 7);
      ctx.fill();
    }
    steamState.set(canvas, requestAnimationFrame(tick));
  };
  stopSteam(canvas);
  tick();
}
function stopSteam(canvas) {
  if (canvas && steamState.has(canvas)) {
    cancelAnimationFrame(steamState.get(canvas));
    steamState.delete(canvas);
  }
}

/* ============================== Cart ============================== */

const cart = new Map();
const saved = localStorage.getItem("dl-cart");
if (saved) try { JSON.parse(saved).forEach(([k, v]) => cart.set(k, v)); } catch (_) {}

function persist() { localStorage.setItem("dl-cart", JSON.stringify([...cart])); }
function cartCount() { return [...cart.values()].reduce((a, b) => a + b, 0); }
function cartTotal() { return [...cart].reduce((a, [id, q]) => a + (MENU.find(d => d.id === id) || {price: 0}).price * q, 0); }

function addToCart(d, n, fromEl) {
  cart.set(d.id, (cart.get(d.id) || 0) + n);
  persist(); syncDock(); haptic(true);
  const dock = $("#dockCart");
  dock.classList.remove("pulse"); void dock.offsetWidth; dock.classList.add("pulse");
  if (fromEl) flyToDock(d, fromEl);
  toast(L().addedToast(dishName(d)));
}

// Quantity badges on the tiles themselves — you can see your order at a glance.
function updateTileBadges() {
  tileIndex.forEach(({ el, d }) => {
    let b = el.querySelector(".in-cart");
    const q = cart.get(d.id) || 0;
    if (q && !b) {
      b = document.createElement("div");
      b.className = "in-cart";
      el.querySelector(".stage").appendChild(b);
    }
    if (b) { if (q) b.textContent = q; else b.remove(); }
  });
}

// A pinch of the dish — as gaussian vapor — flies into the steamer.
function flyToDock(d, fromEl) {
  const from = fromEl.getBoundingClientRect();
  const dock = $("#dockCart").getBoundingClientRect();
  const to = { left: dock.left + 22, top: dock.top + 6, width: 44, height: 30 };
  splatTransition(d, from, to, { count: 260, duration: 640 });
}

function syncDock() {
  const n = cartCount();
  $("#cartBadge").hidden = n === 0;
  $("#cartBadge").textContent = n;
  $("#dockTotal").textContent = n ? fmt(cartTotal()) : "";
  if (typeof tileIndex !== "undefined") updateTileBadges();
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
    $("#cart").style.transform = "";
    if (detail.hidden) document.body.style.overflow = "";
  }, 400);
}
$("#dockCart").addEventListener("click", openCart);
$("#cartScrim").addEventListener("click", closeCart);

// Drag the drawer down to close.
(() => {
  const drawer = $("#cart");
  let startY = null, dy = 0;
  drawer.addEventListener("touchstart", e => {
    if (drawer.scrollTop > 4) return;
    startY = e.touches[0].clientY; dy = 0;
  }, { passive: true });
  drawer.addEventListener("touchmove", e => {
    if (startY === null) return;
    dy = e.touches[0].clientY - startY;
    if (dy > 0) { drawer.style.transition = "none"; drawer.style.transform = `translateY(${dy}px)`; }
  }, { passive: true });
  drawer.addEventListener("touchend", () => {
    if (startY === null) return;
    drawer.style.transition = "";
    if (dy > 130) closeCart(); else drawer.style.transform = "";
    startY = null;
  });
})();

function renderCart() {
  const items = $("#cartItems");
  const n = cartCount();
  $("#cartTitle").innerHTML = lang === "zh" ? `蒸笼 <span class="cn">The Steamer</span>` : `The Steamer <span class="cn">蒸笼</span>`;
  $("#cartSubtitle").textContent = n ? L().steamerSub(n, TABLE) : "";
  $("#noteLabel").textContent = L().noteLabel;
  $("#orderNote").placeholder = L().notePlaceholder;
  $("#orderNote").value = localStorage.getItem("dl-note") || "";
  if (!n) {
    items.innerHTML = `<div class="cart-empty">${L().emptyCart}</div>`;
    $("#cartTotals").innerHTML = "";
    $("#sendOrder").style.display = "none";
    $("#noteWrap").style.display = "none";
    renderHistory();
    return;
  }
  $("#sendOrder").style.display = "";
  $("#noteWrap").style.display = "";
  items.innerHTML = [...cart].map(([id, q]) => {
    const d = MENU.find(x => x.id === id);
    if (!d) return "";
    return `<div class="cart-line">
      <div class="thumb">${artFor(d)}</div>
      <div class="info"><div class="nm">${dishName(d)}</div><div class="pr">${fmt(d.price)}</div></div>
      <div class="qty">
        <button data-id="${id}" data-d="-1">−</button><b>${q}</b><button data-id="${id}" data-d="1">+</button>
      </div>
    </div>`;
  }).join("");
  items.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
    const id = b.dataset.id, q = (cart.get(id) || 0) + Number(b.dataset.d);
    if (q <= 0) cart.delete(id); else cart.set(id, q);
    persist(); syncDock(); renderCart(); haptic();
  }));
  const kcal = [...cart].reduce((a, [id, q]) => a + (MENU.find(d => d.id === id) || {kcal: 0}).kcal * q, 0);
  $("#cartTotals").innerHTML = `
    <div class="row"><span>${L().kitchenTotal}</span><b>${fmt(cartTotal())}</b></div>
    <div class="row"><span>${L().estCalories}</span><b>≈ ${kcal} ${L().kcal}</b></div>
    <div class="row"><span>${L().steamTime}</span><b>${L().steamTimeVal}</b></div>`;
  $("#sendLabel").textContent = L().send;
  $("#sendTotal").textContent = fmt(cartTotal());
  $("#cartBell").textContent = "🔔 " + L().waiter;
  renderHistory();
}

// What this table has already sent to the kitchen — the add-a-round view.
function renderHistory() {
  const past = JSON.parse(localStorage.getItem("dl-orders") || "[]");
  const el = $("#history");
  if (!past.length) { el.innerHTML = ""; return; }
  el.innerHTML = `<p class="overline">${L().historyTitle}</p>` + past.slice(-4).reverse().map(o => {
    const names = o.items.map(([id, q]) => {
      const d = MENU.find(x => x.id === id);
      return d ? `${dishName(d)} ×${q}` : "";
    }).filter(Boolean).join("、");
    return `<div class="h-order">
      <div class="h-head"><span>${L().historyOrder(o.no, fmt(o.total))}</span></div>
      <div class="h-items">${names}</div>
    </div>`;
  }).join("");
}

$("#orderNote").addEventListener("input", e => localStorage.setItem("dl-note", e.target.value));

$("#cartBell").addEventListener("click", () => {
  console.log("WAITER →", TABLE);
  haptic(true);
  toast(L().waiterToast);
});

$("#sendOrder").addEventListener("click", () => {
  // In production this POSTs to the ordering backend with the table number.
  const orderNo = String(Math.floor(1000 + Math.random() * 9000));
  const order = {
    table: TABLE, no: orderNo, items: [...cart],
    note: ($("#orderNote").value || "").trim() || null,
    total: cartTotal(), at: new Date().toISOString(),
  };
  console.log("ORDER →", JSON.stringify(order));
  const past = JSON.parse(localStorage.getItem("dl-orders") || "[]");
  past.push(order);
  localStorage.setItem("dl-orders", JSON.stringify(past));
  cart.clear(); persist(); syncDock(); closeCart();
  localStorage.removeItem("dl-note");
  $("#orderedNote").textContent = L().orderedNote(TABLE, orderNo);
  $("#ordered").hidden = false;
  startSteam($("#orderSteam"));
  haptic(true);
});
$("#orderedDone").addEventListener("click", () => {
  $("#ordered").hidden = true;
  stopSteam($("#orderSteam"));
  document.body.style.overflow = "";
});

/* ============================== Haptics-ish ============================== */

function haptic(strong) {
  if (navigator.vibrate) navigator.vibrate(strong ? 18 : 8);
}

/* ============================== Boot ============================== */

renderAll();

/* Debug hooks: #dish=<id> opens a dish page, #cart opens the steamer. */
function runHashHook() {
  const h = location.hash;
  if (h.startsWith("#dish=")) {
    const d = MENU.find(x => x.id === h.slice(6));
    const tile = tileIndex.find(t => t.d.id === h.slice(6));
    if (d && tile) {
      // Reproduce the real gesture: tile visible on screen, then opened.
      tile.el.scrollIntoView({ block: "center", behavior: "instant" });
      setTimeout(() => openDetail(d, tile.el.querySelector(".stage")), 700);
    } else if (d) setTimeout(() => openDetail(d, null), 400);
  } else if (h === "#cart") {
    if (!cart.size) { addToCart(MENU[0], 2); addToCart(MENU.find(d => d.id === "beef-yolk-bowl"), 1); addToCart(MENU.find(d => d.id === "mango-sago"), 2); }
    setTimeout(openCart, 400);
  } else if (h.startsWith("#go=")) {
    const i = parseInt(h.slice(4), 10) || 0;
    setTimeout(() => { const c = $("#railInner").children[i]; if (c) c.click(); }, 600);
  } else if (h === "#ordered") {
    $("#orderedNote").textContent = L().orderedNote(TABLE, "8888");
    $("#ordered").hidden = false;
    startSteam($("#orderSteam"));
  }
}
addEventListener("load", runHashHook);
addEventListener("hashchange", runHashHook);
