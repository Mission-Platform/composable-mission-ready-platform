---
'@mission-platform/vite-config': minor
---

add shared `@mission-platform/vite-config` workspace

Introduces a new shared tooling workspace under `configs/` that exposes
`defineLibraryConfig`, `defineAppConfig`, and `defineVitestConfig`
(via the `./vitest` subpath) helpers, bundling the standard Vue +
vue-i18n plugins, shared PostCSS pipeline, and library build defaults
consumed by every Mission Platform workspace. Built with `tsc` against
`@mission-platform/typescript-config/library`.
