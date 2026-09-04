# `@mission-platform/forge-adapters`

Framework adapters for the framework-neutral `@mission-platform/forge-jsx`
runtime. Components remain authored once against Forge JSX; consumers select
only the adapter for the framework they render with.

## Exports

- `@mission-platform/forge-adapters/react`
- `@mission-platform/forge-adapters/vue`
- `@mission-platform/forge-adapters/solid`
- `@mission-platform/forge-adapters/svelte`
- `@mission-platform/forge-adapters/web-components`

The corresponding framework packages are optional peer dependencies. Install
the framework and use its adapter entry point directly.
