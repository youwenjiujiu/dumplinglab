---
name: dl-craft
description: Dumpling Lab 点餐站的设计与动效准则（从 emilkowalski/skills 与 mono-color-skill 蒸馏）。在改动 web/menu.css、menu.js、任何动效、排版、颜色或新增界面元素之前必须读；也用于 review 这个项目的 UI 改动。触发词：Dumpling Lab 视觉、动效、按钮反馈、抽屉、toast、字体、留白、高级感。
---

# Dumpling Lab craft

Read `docs/DESIGN-CRAFT.md` in the repo root first; it is the source of truth (Chinese). Non-negotiables in one breath:

- Motion gate: frequent → no motion; occasional → ≤300ms; rare → delight. Purpose must be named (feedback / spatial / state / anti-jarring / explanation).
- Ingredients: `--ease-out: cubic-bezier(0.23,1,0.32,1)`, `--ease-in-out: cubic-bezier(0.77,0,0.175,1)`, `--ease-drawer: cubic-bezier(0.32,0.72,0,1)`. Never `ease-in`, never `transition: all`, never `scale(0)`, transform/opacity only, transitions not keyframes for rapid UI, bounce only for momentum gestures and rare moments, reduced-motion + hover gating ship with the change.
- Feel: feedback on pointerdown, `:active scale(.97)`, symmetric enter/exit, translucent bars, scroll-edge fades not 1px rules, tracking tightens as type grows.
- Layout: one focal event per screen, a quiet release zone, 25–55% empty paper, ≤3 type voices, colour with roles (red = logo, add, price, rail, primary, ticket head, success).
- When reviewing, output a Before | After | Why markdown table.
