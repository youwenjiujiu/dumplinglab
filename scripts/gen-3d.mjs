/* Dumpling Lab — image → 3D asset generation.
   Turns each dish photo in web/img/ into a 3D model (web/models/<id>.glb)
   via fal.ai, exactly the pipeline Morsel uses (Tencent Hunyuan3D on fal).

   One-time batch: the menu is fixed, so we generate once and serve static
   GLB files — no runtime API cost, works offline, instant on scan.

   Setup:
     export FAL_KEY="xxxxxxxx:xxxxxxxxxxxxxxxx"   # from fal.ai/dashboard/keys
   Run:
     node scripts/gen-3d.mjs                 # all dishes missing a model
     node scripts/gen-3d.mjs beef-yolk-bowl  # one dish (recommended first test)

   Model: fal-ai/hunyuan3d/v21 (image-to-3D, textured GLB out).
*/

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const IMG = join(ROOT, "web/img");
const OUT = join(ROOT, "web/models");
mkdirSync(OUT, { recursive: true });

const FAL_KEY = process.env.FAL_KEY;
if (!FAL_KEY) {
  console.error("✗ Missing FAL_KEY. Get one at https://fal.ai/dashboard/keys, then:\n    export FAL_KEY=\"your-key\"");
  process.exit(1);
}

const MODEL = "fal-ai/hunyuan3d/v21";
const HEADERS = { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" };

const only = process.argv[2];
const dishes = readdirSync(IMG)
  .filter(f => f.endsWith(".png"))
  .map(f => f.replace(".png", ""))
  .filter(id => !only || id === only);

if (!dishes.length) { console.error("No matching dish photos in web/img/"); process.exit(1); }

function dataURL(path) {
  const b = readFileSync(path);
  return `data:image/png;base64,${b.toString("base64")}`;
}

async function generate(id) {
  const dest = join(OUT, `${id}.glb`);
  if (existsSync(dest) && !only) { console.log(`• ${id}: exists, skip`); return; }
  console.log(`→ ${id}: submitting…`);

  // 1) enqueue
  const sub = await fetch(`https://queue.fal.run/${MODEL}`, {
    method: "POST", headers: HEADERS,
    body: JSON.stringify({
      input_image_url: dataURL(join(IMG, `${id}.png`)),
      textured_mesh: true,
    }),
  }).then(r => r.json());
  if (!sub.request_id) throw new Error("no request_id: " + JSON.stringify(sub).slice(0, 300));

  // 2) poll
  const base = `https://queue.fal.run/${MODEL}/requests/${sub.request_id}`;
  let status = "IN_QUEUE", tries = 0;
  while (status !== "COMPLETED" && tries++ < 150) {
    await new Promise(r => setTimeout(r, 3000));
    const s = await fetch(`${base}/status`, { headers: HEADERS }).then(r => r.json());
    status = s.status;
    process.stdout.write(`\r  ${id}: ${status} (${tries * 3}s)   `);
    if (status === "FAILED") throw new Error("generation failed: " + JSON.stringify(s).slice(0, 300));
  }
  process.stdout.write("\n");

  // 3) fetch result + download GLB
  const res = await fetch(base, { headers: HEADERS }).then(r => r.json());
  const url = res.model_mesh?.url || res.mesh?.url || res.model_glb?.url;
  if (!url) throw new Error("no mesh url in result: " + JSON.stringify(res).slice(0, 300));
  const glb = Buffer.from(await fetch(url).then(r => r.arrayBuffer()));
  writeFileSync(dest, glb);
  console.log(`✓ ${id}: ${(glb.length / 1024 / 1024).toFixed(1)} MB → web/models/${id}.glb`);
}

console.log(`Generating ${dishes.length} model(s) with ${MODEL}\n`);
for (const id of dishes) {
  try { await generate(id); }
  catch (e) { console.error(`✗ ${id}: ${e.message}`); }
}
console.log("\nDone. Reload the menu — dishes with a .glb now render in 3D.");
