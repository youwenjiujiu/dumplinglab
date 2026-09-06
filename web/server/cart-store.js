import { createHash } from "node:crypto";
import { del, get, list, put } from "@vercel/blob";
import { cleanTable, reduceCartOperations } from "./cart-core.js";
import { ensureStorage, readOrderHistory } from "./order-store.js";

const CARTS = "dumplinglab-carts/v1/";
const CLAIMS = "dumplinglab-cart-claims/v1/";
const cartPrefix = (table, group) => `${CARTS}${cleanTable(table)}/${group}/`;
const cartPath = (table, group, id) => `${cartPrefix(table, group)}${id}.json`;
const claimPath = (table, group, id) => `${CLAIMS}${cleanTable(table)}/${group}/${id}.json`;

export class CartConflictError extends Error {
  constructor() {
    super("这些菜已由同桌的其他人下单，购物车即将刷新");
    this.status = 409;
  }
}

async function readJson(pathname) {
  const result = await get(pathname, { access: "private" });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  return new Response(result.stream).json();
}

export async function readSharedCart(table, group, knownVersion = "") {
  ensureStorage();
  const prefix = cartPrefix(table, group);
  const [result, orders] = await Promise.all([list({ prefix, limit: 1000 }), readOrderHistory(table, group)]);
  const versionParts = result.blobs.map(blob => `${blob.pathname}:${blob.etag}`);
  versionParts.push(...orders.map(order => `${order.id}:${order.at}`));
  const version = createHash("sha256").update(versionParts.sort().join("|")).digest("base64url").slice(0, 20);
  if (knownVersion && knownVersion === version) return { unchanged: true, version };
  const operations = (await Promise.all(result.blobs.map(async blob => {
    try { return { ...(await readJson(blob.pathname)), storedAt: +new Date(blob.uploadedAt) }; }
    catch { return null; }
  }))).filter(Boolean);
  return { ...reduceCartOperations(operations), orders, version };
}

export async function saveCartOperation(operation) {
  ensureStorage();
  await put(cartPath(operation.table, operation.group, operation.id), JSON.stringify(operation), {
    access: "private", contentType: "application/json;charset=utf-8", allowOverwrite: true, cacheControlMaxAge: 60,
  });
  return readSharedCart(operation.table, operation.group);
}

export async function claimCartOperations(table, group, ids, requestId) {
  ensureStorage();
  const newlyClaimed = [];
  try {
    for (const id of [...ids].sort()) {
      const path = claimPath(table, group, id);
      const claim = JSON.stringify({ requestId, at: new Date().toISOString(), checksum: createHash("sha256").update(`${table}:${group}:${id}`).digest("hex").slice(0, 16) });
      try {
        await put(path, claim, { access: "private", contentType: "application/json;charset=utf-8", allowOverwrite: false, cacheControlMaxAge: 60 });
        newlyClaimed.push(path);
      } catch (error) {
        let existing = null;
        try { existing = await readJson(path); } catch { throw error; }
        if (!existing) throw error;
        if (existing?.requestId === requestId) continue;
        throw new CartConflictError();
      }
    }
  } catch (error) {
    if (newlyClaimed.length) await del(newlyClaimed).catch(() => {});
    throw error;
  }
}

export async function clearCartOperations(table, group, ids) {
  ensureStorage();
  if (ids.length) await del(ids.map(id => cartPath(table, group, id)));
  return readSharedCart(table, group);
}
