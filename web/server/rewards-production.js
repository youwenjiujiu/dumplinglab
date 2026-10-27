import { get, put } from "@vercel/blob";
import { isStorageConflict } from './storage-conflict.js';
import { ensureStorage } from "./order-store.js";
import { createRewardsService } from "./rewards-core.js";
const path = "dumplinglab-rewards/v1/state.json";
export const rewardsService = createRewardsService({
  async read() {
    ensureStorage();
    const result = await get(path, {
      access: "private",
      useCache: false,
      headers: { "accept-encoding": "identity" },
    });
    if (!result) return null;
    if (result.statusCode !== 200 || !result.stream)
      throw new Error("Rewards storage unavailable");
    return {
      value: await new Response(result.stream).json(),
      etag: result.blob.etag,
    };
  },
  async write(value, etag) {
    ensureStorage();
    await put(path, JSON.stringify(value), {
      access: "private",
      addRandomSuffix: false,
      contentType: "application/json",
      cacheControlMaxAge: 60,
      ...(etag
        ? { allowOverwrite: true, ifMatch: etag }
        : { allowOverwrite: false }),
    });
  },
  isConflict: isStorageConflict,
});
