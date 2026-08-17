/* Generate Mukbang-style single-photo Gaussian splat candidates.
   The ordering page never receives credentials; generated files are static.

   Usage: node scripts/gen-splat.mjs hk-crab-roe-wonton
          node scripts/gen-splat.mjs --all
*/

import { readFileSync, writeFileSync, renameSync, mkdirSync } from "fs";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { fal } from "@fal-ai/client";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const IMG = join(ROOT, "web/img");
const OUT = join(ROOT, "web/splats/candidates/triposplat");
mkdirSync(OUT, { recursive: true });

const ASSETS = Object.freeze([
  { id: "hk-crab-roe-wonton", image: "wonton-soup.png" },
  { id: "xian-hot-oil-noodles", image: "hot-oil-noodles.png" },
  { id: "yunnan-lava-tofu", image: "crispy-tofu.png" },
]);

function credentials() {
  if (process.env.FAL_KEY) return process.env.FAL_KEY;
  if (process.platform !== "darwin") return "";
  try {
    return execFileSync("security", ["find-generic-password", "-s", "dumplinglab-fal", "-w"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

const key = credentials();
if (!key) {
  console.error('✗ Missing fal credentials. Save them in Keychain service "dumplinglab-fal".');
  process.exit(1);
}
fal.config({ credentials: key });

const only = process.argv[2];
const assets = only === "--all" ? ASSETS : ASSETS.filter(asset => asset.id === only);
if (!assets.length) {
  console.error(`✗ Choose a dish id or --all: ${ASSETS.map(asset => asset.id).join(", ")}`);
  process.exit(1);
}

for (const asset of assets) {
  try {
    const input = new File([readFileSync(join(IMG, asset.image))], asset.image, { type: "image/png" });
    const imageURL = await fal.storage.upload(input);
    process.stdout.write(`→ ${asset.id}: `);
    const response = await fal.subscribe("tripo3d/triposplat", {
      input: {
        image_url: imageURL,
        num_gaussians: 262144,
        num_inference_steps: 30,
        guidance_scale: 3,
        output_format: "ply",
      },
      onQueueUpdate: update => process.stdout.write(update.status === "IN_PROGRESS" ? "▓" : "·"),
    });
    const data = response.data || response;
    const splatURL = data.model_mesh?.url;
    if (!splatURL) throw new Error(`no splat url: ${JSON.stringify(data).slice(0, 180)}`);
    const bytes = Buffer.from(await fetch(splatURL).then(result => result.arrayBuffer()));
    if (bytes.length < 1024 || !bytes.subarray(0, 3).equals(Buffer.from("ply"))) {
      throw new Error(`download is not a PLY (${bytes.length} bytes)`);
    }
    const dest = join(OUT, `${asset.id}.ply`);
    const pending = `${dest}.pending`;
    writeFileSync(pending, bytes);
    renameSync(pending, dest);
    console.log(` ✓ ${(bytes.length / 1024 / 1024).toFixed(1)} MB → web/splats/candidates/triposplat/${asset.id}.ply`);
  } catch (error) {
    console.error(`\n✗ ${asset.id}: ${error.message}`);
  }
}
