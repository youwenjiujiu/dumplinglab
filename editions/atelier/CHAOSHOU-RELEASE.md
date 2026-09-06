# Red-oil chaoshou activation — 2026-09-06

The user confirmed that red-oil chaoshou uses the ordinary wonton prices. The recommendation had incorrectly remained pending. This release enables it as its own product, not a wonton alias.

- Independent ID: `lunch-v4-red-oil-chaoshou`; catalogue version: `lunch-2026-09-06-v4`.
- Fixed red-oil preparation; 5 pieces S$5.80 or 9 pieces S$9.20.
- Only portion and quantity are selectable. No new filling, preparation, surcharge or extras inferred.
- Existing 34 product IDs and registered options remain unchanged.
- Recommendation, detail, cart, review and captured receipt retain the chaoshou name and independent ID.

## Verification

- Catalogue and authoritative checkout: 35 products, 204 configurations at three quantities; invalid chaoshou methods/portions rejected; chaoshou and wonton stay separate in the same order.
- DOM interaction tests: enabled recommendation; both portions; quantity two; add to cart; reopen detail; checkout; S$18.40 receipt for two 9-piece portions.
- Explicit-table, root guest and root named entry flows exercised against the local backend; no production kitchen orders submitted.
- Table entry, state races/idempotency, shared-table attribution, ten-diner HTTP walkthrough, image assets, filling cutaways, preparation photos and typography/profile structural checks pass.
- No real-phone or browser-pixel verification is claimed.

Production deployment verification is recorded below after promotion.
