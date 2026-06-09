---
'@mission-platform/open-graph': minor
---

make `useOpenGraph` SSR/SSG-safe by delegating to `@unhead/vue`

The composable now registers tags through `@unhead/vue`'s `useHead` instead
of mutating `document.head` directly. This means Open Graph and Twitter
`<meta>` tags are picked up by server-side renderers (e.g. `vite-ssg`,
`vite-plugin-ssr`) and baked into prerendered HTML, while client-side
behaviour is unchanged.

`@unhead/vue` is now a peer dependency (`^2.1.0`). The pure
`buildMetaTags`/`applyMetaTags` exports are unchanged and remain available
for non-Vue consumers.
