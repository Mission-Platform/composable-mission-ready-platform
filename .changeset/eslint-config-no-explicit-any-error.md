---
'@mission-platform/eslint-config': minor
---

promote `@typescript-eslint/no-explicit-any` from `warn` to `error`

Explicit `any` usage is now a lint error across all consuming
workspaces, encouraging stricter typing in shared code.
