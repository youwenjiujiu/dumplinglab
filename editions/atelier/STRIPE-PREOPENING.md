# Stripe pre-opening preparation — 2026-09-08

## Live activation follow-up — current work

The merchant subsequently explicitly requested the shared **live** Stripe
account, confirmed SOUTH STAR ENTERTAINMENT PTE. LTD. as the operating and
settlement entity, and confirmed the same company's previous restaurant
can-can.sg has GST registration. GST configuration is based on this merchant
confirmation, not an independently retrieved IRAS certificate.

Pickup location: Dumpling Lab, 49 Circular Rd, Singapore 049404 (`circular-road`).
Activation is being deployed to the existing Vercel project. Do not interpret
the historical preparation-only scope below as the latest authorization.

Review found that the legacy restaurant's Supabase webhook consumes
`metadata.order_id`; comedy consumes `metadata.orderId`. The new integration
therefore emits **only `metadata.dumpling_order_id` plus `metadata.app`**, on
both Checkout Session and PaymentIntent, and the restaurant service reads that
new key. Neither older project's code or endpoint is changed. The reviewed
legacy refund handler looks up an existing legacy order by Stripe Session ID.
This is source review, not an end-to-end verification of their deployed code.

Checkout now explicitly requests `card` and `paynow`, matching comedy's
integration. Apple Pay is an eligible card wallet; no shared account payment
method settings are altered. GrabPay, Alipay and ShopBack are not enabled by
this release. Delivery remains unavailable in both public configuration and
the quote/checkout API.

Passed 13 no-browser suites and exact release-package checks; no live order,
charge, refund or synthetic paid callback has been submitted. Local port 7898
remains a deliberately simulated environment; use the production URL for live
payment, never copy live keys into the preview server.

Live rollout status will be recorded after deployment verification.

## Scope and current state

User authorized preparing Dumpling Lab with comedy's existing Stripe account,
without changing comedy or opening real customer payments. No payment, refund,
test order, company/settlement change or production deployment was performed.

- Stripe account: `acct_1QT1RiDn9TOajD4l` (live, SG).
- Registered company returned by Stripe: SOUTH STAR ENTERTAINMENT PTE. LTD.
- Charges and payouts are enabled on the account; this does **not** mean the
  restaurant is approved to collect under that entity.
- Target Vercel project: `dumplinglab-menu` / `prj_WWtFOAiA1yDeItd0iyKSVQ2SBcw6`.
- Existing comedy environment and both existing Stripe webhook endpoints were
  compared before/after and were unchanged.

## Saved configuration (Production only)

Encrypted Vercel variables were created and read back for equality:

- `STRIPE_SECRET_KEY`: sourced directly from comedy's Production configuration.
- `STRIPE_WEBHOOK_SECRET`: new restaurant-specific signing secret; not comedy's.
- `STRIPE_PUBLISHABLE_KEY`: same account's public key, required for the new
  in-page Elements integration (added after the initial setup).
- `DL_ORDER_ORIGIN`: `https://dumplinglab-menu.vercel.app`.
- `DL_PAYMENTS_ENABLED`: `false`.

No secret values were printed or stored in local files. The in-page Checkout
Elements integration exposes only the publishable key and an authorized,
order-specific client secret to its payer.
No test key was available from the inspected Production configuration. Do not
mistake this setup for a sandbox or attempt a live payment as a test.

Restaurant webhook: `we_1UDJzqDn9TOajD4ln9NsvK0T`

- URL: `https://dumplinglab-menu.vercel.app/api/payment-webhook`
- API version: `2024-11-20.acacia`
- Events: `checkout.session.completed`,
  `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`,
  `checkout.session.expired`.
- Status verified **disabled**. Leave it disabled until the new handler has
  been deployed and verified. The create operation was immediately followed by
  disabling the endpoint; existing endpoints were never edited.

## Local safety changes — not deployed

- Checkout requires explicit `DL_PAYMENTS_ENABLED=true` in addition to the
  existing origin, Stripe and GST requirements.
- Checkout Session and PaymentIntent carry `metadata.app=dumplinglab` and
  `metadata.order_id`; comedy's `metadata.orderId` is not used.
- The restaurant verifies signatures before acknowledging foreign events
  without accessing order storage. Own events must match the key's live/test mode.
- Closing new payments does not drop verified callbacks for previously paid orders.
- No menu visuals or pricing rules were changed by this payment preparation.

## Follow-up: in-page checkout and add-ons

Implemented locally after the user requested the CHAGEE-style payment flow:

- Both dine-in and pickup use `checkout-ui.js`: order review, small drink/side
  add-on cards, inclusive GST breakdown, Stripe Payment Element and one Pay button.
- Sessions use `ui_mode=elements`; the frontend uses Stripe.js Dahlia,
  `initCheckoutElementsSdk`, `loadActions`, and `actions.confirm({redirect:'if_required'})`.
  Return/authorization redirects needed by individual wallets remain supported.
- Requests pin `2026-08-26.dahlia` without changing the shared account's default
  API version. The existing webhook object fields used remain compatible with
  the restaurant's explicitly pinned endpoint version.
- A valid email is collected for Checkout Session confirmation. No marketing
  consent is inferred, and the form does not persist email in browser storage.
- Dine-in reserves the selected shared-group cart atomically before creating a
  payment Session. Competing checkouts and edits in that group are blocked until
  payment is confirmed or the Session is conclusively expired. Later positive
  additions already present outside the selected snapshot are preserved.
- A verified paid callback creates exactly one table receipt/staff event, then
  confirms fulfillment in the online record. Retried callbacks recover partial
  writes. Neither client secrets nor access-token hashes enter shared receipts.
- The old `/api/order` endpoint now rejects unpaid direct submissions with 402.
  Do not deploy until the merchant accepts the prepayment-only behavior.
- Editing or adding an item after Session creation first expires that Session;
  uncertain/paid responses retain the original pending transaction. New amounts
  are server-priced under a fresh order ID. Closing a page alone doesn't cancel.
- Preview uses the same table/online services with local storage and a clearly
  labelled fake payment action. It does not call Stripe or send real orders.

Domain `dumplinglab-menu.vercel.app` was registered for wallet payments as
`pmd_1UDKBpDn9TOajD4lfHP6h1Mo`; Stripe returned Apple Pay status `active`.
The restaurant checkout gate remains false and its webhook remains disabled.

Payment-method readiness was inspected read-only: the account's configurations
include card and Apple Pay enabled, and one default configuration has PayNow
enabled. GrabPay and Alipay were unavailable/off in the inspected configurations.
The restaurant requests only dynamically eligible card, PayNow, GrabPay and
Alipay methods; Apple Pay is offered by Elements on eligible devices. This does
not automatically enable unavailable methods or alter comedy's settings.

ShopBack Pay is **not implemented or connected**: it requires separate merchant
onboarding/credentials and an approved integration path. The user was asked
whether a ShopBack merchant account/contact exists; no answer was received yet.
No fake ShopBack payment button is displayed. All six methods are the requested
target, not a claim that all six are ready for live collection.

Additional passing local tests: `paid-checkout-test.mjs` (in-memory concurrency
and fulfillment), `checkout-http-test.mjs` (isolated preview server), and
`checkout-ui-test.mjs` (DOM/Stripe doubles, including declined-payment retry).
No browser/visual QA or genuine Stripe test-mode end-to-end payment was performed.

References used:
- https://docs.stripe.com/payments/accept-a-payment?payment-ui=elements&api-integration=checkout
- https://docs.stripe.com/js/custom_checkout/confirm
- https://docs.stripe.com/api/checkout/sessions/create
- https://docs.stripe.com/payments/grabpay
- https://docs.stripe.com/payments/alipay
- https://docs.shopback.com/reference/in-store-getting-started

Tests passed: `stripe-setup-test.mjs`, `online-service-test.mjs`,
`pickup-progress-test.mjs`, and the production release/package checks.
These used local fixtures/in-memory storage, not Stripe charges or cloud orders.
Public `/api/online` was checked read-only and still reports both takeaway and
delivery disabled. No end-to-end Stripe checkout/payment was performed.

## Before enabling real collection

1. Obtain explicit deployment authorization per DEPLOYMENT.md; deploy and
   verify the new payment gate/metadata/webhook handler first. Vercel variable
   changes alone do not update an existing deployment.
2. Confirm restaurant legal entity, merchant information, settlement ownership
   and account separation plan. Do not edit comedy's shared account branding
   while it is still in use. Independently operated businesses should have
   separate Stripe accounts per Stripe's multiple-accounts documentation.
3. Review every existing account endpoint before the first restaurant payment.
   Besides comedy, this account has a Supabase webhook whose fulfillment behavior
   was not audited here. A separate endpoint URL does not filter by metadata at
   Stripe; all subscribers to the event may receive it.
4. Confirm actual pickup location/address and GST registration. Neither
   `DL_PICKUP_LOCATIONS` nor `DL_GST_REGISTERED` was invented or configured.
5. Arrange isolated test credentials/storage and test the complete redirect,
   signed callback, duplicate/delayed notification and pickup flow. Do not send
   synthetic paid callbacks into Production storage.
6. After approval, enable and verify the restaurant webhook, then explicitly
   enable payments and redeploy. Keep delivery unavailable per product scope.

Pausing checkout should set `DL_PAYMENTS_ENABLED=false` and redeploy. After real
orders exist, keep the webhook running to reconcile in-flight payments. Never
revoke the shared key as a restaurant-only rollback: comedy still depends on it.
