---
'@mission-platform/i18n': patch
---

use shared `@mission-platform/typescript-config` and `@mission-platform/vite-config`

Migrates `vite.config.ts`, `vitest.config.ts`, `tsconfig.build.json`,
and `tsconfig.node.json` to extend the shared workspaces under
`configs/`. No runtime or public-API change.
