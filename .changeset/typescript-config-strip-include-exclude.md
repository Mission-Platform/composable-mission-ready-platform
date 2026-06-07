---
'@mission-platform/typescript-config': patch
---

remove `include`/`exclude` from shared tsconfig presets

TypeScript resolves `include` and `exclude` globs relative to the
tsconfig file that declares them, not relative to the consumer that
extends them — so the globs shipped in the `app`, `library`, `node`,
and `test` presets pointed at files inside `configs/typescript-config/`
and never matched anything in consuming workspaces.

Consumers must now declare their own `include`/`exclude` (which is what
existing `packages/*` and `apps/*` workspaces already do). The
`compilerOptions` portion of each preset is unchanged.
