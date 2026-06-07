---
'@mission-platform/harper': patch
---

use shared `@mission-platform/typescript-config` and `@mission-platform/vite-config`

Migrates `vite.config.ts`, `vitest.config.ts`, and the `tsconfig.*.json`
files to extend the shared workspaces under `configs/`. `monaco-editor`
is added as a Rollup external via the helper's `external` option, and
`preserveModules: false` is layered in via `overrides`. No runtime or
public-API change.
