---
'@mission-platform/map': patch
---

use shared `@mission-platform/typescript-config` and `@mission-platform/vite-config`

Migrates `vite.config.ts`, `vitest.config.ts`, and the `tsconfig.*.json`
files (build, node, test, storybook) to extend the shared workspaces
under `configs/`. `maplibre-gl` is added as a Rollup external via the
helper's `external`/`globals` options. No runtime or public-API change.
