---
'@mission-platform/tokens': major
---

generate a single `light-dark()` theme; treat palette and typography as structural

- The semantic colour tokens are now emitted as one generated `light-dark()`
  theme: `:root { color-scheme: light dark; --mp-color-*: light-dark(<light>,
  <dark>); }`, included in the `scss/tokens` barrel so the colours follow the OS
  preference automatically. The `theme-light.tokens.json` / `theme-dark.tokens.json`
  sources now reference the palette via DTCG aliases (`{color.cyan.950}`, …) and
  mirror the previous hand-authored `themes/{light,dark}/index.scss` mappings, and
  new primitive tokens were added to `palette.tokens.json` (the dark teal
  surface/border steps and the translucent black/white scrim/shimmer overlays).
- The colour palette and the composite typography are now emitted exactly like the
  other structural scales: the palette gets `--mp-color-*` custom properties +
  `<color>` `@property` registrations, and typography is flattened to
  `--mp-typography-<variant>-<field>` custom properties that reference the primitive
  `var(--mp-font-*)` tokens (registered under the universal `*` `@property` syntax).
  Every `:root` custom property now interpolates its local `$`-variable
  (`--mp-*: #{$<token>}`) rather than inlining the literal.
- **BREAKING:** `scss/themes/light` and `scss/themes/dark` no longer redefine the
  colour custom properties — they only force `color-scheme` on the
  `[data-theme]`/`.theme-*` opt-in selectors (import `scss/tokens` for the values).
  The `mp-dark-theme-vars` mixin and the (previously dangling) `scss/themes/light/colours`
  export are removed; pin a scheme with `data-theme="light|dark"` instead. The theme
  sources moved under `src/scss/themes/{light,dark}/` (the `scss/themes/*` export
  specifiers are unchanged).
- The `scss/mixins` font helpers (`mp-font*`, `mp-font-base`, the `mp-font-size`/
  `mp-font-weight`/`mp-line-height`/`mp-letter-spacing` lookups) now resolve to the
  generated `var(--mp-*)` custom properties instead of the underlying SCSS
  `$`-variables, so a runtime token override flows through automatically.
