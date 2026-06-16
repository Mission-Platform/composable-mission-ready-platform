---
"@mission-platform/map": minor
---

wrap component styles in the `@layer mp.map` cascade layer

Every `@mission-platform/map` SFC `<style>` block now wraps its rules in the
`@layer mp.map` cascade layer (any leading `@use` stays outside the layer), so
unlayered application styles win over the map component styles without specificity
battles.
