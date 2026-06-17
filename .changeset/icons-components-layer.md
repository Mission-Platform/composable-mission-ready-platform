---
"@mission-platform/icons": minor
---

wrap icon component styles in the `@layer mp.icons` cascade layer

Every `@mission-platform/icons` SFC `<style>` block now wraps its rules in the
`@layer mp.icons` cascade layer (any leading `@use` stays outside the layer), so
unlayered application styles win over the icon styles without specificity battles.
