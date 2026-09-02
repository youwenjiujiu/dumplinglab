/* Dumpling Lab — one-ink halftone plates.
   Turns a colour photograph into a coarse red-ink halftone on transparent
   paper, the way a risograph would reproduce it. Dot size follows darkness,
   the paper stays visible, and the identity of the dish stays intact.
   Usage: node scripts/halftone.mjs <in.png> <out.png> [ink] [pitch] */
import sharp from "sharp";
const [src, dest, ink = "#e51b00", pitchArg = "6"] = process.argv.slice(2);
const PITCH = Number(pitchArg);
const W = 1200;
const img = sharp(src).ensureAlpha().resize(W, null, { fit: "inside" });
const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
const cols = Math.ceil(info.width / PITCH), rows = Math.ceil(info.height / PITCH);
// Stretch the tonal range of the opaque pixels so the darkest tone of a pale
// dish still prints as a full dot — a printer would adjust exposure the same way.
let lo = 1, hi = 0;
for (let i = 0; i < data.length; i += 4) {
  if (data[i + 3] < 200) continue;
  const l = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
  if (l < lo) lo = l; if (l > hi) hi = l;
}
lo = Math.min(lo + 0.06, 0.5); hi = Math.max(hi - 0.02, lo + 0.2);
const dots = [];
for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
  let lum = 0, a = 0, n = 0;
  for (let y = r * PITCH; y < Math.min(info.height, (r + 1) * PITCH); y++)
    for (let x = c * PITCH; x < Math.min(info.width, (c + 1) * PITCH); x++) {
      const i = (y * info.width + x) * 4; const al = data[i + 3] / 255;
      lum += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255 * al + (1 - al); a += al; n++;
    }
  lum /= n; a /= n;
  if (a < 0.15) continue;
  const norm = Math.min(1, Math.max(0, (lum - lo) / (hi - lo)));
  // darkness → dot radius; gamma < 1 gives the mid-tones real ink
  const dark = Math.pow(1 - norm, 0.8) * a;
  const rad = dark * PITCH * 0.72;
  if (rad < 0.35) continue;
  // 15° screen angle: offset alternate rows like a real halftone
  const cx = c * PITCH + PITCH / 2 + (r % 2 ? PITCH * 0.25 : 0), cy = r * PITCH + PITCH / 2;
  dots.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${rad.toFixed(2)}"/>`);
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${info.width}" height="${info.height}" viewBox="0 0 ${info.width} ${info.height}"><g fill="${ink}">${dots.join("")}</g></svg>`;
await sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true }).toFile(dest);
console.log(dest, dots.length, "dots");
