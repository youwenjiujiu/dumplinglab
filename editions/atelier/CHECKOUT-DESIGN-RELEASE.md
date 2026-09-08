# Checkout journey redesign — 2026-09-08

Source: `0aa3cd4`. Production deployment: `dpl_F7BBSyA3PEGhY7KX79iMaMW5X6kr`.
Promoted to the existing https://dumplinglab-menu.vercel.app customer URL.

The merchant requested learning from the supplied CHAGEE flow and continuing
implementation. The menu layout, original dish images and approved four-stage
brand illustrations are preserved. Changes are scoped to checkout and paid
order details, with no payment-account or backend changes.

- Full-height mobile order surface; fixed title, independent content scroll,
  separate payment dock and safe-area/keyboard accommodation.
- Order type/location, item summary and edit action, optional horizontal
  add-ons, actual fee breakdown, Stripe form and email, one total/pay action.
- Add-on re-quoting retains email in memory only and review scroll position.
  Provider-owned card fields are not persisted or copied by the app.
- Paid pickup details prioritize number, server-driven progress and QR, then
  dishes, paid total and reference. Dine-in shows its table and paid confirmation,
  not a simulated kitchen timeline. Legacy unpaid receipts retain their renderer.
- Existing lock recovery, payment idempotency and original-payer ownership
  checks remain intact. No new ETA, discounts, vouchers or payment methods are
  invented. Apple Pay eligibility is unchanged by this visual release.

Validation: all 15 no-browser suites passed with unchanged source fingerprint.
Report: `test-output/qa-2026-09-08T09-50-41.456Z/report.json`.
Exact allowlisted release package passed catalogue/assets/syntax/version checks.
Protected staged frontend bytes matched the release; live payment configuration
and anonymous staff/webhook gates passed read-only checks before promotion.
After promotion, the public frontend bytes matched the same release and live
payment configuration was checked again without submitting any orders.
No browser visual testing, physical iPhone validation, real charge, session
creation/cancellation or kitchen order was performed during this work.

Sites building/hosting guidance informed the bounded implementation and exact
release checks while retaining the established Vercel architecture. No runtime
secrets were printed or written to source. Unrelated workspace edits are retained.
