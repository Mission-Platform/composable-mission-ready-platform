---
'@mission-platform/eslint-config': patch
---

guard turbo config name lookup with optional chaining

The flat-config mapping over `turboConfig` now reads `cfg?.name` instead of `cfg.name`, so a `null`/`undefined` entry no longer throws while ESLint loads the shared config.
