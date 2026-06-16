---
'@mission-platform/tokens': patch
'@mission-platform/vite-plugin-tokens': patch
---

source `@pwrs/asimonim` from the workspace pnpm catalog

`@pwrs/asimonim` is now declared in the default pnpm `catalog:` (and added to the
root workspace) so a single version is shared and the asimonim MCP/LSP server can
run from the repo root. The `tokens` and `vite-plugin-tokens` workspaces reference
it via `catalog:`.
