# Dumpling Lab — 3D kitchen film v1

An original procedural Three.js animation, not live-action footage, an AI video model output, or a still-image slideshow. No extra API key or remote generation service is required.

## Shots

| Seconds | Action |
| --- | --- |
| 0–4.5 | Rolling pin moves over an expanding wrapper |
| 4.5–7.5 | Spoon carries filling into the wrapper |
| 7.5–12 | Wrapper halves close around filling; seam develops pleats |
| 12–18 | Dumplings descend into water, with moving bubbles, splashes and steam |
| 18–23 | Skimmer carries dumplings from the pot and deposits them onto a plate |

The tools animate without a human character; this is a stylized process demonstration, not a claim to reproduce the restaurant's actual staff or kitchen.

## Rendering

`node editions/website/kitchen-3d/render.mjs` creates five review frames.

`node editions/website/kitchen-3d/render.mjs --video` exports a 1280×800, 24 fps, silent H.264 MP4 using deterministic frame rendering and FFmpeg. It refuses to overwrite the completed MP4.

Source files and review frames stay out of the public release. The website consumes only the MP4 and its WebP poster. The approved Hero, ordering app, and inventory system are not replaced by this animation.
