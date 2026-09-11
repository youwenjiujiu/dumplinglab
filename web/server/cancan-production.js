import { createCanCanService } from "./cancan-core.js";
import { rewardsService } from "./rewards-production.js";
import { catalogService } from "./catalog-production.js";
export const cancanService = createCanCanService({
  origin: process.env.CANCAN_REWARDS_ORIGIN,
  secret: process.env.CANCAN_REWARDS_BRIDGE_SECRET,
  rewards: rewardsService,
  catalog: catalogService,
});
