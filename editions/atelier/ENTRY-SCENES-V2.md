# Entry scenes v2 — sit down / pack up

REJECTED after user visual review. Original v1 entry artwork restored; this
experiment is not loaded by the application or included in the release. Keep the
independent detail-page entrance animation. Do not reinstate this scene design.

Scope: the two existing order-type buttons' artwork only. Preserve native button,
bilingual label, focus, dimensions, close behavior and immediate mode selection.
No additional choice step, payment change, dependency or public deployment.

Use the skill generator as a source/packaging baseline, then custom semantic CSS
geometry in a project-local Web Component. Reuse the original SVG logo/dumpling
mark as external images/masks. No new raster or logo drawing is needed.

Shared stage: 260 × 220, responsive static scaling, no camera animation. Vermilion,
ivory, warm wood and restrained chrome reference the actual restaurant. Individual
parts have volume; the full image/button does not bounce or tilt.

Dine-in, 2400 ms:
1. 0–650 ms: chairs glide inward independently, table stays anchored.
2. 450–1050 ms: plated dumplings arrive on the tabletop.
3. 1050–2200 ms: three short wisps rise, then disappear.
4. Hold the settled, fully laid table.

Takeaway, 2700 ms:
1. 0–650 ms: dumplings settle into an open foreground box.
2. 650–1200 ms: lid closes over the dumplings, hinged at its back edge.
3. 1200–1900 ms: closed box travels into the bag, masked behind its front.
4. 1900–2500 ms: filled bag rises 6px by its handle, then settles.
5. Hold the closed bag. The receiving bag stays legible throughout.

Play once when visible on entry, including touch devices. Pointer/focus can replay.
Click never waits for motion. Respect reduced motion with the settled static scene.
Disconnect cancels work; hidden page pauses. Expose restart/play/pause/seek/progress
for inspection. No perpetual loop. Validate source/VM/build; do not claim browser
visual QA without an actual requested browser run.
