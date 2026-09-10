# Dumpling Lab membership integration

Status: WITHDRAWN from production at user request. Member page, menu entry, static assets and API are excluded from the release. Source is retained only as unfinished work; do not republish without a new request. Production identity and money/points/voucher operations were never enabled.

## Identity decision

Use CanCan App Supabase identity with an independent Dumpling Lab session and accounts. Existing comedy website uses NextAuth/Prisma, not the same password database. Its `src/lib/app-ticket-auth.ts` verifies the App token before associating the confirmed email with a comedy user. Do not accept a browser-supplied email/user ID to access balances or vouchers. Store stable provider+subject for restaurant accounts; email is display/contact, not the restaurant ledger primary key.

Customer entry: `/member.html`; guest ordering remains available. Email OTP combines login and registration with explicit acknowledgement. No marketing opt-in is inferred. Customer authentication is separate from the staff password.

## Implemented

- `GET /api/member`: server-verified current identity and capability state. Unconnected services return null balances, not invented zero balances.
- `POST /api/member`: `send-code`, `verify`, `logout`. Provider-backed OTP (same shape as the installed CanCan Auth SDK); exact Origin and JSON checks on mutations; verified email is required; tokens are returned only as HttpOnly, SameSite cookies (Secure with HTTPS).
- Sessions expire within an hour; re-verification is required. No refresh token is retained. Logout clears only the Dumpling Lab browser session, preserving other CanCan sessions.
- No provider credentials, tokens, user input, or balances logged by the adapter.
- Normal local preview intentionally refuses all member writes. Browser tests intercept requests with explicit synthetic fixtures; no emails or real registrations.

## Production connection still needed

Configure `DL_MEMBER_ORIGIN` to the exact HTTPS storefront origin, and `CANCAN_APP_SUPABASE_URL` / `CANCAN_APP_SUPABASE_ANON` to the existing CanCan App provider and public key. Do not use service-role credentials. Confirm provider email template supplies a numeric OTP, registration policy, abuse protection and rate limits, and customer privacy/terms disclosures before enabling real registration. Do not change existing CanCan provider policies for this page implicitly. No live verification has been performed.

## Three separate domains

1. Restaurant money ledger: integer SGD cents, distinct paid principal and any promotional credit; append-only entries with payment/order/refund references and unique idempotency keys. Payment processor-confirmed topups only. Order payment, cancellations and refunds must atomically reserve/settle/release balances without double spending. Staff adjustments require reason and audit actor. UI must not activate until this ledger and reconciliations exist.
2. Restaurant points ledger: earn/redemption/reversal/expiry entries. Rules versioned and configurable; rates and expiry not assumed from comedy. Avoid earning both on topup and on subsequent spending. Refund reversal and concurrent redemption must be tested before launch.
3. CanCan restaurant vouchers: issuer, reward SKU/variant/quantity, owner, expiry, eligible locations/channels, source redemption ID, state and redemption order. CanCan deducts CanCan points once; DL verifies issuer entitlement server-to-server. Reserve voucher and food inventory during checkout, consume once on completion, release on eligible cancellation. Imported redemption IDs are unique; no automatic conversion into DL cash or points.

## Pending product decisions

- Earn rates, qualifying spend, expiry, refund reversal, reward catalogue and limits.
- Topup amounts, any bonus-credit rules, partial wallet payments and refunds.
- CanCan food/drink reward mapping and issuer API contract, cross-product account linking and reconciliation.
- Customer disclosures for shared identity; email-change and account deletion handling.

## Next delivery

Add durable restaurant membership/ledger storage and staff member management, then payment/webhook integration, then CanCan voucher issuance/redemption. Keep capability flags false until each full lifecycle passes isolated concurrency/replay/refund tests and the required integrations are configured. Do not present the identity foundation as a live stored-value or loyalty system.
