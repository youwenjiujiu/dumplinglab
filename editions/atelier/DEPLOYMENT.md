# Atelier production release

The restaurant's existing project is `dumplinglab-menu` on Vercel. Keep local port 7898 as a separate preview; its `.local/atelier/` data is never uploaded or migrated.

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
