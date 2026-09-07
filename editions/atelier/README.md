# Dumpling Lab · 一起吃

An independent redesign. The legacy `web/` frontend is preserved; its production APIs are integrated with this edition. Both editions share the real catalogue, bilingual copy, photographs and input validators.

The production release builder overlays this frontend onto the existing Vercel APIs and staff page without replacing the legacy frontend files. See [DEPLOYMENT.md](DEPLOYMENT.md) for release checks, persistent storage and rollout/rollback precautions.

## Preview

```sh
node editions/atelier/preview.mjs
# http://127.0.0.1:7898/?table=A1
```

No build step. Local API only, bound to loopback. Orders persist atomically to `.local/atelier/orders.json`; nothing is forwarded to Vercel. Override `PORT` and `DL_PREVIEW_DATA` for isolated testing.

## Experience

- The shared table opens as a photo-first, unframed two-column spread. Switch to a compact list without replacing image nodes; opening a dish and returning preserves the table position. Open `/?table=A1#cart` directly.
- Local `shared-motion.js` serves the customized `generated/table-view-motion/developer/web-component/table-layout.js`. It implements reference-guided layout motion, product-to-tray transfer and a morphing layout control; the generic generator baseline is retained but is not loaded. See `motion-plan.json` for timings and observations from the supplied video.
- The current catalogue has 35 products across 5 categories. Choose one of four preparation methods, an eligible filling, then 5 or 9 pieces and applicable extras. All 204 configurations (including compatible saved variants) are validated and priced on the server. Menu food prices already include GST; checkout extracts the tax, never adds another 9% to food.
- Entry presents three illustrated, bilingual choices in a centered dialog: dine-in, takeaway and delivery. Remote carts do not require a table. New takeaway orders skip personal/booking fields; verified payment produces a pickup number and QR credential. Production merchant activation remains a separate gate; see [FULFILMENT-NEXT.md](FULFILMENT-NEXT.md).
- Optional, unverified nicknames identify actual additions. Activity and contributor counts are group-scoped and retry-safe; no online-presence count is invented. Order receipts retain prices, quantities, preparation, notes and contributor metadata.
- The standalone 3D steamer prototype is archived in source and removed from the main UI. Its old `#table3d` entry now opens the actual shared table. No 3D engine is loaded during ordinary ordering.
- Responsive paper menu, unframed dish photography, mobile category rail and full category picker.
- A shared tray that shows actual selected dishes; desktop receipt and bilingual detail sheets.
- The tray includes every selected dish in its own horizontal scroll strip, separate from the order button. Mobile paper outer gutters are 8px; inner content spacing is preserved. Chinese names wrap only at reviewed word boundaries.
- Detail photographs remain static; the rejected plate-rotation treatment is not active. Ingredient summaries stay compact and subordinate to the dish name.
- Quantity and preparation changes update controls without rebuilding the photograph. Adding a dish shows a compact white Added/已加入 confirmation. Removing the last portion offers an eight-second undo owned by that cart, so it cannot leak into another ordering mode. Native Back/Forward and cart-detail return are covered in fresh local Chrome contexts.
- Delivery form drafts survive close/reopen, refresh and mode changes within the tab session, with memory fallback when sessionStorage is denied. Verified payment clears the transient draft. Stale quote responses cannot overwrite a newer checkout, and payment retries retain their original request identity.
- If browser storage is unavailable, the cart keeps operating in memory and can sync to the local server; offline messaging warns not to close the page rather than promising persistence.
- Search and menu-label filters; a transparent, editable meal suggestion by group size and preference.
- Bilingual multi-term search respects IME composition and keeps active search/filter context visible when collapsed. Photo failures retain ordering controls and offer retry in details; selected preparation is preserved when reopening a cart dish.
- Group invitation links and separate ordering groups for guests sharing a physical table.
- Optimistic cart updates, visible connection status, persistent offline edits and retry.
- Explicit review before ordering; idempotent requests; later additions survive a checkout; order history is shared.
- Shared-note conflicts preserve both versions for explicit resolution. Removing dishes or changing the note after review invalidates stale checkout; positive additions remain for the next order. An uncertain request resolves against its original ID before showing success.
- Native dialogs, focus restoration, labelled controls, keyboard activation and reduced-motion support. Menu plus buttons retain their small visual circle with a verified 44px hit area. Cart tabs and detail returns keep focus; quantity limits/removals use non-action fallback targets to prevent repeated-key mistakes.

## Verify

Current integrated regression suite (requires the loopback preview above and local Playwright/Chrome):

```sh
node editions/atelier/qa-current.mjs
```

For the shared core browser suites on Playwright WebKit (not a real iPhone or
the installed Safari application):

```sh
npx playwright install webkit
ATELIER_BROWSER=webkit node editions/atelier/qa-current.mjs
```

The WebKit run selects menu layout, bilingual entry, form layout, navigation/drafts,
cart input, fulfilment, order-type/menu-position and surface-paint checks. Other suites retain their
Chrome/local unit-test coverage. Reports record the selected engine, rather than
claiming all suites ran in both browsers. The test helper never opens personal profiles.

It refuses a non-preview API, runs at most two workers, and writes per-suite logs and
a timestamped report under `test-output/qa-*/`. Some suites create explicitly simulated
local orders. The runtime fingerprint must remain unchanged during the run. Coverage
includes current menu geometry, all four preparation paths, bilingual copy, cart
ownership, checkout/history continuity, GST, payment failure recovery and staff pickup.
Confirming any order type starts at Recommended with the category rail reset;
canceling the picker or closing an ordinary detail preserves the reading position.
Desktop viewport/keyboard simulations are not physical iPhone evidence. See
[UX-CONTINUITY-2026-09-07.md](UX-CONTINUITY-2026-09-07.md) for local changes and remaining gates.

Additional targeted/legacy checks (review scope before running):

```sh
ATELIER_TEST_URL=http://127.0.0.1:7898 node editions/atelier/test.mjs
node editions/atelier/scene-test.mjs
node editions/atelier/shared-test.mjs
node editions/atelier/assets-test.mjs
node editions/atelier/walkthrough-test.mjs
node editions/atelier/lunch-test.mjs
node editions/atelier/production-test.mjs
```

DOM-only interaction checks use the test-only `linkedom` package, without changing production dependencies:

```sh
# Install linkedom in a temporary directory of your choice, then:
NODE_PATH=/path/to/test-dependencies/node_modules node editions/atelier/lunch-ui-test.mjs
```

The interaction checks exercise actual client scripts against isolated `QD…` tables: naming, selecting, gallery/list continuity, quantity focus, detail return, peer updates, notes, review, submission, receipt history and reduced motion. They are not pixel-level browser tests. `shared-test.mjs` uses `QC…` tables; A1 is never modified by these tests.

Tests use isolated `QA…` / `QB…` table codes, never A1. They cover multi-device cart updates, group isolation, duplicate operations, concurrent checkout conflicts, additions during review, input validation, offline reload and lost-response recovery.

The port 7898 preview stays local-only even when the production release is published. The production build uses server-side validation, private persistent storage and staff authentication. Prices come from the confirmed catalogue. The active edition contains online payment integration behind merchant-configuration gates; local preview payments are simulated. Neither local tests nor an unconfigured production checkout prove live payment or courier operation, and the UI must not fabricate kitchen progress. The old 61-dish UI fixtures in ui-test.mjs are historical; the current regression runner is the preferred baseline.

Earlier editorial prototypes and design audits are historical, not the current acceptance baseline. Browser screenshots and geometry checks now exist, but final aesthetic acceptance and real-device usability still require review.
