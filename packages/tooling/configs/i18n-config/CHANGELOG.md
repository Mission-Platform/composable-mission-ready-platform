# @mission-platform/i18n-config

## 0.2.2

### Patch Changes

- c32bb83: centralize package documentation generation in the repository build
- 8a15dbc: add generated package API references and build-time documentation extraction
- 0c74365: Harden content rendering and scanner runtime behavior
- 31ed685: Run i18n extraction from each configured workspace through the root Turbo task

## 0.2.1

### Patch Changes

- ffa5129: relicense the project from MIT to BSD-4-Clause
- f67e304: migrate library builds to tsdown

  Every library workspace across `packages/`, `packages/tooling/vite/`, `packages/tooling/configs/`, `packages/edge/workers/`, and the MCP servers now builds
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

## 0.2.0

### Minor Changes

- 57cb426: add shared i18n configuration workspace for Mission Platform

## 0.2.0

### Minor Changes

- 57cb426: add shared i18n configuration workspace for Mission Platform

## 0.2.0

### Minor Changes

- 57cb426: add shared i18n configuration workspace for Mission Platform

## 0.2.0

### Minor Changes

- 57cb426: add shared i18n configuration workspace for Mission Platform
