import { get, put, BlobPreconditionFailedError } from "@vercel/blob";
import { ensureStorage } from "./order-store.js";
import { rewardsService } from "./rewards-production.js";
import { catalogService } from "./catalog-production.js";
import { createVoucherService } from "./voucher-core.js";

/* Only the paper tally lives here. The vouchers themselves are ordinary member
   vouchers in the rewards store, so there is no second ledger to reconcile. */
const PAPER = "dumplinglab-vouchers/v1/paper.json";

async function readPaper() {
  ensureStorage();
  const result = await get(PAPER, {
    access: "private",
    useCache: false,
    headers: { "accept-encoding": "identity" },
  });
  if (!result) return null;
  if (result.statusCode !== 200 || !result.stream) throw new Error("Voucher tally unavailable");
  return { value: await new Response(result.stream).json(), etag: result.blob.etag };
}

const tally = {
  async count() {
    return (await readPaper())?.value?.count || 0;
  },
  // Paper crosses a counter at human speed, so one shared document is safe.
  async bump(entry) {
    for (let attempt = 0; attempt < 12; attempt++) {
      const held = await readPaper();
      const next = held?.value || { count: 0, log: [] };
      next.count++;
      next.log.unshift(entry);
      next.log.length = Math.min(next.log.length, 500);
      try {
        ensureStorage();
        await put(PAPER, JSON.stringify(next), {
          access: "private",
          addRandomSuffix: false,
          contentType: "application/json",
          cacheControlMaxAge: 0,
          ...(held?.etag ? { allowOverwrite: true, ifMatch: held.etag } : { allowOverwrite: false }),
        });
        return next.count;
      } catch (error) {
        const busy = error instanceof BlobPreconditionFailedError || /already exists/i.test(error?.message || "");
        if (!busy) throw error;
      }
    }
    throw new Error("Paper tally busy");
  },
};

export const voucherService = createVoucherService(
  { rewards: rewardsService, catalog: catalogService, tally },
  {
    cap: Number(process.env.DL_VOUCHER_CAP) || 2000,
    opensAt: process.env.DL_VOUCHER_OPENS_AT || null,
    closesAt: process.env.DL_VOUCHER_CLOSES_AT || null,
    expiresAt: process.env.DL_VOUCHER_EXPIRES_AT || "2027-02-28",
    dishId: process.env.DL_VOUCHER_DISH || undefined,
  },
);
