---
'@mission-platform/tokens': minor
'@mission-platform/vite-plugin-tokens': minor
---

add motion, z-index, opacity and border-width tokens and split the structural scale sources per concern

Added four new DTCG token groups, each in its own source file: `motion.tokens.json` (`duration.*` transition/animation timings + `easing.*` curves), `z-index.tokens.json` (a shared `base` → `toast` stacking order), `opacity.tokens.json` (`disabled`/`muted`/`subtle`/… alpha levels) and `border-width.tokens.json` (`thin`/`thick`/`heavy`). These generate `--mp-duration-*`, `--mp-easing-*`, `--mp-z-index-*`, `--mp-opacity-*` and `--mp-border-width-*` CSS custom properties, matching SCSS `$`-variables, and new `durations`/`easings`/`zIndices`/`opacities`/`borderWidths` TypeScript exports.

The monolithic `scale.tokens.json` was broken up into one DTCG file per scale (`breakpoint`, `spacing`, `radius`, `shadow`, `size`); the plugin merges them by top-level group so all existing `--mp-*` / `$` / TS token names and values are unchanged. `@mission-platform/vite-plugin-tokens` now resolves a configurable list of structural sources instead of a single `scale` path.
