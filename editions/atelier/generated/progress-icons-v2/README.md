# 餐品进度图标 v2

Generated with the built-in image_gen tool; exact model identifier is not exposed. Prompts: [prompts.json](prompts.json).

Project source assets:

- /Users/youwen/dumplinglab/web/img/progress-received-v2.png
- /Users/youwen/dumplinglab/web/img/progress-preparing-v3.png
- /Users/youwen/dumplinglab/web/img/progress-ready-v2.png
- /Users/youwen/dumplinglab/web/img/progress-collected-v3.png

v3 is a local, not yet production-approved correction: elongated side-pleated jiaozi in the pot instead of round bao-like pouches, and a half-moon printed dumpling on the collected bag. Original pot/hand/bag compositions remain. Local edit prompts: preparing-v3-prompt.md and collected-v3-prompt.md. Subsequent built-in background extraction removed incorrectly painted checkerboards; alpha is validated before use. Production deployment was stopped at the user's request before any cloud publication.

Runtime uses the matching files under web/img/s/*.webp. Alpha is preserved by scripts/optimise-images.mjs; transparent pixels verified for every asset. No CSS recoloring of active art. Future stages are gray; completed stages are softened red; current stage uses full color with bilingual status text.

Actual pickupTicket renderer checked with local fixtures at 320, 390, 768px in progress-icons-browser-test.mjs. No live order, kitchen state or payment mutated. Screenshots: verified/. Pure order-progress tests preserve all four states, escaping, paid/takeaway guards and QR retirement.

The independent order-entry animation experiment is not this icon set: user requested original entry animations restored with transparent card backgrounds. See DESIGN-CORRECTIONS.md for active decisions.
