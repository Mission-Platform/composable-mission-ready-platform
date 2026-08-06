---
'@mission-platform/vite-plugin-token-overrides': minor
---

add `@mission-platform/vite-plugin-token-overrides`, a reusable Vite plugin for design-token overrides

Lifts the former per-app `generate-token-overrides.ts` script into a shared, installable Vite plugin so any app can re-skin `@mission-platform/tokens` without a manual build step. The plugin reads a DTCG-style `*.tokens.json` override document, transforms it into a `:root { --mp-*: … }` SCSS partial, and writes it to disk on `buildStart` / dev-server start (regenerating on change), which a stylesheet then `@import`s after the base tokens so the overrides win the cascade. It also re-exports the token-override transform (`buildTokenOverrideScss`, `flattenOverrides`, and the related types), which `@mission-platform/mcp-shared` now consumes for the consumer MCP `generate_token_override` tool. `apps/service-monitor` is migrated to the plugin (its `tokens:generate` script and committed `overrides.generated.scss` are removed, and its `design-tokens/` sources moved to the app root).
