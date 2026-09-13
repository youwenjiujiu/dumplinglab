# Add-ons reference redesign — local, not deployed

The merchant rejected the earlier generic cards and asked to follow the supplied
CHAGEE screenshots. This version follows their inline square-photo rail and
centered selection popup: artwork extending above the upper-right edge, image
left/copy right, small square selection affordances, fixed Add selected action,
and an external circular close control. Existing food cutouts and real catalogue
prices are retained. There are no fabricated discounts, limited-stock labels,
vouchers, or waiting-time values.

Preview (no payment/order API):

- http://127.0.0.1:7898/brand/addons-preview-v2.html
- http://127.0.0.1:7898/brand/addons-preview-v2.html?popup=1

The same component is integrated in the local checkout. A fresh checkout offers
the optional picker; reopening a pending payment or adding a batch does not
repeatedly prompt. Selection is tentative until Add selected. On acceptance,
checkout expires the original payable session before editing its cart, then
re-quotes one replacement checkout. A failed cancellation cannot alter the cart.
After any accepted mutation, failures return to recovery instead of offering to
apply the same selections twice. Email stays in memory only. No account, live
order, pricing, or production deployment was changed for this redesign.

Validation: 16 isolated/service/VM suites passed, including popup selection,
skip, preselection, batching, duplicate-click guards and Escape isolation. These
are not browser screenshots or physical-device/real-payment verification.

## Assets and generation

Built-in image generation was used (not CLI). Outputs were inspected and resized
to WebP without changing composition; hero alpha is preserved. Original dish
images have not been edited. New files consumed by both surfaces:

- `/Users/youwen/dumplinglab/web/brand/addon-pairing-v2.webp`
- `/Users/youwen/dumplinglab/web/brand/addon-stage-v2.webp`

### Final hero prompt

Use case: ads-marketing. Asset: high-end restaurant add-ons UI header illustration, landscape 3:2, TRANSPARENT background. Create a beautifully art-directed compact three-quarter-view composition: three golden pan-fried crescent dumplings on a small brushed stainless-steel oval plate in the foreground, behind at right a tall transparent glass of dark amber iced sour plum drink with shining clear ice and condensation, plus a pair of vermilion red chopsticks resting diagonally across the plate edge. Sophisticated softly shaded dimensional editorial illustration, meticulous smooth shapes and appetizing subtle texture, not flat icons, not childish. Polished chrome highlights, warm porcelain ivory and deep restaurant red accents, amber drink. All objects as one coherent still-life with delicate contact shadow, generous clear transparent margins. No lettering, no logos, no star decorations, no watermark. This small illustration will overlap the upper right corner of an elegant Dumpling Lab add-on popup, inspired by polished tea-brand food illustration but original subject matter. Crisp legible silhouette at 160px wide. Real transparent alpha, no checkerboard.

### Final product-stage prompt

Use case: product-mockup. Asset: reusable EMPTY photographic stage background for Dumpling Lab food add-on product cards, square image. Photorealistic editorial still-life set with NO PRODUCT placed yet. Muted warm apricot backdrop, a clean brushed stainless-steel tabletop in bottom quarter, an elegant thin low round silver serving platform centered low, front edge visible. Faint soft diagonal window light and delicate warm shadows across background, a slim deep vermilion red paper plane entering the far right edge only. Main center empty clear space to place a tall drinking glass or a small bowl later. Camera slightly above tabletop, luxurious restaurant campaign photography, restrained warm/cool contrast, natural material and directional light, beautifully composed, not generic flat beige block, no cream clay arch, no text, no logos, no plants, no food or drink, no extra dishes.
