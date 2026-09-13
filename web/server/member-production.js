import { createMemberService } from "./member-core.js";
export const memberService = () =>
  createMemberService({
    origin: process.env.DL_MEMBER_ORIGIN || process.env.DL_ORDER_ORIGIN,
    // Dumpling Lab has its own identity project so verification messages carry
    // its own brand. The CanCan fallback stays only so a preview without the
    // DL_SUPABASE_* pair still has somewhere to authenticate against.
    authUrl: process.env.DL_SUPABASE_URL || process.env.CANCAN_APP_SUPABASE_URL,
    anonKey: process.env.DL_SUPABASE_ANON || process.env.CANCAN_APP_SUPABASE_ANON,
    // Public by design: it identifies the site to Google, it does not authorise.
    googleClientId: process.env.DL_GOOGLE_CLIENT_ID,
    googleEnabled: process.env.DL_AUTH_GOOGLE_ENABLED === "true",
    appleEnabled: process.env.DL_AUTH_APPLE_ENABLED === "true",
    phoneEnabled: process.env.DL_AUTH_PHONE_ENABLED === "true",
  });
