/* Dumpling Lab — web-sized copies of the dish photographs.
   The cutout PNGs (1–2 MB each) stay as the source of truth for the 3D
   pipeline; the site loads WebP copies: img/s/ (720px, tiles and cover)
   and img/l/ (1400px, dish page and photo projection). Alpha is kept, the
   pixels are only resized — never recoloured.
   Usage: node scripts/optimise-images.mjs [name.png ...]   (default: every photo in menu-data.js) */
import sharp from "sharp";
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const IMG = join(ROOT, "web", "img");
export async function optimise(name) {
  const src = join(IMG, name);
  if (!existsSync(src)) throw new Error(`missing ${name}`);
  const base = name.replace(/\.(png|jpe?g|webp)$/i, "");
  const out = [];
  for (const [dir, size, quality] of [["s", 720, 82], ["l", 1400, 86]]) {
    mkdirSync(join(IMG, dir), { recursive: true });
    const dest = join(IMG, dir, `${base}.webp`);
    const info = await sharp(src).resize(size, size, { fit: "inside", withoutEnlargement: true }).webp({ quality, alphaQuality: 92, effort: 5 }).toFile(dest);
    out.push(`${dir}/${base}.webp ${(info.size / 1024).toFixed(0)}KB`);
  }
  return out;
}
if (process.argv[1] && process.argv[1].endsWith("optimise-images.mjs")) {
  let names = process.argv.slice(2);
  if (!names.length) {
    const source = readFileSync(join(ROOT, "web", "menu-data.js"), "utf8");
    const menu = JSON.parse(source.slice(source.indexOf("const MENU = ") + 13, source.lastIndexOf(";")));
    names = menu.map(d => d.img).filter(Boolean);
  }
  for (const n of names) console.log(n, "→", (await optimise(n)).join(", "));
}
