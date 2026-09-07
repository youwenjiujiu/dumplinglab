# Ordering modes — deployed UI, online checkout not activated

Updated 2026-09-07. Source `9b55ce7` is deployed to https://dumplinglab-menu.vercel.app/ (Vercel deployment `dpl_4PoeQds31aBkS5wvc3euxaSWvC2u`, Ready). No real payment was performed; merchant configuration still gates online checkout.

## Current experience

- Entry is a centered native dialog: dine-in, takeaway, delivery. Three red/white brand illustrations use the existing dumpling mark; delivery shows a cyclist carrying the branded bag.
- Original two-column menu-card layout is preserved.
- Header GST copy is removed. Displayed food prices remain inclusive; review/receipts break out net food, delivery, GST and final amount.
- Dine-in retains real table/group scopes. Remote carts never create fake tables.
- The user's latest pickup request supersedes CanCan-style advance reservations: no name, phone, date or slot for new takeaway orders. A single configured store goes directly to authoritative order review; multiple stores require choosing the pickup location.
- Only verified payment confirmation allocates a daily A001-style pickup number and random pickup credential. A centered ticket appears immediately, and the ticket remains in order history.
- Number allocation uses compare-and-swap and a per-order daily allocation map. Concurrent callbacks and retries keep the same final credential.
- Pickup QR links to the staff page with a separate random credential in the URL fragment. It does not contain customer data or the private order-access token. The fragment is removed from the address bar after capture.
- Production pickup inspection and collection require staff authentication. A scan only inspects; staff must explicitly confirm handover. Collected orders cannot be presented as new pickups on rescan.
- Preview has explicitly simulated payment, test pickup address and loopback-only staff routes. Nothing is sent to a real kitchen or payment provider.
- Existing historical orders are preserved; no repricing or silent migration of prior bookings.

## Delivery rules / remaining business confirmation

User requested following https://can-can.sg/ and explicitly confirmed a 9% delivery fee plus GST on dishes. Current implementation uses a 10 km straight-line postcode radius, next-day booking, 21:00 Singapore cutoff, and slots 11:30–12:30, 12:30–13:30, 13:30–14:30, 17:00–18:00. The current $100 minimum is food before tax/fees; CanCan's deployed bundle checked final total. Confirm this distinction and actual operating rules before activation. No automatic courier dispatch is integrated.

## Production activation still blocked on merchant configuration

- Merchant's own STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET.
- HTTPS DL_ORDER_ORIGIN and correctly routed signed webhook.
- Actual DL_PICKUP_LOCATIONS; never substitute CanCan locations without confirmation.
- GST registration confirmation / DL_GST_REGISTERED=true.
- For delivery: GOOGLE_MAPS_API_KEY, DL_DELIVERY_ORIGIN_POSTAL and actual delivery operations.

Checkout fails closed when configuration is absent. Do not copy credentials from unrelated projects, label browser simulations as paid production orders, or claim real Stripe/payment/courier/iPhone testing.

## Verification

- entry-brand-browser-test.mjs: centered three-option dialog, artwork loaded, three mode actions, no header GST; 320/390/724 px, Chinese/English.
- fulfilment-browser-test.mjs: immediate form-free pickup review, GST, simulated payment, ticket display, history persistence; delivery validation, refresh-safe retry; 320/390/768 px, Chinese/English.
- online-service-test.mjs: authoritative prices, unpaid exclusion, privacy, signed webhook, concurrent pickup numbering, stable retry credentials, staff-auth gate, explicit collection, delivery validation.
- pickup-staff-browser-test.mjs + decode-pickup-qr.swift: Apple's independent Vision QR decode, staff inspection, explicit collection, duplicate scan prevention.
- Menu layout and existing form/keyboard regressions pass. Keyboard coverage is simulated, not a physical iPhone.
- Release build includes the new APIs, assets and QR dependency. Production checks matched the exact frontend source and all six entry/header illustrations; no preview banner is present. `/api/online` reports `preview: false`, `takeawayEnabled: false`, `deliveryEnabled: false`. Anonymous staff-feed and pickup requests return 401. These checks created no orders or payments.

QR generation uses the maintained node-qrcode package, pinned to 1.5.4: https://github.com/soldair/node-qrcode
