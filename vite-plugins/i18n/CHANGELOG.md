# @mission-platform/vite-plugin-i18n

## 0.1.1

### Patch Changes

- 2bee7f1: fix loading of the `virtual:i18n-resources` module in isolated worker environments

  Isolated module runners such as the Cloudflare Worker environment (used by the RedwoodSDK-based `service-monitor` app) hand the resolved virtual id back to the `load` hook with the URL-safe `__x00__` placeholder instead of the raw `\0` null byte. The plugin now recognises both forms in `resolveId` and `load`, so the dev server no longer fails with `Failed to load url __x00__virtual:i18n-resources`.

- 29848a3: reformat sources with prettier

  Formatting-only; no runtime or API changes.

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

- Updated dependencies [96f607a]
- Updated dependencies [6290b4c]
- Updated dependencies [828331e]
- Updated dependencies [ac98203]
- Updated dependencies [ffa5129]
- Updated dependencies [0371781]
- Updated dependencies [f67e304]
  - @mission-platform/i18n@2.0.0

## 0.1.0

### Minor Changes

- 0371fee: add Vite plugin for i18n translation processing

### Patch Changes

- Updated dependencies [651c349]
- Updated dependencies [4ffe6a7]
- Updated dependencies [651c349]
- Updated dependencies [d37e102]
- Updated dependencies [d39b6fc]
  - @mission-platform/i18n@1.0.0

## 0.1.0

### Minor Changes

- 0371fee: add Vite plugin for i18n translation processing

### Patch Changes

- Updated dependencies [651c349]
- Updated dependencies [4ffe6a7]
- Updated dependencies [651c349]
- Updated dependencies [d37e102]
- Updated dependencies [d39b6fc]
  - @mission-platform/i18n@1.0.0

## 0.1.0

### Minor Changes

- 0371fee: add Vite plugin for i18n translation processing

### Patch Changes

- Updated dependencies [651c349]
- Updated dependencies [4ffe6a7]
- Updated dependencies [651c349]
- Updated dependencies [d37e102]
- Updated dependencies [d39b6fc]
  - @mission-platform/i18n@1.0.0

## 0.1.0

### Minor Changes

- 0371fee: add Vite plugin for i18n translation processing

### Patch Changes

- Updated dependencies [651c349]
- Updated dependencies [4ffe6a7]
- Updated dependencies [651c349]
- Updated dependencies [d37e102]
- Updated dependencies [d39b6fc]
  - @mission-platform/i18n@1.0.0
