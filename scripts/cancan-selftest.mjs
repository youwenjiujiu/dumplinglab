import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { createCanCanService } from "../web/server/cancan-core.js";
const secret = "local-only-bridge-secret-at-least-32-characters",
  session = {
    accessToken: "server-only-token",
    member: { id: "verified-subject" },
  },
  imported = new Map();
function grant(id, memberId = session.member.id) {
  const payload = JSON.stringify({
      version: 1,
      issuer: "cancan",
      audience: "dumplinglab",
      id,
      memberId,
      dishId: "lunch-v2-barley",
      title: "Barley",
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    }),
    timestamp = String(Math.floor(Date.now() / 1000));
  return {
    payload,
    timestamp,
    signature: createHmac("sha256", secret)
      .update(timestamp + "." + payload)
      .digest("hex"),
  };
}
let mode = "normal",
  debits = 0,
  failRead = false;
const claims = new Set();
const service = createCanCanService({
  origin: "https://cancan.example.test",
  secret,
  catalog: { menu: async () => ({}) },
  rewards: {
    importVoucher: async (g) => {
      imported.set(g.id, g);
    },
  },
  fetcher: async (url, options) => {
    assert.equal(
      options.headers.authorization,
      "Bearer " + session.accessToken,
    );
    if (options.method === "POST") {
      const input = JSON.parse(options.body);
      if (!claims.has(input.requestId)) {
        claims.add(input.requestId);
        debits++;
      }
      return { ok: true, json: async () => ({ ok: true }) };
    }
    if (failRead) {
      failRead = false;
      throw Error("Network interrupted after debit");
    }
    let grants = [grant("one")],
      nextCursor = null;
    if (mode === "pages") {
      const second = url.searchParams.get("cursor");
      grants = Array.from({ length: second ? 5 : 100 }, (_, i) =>
        grant(String(i + (second ? 100 : 0))),
      );
      nextCursor = second ? null : "cursor100";
    }
    if (mode === "wrong-owner") grants = [grant("wrong", "someone-else")];
    if (mode === "tampered")
      grants = [{ ...grant("bad"), signature: "0".repeat(64) }];
    return {
      ok: true,
      json: async () => ({
        ok: true,
        enabled: true,
        points: 150,
        offers: [],
        grants,
        nextCursor,
      }),
    };
  },
});
mode = "pages";
await service.sync(session);
assert.equal(imported.size, 105);
await service.sync(session);
assert.equal(imported.size, 105);
mode = "wrong-owner";
await assert.rejects(service.sync(session), (e) => e.status === 403);
assert.equal(imported.has("wrong"), false);
mode = "tampered";
await assert.rejects(service.sync(session), (e) => e.status === 401);
mode = "normal";
const input = { offerId: "barley", requestId: randomUUID() };
failRead = true;
await assert.rejects(service.sync(session), (e) => e.status === 503);
await service.sync(session);
assert.equal(debits, 0);
assert.equal(service.claim, undefined);
assert(imported.has("one"));
console.log(
  "PASS CanCan recipient: complete paginated sync, repeated grants, ownership and HMAC rejection, sync retry makes no source debit.",
);
