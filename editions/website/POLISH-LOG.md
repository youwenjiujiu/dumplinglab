# Persistent visual polish — user request: 100 rounds, do not stop unprompted

Started 2026-09-10. This log counts a round only after a concrete change or a
distinct quality check has evidence. Re-running an unchanged screenshot does not
create a round. Planned work, generated-but-uninspected images, and passing unit
tests alone do not establish visual quality. No production deployment is authorized.

## Baseline

D45 is rejected by the user. Actual Chrome/WebKit screenshots showed a menu plate
scaled over plain type with disconnected side bowls. Reference direction is a
complete food-ad composition: bold rounded display type, plate-free appetizing
food, layered details, coherent light, and coordinated changes of scene.

## Implemented and inspected

Evidence root: `/tmp/dumplinglab-d46-review/`. These are actual local Chrome or
WebKit screenshots, not generated website mockups. The numbered rounds describe
distinct work; screenshot repetitions and individual test assertions do not count.

1. Replaced plate hero with generated crispy potstickers. Inspected source alpha,
   food shape and desktop composite. `first/1440-start.png`.
2. Added original chilli-wonton cutout; rejected noodle asset because of exposed
   filling. `first/1440-chilli.png`. No false claim that all three assets passed.
3. Replaced generic headings with Lilita / KuaiLe display pair. Inspected both
   languages; Chinese oversized type found to need adjustment.
4. Rebuilt opening layout: two-line type, central food and three flavor labels.
5. Integrated original logo/header into burgundy campaign stage. Original logo
   artwork unchanged. Phone header tested in Chinese and English.
6. Moved manual previous/next controls to edges. Narrow-width defect found in
   `first/320-start.png`; corrected in `second/320-start.png`.
7. Reserved desktop caption band; reduced CJK type and image size after overlap
   was visible. `second/1440-start.png`.
8. Moved arrows out of close-up text, retained keyboard choices and pause control.
   `second/1440-closeup.png`.
9. Rewrote CJK opening as wider four-character lines, composed phone type above
   and below food. `third/390-start.png`, `third/1440-start.png`.
10. Added separate food/type/tag timings; tags stagger independently. Browser
    selection and lifecycle tests pass. Further motion-frame review still needed.
11. Corrected mobile close-up camera to avoid clipping beneath header; compact
    320×568 composition keeps order CTA visible. `fourth/390-closeup.png` and
    `fourth/320-start.png`.
12. Subset/WOFF2 encoded display fonts: 22,784 + 10,956 bytes instead of loading
    the 1.4 MB CJK TTF. Font outlines checked in browser. Rebuild command is
    `node editions/website/build-fonts.mjs` after changes to display copy.
13. Carried display type and campaign colors through food/visit/footer.
    `sections/1440-food.png`, `sections/390-visit.png`.
14. Full-bleed restaurant scene with readable overlay and bounded camera drift.
    `sections/1440-space.png`, `sections/390-space.png`.

15. Corrected partial menu-number occlusion, first-card title inconsistency,
    mixed Chinese/Latin display shapes and a lonely final character in the visit
    heading. `recording/storyboard.jpg` shows the complete page after correction.
16. Reviewed selection at intermediate animation times and rapid input across
    Chrome/WebKit. `extended-refined/transition-620.png`; latest viewport evidence
    is in `current-chrome/` and `current-webkit/` (19 cases each, not 38 rounds).
17. Completed a truthful third-scene asset: rejected exposed-filling original
    and two baked-checkerboard repairs; fresh v2 passed real-alpha and closed
    wonton checks. `scenes/1440-noodles-v2.png`, `scenes/390-noodles-v2.png`.
18. Compared brand-red opening, dark chilli and warm-light broth as one family.
    Current palette retains red as the opening identity rather than making the
    full experience dark. `current-chrome/1920-en-opening.png`.
19. Removed translucent incoming food, delayed-label flashes and an outgoing
    ghost that could reappear at animation end. Incoming food stays opaque;
    outgoing holds its final state until removal. Scrubbed four actual WAAPI times.
20. Recomposed portrait tablets and ultra-wide displays instead of stretching
    the same desktop formula. `current-chrome/768-zh-opening.png` and 2560 cases.
21. Placed caption and CTA in flowing layout so 200% text cannot overlap them.
    Stage can grow for enlarged text. `current-chrome/320-large-text.png`.
22. Reflowed the mobile food cards at enlarged text: fixed image-driven page
    overflow using bounded auto-fit tracks. `accessibility/320-food-large-text-fixed.png`.
23. Added one restrained opening settle after image decode. It does not delay
    content, select another dish, write a cart or scroll the page. Actual sequence
    recorded in `recording-v2/dumpling-lab-browser-motion.mp4`.
24. Inspected delayed/failed hero-image loading, retained the previous food,
    offered retry and confirmed a late old image cannot replace the latest choice.
    `resilience-current-webkit/slow-loading.png` and `image-failed.png`.
25. Removed unpausable motion and no-op scene controls from no-JS fallback;
    static food and ordering links remain. `resilience-current-webkit/no-js.png`.
26. Persisted the explicit motion choice independently of cart/language state.
    Reload, blocked storage and reduced-motion behavior checked in both engines.
27. Rebuilt short landscape as left text/right food. Found a decoded-but-unpainted
    nested perspective layer; flattened the inner pose and added a pixel-difference
    assertion so DOM geometry alone cannot pass this defect. Both current matrices
    pass; `current-webkit/844-zh-opening.png` inspected after correction.

28. Damped pointer settling and elapsed-time-based scroll response. Unit checks
    confirm equal 250 ms response at 60/120 Hz and idle-loop convergence. Actual
    pointer movement, return to rest and pause pass both engines: `nav-motion/`
    and `nav-motion-webkit/`.
29. Moved tablet flavor tag clear of next arrow; added quiet section-location
    navigation and mobile outside-click/resize dismissal. Both browser checks
    above pass. Updated anchor offset follows measured header height.
30. Removed background/foreground color interpolation between light and dark
    scenes: a paused switch had briefly produced dark text over dark red.
    Atomic palette tested in `details-webkit/` (18 scene/size/language cases).
31. Removed a local CSS variable overriding the scroll rotation. The actual
    computed close-up now reaches 12 degrees; lowered desktop camera slightly to
    retain the top wonton edge. `details-webkit/1440-zh-1-detail.png` inspected.
32. Reserved the initial scroll chapter before deferred code; initialized
    language early, preloaded small display fonts and stopped duplicate desktop/
    phone video-poster downloads. Slow-network lab CLS dropped from about .68
    to .01. `loading-diagnostic/` versus `loading-reserved/`.
33. Added 800 px responsive hero encodes plus a 480 px lossless wordmark delivery
    copy; original artwork/source images remain untouched. DPR 2/3 source choice
    tested. Same simulated mobile conditions: hero LCP 7.5 s before, 3.94 s current
    (`loading-current/`). These are local lab values, not production/real-user
    metrics. Visual source/phone and full-page captures inspected.
34. Warmed future local food images only after first hero download/decode, with
    a data-saver opt-out; verified in `image-delivery/`. Added failed-module static
    fallback with no dead controls, and corrected runtime reduced-motion top gap.
    `resilience-fallback-webkit/` plus `resilience-responsive/reduced-runtime.png`.
35. Whole-page 200% text audit found photo heading/body overlap and an English
    menu heading expanding the grid. Allowed the space chapter to grow with text,
    separated its caption band, bounded grid tracks and refined the film control.
    Chrome and WebKit each reviewed 48 section cases, with no remaining reported
    copy collisions or page overflow. `sections-current-chrome/`, `sections-webkit/`.

36. Native Chromium touch dispatch found horizontal swipes being cancelled by
    default browser panning. Scoped `pan-y pinch-zoom` to the product stage and
    cancelled selection on a second touch. `touch-zoom/` verifies horizontal
    selection, native vertical scroll, direct taps and preserved pinch zoom.
37. Rebuilt the no-featured-items fallback as a static full-bleed brand scene,
    with visible heading/menu link and no tilted room image or dead food controls.
    `empty-before.png` versus `empty-390-fixed.png`; real-client cases below.
38. Real catalogue-client review exposed inactive recommendations being filtered
    out, then erroneously treated as active by the stage. Added stable dish-ID
    lookup and an authoritative-data guard. Both browsers pass empty/sold-out/
    restored/deleted states through mocked GET responses and the real client:
    `catalogue-real-client/`, `catalogue-real-client-webkit/` (12 cases each).

39. Made the localized skip link focus the main content; verified next-key access
    to ordering, including no-JS. `keyboard/` and `keyboard-webkit/` each pass
    three contexts. WebKit's macOS link-navigation key is recorded as Alt+Tab.
40. Expanded the short-window horizontal composition through 650 px height,
    bounded display type by viewport height, removed the scroll-cue/arrow
    collision and separated motion/next controls. Both extended browser reviews
    pass 23 viewport/language/text cases (`short-expanded*`).
41. Added notched-screen/home-indicator safe insets with no blank bottom panel.
    Title, caption and CTA remain separate in short landscape. Simulated CSS
    insets pass six cases each in `safe-fixed/` and `safe-fixed-webkit/`;
    this is not physical-device verification.
42. Film now changes responsive source on orientation/width changes while
    preserving playback position. Paused/offscreen videos do not download/start
    on resize. `film-resize/` and `film-resize-webkit/` verify real playback;
    removed a stale-play completion path that could pause a newer request.

43. Added restrained once-only chapter entrances and 85 ms food-card staggering.
    Cards stay opaque; unloaded-image cards stay static. Pausing/reduced motion
    reveals all content immediately, and keyboard focus cancels the relevant
    entrance. Both `chapters-opaque/` browser runs pass; 320 ms frame inspected.
44. Replaced the outgoing dish fade with viewport-aware full exit travel. The
    former 320 ms frame left a large translucent dumpling on the left; now food
    remains opaque and exits the clipped scene before removal. Evidence:
    `opaque-exit-120.png`, `opaque-exit-320.png`, `opaque-exit-520.png`.

45. Added an initial-hero failure ladder: original catalogue food photo, then a
    recomposed static type scene with no broken-image icon or empty scroll chapter.
    Selecting another dish restores its photo and controls. Chrome/WebKit each
    pass both failure paths in `hero-failure-composed*`; mobile frames inspected.

46. Enlarged narrow-phone navigation, arrows and dish-choice targets to at least
    44×44 px without enlarging the type. Six bilingual/width cases in each engine
    pass target-size and non-overlap checks (`tap-targets*`). No-JS no longer shows
    a dead language button; reduced-motion hover no longer shifts food images.

47. Reworked the arrival chapter around the owner's existing red storefront
    reference, paired with directions and ordering on desktop. Mobile gives
    address/map first, then storefront and ordering; removed duplicate mobile
    rules. `visit-front-*` frames inspected, including 200% text; `sections47/`
    WebKit whole-page review passes 48 cases without overflow/copy overlap.

48. A single available campaign dish now hides redundant carousel controls.
    Catalogue-driven removal of a focused choice moves focus to the persistent
    header ordering link without changing scroll position, including phone
    close-up mode. Both `catalogue-focus48*` real-client mock reviews pass 15 cases.

49. Scoped hero catalogue invalidation to its displayed availability/name/image
    fields. Price-only/unrelated changes still refresh the food menu, but no longer
    cancel a current scene animation or rewrite an unchanged live caption.
    `catalogue-quiet*` passes both browsers; the isolated suite now has 33 scenarios.

50. Delayed image selection may finish offscreen or in a hidden tab, but now
    updates state without starting transitions or creating an orphan exit image.
    `offscreen50*` passes both real browser engines; hidden/offscreen isolated
    cases raise the lifecycle suite to 35 scenarios. The user's chosen dish is
    still present on return.

51. Enlarged tablet navigation had overlapped the ordering action and extended
    above the header. Compact navigation now extends through 1200 px, remains
    bounded in short windows, and dismisses on width changes. `header51*` passes
    28 size/language/font cases per browser; before/after tablet frames inspected.

52. A hero taller than its viewport now uses ordinary page flow rather than
    pinning its controls below the screen. Stage/header size observation restores
    the normal close-up when space returns. Compact motion controls avoid enlarged
    tablet label collisions. `enlarged52*` passes six font/width cases per engine,
    including 150% changes that do not necessarily resize the header itself.

53. Tested the catalogue's valid 120-character names. The hero formerly grew to
    six caption lines and collided with food; its teaser now clamps to two lines
    while retaining full text in the DOM and full names in ordering. Six name/
    viewport/language cases pass per engine in `long-name53*`; phone frame inspected.

54. The scroll cue now follows the actual scene: introduction → close-up,
    close-up → film, non-enhanced/reduced-motion → menu. No-JS hides the
    nonfunctional close-up hint. Chrome/WebKit `scroll-cue54-*` pass navigation
    and language checks; reduced-motion height uses the measured header.

55. Generated and alpha-inspected a small chilli ingredient accent. Rejected
    standalone floating placement; attached a compact circular badge to the
    chilli label on spacious desktops only. Both `ingredient55*` runs pass 12
    viewport/language cases, including no unused download on phones/short windows.
    Prompt and source provenance are retained alongside the asset.

56. Failed menu photos now retain card geometry, product names and ordering links
    inside a restrained bilingual unavailable-photo tile. No unrelated substitute
    dish. Unchanged catalogue events preserve failed-tile state and keyboard
    focus; successful later image loads restore photos. `menu-photo56*` passes
    four cases per browser, and the mobile failure frame was inspected.

57. Replaced the old two-column image-size hint with actual card-width observation
    and a three-column fallback. Enlarged mobile text can request its wider photo;
    1024 px / 2× tablets now choose sufficient 720 px images. `menu-delivery57*`
    passes four cases per engine, including 200% mobile text reflow.

58. Removed the arrow background transition that briefly left cream close-up
    arrows on their outgoing cream fill. Food motion is unchanged. First-frame
    close-up checks pass all three scenes at desktop/phone widths in both engines
    (`arrow58*`); this fixes a transient contrast defect, not a permanent blank icon.

59. Replaced the fixed peach ordering-button hover with scene-specific hover
    colors, fixing cream labels on peach in the broth scene. Header and hero
    calls to action now share the treatment. `button59*` passes 18 normal/hover/
    focus combinations per engine; lowest measured label contrast is 6.37:1.

60. Replaced the generic large goodbye footer with a compact goodbye line and
    oversized campaign-type brand signature. Original header logo is unchanged.
    `footer60-current*` passes 16 width/language/text-size cases per browser plus
    a failed-display-font fallback; trailing space remains 20 px, not a blank panel.
    Actual desktop/phone compositions inspected before integration.

61. Added a single 900 ms upward reveal to the closing brand type. No looping,
    scroll lock or layout shift. Pausing cancels clipping immediately, returning
    the complete wordmark; reduced-motion stays static. Both `footer-motion61*`
    runs pass desktop/phone lifecycle checks; the 300 ms reveal frame inspected.

62. Added a 64 px favicon delivery copy of the existing red dumpling packaging
    symbol; no logo redraw. The browser title remains simply “Dumpling Lab”.
    Film/room/storefront alternative descriptions now follow the selected
    language. Local browser language checks pass and the favicon was inspected;
    release `76tzfJ` passes 54 assets / 33 routes with ordering runtime unchanged.

63. Generated a real-alpha chive ingredient trial and composed it beside the
    first scene's label. Rejected it: at 54 CSS px the thin blades read as stray
    lines, not a stronger food cue. This is a documented rejected design
    experiment, not an adopted UI change. Source/prompt are retained in
    `output/website-d46-experiments/`, outside release assets.

64. Gave the chilli close-up its own sensory headline, “红油很香，抄手很软” /
    “Silky folds. A little fire.”, instead of repeating the introductory slogan.
    Regenerated the display-font subset. Both `detail64*` reviews pass all 18
    scene/viewport/language compositions; no catalogue/order copy was changed.

65. A valid unbroken 120-character menu name previously widened the page to
    2135 px on a 320 px phone (3390 px on desktop). Cards now have shrinkable
    caption tracks, safe long-word wrapping, three primary lines and two
    secondary lines. Full DOM names, prices and stock status remain intact.
    Both `menu-name65*` reviews pass six extreme-name cases.

66. Upgraded the understated sold-out text to a compact warm-cream status badge,
    retaining full-color food photography. `stock66*` passes four local mocked
    availability cases per engine: badges stay within cards and disappear on
    restock. No inventory was changed.

67. Unified secondary UI colors: menu numbering, pricing, eyebrows and stock
    labels now use the same deep red; muted copy uses a coherent warm brown.
    The three hero scene palettes and original brand artwork are unchanged.
    Computed-color checks pass in Chrome/WebKit; the preceding 48-case whole-page
    WebKit review also passes without overflow or copy collisions (`sections65`).

68. Simplified price typography to one line: `S$5.80 起` / `From S$5.80`.
    Explicit currency-symbol browser/build assertions were added after visual
    inspection caught a missing dollar sign in the first edit. Both browsers now
    verify exact bilingual strings; the 48-case whole-page review (`sections68`),
    long-name test and live price-refresh check pass.

69. Separated explicit film playback from decorative page-motion preference.
    Playing the film no longer rewrites a saved pause or wakes the whole page;
    the global pause action still stops everything. `film-intent69*` passes both
    engines under normal/reduced motion; responsive-video playback tests and
    all 35 isolated lifecycle scenarios pass.

70. Film controls now expose a bilingual loading state while keeping pause
    available. Media play/pause/waiting/canplay events keep labels current.
    Both `film-loading70*` held-network reviews verify visible loading, cancellation
    before bytes arrive, and successful subsequent playback; isolated tests pass.

71. Dish-loading and retry feedback now appears in the visible close-up copy,
    not only the hidden introductory caption. Pending/error feedback stays in
    the chosen language; successful selection restores product copy. Interrupted
    page restoration clears stale loading. Both `closeup71*` reviews pass held/
    failed network cases on desktop and phone; 35 lifecycle tests still pass.

72. The header logo now returns to the top within the current document instead
    of reloading the homepage. Both browsers preserve selected scene and query
    language even with storage blocked; the logo's accessible label is localized.
    The integration fixture now checks localized image descriptions and logo text.

73. Compact navigation now focuses its first link without scrolling on open.
    Tab visits each link, leaving the drawer closes it, and Escape restores the
    toggle. `nav73*` passes three viewport/text-size cases in both browsers.

74. The compact drawer toggle now shows an explicit close glyph while open,
    with bilingual Open/Close labels rather than a generic toggle instruction.
    The state change is immediate; its 44 px target does not move. Both engines
    pass state/language checks; the three-case keyboard review still passes.

75. Tall phones now retain the film's portrait composition instead of cropping
    it into a near-square. The frame is capped below the header; short landscape
    layouts retain their compact frame. Six browser/width checks pass, with an
    inspected 390 px capture and a passing WebKit playback/resize regression.

76. Film progress now follows decoded frames instead of visibly jumping at the
    coarse media-event cadence. Unsupported browsers retain the old fallback;
    paused/waiting/hidden films do not keep a paint loop alive. Actual playback
    produced 28/27 updates per second in Chrome/WebKit and stopped cleanly on
    pause; all 35 isolated lifecycle scenarios pass.

77. Live catalogue refresh preserves a focused dish photo/name link without
    scrolling. If that dish disappears, focus moves to its neighboring card;
    an empty selection falls back to Full menu. `menu-focus77*` passes all four
    price/removal/empty combinations per browser using local in-memory data.

78. Once-revealed dishes no longer replay their entrance when their markup is
    replaced by a price or language update. Reveal identity follows stable dish
    IDs rather than disposable DOM nodes; genuinely new dishes remain eligible.
    Both browser checks verify zero replay animations for existing dishes.

79. Added restrained counter-parallax to the headline and flavor labels, using
    the existing bounded pointer state. They move on shallower planes opposite
    the food, rather than tracking as one flat layer. Both engines confirm the
    offsets return to zero when paused; 48 whole-page WebKit layouts and all
    35 isolated lifecycle scenarios pass. This remains 2.5D raster composition.

80. Compared a transparent cream wordmark against the existing red logo on its
    cream plaque, in actual 390/1440 px browser layouts. Rejected the alternative:
    its fine lettering lost prominence beside the heavy campaign typography and
    removed the recognizable original-red mark. Existing header retained; this
    is a rejected design experiment, not a shipped change. Trial screenshots
    are preserved in `output/website-d46-experiments/`.

81. Native chapter links now place keyboard/assistive focus in the named section
    instead of leaving it on the page body after closing compact navigation.
    Sections use negative tabindex, adding no extra Tab stops. Both engines pass
    three destinations at phone/desktop widths and continue to the chapter's links.

82. Selecting the already-visible dish no longer refetches or reannounces it.
    It also cancels a pending alternative cleanly: late image bytes cannot change
    the user's choice. Both held-network checks pass with zero redundant requests;
    all 35 isolated lifecycle scenarios still pass.

83. Softened the broth scene's lighting: warm diffuse food shadows and much
    lighter label shadows replace the dark scene's heavy halos on cream.
    Inspected phone/desktop compositions in both engines; all 18 button contrast
    checks still pass with a minimum ratio of 6.37.

84. A successfully loaded catalogue-photo fallback is retained for that exact
    failed campaign URL. Language changes no longer retry the broken asset, and
    returning to that dish works instead of failing selection. Both engines
    verify recovery without redundant requests; failure and lifecycle tests pass.

85. The close-up ordering link is now hidden until the fading chapter becomes
    interactive, so stopping mid-scroll cannot expose a visible but inert CTA.
    Phone/desktop midpoint and finished-state checks pass in both engines,
    alongside the 18-layout detail review and seven resilience scenarios.

86. Replaced broad build-directory copying with explicit production asset lists.
    Original artwork, old cinema code, full TTF sources and local reviews remain
    intact but outside new release packages; font licenses remain included.
    Verified package reduction: 1,946,671 bytes. This is deployment-package hygiene,
    not a claimed equal reduction in first-load traffic. Integration checks pass.

87. Empty featured selections now have a deliberate warm-cream editorial panel
    with accurate bilingual availability copy, rather than a loose placeholder.
    The ambiguous fixed `/ 03` chapter marker is replaced by `THE MENU / 上桌了`.
    Both engines pass 320/1440 px, bilingual, enlarged-text empty-state layouts.

88. Leaving the hero during a dish transition now cancels its running animation
    and removes the outgoing image immediately. Returning preserves the selected
    dish without replaying the entrance. Both engines verify no offscreen ghost
    or running image animation; all 35 lifecycle scenarios still pass.

89. Rebalanced the two English headline lines on tall, narrow phones. The lower
    word is now legible beneath the food; the first baseline stays put and the
    gap is capped before the product caption. `english89-final*` passes 30
    scene/width/text-size compositions per browser, including an 8 px copy gap.

90. Enlarged English scene labels exposed a real collision with the pause button
    on narrow phones. Controls now wrap within their own track; measured control
    height reserves space above them, including close-up arrows. Both engines
    pass 16 bilingual layout/click combinations, plus tap-target/reflow regressions.

91. System reduced-motion mode no longer shows a misleading Play motion button
    when that preference prevents decorative playback. Explicit film playback
    remains available. Both engines verify live preference changes, preservation
    of pause when the preference is lifted, and independent film playback.

92. Added a homepage-only catalogue reader with observable availability state.
    Early failures can no longer outrun the UI listener; a successful unchanged
    revision now clears stale warnings. Concurrent reads share one request.
    `catalog92*` passes early/late failure and recovery checks; the ordering
    application's catalogue client is untouched.

93. Added bilingual, error-only menu retry with disabled/busy feedback while the
    request is pending. Normal pages have no extra control or blank space.
    Both engines verify real clicks, duplicate suppression and successful
    recovery at 320 px. No inventory writes are involved.

94. Catalogue reads now have an 8-second abort deadline, releasing a stalled
    retry instead of waiting indefinitely. Held-response browser checks reached
    the recoverable state at 8.05/8.09 seconds and then recovered successfully.
    Built integration, 15 catalogue-state cases and focused-card refresh checks pass.

95. Active navigation retains one clear selection line instead of gaining a
    second hover underline. The language switch now declares the language of
    its own label for pronunciation. Native-pointer checks pass in both engines
    (avoiding automation's sticky-header scroll-into-view artifact).

96. Keyboard focus rings in the dark film/space chapters now use warm cream,
    replacing low-contrast dark-red outlines on those backgrounds. Both browsers
    verify actual focus-visible state and the chapter-appropriate outline color.

97. Forced-color styles preserve hamburger lines, selected-nav markers, progress
    lines and borderless button outlines. Chrome previously painted the menu
    glyph white on white; six native forced-color scene checks now pass. WebKit's
    media-query emulation was inspected but is not claimed as Windows high-contrast QA.

98. Menu retry now retains keyboard focus while busy via guarded aria-disabled
    state. Successful recovery moves focus to the nearby menu link only if the
    user is still on Retry; moving elsewhere while waiting is respected. Both
    browsers verify retained focus, duplicate suppression and no focus stealing.

99. Catalogue payloads are validated before committing any shared homepage data.
    Null entries, duplicate IDs, invalid prices, missing names and invalid revisions
    retain the last valid menu and expose recovery instead of breaking rendering.
    Both browsers pass all five malformed-payload cases and subsequent recovery
    with zero page errors or production writes.

100. Added a bilingual high-resolution review interface: all six hero views
     switch together only after every replacement decodes. Failed loading keeps
     the preceding complete group; rapid choices respect the latest intent.
     Chrome and WebKit pass 390/1440 layouts, failure/retry, original downloads,
     actual MP4 playback/seeking, no-JS fallback and preserved archives.
     Captured 22 actual-browser PNGs and an actual-site recording; captures are
     evidence for the interface, not counted as additional design rounds.

101. Homepage now consumes an automatically compiled display snapshot from the
     assembled ordering catalogue, instead of downloading its historical menu
     and variant-building scripts. Snapshot is 6,866 bytes versus 118,224 bytes
     of previous scripts (111,358 bytes removed from this uncompressed path).
     No second maintained menu: build/preview derive it from the same source;
     live catalogue GET remains authoritative. Both browsers pass bilingual
     online/offline fallback and exact data checks; WebKit passes 15 stock/menu
     scenarios. Identical local slow-network runs observed hero LCP 4.060 s
     before and 3.480 s after, with unchanged .000665 layout-shift sum. These are
     lab observations, not real-user measurements or a performance guarantee.

102. Background food-image warming now respects reported 2G/3G, low downlink
     and data-saving connections. Those visitors fetch only the selected hero;
     explicit dish selection still loads and renders normally. Chrome/WebKit
     each pass eight density/connection cases without automatic scene changes.

103. Slow-link screenshots exposed progressively painted strips of the hero
     before the complete WebP arrived. Enhanced mode now reveals only a fully
     decoded hero; typography and ordering remain visible while loading.
     Both browsers pass delayed image/module, failed module and no-JS fallback;
     WebKit failure/recovery and seven resilience cases pass. Native Chromium
     swipe, vertical scroll, tap and pinch tests still pass. Later lab reports
     distinguish hero presentation time from LCP (which can instead be text).

104. Selecting another dish before the opening finishes now skips the outgoing
     image layer unless the old image was fully decoded and presented. This
     prevents a partial opening image from appearing during the next transition.
     Both browsers pass five reveal/failure/early-selection cases; all 35
     isolated stage scenarios remain passing.

105. Brought the close-up copy in earlier to remove the almost text-free middle
     beat of the scroll transition. At 25% progress its opacity is now .50
     instead of .034; by 35% it is .963 instead of .472. Food camera geometry
     and reduced-motion poses stay unchanged. Inspected the old/new midpoint
     frames; both browsers pass 24 bilingual/scene/viewport midpoint cases,
     including link visibility matching interactivity. WebKit's 18 final-detail
     cases and the 35 isolated stage scenarios pass. Earlier copy retained.

106. The film now starts in poster/manual-play mode when the browser initially
     reports a constrained connection, not just explicit data saving. Normal
     connections retain visible-section autoplay. Both browsers pass six mocked
     connection reports, zero automatic MP4 requests on constrained links,
     explicit playback/pause and preserved global motion preference. This does
     not claim physical-network or Safari Network Information API support.

107. Unified the arrival chapter's two original dining/takeaway illustrations
     with the campaign red (#9b252d), removing the old brown-red (#983f32) from
     those homepage accents. Vector paths, original brand marks and ordering
     assets stay untouched; derivatives live only under website media. Builder
     verification reversibly checks the palette-only transformation. Chrome and
     WebKit render both at unchanged 60 px height without overflow. These
     below-fold illustrations now load lazily instead of competing at entry.

108. Removed legacy visibility cutoffs that prematurely hid the oversized title
     and flavor labels after the earlier copy timing change. Decorative layers
     now complete their continuous fade; phone metadata follows the same fade.
     Both engines pass 36 scene/language/midpoint cases and early-phase opacity
     checks. Caption/link interactivity rules remain separate and unchanged.

109. Advanced only the narrow-screen food camera so it clears the earlier
     close-up copy: movement now completes at 42% scroll progress, while desktop
     timing and both endpoint poses are unchanged. Alpha-aware food-versus-text
     checks pass 36 bilingual midpoint cases in each engine, plus 36 WebKit
     cases at 3× density. This checks actual opaque food pixels, not transparent
     image padding. The 35 isolated stage scenarios also pass.

110. Added a native-density phone motion review beside the desktop recording,
     with labeled dimensions, download links and mutually exclusive playback.
     The 390×844 phone viewport is sampled at 2× density (780×1688), not upscaled
     from a CSS-pixel screencast. 783 captured frames average 23.97 samples/sec;
     encoding retains the real 32.67-second interaction duration within .04 sec.
     Opening, close-up, film, space and footer frames were visually inspected.
     Both browsers pass phone/desktop review playback, seeking, image-language
     failure/retry and archive checks. Checkpoint 100 stills remain explicitly
     labeled; 105 is preserved. The current package lJqx7h passes verification
     with unchanged ordering runtime. This is a review-interface improvement,
     not another claimed redesign merely because a recording was made.

111. Reworked the narrow-screen handoff across varying phone heights after a
     broader sweep found 60 overlapping early-phase samples in the previous
     timing. Moving the camera alone reduced that to three, but visual review
     still showed double-exposed headings. The retained choreography now moves
     food from the first scroll beat (camera complete at .28), finishes the
     outgoing title fade at .22 and introduces detail copy from .16 to .36.
     Desktop timing and all endpoint poses are unchanged. Both browsers pass
     168 phone phase/scene/language/height cases with zero opaque food/text
     overlaps, repeated successfully at 3× WebKit density. Hidden copy is
     correctly excluded from collision reporting.
     The 36 midpoint checks and 35 state scenarios pass. Before/after phone
     frames were inspected; this is not a claim of physical WeChat testing.

112. Lifted only the wide-screen opening food to clear its actual dish-name
     text: 18 px at regular desktop widths and 44 px from 1800 px upward.
     The offset fades with the opening layers, preserving final close-up
     coordinates and every phone pose. An alpha-aware opening audit found real
     caption overlap before the change (about 33 px in the 1920 px chilli scene).
     Both browsers now pass 48 opening scene/language/viewport cases without
     food/name collisions; affected desktop cases retain at least 10 px gap.
     The corrected wide composition was inspected, and 18 final-detail cases
     still pass. Source-only food lift, no asset replacement or size reduction.
     Package `dumplinglab-release-mazV6E` verifies with unchanged ordering runtime.

113. Made opening clearance respond to actual caption wrapping. A simulated
     120-character catalogue name exposed renewed overlap despite the standard
     desktop lift. The extra line height of the name/status now offsets only
     the opening food; single-line captions and final detail poses are unchanged.
     ResizeObserver tracks text/font/viewport changes, with synchronous refresh
     on scene rendering. Both engines pass 48 long-name cases with no food/name
     collisions; WebKit also passes 48 ordinary-name cases and six full-name /
     two-line-clamp checks. The cramped-phone result was visually inspected.
     All 35 isolated stage scenarios pass; package `HEizUb` verifies without
     changing ordering runtime. All long names exist only in mocked GET data.

114. Deferred the secondary film poster until the opening food finishes decoding,
     while releasing it immediately if the visitor reaches the film first.
     Native lazy-loading alone fetched the offscreen 102 KB poster alongside
     the priority hero. The enhancement-only picture gate preserves ordinary
     no-JS and failed-module fallbacks. An isolated local 1.6 Mbps / 150 ms RTT /
     4× CPU comparison reduced the complete hero presentation from 3.47 to
     2.95 seconds without changing image quality. This is a lab comparison,
     not a physical-device speed guarantee. Both browsers pass five delayed-
     hero, early-visit, reduced-motion and fallback cases; WebKit also passes
     pause-during-loading and responsive video continuation checks. All 35
     isolated stage scenarios pass. The early-visit poster was inspected.
     The first WebKit screenshot harness waited on fonts while deliberately
     holding a hero request; the test-only pending-font wait was disabled,
     as in the existing hero failure tests. No production behavior workaround.

115. Replaced the broken-image icon exposed by a failed film poster with an
     intentional campaign-colored frame, brand wordmark and bilingual preview
     status. The existing play/retry control remains available. Successful
     playback hides the fallback; a later video failure restores it; recovery
     of the poster removes the placeholder. Both engines pass four language /
     viewport failure-playback-recovery cases. The phone fallback was visually
     inspected, all 35 isolated stage cases still pass, and the WebKit poster
     priority/fallback matrix remains intact. Package `wQbTKH` verifies with
     byte-equal ordering runtime and no production writes.

116. Preserved language on the ordering-footer return link. A fresh Chinese
     homepage visit previously returned from `/order?lang=zh` to an English
     homepage because the plain `/` link discarded the explicit preference.
     The website-only document adapter now follows the ordering document's
     public language attribute, updating both its URL and accessible label.
     This also covers context-menu/new-tab navigation and language changes
     inside ordering, without modifying cart/payment source. Both engines pass
     four initial-language / language-switch handoffs. Fresh and takeaway carts
     remain empty; all non-GET requests were blocked and none were attempted.
     Package `LgcUuF` verifies with unchanged ordering runtime.

117. Reserved intrinsic vertical room for enlarged desktop text instead of
     letting a two-line long name overlap the food. The initial combined audit
     found real collisions at 125–200% text sizes. The retained CSS minimum
     follows root-font size and caps its extra reserve; oversized scenes use
     the existing ordinary-flow guard, with no smaller food or smaller type.
     A JS/ResizeObserver height-toggle trial caused WebKit feedback warnings
     and was removed. Earlier CSS curves only covered 200% and were replaced
     after intermediate-size checks. Retained 125/150/175/200% name-clearance
     checks pass, including 200% in both engines; each matrix contains 48
     scene/language/viewport cases. WebKit passes ten enlarge/restore flow
     cases. An 18-viewport comparison with pre-change `LgcUuF` confirms identical
     normal-type stage, food and caption geometry. Package `H0cCyV` verifies;
     all 35 isolated stage cases pass. This is one layout refinement, not one
     round per font size or trial. The name-clearance audit additionally records
     top-edge cropping diagnostics; it does not claim all image/header bounds
     are clear. Stress names exist only in mocked GET data.

118. Expanded the ordering-footer return-home link to a 44px invisible touch
     target. The visible copyright stays at its original size, and no footer
     height or spacing is added. Six fresh viewport/language cases per engine
     compare the original inline layout, hit-test the expanded area and click
     outside the lettering to return in the correct language. Footer geometry
     is identical; WebKit text positioning differs only by inline subpixel
     rounding below 0.1px. Both engines also pass all four language-handoff
     cases with empty carts and zero write attempts. Package `d0QNX9` verifies
     the unchanged ordering runtime. This changes only the website adapter,
     not the ordering application.

119. Added compact fallback states for failed interior/shopfront photographs.
     WebKit previously showed a broken-image icon and a large empty photo frame.
     The interior now retains its heading, description and original caption in
     a compact dark chapter; the shopfront keeps its existing caption and an
     understated bilingual missing-photo notice. Address, map and ordering
     links remain available. Successful loads remove the fallback. Separate
     status nodes survive translation without replacing the original caption.
     Sixteen viewport/language/text-size cases per engine compare normal
     geometry against `d0QNX9`, abort both photos, change language, then restore
     the image responses. Normal and recovered section/image/text geometry is
     identical to the baseline. All 32 cases pass with no page errors or write
     attempts. Exact package `6nRpz4` verifies; 35 stage cases pass.

120. Added native navigation for partial interface-script download failure.
     Blocking `site.js` left visible but dead phone navigation/language buttons,
     an empty menu preview, and ordering links without the current language.
     Script error markers now expose ordinary chapter links and a concise menu
     fallback, hiding only the unavailable interface controls. Inline document
     initialization gives ordering links their language before the larger UI
     script arrives. A missing catalogue bootstrap exits UI setup safely.
     Each engine passes 24 combinations of viewport/language and failures of
     the UI script, bootstrap, or both UI and motion. A further 24 WebKit cases
     pass at 200% text. Native links reach ordering with empty carts and zero
     writes. Eighteen normal-geometry comparisons and six ordinary touch-target
     cases pass; 35 stage states and exact package `bfxEE4` verify. These are
     network-failure fallbacks, not a redesigned normal header.

121. Responded to the user's reference comparison with a hierarchy reduction,
     rather than adding more effects: removed the hero metadata/slogan row,
     scroll cue and numbered dish selector from the document. The two arrows
     retain wraparound, latest-intent loading and Home/End/arrow-key selection;
     focus stays on the operated control. Dish names remain in the accessible
     caption and full menu, while the visible hero uses one taste sentence.
     Removed the logo plaque, shortened navigation to Menu / Our space / Find us
     (菜单 / 店内 / 地址), softened the display colors and ingredient labels,
     removed the additional chilli badge, and made motion pause icon-only.
     Fixed the more-specific Chinese color transition so scene palettes switch
     atomically even when motion is paused. No food assets were regenerated.
     Chromium and WebKit each pass 23 responsive/interaction scenarios;
     six WebKit touch-target cases and four ordering-language/empty-cart paths
     pass. Thirty-five isolated state tests and package `l2PWJi` verify.
     Final twelve actual 2× desktop / 3× phone captures are under
     `output/website-d46-simplified-hero-v2/`; both languages and all three scenes
     are represented. The earlier `simplified-hero` capture is pre-color-fix.
     `/review/120` and the current review recording remain historical; the live
     homepage at `http://127.0.0.1:7903/?lang=zh` contains this new simplification.
     No deployment or production writes.

Completed rounds: **121** (including rejected experiments in rounds 63 and 80).
This is a recorded checkpoint, not user acceptance or a stopping condition.

### Additional verification after 111 (not extra design rounds)

- Current assembled package `dumplinglab-release-kMU6Xd`: 51 asset references,
  33 routes, 12 language variants, five catalogue states per language and
  byte-equal ordering runtime pass. Chromium's 23 broad viewport/interaction
  cases and WebKit's six enlarged-text flow cases pass.
- Eight local RAF-cadence samples (phone 3× density / desktop, normal / 4× CPU
  slowdown, selection / scrolling) showed no callback gap over 33.5 ms and no
  recorded long tasks. These are main-thread lab samples, not compositor FPS.
- A 63-selection Chromium session retained zero transition ghosts and stable
  DOM/listener counts after warm-up. GC-normalized sampling excludes GPU memory.
- Native viewport-change checks retain language/selection in both engines.
  They do not emulate physical Safari/WeChat toolbar behavior.
- A separate cacheable, read-only build fixture enabled actual Chromium
  `pageshow.persisted` restoration. Phone/desktop film position and manual
  playback intent survive; interrupted food transitions retain the selected
  dish, remove ghosts and accept the next selection. The ordinary no-store
  preview return path also passes. No production cache policy was changed.

## Current checkpoint / continuing

Additional verification through 120 (not extra design rounds): both engines
pass homepage/ordering name and displayed-price parity in Chinese and English,
including mocked price updates. The five-case film failure matrix now includes
aborted poster AND video requests, then successful manual retry. Actual
Chromium BFCache restoration of interrupted transitions still retains the
selected scene, removes ghosts and accepts subsequent navigation at phone and
desktop widths. Latest verified package is `bfxEE4`; local source continues
beyond the visual checkpoint below. No physical-device claim.

Additional 118/119 checks retain native pinch zoom and subsequent panning without
accidental dish selection (five native Chromium touch cases), plus eight viewport
changes and 48 WebKit whole-page typography cases. A trial adding low fetch
priority to menu photos did not materially improve the simulated mobile hero
timing (about 2.96 seconds in both runs) and was reverted. That experiment is
not recorded as another retained design round; image quality was never reduced.

Fresh checkpoint 120 captures and both actual browser recordings are available
under `output/website-d46-checkpoint-120/`, served by `/review` and archived at
`/review/120`. All 22 stills derive from verified bundle `bfxEE4`. Desktop uses
native 1920×1200 pixels from a 1440×900 CSS viewport (4/3 density): 767 samples
over 32.45 seconds, 23.64 average sample fps, 47.33ms p95 frame interval. Phone
uses 780×1688 pixels: 783 samples over 32.65 seconds, 23.98 average sample fps,
46.62ms p95. Both encoders preserve measured elapsed time and encode at 24fps;
these are browser samples, not physical-device frame-rate guarantees.
Both engines pass the review page's bilingual image switching/failure recovery,
video playback/seeking, mutual player pause, no-JS cards and private-path checks.
The current review was promoted only after the archive passed. The source
capture and an encoded desktop frame were visually inspected. A 2× desktop
benchmark only reached about 20fps and was rejected; 1.5× had less consistent
capture intervals. No older captures or recordings were replaced. This review
quality update is not another homepage design round.

Archived checkpoint 114 remains under `output/website-d46-checkpoint-114/` and
`/review/114`. Its 22 stills derive from verified bundle `2IQlte`; the phone
recording contains 773 real-time 2× samples over 32.64 seconds. Desktop recording
now uses native screenshot sampling (778 frames over 32.44 seconds) instead of
the visibly softer intermediate browser screencast. Both entry points share
`record-native.mjs`, preserving timing and refusing accidental replacement.
The original 114 desktop screencast remains private; previous checkpoints are
unchanged. This capture-quality improvement is not another homepage design round.
`/review/111` preserves the preceding full checkpoint.
`/review/110`, `/review/105` and `/review/100` retain their previous recordings.
The live homepage continues beyond it.
`/review/80`, `/review/61` and `/review/49`
preserve earlier checkpoints.
The older `/review/35` uses the original MP4
and screenshots recaptured from saved build `tWJ8ex`. A legacy hardcoded output
path initially refreshed those six screenshots; the capture script now requires
an explicit directory and an explicit override to replace a checkpoint. The
archived screenshot provenance is recorded in its manifest and review page.
Review pages are not included in the deployment builder. This is not user
acceptance. The user has not asked to stop; further work continues.

No production deployment, real payment, customer-order write or inventory write.
