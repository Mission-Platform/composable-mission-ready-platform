# @mission-platform/tsdown-config

Shared tsdown library-build helpers for publishable workspaces.

## Install and use

```bash
pnpm add --save-dev @mission-platform/tsdown-config
```

Use the package from a workspace `tsdown.config.ts` and keep entry points,
external dependencies, and output constraints local to the package being built.
Generated declarations and bundles belong in that package's `dist/` directory.

## Contribute

Run `pnpm --filter @mission-platform/tsdown-config lint` and its format check.
Preserve deterministic output and do not add framework-specific target branches
to the neutral build helper.