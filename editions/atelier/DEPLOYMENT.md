# Atelier production release

The restaurant's existing project is `dumplinglab-menu` on Vercel. Keep local port 7898 as a separate preview; its `.local/atelier/` data is never uploaded or migrated.

## Simplified empty cart — 2026-09-09

- Explicit user deployment approval; runtime commit `f06f068`, deployment `dpl_5Setbq2Fiw7iMRSAycgzE5UNbifU` (`https://dumplinglab-menu-rdvs70ruf-youwenjiujius-projects.vercel.app`) promoted to the existing public URL.
- Removed decorative empty receipt/00 and redundant zero-count tabs; empty takeaway hides saved-selection/name controls and offers one primary browse action. Existing selections, history, shared-table identity and unresolved payment controls remain accessible.
- Prior Chrome/WebKit testing passed 24 bilingual/responsive dine-in/takeaway cases. Release-time 17 non-browser suites passed with `sourceUnchanged:true` in `test-output/qa-2026-09-09T13-57-36.551Z/report.json`; exact release package passed `lunch-build-test.mjs`.
- Protected deployment and public URL both matched exact HTML plus 39 runtime/assets and staff/config gates. Package: `/var/folders/9g/vrhfqq3x41ndv5_1b4x2_14c0000gp/T/dumplinglab-release-RRKR5F`.
- No production cart, order or payment writes. Broader visual redesign is discussion only, not included in this release; D30 preselected serving remains unresolved.

## Initial order-mode entry positioning — 2026-09-09

- Runtime commit `67c6a20`, deployment `dpl_W5U1fAKEhVbu3hVpfaHK6Xmngp7Q` (`https://dumplinglab-menu-9efxv030b-youwenjiujius-projects.vercel.app`) promoted to the existing public URL after explicit deployment approval.
- The automatic entry chooser does not push/consume browser history. Selecting a mode resets both page and category rail immediately and at the next frame; manually opened sheets retain Back/Forward behavior and cancellation preserves reading position. No cart/payment behavior changes.
- Chrome/WebKit at 390/430px passed first/reloaded entry, mode changes from Sides, cancel, Back/Forward and saved-draft preservation. 17 non-browser suites passed with unchanged source in `test-output/qa-2026-09-09T13-04-38.550Z/report.json`; exact package passed `lunch-build-test.mjs`.
- Protected and public read-only checks matched HTML plus 39 runtime/assets, staff auth and production config. Package: `/var/folders/9g/vrhfqq3x41ndv5_1b4x2_14c0000gp/T/dumplinglab-release-cJOMKA`.
- Fresh production mobile-context checks in Chrome/WebKit also passed with zero API writes. These are not actual WeChat-device verification; the reported preselected single serving remains unproven/unresolved.

## Title and iOS pavement hotfix — 2026-09-09

- Runtime commit `3c0530b`, deployment `dpl_BRyTzuLL6DvfyS15VGECaG7q8dSm` (`https://dumplinglab-menu-i5j4ta3yb-youwenjiujius-projects.vercel.app`), promoted to `https://dumplinglab-menu.vercel.app` after explicit user approval.
- Title is now exactly `Dumpling Lab`. The storefront floor uses direct alpha extraction instead of a CSS-filtered luminance mask; original building artwork, color and motion are unchanged.
- Chrome/WebKit pavement regression at 390/724px and existing storefront animation tests passed. The release package passed `lunch-build-test.mjs`; 17 service/VM suites passed with `sourceUnchanged:true` in `test-output/qa-2026-09-09T12-55-38.931Z/report.json`.
- Protected deployment and public URL both matched the exact built HTML plus 39 runtime/assets, with staff auth/config checks. Release directory: `/var/folders/9g/vrhfqq3x41ndv5_1b4x2_14c0000gp/T/dumplinglab-release-LwKI68`.
- No production cart, order, payment or staff event writes. The reported WeChat one-item entry issue remains unresolved and was not included as a fix. Physical iPhone verification of the newly published floor remains pending.

## Previous tray refinement — 2026-09-09

- Runtime commit `771284b`, deployment `dpl_uVZXhdkquqZiyEKVWPhFaPK94Ku8` (`https://dumplinglab-menu-cja2qx6ho-youwenjiujius-projects.vercel.app`), promoted to the existing public URL.
- Removed dish-removal Undo toast and visible view-order label. Count now sits beside content-width thumbnails; empty state has no image spacer.
- 17 service/VM suites, six bilingual responsive removal/spacing cases, four mode-switch cases and exact release package checks passed. Protected and public read-only verification both matched HTML + 39 runtime/assets and auth/config gates. No production cart/order/payment writes.

## Previous UI hotfix — 2026-09-09

- Runtime commit: `b22738c` (compact header/tray, transparent thumbnails, optional early add-ons, safe cancel-and-continue, category spacing and success copy).
- Deployment: `dpl_9Cqgs4xCXHPqaUpfy8Ch7WHXS973`, `https://dumplinglab-menu-q1w6j40j8-youwenjiujius-projects.vercel.app`.
- Promoted to `https://dumplinglab-menu.vercel.app` after protected read-only verification. Public verification passed again: exact HTML + 39 runtime/assets, staff auth and production configuration.
- Exact package: `/var/folders/9g/vrhfqq3x41ndv5_1b4x2_14c0000gp/T/dumplinglab-release-1Q2q0N`; package test passed. Local 320/390/768px browser tests use mocked payment endpoints; 17 VM/service suites and 50-thumbnail audit passed.
- No live orders, payments, cancellations or staff events were created by deployment acceptance. Actual wallet/payment-provider rendering is not end-to-end merchant-payment verification. The current Checkout Sessions email requirement and paid-order refund workflow were not changed.

## Build and publish

Deployment requires an explicit publishing request. Local polishing or QA alone does not authorize publishing or cloud test orders.

1. With the loopback preview running, run `node editions/atelier/qa-current.mjs --no-browser` for service, isolated HTTP, and VM checks. Run browser suites only when browser testing is authorized. Read the report and logs, not just the exit code; the source fingerprint must remain unchanged. The runner includes production-state tests against in-memory storage, not the live restaurant. See [README.md](README.md#verify) for coverage and limitations.
2. Run `node editions/atelier/build-production.mjs`. It prints a fresh release directory. Run `node editions/atelier/lunch-build-test.mjs <release-dir>` against that exact directory. The allowlist includes the Atelier frontend, optimized food images, two fonts, logo and mode illustrations, current catalogue, production APIs and staff page. No local orders, uploads, credentials, admin/generation tools or legacy 3D prototypes are copied.
3. From that directory run `vercel deploy --prod --skip-domain --yes`. This uses the existing Production storage and password but does **not** change the restaurant's public URL.
4. Inspect the protected deployment using authorized access; do not disable protection. Compare served frontend bytes/cache versions against the exact release, check the preview banner is absent, and inspect read-only API configuration and anonymous staff-auth gates. Do not export or print secret values.
5. Do not run mutating release acceptance against shared Production storage by default. `release-check.mjs` writes cloud state (even `--cart-only` mutates carts); its full mode submits and resolves staff events. The live frontend/backend now reads v2 events, so a QA table name is not isolation from the staff queue. Such checks require an explicitly authorized test environment with separate storage. A staged frontend URL or a temporary password alone does not provide data isolation. Live payment/webhook checks additionally require the merchant's own test configuration and approval.
6. Commit the exact source used to build. Then `vercel promote <validated-deployment-url> --yes`; check the public customer URL and `/staff` again. Remove temporary env files containing credentials after verification.

Do not use the old admin page's `cd web && vercel --prod` shortcut: it publishes the legacy frontend. The reproducible release builder is the production entry point for this edition.

`stage-acceptance.mjs` is a historical helper that creates an acceptance deployment with a temporary password. Do not use it as a workaround for missing staff access: deployment-scoped authentication is not proof of separate storage. Never promote a temporary-password acceptance deployment. Review its storage binding and obtain explicit authorization before any cloud mutation.

## Data and operations

- Production uses Private Vercel Blob, not a local file or process memory. `BLOB_STORE_ID`/OIDC and `DL_STAFF_PASSWORD` remain in the existing project's Production environment.
- A `dumplinglab-tables/v2/<table>/<group>.json` document commits cart changes, receipts and staff pending events atomically using conditional ETag writes. Independent concurrent operations retry from the latest state; duplicate requests do not recreate servings or orders.
- First access imports the existing v1 cart and order history read-only. Existing pending v1 orders/calls remain in the staff queue. No legacy data is deleted.
- Processing a table order sets `resolvedAt`; it does not delete the receipt. Orders are priced from the server catalogue. Online checkout, verified-payment pickup credentials and staff collection exist behind merchant-configuration gates. Kitchen hardware, automatic table turnover and courier dispatch are not integrated; see [FULFILMENT-NEXT.md](FULFILMENT-NEXT.md).
- The current catalogue contains 35 products. Menu food prices are GST-inclusive; checkout extracts the tax. Historic order snapshots retain their original amounts and pricing version.
- Keep the staff page open and enable its sound. Submitting an order means it has been stored in the staff queue, not that someone has already read or prepared it.

## Rollback caution

After v2 has accepted real orders, do **not** instantly roll the entire project back to a pre-v2 API: that API cannot display the new queue. Roll back only frontend assets while retaining this backend, or first reconcile the v2 queue under staff supervision. Both legacy and v2 records are retained for recovery.
