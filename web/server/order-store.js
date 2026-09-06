import { get, list, put, rename } from "@vercel/blob";

const PENDING = "dumplinglab-events/v1/pending/";
const RESOLVED = "dumplinglab-events/v1/resolved/";
const HISTORY = "dumplinglab-order-history/v1/";
const pathFor = (prefix, id) => `${prefix}${id}.json`;
const historyPath = event => `${HISTORY}${event.table}/${event.group || "A"}/${event.id}.json`;

export class StorageUnavailableError extends Error {
  constructor(message = "线上收单服务尚未配置") {
    super(message);
    this.status = 503;
  }
}

export function ensureStorage() {
  // Current Vercel Blob connections expose BLOB_STORE_ID and let @vercel/blob
  // obtain a short-lived OIDC token at request time. VERCEL_OIDC_TOKEN is not
  // necessarily present as a static environment variable.
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) throw new StorageUnavailableError();
}

export async function saveEvent(event) {
  ensureStorage();
  const archived = await list({ prefix: pathFor(RESOLVED, event.id), limit: 1 });
  if (archived.blobs.some(blob => blob.pathname === pathFor(RESOLVED, event.id))) return event;
  await put(pathFor(PENDING, event.id), JSON.stringify(event), {
    access: "private",
    contentType: "application/json;charset=utf-8",
    allowOverwrite: true,
    cacheControlMaxAge: 60,
  });
  if (event.type === "order") await put(historyPath(event), JSON.stringify(event), {
    access: "private",
    contentType: "application/json;charset=utf-8",
    allowOverwrite: true,
    cacheControlMaxAge: 60,
  });
  return event;
}

async function readEvent(blob) {
    const result = await get(blob.pathname, { access: "private", useCache: false });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    return await new Response(result.stream).json();
}

async function listAll(prefix) {
  const blobs = []; let cursor;
  do {
    const page = await list({ prefix, cursor, limit: 1000 });
    blobs.push(...page.blobs); cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return blobs;
}

export async function readOrderHistory(table, group) {
  ensureStorage();
  const prefix = `${HISTORY}${table}/${group}/`;
  const orders = (await Promise.all((await listAll(prefix)).map(readEvent))).filter(Boolean);
  return orders.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

export async function readFeed(after = 0) {
  ensureStorage();
  const blobs = (await listAll(PENDING)).sort((a, b) => new Date(a.uploadedAt) - new Date(b.uploadedAt));
  const fresh = blobs.filter(blob => +new Date(blob.uploadedAt) >= after);
  const events = (await Promise.all(fresh.map(readEvent))).filter(Boolean).sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const cursor = blobs.reduce((latest, blob) => Math.max(latest, +new Date(blob.uploadedAt) || 0), after);
  return { events, cursor, activeIds: blobs.map(blob => blob.pathname.slice(PENDING.length, -5)) };
}

export async function resolveEvent(id) {
  ensureStorage();
  const source = pathFor(PENDING, id);
  const pending = await list({ prefix: source, limit: 1 });
  if (!pending.blobs.some(blob => blob.pathname === source)) return;
  await rename(source, pathFor(RESOLVED, id), { access: "private", allowOverwrite: true });
}
