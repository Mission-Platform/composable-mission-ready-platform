---
'@mission-platform/eslint-config': minor
---

add eslint-config-turbo to flag environment variables that are not declared in `turbo.json` (`globalEnv` / per-task `env`) and would otherwise silently break Turborepo's cache hashing
