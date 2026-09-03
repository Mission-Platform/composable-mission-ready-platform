# @mission-platform/postcss-config

## 0.1.3

### Patch Changes

- c32bb83: centralize package documentation generation in the repository build
- 8a15dbc: add generated package API references and build-time documentation extraction

## 0.1.2

### Patch Changes

- ffa5129: relicense the project from MIT to BSD-4-Clause
- f67e304: migrate library builds to tsdown

  Every library workspace across `packages/`, `vite-plugins/`, `configs/`, `workers/`, and the MCP servers now builds
  with [tsdown](https://tsdown.dev) (Rolldown/Oxc)
  instead of `tsc` / `vite build`. A new shared `@mission-platform/tsdown-config`
  package exposes the generic `defineTsdownLibrary` / `defineTsdownVueLibrary`
  helpers, and `@mission-platform/vite-plugin-forge` now additionally exports tsdown-compatible forge helpers
  (`defineTsdownForgeHooks(All)`,
  `defineTsdownForgeComponents(All)`, `defineTsdownForgeStoryblok(All)`) plus the Rolldown stage-2 adapters needed to
  reproduce the write-once multi-framework output under tsdown.

  This is a build-tooling change only: every package's public `exports`, `dist`
  layout, `types`, and framework auto-resolution (`mp:*` conditions) are unchanged, so consumers are unaffected. The
  `@mission-platform/forms` `web-components`
  target remains a hybrid Vite step, and `@mission-platform/hunspell` keeps its
  `build:wasm` toolchain.

## 0.1.1

### Patch Changes

- 021a647: Move shared tooling configs from `packages/` into a dedicated `configs/` workspace directory. Package names
  and public entry points are unchanged; consumers continue to import via `@mission-platform/<config-name>`.
- 05d31c9: normalize lint and format scripts across all workspaces

  Add consistent `lint:fix`, `lint:style:fix`, and `format:write` scripts to every workspace, and make `format` run
  `prettier --check` instead of `prettier --write` so it can be used as a non-mutating verification step.

- 91deb58: switch `@mission-platform/postcss-config` from `vite build` to pure `tsc`

  Aligns with the new convention that all `configs/*` packages build with
  `tsc`, and migrates its tsconfig to extend
  `@mission-platform/typescript-config/library`.

## 0.1.0

### Minor Changes

- feat: initial PostCSS config for the platform
