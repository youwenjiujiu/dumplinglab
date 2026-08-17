/* Dumpling Lab — procedural dish illustrations (SVG fallback when no photo). */

function shade(hex, f) {
  const v = hex.match(/\w\w/g).map(h => parseInt(h, 16));
  const t = f < 0 ? 0 : 255, a = Math.abs(f);
  return "#" + v.map(c => Math.round(c + (t - c) * a).toString(16).padStart(2, "0")).join("");
}

function artHash(value) {
  let h = 2166136261;
  for (const ch of String(value || "dish")) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// Natural garnish colour is driven by what is actually in the dish. This
// stops a long menu from looking like the same beige asset duplicated 57x,
// while keeping wrappers, bowls and plates materially believable.
function naturalAccent(d) {
  if (/mango/i.test(d.id)) return "#e6a733";
  if (/watermelon/i.test(d.id)) return "#d7665d";
  if (/cucumber/i.test(d.id)) return "#78a36b";
  if ((d.spice || 0) >= 2) return "#b94f30";
  const choices = {
    shrimp:["#df8064", "#d59b4a"],
    beef:["#785141", "#809064"],
    chicken:["#78915d", "#c78c4d"],
    pork:["#68885e", "#a96b4c"],
    vegan:["#56805a", "#8ca35b"],
    vegetarian:["#638864", "#ac974e"],
  };
  const set = choices[d.meat] || ["#6f8c61", "#b47b50"];
  return set[artHash(d.id) % set.length];
}

function garnishSVG(d, kind) {
  const seed = artHash(d.id);
  const accent = naturalAccent(d);
  const dark = (d.spice || 0) >= 2 ? "#7f281d" : "#3f5c3e";
  const area = {
    dumpling:{ x0:25, span:70, y0:48, ySpan:25 },
    bun:{ x0:34, span:52, y0:45, ySpan:22 },
    bowl:{ x0:38, span:44, y0:43, ySpan:14 },
    plate:{ x0:38, span:44, y0:42, ySpan:19 },
    cup:{ x0:47, span:27, y0:23, ySpan:13 },
  }[kind];
  return `<g opacity="0.92">${Array.from({length:5},(_,i)=>{
    const n = (seed >>> (i * 4)) & 15;
    const x = area.x0 + ((n * 17 + i * 13) % area.span);
    const y = area.y0 + ((n * 7 + i * 5) % area.ySpan);
    if (d.veg || d.meat === "vegan" || d.meat === "vegetarian") {
      return `<path d="M${x},${y-3} q5,3 0,7 q-5,-3 0,-7 Z" fill="${i%2?accent:dark}" transform="rotate(${n*11} ${x} ${y})"/>`;
    }
    if ((d.spice || 0) >= 2 || d.meat === "shrimp") {
      return `<circle cx="${x}" cy="${y}" r="${1.2+(n%3)*.35}" fill="${i%2?accent:dark}"/>`;
    }
    return `<rect x="${x-1.4}" y="${y-3}" width="2.8" height="6" rx="1.4" fill="${i%2?accent:dark}" transform="rotate(${n*14} ${x} ${y})"/>`;
  }).join("")}</g>`;
}

function dumplingSVG(d, crisped) {
  const seed = artHash(d.id);
  const ordinal = typeof MENU === "undefined" ? seed : Math.max(0, MENU.indexOf(d));
  const skin = shade(d.skin, (((ordinal + seed) % 7) - 3) * .018), dark = shade(skin, -0.3), lite = shade(skin, 0.45);
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
  const arrangements = [
    `${one(56, 6, 34, 0.92)}${one(54, 58, 36, 0.88)}${one(78, 21, 12, 1)}`,
    `${one(62, 3, 31, 0.9)}${one(64, 55, 30, 0.9)}${one(76, 22, 13, 1)}`,
    `${one(68, 1, 28, 0.94)}${one(82, 40, 14, 1)}`,
    `${one(48, 1, 38, 0.82)}${one(54, 34, 27, 1)}${one(49, 72, 37, 0.88)}`,
  ];
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
    ${arrangements[ordinal % arrangements.length]}
  </svg>`;
}

function bunSVG(d) {
  const seed = artHash(d.id);
  const ordinal = typeof MENU === "undefined" ? seed : Math.max(0, MENU.indexOf(d));
  const skin = shade(d.skin, (((ordinal + seed) % 5) - 2) * .022), lite = shade(skin, 0.5);
  const bun = (r, x, y) => `
    <circle cx="${x}" cy="${y}" r="${r}" fill="url(#bun${d.id})"/>
    <path d="M${x - r * 0.35},${y - r * 0.45} q${r * 0.35},-${r * 0.28} ${r * 0.7},0"
      fill="none" stroke="${shade(skin, -0.25)}" stroke-width="1.6" opacity="0.6" stroke-linecap="round"/>
    <ellipse cx="${x}" cy="${y + r * 0.55}" rx="${r * 0.72}" ry="${r * 0.3}" fill="${d.accent}" opacity="0.28"/>`;
  const arrangements = [
    `${bun(17, 32, 62)}${bun(17, 88, 62)}${bun(22, 60, 52)}`,
    `${bun(15, 27, 64)}${bun(20, 61, 54)}${bun(16, 91, 63)}`,
    `${bun(21, 41, 58)}${bun(21, 79, 58)}`,
    `${bun(14, 24, 66)}${bun(17, 49, 59)}${bun(20, 75, 53)}${bun(14, 96, 66)}`,
  ];
  return `<svg viewBox="0 0 120 100">
    <defs><radialGradient id="bun${d.id}" cx="0.36" cy="0.3" r="0.95">
      <stop offset="0" stop-color="${lite}"/><stop offset="1" stop-color="${shade(skin, -0.1)}"/>
    </radialGradient></defs>
    <ellipse cx="60" cy="88" rx="44" ry="7" fill="rgba(0,0,0,0.3)"/>
    <path d="M14,74 a46,14 0 0 1 92,0 v6 a46,14 0 0 1 -92,0 Z" fill="${shade(d.accent,-.15)}"/>
    <ellipse cx="60" cy="74" rx="46" ry="13" fill="${shade(d.accent,.18)}"/>
    ${arrangements[ordinal % arrangements.length]}
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
    ${garnishSVG(d, "bowl")}
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
    <circle cx="72" cy="42" r="2.2" fill="${naturalAccent(d)}"/>
    ${garnishSVG(d, "plate")}
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
    <ellipse cx="60" cy="29" rx="24" ry="7" fill="${naturalAccent(d)}"/>
    ${[0, 1, 2, 3].map(i => `<circle cx="${48 + i * 8}" cy="${24 - (i % 2) * 3}" r="3.4" fill="#fffdf6" opacity="0.9"/>`).join("")}
    <rect x="72" y="12" width="3" height="10" rx="1.5" fill="#5f8766" transform="rotate(18 73 17)"/>
    ${garnishSVG(d, "cup")}
  </svg>`;
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

function artFor(d) {
  const image = d.cover || d.img;
  if (image) return `<img src="img/${image}" alt="${d.cn||d.name||''}" loading="lazy" draggable="false"
    onerror="__artFallback(this, '${d.id}')">`;
  return svgArtFor(d);
}
