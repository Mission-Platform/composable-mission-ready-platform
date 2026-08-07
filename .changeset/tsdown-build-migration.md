---
'@mission-platform/tsdown-config': minor
'@mission-platform/vite-plugin-forge': minor
'@mission-platform/vite-plugin-assemblyscript': patch
'@mission-platform/vite-plugin-i18n': patch
'@mission-platform/vite-plugin-seo': patch
'@mission-platform/vite-plugin-tokens': patch
'@mission-platform/vite-config': patch
'@mission-platform/i18n-config': patch
'@mission-platform/postcss-config': patch
'@mission-platform/storybook-framework': patch
'@mission-platform/forge': patch
'@mission-platform/forms-core': patch
'@mission-platform/i18n': patch
'@mission-platform/phone-number': patch
'@mission-platform/router': patch
'@mission-platform/scheduler-core': patch
'@mission-platform/seo': patch
'@mission-platform/barcode': patch
'@mission-platform/breakpoints': patch
'@mission-platform/code-scanner': patch
'@mission-platform/components': patch
'@mission-platform/d3': patch
'@mission-platform/forms': patch
'@mission-platform/icons': patch
'@mission-platform/layouts': patch
'@mission-platform/map': patch
'@mission-platform/matrix-code': patch
'@mission-platform/observers': patch
'@mission-platform/qr-code': patch
'@mission-platform/rxjs': patch
'@mission-platform/three': patch
'@mission-platform/wysiwyg': patch
'@mission-platform/tokens': patch
'@mission-platform/harper': patch
'@mission-platform/hunspell': patch
---

migrate library builds to tsdown

Every library workspace across `packages/`, `vite-plugins/`, `configs/`, `workers/`, and the MCP servers now builds
with [tsdown](https://tsdown.dev) (Rolldown/Oxc)
instead of `tsc` / `vite build`. A new shared `@mission-platform/tsdown-config`
package exposes the generic `defineTsdownLibrary` / `defineTsdownVueLibrary`
helpers, and `@mission-platform/vite-plugin-forge` now additionally exports tsdown-compatible forge helpers
(`defineTsdownForgeHooks(All)`,
`defineTsdownForgeComponents(All)`, `defineTsdownForgeStoryblok(All)`) plus the Rolldown stage-2 adapters needed to
reproduce the write-once multi-framework output under tsdown.

This is a build-tooling change only: every package's public `exports`, `dist`
layout, `types`, and framework auto-resolution (`mp:*` conditions) are unchanged, so consumers are unaffected. The
`@mission-platform/forms` `web-components`
target remains a hybrid Vite step, and `@mission-platform/hunspell` keeps its
`build:wasm` toolchain.
