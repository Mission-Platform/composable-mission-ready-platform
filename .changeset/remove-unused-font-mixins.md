---
'@mission-platform/tokens': patch
---

remove the unused typography variant mixins from the SCSS mixin layer

As part of the staged Phase 2 retirement of the `mp-font-*` SCSS mixins, the
variant mixins with no remaining consumers (`mp-font-display`, `mp-font-h2`,
`mp-font-h4`, `mp-font-h5`, `mp-font-body-lg`, and `mp-font-body-xs`) are
removed. The still-used variant mixins (`mp-font-h1`, `mp-font-h3`,
`mp-font-body-md`, `mp-font-body-sm`, `mp-font-label`, `mp-font-caption`,
`mp-font-code`, `mp-font-base`), the core `mp-font` mixin, and the lookup
functions (`mp-rem`, `mp-font-size`, `mp-font-weight`, `mp-line-height`,
`mp-letter-spacing`) are retained.
