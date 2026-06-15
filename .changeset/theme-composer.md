---
'@mission-platform/components': minor
---

add BaseThemeComposer and useThemeComposer for runtime theme attribute composition

Introduces a theme composer that lets consumers configure attributes of the theme at runtime. Friendly attributes (brand/accent colours, text/surface/border/focus colours, sans/mono font families, base font size, and base corner radius) plus an arbitrary `tokens` escape hatch resolve to `--mp-*` CSS custom properties. `BaseThemeComposer` scopes the result to its own wrapper element by default or applies it globally to `<html>`, supports `v-model` on the config, optional `localStorage` persistence, and shares the reactive store with descendants via the new `useThemeComposer` composable.
