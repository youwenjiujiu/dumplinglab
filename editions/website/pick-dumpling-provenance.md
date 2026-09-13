# Photo-cutout interaction — v1

Reference: existing `media/boiled-closeup-v1.webp` from this website project.
Built-in imagegen edited/reconstructed a single isolated boiled dumpling and prepared matching plate, dipping saucer and chopsticks in one sprite sheet. This is an AI-assisted image derivative, not a pixel-identical photographic extraction, and not a 3D model.

Source: `/Users/youwen/.codex/generated_images/01a08f79-e91d-7b31-81c9-d6c7d62d15ed/exec-74217233-e84c-436e-a579-943ce30f9cf0.png`.

Prompt: Extract the reference's single boiled crescent dumpling, preserving ivory translucent skin, folds and photographic texture, without chopsticks or background. Prepare a four-quadrant transparent sprite sheet: dumpling; empty ivory ceramic plate; terracotta sauce dish with dark sauce and scallion flecks; pair of dark wooden chopsticks from lower-left tips to upper-right ends. Consistent elevated tabletop camera and soft upper-left lighting. No text, grid or cartoon features.

The generator returned RGB with a checkerboard matte, not alpha. `prepare-pick-assets.mjs` mechanically crops sprites, keys neutral exterior matte, retains enclosed neutral highlights, feathers alpha and packages WebP layers. Output checked against the site's cream background. Original reference is unchanged.

Outputs: `media/pick-{dumpling,plate,sauce,chopsticks}-v1.webp`. Real alpha, reused across five clickable buttons. Native buttons support Enter/Space; Escape cancels; reduced motion skips travel; scroll-away and hidden-tab cancel cleanly. No sound, autoplay, count controls, or new ordering behavior. Hero files and markup are unchanged.

## v2 — final-page bite

The interaction now lives at `#play`, after the visit/address section. `#film` again contains the four labelled kitchen-process illustrations. The 4.1-second timeline lifts, dips, lifts clear of the sauce, then moves toward the viewer to 3.25× scale. The dumpling disappears before the chopsticks withdraw, and its button remains hidden/disabled until replay. No return-to-plate animation occurs after a completed bite. Eating all five reveals “Another plate”. Cancelled bites are restored; completed bites are preserved. Keyboard focus moves to an uneaten dumpling, then replay. Reduced motion consumes the selected dumpling without travel.
