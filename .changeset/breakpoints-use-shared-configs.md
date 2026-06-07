---
'@mission-platform/breakpoints': patch
---

use shared `@mission-platform/typescript-config` and `@mission-platform/vite-config`

Migrates the package's `vite.config.ts`, `vitest.config.ts`, and the
four `tsconfig.*.json` files to extend the shared workspaces under
`configs/`. No runtime or public-API change — `dist/` output is
identical.
