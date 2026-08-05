/* Dumplings Lab — tiny backend.
   Serves the static menu AND relays customer calls/orders to the staff
   screen in real time (Server-Sent Events). No dependencies.

   Run:  node server.mjs           (default port 8377)
   Customer menu:  http://<host>:8377/?table=A1
   Staff screen:   http://<host>:8377/staff

   In production the same endpoints back a real POS; the staff screen can
   run on any phone/tablet/computer at the counter. */

import { createServer } from "http";
import { readFile } from "fs/promises";
import { extname, join, normalize } from "path";
import { fileURLToPath } from "url";

const ROOT = join(fileURLToPath(import.meta.url), "..", "web");
const PORT = process.env.PORT || 8377;

const MIME = { ".html":"text/html;charset=utf-8", ".css":"text/css", ".js":"text/javascript",
  ".json":"application/json", ".png":"image/png", ".jpg":"image/jpeg", ".svg":"image/svg+xml",
  ".glb":"model/gltf-binary", ".webp":"image/webp", ".ico":"image/x-icon" };

const clients = new Set();           // staff SSE connections
const feed = [];                     // recent events (calls + orders)

function broadcast(evt) {
  evt.at = new Date().toISOString();
  evt.id = Math.random().toString(36).slice(2, 9);
  feed.push(evt); if (feed.length > 200) feed.shift();
  const line = `data: ${JSON.stringify(evt)}\n\n`;
  for (const res of clients) res.write(line);
  console.log(`[${evt.type}] table ${evt.table||"-"}${evt.no?` order ${evt.no}`:""}`);
}

function body(req) {
  return new Promise(r => { let d=""; req.on("data",c=>d+=c); req.on("end",()=>{ try{r(JSON.parse(d||"{}"))}catch{r({})} }); });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const path = url.pathname;

  // ---- API ----
  if (path === "/api/call" && req.method === "POST") {
    const b = await body(req); broadcast({ type:"call", table:b.table });
    res.writeHead(200,{ "content-type":"application/json" }); return res.end('{"ok":true}');
  }
  if (path === "/api/order" && req.method === "POST") {
    const b = await body(req); broadcast({ type:"order", ...b });
    res.writeHead(200,{ "content-type":"application/json" }); return res.end('{"ok":true}');
  }
  if (path === "/api/events") {
    res.writeHead(200, { "content-type":"text/event-stream", "cache-control":"no-cache", connection:"keep-alive" });
    res.write(`data: ${JSON.stringify({ type:"hello", feed })}\n\n`);
    clients.add(res);
    req.on("close", () => clients.delete(res));
    return;
  }

  // ---- Static ----
  let file = path === "/" ? "/index.html" : path === "/staff" ? "/staff.html" : path;
  file = normalize(file).replace(/^(\.\.[/\\])+/, "");
  try {
    const data = await readFile(join(ROOT, file));
    res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404); res.end("Not found");
  }
});

server.listen(PORT, () => {
  console.log(`Dumplings Lab server → http://localhost:${PORT}`);
  console.log(`  Menu:  http://localhost:${PORT}/?table=A1`);
  console.log(`  Staff: http://localhost:${PORT}/staff`);
});
