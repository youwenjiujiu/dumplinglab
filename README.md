# Dumpling Lab

A premium interactive dining experience for iOS — a modern Chinese dumpling
house rendered as something between Apple, Vision Pro, Airbnb, and a
Michelin-star restaurant.

Built entirely in SwiftUI with custom Metal shaders. No external dependencies,
no network calls, no image assets — every dish is drawn procedurally.

## Running

Open `DumplingLab.xcodeproj` in Xcode 16+ and run on an iOS 17+ device or
simulator (iPhone 16 Pro recommended).

```sh
xcodebuild -project DumplingLab.xcodeproj -scheme DumplingLab \
  -destination 'platform=iOS Simulator,name=iPhone 16 Pro' build
```

## The experience

- **The Table** — a cinematic opening reel. Steam rises off studio-lit
  dishes, a warm key light glides across them, the camera breathes. Swipe
  through the kitchen's proudest plates.
- **The Menu** — eleven editorial chapters. Cards float at rest, parallax on
  scroll, and can be *picked up* (long-press) and physically carried into a
  bamboo drop zone to order.
- **Dish pages** — each dish opens with a signature sequence: it drifts in,
  the camera leans closer, the dumpling parts and its filling glistens
  through, steam escapes — then, and only then, the information fades in.
  Nutrition is drawn as a calorie dial and hand-tinted macro bars.
- **The Host** — a conversational concierge that knows the menu the way a
  maître d' does. "Two people, something spicy, my partner is vegetarian"
  gets a composed, restriction-safe tasting set with one tap to add it all.
- **The Steamer** — the cart is a bamboo steamer basket. Your order sits
  inside it, steaming, until you send it to the kitchen and the lid closes.

See `docs/DESIGN.md` for the design language and `docs/ARCHITECTURE.md` for
how the project is put together.

## Dev hooks

Launch-environment variables (used for CLI-driven verification):

| Variable | Effect |
|---|---|
| `DL_TAB` | Open on a tab: `Table`, `Menu`, `Host`, `Steamer` |
| `DL_DISH` | Open a dish page by id, e.g. `black-pork-panfried` |
| `DL_FILL_CART` | `1` seeds the steamer with a sample order |
| `DL_HOST_QUERY` | Auto-sends a message to the Host on launch |
