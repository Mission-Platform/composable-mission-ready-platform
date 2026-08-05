---
'@mission-platform/components': patch
---

`BaseCodeBlock`: the syntax-highlighting theme now follows the operating
system's `prefers-color-scheme` when the app is in the default `auto` theme
(no explicit `data-theme` pinned on the document root), matching the
`light-dark()` design tokens. Previously the highlight.js token colours only
switched to dark under an explicit `[data-theme='dark']`/`.theme-dark`, so code
stayed on the light palette (dark-on-dark, hard to read) whenever a dark OS was
followed via auto mode. An explicit light/dark choice still wins.
