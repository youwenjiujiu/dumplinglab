/* Dumpling Lab — upload a dish photo, get a reviewable 3D asset.

   One call runs the whole content step, with no hand-tuned coordinates:

     photo → alpha cutout → image-to-3D → compress → cover render

   The browser never sees API credentials: generation happens here, on the
   server, and only the compressed GLB and its cover are served.

   Used by server.mjs (/api/admin/generate) and usable from the CLI:
     node scripts/pipeline.mjs <dish-id> <path-to-photo>
*/

import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { execFileSync, spawn } from "node:child_process";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { fal } from "@fal-ai/client";
import { NodeIO } from "@gltf-transform/core";
import { KHRONOS_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, prune, quantize, resample, simplify, textureCompress, weld } from "@gltf-transform/functions";
import { MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const IMG = join(ROOT, "web/img");
const CANDIDATES = join(ROOT, "web/models/candidates/upload");
const PRODUCTION = join(ROOT, "web/models/production");
const COVERS = join(ROOT, "web/img/3d-covers");
const WORK = join(ROOT, "tmp/pipeline");

/* ---------------- credentials ---------------- */

export function openaiKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  if (process.platform !== "darwin") return "";
  try {
    return execFileSync("security", ["find-generic-password", "-s", "dumplinglab-openai", "-w"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch { return ""; }
}

export function tripoKey() {
  if (process.env.TRIPO_API_KEY) return process.env.TRIPO_API_KEY;
  if (process.platform !== "darwin") return "";
  try {
    return execFileSync("security", ["find-generic-password", "-s", "dumplinglab-tripo", "-w"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch { return ""; }
}

export function falKey() {
  if (process.env.FAL_KEY) return process.env.FAL_KEY;
  if (process.platform !== "darwin") return "";
  try {
    return execFileSync("security", ["find-generic-password", "-s", "dumplinglab-fal", "-w"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch { return ""; }
}

/* ---------------- 1. cutout ----------------
   rembg runs locally, so isolating the bowl costs nothing and never
   repaints the restaurant's pixels — it only removes the background. */

export async function cutout(srcPath, dishId, log = () => {}) {
  mkdirSync(WORK, { recursive: true });
  const out = join(IMG, `${dishId}-cutout.png`);
  log("抠图中（本地 rembg，不改动菜品像素）…");
  const script = join(WORK, "cut.py");
  writeFileSync(script, `
import sys, numpy as np
from rembg import remove, new_session
from PIL import Image
from scipy import ndimage

src, dst = sys.argv[1], sys.argv[2]
img = Image.open(src).convert("RGBA")
out = remove(img, session=new_session("isnet-general-use"))
arr = np.array(out); a = arr[:, :, 3]

# Keep only the largest connected subject; drop stray specks.
solid = a > 30
lab, n = ndimage.label(solid)
if n > 1:
    sizes = ndimage.sum(solid, lab, range(1, n + 1))
    mask = ndimage.binary_dilation(lab == (int(np.argmax(sizes)) + 1), iterations=6)
    arr[:, :, 3] = np.where(mask, a, 0).astype(np.uint8)
    a = arr[:, :, 3]

nz = np.where(a > 8)
if len(nz[0]) == 0:
    raise SystemExit("empty alpha: subject not found")
pad, h, w = 8, a.shape[0], a.shape[1]
arr = arr[max(0, nz[0].min() - pad):min(h, nz[0].max() + pad),
          max(0, nz[1].min() - pad):min(w, nz[1].max() + pad)]

im = Image.fromarray(arr)
m = max(im.size)
if m > 1600:
    s = 1600 / m
    im = im.resize((int(im.width * s), int(im.height * s)), Image.LANCZOS)
im.save(dst, "PNG")
print(f"{im.width}x{im.height}")
`);
  const size = execFileSync("python3", [script, srcPath, out], { encoding: "utf8" }).trim();
  log(`抠图完成 ${size}`);
  return out;
}

/* ---------------- 2a. the other three sides ----------------
   A single photograph only knows one direction. Rather than let the 3D
   model guess the back and sides on its own, an image model paints them
   first — it has seen far more bowls of noodles than any mesh model — and
   Hunyuan3D is handed all four views to reconstruct from. The three painted
   views are saved next to the cutout so they can be reviewed in /admin. */

const VIEWS = [
  ["back",  "Turn the bowl 180 degrees on the table. Whatever food is nearest the camera in the input photo " +
            "must now be farthest away, and what was at the far side must now be nearest; left and right swap."],
  ["left",  "Turn the bowl 90 degrees clockwise on the table so we see its left side. What was nearest the " +
            "camera in the input photo is now on the right edge; what was on the left is now nearest the camera."],
  ["right", "Turn the bowl 90 degrees counter-clockwise on the table so we see its right side. What was nearest " +
            "the camera in the input photo is now on the left edge; what was on the right is now nearest the camera."],
];

function viewPrompt(orientation) {
  return `This is a product photo of one bowl of food. ${orientation} ` +
    `Everything else stays identical: the same bowl, the same food, the same amounts of every ingredient, ` +
    `the same camera height, the same distance and the same lighting. The whole bowl must be fully in frame ` +
    `with white margin around it, at the same size as in the input. Plain pure white background, nothing ` +
    `added, nothing removed, no props. Photorealistic.`;
}

/* One painted view. OpenAI's image model is used when a key is present (the
   restaurant already has an account there); fal's nano-banana is the fallback.
   Either way the result is a PNG buffer. */
async function paintOne(flatPNG, dishId, name, orientation) {
  const oai = openaiKey();
  if (oai) {
    const form = new FormData();
    form.append("model", "gpt-image-1");
    form.append("prompt", viewPrompt(orientation));
    form.append("size", "1024x1024");
    form.append("quality", "medium");   // reference views for reconstruction; high only buys polish
    form.append("background", "opaque");
    form.append("image", new File([flatPNG], `${dishId}-front.png`, { type: "image/png" }));
    const res = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST", headers: { authorization: `Bearer ${oai}` }, body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`OpenAI ${name} 视角失败：${data.error?.message || res.status}`);
    const b64 = data.data?.[0]?.b64_json;
    if (b64) return Buffer.from(b64, "base64");
    const url = data.data?.[0]?.url;
    if (!url) throw new Error(`OpenAI ${name} 视角未返回图片`);
    return Buffer.from(await fetch(url).then(r => r.arrayBuffer()));
  }
  const src = await fal.storage.upload(new File([flatPNG], `${dishId}-front.png`, { type: "image/png" }));
  const res = await fal.subscribe("fal-ai/nano-banana/edit", {
    input: { prompt: viewPrompt(orientation), image_urls: [src], num_images: 1, output_format: "png", aspect_ratio: "auto" },
  });
  const url = (res.data || res).images?.[0]?.url;
  if (!url) throw new Error(`${name} 视角生成失败`);
  return Buffer.from(await fetch(url).then(r => r.arrayBuffer()));
}

/* Tripo's own multiview generator produces the four views *consistently* —
   the arrangement really turns with the bowl — which a general image editor
   does not reliably do. It is preferred whenever a Tripo key exists. */
async function tripoPaintViews(key, flat, dishId, log) {
  log("生成背/左/右视角（Tripo 一致性多视角）…");
  const token = await tripoUpload(key, flat, `${dishId}-front.png`);
  const create = await fetch(`${TRIPO}/task`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ type: "generate_multiview_image", file: { type: "png", file_token: token } }),
  });
  const created = await create.json();
  if (!create.ok || created.code !== 0) throw new Error(`Tripo 多视角失败：${created.message || create.status}`);
  const out = await tripoWait(key, created.data.task_id, log, "多视角");
  const urls = out.generate_multiview_image || out;
  const views = {};
  for (const name of ["back", "left", "right"]) {
    const url = urls[`${name}_view_url`];
    if (!url) throw new Error(`Tripo 未返回${name}视角`);
    views[name] = Buffer.from(await fetch(url).then(r => r.arrayBuffer()));
    writeFileSync(join(IMG, `${dishId}-view-${name}.png`), views[name]);
  }
  return views;
}

export async function paintViews(cutoutPath, dishId, log = () => {}, photoPath = null) {
  const png = readFileSync(cutoutPath);
  // The cutout is transparent; the image model wants a solid, well-lit plate.
  const flat = await sharp(png).flatten({ background: "#ffffff" }).png().toBuffer();
  const provider = openaiKey() ? "OpenAI gpt-image" : "fal nano-banana";

  const reusable = process.env.REUSE_VIEWS && VIEWS.every(([name]) => existsSync(join(IMG, `${dishId}-view-${name}.png`)));
  if (tripoKey() && !reusable && process.env.VIEW_PAINTER !== "openai") {
    // The multiview generator needs to know the bowl sits flat on a table.
    // A cutout floating on white gives it no ground reference and it reads
    // the perspective ellipse as a tilted bowl, so it is shown the original
    // photograph (table shadow included), downsized to a sane upload.
    let reference = flat;
    if (photoPath && existsSync(photoPath) && process.env.VIEW_REF !== "cutout") {
      reference = await sharp(photoPath).resize(1600, 1600, { fit: "inside" }).png().toBuffer();
    }
    return tripoPaintViews(tripoKey(), reference, dishId, log);
  }

  const views = {};
  // The three views are independent; paint them concurrently. REUSE_VIEWS=1
  // keeps already-painted views so a 3D re-run does not re-bill the painter.
  await Promise.all(VIEWS.map(async ([name, orientation]) => {
    const file = join(IMG, `${dishId}-view-${name}.png`);
    if (process.env.REUSE_VIEWS && existsSync(file)) {
      log(`复用已生成的${{ back: "背面", left: "左侧", right: "右侧" }[name]}视角`);
      views[name] = readFileSync(file);
      return;
    }
    log(`生成${{ back: "背面", left: "左侧", right: "右侧" }[name]}视角（${provider}）…`);
    const buffer = await paintOne(flat, dishId, name, orientation);
    writeFileSync(join(IMG, `${dishId}-view-${name}.png`), buffer);
    views[name] = buffer;
  }));
  return views;
}

/* ---------------- 2b-i. Tripo (preferred when a key is present) ----------------
   Native four-view reconstruction: files go in the order [front, left, back,
   right]; the front is required, the others are simply omitted if missing. */

const TRIPO = "https://api.tripo3d.ai/v2/openapi";

async function tripoUpload(key, buffer, name) {
  const form = new FormData();
  form.append("file", new File([buffer], name, { type: "image/png" }));
  const res = await fetch(`${TRIPO}/upload/sts`, { method: "POST", headers: { authorization: `Bearer ${key}` }, body: form });
  const data = await res.json();
  if (!res.ok || data.code !== 0) throw new Error(`Tripo 上传失败：${data.message || res.status}`);
  return data.data.image_token || data.data.file_token;
}

async function generateWithTripo(key, frontPNG, views, dishId, log) {
  log("上传四张视角到 Tripo…");
  const tokens = await Promise.all([
    tripoUpload(key, frontPNG, `${dishId}-front.png`),
    views.left ? tripoUpload(key, views.left, `${dishId}-left.png`) : null,
    views.back ? tripoUpload(key, views.back, `${dishId}-back.png`) : null,
    views.right ? tripoUpload(key, views.right, `${dishId}-right.png`) : null,
  ]);
  const files = tokens.map(token => token ? { type: "png", file_token: token } : {});
  const multi = tokens.filter(Boolean).length > 1;

  log(`${multi ? "四视角" : "单视角"}生成 3D（Tripo v3.1，PBR 贴图）…`);
  const create = await fetch(`${TRIPO}/task`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify(multi
      ? { type: "multiview_to_model", files, model_version: "v3.1-20260211", texture: true, pbr: true, texture_quality: "detailed" }
      : { type: "image_to_model", file: files[0], model_version: "v3.1-20260211", texture: true, pbr: true, texture_quality: "detailed" }),
  });
  const created = await create.json();
  if (!create.ok || created.code !== 0) throw new Error(`Tripo 建任务失败：${created.message || create.status}`);
  const out = await tripoWait(key, created.data.task_id, log, "3D");
  const url = out.pbr_model || out.model;
  if (!url) throw new Error("Tripo 未返回模型");
  return Buffer.from(await fetch(url).then(r => r.arrayBuffer()));
}

async function tripoWait(key, taskId, log, label) {
  const started = Date.now();
  let lastReport = started;
  for (;;) {
    await new Promise(r => setTimeout(r, 4000));
    const res = await fetch(`${TRIPO}/task/${taskId}`, { headers: { authorization: `Bearer ${key}` } });
    const { data } = await res.json();
    if (data.status === "success") return data.output || {};
    if (["failed", "cancelled", "banned", "expired", "unknown"].includes(data.status)) {
      throw new Error(`Tripo ${label}失败：${data.status}`);
    }
    const now = Date.now();
    if (now - lastReport >= 30000) {
      lastReport = now;
      const elapsed = Math.round((now - started) / 1000);
      log(`Tripo ${label}${data.status === "queued" ? "排队中" : "生成中"} ${data.progress ?? 0}% · 已用 ${Math.floor(elapsed / 60)} 分 ${String(elapsed % 60).padStart(2, "0")} 秒`);
    }
  }
}

/* ---------------- 2b. image → 3D ----------------
   Multi-view reconstruction. Every result still goes to candidates/ for
   review, never straight to production. */

const GEN = {
  endpoint: "fal-ai/hunyuan3d-v3/image-to-3d",
  // Full-quality mode. LowPoly at 80k faces was the vendor's reduced tier and
  // is where the mushy noodles and holed bowls came from; the mesh is
  // decimated and the textures compressed on our side afterwards anyway.
  input: (url, views = {}) => ({
    input_image_url: url,
    ...(views.back ? { back_image_url: views.back } : {}),
    ...(views.left ? { left_image_url: views.left } : {}),
    ...(views.right ? { right_image_url: views.right } : {}),
    enable_pbr: true,
    generate_type: "Normal",
    face_count: 500000,
  }),
  meshURL: d => d.model_glb?.url || d.model_urls?.glb?.url,
};

export async function generateGLB(cutoutPath, dishId, log = () => {}, { multiView = true, photoPath = null } = {}) {
  mkdirSync(CANDIDATES, { recursive: true });
  const tripo = tripoKey();
  const key = falKey();
  if (!tripo && !key) throw new Error("缺少 3D 服务密钥：钥匙串 dumplinglab-tripo 或 dumplinglab-fal");
  if (key) fal.config({ credentials: key });

  const views = multiView ? await paintViews(cutoutPath, dishId, log, photoPath) : {};

  if (tripo) {
    const glb = await generateWithTripo(tripo, readFileSync(cutoutPath), views, dishId, log);
    if (glb.length < 1024 || glb.subarray(0, 4).toString("ascii") !== "glTF") throw new Error("Tripo 返回的不是有效 GLB");
    const dest = join(CANDIDATES, `${dishId}.glb`);
    writeFileSync(dest, glb);
    log(`原始模型 ${(glb.length / 1048576).toFixed(1)} MB（Tripo）`);
    return dest;
  }

  log("上传素材到生成服务…");
  const url = await fal.storage.upload(new File([readFileSync(cutoutPath)], `${dishId}.png`, { type: "image/png" }));
  const viewURLs = {};
  for (const [name, buffer] of Object.entries(views)) {
    viewURLs[name] = await fal.storage.upload(new File([buffer], `${dishId}-${name}.png`, { type: "image/png" }));
  }

  log(`${multiView ? "四视角" : "单视角"}生成 3D 几何与 PBR 贴图（通常 1–3 分钟，高峰可达 6 分钟）…`);
  // The queue reports every few seconds; a line every ~30s with elapsed time
  // tells the operator it is alive without burying the useful steps.
  const started = Date.now();
  let lastReport = started;
  const res = await fal.subscribe(GEN.endpoint, {
    input: GEN.input(url, viewURLs),
    onQueueUpdate: u => {
      const now = Date.now();
      if (now - lastReport < 30000) return;
      lastReport = now;
      const elapsed = Math.round((now - started) / 1000);
      const clock = `${Math.floor(elapsed / 60)} 分 ${String(elapsed % 60).padStart(2, "0")} 秒`;
      log(u.status === "IN_QUEUE" ? `排队中… 已等待 ${clock}` : `生成中… 已用 ${clock}`);
    },
  });
  const data = res.data || res;
  const glbURL = GEN.meshURL(data);
  if (!glbURL) throw new Error("生成服务未返回模型：" + JSON.stringify(data).slice(0, 200));

  const glb = Buffer.from(await fetch(glbURL).then(r => r.arrayBuffer()));
  if (glb.length < 1024 || glb.subarray(0, 4).toString("ascii") !== "glTF") {
    throw new Error("返回的不是有效 GLB");
  }
  const dest = join(CANDIDATES, `${dishId}.glb`);
  writeFileSync(dest, glb);
  log(`原始模型 ${(glb.length / 1048576).toFixed(1)} MB`);
  return dest;
}

/* ---------------- 3. compress ----------------
   20–24MB candidates are unusable on a phone over restaurant wifi.
   Weld/quantize the mesh and re-encode textures to WebP. */

export async function compressGLB(srcPath, dishId, log = () => {}) {
  mkdirSync(CANDIDATES, { recursive: true });
  const dest = join(CANDIDATES, `${dishId}.min.glb`);
  const before = readFileSync(srcPath).length;
  log("压缩模型与贴图…");

  await MeshoptSimplifier.ready;
  const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);
  const doc = await io.read(srcPath);
  await doc.transform(
    dedup(),
    weld(),
    simplify({ simplifier: MeshoptSimplifier, ratio: 0.05, error: 0.002 }),
    resample(),
    prune({ keepAttributes: false }),
    // Base colour keeps 2048px; the PBR helper maps (normal / metal-rough) are
    // invisible at phone size and go to 1024px.
    textureCompress({ encoder: sharp, targetFormat: "webp", resize: [1536, 1536], quality: 82, slots: /baseColor/ }),
    textureCompress({ encoder: sharp, targetFormat: "webp", resize: [512, 512], quality: 70, slots: /^(?!baseColor)/ }),
    quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12 }),
  );
  await io.write(dest, doc);

  const after = readFileSync(dest).length;
  log(`压缩 ${(before / 1048576).toFixed(1)} MB → ${(after / 1048576).toFixed(2)} MB`);
  return dest;
}

/* ---------------- 3a. colour-match to the photograph ----------------
   Generated textures come back with a cast (cream broth, olive noodles).
   The restaurant's photo is the colour reference: shift the base-colour map's
   per-channel mean/std onto the photo's. Only colours move, never geometry. */

async function colourStats(buffer, alphaMask) {
  const { data } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const sum = [0, 0, 0], sq = [0, 0, 0]; let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (alphaMask && data[i + 3] < 200) continue;
    if (!alphaMask && data[i] < 8 && data[i + 1] < 8 && data[i + 2] < 8) continue;   // unpainted texels
    n++;
    for (let c = 0; c < 3; c++) { sum[c] += data[i + c]; sq[c] += data[i + c] * data[i + c]; }
  }
  const mean = sum.map(v => v / Math.max(1, n));
  const std = sq.map((v, c) => Math.sqrt(Math.max(1, v / Math.max(1, n) - mean[c] * mean[c])));
  return { mean, std };
}

export async function matchColours(glbPath, photoPath, log = () => {}) {
  const abs = glbPath.startsWith("/") ? glbPath : join(ROOT, glbPath);
  log("贴图校色（以照片为色板）…");
  const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);
  const doc = await io.read(abs);
  const target = await colourStats(readFileSync(photoPath), true);
  for (const material of doc.getRoot().listMaterials()) {
    const texture = material.getBaseColorTexture();
    if (!texture) continue;
    const src = Buffer.from(texture.getImage());
    const s = await colourStats(src, false);
    const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        const v = (data[i + c] - s.mean[c]) / s.std[c] * target.std[c] + target.mean[c];
        data[i + c] = Math.max(0, Math.min(255, Math.round(v)));
      }
    }
    const out = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).webp({ quality: 84 }).toBuffer();
    texture.setImage(out).setMimeType("image/webp");
  }
  await io.write(abs, doc);
}

/* ---------------- 3b. align to the photograph ----------------
   The reconstruction has its own idea of "front". The guest opens the dish on
   the restaurant's photo, so the model's rest pose must show the same side:
   render it at 24 headings, compare each against the cutout, and bake the
   winning heading into the GLB. Purely mechanical — no pixel is repainted. */

/* Bake an arbitrary rotation (quaternion) into a GLB's scene root. Used to undo
   a bad alignment before re-running it. */
export async function bakeRotation(glbPath, quaternion) {
  const abs = glbPath.startsWith("/") ? glbPath : join(ROOT, glbPath);
  const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);
  const doc = await io.read(abs);
  const scene = doc.getRoot().getDefaultScene() || doc.getRoot().listScenes()[0];
  const wrapper = doc.createNode("bake");
  wrapper.setRotation(quaternion);
  for (const child of scene.listChildren()) { scene.removeChild(child); wrapper.addChild(child); }
  scene.addChild(wrapper);
  await io.write(abs, doc);
}

export async function alignToPhoto(glbPath, cutoutPath, dishId, log = () => {}, { searchTilt = true } = {}) {
  log("对齐正面（与照片逐角度比对）…");
  const abs = glbPath.startsWith("/") ? glbPath : join(ROOT, glbPath);
  const rel = abs.slice(join(ROOT, "web").length + 1);
  // Compare in colour, and only where the photo is actually food: the white
  // bowl looks the same from every heading, the red chilli and green scallion
  // do not.
  const SIZE = 64;
  const toRGB = buffer => sharp(buffer).flatten({ background: "#f2f4f6" }).trim({ threshold: 6 })
    .resize(SIZE, SIZE, { fit: "contain", background: "#f2f4f6" }).removeAlpha().raw().toBuffer();
  const target = await toRGB(readFileSync(cutoutPath));
  const weight = new Float32Array(SIZE * SIZE);
  for (let k = 0; k < SIZE * SIZE; k++) {
    const r = target[k * 3], g = target[k * 3 + 1], b = target[k * 3 + 2];
    const sat = Math.max(r, g, b) - Math.min(r, g, b);
    weight[k] = sat > 28 ? 1 : 0;
  }
  const scoreOf = probe => {
    let sum = 0;
    for (let k = 0; k < SIZE * SIZE; k++) {
      if (!weight[k]) continue;
      sum += Math.abs(target[k * 3] - probe[k * 3]) + Math.abs(target[k * 3 + 1] - probe[k * 3 + 1]) + Math.abs(target[k * 3 + 2] - probe[k * 3 + 2]);
    }
    return sum;
  };

  const { chromium } = await import("playwright");
  const port = 8500 + Math.floor(Math.random() * 400);
  const server = spawn("python3", ["-m", "http.server", String(port), "-d", "web"], { cwd: ROOT, stdio: "ignore" });
  let browser;
  let best = { yaw: 0, score: Infinity };
  try {
    for (let i = 0; i < 50; i++) {
      try { if ((await fetch(`http://127.0.0.1:${port}/model-qa.html`)).ok) break; } catch {}
      await new Promise(r => setTimeout(r, 100));
    }
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 320, height: 310 }, deviceScaleFactor: 1 });
    // Coarse yaw sweep at level pitch, then refine yaw and pitch together
    // around the winner. Pitch matters when the source photo had no table to
    // tell the reconstruction which way is down.
    const probes = [];
    for (let i = 0; i < 12; i++) probes.push([(i / 12) * Math.PI * 2, 0]);
    let stage = 0;
    for (let n = 0; n < probes.length; n++) {
      const [yaw, tilt] = probes[n];
      await page.goto(`http://127.0.0.1:${port}/model-render.html?glb=${encodeURIComponent(rel)}&ry=${yaw}&tilt=${tilt}&t=${n}`,
        { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => document.body.dataset.ready === "1" || document.body.dataset.error === "1",
        null, { timeout: 60000 });
      if (await page.evaluate(() => document.body.dataset.error === "1")) throw new Error("对齐渲染失败：模型无法加载");
      await page.waitForTimeout(150);
      const png = await page.locator("canvas").screenshot({ omitBackground: true });
      const score = scoreOf(await toRGB(png));
      if (process.env.ALIGN_DEBUG) console.log("  yaw", Math.round(yaw * 180 / Math.PI), "tilt", Math.round(tilt * 180 / Math.PI), "score", score);
      if (score < best.score) best = { yaw, tilt, score };
      if (n === probes.length - 1 && stage === 0) {
        stage = 1;
        if (!searchTilt) { for (const dy of [-0.2, -0.1, 0.1, 0.2]) probes.push([best.yaw + dy, 0]); continue; }
        for (const dy of [-0.26, -0.13, 0, 0.13, 0.26])
          for (const dt of [-0.45, -0.3, -0.15, 0.15, 0.3, 0.45])
            probes.push([best.yaw + dy, dt]);
      }
    }
  } finally {
    if (browser) await browser.close();
    server.kill();
  }

  // Bake the heading into the scene root so the viewer's rotation 0 is the photo's side.
  const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);
  const doc = await io.read(abs);
  const scene = doc.getRoot().getDefaultScene() || doc.getRoot().listScenes()[0];
  const wrapper = doc.createNode("photo-heading");
  // quaternion for R = Ry(yaw) · Rx(tilt), matching how the viewer applies preTilt (root) inside the yaw (pivot)
  const cy = Math.cos(best.yaw / 2), sy = Math.sin(best.yaw / 2), ct = Math.cos((best.tilt || 0) / 2), st = Math.sin((best.tilt || 0) / 2);
  wrapper.setRotation([cy * st, sy * ct, -sy * st, cy * ct]);
  for (const child of scene.listChildren()) { scene.removeChild(child); wrapper.addChild(child); }
  scene.addChild(wrapper);
  await io.write(abs, doc);
  log(`正面已对齐（转 ${Math.round(best.yaw * 180 / Math.PI)}°，俯仰 ${Math.round((best.tilt || 0) * 180 / Math.PI)}°）`);
  return best.yaw;
}

/* ---------------- 4. cover ----------------
   Rendered from the production GLB at the viewer's opening camera, so the
   menu card is literally the first frame of the detail view. */

export async function renderCover(glbRelURL, dishId, log = () => {}) {
  mkdirSync(COVERS, { recursive: true });
  log("渲染菜单封面…");
  const { chromium } = await import("playwright");
  const port = 8500 + Math.floor(Math.random() * 400);
  const server = spawn("python3", ["-m", "http.server", String(port), "-d", "web"], { cwd: ROOT, stdio: "ignore" });
  let browser;
  try {
    for (let i = 0; i < 50; i++) {
      try { if ((await fetch(`http://127.0.0.1:${port}/model-qa.html`)).ok) break; } catch {}
      await new Promise(r => setTimeout(r, 100));
    }
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 640, height: 620 }, deviceScaleFactor: 2 });
    await page.goto(`http://127.0.0.1:${port}/model-render.html?glb=${encodeURIComponent(glbRelURL)}`,
      { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.body.dataset.ready === "1" || document.body.dataset.error === "1",
      null, { timeout: 60000 });
    if (await page.evaluate(() => document.body.dataset.error === "1")) throw new Error("封面渲染失败：模型无法加载");
    await page.waitForTimeout(900);
    const png = await page.locator("canvas").screenshot({ omitBackground: true });
    const dest = join(COVERS, `${dishId}.webp`);
    await sharp(png).resize(560, 560, { fit: "inside" }).webp({ quality: 88 }).toFile(dest);
    log("封面已生成");
    return dest;
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}

/* ---------------- full run ---------------- */

export async function runPipeline({ dishId, photoPath, log = () => {} }) {
  if (!/^[a-z0-9-]+$/.test(dishId)) throw new Error("菜品 id 不合法");
  const cut = await cutout(photoPath, dishId, log);
  const raw = await generateGLB(cut, dishId, log, { photoPath });
  const min = await compressGLB(raw, dishId, log);
  // Colour-matching helps when the texture came back with a cast, and hurts
  // when the photo is mostly bowl; keep it opt-out per run and review in /admin.
  if (process.env.MATCH_COLOURS !== "0") await matchColours(min, cut, log);
  await alignToPhoto(min, cut, dishId, log);

  // Serve the candidate for review before anything is published.
  const reviewRel = `models/candidates/upload/${dishId}.min.glb`;
  const cover = await renderCover(reviewRel, dishId, log);
  rmSync(raw, { force: true });

  return {
    dishId,
    cutout: `img/${dishId}-cutout.png`,
    views: VIEWS.map(([name]) => `img/${dishId}-view-${name}.png`),
    model: reviewRel,
    cover: `img/3d-covers/${dishId}.webp`,
    bytes: readFileSync(min).length,
  };
}

/* Promote a reviewed candidate into production and return the paths the
   menu should reference. Publishing is deliberately a separate step. */
export function publish(dishId) {
  const src = join(CANDIDATES, `${dishId}.min.glb`);
  if (!existsSync(src)) throw new Error("没有待发布的候选模型");
  mkdirSync(PRODUCTION, { recursive: true });
  const dest = join(PRODUCTION, `${dishId}.glb`);
  writeFileSync(dest, readFileSync(src));
  return { model: `${dishId}.glb`, cover: `3d-covers/${dishId}.webp` };
}

/* ---------------- CLI ---------------- */

if (process.argv[1] && process.argv[1].endsWith("pipeline.mjs")) {
  const [dishId, photo] = process.argv.slice(2);
  if (!dishId || !photo) {
    console.error("用法: node scripts/pipeline.mjs <dish-id> <photo>");
    process.exit(1);
  }
  const result = await runPipeline({ dishId, photoPath: photo, log: m => console.log("·", m) });
  console.log("\n候选已就绪，请在 /model-qa.html 审核后再发布:");
  console.log(JSON.stringify(result, null, 1));
}
