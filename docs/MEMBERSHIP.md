# Dumpling Lab loyalty inside ordering

Implementation status (2026-09-11): implemented and tested locally on `codex/admin-pages`; not deployed. Production remains the release with the standalone member page removed. `/member`, `/member.js`, `/member.css` stay excluded from release packaging. The login API is now used by an inline menu dialog.

## Customer and staff behavior

- Menu: compact available-points / My rewards entry. Guest ordering continues. Registered users see real account balances; no fixture balances are shipped.
- Login/register: the compact account entry opens one white authentication dialog with Google, Apple, mobile OTP and email OTP through the CanCan App Supabase identity provider. First-time verification creates the account, so there is no promotional landing screen or duplicate sign-in/join step. Each provider button appears only when its production flag is enabled. No marketing subscription. OAuth uses PKCE; tokens stay in an HttpOnly, SameSite=Lax cookie (Secure over HTTPS), expire within one hour, and never appear in API JSON or browser storage. No refresh token is retained.
- Eligible drink/side cards show a points-redemption button. Choosing a reward adds one matching item to the actual cart if absent.
- Checkout: one points reward OR one owned CanCan voucher per order. Changing rewards cancels the existing payment session before recalculating the basket. Signed-in orders earn points on actual net food spend; default S$1 = 1 point, rounded down per order. No points on the redeemed portion.
- Fully covered orders still require an explicit Confirm reward & order click. Opening checkout only reserves stock and points. No Stripe session or artificial charge is created. Abandoned free-redemption holds expire after 30 minutes; subsequent rewards/online requests reconcile and release them.
- Paid receipt shows earned/spent points. Account dialog shows the balance and transaction history. There is no separate membership landing page.
- Staff sidebar: 积分与兑换. Configure earn rate and each menu item with its points cost; variant dishes select one exact preparation/portion per dish; no arbitrary balance editing. No live reward costs have been selected or published. Configuration version is independent of ordinary account activity so a customer purchase does not invalidate a staff settings edit.

## Data and order integrity

`web/server/rewards-core.js` owns restaurant-only accounts, append-only transaction entries, voucher ownership, reservation snapshots, configuration and audit history. The production adapter stores one private CAS document at `dumplinglab-rewards/v1/state.json`, separate from CanCan balances, inventory and orders. CAS detects conflicting updates, including concurrent claims on the last points or same voucher.

All prices/stock come from the server catalogue. Browser member IDs, prices, points balances and claimed earnings are ignored. Online endpoints use the provider-verified identity, not a JSON memberId. Rewards preserve canonical line prices; a separate one-unit discount snapshot determines net payment/GST and points. Authentication is checked again when creating or confirming a member order. Private receipt credentials can still recover/cancel the exact pending payment.

Stock and rewards settle through retryable order finalization. Paid/expired receipt reads repair interrupted side effects. Duplicate payment/refund notifications are idempotent. Stripe `charge.refunded` validates the original payment intent, amount and currency, then applies the cumulative refund monotonically. Partial refunds reverse the proportional earned points using the order's original rate. Full refunds additionally restore redeemed points/the original voucher once. Voucher expiry is not extended. If earned points were already spent, the account can become negative; future earnings offset that balance. Prepared food stock is not automatically restocked after a financial refund.

## Wallet / topups

The menu's existing My rewards dialog includes Dumpling Lab's own balance, topup, balance history, points and vouchers. Topups (S$1–S$1,000) can match one exact-amount campaign configured in the staff wallet panel. Each campaign independently sets bonus cash, bonus points and enabled status; the panel also controls whether bonus-funded spending earns points. New production stores have no campaign by default. Principal, bonus and bonus points are credited only after verified Stripe payment. The local review store uses S$200 principal + S$20 bonus and zero topup points, one point per dollar of principal food spend, egg 60 points and barley 100 points. These review settings have not been applied to production. Topup return URLs never prove payment.

`wallet-core.js` stores a separate CAS ledger at `dumplinglab-wallet/v1/state.json`. All cash is integer SGD cents. Full wallet payment reserves funds with stock/rewards, then deducts only after an explicit confirmation. There is no split wallet/Stripe payment; insufficient balance offers recharge or Stripe. Pending wallet orders release reservations after 30 minutes. Duplicate requests and callbacks settle once.

The staff sidebar has 充值与余额: topups, wallet/fully redeemed orders, partial/full order refunds and original-channel topup refunds with a required reason. Cash topup refunds cannot exceed the original unrefunded charge or available principal; enough unreserved bonus must also remain to reclaim the proportional promotional amount. Funds remain reserved while Stripe's refund is pending and are released if it fails. Each successful Stripe refund ID is processed once, including refunds initiated in Stripe. A direct processor refund after funds were spent can make the balance negative and freezes further wallet spending. Order refunds return wallet funds; full refunds also return the original points reward/voucher. Refunds do not automatically restock prepared food. Shared table receipts and kitchen queues reconcile full refunds.


## CanCan vouchers: issuer and recipient implemented

CanCan implementation is in `/Users/youwen/comedy-dumpling-rewards`, branch `codex/dumpling-rewards`. Its existing loyalty account owns the CanCan points debit and an EXTERNAL AppVoucher in one Prisma transaction. A unique source claim code protects retry/concurrent claims. Free claims must be limited to one per user. Admins configure campaigns at `/admin/dumplinglab-rewards`; the existing mobile account loyalty section includes claim/redeem and a link back to DL. No production campaigns or data have been created.

DL `/api/cancan` forwards only the verified provider access token server-to-server. The source verifies it, maps its verified email to the existing CanCan user, and signs vouchers for the provider subject. Missing CanCan accounts hide the optional cross-site section; ordinary DL membership still works. The recipient verifies signatures and ownership and imports all active vouchers with cursor pagination; repeated import preserves their actual redemption state. The older signed push endpoint `/api/rewards-bridge` remains supported. Source issuance is not DL redemption, and source UI directs customers to DL for current redemption status. Code and local tests are complete; a deployed cross-site connection has not been verified.

The source persists the entitlement/points debit before signing:

```json
{
  "version": 1,
  "issuer": "cancan",
  "audience": "dumplinglab",
  "id": "persistent_source_voucher_id",
  "memberId": "verified_supabase_user_id",
  "dishId": "lunch-v2-barley",
  "title": "CanCan 薏米水兑换券",
  "expiresAt": "ISO timestamp from the source entitlement"
}
```

- Source `id` must be durable and unique. Retries with identical fields are idempotent even after redemption; an ID with changed owner/SKU/title/expiry is rejected. Retries must not deduct CanCan points again.
- `memberId` must come from provider-verified identity. The comedy website's Prisma/NextAuth user ID is a different identifier; do not copy it or accept an unverified email as the restaurant identity.
- Only existing non-variant sides/drinks are accepted. Receipt of a voucher does not reserve stock; ordinary catalogue availability applies when the customer orders.
- Header `x-cancan-timestamp`: Unix seconds. `x-cancan-signature`: lowercase hex HMAC-SHA256 of `timestamp + '.' + exact UTF-8 request body`. Secret `CANCAN_REWARDS_BRIDGE_SECRET` must be at least 32 characters. Tolerance is 300 seconds. Unsigned requests are rejected.
- CanCan owns grant eligibility and its points pricing. Restaurant redemption does not create DL cash or transfer CanCan points into DL points. Source claim retries and recipient synchronization do not repeat the debit.

## Production configuration and remaining live checks

Before a new deployment:

1. Set `DL_MEMBER_ORIGIN` to the exact HTTPS storefront origin (`DL_ORDER_ORIGIN` is its fallback), `CANCAN_APP_SUPABASE_URL`, and `CANCAN_APP_SUPABASE_ANON` to the existing CanCan App provider/public key. Do not use a service-role key. Enable only the methods that have been configured and tested in Supabase: `DL_AUTH_GOOGLE_ENABLED=true`, `DL_AUTH_APPLE_ENABLED=true`, and/or `DL_AUTH_PHONE_ENABLED=true`. Add `https://<storefront>/api/member?action=oauth-callback` to the allowed redirect URLs. Phone login also requires an SMS provider, rate limits and CAPTCHA in Supabase. Verify Google and Apple redirects plus real email/mobile OTP delivery before declaring them live. Apple provider secrets require periodic rotation. This test run made no live provider calls and did not change the shared auth project.
2. Use the existing private Vercel Blob store and Stripe settings, and set `DL_WALLET_ENABLED=true` only with the existing `DL_PAYMENTS_ENABLED` and payment readiness settings. Subscribe to `charge.refunded`, `refund.created`, `refund.updated`, and `refund.failed` in addition to the checkout completion/async success/async failure/expiry events. Verify payment and refund in the intended Stripe environment before declaring the live flow ready.
3. Choose actual earn/reward rules in the staff settings. Demo tests configure their own temporary local store only.
4. Deploy both implementations. Set `CANCAN_REWARDS_ORIGIN` on DL to the HTTPS CanCan source origin; set `DUMPLINGLAB_ORIGIN` on CanCan to the HTTPS DL origin. Set the same `CANCAN_REWARDS_BRIDGE_SECRET` (at least 32 characters) on both servers. The source validates campaign food SKUs against the live DL catalogue before publishing or deducting points. Configure actual campaigns only after the catalogue and connection are ready.

When auth configuration is absent, `/api/rewards` returns `enabled:false`; the customer loyalty entry stays hidden. It never opens an “unavailable membership” page. Auth config alone does not prove a real OTP email has been delivered.

## Local verification

```sh
node scripts/member-selftest.mjs
node scripts/rewards-selftest.mjs
node scripts/rewards-browser-test.mjs
node scripts/wallet-selftest.mjs
node scripts/cancan-selftest.mjs
node scripts/wallet-browser-test.mjs
ATELIER_TEST_URL=http://127.0.0.1:7918 node editions/atelier/qa-current.mjs --no-browser
node editions/atelier/build-production.mjs
```

The browser test starts its own loopback preview with a new temporary data directory and `DL_PREVIEW_TEST_MEMBER=1`, and takes screenshots under `.local/rewards-qa`. It earns fixture points through local simulated orders, exercises actual checkout/stock/ledger APIs, and stubs only the external identity transport. `member-selftest.mjs` covers email/mobile OTP normalization and verification, Google/Apple capability flags, OAuth PKCE generation/callback, secure cookies and token non-disclosure without making live provider calls. `preview-login` exists exclusively in the opt-in local preview, which is not packaged. It is not available on production `/api/member`. Wallet browser tests also exercise actual local wallet/order/refund APIs and a clearly marked local CanCan issuer fixture (not the real Prisma database). The source transaction logic has separate mocked-Prisma tests. Screenshots are in `.local/wallet-qa`. No real emails, notifications, orders, balances or vouchers are created by these tests. Actual Stripe, Supabase delivery and cross-deployment tests remain outstanding.

## Entry-point correction

CanCan free claims and CanCan-point redemptions take place only on the CanCan website. DL `/api/cancan` is GET-only and synchronizes previously issued vouchers; it exposes no source points, offers or claim endpoint. DL My rewards and checkout only show/use owned CanCan vouchers alongside independent DL rewards. Preview tests issue fixtures through a staff-authenticated, opt-in `/__preview/cancan-issuer` endpoint, which is never packaged for production.

DL admin rules now cover all catalogue dishes, with one configurable reward per dish and an exact style for variant dishes. Costs, style and active status are persisted via CAS; public rewards reflect the latest settings on refresh and new checkout. Reserved orders retain their snapshots. CanCan campaign pricing remains managed on CanCan.

## Configurable recharge promotions and split wallet ledger

Wallet accounts retain their existing total and add a bonus balance; historical accounts default to zero bonus, so prior balances remain principal. Staff settings have an independent CAS configuration revision. Input supports at most 20 unique exact-amount tiers, bonus amount between zero and the paid amount, bonus points 0–100,000 and per-tier activation. The admin estimate uses current active DL reward prices to show potential additional menu value (not actual cost), including topup bonuses and subsequent earning; no active rewards means point value is unknown.

Each topup snapshots its gift amounts and configuration revision before creating Stripe checkout. Browser-supplied bonuses are ignored; a stale displayed configuration returns 422 before creating a new payment. Retries retain the original offer. Hosted checkout descriptions and local confirmation show principal, bonus and bonus points. The UI has no hardcoded campaign amounts; ordinary amounts remain valid with no gift.

Wallet payments reserve principal and bonus in their current available proportion, rounding the principal share up to integer cents. The same immutable split is persisted on the order; later policy changes do not reprice that order. By default only principal-funded net food value earns points; bonus earning is configurable. No redeemed food or delivery charges earn additional points. A composition change before reservation rejects the old split and requires cancel/reconfirmation instead of silently changing the charge.

Meal refunds restore the original split proportionally, using cumulative bonus rounding so full refund exactly restores both buckets; earnings reverse proportionally from the captured eligible food value. Original-channel topup refunds reserve both principal and proportional bonus reclamation while Stripe processes. Successful individual refund IDs deduct principal and revoke proportional gift cash once; failed refunds release both reservations. Dashboard-originated Stripe refunds follow the same reversal and can leave a debt if funds were spent. Bonus funds cannot be refunded as cash.

`rewards.syncTopup` is an idempotent cross-ledger reconciliation keyed by the durable topup ID. It grants the original bonus points once and monotonically revokes the proportional award for topup refunds. Payment/refund callbacks and member topup reads retry interrupted synchronization; stale pre-refund callbacks never resurrect gifts. Spent promotional points can become a negative point balance after reversal and must be offset by subsequent earning. No CanCan ledger is touched.

Additional validation: `node scripts/wallet-promotions-selftest.mjs` and `node scripts/wallet-promotions-browser-test.mjs` exercise rule edits, snapshot recovery, principal/bonus math, bonus-point retry and reversal, pending/failed and dashboard refunds, staff authorization and end-to-end local simulated checkout. Production payments, processor callbacks and real email remain unverified and unmodified.

The storefront no longer renders the full-width balance/points strip. A compact account icon lives in the header; real balances and rewards are inside the existing My rewards dialog.

### Member account navigation

The menu avatar opens **我的 / My account**. The overview shows the verified email, wallet balance, points progress and latest active/recent order. Separate views provide points redemption, owned CanCan vouchers, wallet activity, order history/details and sign-in information. Profile currently displays the verified email and sign-in method; it does not invent a nickname or membership tier.

`GET /api/online?history=1` resolves the current member from the verified session cookie. The service filters by the stored `memberId`, returns an explicit customer-safe field list and paginates 20 orders using `before` from the previous response's `next`. Guest orders and other members' orders are excluded; order/payment secrets and customer contact fields are never returned. Details include purchased items, total, payment type, preparation status, pickup number and confirmed refund amount. Historical guest orders cannot be claimed by matching email.

The initial implementation reads the existing online-order store before filtering, matching the current storage architecture. A dedicated member order index will be needed as order volume grows. History covers online orders placed while signed in; it does not merge anonymous/shared-table orders into an account.

Validation: `node scripts/member-orders-selftest.mjs` covers identity checks, ownership, private fields and pagination. Browser suites exercise the new account navigation with existing payment/reward flows.
