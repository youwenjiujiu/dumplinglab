# Find us — one-shot ink reveal

Reference: https://www.dwijaxo.com/ (viewed 2026-09-11).
Borrow the sparse hand-drawn feeling and negative space, not its house artwork.

Scope: decorative illustration beside the existing Visit us heading. The real
storefront photo, Google Maps address and order link remain untouched. No new
section, footer, navigation behavior, loading gate or Hero changes.

Art: generate a simple storefront sketch from the existing owner-supplied facade
reference. Mechanically trace the sketch's pen centerlines to SVG; do not draw
an invented generic house. Preserve source and exact generation prompt.

Choreography (3.6 seconds):
1. Awning and upper outline, 0–1.1 s.
2. Connected frames and doorway, 0.6–2.1 s.
3. Stools, lower tile hints and ground, 1.6–3.4 s.
4. Completed drawing holds indefinitely. No bobbing, jitter loop or collapse.

Web Component, fixed-size host, no camera transforms. Progressive stroke lengths
instead of a rectangular wipe over a photograph. One playback on first visible
entry; pause while offscreen or in a hidden tab. User motion pause is respected.
Reduced-motion and unsupported animation show the complete drawing immediately.
Component failure and disabled JavaScript retain the complete inline SVG.

Check: inspect early/middle/complete frames; no layout movement; first-entry-only
behavior; pause/resume; no errors; 1440/390/320 widths; keyboard Maps link; no
additional Hero or ordering changes. The generator's generic recipe is only a
packaging baseline, not the site's final choreography.
