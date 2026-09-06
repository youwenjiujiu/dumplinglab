# Atelier production release

The restaurant's existing project is `dumplinglab-menu` on Vercel. Keep local port 7898 as a separate preview; its `.local/atelier/` data is never uploaded or migrated.

## Build and publish

1. Run `production-test.mjs`, the local API/interaction tests, and `assets-test.mjs`.
2. Run `node editions/atelier/build-production.mjs`. It prints a fresh release directory. The allowlist includes the Atelier frontend, 122 optimized food images, two fonts, the logo, catalogue, production API and existing staff page. No local orders, uploads, credentials, admin/generation tools or legacy 3D prototypes are copied.
3. From that directory run `vercel deploy --prod --skip-domain --yes`. This uses the existing Production storage and password but does **not** change the restaurant's public URL.
4. Use Vercel CLI 48.8+ `vercel curl` to inspect the protected deployment; do not disable protection. `release-check.mjs` accepts the staged deployment URL and a protected temporary env file holding the existing staff password. Sensitive Production variables cannot be exported by Vercel. `--cart-only` tests cloud concurrency without making orders or staff calls.
5. Run the full acceptance check before promotion. It uses random QA tables, checks staff authentication/receipt/resolve and archives its own test events. The previous production backend does not read v2 events, so these pre-promotion test orders are not sent to the old live staff screen.
6. Commit the exact source used to build. Then `vercel promote <validated-deployment-url> --yes`; check the public customer URL and `/staff` again. Remove temporary env files containing credentials after verification.

Do not use the old admin page's `cd web && vercel --prod` shortcut: it publishes the legacy frontend. The reproducible release builder is the production entry point for this edition.

If the sensitive staff password is unavailable, `node editions/atelier/stage-acceptance.mjs <release-dir>` creates a separate **acceptance-only** protected deployment with a temporary deployment-scoped password and prints the protected credential-file path. The project's stored password is not changed. Never promote that deployment. After its full acceptance passes, deploy the exact same release directory again **without** the password override, verify the configured authentication gate, then promote that final deployment. Delete the acceptance deployment and temporary credential files afterwards.

## Data and operations

- Production uses Private Vercel Blob, not a local file or process memory. `BLOB_STORE_ID`/OIDC and `DL_STAFF_PASSWORD` remain in the existing project's Production environment.
- A `dumplinglab-tables/v2/<table>/<group>.json` document commits cart changes, receipts and staff pending events atomically using conditional ETag writes. Independent concurrent operations retry from the latest state; duplicate requests do not recreate servings or orders.
- First access imports the existing v1 cart and order history read-only. Existing pending v1 orders/calls remain in the staff queue. No legacy data is deleted.
- Processing an order sets `resolvedAt`; it does not delete the receipt. Orders are priced from the server catalogue. This release does not add payment processing, kitchen hardware integration or automatic table turnover.
- The shop's current 61 prices are retained. Product photos remain labelled as illustrative where appropriate.
- Keep the staff page open and enable its sound. Submitting an order means it has been stored in the staff queue, not that someone has already read or prepared it.

## Rollback caution

After v2 has accepted real orders, do **not** instantly roll the entire project back to a pre-v2 API: that API cannot display the new queue. Roll back only frontend assets while retaining this backend, or first reconcile the v2 queue under staff supervision. Both legacy and v2 records are retained for recovery.
