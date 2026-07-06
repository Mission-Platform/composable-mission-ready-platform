---
'@mission-platform/jsx': minor
'@mission-platform/vite-plugin-jsx': minor
'@mission-platform/components': minor
---

ship per-component CSS + strongly tree-shakeable output, and add a framework-neutral named-`Slot` primitive

`@mission-platform/components` now compiles to **per-component** JS **and**
CSS chunks instead of one bundled `vue.js` / `react.js` + one combined
`vue.css` / `react.css`. Each framework is emitted into its own
`dist/<framework>/` subtree (`preserveModules` + `cssCodeSplit`), every
component is its own ESM chunk that imports its own stylesheet, and the entries
are thin re-export barrels — so a consumer importing a single component pulls in
only that component's JS + CSS and tree-shakes the rest of the library (styles
included). **Breaking:** the `./vue.css` and `./react.css` subpath exports are
removed (component CSS now loads automatically with the component), and the
`./vue` / `./react` exports resolve to `dist/<framework>/index.js`.

`@mission-platform/vite-plugin-jsx` gains `jsxComponentsCssImportPlugin`, which
re-links each component's extracted CSS to its JS chunk (Vite library builds
emit per-chunk CSS but do not inject the import), and its two-stage compiler now
translates the new named-slot marker.

`@mission-platform/jsx` adds a framework-neutral named-slot primitive `Slot`
(`<Slot name="…" />`, with the nameless `<Slot />` for the default slot, scoped
slots, and fallback children). The runtime adapters resolve slots against a
per-component scope, and the build-time compiler rewrites `<Slot name="x" />` to
Vue's `slots.x?.()` and React's `properties.x`.
