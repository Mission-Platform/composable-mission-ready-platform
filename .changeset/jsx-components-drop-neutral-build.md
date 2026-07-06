---
'@mission-platform/components': minor
---

build straight to both react and vue with no neutral build

`@mission-platform/components` now compiles the write-once components
directly to both React and Vue in a single `pnpm build`. The framework-neutral
build (the `--mode neutral` pass that emitted `dist/index.js`) and the matching
framework-neutral root export (`@mission-platform/components`) are removed —
the package exposes only the `./react` and `./vue` subpaths. Consumers that
previously imported the neutral components from the package root should import
the matching framework subpath instead.
