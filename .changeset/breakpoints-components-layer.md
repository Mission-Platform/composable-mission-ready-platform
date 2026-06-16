---
"@mission-platform/breakpoints": minor
---

wrap component styles in the `@layer mp.breakpoints` cascade layer

The `@mission-platform/breakpoints` SFC `<style>` rules are now wrapped in the
`@layer mp.breakpoints` cascade layer (any leading `@use` stays outside the
layer), so unlayered application styles win over them without specificity battles.
