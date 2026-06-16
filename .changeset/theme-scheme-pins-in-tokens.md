---
"@mission-platform/vite-plugin-tokens": minor
"@mission-platform/tokens": minor
---

ship the `[data-theme]`/`.theme-*` scheme pins in the generated theme

The generated `_theme.scss` now also emits the opt-in scheme pins —
`[data-theme='light'], .theme-light { color-scheme: light }` and the matching
dark rules — directly inside the `mp.tokens` cascade layer, alongside the
`:root` `light-dark()` colour tokens. Importing `@mission-platform/tokens/scss/tokens`
is therefore enough to pin a subtree (or the whole document) to one scheme via
`data-theme`/`.theme-*`; the behaviour no longer depends on import order or on
importing a separate theme entry point. The hand-written
`@mission-platform/tokens/scss/themes/{light,dark}` partials are kept as
backwards-compatible shims that now emit no CSS (the pin lives in `scss/tokens`),
so a subtree pinned with `data-theme` re-themes itself and its descendants
purely through `color-scheme` + `light-dark()`, without redefining any colour
custom property.
