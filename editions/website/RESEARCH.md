# Dumpling Lab — a place, not just a menu

## Current direction — D46 campaign stage

The thesis and status farther below document the earlier editorial proposal;
they are not the current implementation. The user rejected that restrained
direction and supplied three food-ad website recordings. D46 now uses generated
plate-free food cutouts, large playful bilingual display type, three explicit
scene palettes and layered 2.5D motion. Original brand and space references remain.
The generated-still detail film is not live-action footage. There is no claim of
volumetric food reconstruction or a specific unavailable image-model version.

The current source has passed repeated local Chrome/WebKit visual and interaction
checks, not physical iPhone/WeChat validation or user acceptance. See
`POLISH-LOG.md` for retained/rejected iterations and `README.md` for the current
review links. All testing remains local; production promotion is still separate.

## Scope and constraints

Build a responsive restaurant homepage and integrate the existing mobile-first ordering system on the same origin. Keep one catalogue, actual prices, existing table QR/payment return semantics, and the already approved original mode animations. Do not change active order data, Stripe integration, or archived editorial/palette experiments. Production promotion is a separate explicit approval.

The user supplied `web/brand/interior-reference.png` and `restaurant-front-20260908.webp`. Treat these as owner-provided space references, not independently verified documentary photography. Use the existing food assets, not competitor photos. Do not invent opening hours, reservation availability, phone numbers, awards, opening date, ingredient sourcing, or chef biographies.

## Reference review — 2026-09-09

Public official pages reviewed; this is a representative international sample, not an exhaustive survey of every dumpling restaurant. Text/content and image descriptions were accessible; full rendered visual inspection of these sites has not been completed.

- [Dumpling Darlings, Singapore](https://www.dumplingdarlings.com.sg/): animated brand characters, immediate booking/ordering links, menu and location sections. Lesson: keep ordering visible without making the homepage itself a checkout screen. Do not copy their characters or wording.
- [Dumpling Time, California](https://www.dumplingtime.com/about): connects the food to the restaurant's lively, modern space. Lesson: our actual spatial palette and architecture can carry the brand story; avoid borrowed claims about handmade food or sourcing.
- [Dumpling Shack, London](https://www.dumplingshack.co.uk/): named dishes, location-specific menus and practical ordering information. Lesson: the path from appetite to a relevant menu should be short.
- [Din Tai Fung, Singapore](https://www.dintaifung.com.sg/): promotional entry, brand legacy and events. Lesson: distinct content hierarchy; avoid their large promotional stack and unverifiable prestige claims.
- [Din Tai Fung UK, click & collect](https://dintaifung-uk.com/click-and-collect/): separates brand browsing from the concrete location-specific collection action.

Pinterest URL supplied by owner: `https://www.pinterest.com/search/pins/?q=dumpling%20website&rs=typed`. User browser connection attempted through the installed browser runtime; environment rejected it with `Browser use requires a trusted Node REPL browser service`. No Pinterest pins inspected; screenshots requested asynchronously. Do not substitute an unauthenticated search for the user's personal Pinterest session.

## Visual thesis

**Small folds, architectural scale.** A restaurant website built like its street frontage: a strong sign, a view into the room, then a seat at the table. Large asymmetric type and the owner's red/wood/steel interior, balanced against clean white. The real logo, food and space remain identifiable. No beige paper texture, generic luxury gold, fabricated 3D restaurant, autoplay sound, or scroll locking.

2026-09-10 continuation: food now leads the first viewport with an existing transparent plate on the owner's selected deep red. Space imagery is used once in its own section, not duplicated in the hero. The footer is shortened, with no reconstructed logo or large redundant wordmark. Existing reference assets were inspected directly; no new generated or competitor imagery was added. The shared live catalogue drives hero/featured eligibility and pricing without creating a second cart or backend.

## Required flows and verification

- Desktop and mobile homepage: food, space, visit/address, always reachable order action.
- Bilingual content and meaningful mobile navigation; keyboard-accessible links/buttons; reduced motion.
- Homepage prices and dish names derive from current `LUNCH_RECOMMENDATIONS` / `MENU`.
- `/order` uses the existing ordering interface on the same origin.
- Existing root query links (`table`, payment return, etc.) must still reach ordering with query/hash intact; no forced marketing detour for table scans.
- No duplicate basket/store, no price snapshots maintained by hand.
- Build uses an isolated output folder; original production builder/entry remain untouched until integration review.
- Test content, routes, assets, empty cart semantics, footer size, desktop/mobile layouts and language switching before claiming completion. Merchant payment flow remains the existing integration, not a test charge.

Historical proposal status: implementation was in progress and not yet visually
verified. Current D46 status and evidence are recorded at the top and in the
linked work log. Pinterest's signed-in references remain uninspected.
