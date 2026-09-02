/* Dumpling Lab — table menu server.

   Serves the static menu, relays customer calls/orders to the staff screen
   in real time (SSE), and runs the photo → 3D pipeline for /admin.

   Run:  node server.mjs                (default port 8377)
     Menu   http://<host>:8377/?table=A1
     Staff  http://<host>:8377/staff
     Admin  http://<host>:8377/admin

   Generation credentials stay on the server; the browser only ever
   receives finished GLB and cover files.
*/

import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { readdirSync, existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { runPipeline, publish } from "./scripts/pipeline.mjs";

const ROOT = join(fileURLToPath(import.meta.url), "..");
const WEB = join(ROOT, "web");
const PORT = process.env.PORT || 8377;

const MIME = {
  ".html": "text/html;charset=utf-8", ".css": "text/css", ".js": "text/javascript",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
  ".svg": "image/svg+xml", ".glb": "model/gltf-binary", ".webp": "image/webp",
  ".otf": "font/otf", ".woff2": "font/woff2", ".ico": "image/x-icon",
};

/* ---------------- staff relay ---------------- */

const staffClients = new Set();
const feed = [];

function broadcast(event) {
  event.at = new Date().toISOString();
  event.id = Math.random().toString(36).slice(2, 9);
  feed.push(event);
  if (feed.length > 200) feed.shift();
  const line = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of staffClients) res.write(line);
  console.log(`[${event.type}] table ${event.table || "-"}${event.no ? ` order ${event.no}` : ""}`);
}

/* ---------------- admin jobs ---------------- */

const jobs = new Map();   // id -> { status, steps[], result, error }

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

async function startJob({ dishId, imageBuffer, ext }) {
  const id = Math.random().toString(36).slice(2, 10);
  const job = { id, dishId, status: "running", steps: [], result: null, error: null };
  jobs.set(id, job);

  const photoPath = join(tmpdir(), `dl-upload-${id}${ext || ".jpg"}`);
  await writeFile(photoPath, imageBuffer);

  // Run detached; /api/admin/job/:id reports progress.
  (async () => {
    try {
      job.result = await runPipeline({
        dishId,
        photoPath,
        log: message => { job.steps.push({ at: Date.now(), message }); },
      });
      job.status = "done";
    } catch (error) {
      job.error = error.message;
      job.status = "failed";
      job.steps.push({ at: Date.now(), message: `失败：${error.message}` });
    }
  })();

  return job;
}

/* Patch menu-data.js in place so a published dish starts using its model. */
async function attachToMenu(dishId, { model, cover }) {
  const file = join(WEB, "menu-data.js");
  const source = await readFile(file, "utf8");
  const start = source.indexOf("const MENU = ");
  const end = source.lastIndexOf(";");
  if (start < 0 || end < 0) throw new Error("menu-data.js 结构异常");

  const menu = JSON.parse(source.slice(start + 13, end));
  const dish = menu.find(d => d.id === dishId);
  if (!dish) throw new Error(`菜单里没有 ${dishId}`);
  dish.model = model;
  dish.cover = cover;
  dish.img = dish.img || `${dishId}-cutout.png`;

  const next = source.slice(0, start + 13) + JSON.stringify(menu, null, 1) + source.slice(end);
  await writeFile(file, next);
  return dish;
}

/* ---------------- server ---------------- */

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const path = url.pathname;
  const json = (code, body) => {
    res.writeHead(code, { "content-type": "application/json;charset=utf-8" });
    res.end(JSON.stringify(body));
  };

  try {
    /* --- customer --- */
    if (path === "/api/call" && req.method === "POST") {
      const body = JSON.parse((await readBody(req)).toString() || "{}");
      broadcast({ type: "call", table: body.table, reason: typeof body.reason === "string" ? body.reason.slice(0, 40) : null });
      return json(200, { ok: true });
    }
    if (path === "/api/order" && req.method === "POST") {
      const body = JSON.parse((await readBody(req)).toString() || "{}");
      broadcast({ type: "order", ...body });
      return json(200, { ok: true });
    }
    if (path === "/api/events") {
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
      res.write(`data: ${JSON.stringify({ type: "hello", feed })}\n\n`);
      staffClients.add(res);
      req.on("close", () => staffClients.delete(res));
      return;
    }

    /* --- admin --- */
    if (path === "/api/admin/dishes") {
      const source = await readFile(join(WEB, "menu-data.js"), "utf8");
      const menu = JSON.parse(source.slice(source.indexOf("const MENU = ") + 13, source.lastIndexOf(";")));
      return json(200, menu.map(d => ({
        id: d.id, name: d.name, cn: d.cn, section: d.section,
        hasPhoto: Boolean(d.img), hasModel: Boolean(d.model),
      })));
    }
    if (path === "/api/admin/generate" && req.method === "POST") {
      const dishId = url.searchParams.get("dish");
      const ext = extname(url.searchParams.get("filename") || ".jpg") || ".jpg";
      if (!dishId || !/^[a-z0-9-]+$/.test(dishId)) return json(400, { error: "缺少或非法的菜品 id" });
      const buffer = await readBody(req);
      if (!buffer.length) return json(400, { error: "没有收到图片" });
      const job = await startJob({ dishId, imageBuffer: buffer, ext });
      return json(202, { jobId: job.id });
    }
    if (path.startsWith("/api/admin/job/")) {
      const job = jobs.get(path.split("/").pop());
      if (!job) return json(404, { error: "任务不存在" });
      return json(200, { status: job.status, steps: job.steps, result: job.result, error: job.error });
    }
    if (path === "/api/admin/publish" && req.method === "POST") {
      const { dishId } = JSON.parse((await readBody(req)).toString() || "{}");
      if (!dishId || !/^[a-z0-9-]+$/.test(dishId)) return json(400, { error: "缺少或非法的菜品 id" });
      const paths = publish(dishId);
      const dish = await attachToMenu(dishId, paths);
      console.log(`[publish] ${dishId} → production`);
      return json(200, { ok: true, dish: { id: dish.id, model: dish.model, cover: dish.cover } });
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
    if (!res.headersSent) res.writeHead(500, { "content-type": "application/json;charset=utf-8" });
    res.end(JSON.stringify({ error: error.message }));
  }
});

server.listen(PORT, () => {
  console.log(`Dumpling Lab → http://localhost:${PORT}`);
  console.log(`  Menu   /?table=A1`);
  console.log(`  Staff  /staff`);
  console.log(`  Admin  /admin`);
});
