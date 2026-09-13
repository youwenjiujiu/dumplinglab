/* Dumpling Lab — table menu server.

   Serves the static menu, relays customer calls/orders to the staff screen
   in real time (SSE), and runs the /admin back office: dish photos
   (upload → local background removal → menu), the photo → 3D pipeline,
   and one-click publishing of the static menu to production.

   Run:  node server.mjs                (default port 8377)
     Menu   http://<host>:8377/?table=A1
     Staff  http://<host>:8377/staff
     Admin  http://<host>:8377/admin

   Admin access: set a password once —
     security add-generic-password -s dumplinglab-admin -a admin -w <password>
   (or DL_ADMIN_PASSWORD in the environment). Without one, /admin only
   answers on this machine (localhost).

   Generation credentials stay on the server; the browser only ever
   receives finished image, GLB and cover files.
*/

import { createServer } from "node:http";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync, spawn } from "node:child_process";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import sharp from "sharp";
import { runPipeline, publish, cutout } from "./scripts/pipeline.mjs";
import { optimise } from "./scripts/optimise-images.mjs";
import { cleanCall, cleanGroup, cleanOrder, RequestError } from "./web/server/order-core.js";
import { cleanCartOpIds, cleanCartOperation, cleanTable, reduceCartOperations } from "./web/server/cart-core.js";

const ROOT = join(fileURLToPath(import.meta.url), "..");
const WEB = join(ROOT, "web");
const IMG = join(WEB, "img");
const UPLOADS = join(ROOT, "uploads");          // originals, kept out of git and out of the site
const MENU_FILE = join(WEB, "menu-data.js");
const PORT = process.env.PORT || 8377;
const LIVE_URL = process.env.DL_LIVE_URL || "https://dumplinglab-menu.vercel.app";

const MIME = {
  ".html": "text/html;charset=utf-8", ".css": "text/css", ".js": "text/javascript",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
  ".svg": "image/svg+xml", ".glb": "model/gltf-binary", ".webp": "image/webp",
  ".otf": "font/otf", ".woff2": "font/woff2", ".ico": "image/x-icon",
};

/* ---------------- admin access ---------------- */

function adminSecret() {
  if (process.env.DL_ADMIN_PASSWORD) return process.env.DL_ADMIN_PASSWORD;
  try {
    return execFileSync("security", ["find-generic-password", "-s", "dumplinglab-admin", "-w"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch { return ""; }
}
const ADMIN_SECRET = adminSecret();
const isLoopback = req => ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress || "");

/* True when the request may use the back office; otherwise the response is already sent. */
function adminAllowed(req, res) {
  if (ADMIN_SECRET) {
    const [scheme, value] = (req.headers.authorization || "").split(" ");
    if (scheme === "Basic" && value) {
      const given = Buffer.from(value, "base64").toString("utf8").split(":").slice(1).join(":");
      if (given.length === ADMIN_SECRET.length && given === ADMIN_SECRET) return true;
    }
    res.writeHead(401, { "www-authenticate": 'Basic realm="Dumpling Lab Admin", charset="UTF-8"', "content-type": "text/plain;charset=utf-8" });
    res.end("需要后台密码");
    return false;
  }
  if (isLoopback(req)) return true;
  res.writeHead(403, { "content-type": "text/plain;charset=utf-8" });
  res.end("后台还没有设置密码，只能在服务器本机打开。\n设置：security add-generic-password -s dumplinglab-admin -a admin -w <密码>，然后重启 node server.mjs");
  return false;
}

/* ---------------- staff relay ---------------- */

const staffClients = new Set();
const feed = [];
const resolvedEvents = new Map();
const cartOperations = new Map();              // table -> Map(operation id, operation)
const cartClaims = new Map();                  // table:operation id -> order request id

const cartScope = (table, group) => `${table}:${group}`;
const localCart = (table, group, knownVersion = "") => {
  const scope = cartScope(table, group), operations = [...(cartOperations.get(scope)?.values() || [])];
  const orders = [...feed, ...resolvedEvents.values()].filter(event => event.type === "order" && event.table === table && event.group === group).sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const version = [...operations.map(operation => `${operation.id}:${operation.at}`), ...orders.map(order => `${order.id}:${order.at}`)].sort().join("|") || "empty";
  return knownVersion && knownVersion === version ? { unchanged: true, version } : { ...reduceCartOperations(operations), orders, version };
};
function saveLocalCartOperation(operation) {
  const scope = cartScope(operation.table, operation.group);
  if (!cartOperations.has(scope)) cartOperations.set(scope, new Map());
  cartOperations.get(scope).set(operation.id, operation);
  return localCart(operation.table, operation.group);
}
function claimLocalCart(table, group, ids, requestId) {
  const operations = cartOperations.get(cartScope(table, group));
  if (!operations || ids.some(id => !operations.has(id))) throw new RequestError("共享购物车已更新，请重试", 409);
  for (const id of ids) {
    const claimedBy = cartClaims.get(`${table}:${group}:${id}`);
    if (claimedBy && claimedBy !== requestId) throw new RequestError("这些菜已由同桌的其他人下单，购物车即将刷新", 409);
  }
  for (const id of ids) cartClaims.set(`${table}:${group}:${id}`, requestId);
}
function clearLocalCart(table, group, ids) {
  const operations = cartOperations.get(cartScope(table, group));
  for (const id of ids) operations?.delete(id);
  return localCart(table, group);
}

function broadcast(event) {
  const existing = event.id && (feed.find(item => item.id === event.id) || resolvedEvents.get(event.id));
  if (existing) return existing;
  event.at = new Date().toISOString();
  event.id ||= crypto.randomUUID();
  feed.push(event);
  if (feed.length > 200) feed.shift();
  const line = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of staffClients) res.write(line);
  console.log(`[${event.type}] table ${event.table || "-"}${event.no ? ` order ${event.no}` : ""}`);
  return event;
}

/* ---------------- menu file ---------------- */

async function readMenu() {
  const source = await readFile(MENU_FILE, "utf8");
  const marker = ["globalThis.MENU = ", "const MENU = "].find(value => source.includes(value));
  if (!marker) throw new Error("menu-data.js 结构异常");
  const start = source.indexOf(marker) + marker.length, end = source.lastIndexOf(";");
  if (end < start) throw new Error("menu-data.js 结构异常");
  return { source, start, end, menu: JSON.parse(source.slice(start, end)) };
}
async function writeMenu({ source, start, end }, menu) {
  await writeFile(MENU_FILE, source.slice(0, start) + JSON.stringify(menu, null, 1) + source.slice(end));
}
async function patchDish(dishId, change) {
  const file = await readMenu();
  const dish = file.menu.find(d => d.id === dishId);
  if (!dish) throw new Error(`菜单里没有 ${dishId}`);
  change(dish);
  await writeMenu(file, file.menu);
  return dish;
}
const dishSummary = d => ({
  id: d.id, name: d.name, cn: d.cn, section: d.section, price: d.price, featured: Boolean(d.featured),
  img: d.img || null, cover: d.cover || null, model: d.model || null,
  hasPhoto: Boolean(d.img), hasModel: Boolean(d.model), placeholder: Boolean(d.placeholder),
});

/* ---------------- jobs (3D generation, publishing) ---------------- */

const jobs = new Map();   // id -> { kind, status, steps[], result, error }
let lastDeploy = null;
const newJob = (kind, extra = {}) => {
  const job = { id: Math.random().toString(36).slice(2, 10), kind, status: "running", steps: [], result: null, error: null, ...extra };
  jobs.set(job.id, job);
  return job;
};
const say = (job, message) => job.steps.push({ at: Date.now(), message });

function readBody(req, limit = 40 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", c => {
      size += c.length;
      if (size > limit) { reject(new Error("文件过大（上限 40MB）")); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function startGeneration({ dishId, imageBuffer, ext }) {
  const job = newJob("generate", { dishId });
  const photoPath = join(tmpdir(), `dl-upload-${job.id}${ext || ".jpg"}`);
  await writeFile(photoPath, imageBuffer);
  (async () => {   // detached; /api/admin/job/:id reports progress
    try {
      job.result = await runPipeline({ dishId, photoPath, log: m => say(job, m) });
      job.status = "done";
    } catch (error) {
      job.error = error.message; job.status = "failed"; say(job, `失败：${error.message}`);
    }
  })();
  return job;
}

/* Publish web/ to production with the Vercel CLI (must be logged in on this machine). */
function startDeploy() {
  if ([...jobs.values()].some(j => j.kind === "deploy" && j.status === "running")) throw new Error("已有一次发布正在进行");
  const job = newJob("deploy");
  say(job, "开始发布到线上…");
  let output = "";
  let child;
  // On networks that intercept HTTPS (office proxy), Node needs the proxy's root CA: keep it in deploy-ca.pem (gitignored).
  const caFile = join(ROOT, "deploy-ca.pem");
  const env = existsSync(caFile) && !process.env.NODE_EXTRA_CA_CERTS ? { ...process.env, NODE_EXTRA_CA_CERTS: caFile } : process.env;
  try { child = spawn("vercel", ["--prod", "--yes"], { cwd: WEB, env }); }
  catch (error) { job.status = "failed"; job.error = error.message; return job; }
  const onData = d => {
    output += d;
    for (const line of String(d).split("\n").map(l => l.trim()).filter(Boolean)) say(job, line.replace(/\s+/g, " ").slice(0, 160));
  };
  child.stdout.on("data", onData); child.stderr.on("data", onData);
  child.on("error", error => { job.status = "failed"; job.error = error.message === "spawn vercel ENOENT" ? "这台电脑没有安装 Vercel 命令行" : error.message; });
  child.on("close", code => {
    if (job.status !== "running") return;
    if (code === 0) {
      job.result = { url: LIVE_URL, deployment: output.match(/Production:\s*(\S+)/)?.[1] || null, at: new Date().toISOString() };
      lastDeploy = job.result; job.status = "done"; say(job, `已上线 ${LIVE_URL}`);
      console.log(`[deploy] ${LIVE_URL}`);
    } else { job.status = "failed"; job.error = `发布失败（vercel 退出码 ${code}）`; }
  });
  return job;
}

/* ---------------- dish photos ----------------
   The original is kept in uploads/; the menu gets a background-removed PNG
   (local rembg, the food's pixels untouched). If removal fails the photo is
   used as-is, resized. */

async function savePhoto(dishId, buffer, ext) {
  await mkdir(UPLOADS, { recursive: true });
  const original = join(UPLOADS, `${dishId}-${Date.now()}${ext}`);
  await writeFile(original, buffer);
  let img, method = "cutout";
  try {
    await cutout(original, dishId);
    img = `${dishId}-cutout.png`;
  } catch (error) {
    console.warn(`! cutout failed for ${dishId}: ${error.message.split("\n")[0]} — using the photo as-is`);
    img = `${dishId}-photo.png`; method = "plain";
    await sharp(buffer).rotate().resize(1600, 1600, { fit: "inside", withoutEnlargement: true }).png().toFile(join(IMG, img));
  }
  await optimise(img);                                   // web-sized WebP copies in img/s and img/l
  const dish = await patchDish(dishId, d => { d.img = img; delete d.placeholder; });
  console.log(`[photo] ${dishId} ← ${img} (${method})`);
  return { dish: dishSummary(dish), method };
}

async function removePhoto(dishId) {
  let removed = null;
  const dish = await patchDish(dishId, d => { removed = d.img; delete d.img; delete d.placeholder; });
  if (removed && /-(cutout|photo|placeholder)\.png$/.test(removed)) { await rm(join(IMG, removed), { force: true }); const base = removed.replace(/\.png$/, ""); await rm(join(IMG, "s", `${base}.webp`), { force: true }); await rm(join(IMG, "l", `${base}.webp`), { force: true }); }
  console.log(`[photo] ${dishId} photo removed`);
  return dishSummary(dish);
}

/* Patch menu-data.js so a published dish starts using its model. */
const attachModel = (dishId, { model, cover }) => patchDish(dishId, d => { d.model = model; d.cover = cover; d.img = d.img || `${dishId}-cutout.png`; });

/* ---------------- server ---------------- */

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const path = url.pathname;
  const json = (code, body) => {
    res.writeHead(code, { "content-type": "application/json;charset=utf-8" });
    res.end(JSON.stringify(body));
  };
  const validId = id => id && /^[a-z0-9-]+$/.test(id);

  try {
    /* --- customer --- */
    if (path === "/api/call" && req.method === "POST") {
      const call = cleanCall(JSON.parse((await readBody(req)).toString() || "{}"));
      const saved = broadcast(call);
      return json(200, { ok: true, call: saved });
    }
    if (path === "/api/order" && req.method === "POST") {
      const input = JSON.parse((await readBody(req)).toString() || "{}");
      const order = cleanOrder(input), cartOpIds = cleanCartOpIds(input.cartOpIds);
      const existing = feed.find(event => event.id === order.id) || resolvedEvents.get(order.id);
      if (existing) return json(200, { ok: true, order: existing, cart: localCart(order.table, order.group) });
      claimLocalCart(order.table, order.group, cartOpIds, order.id);
      order.cartOpIds = cartOpIds;
      const saved = broadcast(order);
      return json(200, { ok: true, order: saved, cart: clearLocalCart(order.table, order.group, cartOpIds) });
    }
    if (path === "/api/cart" && req.method === "GET") {
      const table = cleanTable(url.searchParams.get("table"));
      const group = cleanGroup(url.searchParams.get("group"));
      return json(200, { ok: true, cart: localCart(table, group, url.searchParams.get("version") || "") });
    }
    if (path === "/api/cart" && req.method === "POST") {
      const operation = cleanCartOperation(JSON.parse((await readBody(req)).toString() || "{}"));
      return json(200, { ok: true, cart: saveLocalCartOperation(operation) });
    }
    if (path === "/api/events") {
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
      res.write(`data: ${JSON.stringify({ type: "hello", feed })}\n\n`);
      staffClients.add(res);
      req.on("close", () => staffClients.delete(res));
      return;
    }
    if (path === "/api/feed" && req.method === "GET") {
      const after = Number(url.searchParams.get("after")) || 0;
      const events = feed.filter(event => Date.parse(event.at) >= after);
      const cursor = feed.reduce((latest, event) => Math.max(latest, Date.parse(event.at) || 0), after);
      return json(200, { events, cursor, activeIds: feed.map(event => event.id) });
    }
    if (path === "/api/resolve" && req.method === "POST") {
      const { id } = JSON.parse((await readBody(req)).toString() || "{}");
      if (typeof id !== "string" || !/^[a-f0-9-]{16,64}$/i.test(id)) return json(400, { error: "事件编号无效" });
      const index = feed.findIndex(event => event.id === id);
      if (index >= 0) {
        const [event] = feed.splice(index, 1);
        resolvedEvents.set(id, event);
        if (resolvedEvents.size > 1000) resolvedEvents.delete(resolvedEvents.keys().next().value);
      }
      return json(200, { ok: true });
    }

    /* --- admin (password or localhost) --- */
    if (path === "/admin" || path === "/admin.html" || path.startsWith("/api/admin/")) {
      if (!adminAllowed(req, res)) return;
    }
    if (path === "/api/admin/dishes") {
      const { menu } = await readMenu();
      return json(200, { dishes: menu.map(dishSummary), lastDeploy, liveURL: LIVE_URL });
    }
    if (path === "/api/admin/photo" && req.method === "POST") {
      const dishId = url.searchParams.get("dish");
      if (!validId(dishId)) return json(400, { error: "缺少或非法的菜品 id" });
      const ext = (extname(url.searchParams.get("filename") || "").toLowerCase() || ".jpg").replace(/[^.a-z0-9]/g, "");
      const buffer = await readBody(req);
      if (!buffer.length) return json(400, { error: "没有收到图片" });
      return json(200, await savePhoto(dishId, buffer, ext));
    }
    if (path === "/api/admin/photo" && req.method === "DELETE") {
      const dishId = url.searchParams.get("dish");
      if (!validId(dishId)) return json(400, { error: "缺少或非法的菜品 id" });
      return json(200, { dish: await removePhoto(dishId) });
    }
    if (path === "/api/admin/generate" && req.method === "POST") {
      const dishId = url.searchParams.get("dish");
      const ext = extname(url.searchParams.get("filename") || ".jpg") || ".jpg";
      if (!validId(dishId)) return json(400, { error: "缺少或非法的菜品 id" });
      const buffer = await readBody(req);
      if (!buffer.length) return json(400, { error: "没有收到图片" });
      const job = await startGeneration({ dishId, imageBuffer: buffer, ext });
      return json(202, { jobId: job.id });
    }
    if (path === "/api/admin/deploy" && req.method === "POST") {
      const job = startDeploy();
      return json(202, { jobId: job.id });
    }
    if (path.startsWith("/api/admin/job/")) {
      const job = jobs.get(path.split("/").pop());
      if (!job) return json(404, { error: "任务不存在" });
      return json(200, { kind: job.kind, status: job.status, steps: job.steps, result: job.result, error: job.error });
    }
    if (path === "/api/admin/publish" && req.method === "POST") {
      const { dishId } = JSON.parse((await readBody(req)).toString() || "{}");
      if (!validId(dishId)) return json(400, { error: "缺少或非法的菜品 id" });
      const dish = await attachModel(dishId, publish(dishId));
      console.log(`[publish] ${dishId} → production model`);
      return json(200, { ok: true, dish: dishSummary(dish) });
    }

    /* --- static --- */
    let file = path === "/" ? "/index.html"
      : path === "/staff" ? "/staff.html"
      : path === "/admin" ? "/admin.html"
      : path;
    file = normalize(file).replace(/^(\.\.[/\\])+/, "");
    const data = await readFile(join(WEB, file));
    res.writeHead(200, {
      "content-type": MIME[extname(file)] || "application/octet-stream",
      "cache-control": file.startsWith("/models/") || file.startsWith("/img/") ? "public,max-age=3600" : "no-cache",
    });
    res.end(data);
  } catch (error) {
    if (error?.code === "ENOENT") { res.writeHead(404); return res.end("Not found"); }
    console.error("!", error.message);
    if (!res.headersSent) res.writeHead(error.status || 500, { "content-type": "application/json;charset=utf-8" });
    res.end(JSON.stringify({ error: error.message }));
  }
});

server.listen(PORT, () => {
  console.log(`Dumpling Lab → http://localhost:${PORT}`);
  console.log(`  Menu   /?table=A1`);
  console.log(`  Staff  /staff`);
  console.log(`  Admin  /admin  ${ADMIN_SECRET ? "(密码已设置)" : "(未设密码：仅本机可开)"}`);
  if (!existsSync(join(WEB, "menu-data.js"))) console.warn("! web/menu-data.js 不存在");
});
