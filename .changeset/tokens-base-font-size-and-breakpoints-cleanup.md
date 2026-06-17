---
"@mission-platform/tokens": major
---

add a `font.size.base` (14px) token and source the breakpoint SCSS from the generated properties

- `font.tokens.json` gains a `font.size.base` step (`14px`, the absolute root
  font-size every other rem step is relative to). It is emitted as
  `$font-size-base` / `--mp-font-size-base` (with a `<length>` `@property`
  registration); `scss/mixins`' `mp-font-base` and the `scss/tokens` `:root`
  reset now use `var(--mp-font-size-base)` instead of the hard-coded `14px` /
  `var(--mp-font-size-md)`, and `scss/mixins`' `mp-rem()` now divides by the
  base token (read from the new CSS-free `generated/scss/_font-vars.scss`) rather
  than a hard-coded `16`.
- The generated token CSS (the `:root` custom properties **and** the `@property`
  registrations, including the `light-dark()` theme) is now wrapped in the
  `@layer mp.tokens` cascade layer, as are the `scss/tokens` base resets, so
  unlayered application styles win over the tokens without specificity battles.
- `scss/_breakpoints.scss` now builds its `$breakpoints` map directly from the
  generated `$breakpoint-*` design-token properties (the redundant hand-maintained
  `$bp-*` aliases are dropped); the `.bp-show-*`/`.bp-hide-*`/`.bp-only-*`
  visibility utilities are unchanged.
- **BREAKING:** the redundant `scss/breakpoints` entry point (and its
  `./scss/breakpoints` package export) is removed. Import the mixins from
  `@mission-platform/tokens/scss/breakpoints-mixins` and, if you need the
  visibility utility classes, the new `@mission-platform/tokens/scss/breakpoints-utilities`
  export.
