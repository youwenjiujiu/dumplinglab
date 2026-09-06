# Lunch v3: confirmed preparation options

Supersedes the three pending option decisions in LUNCH-V2-RELEASE.md.

User confirmations: soup and tossed may add noodles for S$3 per portion; tossed offers spicy / not spicy and sesame sauce / no sesame sauce; white-boiled excludes wontons. Frying remains at the table price without a surcharge.

The preparation-first selector carries extras into filling selection and dish details. Portion changes apply the noodle extra once per portion. Changing preparation clears inapplicable extras. Cart, receipts and kitchen orders retain the full selected variant. Prawn/crab-roe wonton noodles is now enabled at S$10.20 for 5 pieces and S$14.50 for 9. Independent red-oil chaoshou remains pending its own price and portion; it is not aliased to a wonton.

Catalogue version: lunch-2026-09-06-v3. Existing v2 dish IDs and 16 plain-tossed keys remain compatible at their original prices. There are 160 explicit variants plus those 16 compatibility aliases; newly selected tossed variants explicitly state spice and sesame choices. Retired v1 items remain rejected for new checkout.

## Verification before release

- lunch-test.mjs: all 202 authoritative configurations at quantities 1, 2 and 20; invalid combinations rejected.
- lunch-ui-test.mjs: table entry, anonymous root browse, and saved-name root browse; all pass. Covers first-step extras, detail toggles, clearing options, live prices, portion and quantity changes, cart labels, checkout and receipt persistence, and bilingual controls.
- table-entry-test.mjs, production-test.mjs, shared-test.mjs, walkthrough-test.mjs: passed. Covers durable draft handoff, no name gate, concurrent diners, isolated groups, retry/idempotency and authoritative totals.
- assets-test.mjs and preparation-photos-test.mjs: passed; all 68 referenced WebPs and the four coherent preparation images remain available.
- lunch-build-test.mjs: fresh allowlisted production package passed client/server catalogue agreement, syntax, assets and cache-refresh checks.
- git diff --check: passed.

These are automated DOM, HTTP, data and structural checks, not real-phone visual testing. Test orders use the local preview service; no test orders are sent to the production kitchen.

## Live release

- Runtime source commit: 7d50da7.
- Production: https://dumplinglab-menu.vercel.app/
- Deployment: https://dumplinglab-menu-orcdhq0es-youwenjiujius-projects.vercel.app
- Deployment ID: dpl_9eLZjUJkFZnEPEEA23mNycqGysEb. Vercel Ready, then successfully promoted on 2026-09-06.
- Public HTML, app.js, lunch-ui.js and lunch-menu.js match the checked release package byte for byte. Read-only production cart API reports lunch-2026-09-06-v3. Four preparation WebPs return valid image responses.
- Public HTML/JavaScript also passed the saved-name root-browse DOM suite. Mutating test requests still target the local preview, never the production kitchen.
