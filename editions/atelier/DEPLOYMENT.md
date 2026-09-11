# Atelier production release

The restaurant's existing project is `dumplinglab-menu` on Vercel. Keep local port 7898 as a separate preview; its `.local/atelier/` data is never uploaded or migrated.

## Membership, rewards and wallet — 2026-09-11

- User requested merging to `main`, committing and deploying the completed membership experience. Runtime commit `29f8b35`; exact package `dumplinglab-release-WDD4JU`.
- Added email/password registration and sign-in, password reset, Google, Apple and phone OTP sign-in, member account/orders, five reward cards at every point balance, wallet history, coupons and rewards administration.
- Production uses the existing CanCan Supabase URL and public anonymous key; no service-role credential was copied. The public member endpoint reports email, password, Google and Apple as ready.
- All 20 non-browser suites passed in `test-output/qa-2026-09-11T10-49-12.675Z/report.json`; the exact production package passed `lunch-build-test.mjs` with the 35-item client/server catalogue agreement.
- Final deployment `dpl_DYCzLZQuWKH39PqUy7qiUKZEXV6H` (`https://dumplinglab-menu-dh7qb4ihz-youwenjiujius-projects.vercel.app`) was promoted to `https://dumplinglab-menu.vercel.app`. It reuses Comedy's Twilio account and sender through a dedicated `Dumpling Lab Auth` Messaging Service; the shared Supabase provider and public member endpoint report phone, email, password, Google and Apple as ready.
- Verification was read-only. No real account, OTP, SMS, order, wallet transaction, reward redemption, payment or staff event was created.

## Catalogue and inventory workspace — 2026-09-10

- Explicit user request to commit and deploy the redesigned admin and its catalogue/inventory capability. Runtime commit `921d0dc57e9bb425c66218cb43bd167d140b781c`.
- Production admin: `https://dumplinglab-menu.vercel.app/catalog-admin` (also linked from `/staff`). Existing Production staff password and storage bindings retained; no password read/reset, no initial stock values seeded.
- Exact package `dumplinglab-release-PovUiT`; 20 non-browser suites passed with unchanged source in `test-output/qa-2026-09-10T04-11-31.226Z/report.json`, isolated 7905 HTTP tests and complete package checks passed.
- Deployment `dpl_45BU5ViVeroq3z4oAFJvtvTDDvAr`, `https://dumplinglab-menu-oao4x1490-youwenjiujius-projects.vercel.app`, reached READY; promoted after protected checks. Public verification then passed: exact customer and admin HTML, 42 runtime/asset matches, public 35-item catalogue, private catalogue/feed auth 401, anonymous image upload rejected 401 before any write, production payment configuration.
- No real orders, stock edits, uploaded photos, staff events, or payment transactions were created during acceptance. Browser visual acceptance and real staff-password login were not performed.
- The separate website homepage, local data, photography/design experiments and legacy admin are excluded. The public homepage is still the current ordering menu.
- Once live catalogue edits or reservations exist, do not roll back to a backend that ignores the catalogue ledger. See `CATALOG-MANAGEMENT.md` for stock units, reservation semantics, and operational limitations.

## Production environment refresh — 2026-09-10

- User requested redeployment after saving a new staff password. Confirmed `DL_STAFF_PASSWORD` exists as a Production Secret; no secret was retrieved, displayed or written locally, and no successful-password login was attempted.
- Reused the exact currently deployed release package `dumplinglab-release-pC8S7d` and runtime commit `5a444046b4cbfd42a2d9350b4cfd808e142cb04a`; forced a fresh build using current Production configuration. No website edition or local source changes included.
- Deployment `dpl_899BSuF8KZzmGe9iMsMSEqbZiCsq`, `https://dumplinglab-menu-7dh58an7w-youwenjiujius-projects.vercel.app`, reached READY and was promoted to `https://dumplinglab-menu.vercel.app`.
- Protected and public read-only checks passed: exact HTML + 39 runtime/asset matches, staff sign-in page, anonymous feed 401, production online configuration. No production order/cart/payment writes. The user must verify their newly saved password by logging in.

## Selected B deep red palette — 2026-09-09

- User explicitly selected the B palette and requested committing/deploying the mobile ordering site only. Runtime commit `5a444046b4cbfd42a2d9350b4cfd808e142cb04a`.
- Background `#9c3d39`, interface accent `#952f2b`, pale border `#e8d1cf`, tint `#fcf7f6`. The two CSS files are identical to their previous versions after stripping hexadecimal color values; no geometry, behavior, logo or illustration edits.
- 17 non-browser suites passed with `sourceUnchanged:true`: `test-output/qa-2026-09-09T15-12-02.669Z/report.json`. Exact package passed `lunch-build-test.mjs`.
- Package `/var/folders/9g/vrhfqq3x41ndv5_1b4x2_14c0000gp/T/dumplinglab-release-pC8S7d` excludes `site/`, `order.html`, and the parked editorial experiments. The new restaurant homepage was not published.
- Deployment `dpl_HUo4kkftx8UzoG3guUhsXt2r44DK`, `https://dumplinglab-menu-3g5v8rvs1-youwenjiujius-projects.vercel.app`, promoted to `https://dumplinglab-menu.vercel.app` after protected read-only verification.
- Protected and public checks both matched exact HTML plus 39 runtime/asset files and passed staff-auth/config gates. No production data writes, no new browser visual acceptance or merchant charge. The prior WeChat cart report remains unresolved.

## Mobile language spacing — 2026-09-09

- Explicit deployment approval; runtime commit `56f5d9b`, deployment `dpl_AGjwbQDGxVeHnzNva7JpQssmjQhh` (`https://dumplinglab-menu-kutov2ox4-youwenjiujius-projects.vercel.app`) promoted to the existing public URL.
- EN moves right 8px on regular mobile widths, 6px at <=360px. The 44px target is retained, without moving the order-mode button. Prior Chrome/WebKit tests passed 20 mode/width cases with both language toggles, no overlaps or overflow.
- 17 release-time suites passed with `sourceUnchanged:true` in `test-output/qa-2026-09-09T14-50-10.838Z/report.json`; the exact release package passed `lunch-build-test.mjs`.
- Protected and public URLs both matched HTML plus 39 runtime/assets and staff/config gates. Package: `/var/folders/9g/vrhfqq3x41ndv5_1b4x2_14c0000gp/T/dumplinglab-release-3D0QVs`.
- No production data writes. Editorial layout and A/B palette studies stay local and are excluded. Footer spacing has only been diagnosed, not changed in this release.

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
