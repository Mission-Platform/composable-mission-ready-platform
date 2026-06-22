---
'@mission-platform/vite-plugin-jsx': minor
'@mission-platform/components': patch
---

add vite plugin that compiles the neutral jsx components to react/vue at build time

Introduces the `@mission-platform/vite-plugin-jsx` workspace, which compiles the
framework-neutral `@mission-platform/jsx` components to React or Vue 3 at build
time instead of wrapping them with the runtime `toReactComponent` /
`toVueComponent` adapters.

`@mission-platform/components` produces its `./react` and `./vue` subpaths by
running one `vite build` per framework through this plugin, rather than the
runtime adapters.
