---
'@mission-platform/hunspell': patch
---

use shared `@mission-platform/typescript-config` and `@mission-platform/vite-config`

Migrates `vite.config.ts`, `tsconfig.build.json`, and `tsconfig.node.json`
to extend the shared workspaces under `configs/`. The `assetsInclude`
+ `assetFileNames` settings (for the WebAssembly artefact) are layered
in via `overrides`. No runtime or public-API change.
