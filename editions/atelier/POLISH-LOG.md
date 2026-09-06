# Ten-round polish audit

Goal: ten evidence-led rounds toward an exceptional restaurant ordering experience. Preserve brick red / ivory, unframed food, useful language and real shared-table behavior. Local port 7898 only; no production deployment.

“World's best” is an aspiration, not a verified comparative claim. Completion requires an implemented, regression-tested experience and real rendered review, not ten arbitrary edits or passing DOM tests alone.

## Round plan and gates

| Round | Focus | Required evidence | State |
| --- | --- | --- | --- |
| 1 | Typography, visual hierarchy, mobile margins, useful copy | Actual screenshots at 320/390/430/768/1440; long bilingual names; no overlap | Implemented in preceding turn; browser verification pending |
| 2 | Direct manipulation and mistake recovery | Quantity/style updates preserve image, focus and rotation; remove/undo; bounded rotation; scroll unaffected | Implemented and DOM-tested; real-touch verification pending |
| 3 | Navigation and discovery | Native Back/close behavior, category selection and search results, return position | Back/Forward and search/category tests pass; real browser checks pending |
| 4 | Table gallery and tray | 1/6/12 selections, styles, list↔gallery continuity, readable subtotals, thumb reach | 12-dish continuity and selected preparation tested; rendered density/thumb reach pending |
| 5 | Multiple diners and separate groups | Concurrent edits, truthful feedback, no cross-group leakage, note conflict handling | Note-conflict and ten-diner/group isolation tests pass; multi-phone walkthrough pending |
| 6 | Confidence at checkout | Review freshness, uncertain responses, duplicates, sold-out/errors, receipts | Late changes and lost-response UI/server tests pass; rendered/error-state review pending |
| 7 | Slow/offline/private browsing resilience | Storage failure, offline queue, reconnect, image failure and recovery | Storage, reconnect, photo fallback and retry implemented/tested; real browser checks pending |
| 8 | Accessibility and bilingual use | Keyboard/focus, reduced motion, touch targets, readable secondary text, EN/ZH | Focus/bilingual/reduced-motion DOM tests, larger targets and text applied; rendered assessment pending |
| 9 | Food presentation and performance | Assets, loading order, layout stability and image continuity measured in browser | 122 assets and conditional caching HTTP-tested; real loading/layout timing pending |
| 10 | Full restaurant walkthrough | Two guests + separate group; small and large viewports; full ordering and recovery; final visual audit | Ten-diner HTTP walkthrough passes; real phones, viewports and final design audit pending |

## Evidence — 2026-09-05

- Previous turn made implementation progress: outer mobile red gutters reduced to 8px; Chinese names grouped by ingredient; all selected dishes retained in tray; direct 2D dish rotation; detail layout revised. Tests cover real client DOM and isolated local APIs, not rendered pixels.
- Current local server responds HTTP 200 on port 7898. The main `web/` worktree remains untouched by this edition's changes.
- Browser skill connection revalidated: stale Chrome binding fails availability; supported runtime discovery returns no available browsers. Visual and real-touch gates remain open. User asked to connect browser while code work continues.
- Existing baseline tests: `test.mjs`, `shared-test.mjs`, and `ui-test.mjs` passed in the previous implementation turn. Rerun after each relevant change; do not infer current success from old output.
- Current turn regression rerun: all three suites pass, plus `node --check editions/atelier/app.js`. New UI tests prove remove/undo restores exactly one portion; direct manipulation angle, photo node and focus survive portion changes; simulated asynchronous native Back/Forward exits/reopens dialogs and returns cart detail → cart → menu. History simulation is not real browser proof.
- Storage tests deny reads and writes: client boot/mutation/nickname do not throw, offline items stay in memory, reconnect flushes them, independent peer sees server state. Without durable storage, offline UI explicitly warns to keep the page open.
- Removed another review slogan and a contradictory local staff-call success message. Preview does not contact a real kitchen or staff.
- Focus indicators added to the horizontally scrollable food strip and keyboard-rotatable detail photograph.

## Next checks

1. Connect the supported browser, then inspect actual layouts at 320/390/430/768/1440 widths in Chinese and English.
2. Verify margins, long dish names, larger secondary type, photo fallback, touch targets and large-table tray do not overlap.
3. Exercise vertical scroll vs rotation, native Back/Forward, gallery transitions, search and note conflict with real input.
4. Measure actual loading/layout stability and conduct the multi-device restaurant walkthrough. Record before/after screenshots and iterate the visual design; none of these gates is satisfied by DOM/HTTP tests.

## Evidence — 2026-09-06

- Browser runtime discovery still returns an empty list. This is not a completed visual review and does not by itself stop useful in-scope implementation.
- Search now defers updates during Chinese IME composition, matches all whitespace-separated terms in either language, normalizes full-width input, and keeps current conditions/results visible when the input is collapsed. Reset and category selection remove active conditions with predictable focus.
- Search tests pass for `pork Beijing`, full-width equivalent, switching UI languages, composition, collapsed-search state, filter intersection/empty state, and category reset. Actual catalogue correctly matches both Beijing potstickers and Beijing noodles with a documented pork ingredient.
- Cart detail now retains the selected cooking style. Tests cover changing style without rebuilding the image, adding it, and reopening that exact variant.
- Menu/cart/detail photo failures preserve names and ordering. Detail retry uses the same image node, offers a real retry button, restores slider semantics/focus after load, and disables rotation while unavailable. DOM failure/recovery tests pass; real network-touch verification pending.
- Large table test covers 12 distinct selected dishes, the full tray and gallery/list photo-node continuity.
- HTTP asset inventory: 61 small WebPs total 5,842,758 bytes; all 122 small/detail WebPs total 16,634,134 bytes. Added SHA-256 ETag revalidation for media/fonts only. Conditional requests return 304 with zero body bytes; current code and cart APIs remain `no-store`.
- Restarted only the validated `node editions/atelier/preview.mjs` local process on 7898 to apply media caching. API tests continue using dedicated QA/QB/QC/QD tables, not A1.
- Final command run passed: `assets-test.mjs`, `test.mjs`, `shared-test.mjs`, `ui-test.mjs`. These prove the named HTTP/DOM behaviors, not final visual excellence or mobile performance.

### Concurrency and final pre-browser audit

- New clients send the note text they edited from. The local server rejects a conflicting base with `NOTE_CONFLICT`; the client preserves its draft, continues independent dish operations, and offers explicit shared/local note selection. Conflicting drafts survive storage/reload. Legacy note clients without a base remain supported; production adoption must coordinate client/server versions.
- Server refuses checkout when someone removed a portion or edited a note after the review snapshot. Later positive additions still remain for the next order. Client review explains these cases and requires re-review for destructive changes.
- Lost-response UI test observes an unconfirmed state with no success stamp, then resolves the exact original request via authoritative polling. Own recovered orders are not announced as someone else's order.
- Secondary text token changed from `#8b8174` to `#746a5f` against `#f5efe3`; calculated contrast increased from 3.34 to 4.62. Key 7–8px bilingual labels raised to 10px. Main icon/style/quantity controls have 44px minimum targets; dish plus retains its smaller visible circle with a larger hit region. These are source-level improvements, not a browser accessibility certification.
- `walkthrough-test.mjs` passed: ten independently identified diners, mixed preparations, duplicate retries, separate group B, concurrent checkout, server prices and tenth diner's late item remaining unsubmitted.
- Latest full test run passed five suites: walkthrough, core cart, metadata, HTTP assets and UI DOM. Main JS files pass `node --check`; 7898 returns HTTP 200. A subsequent nullish-coalescing fix preserves an intentionally empty conflicting draft.
- The missing browser connection has been revalidated over at least three consecutive goal turns, with discovery returning `[]`. Useful implementation continued in each, but the remaining acceptance gates require rendered evidence and real interaction. Do not label the ten rounds complete or claim the comparative “world's best” outcome.

## Non-negotiable checks

- No live kitchen/payment claims in this local preview.
- Do not invent customers, online presence, nutrition/allergy guarantees or order status.
- Every mutation still goes through shared-cart operations and authoritative order validation.
- No photo overlaps text, no hidden selections behind an unhelpful count, no decorative slogan replacing an action label.
- Preserve unrelated user/other-agent work and do not deploy to Vercel.
