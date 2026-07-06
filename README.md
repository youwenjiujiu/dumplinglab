# Dumpling Lab — 扫码点餐 Table Menu

A scan-to-order web menu for the Dumpling Lab restaurant chain (Singapore).
One static site, no dependencies, no build step — every table's QR code
points at `https://<host>/?table=<n>`.

## The experience

- **The Voyage** — landing is a candle-lit room; scrolling flies a true-3D
  camera through the signature dishes, which surface from steam-fog with
  name and price. Tap the dish in focus to open it.
- **3D tile gallery** — eleven chapters of tilting, floating dish tiles
  with quantity badges, search, and dietary filters (vegetarian / spicy /
  no-pork).
- **Gaussian splat transitions** — dishes dissolve into point clouds
  sampled from their own pixels, fly as vapor between grid, dish page,
  and the steamer cart, then reassemble.
- **Dish pages** — staged reveal, calorie dial, macro bars, ingredients,
  allergens, pairings rail.
- **The Steamer** — cart drawer with kitchen notes, per-table order
  history (add-a-round), lid-closing confirmation.
- **Fully bilingual** — EN/中文 toggle, `?lang=` per-QR override,
  system-language default. Currency S$.

## Files

```
web/
  index.html      shell
  style.css       design system (warm white · cream · wood · soy · red)
  app.js          voyage, splats, tilt, cart, i18n runtime
  menu-data.js    THE menu (edit dishes/prices here)
  i18n.js         all Chinese copy + UI strings
  img/            alpha-matted dish photography
```

## Run locally

```sh
python3 -m http.server 8377 -d web
# http://localhost:8377/?table=12&lang=zh
```

## Operating notes

- **New photos**: alpha-matted PNG into `web/img/`, set `"img"` on the
  dish in `menu-data.js`. Missing photos auto-fall back to procedural art.
- **Sold out**: set `"soldOut": true` on the dish.
- **Ordering backend**: `sendOrder` in `app.js` logs the order JSON —
  point it at your POS/backend. `bellBtn` is the waiter-call hook.
- **Debug**: `#dish=<id>`, `#cart`, `#ordered`, `?vp=0..1` (voyage
  progress), `?splatslow=1` (slow-motion transitions).

The original iOS app prototype lives in git history (tag point: commit
`e622e67` and earlier) if ever needed again.
