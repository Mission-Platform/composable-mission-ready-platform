---
'@mission-platform/components': minor
---

feat(components): add BaseStack layout component

Add `BaseStack`, a flexbox stack layout primitive that lays its children
out in a single line, either vertically (a column) or horizontally (a row)
via the `direction` prop. Gaps reuse the shared named `2xs`–`2xl` scale
(each step mapping to a `--mp-spacing-*` design token). The `justify`
(`justify-content`) and `align` (`align-items`) props control distribution
along the main axis and placement along the cross axis, `wrap` toggles flex
wrapping, `inline` renders an `inline-flex` container, and `as` sets the
container tag.
