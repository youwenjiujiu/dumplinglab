import { createMemberService } from "./member-core.js";
export const memberService = () =>
  createMemberService({
    origin: process.env.DL_MEMBER_ORIGIN || process.env.DL_ORDER_ORIGIN,
    authUrl: process.env.CANCAN_APP_SUPABASE_URL,
    anonKey: process.env.CANCAN_APP_SUPABASE_ANON,
    googleEnabled: process.env.DL_AUTH_GOOGLE_ENABLED === "true",
    appleEnabled: process.env.DL_AUTH_APPLE_ENABLED === "true",
    phoneEnabled: process.env.DL_AUTH_PHONE_ENABLED === "true",
  });
