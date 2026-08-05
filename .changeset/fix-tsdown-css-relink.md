---
'@mission-platform/tsdown-config': minor
'@mission-platform/components': patch
'@mission-platform/layouts': patch
'@mission-platform/map': patch
'@mission-platform/forms': patch
'@mission-platform/wysiwyg': patch
'@mission-platform/icons': patch
'@mission-platform/barcode': patch
'@mission-platform/qr-code': patch
'@mission-platform/matrix-code': patch
'@mission-platform/code-scanner': patch
'@mission-platform/breakpoints': patch
---

fix component styles not loading in apps and Storybook

`defineTsdownLibrary` now re-links every extracted stylesheet to the JS module that owns it via a `writeBundle` pass (opt out with `cssBundle: false`). Under the tsdown/Rolldown build, co-located `*.module.scss` / `*.scss` imports were extracted to standalone `.css` assets but their side-effect imports were dropped from the JS (left as `/* empty css */`), so importing a component shipped its markup without its styles. Each `X.css` is now imported from its CSS-Module class map (`X.module.js`) — or, for the Vue build, from the component chunk (`X.vue_vue_type_style_*.css` → `X.js`) — so importing a single component (or the package barrel) automatically loads exactly its styles again, matching the historical Vite library build.
