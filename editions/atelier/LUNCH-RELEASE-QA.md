# Lunch release acceptance — 2026-09-06

Target: https://dumplinglab-menu.vercel.app/ (existing production alias).
User confirmed lunch service and preparation → filling → portion flow.

## Ten rounds

1. **Menu transcription — passed.** All 32 names/base prices, 9 filling 10-piece prices, 4 categories, and the 3 explicitly supplied side portions compared against independent expected fixtures.
2. **Preparation rules — passed.** All 204 filling configurations checked. Soup/tossed offer 9 fillings; boiled/fried offer 6. Sauce/spice belong only to tossed; noodles only to soup/tossed.
3. **Pricing and tampering — passed.** 227 purchasable configurations × 1/2/20 portions checked against integer-cent expectations. Client-supplied prices ignored. Invalid/missing variants, retired dishes and impossible wonton preparations rejected.
4. **Ordering flow — passed (DOM).** No filling cards before choosing preparation. Four choices filter correctly. Size, spice, sauce and noodles update the exact variant and displayed price. Switching preparation clears inapplicable options.
5. **Cart and layout contracts — passed (DOM/source).** Image/blank-space/amount/label clicks open cart. Different configurations remain separate. Quantities, subtotals and complete preparation labels verified. Gallery/list preserves image nodes. Menu uses shared content rows, bounded images, wrapping option groups and 44px targets.
6. **Menu migration — passed.** Old cart selections are quarantined and reported, not silently renamed or repriced. Original operation data and historical receipts remain. New receipt names/prices are snapshots.
7. **Shared-table reliability — passed.** CAS contention, 10 diners, mixed preparations, retries, isolated groups, simultaneous checkout, late additions, conflicting notes, storage failures, archived receipts and staff authentication.
8. **Copy/accessibility/recovery — passed (DOM).** Chinese and English controls, explicit Chinese word boundaries for 32 names, reduced motion, no sparkle/illustration labels, full option receipt text and lost-order-response recovery.
9. **Production packaging — passed.** Active client/server lunch catalogue agreement, syntax, linked assets, no-store live code, absent preview banner, unchanged security/auth setup. Available 20 image sizes load and conditional requests transfer no body.
10. **Actual cloud acceptance — passed.** Isolated table QADE72924C in an acceptance-only protected deployment. Two 10-piece tossed pork/chive portions with chilli, sesame and noodles total S$24.60. Shared cart, note conflicts, concurrent submission (200/409), server pricing, authenticated staff receipt/resolve, calls and retained history passed. Test orders/calls archived before promotion.

## Limits and explicit decisions

- No connected browser was available; these checks do **not** claim screenshot, real-phone touch, or pixel-level visual acceptance.
- Lunch is labelled explicitly. No clock-based hours are invented because exact serving hours were not supplied.
- “煎 +1新币” is implemented as +S$1 per portion for either size; soup/tossed noodles +S$2.50 per portion.
- Default portion is 5. Tossed starts explicitly at not spicy, no sesame sauce, no noodles; each is visible and editable.
- Unsupported no-pork/not-spicy filters removed instead of inferring unknown ingredients.
- Existing relevant photos retained; newly listed dishes without supplied corresponding photos have neutral placeholders, not unrelated dishes.
- No customer table is mutated by acceptance tests. Original production staff password must remain unchanged.

## Commands

    node editions/atelier/lunch-test.mjs
    NODE_PATH=<test-deps>/node_modules node editions/atelier/lunch-ui-test.mjs
    node editions/atelier/production-test.mjs
    node editions/atelier/test.mjs
    node editions/atelier/shared-test.mjs
    node editions/atelier/walkthrough-test.mjs
    node editions/atelier/assets-test.mjs
    node editions/atelier/lunch-build-test.mjs <fresh-release-directory>
    node editions/atelier/release-check.mjs <acceptance-only-deployment> <private-env-file>
