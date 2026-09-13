/* Dumpling Lab — placeholder dish photographs.
   Every dish is rendered in the same studio: one plain white vessel, one
   30° three-quarter angle, one soft light from the upper left, cut out on
   a transparent background — so a menu of them reads as a single shoot.
   These are stand-ins for the restaurant's own photography: they are
   written into menu-data.js with `placeholder: true` and the menu marks
   them, so they can never be mistaken for the real dish.
   Usage: node scripts/gen-dish-image.mjs <dish-id> [more ids…]
          node scripts/gen-dish-image.mjs --all [--limit N] */
import { writeFileSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { optimise } from "./optimise-images.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const IMG = join(ROOT, "web", "img");
const MENU_FILE = join(ROOT, "web", "menu-data.js");
const key = process.env.OPENAI_API_KEY || execFileSync("security", ["find-generic-password", "-s", "dumplinglab-openai", "-w"], { encoding: "utf8" }).trim();

/* The drawing profile already says what the dish is served in. */
const VESSEL = {
  noodleBowl: "a wide shallow plain white ceramic noodle bowl",
  soupBowl: "a deep plain white ceramic soup bowl",
  riceBowl: "a plain white ceramic rice bowl",
  wonton: "a wide shallow plain white ceramic bowl",
  soupDumpling: "a small round bamboo steamer with a plain white plate under it",
  pleatedDumpling: "a small round bamboo steamer with a plain white plate under it",
  pleatedDumplingCrisped: "a plain white ceramic plate",
  sidePlate: "a small plain white ceramic plate",
  greens: "a small plain white ceramic plate",
  dessertCup: "a clear glass cup on a small white saucer",
};

export function promptFor(d) {
  const vessel = VESSEL[d.art] || "a plain white ceramic plate";
  const what = [d.name, d.flavor].filter(Boolean).join(" — ");
  return `A single serving of ${what}, a Chinese restaurant dish, served in ${vessel}.
Studio food photograph: camera at a 30 degree elevated three-quarter angle, the dish centred and filling most of the frame, soft diffuse light from the upper left, gentle natural shadows on the food itself, colours true to the ingredients.
Cut out cleanly on a fully transparent background — no table, no surface, no backdrop, no shadow on the ground, no props, no chopsticks, no napkins, no hands, no text, no watermark, no logo, no garnish that is not part of the dish.
Photorealistic, sharp focus, appetising, no illustration, no 3D render look.`;
}

export async function generate(d) {
  const body = {
    model: "gpt-image-1",
    prompt: promptFor(d),
    size: "1024x1024",
    quality: process.env.IMG_QUALITY || "medium",
    background: "transparent",
    output_format: "png",
    n: 1,
  };
  // The image endpoint rate-limits hard; back off and retry rather than lose the dish.
  let data = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let parsed = null;
    try { parsed = JSON.parse(text); } catch {}
    if (res.ok && parsed?.data?.[0]?.b64_json) { data = parsed; break; }
    const retryable = res.status === 429 || res.status >= 500 || !parsed;
    const why = parsed?.error?.message || `${res.status} ${text.slice(0, 80).replace(/\s+/g, " ")}`;
    if (!retryable || attempt === 4) throw new Error(why);
    const wait = Number(res.headers.get("retry-after")) * 1000 || (4000 * 2 ** attempt) + Math.random() * 1500;
    await new Promise(r => setTimeout(r, wait));
  }
  const name = `${d.id}-placeholder.png`;
  writeFileSync(join(IMG, name), Buffer.from(data.data[0].b64_json, "base64"));
  await optimise(name);
  return name;
}

function menuBounds(source) {
  const key = "MENU = [";
  const at = source.indexOf(key);
  if (at < 0) throw new Error("menu-data.js: MENU array not found");
  const start = at + key.length - 1;                 // the "["
  const end = source.indexOf("\n];", start);
  if (end < 0) throw new Error("menu-data.js: MENU array not terminated");
  return { start, end: end + 2 };                    // just past the "]"
}
function readMenu() {
  const source = readFileSync(MENU_FILE, "utf8");
  const { start, end } = menuBounds(source);
  return { source, start, end, menu: JSON.parse(source.slice(start, end)) };
}
function writeMenu(file, menu) {
  writeFileSync(MENU_FILE, file.source.slice(0, file.start) + JSON.stringify(menu, null, 1) + file.source.slice(file.end));
}

if (process.argv[1] && process.argv[1].endsWith("gen-dish-image.mjs")) {
  const args = process.argv.slice(2);
  const file = readMenu();
  let targets;
  if (args[0] === "--all") {
    const limit = args.includes("--limit") ? Number(args[args.indexOf("--limit") + 1]) : Infinity;
    targets = file.menu.filter(d => !d.img).slice(0, limit);
  } else targets = args.map(id => file.menu.find(d => d.id === id)).filter(Boolean);
  if (!targets.length) { console.log("nothing to do"); process.exit(0); }

  const CONCURRENCY = Number(process.env.CONCURRENCY || 2);
  let done = 0, failed = 0;
  const queue = [...targets];
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    while (queue.length) {
      const d = queue.shift();
      try {
        const name = await generate(d);
        const live = readMenu();                       // re-read: other workers write too
        const dish = live.menu.find(x => x.id === d.id);
        dish.img = name; dish.placeholder = true;
        writeMenu(live, live.menu);
        console.log(`✓ ${++done}/${targets.length} ${d.id} (${d.cn})`);
      } catch (error) {
        failed++;
        console.log(`✗ ${d.id}: ${error.message.split("\n")[0]}`);
      }
    }
  }));
  console.log(`\ndone: ${done} generated, ${failed} failed`);
}
