---
'@mission-platform/page-meta': minor
---

make `usePageMeta` SSR/SSG-safe by delegating to `@unhead/vue`

The composable now registers `<title>`, `<html lang>`, `<meta>`, and `<link>`
tags through `@unhead/vue`'s `useHead` instead of mutating `document.head`
directly. This means standard page metadata (title, description, canonical,
hreflang alternates, theme-color, …) is picked up by server-side renderers
(e.g. `vite-ssg`) and baked into prerendered HTML, while client-side
behaviour is unchanged.

`@unhead/vue` is now a peer dependency (`^2.1.0`). The pure
`buildPageMeta`/`applyPageMeta` exports are unchanged and remain available
for non-Vue consumers.
