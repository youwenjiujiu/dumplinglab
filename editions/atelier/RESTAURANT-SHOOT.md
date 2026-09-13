# Owner photography / restaurant edition — local, 2026-09-08

## Current status: archived at the owner's request

The owner subsequently requested restoring the pre-photographer dish images as well as the online visual. `index.html` no longer loads `photography.js` or `restaurant.css`. The release excludes those overrides, shoot WebPs and the storefront image. All photographer originals, imported assets, cutouts and mapping/review tools remain on disk for recovery; none were deleted. Catalogue defaults supply menu, recommendation, preparation and detail/variant images again. The approved illustrated pickup ticket and current order functionality are unchanged. Work remains local, not deployed. The following sections document the archived experiment.

The user requested both a new visual direction based on the restaurant photographs and replacement of synthetic food photos with their own shoot. Work remains on `design/atelier-interior-20260907`; no deployment is authorized by this change.

## Visual direction

Superseded at the owner's request: restore the deployed menu visual from `https://dumplinglab-menu.vercel.app/?table=A1#menu`, while explicitly preserving the approved illustrated pickup progress and real-photo cutouts. The prior white/steel experiment is backed up locally at `.local/atelier/restaurant-before-online-restore.css`.

`restaurant.css` now contains only owner-photo sizing/transparency compatibility. The menu palette, rounded surfaces, category indicators, controls, typography and chapter layout are inherited from the original styles. Removed the experimental storefront panel and restored the online theme color. `atelier.css` was verified byte-identical to the live stylesheet. Pickup visuals and their palette are independently scoped in `shared-table.css`; the preview retains the accepted receipt, steaming pot, branded white bag and seal. Modes, GST, cart and payment logic are not rolled back. No deployment performed.

## Photos and matching

`photography.js` applies presentation-only mappings after the catalogue loads. Ten dishes have been matched visually. The owner subsequently requested restoring all four original preparation illustrations (broth, tossed, boiled, fried); those are no longer replaced by shoot photos. Dish matches are provisional visual matches, not chef-confirmed recipes or serving-size declarations. All 41 supplied JPEGs have web copies with the original full frame, two resolutions, and no camera metadata. Source JPEGs are not edited; no AI retouching or background replacement is used.

Local review: `/photo-review.html`. It identifies every original photo by its four-digit filename and distinguishes trial mappings from unassigned photos. This page is excluded from the release build.

### Transparent backgrounds — owner-approved follow-up

The 11 shoot photos currently used by menu dishes/recommendations now have transparent siblings (`shoot-20260908-NNNN-cutout.png` and small/large WebP). `file()` still selects originals for the photo-review page; `menuFile()` selects reviewed cutouts. The four preparation illustrations remain untouched.

The owner explicitly approved the existing SAM workflow after a built-in image-generator trial changed food details and failed to provide alpha. That trial was rejected and is not used. `scripts/gen-cutout-sam.mjs` calls the project's existing fal SAM 3 service (not entirely local inference); `promote-sam-cutout.py` adds alpha from segmentation plus locally reviewed clipping paths where plate rims were fragmented. Every RGB pixel in the master PNG is copied unchanged from the corresponding 1440px original WebP, with no crop, retouching or food regeneration. Lossless WebP exports preserve alpha. The menu's grey tile fill is removed; geometry and prices are unchanged.

`scripts/check-shoot-cutouts.py` verifies exact original RGB, full framing, transparency and opaque food centres. White/dark edge proofs are in the ignored SAM candidate review directory and were inspected before switching references. Provider schema reference: https://fal.ai/models/fal-ai/sam-3/image/api

Awaiting the owner's mapping: especially fried-dumpling fillings (0783, 0811, 0820, 0826, 0865), soup/tossed wonton dishes, similar noodle recipes and braised meat plates. Drinks are absent from this shoot. Uncertain items retain their previous images; do not claim all synthetic images have been replaced.

Import copies with `node editions/atelier/import-shoot.mjs <original-jpg-directory> [storefront-photo]`. Review sheets can be produced with `inspect-shoot.mjs`; these are diagnostic copies only.

## Verification

`restaurant-shoot-test.mjs [release-directory]` checks mappings, image paths, web assets, unchanged business data and removal of experimental menu overrides. Existing pickup progress, online service and two-mode tests cover the preserved flow. These checks are not browser or physical-device visual acceptance. Automatic preview connection was unavailable; use the local menu URL to review.
