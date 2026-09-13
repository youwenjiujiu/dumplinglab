# Porcelain design preview

Preview: `http://127.0.0.1:7898/design` (run `node editions/atelier/preview.mjs`).

This is a local design proposal, not a production release. The existing `/` page and Vercel build allowlist do not load `porcelain.css`. Menu data, pricing, order logic, image assets and approved typefaces are unchanged.

## Direction

- Warm porcelain-white page, charcoal controls, restrained red accents.
- Open page sections, thin rules and consistent food-image surfaces instead of the terracotta surround.
- Shared bilingual title/translation/price rows, 44px effective small-control hit areas.
- Compact horizontal mobile tray with overlapping, scrollable thumbnails; desktop uses its existing order panel without a second floating tray.
- Matching detail, portion selection, profile and cart treatments. One-item carts use a horizontal row; multiple items retain the selectable gallery/list views.
- Existing reduced-motion behavior retained; no new decorative motion or external font/image dependencies.

## Verification

`node editions/atelier/porcelain-browser-test.mjs` runs fresh headless Chrome contexts without a user browser profile. It verifies 320, 360, 390, 430, 768 and 1440px widths in Chinese and English: row alignment, page/cart overflow, chaoshou portion/add/cart, optional profile, preparation-first extras, two-item totals and gallery/list switching. It saves screenshots to a temporary directory for inspection.

The latest run passed all six widths without page errors or external requests. Menu, desktop, dish, cart, profile, preparation and noodle screenshots were inspected. This is desktop Chrome viewport emulation, not a physical iPhone/Safari check.

The existing full DOM ordering regression also passes using `UI_SOURCE_URL=http://127.0.0.1:7898/design`, including checkout and retry recovery against the local backend. The catalogue tests pass all 204 configurations at three quantities. No production kitchen orders were sent.

## Colour directions

The user found the neutral porcelain direction too familiar. Three more distinct local-only art-direction studies are now available at `/directions`:

- `/design?palette=punch`: tomato-red header and controls, cold-pink page, dark berry text, arch-shaped image grounds.
- `/design?palette=cobalt`: full cobalt page, lemon-yellow headings/controls, circular cool-blue photo grounds, light-lemon detail sheets.
- `/design?palette=alloy`: silver-grey page, orange controls/indices, sharper rules and image frames.

`chromatic.css` is only injected for these three allowlisted query values. Unknown palettes fall back to the porcelain preview. The normal entry and production build are unchanged.

`node editions/atelier/chromatic-browser-test.mjs` passes all three palettes at 320, 390 and 1440px, in both languages. It checks row alignment, document/dialog overflow, secondary-text/action contrast (at least 4.5:1 for the tested pairs), chaoshou 9-piece selection and local draft cart. Comparison and detail screenshots were inspected. The cobalt page also passes the existing complete local DOM checkout regression. No production deployment or kitchen test order was made.
