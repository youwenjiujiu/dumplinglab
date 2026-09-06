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
- Lunch uses 4 categories and 32 products. Dumplings require preparation first, then one of 6 or 9 permitted fillings, then 5/10 pieces and applicable extras. All 204 configurations are validated and priced on the server.
- Optional, unverified nicknames identify actual additions. Activity and contributor counts are group-scoped and retry-safe; no online-presence count is invented. Order receipts retain prices, quantities, preparation, notes and contributor metadata.
- The standalone 3D steamer prototype is archived in source and removed from the main UI. Its old `#table3d` entry now opens the actual shared table. No 3D engine is loaded during ordinary ordering.
- Responsive paper menu, unframed dish photography, mobile category rail and full category picker.
- A shared tray that shows actual selected dishes; desktop receipt and bilingual detail sheets.
- The tray includes every selected dish in its own horizontal scroll strip, separate from the order button. Mobile paper outer gutters are 8px; inner content spacing is preserved. Chinese names wrap only at reviewed word boundaries.
- Detail photography supports direct horizontal dragging (2D rotation, not a 3D model), Left/Right keys and Home to reset. Vertical scrolling is preserved; motion stops immediately on release. Functional labels replace decorative slogans.
- Quantity and preparation changes update controls without rebuilding the photograph. Removing the last portion offers an eight-second undo. Native Back first dismisses the sheet; cart detail returns to the cart. Browser history is covered by simulated DOM tests, not yet verified in a live browser.
- If browser storage is unavailable, the cart keeps operating in memory and can sync to the local server; offline messaging warns not to close the page rather than promising persistence.
- Search and menu-label filters; a transparent, editable meal suggestion by group size and preference.
- Bilingual multi-term search respects IME composition and keeps active search/filter context visible when collapsed. Photo failures retain ordering controls and offer retry in details; selected preparation is preserved when reopening a cart dish.
- Group invitation links and separate ordering groups for guests sharing a physical table.
- Optimistic cart updates, visible connection status, persistent offline edits and retry.
- Explicit review before ordering; idempotent requests; later additions survive a checkout; order history is shared.
- Shared-note conflicts preserve both versions for explicit resolution. Removing dishes or changing the note after review invalidates stale checkout; positive additions remain for the next order. An uncertain request resolves against its original ID before showing success.
- Native dialogs, focus restoration, labelled controls, keyboard activation and reduced-motion support.

## Verify

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

The port 7898 preview stays local-only even when the production release is published. The production build uses server-side validation, private persistent storage and staff authentication. Lunch prices come from the supplied lunch menu; only corresponding existing photographs are retained. New dishes without supplied photos are not assigned unrelated food photos. Neither edition processes payments or fabricates kitchen progress. The old 61-dish UI fixtures in ui-test.mjs are historical; lunch-ui-test.mjs covers the current preparation-first UI.

The previous editorial edition was running from `/tmp/dumplinglab-editorial.V1ylvB`; its files are preserved there. Browser visual validation was unavailable in this session; do not treat code and API checks as pixel-level approval.
