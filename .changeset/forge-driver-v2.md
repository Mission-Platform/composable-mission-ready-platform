---
"@mission-platform/vite-plugin-forge": major
"@mission-platform/forge-cms-plugin-api": major
---

Publish the lazy, session-owned Forge build driver and native plugin adapters.

BREAKING CHANGE: Replace eager and multi-config `defineTsdownForge*` helpers with
`tsdownForgeComponentPlugins`, `tsdownForgeHookPlugins`, and
`tsdownForgeCmsPlugins` added to one `defineTsdownLibrary` call. Target plugins
remain explicit and caller-owned; generation, declarations, and publication now
run from bundler lifecycle hooks with transactional rollback on failure.
