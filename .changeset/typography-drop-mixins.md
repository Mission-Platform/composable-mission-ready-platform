---
'@mission-platform/components': patch
---

migrate BaseTypography variants off the SCSS font mixins to design-token CSS custom properties

Starts the staged retirement of the `@mission-platform/tokens` SCSS `mp-font-*`
mixin layer: `BaseTypography` now composes each variant directly from the
generated `--mp-font-*` / `--mp-line-height-*` / `--mp-letter-spacing-*` tokens
(rendered output is unchanged).
