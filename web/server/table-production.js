import {catalogService} from './catalog-production.js';
import { get, put, list } from "@vercel/blob";
import { isStorageConflict } from './storage-conflict.js';
import { createTableStore } from "./table-state.js";
import { ensureStorage, readOrderHistory, readFeed, resolveEvent } from "./order-store.js";

async function blobs(prefix) {
  const all = []; let cursor;
  do {
    const page = await list({ prefix, cursor, limit: 1000 });
    all.push(...page.blobs); cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return all;
}
async function read(path) {
  ensureStorage();
  // Compressed HTTP responses receive a weak W/ ETag, which cannot be used for
  // Blob's strong ifMatch write. Request the original representation instead.
  const result = await get(path, { access: "private", useCache: false, headers: { "accept-encoding": "identity" } });
  if (!result) return null;
  if (result.statusCode !== 200 || !result.stream) throw new Error("Unexpected storage read");
  return { value: await new Response(result.stream).json(), etag: result.blob.etag };
}
export const tableStore = createTableStore({
  read,
  async write(path, value, etag) {
    await put(path, JSON.stringify(value), {
      access: "private", addRandomSuffix: false, contentType: "application/json;charset=utf-8", cacheControlMaxAge: 60,
      ...(etag ? { allowOverwrite: true, ifMatch: etag } : { allowOverwrite: false }),
    });
  },
  isConflict: isStorageConflict,
  async all(prefix) {
    ensureStorage();
    const paths = await blobs(prefix);
    return (await Promise.all(paths.map(async blob => (await read(blob.pathname))?.value))).filter(Boolean);
  },
}, {
  menu: () => catalogService.menu(),
  async read(table, group) {
    ensureStorage();
    const [paths, orders] = await Promise.all([blobs(`dumplinglab-carts/v1/${table}/${group}/`), readOrderHistory(table, group)]);
    const consumed = new Set(orders.flatMap(o => o.cartOpIds || []));
    const operations = (await Promise.all(paths.map(async blob => {
      const result = await read(blob.pathname);
      return result ? { ...result.value, storedAt: +new Date(blob.uploadedAt) } : null;
    }))).filter(op => op && !consumed.has(op.id));
    return { operations, orders };
  },
  feed: () => readFeed(0),
  resolve: resolveEvent,
});
