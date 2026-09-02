/* Dumpling Lab — procedural dish illustrations (drawn when a dish has no photo).

   The drawing language is taken straight off the logo: one hairline weight,
   one ink (brand red) on paper, true circles, and solid red reserved for the
   few marks that behave like the 饺 seal. Nothing here tries to look like a
   photograph — the photographed and 3D dishes carry that job, and a beige
   gradient rendering of 57 other dishes only made the menu look like the same
   asset repeated. Line drawings stay honest, stay light, and stay on brand.

   Every shape is stroked, never shaded. Overlaps are resolved by filling with
   the page colour (--art-fill) so a stack of dumplings still reads as a stack. */

const RED = "#e51b00";
const FILL = "var(--art-fill,#f2f4f6)";
// The pen is the wordmark's pen. These are device px, held flat across every
// tile size by vector-effect:non-scaling-stroke — a drawing that out-weighs the
// logo beside it stops reading as the same hand and starts reading as a marker.
const W_BODY = 1.4;    // silhouette, in device px (see non-scaling-stroke)
const W_LINE = 1.0;    // interior detail
const W_HAIR = 0.75;   // texture and ground

function artHash(value) {
  let h = 2166136261;
  for (const ch of String(value || "dish")) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// Two dishes side by side must never draw the same picture, so every
// composition is indexed by the dish's own position in the menu.
function variant(d, count) {
  const ordinal = typeof MENU === "undefined" ? artHash(d.id) : Math.max(0, MENU.indexOf(d));
  return (ordinal + artHash(d.id)) % count;
}

function frame(body) {
  return `<svg viewBox="0 0 120 100" fill="none" stroke="${RED}"
    stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}

// A single hairline ellipse instead of a blurred grey blob: the object sits on
// the page rather than floating over a smudge.
function ground(cx = 60, cy = 88, rx = 34) {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="4.2" stroke-width="${W_HAIR}" opacity=".38"/>`;
}

/* What is *in* the dish is the only thing allowed to vary the marks: chilli
   reads as solid seal-red dots, anything vegetarian as an outlined leaf, and
   everything else as a short scored tick. */
function marks(d, spots) {
  const hot = (d.spice || 0) >= 2;
  const veg = d.veg || d.meat === "vegan" || d.meat === "vegetarian";
  return spots.map(([x, y, rot = 0], i) => {
    if (hot) return `<circle cx="${x}" cy="${y}" r="${i % 2 ? 1.5 : 1.1}" fill="${RED}" stroke="none"/>`;
    if (veg) return `<path d="M${x},${y - 3.4} q4.2,3.4 0,6.8 q-4.2,-3.4 0,-6.8 Z"
      stroke-width="${W_HAIR}" transform="rotate(${rot} ${x} ${y})"/>`;
    return `<path d="M${x},${y - 2.6} v5.2" stroke-width="${W_LINE}"
      transform="rotate(${rot} ${x} ${y})"/>`;
  }).join("");
}

function markSpots(d, box) {
  const seed = artHash(d.id);
  return Array.from({ length: 5 }, (_, i) => {
    const n = (seed >>> (i * 4)) & 15;
    return [box.x + ((n * 17 + i * 13) % box.w), box.y + ((n * 7 + i * 5) % box.h), n * 24];
  });
}

/* ---------------- dumplings ---------------- */

function dumplingSVG(d, crisped) {
  // One dumpling, drawn at unit scale and placed by the arrangements below.
  const one = (w, x, y) => {
    const pleats = [0.16, 0.3, 0.44, 0.58, 0.72, 0.86].map(t => {
      const px = 10 + t * 74, py = 37 - Math.sin(t * Math.PI) * 21;
      const len = 12 + Math.sin(t * Math.PI) * 5, lean = (t - 0.5) * 13;
      return `<path d="M${px},${py} q${lean * 0.4},${len * 0.55} ${lean},${len}" stroke-width="${W_LINE}"/>`;
    }).join("");
    // A seared base is scored, not shaded — short strokes hugging the bottom.
    const crust = crisped ? [0.2, 0.35, 0.5, 0.65, 0.8].map(t => {
      const px = 12 + t * 70;
      return `<path d="M${px},${62 - Math.abs(t - 0.5) * 12} v4.5" stroke-width="${W_HAIR}" opacity=".75"/>`;
    }).join("") : "";
    return `<g transform="translate(${x} ${y}) scale(${w / 94})">
      <path d="M6,39 C11,64 29,66 47,66 C65,66 83,64 88,39 C76,4 18,4 6,39 Z"
        fill="${FILL}" stroke-width="${W_BODY}"/>
      <path d="M10,37 C22,12 72,12 84,37" stroke-width="${W_LINE}" opacity=".9"/>
      ${pleats}${crust}
    </g>`;
  };
  const arrangements = [
    `${one(56, 6, 34)}${one(54, 58, 36)}${one(78, 21, 12)}`,
    `${one(62, 3, 31)}${one(64, 55, 30)}${one(76, 22, 13)}`,
    `${one(68, 1, 28)}${one(82, 40, 14)}`,
    `${one(48, 1, 38)}${one(54, 34, 27)}${one(49, 72, 37)}`,
  ];
  return frame(`${ground(60, 87, 36)}
    ${arrangements[variant(d, arrangements.length)]}
    ${marks(d, markSpots(d, { x: 26, y: 50, w: 68, h: 22 }))}`);
}

/* ---------------- steamer of buns ---------------- */

function bunSVG(d) {
  // The pleat on top of a bun is a spiral; drawn open so it stays legible small.
  const bun = (r, x, y) => `
    <circle cx="${x}" cy="${y}" r="${r}" fill="${FILL}" stroke-width="${W_BODY}"/>
    <path d="M${x},${y - r * 0.52} a${r * 0.3},${r * 0.3} 0 1 1 -${r * 0.28},${r * 0.3}"
      stroke-width="${W_LINE}" opacity=".9"/>
    ${[-0.5, 0, 0.5].map(k => `<path d="M${x + k * r * 0.9},${y + r * 0.1}
      q${r * 0.12},${r * 0.4} 0,${r * 0.72}" stroke-width="${W_HAIR}" opacity=".55"/>`).join("")}`;
  const arrangements = [
    `${bun(16, 32, 58)}${bun(16, 88, 58)}${bun(21, 60, 47)}`,
    `${bun(14, 27, 60)}${bun(19, 61, 49)}${bun(15, 91, 59)}`,
    `${bun(20, 41, 54)}${bun(20, 79, 54)}`,
    `${bun(13, 24, 62)}${bun(16, 49, 55)}${bun(19, 76, 48)}${bun(13, 97, 62)}`,
  ];
  // Bamboo steamer: two rings and the slats between them.
  const steamer = `
    <path d="M14,72 a46,12 0 0 0 92,0" fill="${FILL}" stroke="none"/>
    <ellipse cx="60" cy="72" rx="46" ry="12" fill="${FILL}" stroke-width="${W_BODY}"/>
    <path d="M14,72 v7 a46,12 0 0 0 92,0 v-7" stroke-width="${W_BODY}"/>
    ${Array.from({ length: 9 }, (_, i) => {
      const x = 20 + i * 10;
      return `<path d="M${x},${76 + Math.abs(i - 4) * -0.9 + 3.5} v6" stroke-width="${W_HAIR}" opacity=".5"/>`;
    }).join("")}`;
  return frame(`${ground(60, 90, 42)}${steamer}${arrangements[variant(d, arrangements.length)]}`);
}

/* ---------------- bowls ---------------- */

function steam(x, y) {
  return [0, 1, 2].map(i => `<path d="M${x + i * 9 - 9},${y - i % 2 * 3}
    c-3.5,-5 3.5,-7 0,-12" stroke-width="${W_HAIR}" opacity=".5"/>`).join("");
}

function bowlSVG(d, kind) {
  let contents = "";
  if (kind === "noodles") {
    contents = [0.28, 0.44, 0.6, 0.74].map(t =>
      `<path d="M30,${44 + t * 13} C 44,${38 + t * 13} 76,${50 + t * 13} 90,${43 + t * 13}"
        stroke-width="${W_LINE}"/>`).join("") +
      `<circle cx="79" cy="46" r="7" fill="${FILL}" stroke-width="${W_LINE}"/>
       <circle cx="79" cy="46" r="3.2" fill="${RED}" stroke="none"/>`;
  }
  if (kind === "rice") {
    contents = Array.from({ length: 14 }, (_, i) => {
      const a = i * 2.4, r = Math.sqrt((i % 9) / 9) * 21;
      const x = 60 + Math.cos(a) * r, y = 47 + Math.sin(a) * r * 0.42;
      return `<ellipse cx="${x}" cy="${y}" rx="3.1" ry="1.5" stroke-width="${W_HAIR}"
        transform="rotate(${i * 37} ${x} ${y})"/>`;
    }).join("");
  }
  if (kind === "wontons") {
    contents = [[45, 48], [62, 44], [77, 49]].map(([x, y]) =>
      `<path d="M${x - 9},${y + 4} q2,-10 9,-11 q8,1 10,9 q-3,7 -10,7 q-7,-1 -9,-5 Z"
        fill="${FILL}" stroke-width="${W_LINE}"/>`).join("");
  }
  if (kind === "broth") {
    contents = `<path d="M40,46 q10,-4 20,0 q10,4 20,0" stroke-width="${W_LINE}" opacity=".8"/>
      <path d="M44,52 q9,-3.5 17,0" stroke-width="${W_HAIR}" opacity=".6"/>`;
  }
  return frame(`${ground(60, 88, 38)}
    ${steam(58, 26)}
    <path d="M18,44 C22,73 40,81 60,81 C80,81 98,73 102,44 Z" fill="${FILL}" stroke-width="${W_BODY}"/>
    <ellipse cx="60" cy="44" rx="42" ry="11.5" fill="${FILL}" stroke-width="${W_BODY}"/>
    ${contents}
    <path d="M32,40 L16,20 M37,39 L23,18" stroke-width="${W_LINE}" opacity=".85"/>
    ${marks(d, markSpots(d, { x: 40, y: 40, w: 40, h: 12 }))}`);
}

/* ---------------- plates ---------------- */

function plateSVG(d, leaves) {
  const bits = Array.from({ length: leaves ? 9 : 8 }, (_, i) => {
    const a = i * 2.4 + 0.7, r = Math.sqrt(((i * 7) % 10) / 10) * 19;
    const x = 60 + Math.cos(a) * r, y = 50 + Math.sin(a) * r * 0.5 - 3;
    const rot = (i * 53) % 180;
    return leaves
      ? `<path d="M${x},${y - 7} q7,7 0,14 q-7,-7 0,-14 Z" fill="${FILL}" stroke-width="${W_LINE}"
           transform="rotate(${rot} ${x} ${y})"/>
         <path d="M${x},${y - 6} v12" stroke-width="${W_HAIR}" opacity=".6"
           transform="rotate(${rot} ${x} ${y})"/>`
      : `<rect x="${x - 7}" y="${y - 4.5}" width="14" height="9" rx="4.5" fill="${FILL}"
           stroke-width="${W_LINE}" transform="rotate(${rot} ${x} ${y})"/>`;
  }).join("");
  return frame(`${ground(60, 86, 40)}
    <ellipse cx="60" cy="58" rx="45" ry="15" fill="${FILL}" stroke-width="${W_BODY}"/>
    <ellipse cx="60" cy="56" rx="36" ry="11.5" stroke-width="${W_HAIR}" opacity=".55"/>
    ${bits}
    ${marks(d, markSpots(d, { x: 42, y: 44, w: 36, h: 14 }))}`);
}

/* ---------------- cups ---------------- */

function cupSVG(d) {
  const seed = artHash(d.id);
  const pearls = Array.from({ length: 6 }, (_, i) => {
    const n = (seed >>> (i * 3)) & 7;
    return `<circle cx="${45 + ((n * 11 + i * 9) % 30)}" cy="${66 + (n % 4) * 3}" r="3"
      stroke-width="${W_HAIR}"/>`;
  }).join("");
  return frame(`${ground(60, 88, 26)}
    <path d="M36,30 C36,58 42,76 48,80 Q60,86 72,80 C78,76 84,58 84,30 Z"
      fill="${FILL}" stroke-width="${W_BODY}"/>
    <ellipse cx="60" cy="30" rx="24" ry="7" fill="${FILL}" stroke-width="${W_BODY}"/>
    <path d="M52,29 q8,-3 16,0" stroke-width="${W_HAIR}" opacity=".6"/>
    ${pearls}
    <path d="M70,30 L78,8" stroke-width="${W_LINE}"/>
    ${marks(d, [[54, 46, 20], [66, 52, 70]])}`);
}

// If a photo 404s (e.g. not uploaded yet), fall back to procedural art in place.
window.__artFallback = (img, id) => {
  const d = MENU.find(x => x.id === id);
  if (!d || !img.parentElement) return;
  if (d.cover) d.cover = null;
  else d.img = null;
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

// The card shows the restaurant's own photograph whenever one exists: it is
// real, while a 3D cover is a single-image inference. The model still drives
// the detail view, where the guest can turn it. Covers only fill in for
// dishes that were generated without a photo of their own.
// At rest every photographed dish is its one-ink halftone plate; the colour
// photograph only appears when the guest touches it and the print comes alive.
// The print treatment belongs to the interface, not to the food: the
// restaurant's photographs are shown untouched. Kept as a switch only.
function printFor(d) {
  return null;
}

function artFor(d) {
  const print = printFor(d);
  if (print) return `<img src="${print}" alt="${d.cn||d.name||''}" loading="lazy" draggable="false"
    onerror="__artFallback(this, '${d.id}')">`;
  const image = d.img || d.cover;
  if (image) return `<img src="img/${image}" alt="${d.cn||d.name||''}" loading="lazy" draggable="false"
    onerror="__artFallback(this, '${d.id}')">`;
  return svgArtFor(d);
}
