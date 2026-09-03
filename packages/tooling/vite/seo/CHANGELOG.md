# @mission-platform/vite-plugin-seo

## 0.1.2

### Patch Changes

- Updated dependencies [c32bb83]
- Updated dependencies [8a15dbc]
- Updated dependencies [48f26d1]
  - @mission-platform/seo@0.3.4

## 0.1.1

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

- Updated dependencies [ac98203]
- Updated dependencies [ffa5129]
- Updated dependencies [84714b4]
- Updated dependencies [f67e304]
- Updated dependencies [b23115e]
  - @mission-platform/seo@0.3.3

## 0.1.0

### Minor Changes

- 6d5a855: add vite plugin that generates robots.txt and sitemap.xml at build time

  Introduces the `@mission-platform/vite-plugin-seo` workspace, whose `seoPlugin`
  runs the deterministic `@mission-platform/seo` builders during `vite build` (and
  on dev-server start), replacing the per-app `scripts/generate-seo-files.ts` +
  `prebuild` Node scripts.

### Patch Changes

- 7bb5b4d: annotate the no-op plugin-context logger stub in the plugin tests
- Updated dependencies [6551abb]
  - @mission-platform/seo@0.3.2

## 0.1.0

### Minor Changes

- 6d5a855: add vite plugin that generates robots.txt and sitemap.xml at build time

  Introduces the `@mission-platform/vite-plugin-seo` workspace, whose `seoPlugin`
  runs the deterministic `@mission-platform/seo` builders during `vite build` (and
  on dev-server start), replacing the per-app `scripts/generate-seo-files.ts` +
  `prebuild` Node scripts.

### Patch Changes

- 7bb5b4d: annotate the no-op plugin-context logger stub in the plugin tests
- Updated dependencies [6551abb]
  - @mission-platform/seo@0.3.2

## 0.1.0

### Minor Changes

- 6d5a855: add vite plugin that generates robots.txt and sitemap.xml at build time

  Introduces the `@mission-platform/vite-plugin-seo` workspace, whose `seoPlugin`
  runs the deterministic `@mission-platform/seo` builders during `vite build` (and
  on dev-server start), replacing the per-app `scripts/generate-seo-files.ts` +
  `prebuild` Node scripts.

### Patch Changes

- 7bb5b4d: annotate the no-op plugin-context logger stub in the plugin tests
- Updated dependencies [6551abb]
  - @mission-platform/seo@0.3.2

## 0.1.0

### Minor Changes

- 6d5a855: add vite plugin that generates robots.txt and sitemap.xml at build time

  Introduces the `@mission-platform/vite-plugin-seo` workspace, whose `seoPlugin`
  runs the deterministic `@mission-platform/seo` builders during `vite build` (and
  on dev-server start), replacing the per-app `scripts/generate-seo-files.ts` +
  `prebuild` Node scripts.

### Patch Changes

- 7bb5b4d: annotate the no-op plugin-context logger stub in the plugin tests
- Updated dependencies [6551abb]
  - @mission-platform/seo@0.3.2
