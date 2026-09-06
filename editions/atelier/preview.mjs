// Local-only preview. Reuses catalogue validation; never forwards orders to production.
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile, rename } from "node:fs/promises";
import { dirname, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { cleanNickname, contributorsFor } from "./cart-meta.mjs";
import {
  cleanCartOperation,
  cleanCartOpIds,
  cleanTable,
  reduceCartOperations,
  currentOperation,
} from "../../web/server/cart-core.js";
import {
  cleanOrder,
  cleanCall,
  cleanGroup,
  RequestError,
} from "../../web/server/order-core.js";

const here = dirname(fileURLToPath(import.meta.url)),
  root = resolve(here, "../..");
const stateFile = resolve(
  process.env.DL_PREVIEW_DATA || resolve(root, ".local/atelier"),
  "orders.json",
);
let db = { scopes: {}, events: [], sequence: 0 };
try {
  db = JSON.parse(await readFile(stateFile, "utf8"));
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
const scope = (t, g) => `${t}:${g}`;
db.activity ||= {};
const getCart = (table, group, version) => {
  const operations = db.scopes[scope(table, group)] || [];
  const orders = db.events.filter(
    (e) => e.type === "order" && e.table === table && e.group === group,
  );
  const v =
    "shared-v2:" + globalThis.MENU_VERSION + ":" +
    ([...operations.map((o) => o.id), ...orders.map((o) => o.id)].join(",") ||
      "empty");
  return v === version
    ? { unchanged: true, version: v }
    : {
        ...reduceCartOperations(operations),
        orders,
        version: v,
        contributors: contributorsFor(operations),
        activity: (db.activity[scope(table, group)] || []).slice(-40),
      };
};
const save = async () => {
  await mkdir(dirname(stateFile), { recursive: true });
  await writeFile(`${stateFile}.tmp`, JSON.stringify(db));
  await rename(`${stateFile}.tmp`, stateFile);
};
let queue = Promise.resolve();
function transaction(fn) {
  const result = queue.then(async () => {
    const previous = structuredClone(db);
    try {
      const out = fn();
      await save();
      return out;
    } catch (e) {
      db = previous;
      throw e;
    }
  });
  queue = result.catch(() => {});
  return result;
}
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".webp": "image/webp",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
};
createServer(async (req, res) => {
  const json = (status, out) => {
    res.writeHead(status, {
      "content-type": "application/json",
      "cache-control": "no-store",
    });
    res.end(JSON.stringify(out));
  };
  try {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname.startsWith("/api/")) {
      let input;
      if (req.method === "POST") {
        let raw = "";
        for await (const chunk of req) {
          raw += chunk;
          if (raw.length > 65536)
            throw new RequestError("Request too large", 413);
        }
        try {
          input = JSON.parse(raw);
        } catch {
          throw new RequestError("Invalid JSON");
        }
      }
      if (url.pathname === "/api/cart" && req.method === "GET") {
        await queue;
        return json(200, {
          ok: true,
          cart: getCart(
            cleanTable(url.searchParams.get("table")),
            cleanGroup(url.searchParams.get("group")),
            url.searchParams.get("version"),
          ),
        });
      }
      if (url.pathname === "/api/cart" && req.method === "POST") {
        const op = cleanCartOperation(input);
        op.actorName = cleanNickname(input.actorName);
        return json(
          200,
          await transaction(() => {
            const key = scope(op.table, op.group),
              list = (db.scopes[key] ||= []);
            const consumed = db.events.some(
              (e) =>
                e.table === op.table &&
                e.group === op.group &&
                e.cartOpIds?.includes(op.id),
            );
            if (!consumed && !list.some((o) => o.id === op.id)) {
              if (op.kind === "note" && Object.hasOwn(input, "baseNote")) {
                const current = reduceCartOperations(list).note || "";
                const base = typeof input.baseNote === "string" ? input.baseNote.trim().slice(0, 240) : "";
                if (base !== current) {
                  const error = new RequestError("同桌修改了备注，请确认要保留的内容。", 409);
                  error.code = "NOTE_CONFLICT";
                  error.cart = getCart(op.table, op.group);
                  throw error;
                }
              }
              op.storedAt = Math.max(Date.now(), db.sequence + 1);
              db.sequence = op.storedAt;
              list.push(op);
              db.activity[key] = [...(db.activity[key] || []), op].slice(-80);
            }
            return { ok: true, cart: getCart(op.table, op.group) };
          }),
        );
      }
      if (url.pathname === "/api/order" && req.method === "POST") {
        const order = cleanOrder(input),
          ids = cleanCartOpIds(input.cartOpIds);
        return json(
          200,
          await transaction(() => {
            const existing = db.events.find((e) => e.id === order.id);
            if (existing) {
              if (
                existing.type !== "order" ||
                existing.table !== order.table ||
                existing.group !== order.group
              )
                throw new RequestError("Request ID conflict", 409);
              return {
                ok: true,
                order: existing,
                cart: getCart(order.table, order.group),
              };
            }
            const key = scope(order.table, order.group),
              ops = db.scopes[key] || [];
            if (ids.some((id) => !ops.some((op) => op.id === id)))
              throw new RequestError(
                "同桌已经提交了这份菜单，请查看已下单。",
                409,
              );
            const selected = reduceCartOperations(
              ops.filter((op) => ids.includes(op.id)),
            );
            if (ops.some((op) => currentOperation(op) && !ids.includes(op.id) && (op.kind === "note" || (op.kind === "delta" && op.delta < 0))))
              throw new RequestError("同桌修改了菜品或备注，请重新确认订单。", 409);
            const canon = (items) =>
              JSON.stringify(
                items
                  .map((i) => [i.id, i.style || null, i.qty])
                  .sort((a, b) =>
                    JSON.stringify(a).localeCompare(JSON.stringify(b)),
                  ),
              );
            if (canon(selected.items) !== canon(order.items))
              throw new RequestError("购物车已更新，请重新确认。", 409);
            order.cartOpIds = ids;
            order.contributors = contributorsFor(
              ops.filter((op) => ids.includes(op.id)),
            );
            order.actorName = cleanNickname(input.actorName);
            db.events.push(order);
            db.scopes[key] = ops.filter((op) => !ids.includes(op.id));
            return { ok: true, order, cart: getCart(order.table, order.group) };
          }),
        );
      }
      if (url.pathname === "/api/call" && req.method === "POST") {
        const call = cleanCall(input);
        return json(
          200,
          await transaction(() => {
            const prior = db.events.find((e) => e.id === call.id);
            if (!prior) db.events.push(call);
            return { ok: true, call: prior || call };
          }),
        );
      }
      if (url.pathname === "/api/feed" && req.method === "GET") {
        await queue;
        return json(200, { events: db.events });
      }
      return json(404, { error: "Unknown endpoint" });
    }
    let path = decodeURIComponent(url.pathname);
    if (path === "/") path = "/index.html";
    if (path.includes("..") || path.split("/").some((p) => p.startsWith(".")))
      return json(403, { error: "Forbidden" });
    const localFiles = new Set([
      "/index.html",
      "/atelier.css",
      "/app.js",
      "/lunch-ui.js",
      "/cart-store.js",
      "/table-scene.js",
      "/shared-table.css",
      "/shared-motion.js",
      "/micro-motion.js",
      "/shared-table.js",
    ]);
    const allowedAsset =
      /^\/(img|brand|fonts)\//.test(path) ||
      ["/menu-data.js", "/lunch-menu.js", "/i18n.js", "/vendor/three.module.js"].includes(path);
    if (!localFiles.has(path) && !allowedAsset)
      return json(404, { error: "Not found" });
    const data = await readFile(
      path === "/micro-motion.js"
        ? resolve(here, "generated/order-feedback/developer/web-component/order-feedback.js")
        : path === "/shared-motion.js"
        ? resolve(
            here,
            "generated/table-view-motion/developer/web-component/table-layout.js",
          )
        : resolve(
            localFiles.has(path) ? here : resolve(root, "web"),
            `.${path}`,
          ),
    );
    const media = /^\/(img|brand|fonts)\//.test(path);
    const etag = media ? `"${createHash("sha256").update(data).digest("hex")}"` : null;
    if (media && req.headers["if-none-match"] === etag) {
      res.writeHead(304, { etag, "cache-control": "public, max-age=0, must-revalidate" });
      res.end();
      return;
    }
    res.writeHead(200, {
      "content-type": mime[extname(path)] || "application/octet-stream",
      "cache-control": media ? "public, max-age=0, must-revalidate" : "no-store",
      ...(etag ? { etag } : {}),
    });
    res.end(req.method === "HEAD" ? undefined : data);
  } catch (e) {
    json(e.status || (e.code === "ENOENT" ? 404 : 500), {
      ok: false,
      error: e.status ? e.message : "Local preview error",
      ...(e.code === "NOTE_CONFLICT" ? { code: e.code, cart: e.cart } : {}),
    });
  }
}).listen(Number(process.env.PORT || 7898), "127.0.0.1", () =>
  console.log(
    `Atelier local preview: http://127.0.0.1:${process.env.PORT || 7898}/?table=A1 — local orders only`,
  ),
);
