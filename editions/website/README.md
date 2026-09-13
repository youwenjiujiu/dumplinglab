# Dumpling Lab website

One bilingual restaurant homepage, existing Atelier ordering at `/order`, shared
catalogue/assets/API origin. No second cart or payment integration. This is an
unpublished website edition; the live restaurant remains unchanged.
The homepage-only ordering document adapter adds a footer return link and keeps
its URL/accessible name synchronized with the ordering document's language.
Its invisible 44px touch target preserves the original footer spacing and type.
It does not modify the underlying ordering application or payment handlers.

## Current work — D46 campaign polish, 2026-09-10

User requested continued, recorded polishing toward 100 rounds. The work log is
`POLISH-LOG.md`; neither test-case counts nor repeated screenshots are reported
as completed design rounds. Work is continuing, not accepted or deployed.

- Three generated transparent food assets replace catalogue plates in the hero:
  potstickers, chilli wontons and lifted wonton noodles. Exact prompts are
  `media/HERO-PROMPTS.txt` and `media/NOODLE-PROMPT-v2.txt`. The initial noodle
  image and two repair attempts failed food-identity/alpha gates and were rejected;
  the fresh v2 source passed both and is now integrated.
- Lilita Latin + KuaiLe CJK display headings, original logo, four-character CJK
  lines, manual food selection, separately timed food/type/label motion. Opening
  settles once after decode; it does not add items, change scenes or scroll.
- Brand-red opening, dark chilli scene, warm-light broth scene. Full-bleed owner
  space reference, coordinated food/visit/footer treatment. Space imagery is an
  owner-supplied reference, not independently verified documentary photography.
- Arrival illustrations reuse the original `header-dinein-v1.svg` and
  `header-takeaway-v1.svg` geometry with homepage-only campaign-red derivatives;
  the original ordering illustrations and brand marks are not edited.
- Phone/tablet/wide-screen compositions; flowing caption/CTA; large-text reflow;
  compact short-phone layout; active/sold-out catalogue behavior preserved.
- Narrow-screen scroll choreography gives food, outgoing title and incoming
  close-up copy separate beats. Round 111's 168-phase clearance sweep passes in
  both engines and at 3× WebKit density; desktop timing stays unchanged.
- Wide openings reserve separation between food and dish names. Extra caption
  lines automatically add clearance; the final close-up pose stays unchanged.
- Enlarged desktop type additionally reserves vertical space in CSS, allowing
  normal document scrolling when the hero no longer fits. Combined long-name /
  125–200% type tests cover the intermediate sizes; normal-type geometry remains
  unchanged against the pre-adjustment package.
- Fonts are committed WOFF2 assets (~34 KB combined). After changing static
  display copy run `node editions/website/build-fonts.mjs` (fontTools + brotli).
- Responsive 800/1254 px food delivery and a 480 px wordmark derivative preserve
  the original source artwork. Rebuild with `node editions/website/build-hero-images.mjs`.
  `image-delivery-review.mjs` checks DPR selection, post-hero warming and data saver.
- Slow-loading lab review (`loading-review.mjs`) found and corrected initial
  chapter-height shifts and duplicate film-poster requests. At 390×844 DPR 2,
  150 ms simulated latency, 1.6 Mbps and 4× CPU, checkpoint 114 recorded
  hero LCP 2.948 s and layout-shift sum .000665 (previously 7.5 s / .68). These are
  lab observations, not a production performance guarantee.
- The secondary poster waits for primary-food decoding, unless the visitor
  reaches the film first. Both browser engines cover delayed hero, direct film
  visits, reduced motion and no-JS / failed-module picture fallbacks.
- Failed film previews use a bilingual branded fallback, retaining manual play
  and retry. Both engines cover combined poster/video network failures and
  successful playback after retry, without replaying a stale broken image.
- Failed interior/shopfront photographs use compact bilingual fallbacks instead
  of broken-image panels. Original captions, address and links stay intact.
  `place-photo-review.mjs` compares successful and recovered layout against the
  pre-change package across 32 engine/viewport/language/text-size cases.
- Partial interface-script failures expose native chapter links and a direct
  menu link instead of dead phone controls. Ordering language is initialized
  inline; missing bootstrap data does not start a half-working interface.
  `partial-script-review.mjs` covers independent/combined failures in both
  engines and WebKit enlarged text, with no order or inventory writes.
- A 6.9 KB automatically compiled homepage catalogue snapshot replaces 118.2 KB
  of historical menu/variant scripts on the homepage. It derives from the exact
  assembled ordering source; live stock/pricing still refresh from `/api/catalog`.
  Ordering itself retains all original scripts. `bootstrap-review.mjs` checks
  data equivalence, bilingual fallback and absence of legacy homepage downloads.
- Browser evidence under `/tmp/dumplinglab-d46-review/`: Chrome and WebKit,
  extended bilingual/viewport matrix, rapid clicks/keyboard, 200% text, delayed
  and failed image loads, retry, reduced motion, storage blocked and no-JS.
  These are fresh local browser contexts, **not physical WeChat/iPhone testing**.

The motion remains layered **2.5D raster motion**, not a volumetric food model.
The secondary film remains a generated-still camera sequence, not AI-generated
live-action footage. No public deployment or production order/payment writes.

Local evidence page: `http://127.0.0.1:7903/review` (round 120 recordings and
checkpoint 120 stills). It links actual
2880×1800 desktop and 1170×2532 phone captures of the three scenes and later
chapters including the portrait film frame and closing brand signature, plus an actual-site MP4.
The six hero views switch atomically between Chinese and English; later chapters
and the recording remain Chinese. Failed loading preserves the previous images.
The 780×1688 phone-view recording sits beside the desktop MP4. It samples
the real 390×844 browser viewport at 2× density with original elapsed timing;
it is not physical-device footage. The two players pause each other. All 22
stills were recaptured from verified package `bfxEE4`, including six English hero
alternates. `/review/120` preserves this checkpoint; `/review/114`, `/review/111`, `/review/110`, `/review/105`
and `/review/100` retain their prior recordings.
Both desktop and phone now use the shared `record-native.mjs` capture engine
through their existing entry points. The desktop capture avoids the browser's
lossy intermediate WebM. Checkpoint 120 uses `record-motion.mjs --high-resolution`
for native 1920×1200 samples from the 1440×900 CSS viewport, not upscaled frames.
Its 767 samples span 32.45 seconds (23.64 average sample fps, 47.33ms p95 interval).
The phone recording contains 783 samples over 32.65 seconds. Higher 2× desktop
density missed the capture cadence and was not adopted. Default desktop capture
still uses 1440×900; existing checkpoints are not overwritten.
Each encoder preserves measured wall-clock frame intervals and refuses to
overwrite an existing target. Checkpoint 114's earlier desktop screencast is
retained privately, not exposed through the review media route.
Checkpoints 80, 61 and 49 remain at `/review/80`, `/review/61` and `/review/49`.
Checkpoint 35 is at `/review/35`; its screenshots
were recaptured from saved bundle `tWJ8ex`, with the original recording retained.
Review pages and allowlisted `output/website-d46-checkpoint-{35,49,61,80,100,105,110,111,114,120}/` assets are
served only by the loopback preview, never by `build.mjs`. `review-capture.mjs`
requires an explicit output directory and refuses to overwrite an existing
manifest unless `--replace` is explicitly passed.

## Previous design — D45 continuous product stage, 2026-09-10

After reviewing the three supplied website recordings, replaced the D44 opening
with a full-width red product stage. Existing transparent food assets sit in
front of oversized bilingual typography, with quieter dishes at the edges.
Three explicit selections (potstickers, chilli-oil wontons, wonton noodles) use
independently timed image, type and caption transitions. The same selected food
element moves into a closer view during ordinary page scrolling; no scroll
interception, timed dish switching, cart seeding or payment changes.

This is **layered 2.5D motion using raster cutouts**, not a reconstructed 3D food
model. D44's tilted rectangular WebGL photograph is no longer part of the page.
The existing generated-still film is retained as a secondary detail section,
not the hero. Its source and limitations below remain applicable.

- Desktop/mobile spatial poses, pointer depth, explicit arrows/selection buttons,
  horizontal touch gestures, keyboard arrows/Home/End and a motion pause control.
- Reduced-motion/save-data defaults, hidden-page/offscreen pause, lazy film loading,
  fallback posters, blocked-autoplay retry, stale image-request protection.
- Active/sold-out/name/image catalogue updates propagate to the stage. No active
  featured dishes uses the existing restaurant image; it does not invent stock.
- Low-height viewports use ordinary document flow so fixed scenes cannot trap
  controls below the viewport. Initial HTML keeps a usable static first dish.
- Original logo, approved deep red, existing ordering and admin runtime retained.

Validated package: `dumplinglab-release-2tkapF`. `stage-test.mjs` passed 27 isolated
interaction scenarios plus spatial bounds. `verify.mjs` passed 52 asset references,
33 redirect cases, 12 language states, catalogue scenarios and byte-equal ordering
runtime checks. The original ordering acceptance suite passed during assembly.
These are **not browser visual acceptance**; browser testing was requested from
the user and no answer has been received yet. No production changes/deployment.

Preview: `http://127.0.0.1:7903/?lang=zh` (retained local server).

### Browser review and fixes — 2026-09-10

The user explicitly requested Playwright/DevTools/browser inspection. The browser
plugin could not initialize its trusted browser service, so testing used installed
standalone Playwright with fresh Chrome and WebKit contexts, not the user's profile.
Both engines passed 1440×900, 390×844, 320×568 and 844×390, plus reduced-motion.
Screenshots were visually inspected at desktop/mobile opening and close-up states.
Checks cover dish selection, scrolling, language synchronization, one-line header
ordering labels, motion pause, no horizontal overflow, ordering navigation and
no reported page errors or HTTP failures. These are emulations, not physical
iPhone/WeChat tests, and do not prove the reference-level visual quality is met.

Fixed actual browser findings: language events now fire after the shared language
render (microtask/listener ordering had left stage text in the old language);
restored narrow-screen logo sizing and prevented ordering-label wrapping; hid the
duplicate order CTA during close-up so it no longer overlies the bowl; corrected
the inherited Chinese serif style and moved the desktop stamp clear of the side dish.

Evidence: `/tmp/dumplinglab-browser-review-oBPgHK/verified/` and `webkit/`, each with
screenshots and `report.json`. Regression: `browser-review.mjs` accepts an output
directory and optional `--webkit`. Validated package: `dumplinglab-release-LMQcQK`.
The page still uses flat food cutouts; spatial material/camera quality remains
below the three supplied reference videos. No deployment or production mutation.

## Previous design — D44 cinematic edition, 2026-09-10

User rejected D43. The opening is now a full-bleed food-film scene, with an
original generated macro-image sequence, large bilingual title, direct ordering,
12-second H.264 motion film and a scroll-driven Three.js perspective camera.
The 3D surface is a photograph-textured plane, **not a reconstructed 3D dumpling**.
The film is edited camera motion over two generated stills, **not AI-generated
video footage or documentary footage**. Built-in image generation was used;
the tool does not expose an `image 2.5` model selector. Exact prompts and source
provenance are in `media/PROMPTS.md`. Source PNGs remain intact.

- Desktop film: 1600 × 900, 24 fps, 12 seconds, approximately 2.55 MB.
- Mobile film: 720 × 1080, 24 fps, 12 seconds, approximately 1.68 MB.
- First-frame posters prevent the image jumping when video starts. Video is
  muted/inline, pauses offscreen and in hidden tabs, with user pause/retry.
- Reduced-motion and save-data disable automatic loading/playback. The image
  stays visible on blocked playback or WebGL failure. No scroll hijacking.
- GPU module loads only near the close-up, at capped DPR; it renders on scroll,
  pointer and resize events, not in a permanent background loop.
- The preview implements byte ranges for iOS video playback. The public build
  uses normal Vercel static media serving. No backend/cart/payment changes.

Validated combined package: `dumplinglab-release-vfx1iB`. Website checks passed:
50 asset references, 33 route cases, 12 language states, catalogue scenarios,
media references and HTTP range handling. `motion-test.mjs` passed 14 VM behavior
scenarios plus camera bounds. Original menu acceptance passed during build.
Video contact sheets inspected in `review/`; these are not browser screenshots.
Browser/GPU visual testing requested from user, not yet authorized/performed.
Local preview remains `http://127.0.0.1:7903/?lang=zh`; not deployed.

To rebuild media: `node editions/website/encode-film.mjs` (requires ffmpeg).
This encodes delivery WebP/MP4 files; it does not regenerate or alter originals.

## Previous design — D43 (rejected)

- D43 brand-led entry: the unmodified original wordmark is the masthead;
  the owner's interior reference sits alongside a deep-red (`#9c3d39`)
  signature-dumpling panel. No generic headline/plate hero. UI accents retain
  the approved `#952f2b`; logo and source artwork are not recolored or rebuilt.
- Featured food is one large red-oil wonton image and two supporting dishes:
  wonton noodles and chicken potstickers. The original dine-in/takeaway
  illustrations accompany ordering. White, steel-grey and deep-red sections
  reflect the supplied interior rather than adding new stock decoration.
- Food, space and visit sections have distinct roles. The owner's interior
  reference appears once, the frontage remains a separate location visual,
  and the footer is compact rather than a large decorative wordmark/blank area.
- Sticky desktop/mobile navigation, 44px actions, responsive food photos,
  keyboard/Escape navigation and reduced-motion rules. Responsive code has
  not yet been visually validated in a browser.
- Homepage reads the same live catalogue as ordering/admin: hide inactive
  dishes, backfill the featured selection, show sold-out labels, propagate
  name/price/image edits, and warn if catalogue refresh fails. If no featured
  dish is available, the hero shows the existing space reference instead.
- The updated 7903 preview uses the latest ordering/admin package and its own
  7904 simulated backend, including `/staff` and `/catalog-admin` clean URLs.
  Its pickup QR origin stays on 7903 via `DL_PREVIEW_ORIGIN`; it does not point
  at another preview or the live restaurant.

Validated D43 package: `dumplinglab-release-kEruDs`. Website verification passed
47 asset references, 33 route cases, 12 language states and five catalogue
scenarios per language context. Ordering/catalogue/admin shipped files remain
byte-equal to their shared source. 20 Atelier non-browser regressions passed
in `test-output/qa-2026-09-10T04-25-01.966Z/report.json` under Atelier.
The live-source local preview serves the new HTML/CSS/JS. No production writes, no browser
visual acceptance, no deployment in this turn.

## Preview and build

```
node editions/website/build.mjs
node editions/website/preview.mjs <printed-release-directory>
node editions/website/verify.mjs <printed-release-directory>
```

Preview: `http://127.0.0.1:7903/`; private loopback backend: port 7904.
The backend uses a fresh temporary data directory, not restaurant/customer data.
Never expose this development server publicly. API calls do not forward to the
production site. The service uses the existing labelled simulated payment flow.

The builder first builds and runs the existing Atelier package acceptance test,
then puts the accepted menu document at `order.html`, adds a footer home link,
and adds the homepage. Menu scripts, styles and checkout remain unchanged.
Vercel `cleanUrls` serves `/order`. It copies the existing backend, fonts, logo,
catalogue and approved food imagery without changing their source. Interior
reference is encoded into WebP; the source file is not edited. Source edits to
the website HTML/CSS/JS are served immediately by the preview, without deploying.

Root query links containing `table`, `group`, `online_order`, `preview_payment`,
or `#menu`, `#cart`, `#index`, `#table3d` reach ordering with the full query/hash preserved. Normal homepage
visits do not read, seed or clear cart storage. Homepage language travels to the
ordering route using the existing `lang` query parameter. Both surfaces use the
existing `atelier-language` preference; explicit URL language takes precedence.
Language switching works without storage when the browser blocks persistence.

## Verification recorded 2026-09-09

Exact package: `/var/folders/9g/vrhfqq3x41ndv5_1b4x2_14c0000gp/T/dumplinglab-release-dLu63O`.

- Existing menu package test passed during the combined build, before root
  reassignment. Running the old package test against the combined root is not
  appropriate: it explicitly expects the ordering document at `index.html`.
- Website integration verification passed: 43 referenced assets, 33 route
  cases, 12 language/preference render states, navigation toggle/Escape logic, current
  featured prices/photos, and byte-equal order/catalogue runtime files.
- Local HTTP: homepage, ordering and table-link routes, both restaurant images,
  and local online configuration responded successfully; hidden project binding
  was not served.
- Zero production mutations. No Stripe charge, live order or live cancellation.

## Still required before claiming completion

- Actual browser layout/interaction verification, including wide desktop,
  narrow mobile, enlarged text, and transitions into ordering. The current
  non-browser tests do not prove these visual/interaction properties.
- User-browser Pinterest references remain unavailable; no claim of reviewing
  Pins. Official restaurant source review is in `RESEARCH.md`.
- Explicit approval before publishing to the existing restaurant domain, per
  `../atelier/DEPLOYMENT.md`. Keep its Vercel project/backend; do not migrate to a
  second hosted service or promote a new homepage silently.
- Existing WeChat preselected-item report and the parked palette/footer studies
  are not fixed or published by this website edition.
