# Detail ingredient summaries

Added 2026-09-07 at the user's request. Published to https://dumplinglab-menu.vercel.app/ with runtime commit `5b03727`.

## Source and limits

The current source is `web/lunch-menu.js`: the current menu's Chinese/English dish names, explicit filling names and offered extras. All 35 products have `ingredientInfo`. Each record declares `source: "current-menu-names"` and `completeRecipe: false`.

These summaries are **not full recipes and are not verified allergen declarations**. Existing `allergens` arrays are not changed. No recipe was inferred from generated food images, old menu descriptions or general restaurant recipes. Wrappers, sauces, fishballs and broths are named as components, not broken down into an invented subrecipe. No absence of an ingredient is treated as an absence of an allergen.

## UI

### Local follow-up: compact detail hierarchy (not deployed)

Latest visual adjustment: ingredient names use the existing brick-red accent; the small “食材” label stays muted and dish titles stay dark. Both cart empty states now use a compact receipt-style ticket; empty history directs guests back to pending dishes when any exist, otherwise to the menu. These changes remain local.

After the user reported text stacking, preset/fixed preparation now appears as a small tag next to the dish name. The large serif formula and subsequent warm inset were both rejected. Ingredients now use a compact unboxed line: a small “食材 / Ingredients” label, a short vertical divider and 14px sans-serif ingredient text. Longer lists wrap in the content column; dish-specific unknown notes sit beneath it. Two simple Chinese ingredients fit within 30px height. There are no plus signs or interactive ingredient chips. Portion selection retains its accessible fieldset legend but no visible redundant “选份量” title. Unlocked preparation and actual add-on choices remain editable. The unrelated empty-cart plate illustration has also been removed; the empty state retains its title and single menu action.

The user rejected the disclosure row. Its line, icon, chevron and interaction are now removed. The short direct advisory reads “如有食物过敏，请先告知店员。 / Please tell staff about any food allergies.” Explicit dish-specific unknowns stay visible; the underlying records still say `completeRecipe: false` and are not allergen declarations.

The ingredient list has a project-local `dl-ingredient-reveal` component in `lunch-ui.js`: 420ms reveal, 70ms stagger capped at 280ms, 5px upward settle, no loop or container movement. Only newly added ingredient keys animate on configuration changes. Portion changes do not replay the list; reduced-motion users get static text. The generate-icon-motion skill's generic package under `generated/ingredient-reveal-v1` is a baseline only; its extrusion and navigation demo are not shipped. The custom choreography is documented in its `motion-plan.json` and tested by `ingredient-motion-browser-test.mjs`.

Tests cover the preset tag, short noninteractive advisory, quantity changes, all 35 products and both languages at three widths. The previously published recipe data, prices and static-photo behavior are unchanged. These follow-up edits are local only, not yet deployed.

### Previously published behavior

- All dish and drink detail pages show “主要食材 / Main ingredients” below the dish title.
- Extra noodles, sesame sauce, spicy seasoning and soup broth update with the current configuration; removing or changing an option removes its item. A larger portion does not duplicate ingredients.
- Recommendation shortcuts use the underlying product and current options, including the wonton-noodle combination.
- Every detail retains a disclosure that the summary is not a complete ingredient list and guests should check sauces, seasonings and shared preparation areas for allergies.
- Soft drink has no invented recipe; it directs guests to the chosen drink's packaging.

## Outstanding kitchen confirmation

At the user's request, the extra “肉末种类请向店员确认。” note (and its English translation) has been removed from all three minced-meat noodle details. The ingredient is still described only as “肉末 / Minced meat”; the meat type remains unconfirmed and no recipe information was invented. The short allergy advisory remains visible. This copy change is local, not yet deployed.

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

All six size/language combinations passed. Screenshot review found long English names touching prices; English detail titles now wrap within their own column. The test checks the title/price gap and text overflow for all dishes. Initial screenshots: `/var/folders/9g/vrhfqq3x41ndv5_1b4x2_14c0000gp/T/dumpling-ingredients-vCRBVS`. Local lunch DOM, pricing, table entry, form geometry, mobile controls and release-package checks also passed.

Before deployment the user requested cancellation of dish-image rotation. Auto-yaw, drag rotation and slider semantics were removed from all detail photos. All 35 details were rechecked with normal motion settings at 320/390/768px in both languages; screenshots: `/var/folders/9g/vrhfqq3x41ndv5_1b4x2_14c0000gp/T/dumpling-ingredients-ufofmY`. The experimental sprite atlases are not included in the release. No production orders or staff calls were made.

The same 35-product browser checks passed on the public production domain after promotion, in all six size/language combinations. Production screenshots: `/var/folders/9g/vrhfqq3x41ndv5_1b4x2_14c0000gp/T/dumpling-ingredients-Givqp0`.
