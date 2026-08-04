/* Dumpling Lab — procedural dish illustrations (SVG fallback when no photo). */

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
  if (d.img) return `<img src="img/${d.img}" alt="${d.cn||d.name||''}" loading="lazy" draggable="false"
    onerror="__artFallback(this, '${d.id}')">`;
  return svgArtFor(d);
}
