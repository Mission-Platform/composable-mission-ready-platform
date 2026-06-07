---
'@mission-platform/tokens': patch
---

use shared `@mission-platform/typescript-config` and `@mission-platform/vite-config`

Migrates `vite.config.ts` and the `tsconfig.*.json` files to extend the
shared workspaces under `configs/`. No runtime or public-API change.
