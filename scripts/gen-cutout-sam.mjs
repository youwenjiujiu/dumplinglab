/* Generate review-only whole-dish alpha/mask candidates with SAM 3.
   The restaurant source pixels are not regenerated; SAM only selects the
   photographed bowl inside an explicit box. Review before promoting.

   Usage: node scripts/gen-cutout-sam.mjs red-oil-wontons
*/

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { fal } from "@fal-ai/client";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "web/img/candidates/sam3");
mkdirSync(OUT, { recursive: true });

const SHOOT = Object.fromEntries([
  ['1163', 'bowl', [360, 230, 1190, 780], [[750, 490], [770, 720]]],
  ['1084', 'bowl', [400, 190, 1110, 800], [[750, 490], [770, 730]]],
  ['1060', 'metal serving tray', [300, 265, 1240, 770], [[750, 500], [1100, 620]]],
  ['0752', 'bowl', [240, 180, 1220, 800], [[730, 490], [730, 710]]],
  ['0893', 'bowl', [240, 180, 1220, 800], [[730, 490], [730, 710]]],
  ['0955', 'metal serving tray', [180, 180, 1270, 820], [[730, 510], [1060, 650]]],
  ['0980', 'metal serving tray', [180, 180, 1270, 820], [[730, 510], [1060, 650]]],
  ['1036', 'plate', [200, 200, 1250, 810], [[730, 510]]],
  ['1044', 'plate', [150, 180, 1300, 810], [[730, 510]]],
  ['1048', 'plate', [240, 180, 1250, 810], [[730, 510]]],
  ['0852', 'metal serving tray', [180, 180, 1270, 820], [[730, 510], [1060, 650]]],
].map(([number, prompt, box, points]) => [`shoot-20260908-${number}`, {
  image: `l/shoot-20260908-${number}.webp`, prompt, box, points,
}]));
const ASSETS = Object.freeze({
  ...SHOOT,
  "red-oil-wontons": { image: "red-oil-wontons.jpg", box: [410, 320, 1520, 1060], prompt: "bowl", points: [[960, 690]] },
  "minced-pork-egg-noodles": { image: "minced-pork-egg-noodles.jpg", box: [380, 280, 1540, 1110], prompt: "bowl", points: [[960, 700]] },
  "wonton-soup-noodles": { image: "wonton-soup-noodles.jpg", box: [380, 290, 1550, 1110], prompt: "bowl", points: [[960, 700]] },
  // The shallow dry-noodle bowl has almost no tonal separation from the
  // backdrop. Multiple positive seeds stop SAM from selecting only its rim.
  "dry-wonton-noodles": {
    image: "dry-wonton-noodles.jpg",
    box: [300, 290, 1590, 1120],
    prompt: "bowl of dry wonton noodles",
    points: [[960, 700], [610, 690], [1290, 680], [960, 930]],
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
  console.error(`Choose: ${Object.keys(ASSETS).join(", ")}`);
  process.exit(1);
}
const key = credentials();
if (!key) throw new Error("Missing fal credentials");
fal.config({ credentials: key });

const source = readFileSync(join(ROOT, "web/img", asset.image));
const imageURL = await fal.storage.upload(new File([source], asset.image.split('/').at(-1), { type: asset.image.endsWith('.webp') ? 'image/webp' : 'image/jpeg' }));
const [xMin, yMin, xMax, yMax] = asset.box;
const response = await fal.subscribe("fal-ai/sam-3/image", {
  input: {
    image_url: imageURL,
    prompt: asset.prompt,
    point_prompts: asset.points.map(([x, y]) => ({ x, y, label: 1, object_id: 1 })),
    box_prompts: [{ x_min: xMin, y_min: yMin, x_max: xMax, y_max: yMax, object_id: 1 }],
    apply_mask: true,
    output_format: "png",
    return_multiple_masks: true,
    max_masks: 3,
    include_scores: true,
    include_boxes: true,
  },
  onQueueUpdate: update => process.stdout.write(update.status === "IN_PROGRESS" ? "▓" : "·"),
});
const data = response.data || response;
const outputs = [data.image, ...(data.masks || [])].filter(Boolean);
if (!outputs.length) throw new Error(`No SAM output: ${JSON.stringify(data).slice(0, 400)}`);
for (let index = 0; index < outputs.length; index += 1) {
  const bytes = Buffer.from(await fetch(outputs[index].url).then(result => result.arrayBuffer()));
  const name = `${id}-${index === 0 ? "image" : `mask-${index - 1}`}.png`;
  writeFileSync(join(OUT, name), bytes);
  console.log(`\n${name} ${(bytes.length / 1024).toFixed(0)} KB`);
}
console.log(JSON.stringify({ scores: data.scores, boxes: data.boxes, metadata: data.metadata }, null, 2));
