---
'@mission-platform/components': minor
---

feat(components): add BaseGrid layout component

Add `BaseGrid`, a CSS Grid layout primitive that arranges content into a
grid of `rows` (m) by `cols` (n). Gaps use a named `2xs`–`2xl` scale
(`gap`, `rowGap`, `columnGap`) where each step maps to a `--mp-spacing-*`
design token. The `justify` / `align` props control item placement within
each cell (`justify-items` / `align-items`). It also supports a custom
container tag via `as`, a default slot for free-form children (which may
span tracks via the standard `grid-column` / `grid-row` `span` CSS), and a
scoped `cell` slot that renders one node per cell exposing the zero-based
`row`, `column`, and `index`.
