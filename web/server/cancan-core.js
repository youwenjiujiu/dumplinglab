import { RequestError } from "./order-core.js";
import { verifyRewardGrant } from "./rewards-bridge.js";
export function createCanCanService({
  origin,
  secret,
  fetcher = fetch,
  rewards,
  catalog,
  allowLoopback = false,
}) {
  const enabled = Boolean(
    secret?.length >= 32 &&
      (/^https:\/\//.test(origin || "") ||
        (allowLoopback && /^http:\/\/127\.0\.0\.1:\d+$/.test(origin || ""))),
  );
  async function call(token, cursor) {
    if (!enabled) throw new RequestError("CanCan 兑换服务暂不可用", 503);
    let r;
    try {
      r = await fetcher(
        new URL(
          "/api/app-bridge/dumplinglab-rewards" +
            (cursor ? "?cursor=" + encodeURIComponent(cursor) : ""),
          origin,
        ),
        {
          method: "GET",
          headers: {
            authorization: `Bearer ${token}`,
            "content-type": "application/json",
          },
          cache: "no-store",
          signal: AbortSignal.timeout(12000),
        },
      );
    } catch {
      throw new RequestError("CanCan 暂时无法连接，请稍后重试", 503);
    }
    const out = await r.json();
    if (!r.ok || !out.ok)
      throw new RequestError(
        out.error || "CanCan 兑换未完成，请重试",
        r.status >= 400 && r.status < 500 ? r.status : 503,
      );
    return out;
  }
  return {
    enabled,
    async sync(session) {
      let out = await call(session.accessToken);
      if (!out.enabled) return { enabled: false };
      const seen = new Set();
      const menu = await catalog.menu();
      for (;;) {
        if (
          !Number.isInteger(out.points) ||
          out.points < 0 ||
          !Array.isArray(out.offers) ||
          !Array.isArray(out.grants) ||
          out.grants.length > 100
        )
          throw new RequestError("CanCan 返回资料异常", 503);
        const grants = out.grants.map((g) =>
          verifyRewardGrant(
            Buffer.from(g.payload),
            g.timestamp,
            g.signature,
            secret,
          ),
        );
        for (const g of grants)
          if (g.memberId !== session.member.id)
            throw new RequestError("兑换券账号不匹配", 403);
        for (const grant of grants)
          if (Date.parse(grant.expiresAt) > Date.now())
            await rewards.importVoucher(grant, menu);
        if (!out.nextCursor) break;
        if (
          typeof out.nextCursor !== "string" ||
          !/^[-a-zA-Z0-9_]{1,160}$/.test(out.nextCursor) ||
          seen.has(out.nextCursor) ||
          seen.size >= 100
        )
          throw new RequestError("兑换券同步未完成，请重试", 503);
        seen.add(out.nextCursor);
        out = await call(session.accessToken, out.nextCursor);
      }
      return { enabled: true };
    },
  };
}
