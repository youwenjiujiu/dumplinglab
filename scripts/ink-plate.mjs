/* Dumpling Lab — re-ink a generated one-colour print as a true single plate.
   The generator returns red dots on painted paper; this keeps only the ink:
   colour = the house red, alpha = tone, paper = transparent. The plate can
   then sit on the site's own paper without a visible rectangle.
   Usage: node scripts/ink-plate.mjs <in.png> <out.webp> [ink=#E51B00] [cropTopFraction=0] [width=1024] */
import sharp from "sharp";
const [src, dest, ink = "#E51B00", cropTop = "0", widthArg = "1024", floorArg = "0.08"] = process.argv.slice(2);
const FLOOR = Number(floorArg); // tones this close to paper are paper grain the generator painted — drop them
const hex = ink.replace("#", ""), R = parseInt(hex.slice(0, 2), 16), G = parseInt(hex.slice(2, 4), 16), B = parseInt(hex.slice(4, 6), 16);
const lum = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
let img = sharp(src); const meta = await img.metadata();
const top = Math.round(meta.height * Number(cropTop));
if (top) img = img.extract({ left: 0, top, width: meta.width, height: meta.height - top });
img = img.resize(Number(widthArg), null, { fit: "inside" });
const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
// paper tone = a high percentile of luminance, ink tone = the ink itself
const lums = new Float32Array(info.width * info.height);
for (let i = 0, p = 0; i < data.length; i += 4, p++) lums[p] = lum(data[i], data[i + 1], data[i + 2]);
const sorted = Float32Array.from(lums).sort(); const paper = sorted[Math.floor(sorted.length * .97)];
const inkLum = lum(R, G, B), span = Math.max(paper - inkLum, .05);
const out = Buffer.alloc(info.width * info.height * 4);
for (let p = 0, o = 0; p < lums.length; p++, o += 4) {
  const raw = Math.min(1, Math.max(0, (paper - lums[p]) / span));
  const a = raw < FLOOR ? 0 : (raw - FLOOR) / (1 - FLOOR);
  out[o] = R; out[o + 1] = G; out[o + 2] = B; out[o + 3] = Math.round(a * 255);
}
await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).webp({ quality: 86, alphaQuality: 90 }).toFile(dest);
// report how much of the top-left corner (pure paper) survived, to tune FLOOR
let corner = 0, cn = 0; for (let y = 0; y < Math.floor(info.height * .12); y++) for (let x = 0; x < Math.floor(info.width * .12); x++) { const o = (y * info.width + x) * 4; corner += out[o + 3]; cn++; }
console.log(`corner mean alpha ${(corner / cn / 255).toFixed(4)}`);
console.log(`inked ${dest} ${info.width}x${info.height} paper=${paper.toFixed(3)}`);
