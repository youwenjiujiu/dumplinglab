/* Dumpling Lab — single image → generated 3D asset candidates.
   Turns each mapped dish photo in web/img/ into a textured GLB candidate
   via fal.ai image-to-3D. The exact model used by Mukbang is not public;
   this is our replaceable generation backend, not a claim about their stack.

   Generation is an offline content step. The ordering site only serves reviewed
   static GLBs, so API credentials are never shipped to the browser.

   Setup:  export FAL_KEY="xxxxxxxx:xxxxxxxxxxxxxxxx"   # fal.ai/dashboard/keys
   Run:    node scripts/gen-3d.mjs hk-crab-roe-wonton
           node scripts/gen-3d.mjs --all
           MODEL=hunyuan3 node scripts/gen-3d.mjs hk-crab-roe-wonton

   Output: web/models/candidates/<model>/<dish-id>.glb
   Default: fal-ai/trellis-2, web-sized mesh and 2048px texture.
*/

import { readFileSync, writeFileSync, renameSync, mkdirSync } from "fs";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { fal } from "@fal-ai/client";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const IMG = join(ROOT, "web/img");
const CANDIDATES = join(ROOT, "web/models/candidates");

const ASSETS = Object.freeze([
  { id: "hk-crab-roe-wonton", image: "wonton-soup.png" },
  { id: "xian-hot-oil-noodles", image: "hot-oil-noodles.png" },
  { id: "yunnan-lava-tofu", image: "crispy-tofu.png" },
  { id: "red-oil-wontons", image: "red-oil-wontons-cutout.png" },
  { id: "minced-pork-egg-noodles", image: "minced-pork-egg-noodles-cutout.png" },
  { id: "wonton-soup-noodles", image: "wonton-soup-noodles-cutout.png" },
  { id: "dry-wonton-noodles", image: "dry-wonton-noodles-cutout.png" },
]);

function loadCredentials() {
  if (process.env.FAL_KEY) return process.env.FAL_KEY;
  if (process.platform !== "darwin") return "";
  try {
    return execFileSync(
      "security",
      ["find-generic-password", "-s", "dumplinglab-fal", "-w"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
  } catch {
    return "";
  }
}

const credentials = loadCredentials();
if (!credentials) {
  console.error('✗ Missing fal credentials. Set FAL_KEY or save it in macOS Keychain with service "dumplinglab-fal".');
  process.exit(1);
}
fal.config({ credentials });

const parsedSeed = Number(process.env.SEED);
const generationSeed = Number.isSafeInteger(parsedSeed) ? parsedSeed : null;
const withSeed = input => generationSeed === null ? input : { ...input, seed: generationSeed };

const MODELS = {
  trellis2: {
    endpoint: "fal-ai/trellis-2",
    input: url => withSeed({
      image_url: url,
      resolution: 1024,
      decimation_target: 50000,
      texture_size: 2048,
      remesh: true,
    }),
    meshURL: data => data.model_glb?.url,
  },
  hunyuan3: {
    endpoint: "fal-ai/hunyuan3d-v3/image-to-3d",
    input: url => withSeed({
      input_image_url: url,
      enable_pbr: true,
      face_count: 80000,
      generate_type: "LowPoly",
      polygon_type: "triangle",
    }),
    meshURL: data => data.model_glb?.url || data.model_urls?.glb?.url,
  },
  trellis: {
    endpoint: "fal-ai/trellis",
    input: url => withSeed({ image_url: url, mesh_simplify: 0.95, texture_size: 2048 }),
    meshURL: data => data.model_mesh?.url,
  },
};
const modelName = process.env.MODEL || "trellis2";
const M = MODELS[modelName];
if (!M) {
  console.error(`✗ Unknown MODEL=${modelName}. Use ${Object.keys(MODELS).join(", ")}.`);
  process.exit(1);
}
const variantName = process.env.VARIANT || (generationSeed === null ? modelName : `${modelName}-seed${generationSeed}`);
const OUT = join(CANDIDATES, variantName);
mkdirSync(OUT, { recursive: true });

const only = process.argv[2];
const dishes = only === "--all" ? ASSETS : ASSETS.filter(asset => asset.id === only);
if (!dishes.length) {
  console.error(`✗ Choose a dish id or --all. Available: ${ASSETS.map(asset => asset.id).join(", ")}`);
  process.exit(1);
}

async function generate(asset) {
  const dest = join(OUT, `${asset.id}.glb`);
  const pending = `${dest}.pending`;
  const file = new File([readFileSync(join(IMG, asset.image))], asset.image, { type: "image/png" });
  const url = await fal.storage.upload(file);
  process.stdout.write(`→ ${asset.id}: `);
  const res = await fal.subscribe(M.endpoint, { input: M.input(url), onQueueUpdate: u => process.stdout.write(u.status === "IN_PROGRESS" ? "▓" : "·") });
  const data = res.data || res;
  const glbURL = M.meshURL(data);
  if (!glbURL) throw new Error("no mesh url: " + JSON.stringify(data).slice(0, 200));
  const glb = Buffer.from(await fetch(glbURL).then(r => r.arrayBuffer()));
  if (glb.length < 1024 || glb.subarray(0, 4).toString("ascii") !== "glTF") {
    throw new Error(`download is not a valid GLB (${glb.length} bytes)`);
  }
  writeFileSync(pending, glb);
  renameSync(pending, dest);
  console.log(` ✓ ${(glb.length / 1024 / 1024).toFixed(1)} MB → web/models/candidates/${variantName}/${asset.id}.glb`);
}

console.log(`Generating ${dishes.length} model(s) with ${M.endpoint}\n`);
for (const asset of dishes) {
  try { await generate(asset); } catch (e) { console.error(`\n✗ ${asset.id}: ${e.message}`); }
}
console.log("\nDone. Visually review front, side, back and top before replacing a production GLB.");
