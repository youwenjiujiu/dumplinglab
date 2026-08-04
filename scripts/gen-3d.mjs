/* Dumpling Lab — image → 3D asset generation.
   Turns each dish photo in web/img/ into a 3D model (web/models/<id>.glb)
   via fal.ai image-to-3D — the pipeline Morsel uses.

   The menu is fixed, so we generate once and serve static GLB files:
   no runtime API cost, works offline, instant on scan.

   Setup:  export FAL_KEY="xxxxxxxx:xxxxxxxxxxxxxxxx"   # fal.ai/dashboard/keys
   Run:    node scripts/gen-3d.mjs                 # all dishes missing a model
           node scripts/gen-3d.mjs beef-yolk-bowl  # one dish
           MODEL=hunyuan node scripts/gen-3d.mjs …  # switch model

   Default model: fal-ai/trellis (single-segment id, clean routing, textured GLB).
*/

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { fal } from "@fal-ai/client";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const IMG = join(ROOT, "web/img");
const OUT = join(ROOT, "web/models");
mkdirSync(OUT, { recursive: true });

if (!process.env.FAL_KEY) {
  console.error('✗ Missing FAL_KEY. Get one at https://fal.ai/dashboard/keys, then:\n    export FAL_KEY="your-key"');
  process.exit(1);
}
fal.config({ credentials: process.env.FAL_KEY });

const MODELS = {
  trellis: { endpoint: "fal-ai/trellis", input: url => ({ image_url: url }), meshURL: d => d.model_mesh?.url },
  hunyuan: { endpoint: "fal-ai/hunyuan3d/v21", input: url => ({ input_image_url: url, textured_mesh: true }), meshURL: d => d.model_mesh?.url || d.model_glb?.url },
};
const M = MODELS[process.env.MODEL || "trellis"] || MODELS.trellis;

const only = process.argv[2];
const dishes = readdirSync(IMG).filter(f => f.endsWith(".png")).map(f => f.replace(".png", "")).filter(id => !only || id === only);
if (!dishes.length) { console.error("No matching dish photos in web/img/"); process.exit(1); }

async function generate(id) {
  const dest = join(OUT, `${id}.glb`);
  if (existsSync(dest) && !only) { console.log(`• ${id}: exists, skip`); return; }
  const file = new File([readFileSync(join(IMG, `${id}.png`))], `${id}.png`, { type: "image/png" });
  const url = await fal.storage.upload(file);
  process.stdout.write(`→ ${id}: `);
  const res = await fal.subscribe(M.endpoint, { input: M.input(url), onQueueUpdate: u => process.stdout.write(u.status === "IN_PROGRESS" ? "▓" : "·") });
  const data = res.data || res;
  const glbURL = M.meshURL(data);
  if (!glbURL) throw new Error("no mesh url: " + JSON.stringify(data).slice(0, 200));
  const glb = Buffer.from(await fetch(glbURL).then(r => r.arrayBuffer()));
  writeFileSync(dest, glb);
  console.log(` ✓ ${(glb.length / 1024 / 1024).toFixed(1)} MB → web/models/${id}.glb`);
}

console.log(`Generating ${dishes.length} model(s) with ${M.endpoint}\n`);
for (const id of dishes) {
  try { await generate(id); } catch (e) { console.error(`\n✗ ${id}: ${e.message}`); }
}
console.log("\nDone. Reload the menu — dishes with a .glb now render in 3D.");
