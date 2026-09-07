# Detail ingredient summaries

Added 2026-09-07 at the user's request. Local changes; not deployed.

## Source and limits

The current source is `web/lunch-menu.js`: the current menu's Chinese/English dish names, explicit filling names and offered extras. All 35 products have `ingredientInfo`. Each record declares `source: "current-menu-names"` and `completeRecipe: false`.

These summaries are **not full recipes and are not verified allergen declarations**. Existing `allergens` arrays are not changed. No recipe was inferred from generated food images, old menu descriptions or general restaurant recipes. Wrappers, sauces, fishballs and broths are named as components, not broken down into an invented subrecipe. No absence of an ingredient is treated as an absence of an allergen.

## UI

- All dish and drink detail pages show “主要食材 / Main ingredients” below the dish title.
- Extra noodles, sesame sauce, spicy seasoning and soup broth update with the current configuration; removing or changing an option removes its item. A larger portion does not duplicate ingredients.
- Recommendation shortcuts use the underlying product and current options, including the wonton-noodle combination.
- Every detail retains a disclosure that the summary is not a complete ingredient list and guests should check sauces, seasonings and shared preparation areas for allergies.
- Soft drink has no invented recipe; it directs guests to the chosen drink's packaging.

## Outstanding kitchen confirmation

| Product / scope | Missing information |
| --- | --- |
| All prepared dishes | Complete recipe, sauce/seasoning subingredients, cooking oils and allergen/cross-contact information |
| Three minced-meat noodles | Type of meat; never silently assume pork from the generated image |
| Red-oil chaoshou | Filling ingredients; not assumed equivalent to another wonton product |
| Shredded vegetable salad | Specific vegetables |
| Hot-oil noodles / century-egg noodles | Other toppings and seasoning recipe |
| Broths / braising liquids / fishballs / wrappers | Actual component recipes |
| Drinks | Brand/variant, tea/barley variety, sweeteners, concentrates and other additives where applicable |

Kitchen data can replace the summary record when supplied. Do not change `completeRecipe` to true merely because every detail has a visible section.

## Verification

`ingredients-browser-test.mjs` checks all 35 detail pages at 320/390/768px in both languages, explicit uncertainty notes, recommendation extras, live ingredient updates, portion stability, language changes and text overflow. Existing lunch/checkout tests cover unchanged IDs, all prices and option validity. Browser tests do not verify recipe truth.

All six size/language combinations passed. Screenshot review found long English names touching prices; English detail titles now wrap within their own column. The test checks the title/price gap and text overflow for all dishes. Final screenshots: `/var/folders/9g/vrhfqq3x41ndv5_1b4x2_14c0000gp/T/dumpling-ingredients-vCRBVS`. Local lunch DOM, pricing, table entry, form geometry, mobile controls and release-package checks also passed. No production deployment or orders were made.
