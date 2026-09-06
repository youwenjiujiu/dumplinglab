# Lunch revision v2 and coherent preparation assets

## Confirmed scope

Menu source: user's newest Dumpling Lab 午餐 image. Section order: 推荐 → 自选口味 → 面条 → Sides → 饮品. 34 canonical SKUs: 8 fillings, 6 noodles, 14 sides, 6 drinks. Recommendations are navigation shortcuts, not duplicate SKUs. Portions are 5 / 9 pieces. Pan-frying has NO surcharge, per explicit confirmation. Grey tomato-egg and vegetable-pork wontons are excluded.

## Pending decisions (intentionally not guessed)

- Whether soup/tossed can add noodles and at what price.
- Whether tossed offers spicy/non-spicy and sesame options.
- Whether boiled preparation extends to wontons. White-boiled picker currently includes only the five explicitly boilable dumplings.
- User explicitly distinguishes chaoshou from wontons. Red-oil chaoshou is retained as a separate disabled recommendation with no invented SKU mapping, price or portion. Prawn-roe wonton noodles is also disabled pending noodle pricing.

Pending combinations are absent from client variants AND authoritative server validation, not merely hidden with CSS. Three pending question flags are retained in LUNCH_PENDING. Existing draft IDs are retired instead of silently changing prices, fillings or 10-piece orders into 9-piece orders. Historical receipts retain their captured names/prices; lunch-archive.js provides display-only original images/styles.

## Image search before generation

User requested restaurant-image search first, then generation if not suitable. Searched general restaurant/dumpling sources plus official [Din Tai Fung](https://www.dintaifung.com.sg/menu/) and [Bafang dumpling](https://www.8way.com.tw/Product/0202), [potsticker](https://www.8way.com.tw/Product/0201), and [soup-dumpling](https://www.8way.com.tw/Product/0207) pages. No coherent directly usable quartet was found. Three Din Tai Fung image fetches timed out; no rights grant is asserted. The earlier mismatched third-party reference photos are no longer mapped to current preparation choices.

## Built-in imagegen skill

Seven single-asset calls, using the built-in tool, no API-key CLI. Four unified preparation cutouts plus missing century-egg noodles, osmanthus oolong and chicken-corn wonton assets. Source PNGs and derived WebPs live inside web/img; generated originals remain in the default generated_images folder. These are temporary generated images, NOT restaurant photographs. Five dumpling fillings currently share neutral exterior imagery appropriate to the chosen method; their specific fillings are distinguished by name. Replace with actual restaurant photos when supplied.

### Exact preparation prompts

#### soup

Workspace: web/img/preparation-soup-generated-v3.png; web/img/{s,l}/preparation-soup-generated-v3.webp

Generated images are saved to /Users/youwen/.codex/generated_images/01a06afd-3bf6-71a3-9ed7-aac11000ec00 as /Users/youwen/.codex/generated_images/01a06afd-3bf6-71a3-9ed7-aac11000ec00/exec-12018311-490f-4106-9aa1-731d5d9346e9.png by default.

```text
Use case: product-mockup. Asset: one photorealistic food cutout for a brick-red and ivory paper restaurant menu. Generate ONE image, not a collage. Genuinely transparent alpha background, no table, no room, no rectangular colored background, no text, no watermark, no branding, no utensils, no extra props. Camera 40 degrees above the front, medium product view. A single plain warm ivory ceramic vessel centered, its entire silhouette visible with 9 percent margins on all sides. Food must look natural and appetizing with realistic handmade imperfections, not plastic or glossy 3D. Soft large window light from upper left, subtle natural translucent contact shadow directly beneath vessel. Square canvas. Vessel occupies about 80 percent of canvas width; coherent understated Chinese restaurant menu photography.
Subject: a low round ivory ceramic soup bowl holding clear pale golden broth. The surface of the broth must be plainly visible, with a few very small green scallion rings and delicate tiny oil droplets. NO dumplings, NO wontons, NO chicken pieces, NO noodles, NO soup spoon. This is a cooking preparation selector for broth, not a specific finished dish.
```

#### tossed

Workspace: web/img/preparation-tossed-generated-v3.png; web/img/{s,l}/preparation-tossed-generated-v3.webp

Generated images are saved to /Users/youwen/.codex/generated_images/01a06afd-3bf6-71a3-9ed7-aac11000ec00 as /Users/youwen/.codex/generated_images/01a06afd-3bf6-71a3-9ed7-aac11000ec00/exec-870665d1-df82-4c96-8f91-5a1835fd01c5.png by default.

```text
Use case: product-mockup. Asset: one photorealistic food cutout for a brick-red and ivory paper restaurant menu. Generate ONE image, not a collage. Genuinely transparent alpha background, no table, no room, no rectangular colored background, no text, no watermark, no branding, no utensils, no extra props. Camera 40 degrees above the front, medium product view. A single plain warm ivory ceramic vessel centered, its entire silhouette visible with 9 percent margins on all sides. Food must look natural and appetizing with realistic handmade imperfections, not plastic or glossy 3D. Soft large window light from upper left, subtle natural translucent contact shadow directly beneath vessel. Square canvas. Vessel occupies about 80 percent of canvas width; coherent understated Chinese restaurant menu photography.
Subject: a shallow round ivory ceramic plate of FIVE plump handmade crescent jiaozi dumplings coated lightly in a glossy amber soy dressing with a few green scallion flecks. A little sauce clings to their pleated skins with only a shallow trace on the plate. NOT submerged, NO broth, NO red chili oil, NO sesame paste. Must clearly read as sauce-tossed dumplings rather than plain boiled ones. No wontons, no exposed filling.
```

#### boiled

Workspace: web/img/preparation-boiled-generated-v3.png; web/img/{s,l}/preparation-boiled-generated-v3.webp

Generated images are saved to /Users/youwen/.codex/generated_images/01a06afd-3bf6-71a3-9ed7-aac11000ec00 as /Users/youwen/.codex/generated_images/01a06afd-3bf6-71a3-9ed7-aac11000ec00/exec-3ac89889-95ea-4524-96ae-8fc74d528d20.png by default.

```text
Use case: product-mockup. Asset: one photorealistic food cutout for a brick-red and ivory paper restaurant menu. Generate ONE image, not a collage. Genuinely transparent alpha background, no table, no room, no rectangular colored background, no text, no watermark, no branding, no utensils, no extra props. Camera 40 degrees above the front, medium product view. A single plain warm ivory ceramic vessel centered, its entire silhouette visible with 9 percent margins on all sides. Food must look natural and appetizing with realistic handmade imperfections, not plastic or glossy 3D. Soft large window light from upper left, subtle natural translucent contact shadow directly beneath vessel. Square canvas. Vessel occupies about 80 percent of canvas width; coherent understated Chinese restaurant menu photography.
Subject: a shallow round ivory ceramic plate of FIVE plump handmade crescent jiaozi dumplings, simply boiled and drained. Soft ivory dough, natural pleats, moist satin sheen, clean plate. NO broth, NO sauce, NO fried browning, NO garnish, NO exposed filling. Must clearly read as plain boiled dumplings.
```

#### fried

Workspace: web/img/preparation-fried-generated-v3.png; web/img/{s,l}/preparation-fried-generated-v3.webp

Generated images are saved to /Users/youwen/.codex/generated_images/01a06afd-3bf6-71a3-9ed7-aac11000ec00 as /Users/youwen/.codex/generated_images/01a06afd-3bf6-71a3-9ed7-aac11000ec00/exec-dce10104-40a9-41b7-98b9-e871bf25b8c0.png by default.

```text
Use case: product-mockup. Asset: one photorealistic food cutout for a brick-red and ivory paper restaurant menu. Generate ONE image, not a collage. Genuinely transparent alpha background, no table, no room, no rectangular colored background, no text, no watermark, no branding, no utensils, no extra props. Camera 40 degrees above the front, medium product view. A single plain warm ivory ceramic vessel centered, its entire silhouette visible with 9 percent margins on all sides. Food must look natural and appetizing with realistic handmade imperfections, not plastic or glossy 3D. Soft large window light from upper left, subtle natural translucent contact shadow directly beneath vessel. Square canvas. Vessel occupies about 80 percent of canvas width; coherent understated Chinese restaurant menu photography.
Subject: a shallow round ivory ceramic plate of FIVE plump handmade crescent jiaozi dumplings, pan-fried, arranged loosely so THREE show their beautiful crisp honey-golden browned bottoms towards the camera and TWO show ivory pleated tops. Gentle irregular browning, not burned. NO sauce, NO broth, NO garnish, NO lace skirt, NO exposed filling.
```

#### century-egg-noodles

Workspace: web/img/lunch-v2-century-egg-noodles-generated-v1.png; web/img/{s,l}/lunch-v2-century-egg-noodles-generated-v1.webp

Generated images are saved to /Users/youwen/.codex/generated_images/01a06afd-3bf6-71a3-9ed7-aac11000ec00 as /Users/youwen/.codex/generated_images/01a06afd-3bf6-71a3-9ed7-aac11000ec00/exec-7a78731d-a498-402d-94c9-4caf8f77a1a6.png by default.

```text
Use case: product-mockup. A single natural photorealistic food product image for an ivory paper restaurant menu. True transparent background, no table, no backdrop color, no text, no watermark or logos, no props. Entire vessel visible, centered with 9 percent margins on square canvas. Camera 40 degrees above front, soft warm light from upper left, soft translucent contact shadow. Real food texture, not a plastic 3D rendering. A warm ivory ceramic bowl of Chinese tossed noodles topped with several distinctive dark amber and deep olive century-egg wedges and chopped green scallion. No ordinary boiled egg, no meat, no soup. Natural appetizing restrained appearance.
```

#### osmanthus-oolong

Workspace: web/img/lunch-v2-osmanthus-oolong-generated-v1.png; web/img/{s,l}/lunch-v2-osmanthus-oolong-generated-v1.webp

Generated images are saved to /Users/youwen/.codex/generated_images/01a06afd-3bf6-71a3-9ed7-aac11000ec00 as /Users/youwen/.codex/generated_images/01a06afd-3bf6-71a3-9ed7-aac11000ec00/exec-5ea4c183-491b-4145-a94b-096b49230a71.png by default.

```text
Use case: product-mockup. A single natural photorealistic food product image for an ivory paper restaurant menu. True transparent background, no table, no backdrop color, no text, no watermark or logos, no props. Entire vessel visible, centered with 9 percent margins on square canvas. Camera 40 degrees above front, soft warm light from upper left, soft translucent contact shadow. Real food texture, not a plastic 3D rendering. A single plain clear short drinking glass with golden amber osmanthus oolong tea, tiny pale gold osmanthus flowers floating at top, no lemon, no straw, no ice mountain. Transparent glass rim and reflections carefully preserved.
```

#### chicken-corn-wonton

Workspace: web/img/lunch-v2-chicken-corn-wonton-generated-v1.png; web/img/{s,l}/lunch-v2-chicken-corn-wonton-generated-v1.webp

Generated images are saved to /Users/youwen/.codex/generated_images/01a06afd-3bf6-71a3-9ed7-aac11000ec00 as /Users/youwen/.codex/generated_images/01a06afd-3bf6-71a3-9ed7-aac11000ec00/exec-53da5914-f807-4906-a431-c1a41753ff59.png by default.

```text
Use case: product-mockup. A single natural photorealistic food product image for an ivory paper restaurant menu. True transparent background, no table, no backdrop color, no text, no watermark or logos, no props. Entire vessel visible, centered with 9 percent margins on square canvas. Camera 40 degrees above front, soft warm light from upper left, soft translucent contact shadow. Real food texture, not a plastic 3D rendering. A warm ivory shallow ceramic bowl with five freshly cooked thin-skinned wontons, hand-folded with soft loose wrapper corners, distinct from pleated crescent dumplings. One modest open edge reveals a little pale minced chicken and yellow corn. No broth, no sauce, no garnish.
```

## Verification

- All 34 Chinese names/base prices checked against an independent expected list; 9-piece prices and declared pork-cutlet/chicken-wing portions checked.
- All 42 filling variants: soup 3, tossed 8, boiled/fried 5; no frying surcharge and no unconfirmed extras.
- All 68 purchasable configurations × quantities 1, 2, 20 checked through authoritative order validation; forged prices ignored and invalid combos rejected.
- Recommendations: locked preparation presets, canonical IDs, separate held chaoshou, non-orderable noodle combo, white-boiled five-filling picker. Paper menu also has all six recommendation entries.
- Browser-like DOM interactions: QR table, anonymous bare URL, saved-nickname bare URL; actual photo references, options, variant totals, add/cart, table handoff, lost-response order recovery, English/Chinese, back/forward restoration.
- Previous menu IDs rejected for new orders; stale draft cache quarantined while historical receipt names/prices persist.
- Shared state: ten diners, groups, retries, checkout races, late additions retained; simulated staff persistence and auth.
- HTTP assets: all 68 unique current WebP assets load, cache revalidation works. Alpha verified in 7 PNGs + 14 WebPs (720px conversion yields max alpha 254; transparency is preserved).
- Individual generated images visually inspected; complete tableware visible, no rectangular background or text. CSS containment keeps labels outside images.
- Actual Browser skill connection failed; troubleshooting/discovery returned no browsers. NO real phone/browser pixel-level QA claimed. No real kitchen test orders created.

## Publishing

Use the user's existing Vercel target, not Sites: https://dumplinglab-menu.vercel.app/. A fresh allowlisted release excludes unrelated dirty root/web frontend files.
