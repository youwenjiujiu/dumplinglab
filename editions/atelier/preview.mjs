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
import { createOnlineService, bookingDates, SLOTS } from '../../web/server/online-core.js';

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
// Local fixtures are explicitly labelled and never sent to external providers.
db.online ||= {};
const previewLocations = [{ id: 'preview-store', name: '本地测试门店 / Preview store', address: '本地测试地址（非真实自取点）' }];
const online = createOnlineService({
  storage: {
    async read(id) { await queue; const r = db.online[id]; return r ? {value:structuredClone(r.value),etag:String(r.version)} : null; },
    async write(id,value,etag) { return transaction(() => {
      if (String(db.online[id]?.version || '') !== String(etag || '')) { const e=new Error('Conflict');e.conflict=true;throw e; }
      db.online[id]={value,version:(db.online[id]?.version||0)+1};
    }); },
    isConflict: e=>e.conflict,
    async all() { await queue; return Object.values(db.online).map(r=>structuredClone(r.value)); },
  },
  payment: { ensureReady() {}, async create(o) { return {id:`preview_${o.id}`,url:`/?preview_payment=${o.id}`}; } },
  async checkAddress(postal) {
    if (postal === '999999') return {distanceKm:11,address:'Outside test zone'};
    if (postal !== '059911') throw new RequestError('本地测试请使用邮编 059911；999999 用于测试超区');
    return {distanceKm:1,address:'本地配送测试地址 · 059911（非真实配送）'};
  },
  config: { locations: previewLocations, origin:'http://127.0.0.1:7898' },
});
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
      if (url.pathname === '/api/online') {
        if (req.method === 'GET') {
          const id = url.searchParams.get('id');
          if (id) return json(200,{ok:true,order:await online.get(id,String(req.headers.authorization||'').replace(/^Bearer /,''))});
          return json(200,{ok:true,config:{preview:true,locations:previewLocations,dates:bookingDates(),slots:SLOTS,takeawayEnabled:true,deliveryEnabled:true,deliveryMinimum:100,deliveryRate:0.09,gstRate:0.09,radiusKm:10}});
        }
        if (req.method === 'POST') {
          if (input.action === 'preview-pay') {
            const order=await online.get(input.requestId,input.token);
            await online.paymentEvent({id:`preview_${order.id}`,metadata:{order_id:order.id},currency:'sgd',amount_total:Math.round(order.total*100),payment_status:'paid'});
            return json(200,{ok:true});
          }
          return json(200,{ok:true,...(input.action==='quote'?{order:await online.quote(input)}:await online.checkout(input))});
        }
        return json(405,{ok:false,error:'Method not allowed'});
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
        const events=[...db.events.filter(e=>!e.resolvedAt),...await online.feed()];
        return json(200, { events,activeIds:events.map(e=>e.id),cursor:Date.now() });
      }
      if (url.pathname === '/api/pickup' && req.method === 'POST') {
        if (!['inspect','collect'].includes(input.action)) throw new RequestError('无效操作');
        return json(200,{ok:true,order:await online.pickup(input.id,input.code,input.action==='collect')});
      }
      if (url.pathname === '/api/resolve' && req.method === 'POST') {
        if (!await online.resolve(input.id)) await transaction(()=>{const e=db.events.find(e=>e.id===input.id);if(e)e.resolvedAt=new Date().toISOString();});
        return json(200,{ok:true});
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
      "/error-copy.js",
      "/fulfilment.js",
      "/table-scene.js",
      "/shared-table.css",
      "/shared-motion.js",
      "/micro-motion.js",
      "/receipt-motion.js",
      "/sharing-motion.js",
      "/cooking-motion.js",
      "/bilingual-fit.js",
      "/shared-table.js",
    ]);
    const allowedAsset =
      /^\/(img|brand|fonts)\//.test(path) ||
      ["/menu-data.js", "/lunch-archive.js", "/lunch-menu.js", "/order-pricing.js", "/i18n.js", "/staff.html", "/vendor/three.module.js"].includes(path);
    if (!localFiles.has(path) && !allowedAsset)
      return json(404, { error: "Not found" });
    const data = await readFile(
      path === "/cooking-motion.js"
        ? resolve(here, "generated/preparation-cooking/cooking.js")
        : path === "/sharing-motion.js"
        ? resolve(here, "generated/table-sharing/developer/web-component/table-sharing.js")
        : path === "/receipt-motion.js"
        ? resolve(here, "generated/receipt-print/developer/web-component/receipt-print.js")
        : path === "/micro-motion.js"
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
