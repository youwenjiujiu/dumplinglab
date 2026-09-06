# Filling-reveal potsticker photos

User asked to cut open the two recommended potstickers so their specific fillings are visible. The recommendation's fixed preparation remains unchanged.

Built-in imagegen skill/tool used; no API/CLI fallback. Two new standalone generated assets, not restaurant photographs. Both use four whole dumplings plus two halves of a fifth dumpling, a warm ivory plate and transparent background. Original generic preparation photo is retained. No price, portion or ordering-rule changes.

## Final workspace assets

- web/img/potstickers-pork-shrimp-chive-cutaway-v1.png
- web/img/potstickers-chicken-cabbage-cutaway-v1.png
- Corresponding s/ and l/ WebPs resized/compressed with the existing optimise-images script, preserving alpha.

Recommended tiles use separate files. Canonical dishes have preparationImages.fried overrides so details and cart/receipt thumbnails use the same filling-specific image. Boiled and tossed images remain unchanged.

## Final prompts

### Pork, shrimp and chive

Generate a photorealistic restaurant food cutout with a transparent background, PNG with alpha channel. Square composition. One warm ivory ceramic plate, four whole golden pan-fried Chinese crescent dumplings and one dumpling cut into two halves at the front, both cut faces clearly visible to camera. Five dumplings before cutting, six physical pieces. Keep the ENTIRE plate and all dumplings inside the image with at least 12 percent empty transparent margins on every side, no cropping at all. Camera 40 degrees above, soft upper-left window light. Natural cooked textures, thin moist wrappers and crisp golden bottoms, highly appetizing clear filling detail at the front. The plate is opaque; only the exterior is transparent. Single isolated plate, no table, no backdrop, no background pattern, no text, no extra ingredients or garnish. Specific filling: juicy cooked minced pork, opaque pink-white shrimp pieces and chopped green Chinese chives.

### Chicken and cabbage

Generate a photorealistic restaurant food cutout with a transparent background, PNG with alpha channel. Square composition. One warm ivory ceramic plate, four whole golden pan-fried Chinese crescent dumplings and one dumpling cut into two halves at the front, both cut faces clearly visible to camera. Five dumplings before cutting, six physical pieces. Keep the ENTIRE plate and all dumplings inside the image with at least 12 percent empty transparent margins on every side, no cropping at all. Camera 40 degrees above, soft upper-left window light. Natural cooked textures, thin moist wrappers and crisp golden bottoms, highly appetizing clear filling detail at the front. The plate is opaque; only the exterior is transparent. Single isolated plate, no table, no backdrop, no background pattern, no text, no extra ingredients or garnish. Specific filling: juicy off-white cooked minced chicken and translucent pale-green chopped cabbage, visible moist chicken fibers and cabbage leaves. No shrimp, no pork, no dark-green herbs, no corn.

## Generation selection

Final originals: exec-53caf194-2562-4b9a-b3b9-76c0012ccf33.png and exec-2001a150-529c-41cd-83a9-ef19b83a8ce4.png under /Users/youwen/.codex/generated_images/01a06afd-3bf6-71a3-9ed7-aac11000ec00/. Earlier edit attempts rendered a checkerboard without alpha and were rejected, not shipped. An intermediate landscape draft was also rejected for framing. Final square outputs were visually inspected for filling distinction and full plate visibility and verified to contain genuine alpha.

## Checks

cutaway-photos-test validates two distinct mappings, real alpha in PNG and both WebP sizes, transparent corners (2/255 tolerance), opaque central plate, correct photos for every variant and unchanged fixed recommendation preparation. DOM regression covers recommended-to-detail photo continuity, both filling-specific cart images, price/quantity/checkout, and root browsing with an existing nickname. Automated checks do not constitute real-phone visual testing.

