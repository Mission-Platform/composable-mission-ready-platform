---
'@mission-platform/vite-plugin-forge': minor
'@mission-platform/d3': patch
'@mission-platform/rxjs': patch
---

support nested composables/utils folders in the hook-library compiler

The write-once hook compiler in `@mission-platform/vite-plugin-forge` now
preserves nested module folders instead of flattening hook files to the `src/`
root: relative re-exports are kept, the shared effect helper import is rewritten
to the correct depth (`../mp-effect`), and per-framework declarations are
emitted recursively. This lets hook libraries adopt the same hierarchical
`src/{composables,utils}/` layout as component packages.

`@mission-platform/d3` and `@mission-platform/rxjs` are reorganised onto that
layout — their composables move under `src/composables/` (and d3's helpers
under `src/utils/`) with `index.ts` barrels — with no change to their public
export surface.
