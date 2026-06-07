---
'@mission-platform/components': patch
---

use shared `@mission-platform/typescript-config` and `@mission-platform/vite-config`

Migrates `vite.config.ts`, `vitest.config.ts`, and the `tsconfig.*.json`
files to extend the shared workspaces under `configs/`. `tsconfig.test.json`
now explicitly excludes `*.stories.tsx` (the shared `base` preset enables
`noUnusedParameters`, which the previous local test config did not). No
runtime or public-API change.
