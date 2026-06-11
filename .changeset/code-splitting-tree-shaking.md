---
'@mission-platform/vite-config': minor
'@mission-platform/breakpoints': minor
'@mission-platform/icons': minor
'@mission-platform/map': minor
'@mission-platform/i18n': minor
'@mission-platform/seo': minor
'@mission-platform/harper': patch
'@mission-platform/hunspell': patch
'@mission-platform/tokens': patch
---

emit code-split, tree-shakeable library builds

`defineLibraryConfig` now preserves the source module graph (one output file per
module) and externalises each package's own `dependencies`/`peerDependencies` by
default, so consumers get first-class tree shaking and code splitting. Packages
that ship a single self-contained artifact (workers, WASM entries, the flat token
bundle) opt out via the new `preserveModules: false` option. The main entry of
each preserved-module package is now emitted as `dist/index.js`.
