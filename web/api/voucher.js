import { voucherService } from "../server/voucher-production.js";
import { memberService } from "../server/member-production.js";
import { requireStaff } from "../server/staff-auth.js";
import { bodyOf, fail, json, method } from "../server/http.js";

// Signing in is the gate: one voucher per account, and the account is also
// where the guest will find it again months later when the shop opens.
const identity = (req) => memberService().identity(req.headers);

export default async function handler(req, res) {
  try {
    const query = req.query || {};
    if (req.method === "GET") {
      if (query.admin === "1") {
        requireStaff(req);
        return json(res, 200, { ok: true, ...(await voucherService.admin()) });
      }
      const member = await identity(req).catch(() => null);
      return json(res, 200, {
        ok: true,
        member: member ? { id: member.id } : null,
        ...(await voucherService.status(member?.id || null)),
      });
    }
    if (req.method !== "POST") return method(res, "GET, POST");

    const body = bodyOf(req);
    if (body.action === "claim") {
      const member = await identity(req).catch(() => null);
      return json(res, 200, { ok: true, ...(await voucherService.claim(member?.id || null)) });
    }

    // The paper tally is the shop's own bookkeeping.
    requireStaff(req);
    if (body.action === "redeem-paper")
      return json(res, 200, { ok: true, ...(await voucherService.redeemPaper(body)) });
    return json(res, 400, { error: "操作无效" });
  } catch (error) {
    return fail(res, error);
  }
}
