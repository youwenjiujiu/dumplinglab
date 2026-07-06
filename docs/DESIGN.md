# Design language

Minimal · modern · warm · premium · editorial · highly visual.

## Palette (`DL` in Theme.swift)

Warm white and cream canvases; natural wood and soy-sauce browns for
structure; sesame for captions on dark; deep lacquer red reserved for the
two most important actions (order, add) and the Best Seller mark; soft
near-black ink for type. Nothing pure white, nothing pure black.

## Typography

- Serif display (`DL.display`) for dish names, chapter titles, prices —
  the editorial voice.
- System sans (`DL.text`) for functional copy.
- Wide-tracked uppercase overlines (`.overlineStyle()`) for labels like
  HANDMADE DAILY — the "menu card" voice.

## Light

One consistent studio setup everywhere: key light from the upper left,
warm radial glow behind the subject, deep soft contact shadow below it.
The `lightSweep` Metal shader drifts a warm band across hero surfaces on
a ~30s ease so nothing is ever frozen.

## Metal shaders (Shaders/DumplingLab.metal)

| Shader | Kind | Use |
|---|---|---|
| `lightSweep` | colorEffect | studio light gliding over heroes & buttons |
| `paperGrain` | colorEffect | barely-there texture on large flat fields |
| `soupRipple` | distortionEffect | broth surfaces settling |
| `steamVeil` | colorEffect | volumetric steam wisps (premultiplied) |
| `liquidGlass` | layerEffect | refracting glass panels |

All colors in SwiftUI shader effects are **premultiplied** — every shader
scales additive terms by coverage (`color.a`) to avoid halo blowout.

## Motion rules

- Springs only; nothing linear except ambient loops.
- Cards breathe (`.floating`) — 2–3 pt, ~4 s period, phase-offset per card.
- Everything tactile compresses (`TactileButtonStyle`) with a soft haptic.
- Information never arrives before the food: hero sequences end with a
  late text fade.

## Procedural food (DesignSystem/Art/DishArt.swift)

No photography. Every dish is drawn: crescent dumplings with fanned pleats,
xiao long bao with a swirled crown in a bamboo basket, bowls whose broth
ripples via shader, rice from seeded-random grains, dessert cups in glass.
Per-dish `DishPalette` (skin / accent / glow) keeps one visual language
across forty dishes.
