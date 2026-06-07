---
'@mission-platform/icons': patch
---

use shared `@mission-platform/typescript-config` and `@mission-platform/vite-config`

Migrates `vite.config.ts`, `vitest.config.ts`, and the `tsconfig.*.json`
files to extend the shared workspaces under `configs/`. The
`vite-svg-loader` plugin is layered in via `overrides`. No runtime or
public-API change.
