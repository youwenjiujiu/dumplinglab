# Architecture

Pure SwiftUI + Observation, iOS 17+. One module, no dependencies.

```
DumplingLab/
  App/            DumplingLabApp, AppState (@Observable), RootView + glass dock
  DesignSystem/   Theme (palette/type/haptics), Effects (shader & motion modifiers)
    Art/          DishArt — procedural studio renderer for every dish
    Components/   (shared visual components)
  Shaders/        DumplingLab.metal — SwiftUI shader library
  Models/         Dish, MenuSection, Nutrition, MealSet, allergens…
  Data/           MenuData — the entire menu as a single source of truth
  Features/
    Home/         Cinematic featured-dish reel
    Menu/         Editorial chaptered browse + drag-to-steamer cards
    Detail/       Dish product page + signature reveal sequence
    Assistant/    HostEngine (intent parsing + meal composition) + chat UI
    Cart/         Steamer basket cart + checkout
```

## State

`AppState` is a single `@Observable` injected via `.environment`:
tab selection, cart lines, presented dish, and the live drag session.
The dish detail is presented as a ZStack takeover in `RootView` (full
creative control over the transition, no UIKit sheet chrome).

## Drag-to-order

Menu cards attach a long-press→drag gesture that publishes a
`DragSession` (dish + global finger location) into `AppState`. `RootView`
renders the floating morsel and the bamboo drop zone in a top-level
overlay; releasing inside the drop band adds to the cart with a success
haptic and a pulse on the dock's steamer icon.

## The Host

`HostEngine` is a deterministic, on-device concierge: keyword intent
parsing (dietary restrictions, spice, party size, cravings, allergens) →
pool filtering → meal composition (`composeSet`) that always balances a
main, a vegetable/side, a soup, and optionally dessert from the filtered
pool. Restriction filters compose (vegetarian + spicy + for-two works).
Swap `HostEngine.reply` for an LLM call later without touching the UI.

## Verification hooks

`AppState.init` and `AssistantView.onAppear` read `DL_*` launch
environment variables so every screen and a full host conversation can be
driven and screenshotted from the CLI (see README).
