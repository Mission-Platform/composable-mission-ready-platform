# Develop the token package

## Install and verify

Run the package checks from the repository root:

```bash
pnpm install
pnpm --filter @mission-platform/tokens lint
pnpm --filter @mission-platform/tokens lint:style
pnpm --filter @mission-platform/tokens build
```

The build produces JavaScript and declaration output in `dist/`. Generated
SCSS and TypeScript sources under `src/generated/` are derived artifacts and
must remain deterministic.

## Change a token

Edit the source JSON under `tokens/` and keep its DTCG path stable unless the
change is intentional and documented. Component contracts live under
`tokens/component/<atomic-level>/`; component sources should not duplicate
shared token paths. Use the existing token-generation scripts and review both
SCSS and TypeScript output before publishing.

The package is framework-neutral. Theme behavior is selected by the consuming
stylesheet through the exported SCSS entry points; this package does not own
application theme state or component markup.