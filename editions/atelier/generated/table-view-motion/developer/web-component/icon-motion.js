const DEFAULTS = Object.freeze({"mode": "generic", "recipe": null, "scope": "icon", "durationMs": 5000, "inlineStart": 0.2, "label": "本桌", "resultLabel": null, "secondaryLabel": "History", "tertiaryLabel": "Check", "colors": {"accent": "#983f32", "light": "#f5efe3", "background": "#F0EEE8", "bar": "#090909", "foreground": "#E4E1D9", "muted": "#706D66", "shadow": "rgba(38,34,27,.42)"}});
const MOTION_CSS = ":host {\n      --stage-size: 1080px;\n      --duration: 5000ms;\n      --motion-delay: 0ms;\n      --motion-state: running;\n      --motion-iterations: infinite;\n      --background: #F0EEE8;\n      --bar: #090909;\n      --foreground: #E4E1D9;\n      --muted: #706D66;\n      --accent: #983f32;\n      --light: #f5efe3;\n      --shadow: rgba(38,34,27,.42);\n      --ease: cubic-bezier(.22,.72,.18,1);\n      --ease-soft: cubic-bezier(.33,.05,.18,1);\n      --ease-off: cubic-bezier(.55,.02,.82,.32);\n      --ease-fold: cubic-bezier(.42,0,.58,1);\n    }\n\n    * { box-sizing: border-box; }\n\n    html, body {\n      width: 100%;\n      min-height: 100%;\n      margin: 0;\n      background: #181818;\n    }\n\n    body {\n      display: grid;\n      place-items: center;\n      overflow: auto;\n      font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif;\n    }\n\n    .stage {\n      position: relative;\n      width: var(--stage-size);\n      height: var(--stage-size);\n      overflow: hidden;\n      background:\n        radial-gradient(circle at 48% 44%, rgba(255,255,255,.72), transparent 45%),\n        var(--background);\n      isolation: isolate;\n    }\n\n    .ambient {\n      position: absolute;\n      inset: 0;\n      background: linear-gradient(135deg, rgba(255,255,255,.20), transparent 42%);\n      pointer-events: none;\n    }\n\n    .anim {\n      animation-duration: var(--duration);\n      animation-iteration-count: var(--motion-iterations);\n      animation-fill-mode: both;\n      animation-delay: var(--motion-delay);\n      animation-play-state: var(--motion-state);\n    }\n\n    .nav-camera {\n      position: absolute;\n      left: 30%;\n      top: 33%;\n      width: 100%;\n      height: 34%;\n      animation-name: camera;\n      transform-origin: 21.5% 50%;\n      will-change: transform;\n    }\n\n    .nav {\n      position: absolute;\n      inset: 0;\n      display: grid;\n      grid-template-columns: repeat(3, calc(var(--stage-size) * .237));\n      justify-content: start;\n      align-items: center;\n      padding: 2.4% 2.5% 2.4% calc(var(--stage-size) * .096);\n      border-radius: calc(var(--stage-size) * .102);\n      background: var(--bar);\n      box-shadow:\n        0 calc(var(--stage-size) * .038) calc(var(--stage-size) * .065) var(--shadow),\n        inset 0 1px 0 rgba(255,255,255,.04);\n    }\n\n    .nav-item {\n      min-width: 0;\n      height: 82%;\n      display: flex;\n      flex-direction: column;\n      align-items: center;\n      justify-content: center;\n      gap: calc(var(--stage-size) * .008);\n      color: var(--muted);\n    }\n\n    .nav-item.inactive {\n      animation-name: defocus;\n      will-change: filter, opacity;\n    }\n\n    .nav-item.inactive .icon-shell {\n      width: calc(var(--stage-size) * .112);\n      height: calc(var(--stage-size) * .112);\n    }\n\n    .icon-shell {\n      position: relative;\n      width: calc(var(--stage-size) * .128);\n      height: calc(var(--stage-size) * .128);\n      display: grid;\n      place-items: center;\n    }\n\n    .icon-shell > svg {\n      position: absolute;\n      width: 100%;\n      height: 100%;\n      overflow: visible;\n    }\n\n    .mode-house .nav-item.active .icon-shell > svg,\n    .mode-generic .nav-item.active .icon-shell > svg {\n      width: 210%;\n      height: 210%;\n    }\n\n    .mode-semantic .nav-camera {\n      left: 35.9722%;\n      top: 45.6944%;\n      width: 28.0556%;\n      height: 8.6111%;\n      animation-name: semantic-production-camera;\n      transform-origin: center;\n    }\n\n    .mode-semantic .nav {\n      display: block;\n      padding: 0;\n      border-radius: 0;\n      background: transparent;\n      box-shadow: none;\n    }\n\n    .mode-semantic .nav-item.active {\n      position: absolute;\n      inset: 0;\n      width: 100%;\n      height: 100%;\n      display: grid;\n      place-items: center;\n    }\n\n    .mode-semantic .nav-item.inactive,\n    .mode-semantic .nav-item.active > .label {\n      display: none;\n    }\n\n    .mode-semantic .icon-shell {\n      position: absolute;\n      inset: 0;\n      width: auto;\n      height: auto;\n    }\n\n    .mode-semantic .nav-item.active .icon-shell > svg {\n      width: 100%;\n      height: 100%;\n    }\n\n    .mode-semantic-delete .nav-camera {\n      left: 35.9722%;\n      top: 45.6944%;\n      width: 28.0556%;\n      height: 8.6111%;\n    }\n\n    .mode-semantic-search .nav-camera {\n      left: 32.6389%;\n      top: 45.6944%;\n      width: 34.7222%;\n      height: 8.6111%;\n    }\n\n    @keyframes semantic-production-camera {\n      0%, 100% {\n        transform: translate3d(0,0,0) scale(1) rotate(0) skew(0);\n      }\n    }\n\n    .label {\n      color: currentColor;\n      font-size: calc(var(--stage-size) * .0365);\n      font-weight: 440;\n      line-height: 1;\n      letter-spacing: -.02em;\n      white-space: nowrap;\n    }\n\n    .nav-item.active .label {\n      animation-name: active-label;\n      color: #858179;\n    }\n\n    .icon-shell > svg.history-icon {\n      width: 100%;\n      height: 100%;\n      color: var(--muted);\n    }\n\n    .icon-shell > svg.check-icon {\n      width: 70%;\n      height: 70%;\n      color: var(--accent);\n    }\n\n    @keyframes camera {\n      0%, 8% { transform: translate3d(0,0,0) scale(1); }\n      8% { animation-timing-function: var(--ease); }\n      23%, 76% { transform: translate3d(0,0,0) scale(1.8); }\n      76% { animation-timing-function: var(--ease); }\n      90%, 100% { transform: translate3d(0,0,0) scale(1); }\n    }\n\n    @keyframes defocus {\n      0%, 9%, 89%, 100% { filter: blur(0); opacity: 1; }\n      9% { animation-timing-function: var(--ease-soft); }\n      23%, 76% { filter: blur(calc(var(--stage-size) * .0038)); opacity: .58; }\n      76% { animation-timing-function: var(--ease-soft); }\n    }\n\n    @keyframes active-label {\n      0%, 20%, 80%, 100% { color: #77736c; }\n      35%, 65% { color: #a09c93; }\n    }\n\n    /* House template */\n    .flat-house {\n      fill: #706c64;\n      transform-box: fill-box;\n      transform-origin: center;\n      animation-name: flat-house;\n    }\n\n    .house-assembly,\n    .house-lighting {\n      transform: translate(-15px,0);\n      transform-box: fill-box;\n    }\n\n    .house-front {\n      fill: #c9c6bf;\n      animation-name: house-front;\n      transform-box: fill-box;\n      transform-origin: center bottom;\n    }\n\n    .house-side {\n      fill: #211f1d;\n      animation-name: house-side;\n      transform-box: fill-box;\n      transform-origin: right center;\n      will-change: transform;\n    }\n\n    .house-roof {\n      fill: #efede8;\n      animation-name: house-roof;\n      transform-box: fill-box;\n      will-change: clip-path;\n    }\n\n    .roof-line {\n      fill: none;\n      stroke: #faf9f5;\n      stroke-width: 3;\n      stroke-linecap: round;\n      stroke-dasharray: 54;\n      animation-name: roof-line;\n      will-change: stroke-dashoffset, opacity;\n    }\n\n    .door {\n      fill: var(--bar);\n      animation-name: doorway;\n      transform-box: fill-box;\n      transform-origin: center bottom;\n      will-change: transform;\n    }\n\n    .porthole {\n      fill: var(--bar);\n      animation-name: porthole;\n      transform-box: fill-box;\n      transform-origin: center;\n      will-change: transform;\n    }\n\n    .porthole-light {\n      fill: var(--light);\n      animation-name: porthole-light;\n      transform-box: fill-box;\n      transform-origin: center;\n      will-change: transform, opacity;\n    }\n\n    .side-window {\n      fill: #0e0e0d;\n      animation-name: side-window;\n      transform-box: fill-box;\n      transform-origin: right center;\n      will-change: transform;\n    }\n\n    .light-beam {\n      fill: url(#beamGradient);\n      animation-name: light-beam;\n      transform-box: fill-box;\n      transform-origin: right center;\n      mix-blend-mode: normal;\n      will-change: transform, opacity;\n    }\n\n    .light-underfold {\n      fill: url(#beamGradient);\n      animation-name: light-underfold;\n      transform-box: fill-box;\n      transform-origin: right center;\n      mix-blend-mode: screen;\n      will-change: transform, opacity;\n    }\n\n    .beam-hot {\n      stop-color: color-mix(in srgb, var(--light), #8a290b 55%);\n    }\n\n    .beam-mid {\n      stop-color: color-mix(in srgb, var(--light), #541700 70%);\n    }\n\n    .beam-tail {\n      stop-color: color-mix(in srgb, var(--light), #271100 82%);\n    }\n\n    .generic-beam-hot {\n      stop-color: color-mix(in srgb, var(--light), #8f6500 32%);\n    }\n\n    .generic-beam-mid {\n      stop-color: color-mix(in srgb, var(--light), #000 52%);\n    }\n\n    .generic-beam-tail {\n      stop-color: color-mix(in srgb, var(--light), #000 72%);\n    }\n\n    .light-cube {\n      animation-name: light-cube;\n      transform-box: fill-box;\n      transform-origin: right center;\n      will-change: transform;\n    }\n\n    .light-cube-side {\n      fill: var(--light);\n    }\n\n    @keyframes flat-house {\n      0%, 20% {\n        opacity: 1;\n        fill: #706c64;\n        transform: translate(0,0) scale(1);\n      }\n      20% { animation-timing-function: var(--ease); }\n      25.5% {\n        opacity: 1;\n        fill: #aaa79f;\n        transform: translate(11px,2px) scale(1.05);\n      }\n      28% {\n        opacity: 1;\n        fill: #c9c6bf;\n        transform: translate(11px,2px) scale(1.05);\n      }\n      28.01%, 74.99% {\n        opacity: 0;\n        fill: #c9c6bf;\n        transform: translate(11px,2px) scale(1.05);\n      }\n      75% {\n        opacity: 1;\n        fill: #c9c6bf;\n        transform: translate(11px,2px) scale(1.05);\n      }\n      77% {\n        opacity: 1;\n        fill: #c9c6bf;\n        transform: translate(11px,2px) scale(1.05);\n        animation-timing-function: var(--ease);\n      }\n      84%, 100% {\n        opacity: 1;\n        fill: #706c64;\n        transform: translate(0,0) scale(1);\n      }\n    }\n\n    @keyframes house-front {\n      0%, 27.99% { opacity: 0; }\n      28%, 74.99% { opacity: 1; }\n      75%, 100% { opacity: 0; }\n    }\n\n    @keyframes house-side {\n      0%, 25% { opacity: 1; transform: scaleX(0); }\n      25% { animation-timing-function: var(--ease); }\n      31%, 69% { opacity: 1; transform: scaleX(1); }\n      69% { animation-timing-function: var(--ease-fold); }\n      76%, 100% { opacity: 1; transform: scaleX(0); }\n    }\n\n    @keyframes house-roof {\n      0%, 23.5% {\n        opacity: 1;\n        clip-path: polygon(50% 100%,100% 46%,100% 46%,50% 100%);\n      }\n      23.5% {\n        animation-timing-function: var(--ease);\n      }\n      28.5%, 69% {\n        opacity: 1;\n        clip-path: polygon(0 54%,49% 0,100% 46%,50% 100%);\n      }\n      69% { animation-timing-function: var(--ease-fold); }\n      76%, 100% {\n        opacity: 1;\n        clip-path: polygon(50% 100%,100% 46%,100% 46%,50% 100%);\n      }\n    }\n\n    @keyframes roof-line {\n      0%, 21.5% { opacity: 0; stroke-dashoffset: 54; }\n      21.5% { animation-timing-function: var(--ease); }\n      24.5%, 27% { opacity: 1; stroke-dashoffset: 0; }\n      29%, 72.5% { opacity: 0; stroke-dashoffset: 0; }\n      72.5% { animation-timing-function: var(--ease); }\n      74.5%, 75.5% { opacity: 1; stroke-dashoffset: 0; }\n      77%, 100% { opacity: 0; stroke-dashoffset: 54; }\n    }\n\n    @keyframes doorway {\n      0%, 25.5% { transform: scaleY(0); opacity: 1; }\n      25.5% { animation-timing-function: var(--ease); }\n      31%, 69.5% { transform: scaleY(1); opacity: 1; }\n      69.5% { animation-timing-function: var(--ease-fold); }\n      75%, 100% { transform: scaleY(0); opacity: 1; }\n    }\n\n    @keyframes porthole {\n      0%, 24.5% { transform: scale(0); opacity: 1; }\n      24.5% { animation-timing-function: var(--ease); }\n      29.5%, 68% { transform: scale(1); opacity: 1; }\n      68% { animation-timing-function: var(--ease-fold); }\n      74.5%, 100% { transform: scale(0); opacity: 1; }\n    }\n\n    @keyframes porthole-light {\n      0%, 28% { transform: translateX(-5px) scale(.1); opacity: 0; }\n      28% { animation-timing-function: var(--ease); }\n      33.5%, 64% { transform: translateX(0) scale(1); opacity: 1; }\n      64% { animation-timing-function: var(--ease-fold); }\n      70%, 100% { transform: translateX(-5px) scale(.1); opacity: 0; }\n    }\n\n    @keyframes side-window {\n      0%, 27% { opacity: 1; transform: scaleX(0); }\n      27% { animation-timing-function: var(--ease); }\n      31%, 70% { opacity: 1; transform: scaleX(1); }\n      70% { animation-timing-function: var(--ease-fold); }\n      75%, 100% { opacity: 1; transform: scaleX(0); }\n    }\n\n    @keyframes light-beam {\n      0%, 32.5% { opacity: 0; transform: scaleX(0); }\n      32.5% { animation-timing-function: var(--ease-soft); }\n      38%, 62% { opacity: .82; transform: scaleX(1); }\n      62% { animation-timing-function: var(--ease-soft); }\n      66.5%, 100% { opacity: 0; transform: scaleX(0); }\n    }\n\n    @keyframes light-underfold {\n      0%, 33% { opacity: 0; transform: scaleX(0); }\n      33% { animation-timing-function: var(--ease-soft); }\n      39%, 60% { opacity: .28; transform: scaleX(1); }\n      60% { animation-timing-function: var(--ease-soft); }\n      66%, 100% { opacity: 0; transform: scaleX(0); }\n    }\n\n    @keyframes light-cube {\n      0%, 32% { opacity: 1; transform: scaleX(0); }\n      32% { animation-timing-function: var(--ease-soft); }\n      36%, 62% { opacity: 1; transform: scaleX(1); }\n      62% { animation-timing-function: var(--ease-soft); }\n      67%, 100% { opacity: 1; transform: scaleX(0); }\n    }\n\n    /* Generic icon recipe */\n    .generic-flat,\n    .generic-front,\n    .generic-depth-1,\n    .generic-depth-2,\n    .generic-highlight,\n    .generic-spark {\n      transform-box: fill-box;\n      transform-origin: center;\n    }\n\n    .generic-flat {\n      color: #77736c;\n      animation-name: generic-flat;\n    }\n\n    .generic-front {\n      color: #e7e4dc;\n      animation-name: generic-front;\n    }\n\n    .generic-depth-1 {\n      color: #353531;\n      animation-name: generic-depth-1;\n    }\n\n    .generic-depth-2 {\n      color: #6f6b63;\n      animation-name: generic-depth-2;\n    }\n\n    .generic-highlight {\n      color: var(--accent);\n      clip-path: polygon(58% 0,100% 0,100% 62%,78% 76%);\n      animation-name: generic-highlight;\n    }\n\n    .generic-beam {\n      fill: url(#genericBeamGradient);\n      animation-name: generic-beam;\n      transform-box: fill-box;\n      transform-origin: right center;\n      mix-blend-mode: screen;\n    }\n\n    .generic-spark {\n      fill: var(--accent);\n      animation-name: generic-spark;\n    }\n\n    .source-raster .generic-front {\n      filter: grayscale(1) brightness(1.55);\n    }\n\n    .source-raster .generic-depth-1 {\n      filter: grayscale(1) brightness(.28);\n    }\n\n    .source-raster .generic-depth-2 {\n      filter: grayscale(1) brightness(.72);\n    }\n\n    .source-raster .generic-highlight {\n      filter: sepia(1) saturate(9) hue-rotate(18deg) brightness(1.35);\n    }\n\n    @keyframes generic-flat {\n      0%, 21% { opacity: 1; transform: scale(.64); }\n      21% { animation-timing-function: var(--ease); }\n      30%, 70% { opacity: 0; transform: scale(.72); }\n      70% { animation-timing-function: var(--ease); }\n      79%, 100% { opacity: 1; transform: scale(.64); }\n    }\n\n    @keyframes generic-front {\n      0%, 22% { opacity: 0; transform: translate(8px,-8px) scale(.58); }\n      22% { animation-timing-function: var(--ease); }\n      34%, 66% { opacity: 1; transform: translate(8px,-8px) scale(.78); }\n      66% { animation-timing-function: var(--ease); }\n      78%, 100% { opacity: 0; transform: translate(8px,-8px) scale(.58); }\n    }\n\n    @keyframes generic-depth-1 {\n      0%, 24% { opacity: 0; transform: translate(7px,-7px) scale(.66); }\n      24% { animation-timing-function: var(--ease); }\n      34%, 66% { opacity: 1; transform: translate(-4px,5px) scale(.78); }\n      66% { animation-timing-function: var(--ease); }\n      76%, 100% { opacity: 0; transform: translate(7px,-7px) scale(.66); }\n    }\n\n    @keyframes generic-depth-2 {\n      0%, 26% { opacity: 0; transform: translate(5px,-6px) scale(.69); }\n      26% { animation-timing-function: var(--ease); }\n      35%, 65% { opacity: 1; transform: translate(2px,-1px) scale(.78); }\n      65% { animation-timing-function: var(--ease); }\n      74%, 100% { opacity: 0; transform: translate(5px,-6px) scale(.69); }\n    }\n\n    @keyframes generic-highlight {\n      0%, 29% { opacity: 0; transform: translate(8px,-8px) scale(.74); }\n      29% { animation-timing-function: var(--ease); }\n      37%, 63% { opacity: 1; transform: translate(8px,-8px) scale(.78); }\n      63% { animation-timing-function: var(--ease); }\n      71%, 100% { opacity: 0; transform: translate(8px,-8px) scale(.74); }\n    }\n\n    @keyframes generic-beam {\n      0%, 32% { opacity: 0; transform: scaleX(.02); }\n      32% { animation-timing-function: var(--ease); }\n      39%, 61% { opacity: .75; transform: scaleX(1); }\n      61% { animation-timing-function: var(--ease); }\n      68%, 100% { opacity: 0; transform: scaleX(.02); }\n    }\n\n    @keyframes generic-spark {\n      0%, 31% { opacity: 0; transform: translate(5px,-5px) scale(0) rotate(-20deg); }\n      31% { animation-timing-function: var(--ease); }\n      39%, 61% { opacity: 1; transform: translate(0,0) scale(1) rotate(0); }\n      61% { animation-timing-function: var(--ease); }\n      69%, 100% { opacity: 0; transform: translate(5px,-5px) scale(0) rotate(20deg); }\n    }\n\n    /* Semantic control recipes */\n    .semantic-motion {\n      overflow: visible;\n      color: var(--accent);\n    }\n\n    .semantic-surface {\n      fill: color-mix(in srgb, var(--accent), white 90%);\n      stroke: color-mix(in srgb, var(--accent), white 76%);\n      stroke-width: 1;\n      vector-effect: non-scaling-stroke;\n    }\n\n    .delete-bin,\n    .delete-lid,\n    .delete-label,\n    .delete-result,\n    .delete-fragments,\n    .delete-sweep,\n    .search-surface,\n    .search-ring,\n    .search-lens-left,\n    .search-lens-right,\n    .search-bridge,\n    .search-handle,\n    .search-label {\n      transform-box: fill-box;\n      will-change: transform, opacity;\n    }\n\n    .delete-bin-body,\n    .delete-lid path,\n    .delete-fragments path {\n      fill: var(--accent);\n    }\n\n    .delete-bin-lines {\n      fill: none;\n      stroke: color-mix(in srgb, var(--accent), white 92%);\n      stroke-width: 2;\n      stroke-linecap: round;\n    }\n\n    .delete-label,\n    .delete-result {\n      fill: var(--accent);\n      font: italic 520 24px/1 Inter, ui-sans-serif, system-ui, sans-serif;\n      letter-spacing: -.03em;\n      transform-origin: left center;\n    }\n\n    .delete-result {\n      font-style: italic;\n      animation-name: semantic-delete-result;\n    }\n\n    .delete-label {\n      animation-name: semantic-delete-label;\n    }\n\n    .delete-bin {\n      transform-origin: center bottom;\n      animation-name: semantic-delete-bin;\n    }\n\n    .delete-lid {\n      transform-origin: 56px 44px;\n      animation-name: semantic-delete-lid;\n    }\n\n    .delete-fragments {\n      fill: var(--accent);\n      transform-origin: left center;\n      animation-name: semantic-delete-fragments;\n    }\n\n    .delete-sweep {\n      transform-origin: 262px 58px;\n      animation-name: semantic-delete-sweep;\n    }\n\n    .delete-sweep-arm {\n      fill: none;\n      stroke: color-mix(in srgb, var(--accent), white 61%);\n      stroke-width: 5.6;\n      stroke-linecap: round;\n      stroke-linejoin: round;\n    }\n\n    .delete-sweep-foot {\n      fill: color-mix(in srgb, var(--accent), white 58%);\n    }\n\n    .delete-surface {\n      animation-name: semantic-delete-surface;\n      transform-box: fill-box;\n      transform-origin: center;\n      filter: drop-shadow(0 7px 13px rgba(51,48,48,.06));\n    }\n\n    @keyframes semantic-delete-surface {\n      0%, 11% {\n        fill: color-mix(in srgb, var(--accent), white 98%);\n        stroke: rgba(20,20,20,.08);\n        transform: scale(1);\n      }\n      11% { animation-timing-function: var(--ease); }\n      22%, 100% {\n        fill: color-mix(in srgb, var(--accent), white 91%);\n        stroke: color-mix(in srgb, var(--accent), white 80%);\n        transform: scale(1);\n      }\n    }\n\n    @keyframes semantic-delete-bin {\n      0%, 14% { transform: translateY(0) scale(1); }\n      14% { animation-timing-function: var(--ease); }\n      22%, 72% { transform: translateY(5px) scale(1.02); }\n      72% { animation-timing-function: var(--ease); }\n      82%, 100% { transform: translateY(0) scale(1); }\n    }\n\n    @keyframes semantic-delete-lid {\n      0%, 14% {\n        opacity: 1;\n        transform: translate(0,0) rotate(0);\n      }\n      14% { animation-timing-function: var(--ease); }\n      22%, 72% {\n        opacity: 1;\n        transform: translate(9px,-20px) rotate(-9deg);\n      }\n      72% { animation-timing-function: var(--ease); }\n      82%, 100% {\n        opacity: 1;\n        transform: translate(0,0) rotate(0);\n      }\n    }\n\n    @keyframes semantic-delete-label {\n      0%, 43% {\n        opacity: 1;\n        clip-path: inset(0 0 0 0);\n        transform: translateX(0) scaleX(1);\n      }\n      43% { animation-timing-function: cubic-bezier(.44,.04,.68,.28); }\n      49% {\n        opacity: 1;\n        clip-path: inset(0 20% 0 0);\n        transform: translateX(-18px) scaleX(.78);\n      }\n      55% {\n        opacity: 1;\n        clip-path: inset(0 70% 0 0);\n        transform: translateX(-43px) scaleX(.34);\n      }\n      59%, 100% {\n        opacity: 0;\n        clip-path: inset(0 92% 0 0);\n        transform: translateX(-50px) scaleX(.10);\n      }\n    }\n\n    @keyframes semantic-delete-fragments {\n      0%, 48% {\n        opacity: 0;\n        transform: translateX(30px) scaleX(1);\n      }\n      50% {\n        opacity: .9;\n        transform: translateX(-17px) scaleX(.72);\n      }\n      50% { animation-timing-function: var(--ease-off); }\n      59%, 100% {\n        opacity: 0;\n        transform: translateX(-48px) scaleX(.08);\n      }\n    }\n\n    @keyframes semantic-delete-sweep {\n      0%, 20% {\n        opacity: 0;\n        transform: translate(64px,-10px);\n      }\n      22% { opacity: .35; }\n      22% { animation-timing-function: var(--ease); }\n      25%, 34% {\n        opacity: 1;\n        transform: translate(0,0);\n      }\n      34% { animation-timing-function: cubic-bezier(.36,.04,.18,1); }\n      43% {\n        opacity: 1;\n        transform: translate(-73px,0);\n        animation-timing-function: cubic-bezier(.44,.04,.20,1);\n      }\n      57%, 59% {\n        opacity: 1;\n        transform: translate(-164px,0);\n      }\n      59% { animation-timing-function: var(--ease-fold); }\n      72% {\n        opacity: 1;\n        transform: translate(0,0);\n      }\n      76%, 100% {\n        opacity: 0;\n        transform: translate(47px,-6px);\n      }\n    }\n\n    @keyframes semantic-delete-result {\n      0%, 62% {\n        opacity: 0;\n        clip-path: inset(0 100% 0 0);\n        transform: translateX(0);\n      }\n      62% { animation-timing-function: var(--ease); }\n      72%, 100% {\n        opacity: 1;\n        clip-path: inset(0 0 0 0);\n        transform: translateX(0);\n      }\n    }\n\n    .search-surface {\n      fill: #f3f3f3;\n      stroke: none;\n      transform-origin: left center;\n      animation-name: semantic-search-surface;\n    }\n\n    .search-ring {\n      fill: none;\n      stroke: url(#searchRingGradient);\n      stroke-width: 2;\n      transform-origin: center;\n      animation-name: semantic-search-ring;\n    }\n\n    .search-disc {\n      fill: #fff;\n      filter: drop-shadow(0 4px 7px rgba(32,32,32,.10));\n    }\n\n    .search-lens-left,\n    .search-lens-right {\n      fill: #111;\n      transform-origin: center;\n    }\n\n    .search-lens-left {\n      animation-name: semantic-search-left;\n    }\n\n    .search-lens-right {\n      animation-name: semantic-search-right;\n    }\n\n    .search-bridge,\n    .search-handle {\n      fill: none;\n      stroke: #111;\n      stroke-width: 3;\n      stroke-linecap: round;\n      transform-origin: center;\n    }\n\n    .search-bridge {\n      animation-name: semantic-search-bridge;\n    }\n\n    .search-handle {\n      animation-name: semantic-search-handle;\n    }\n\n    .search-label {\n      fill: #c4c4c4;\n      font: 500 21px/1 Inter, ui-sans-serif, system-ui, sans-serif;\n      letter-spacing: -.025em;\n      transform-origin: left center;\n      animation-name: semantic-search-label;\n    }\n\n    @keyframes semantic-search-surface {\n      0%, 8% { transform: scaleX(.19); }\n      8% { animation-timing-function: var(--ease); }\n      18%, 82% { transform: scaleX(1); }\n      82% { animation-timing-function: var(--ease); }\n      92%, 100% { transform: scaleX(.19); }\n    }\n\n    @keyframes semantic-search-ring {\n      0%, 8% { opacity: .18; transform: rotate(-40deg) scale(.96); }\n      8% { animation-timing-function: var(--ease); }\n      20%, 80% { opacity: 1; transform: rotate(0) scale(1); }\n      80% { animation-timing-function: var(--ease); }\n      92%, 100% { opacity: .18; transform: rotate(40deg) scale(.96); }\n    }\n\n    @keyframes semantic-search-left {\n      0%, 8% { fill: #c9c9c9; transform: translate(4px,0) scale(1); }\n      8% { animation-timing-function: var(--ease); }\n      20%, 80% { fill: #111; transform: translate(-3px,0) scale(1); }\n      80% { animation-timing-function: var(--ease); }\n      92%, 100% { fill: #c9c9c9; transform: translate(4px,0) scale(1); }\n    }\n\n    @keyframes semantic-search-right {\n      0%, 10% { opacity: 0; transform: translate(-11px,0) scale(.08); }\n      10% { animation-timing-function: var(--ease); }\n      21%, 79% { opacity: 1; transform: translate(0,0) scale(1); }\n      79% { animation-timing-function: var(--ease); }\n      90%, 100% { opacity: 0; transform: translate(-11px,0) scale(.08); }\n    }\n\n    @keyframes semantic-search-bridge {\n      0%, 11% { opacity: 0; transform: scaleX(0); }\n      11% { animation-timing-function: var(--ease); }\n      20%, 80% { opacity: 1; transform: scaleX(1); }\n      80% { animation-timing-function: var(--ease); }\n      90%, 100% { opacity: 0; transform: scaleX(0); }\n    }\n\n    @keyframes semantic-search-handle {\n      0%, 8% { opacity: 1; transform: translate(0,0) scale(1); }\n      8% { animation-timing-function: var(--ease); }\n      17%, 83% { opacity: 0; transform: translate(-5px,-5px) scale(.08); }\n      83% { animation-timing-function: var(--ease); }\n      92%, 100% { opacity: 1; transform: translate(0,0) scale(1); }\n    }\n\n    @keyframes semantic-search-label {\n      0%, 12% { opacity: 0; transform: translateX(-38px); }\n      12% { animation-timing-function: var(--ease); }\n      24%, 76% { opacity: 1; transform: translateX(0); }\n      76% { animation-timing-function: var(--ease); }\n      89%, 100% { opacity: 0; transform: translateX(-38px); }\n    }\n\n    @media (prefers-reduced-motion: reduce) {\n      :host(:not([reduced-motion=\"allow\"])) .anim { animation-play-state: paused; animation-delay: 0ms; }\n    }";
const MOTION_MARKUP = "<main class=\"stage mode-generic source-vector\" aria-label=\"Cinematic Icon Motion\">\n    <div class=\"ambient\"></div>\n    <div class=\"nav-camera anim\">\n      <section class=\"nav\">\n        <div class=\"nav-item active\">\n          <div class=\"icon-shell\"><svg class=\"generic-motion\" viewBox=\"-35 -25 170 150\" aria-hidden=\"true\">\n  <defs>\n    <symbol id=\"userIcon\" viewBox=\"0 0 100 100\"><g fill=\"none\" stroke=\"currentColor\" stroke-width=\"6\"><circle cx=\"29\" cy=\"29\" r=\"15\" fill=\"currentColor\" /><circle cx=\"71\" cy=\"29\" r=\"15\" fill=\"currentColor\" /><circle cx=\"29\" cy=\"71\" r=\"15\" fill=\"currentColor\" /><circle cx=\"71\" cy=\"71\" r=\"15\" fill=\"currentColor\" /></g></symbol>\n    <linearGradient id=\"genericBeamGradient\" x1=\"1\" y1=\".5\" x2=\"0\" y2=\".5\">\n      <stop class=\"generic-beam-hot\" offset=\"0\" stop-opacity=\".64\"/>\n      <stop class=\"generic-beam-mid\" offset=\".5\" stop-opacity=\".25\"/>\n      <stop class=\"generic-beam-tail\" offset=\"1\" stop-opacity=\"0\"/>\n    </linearGradient>\n  </defs>\n  <path class=\"generic-beam anim\" d=\"M25 40-34 22-34 82 25 63Z\"/>\n  <use class=\"generic-flat anim\" href=\"#userIcon\" x=\"0\" y=\"0\" width=\"100\" height=\"100\"/>\n  <use class=\"generic-depth-1 anim\" href=\"#userIcon\" x=\"0\" y=\"0\" width=\"100\" height=\"100\"/>\n  <use class=\"generic-depth-2 anim\" href=\"#userIcon\" x=\"0\" y=\"0\" width=\"100\" height=\"100\"/>\n  <use class=\"generic-front anim\" href=\"#userIcon\" x=\"0\" y=\"0\" width=\"100\" height=\"100\"/>\n  <use class=\"generic-highlight anim\" href=\"#userIcon\" x=\"0\" y=\"0\" width=\"100\" height=\"100\"/>\n  <path class=\"generic-spark anim\" d=\"m87 2 4 10 10 4-10 4-4 10-4-10-10-4 10-4Z\"/>\n</svg></div>\n          <div class=\"label\" data-motion-label=\"active\">本桌</div>\n        </div>\n        <div class=\"nav-item inactive anim\">\n          <div class=\"icon-shell\">\n            <svg class=\"history-icon\" viewBox=\"0 0 100 100\" aria-hidden=\"true\">\n              <path fill=\"currentColor\" d=\"M24 28h52l-5 52c-.5 5-4 8-9 8H38c-5 0-8.5-3-9-8Z\"/>\n              <ellipse cx=\"50\" cy=\"28\" rx=\"26\" ry=\"10\" fill=\"currentColor\"/>\n              <ellipse cx=\"50\" cy=\"29\" rx=\"18\" ry=\"4.5\" fill=\"var(--bar)\"/>\n            </svg>\n          </div>\n          <div class=\"label\" data-motion-label=\"secondary\">History</div>\n        </div>\n        <div class=\"nav-item inactive anim\">\n          <div class=\"icon-shell\">\n            <svg class=\"check-icon\" viewBox=\"0 0 100 100\" aria-hidden=\"true\">\n              <circle cx=\"50\" cy=\"50\" r=\"39\" fill=\"currentColor\"/>\n              <path d=\"M50 29v42M29 50h42\" fill=\"none\" stroke=\"#0c0c0b\" stroke-width=\"9\" stroke-linecap=\"round\"/>\n            </svg>\n          </div>\n          <div class=\"label\" data-motion-label=\"tertiary\">Check</div>\n        </div>\n      </section>\n    </div>\n  </main>";
const HTMLElementBase = globalThis.HTMLElement ?? class {};
const INLINE_RESTART_PROGRESS = 0.2;

const COLOR_PROPERTIES = Object.freeze({
  accent: "--accent",
  background: "--background",
  bar: "--bar",
  foreground: "--foreground",
  light: "--light",
  muted: "--muted",
  shadow: "--shadow",
});

function readBooleanAttribute(element, name, fallback) {
  if (!element.hasAttribute(name)) return fallback;
  return element.getAttribute(name) !== "false";
}

function readBooleanProperty(value) {
  return value !== false && value !== "false" && value != null;
}

function asFiniteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export class IconMotionElement extends HTMLElementBase {
  static get observedAttributes() {
    return [
      ...Object.keys(COLOR_PROPERTIES),
      "autoplay",
      "duration",
      "label",
      "loop",
      "paused",
      "result-label",
      "secondary-label",
      "tertiary-label",
    ];
  }

  constructor() {
    super();
    this._connected = false;
    this._boundIteration = (event) => {
      if (event.target !== this._camera) return;
      this._emit("motion-loop", { progress: 0 });
    };
    this._boundComplete = (event) => {
      if (event.target !== this._camera) return;
      if (!this.loop) {
        this._setPlaybackState("paused");
        this._emit("motion-complete", { progress: 1 });
      }
    };

    const root = this.attachShadow({ mode: "open" });
    root.innerHTML = `
      <style>
        ${MOTION_CSS}

        :host {
          display: inline-block;
          position: relative;
          width: 24px;
          height: 24px;
          max-width: none;
          overflow: visible;
          vertical-align: middle;
          contain: layout style;
          --component-scale: 1;
          --icon-focus-x: 0%;
          --icon-focus-y: 0%;
          --icon-focus-scale: 1;
          --motion-state: paused;
          --motion-iterations: 1;
        }

        :host([presentation="cinematic"]) {
          --icon-focus-y: -540%;
          --icon-focus-scale: 10.4;
        }

        .motion-viewport {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          overflow: visible;
          background: transparent;
          pointer-events: none;
        }

        .motion-viewport > .stage {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          overflow: visible;
          background: transparent;
          transform: none;
        }

        .ambient {
          display: none;
        }

        .nav-camera {
          inset: 0;
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          transform-origin: 50% 58%;
          animation-name: icon-camera;
        }

        .nav {
          position: absolute;
          inset: 0;
          display: block;
          padding: 0;
          border-radius: 0;
          background: transparent;
          box-shadow: none;
        }

        .nav-item.active {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          color: var(--muted);
        }

        .nav-item.inactive {
          display: none;
        }

        .nav-item.active .icon-shell {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }

        .mode-house .nav-item.active .icon-shell > svg,
        .mode-generic .nav-item.active .icon-shell > svg {
          width: 210%;
          height: 210%;
        }

        .mode-semantic .nav-item.active .icon-shell > svg {
          width: 100%;
          height: 100%;
        }

        .mode-semantic .nav-camera {
          inset: 0;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          transform-origin: center;
          animation-name: semantic-inline-camera;
        }

        .label:not([data-motion-label="result"]) {
          display: none;
        }

        .motion-reset .anim {
          animation-name: none !important;
        }

        @keyframes icon-camera {
          0%, 8% {
            transform: translate3d(0,0,0) scale(1);
          }
          8% {
            animation-timing-function: var(--ease);
          }
          23%, 76% {
            transform:
              translate3d(var(--icon-focus-x),var(--icon-focus-y),0)
              scale(var(--icon-focus-scale));
          }
          76% {
            animation-timing-function: var(--ease);
          }
          90%, 100% {
            transform: translate3d(0,0,0) scale(1);
          }
        }

        @keyframes semantic-inline-camera {
          0%, 100% {
            transform: translate3d(0,0,0) scale(1);
          }
        }
      </style>
      <div class="motion-viewport">${MOTION_MARKUP}</div>
    `;

    this._viewport = root.querySelector(".motion-viewport");
    this._stage = root.querySelector(".stage");
    this._camera = root.querySelector(".nav-camera");
    this._labels = {
      active: [...root.querySelectorAll('[data-motion-label="active"]')],
      result: [...root.querySelectorAll('[data-motion-label="result"]')],
      secondary: [...root.querySelectorAll('[data-motion-label="secondary"]')],
      tertiary: [...root.querySelectorAll('[data-motion-label="tertiary"]')],
    };
  }

  connectedCallback() {
    if (this._connected) return;
    this._connected = true;
    this._syncAll();
    this._camera?.addEventListener("animationiteration", this._boundIteration);
    this._camera?.addEventListener("animationend", this._boundComplete);

    if (this.paused || !this.autoplay) {
      this._setPlaybackState("paused");
    } else {
      this._setPlaybackState("running");
    }

    queueMicrotask(() => {
      this._emit("motion-ready", {
        duration: this.duration,
        mode: DEFAULTS.mode,
      });
    });
  }

  disconnectedCallback() {
    this._connected = false;
    this._camera?.removeEventListener("animationiteration", this._boundIteration);
    this._camera?.removeEventListener("animationend", this._boundComplete);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this._stage) return;
    if (name in COLOR_PROPERTIES) {
      this._syncColor(name);
      return;
    }
    if (name === "duration") {
      if (newValue == null) this.style.removeProperty("--duration");
      else this.style.setProperty("--duration", `${this.duration}ms`);
      return;
    }
    if (name === "loop") {
      if (newValue == null) this.style.removeProperty("--motion-iterations");
      else this.style.setProperty("--motion-iterations", this.loop ? "infinite" : "1");
      return;
    }
    if (
      name === "label" ||
      name === "result-label" ||
      name === "secondary-label" ||
      name === "tertiary-label"
    ) {
      this._syncLabels();
      return;
    }
    if (!this._connected) return;
    if (name === "paused") {
      this._setPlaybackState(this.paused ? "paused" : "running");
    } else if (name === "autoplay") {
      this._setPlaybackState(this.autoplay ? "running" : "paused");
    }
  }

  get autoplay() {
    return readBooleanAttribute(this, "autoplay", false);
  }

  set autoplay(value) {
    this.setAttribute("autoplay", readBooleanProperty(value) ? "" : "false");
  }

  get loop() {
    return readBooleanAttribute(this, "loop", false);
  }

  set loop(value) {
    this.setAttribute("loop", readBooleanProperty(value) ? "" : "false");
  }

  get paused() {
    return this.hasAttribute("paused");
  }

  set paused(value) {
    this.toggleAttribute("paused", readBooleanProperty(value));
  }

  get duration() {
    return Math.max(1, asFiniteNumber(this.getAttribute("duration"), DEFAULTS.durationMs));
  }

  set duration(value) {
    this.setAttribute("duration", String(Math.max(1, asFiniteNumber(value, DEFAULTS.durationMs))));
  }

  get presentation() {
    return this.getAttribute("presentation") === "cinematic" ? "cinematic" : "inline";
  }

  set presentation(value) {
    this.setAttribute("presentation", value === "cinematic" ? "cinematic" : "inline");
  }

  play() {
    if (this.paused) this.removeAttribute("paused");
    this._setPlaybackState("running");
    this._emit("motion-play", { progress: this.progress });
  }

  pause() {
    if (!this.paused) this.setAttribute("paused", "");
    this._setPlaybackState("paused");
    this._emit("motion-pause", { progress: this.progress });
  }

  restart() {
    const startTime = this.presentation === "inline"
      ? this.duration * INLINE_RESTART_PROGRESS
      : 0;
    this._restartAt(startTime, "running");
    if (this.paused) this.removeAttribute("paused");
    this._emit("motion-play", { progress: 0 });
  }

  seek(milliseconds) {
    const time = Math.max(0, Math.min(asFiniteNumber(milliseconds, 0), this.duration - 0.001));
    this._restartAt(time, "paused");
    if (!this.paused) this.setAttribute("paused", "");
    this._emit("motion-seek", { milliseconds: time, progress: time / this.duration });
    return time;
  }

  setProgress(value) {
    const progress = Math.max(0, Math.min(asFiniteNumber(value, 0), 1));
    return this.seek(progress * this.duration);
  }

  get progress() {
    const delay = this.style.getPropertyValue("--motion-delay");
    const milliseconds = Math.abs(asFiniteNumber(delay.replace("ms", ""), 0));
    return Math.max(0, Math.min(milliseconds / this.duration, 1));
  }

  _restartAt(milliseconds, state) {
    this._stage.classList.add("motion-reset");
    void this._stage.offsetWidth;
    this.style.setProperty("--motion-delay", `${-milliseconds}ms`);
    this.style.setProperty("--motion-state", state);
    this._stage.classList.remove("motion-reset");
    void this._stage.offsetWidth;
  }

  _setPlaybackState(state) {
    this.style.setProperty("--motion-state", state);
  }

  _syncAll() {
    for (const name of Object.keys(COLOR_PROPERTIES)) this._syncColor(name);
    if (this.hasAttribute("duration")) {
      this.style.setProperty("--duration", `${this.duration}ms`);
    }
    if (this.hasAttribute("loop")) {
      this.style.setProperty("--motion-iterations", this.loop ? "infinite" : "1");
    }
    this._syncLabels();
  }

  _syncColor(name) {
    const value = this.getAttribute(name);
    if (value == null) this.style.removeProperty(COLOR_PROPERTIES[name]);
    else this.style.setProperty(COLOR_PROPERTIES[name], value);
  }

  _syncLabels() {
    const label = this.getAttribute("label") || DEFAULTS.label;
    const result = this.getAttribute("result-label") || DEFAULTS.resultLabel;
    const secondary = this.getAttribute("secondary-label") || DEFAULTS.secondaryLabel;
    const tertiary = this.getAttribute("tertiary-label") || DEFAULTS.tertiaryLabel;
    for (const node of this._labels.active) node.textContent = label;
    if (result) for (const node of this._labels.result) node.textContent = result;
    for (const node of this._labels.secondary) node.textContent = secondary;
    for (const node of this._labels.tertiary) node.textContent = tertiary;
    this._stage.setAttribute(
      "aria-label",
      result ? `${label} to ${result} motion` : `${label} navigation motion`,
    );
  }

  _emit(name, detail) {
    this.dispatchEvent(new CustomEvent(name, {
      bubbles: true,
      composed: true,
      detail,
    }));
  }
}

if (globalThis.customElements && !customElements.get("dl-table-view-motion")) {
  customElements.define("dl-table-view-motion", IconMotionElement);
}

export default IconMotionElement;
