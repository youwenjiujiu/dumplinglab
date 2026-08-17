/* Generate one segmentation-guided SAM 3D comparison candidate.
   Production never imports this file or the generated candidate.

   Usage: node scripts/gen-sam-splat.mjs hk-crab-roe-wonton
*/

import { readFileSync, writeFileSync, renameSync, mkdirSync } from "fs";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { fal } from "@fal-ai/client";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "web/splats/candidates/sam3d");
mkdirSync(OUT, { recursive: true });

const ASSETS = Object.freeze({
  "hk-crab-roe-wonton": {
    image: "wonton-soup.png",
    prompt: "the entire bowl of wonton soup, including the bowl, soup, wontons and scallions",
  },
  "red-oil-wontons": {
    image: "red-oil-wontons.jpg",
    prompt: "bowl",
  },
  "minced-pork-egg-noodles": {
    image: "minced-pork-egg-noodles.jpg",
    prompt: "bowl",
  },
  "wonton-soup-noodles": {
    image: "wonton-soup-noodles.jpg",
    prompt: "bowl",
  },
  "dry-wonton-noodles": {
    image: "dry-wonton-noodles.jpg",
    prompt: "bowl",
  },
});

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

const id = process.argv[2];
const asset = ASSETS[id];
if (!asset) {
  console.error(`✗ Choose: ${Object.keys(ASSETS).join(", ")}`);
  process.exit(1);
}

const key = credentials();
if (!key) {
  console.error('✗ Missing fal credentials. Save them in Keychain service "dumplinglab-fal".');
  process.exit(1);
}
fal.config({ credentials: key });

try {
  const bytes = readFileSync(join(ROOT, "web/img", asset.image));
  const imageURL = await fal.storage.upload(new File([bytes], asset.image, { type: "image/png" }));
  process.stdout.write(`→ ${id}: `);
  const response = await fal.subscribe("fal-ai/sam-3/3d-objects", {
    input: {
      image_url: imageURL,
      ...(asset.prompt ? { prompt: asset.prompt } : {}),
      detection_threshold: 0.2,
      seed: 314159,
      export_textured_glb: false,
    },
    onQueueUpdate: update => process.stdout.write(update.status === "IN_PROGRESS" ? "▓" : "·"),
  });
  const data = response.data || response;
  const splatURL = data.gaussian_splat?.url;
  if (!splatURL) throw new Error(`no splat url: ${JSON.stringify(data).slice(0, 240)}`);
  const splat = Buffer.from(await fetch(splatURL).then(result => result.arrayBuffer()));
  if (splat.length < 1024 || !splat.subarray(0, 3).equals(Buffer.from("ply"))) {
    throw new Error(`download is not a PLY (${splat.length} bytes)`);
  }
  const dest = join(OUT, `${id}.ply`);
  writeFileSync(`${dest}.pending`, splat);
  renameSync(`${dest}.pending`, dest);
  console.log(` ✓ ${(splat.length / 1024 / 1024).toFixed(1)} MB → web/splats/candidates/sam3d/${id}.ply`);
} catch (error) {
  const detail = error.body?.detail || error.body || error.status || "";
  console.error(`\n✗ ${id}: ${error.message}${detail ? ` — ${JSON.stringify(detail)}` : ""}`);
  process.exitCode = 1;
}
