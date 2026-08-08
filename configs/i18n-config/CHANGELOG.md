# @mission-platform/i18n-config

## 0.2.1

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
