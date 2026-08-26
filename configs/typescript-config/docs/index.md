# @mission-platform/typescript-config

Shared TypeScript presets for every Mission Platform workspace.

## Install and use

```bash
pnpm add --save-dev @mission-platform/typescript-config
```

Extend the matching preset from `tsconfig.json`: use `app` for Vue apps,
`react` for React apps, `library` for package declarations, `node` for tooling,
and `test` for Vitest specs. Framework consumers should also use the matching
`framework-<name>` custom-condition preset. See the package README for the
complete preset table and examples.

## Contribute

Keep shared compiler flags in the presets. Run
`pnpm --filter @mission-platform/typescript-config build:check` and format
checks after changing one.
