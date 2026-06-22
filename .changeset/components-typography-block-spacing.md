---
'@mission-platform/components': minor
---

add variant-scaled bottom-margin spacing between `BaseTypography` blocks

`BaseTypography`'s block variants now carry a variant-scaled `margin-bottom` so stacked text blocks breathe instead of butting together: `--mp-spacing-3` for `display`/`h1`, `--mp-spacing-2` for `h2`–`h4`, and `--mp-spacing-1` for `h5`/`h6` and every `body-*` variant (the spacing increases with the type scale, from paragraph up to `h1`). The inline-style `label`, `caption`, and `code` variants stay flush (no margin).
