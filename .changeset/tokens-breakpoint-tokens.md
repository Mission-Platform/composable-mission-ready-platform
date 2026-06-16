---
'@mission-platform/tokens': minor
---

source the responsive breakpoint thresholds from design tokens

The seven breakpoint min-width thresholds are now authored as a `breakpoint` DTCG group in `scale.tokens.json` and generated as `$breakpoint-2xs` … `$breakpoint-2xl` SCSS variables (and `--mp-breakpoint-*` CSS custom properties). The hand-written `_breakpoints.scss` partial now builds its `$bp-*` / `$breakpoints` map and the `bp-up`/`bp-down`/`bp-between`/`bp-only` mixins from those generated tokens instead of hard-coded literals. The public mixin/utility-class API and emitted media queries are unchanged.
