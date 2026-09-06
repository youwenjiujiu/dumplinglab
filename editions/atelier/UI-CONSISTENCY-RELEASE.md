# English type, recommendation buttons and optional name editor

User approved continuing after identifying three inconsistencies: Georgia italic English, diagonal-arrow recommendation buttons, and the oversized optional nickname dialog.

Changes: Scto is the Latin face across existing serif stacks, with Songti retained for Chinese glyphs. English category translations, dish subtitles and paper-menu translations use upright Scto explicitly. Available recommendation action buttons show the same plus as other dish entries; clicks still open fixed-preparation/portion choices. No direct-add or preparation-unlock change.

The optional nickname dialog has one 24px heading, a single accessible input, one short helper line and a 46px Save button. It is capped at 420px with mobile gutters, 44px close control, and brick-red visible focus. Blank names remain supported; closing cancels edits; Enter saves without interfering with IME composition. Shared table-number fields are not restyled. No dish images, menu prices, SKU availability or backend rules changed.

Browser skill was used to attempt a live visual check. Browser runtime returned no browser and discovery returned an empty list after its troubleshooting steps. No real-browser/phone visual QA is claimed. Automated DOM checks cover bilingual labels, fixed preparation/portion selection, plus entries, optional-name save/clear/cancel/Enter, no order mutation, existing root entry, cart and receipt flows. ui-consistency-test checks the shipped font assets and scoped CSS rules.

## Published verification

Runtime commit 71e9f7a. Deployment dpl_DX7vdCUzGfG9McgJs5qgLPSe3kyc reached Ready and was promoted to https://dumplinglab-menu.vercel.app/ on 2026-09-06. Deployment URL: https://dumplinglab-menu-ner89iaw0-youwenjiujius-projects.vercel.app.

Public HTML, both CSS files, shared-table.js, lunch-ui.js and both Scto font files match the checked release byte for byte. Public-source saved-name DOM suite including the updated profile tests passed; all mutating test requests used local preview, not the production kitchen. All three DOM entry modes and catalogue, table-entry, concurrency, shared, walkthrough, assets, filling-photo, style and release-build regressions passed before promotion.
