# Develop the Forge Vite plugin

## Install and verify

Run focused checks from the repository root:

```bash
pnpm install
pnpm --filter @mission-platform/vite-plugin-forge build:check
pnpm --filter @mission-platform/vite-plugin-forge test
```

Build with `pnpm --filter @mission-platform/vite-plugin-forge build`. Bundles
and declarations are emitted to `dist/`; do not commit local build output.

## Change the compiler

Keep parsing, normalization, semantic IR, caching, and diagnostics neutral.
Target lowering and source generation belong in the selected
`@mission-platform/forge-plugin-*` package. Add regression coverage for cache
identity, invalidation, diagnostics, generated artifacts, and caller plugin
preservation when changing the driver.

The package must remain usable from both Vite and tsdown. Do not add a target
switch table or framework runtime dependency to the neutral driver. Update the
[compiler pipeline reference](../reference/compiler.md) when a public stage or
artifact contract changes.
