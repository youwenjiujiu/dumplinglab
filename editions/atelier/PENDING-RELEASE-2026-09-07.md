# Release record — published 2026-09-07

The user explicitly requested deployment. Application source `18ed437` on
`release/atelier-production-20260906` was committed, pushed, built and deployed as
`dpl_HDKYeG72Ebn8EZJLvqTa8suXfQwm`, then promoted to
https://dumplinglab-menu.vercel.app/. Protected staging and public frontend bytes
matched the validated package. No live orders or payments were created.

## Validated local package

`/var/folders/9g/vrhfqq3x41ndv5_1b4x2_14c0000gp/T/dumplinglab-release-FKRvXj`

The release checker passes; the production marker is present and the local preview
banner is absent. A fresh byte comparison matched these source/release files:

| Asset | SHA-256 prefix |
| --- | --- |
| atelier.css | d217cda0e2b1 |
| shared-table.css | 5ece0bfd8e96 |
| app.js | 62007d40b153 |
| error-copy.js | 3bc1a321bf68 |
| cart-store.js | 75e23b2b3853 |
| fulfilment.js | 97fe11b74429 |
| shared-table.js | e935e085029e |
| lunch-ui.js | 3071b43bcdf9 |
| bilingual-fit.js | 69a96d0755b2 |

Recheck or rebuild if runtime files change. Test helpers and reports are not
production assets. The package is not evidence of real merchant payment readiness.

## Released customer-facing changes

- Confirming dine-in, pickup or delivery, including reselection, starts at
  Recommended and resets the category rail. Cancel keeps the old reading position.
- Compact white Added confirmation, cart-owned Undo, consistent order-mode labels.
- Stable cart keyboard focus, real 44px menu-plus hit region without larger artwork.
- Bilingual actionable errors, view-owned checkout responses, retained transient
  delivery drafts and correct Back/Forward restoration.
- The WebKit preview-notice paint fix only affects the local notice; production
  HTML omits it. Accepted menu geometry, photographs and inclusive food prices stay.

Evidence and limitations are in `UX-CONTINUITY-2026-09-07.md`. The current runner
supports default Chrome coverage and explicitly selected shared WebKit suites.
The new order-type position regression passed both engines, including refresh,
saved cart, search clearing, reselection and cancellation.

## Boundaries / remaining gates

- Publishing approval was received and this batch is deployed.
- Preserve unrelated root, `scripts/` and legacy `web/` work. Do not stage the whole
  worktree or publish via the old `web/` frontend shortcut.
- Release only the Atelier allowlisted build. Deployment must not activate missing
  merchant credentials, fabricate pickup locations or change the delivery policy.
- Cloud acceptance writes require explicit authorization and isolated storage;
  a QA table code or temporary staff password is not isolation from the live queue.
- Updated physical iPhone/WeChat review is needed after an authorized publish.
- Real online checkout still needs the merchant's payment provider/configuration,
  actual locations and delivery operations. The provider clarification is pending;
  never request secret keys in ordinary chat or borrow another business's account.
