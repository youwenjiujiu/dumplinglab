# Ordering-mode continuity audit

## Scope and latest accepted design

Preserve the approved two-column menu, static dish photos, smaller preparation photos,
centered bilingual order-type chooser, brand illustrations (scaled/recolored copies in
the header), unified UI font and GST-inclusive menu prices. No visual redesign in this pass.

The previous goal turn made verified progress: source `a86c68b` was deployed and its
live GST-inclusive source checked. This follow-up does not imply that the complete
10-round, world-class experience objective has been achieved.

## Reproduced defect and fix — local, not deployed

- The new browser test failed before the fix: switching a takeaway menu to English
  changed the bottom action from `View order` to `View table`.
- `renderTray()` and `Fulfilment.chrome()` competed over the same labels. All basket
  labels now derive from the active mode in `renderTray()`; header rendering no longer
  patches basket labels afterward.
- Remote desktop tickets show Pickup/Delivery rather than Our table and omit the
  placeholder table number. Accessible names for the tray and its photo strip also
  use Order, not Table. Placed-order status respects the current mode.
- Delivery's desktop amount is labelled Estimated total, not food Subtotal, because
  its value includes the existing delivery fee. No price or delivery-policy change.

## Evidence

- `order-mode-copy-browser-test.mjs`: 320/390/1280 px × dine-in/takeaway/delivery,
  both English and Chinese, initial render, language toggle, add and remove, accessible
  labels, desktop ticket title, absent remote table badge, zero page errors.
- `entry-brand-browser-test.mjs`: all six width/language combinations passed;
  centered bilingual chooser and header geometry remain intact.
- `gst-inclusive-test.mjs`: every cent through $500 in all three modes remains
  balanced; menu prices are unchanged by GST extraction.
- Screenshot reviewed: `test-output/order-mode-copy/delivery-en-1280.png`.
- Syntax and diff whitespace checks passed.

## Still unverified or incomplete for the full objective

### Subsequent local fixes (not deployed)

- Resolved the WebKit screenshot corner artifact from the cross-engine audit.
  Pixel inspection found 450 non-opaque pixels in the first 18 rows at 320px:
  the preview notice's white background was missing under the translucent scrim.
  Removing the preview notice in a production-shaped local HTML fixture removed
  the defect. Fresh-page probes ruled out changing the scrim inset, root height,
  border radius, transforms and generic isolation; positioning the notice with
  `position:relative; z-index:1` restored its opaque background. Only that local
  notice rule changed; the production builder removes the notice entirely.
  `surface-paint-browser-test.mjs` now checks alpha/tone continuity, unchanged page
  width after the bilingual layout frame, and chooser interaction. It passed all
  24 engine/width/language/preview-shape cases (Chrome and Playwright WebKit,
  320/390/724px, Chinese/English). Bilingual entry suites also passed on both engines.
  Reviewed `test-output/surface-paint/webkit/preview-zh-390.png`; the corner is clean.
  These are local fixtures, not live Production or physical Safari/iPhone evidence.

- User's real iPhone/WeChat screenshot reports selecting Delivery while the menu
  stays around Noodles/Sides. Reproduced on local WebKit: after selecting delivery,
  document scroll was 1463px, category rail 94px and active category `noodles`.
  Order-type confirmation now explicitly starts the menu at Recommended, resets
  the horizontal rail, and clears any active search/filter that would hide the
  recommended section. It applies equally to dine-in, pickup, delivery and selecting
  the current mode again. It does not mutate cart items or checkout drafts.
  `closeModal` only requests this behavior for order-type confirmation; cancel and
  normal detail dismissal retain their original scroll restoration. A one-shot
  after-close action reapplies the intended start following native history Back,
  guarding against another sheet opened in the meantime. `mode-menu-position-browser-test.mjs`
  covers real taps with normal motion, all three modes/reselections, both languages
  and 320/390/430px; before-fix failure is recorded above.
  All 12 width/language/engine cases passed in Chrome and Playwright WebKit.
  Additional real UI flows verify clearing an old search, unchanged cart portions
  across same-mode confirmation, mode roundtrip and refresh, and Recommended as the
  starting position after a saved-mode reload. Fresh package
  `dumplinglab-release-qsLVIk` passed asset/script/cache/catalogue checks. No deployment.

- Input continuity: a real hit-test reproduced the unchanged 30px menu plus
  missing taps 21px to the right/bottom of its center. Its pseudo-element had a
  42px rather than 44px hit box because the positioning block excludes the border;
  increasing the invisible inset by 1px fixes this without enlarging the visual.
  A second before-fix assertion reproduced cart-tab keyboard focus falling to the
  body after rerender. Cart renders now restore the corresponding tab/control;
  disabled quantity limits and removed rows focus a non-action quantity group
  (or empty heading), so repeated Enter cannot decrement or delete another dish.
  Returning from cart detail restores the originating dish button. Remote detail
  back labels say Back to order rather than Back to our table.
  `cart-input-browser-test.mjs` passes 320/390/724px × Chinese/English × all three
  modes (18 cases), actual edge taps, both cart layouts, 20-portion limit, removal
  and empty-state focus. Only fresh browsing drafts are changed, never real orders.
  Add confirmation, scoped Undo and navigation/draft regressions pass afterward.
  Screenshot reviewed: `test-output/cart-input/limit-zh.png` (keyboard-only focus
  outline). Fresh package `dumplinglab-release-Xxq9xX` passes the release checks.

- Reproduced incomplete delivery forms resetting on close before submission.
  Whitelisted, length-bounded input fields now persist to a mode-specific tab
  session draft on input/change (memory fallback when sessionStorage is denied),
  never long-lived localStorage. Switching modes reads the corresponding draft;
  verified payment clears that mode's transient personal-data draft, including
  when a background cart receives confirmation. Pickup location selection restores.
  Native Forward now restores fulfilment/online/pickup panels explicitly instead of
  treating all three as cart panels. `navigation-draft-browser-test.mjs` covers
  Chinese/English close/reopen, Back/Forward, mode roundtrip and refresh; the full
  fulfilment test asserts paid delivery clears its draft. No auto-payment on Forward.

- Reproduced Chinese-only delivery-range errors in an English checkout. Added
  `error-copy.js` as a presentation-only boundary for 39 known remedies, dynamic
  dish/field validation and safe network/unknown-error fallbacks. It preserves
  request error status/code and pending-order semantics; internal JSON/server
  details do not become customer messages. Local and release allowlists include it.
  `error-copy-test.mjs` verifies bilingual mappings, dynamic catalogue names and
  immutable error metadata; the full fulfilment browser suite now asserts English
  range errors contain no Chinese and passes all six width/language cases.
  `payment-error-browser-test.mjs` uses local mocked 503s to check translated failure,
  retained request/token/items/total on retry and absence of a paid pickup ticket.

- Reproduced cross-mode Undo leakage: remove the last pickup item, switch to
  delivery, reopen the cart, press the resurfaced Undo; it incorrectly added that
  pickup item to delivery. Undo now records the originating cart object and scope
  key; a mode/table-scope change retires both its state and control. The action also
  checks ownership before any cart mutation. `undo-scope-browser-test.mjs` passes
  eight Chinese/English switch-and-return paths; the destination remains empty and
  the original removal remains intact. The existing add-confirmation suite verifies
  ordinary same-cart Undo still works, across all six width/language combinations.
  Order-mode copy regressions also pass on 320/390/1280 px. This is verified progress,
  not a wait or a claim of full-objective completion.

- Reproduced a stale quote replacing a newer two-portion $11.60 pickup review with
  the older one-portion $5.80 review. Checkout reads now bind to the exact rendered
  view and cart owner, not only the mode name. Stale config/quote errors are ignored,
  duplicate form submits are blocked, and pending-payment recovery drops old quotes.
  `checkout-race-browser-test.mjs` passes stale success, stale config failure and
  cross-mode stale failure in Chinese/English. `fulfilment-browser-test.mjs` also
  passes all six viewport/language flows, including simulated payment/retry/history.
- User requested replacing the dark add-to-cart toast. Added a compact white pill,
  brick-red check and short Added/已加入 label; dish/quantity remain screen-reader
  text. It clears automatically after 1.8s and follows basket height as photos load.
  Error and interactive Undo feedback are not converted to passive success pills.
  `add-confirmation-browser-test.mjs` passes 320/390/724px, Chinese/English: live
  status, geometry after image decode, detail-close visibility, expiry and Undo.
  Reviewed `test-output/add-confirmation/added-zh-390.png` after correcting delayed
  photo-load clearance. No menu geometry or price rules changed.

### Remaining full-objective evidence

- Real iPhone Safari keyboard, address-bar and overscroll behavior (desktop mocks
  are not physical-device evidence).
- Real merchant payment/webhook/pickup-location configuration and payment-provider
  end-to-end tests. Do not activate from unrelated credentials or make real orders.
- Delivery operating details including net-food minimum vs the reference system's
  total-based minimum, actual service area/locations and courier handoff.
- A fresh end-to-end visual and usability review across all final screens after
  remaining corrections; older audit files include explicitly superseded treatments.

## Integrated regression / release audit

- Cross-engine coverage now uses `browser-test-runtime.mjs`: default fresh Chrome,
  or explicit `ATELIER_BROWSER=webkit` (Playwright WebKit, not installed Safari).
  WebKit 26.5/revision 2311 was installed using system-trusted certificate roots;
  TLS verification was not disabled. The six-suite baseline before the later
  order-type position fix passed with unchanged runtime in
  `test-output/qa-2026-09-07T09-08-58.180Z/report.json`.
  Its screenshot review showed a small top-left paint artifact. The user's real
  iPhone report first redirected work to the reproduced menu-position defect; the
  subsequent surface-paint follow-up above isolated and fixed the preview notice
  painting issue. Browser compatibility tests are not complete visual
  approval or a claim of physical iPhone verification.

- The preceding turn made verified progress: the new add confirmation was exercised
  across six width/language cases, including expiry, cart clearance and interactive
  Undo. This continuation preserves the accepted UI rather than redesigning it.
- `qa-current.mjs` now provides one local-only entry point, two workers, individual
  logs, a runtime fingerprint and explicit timeout/failure reporting. The original
  22-suite run passed with unchanged runtime:
  `test-output/qa-2026-09-07T08-51-58.283Z/report.json`.
- Review found a test blind spot: preparation QA looked for obsolete `dry` and
  silently skipped it when absent. It now requires `tossed` and all other methods,
  opens an eligible dish for each and verifies the selected detail control. The
  four photos must still be centered at 85% of the original frame. This strengthened
  check passes at 320/390/724px without a UI change.
- Added in-memory production-state coverage to the runner: concurrent diners,
  idempotency, lost responses, staff queue and authentication. Fingerprints also
  include the loaded motion modules and supporting catalogue/translation scripts.
- Expanded run `test-output/qa-2026-09-07T08-56-48.046Z/report.json` has 22 passing
  suites and one timeout, with unchanged runtime. The ingredient suite emitted all
  six successful 35-dish case summaries and its final screenshot directory, but
  did not exit before 180s. This is retained as a failed run, not relabelled green.
- After that process was confirmed terminal, the unchanged ingredient suite was
  rerun alone with `DEBUG=pw:browser`. All six cases passed and the process exited
  0 after approximately 106s. Diagnostic output records graceful close from
  09:02:01.102Z to 09:02:01.259Z, including Chrome exit 0 and temporary-directory
  cleanup. Screenshots are in `dumpling-ingredients-3F5y3s`. The previous teardown
  timeout did not reproduce; its exact native-browser cause remains unproven.
- Fresh package `/var/folders/9g/vrhfqq3x41ndv5_1b4x2_14c0000gp/T/dumplinglab-release-0uRGh0`
  passes `lunch-build-test.mjs`: current 35-product catalogue, referenced assets,
  syntax and absent preview banner. New assertions require the bilingual error
  module before its callers and verify every entry JS/CSS content-version hash.
- Visually reviewed local 390px pickup review in English and delivery review in
  Chinese from `dumpling-fulfilment-rBfW1F`: item amounts, net/GST split and primary
  payment action remain distinct. Test store/address labels are not real merchant
  details. No production publishing or real order/payment was performed.
- Updated the edition README and deployment guide to remove obsolete 32/61-product,
  5/10-piece, rotating-photo and no-payment-integration claims. The deployment guide
  now warns that cloud QA tables and a temporary password do not isolate Production
  storage or the live staff queue; mutating cloud acceptance needs an explicitly
  authorized isolated environment.
