# @mission-platform/harper

## 0.2.1

### Patch Changes

- bd88e5e: rename the component library prefix from `Base` to `Forge`

  BREAKING CHANGE: every exported component symbol and its folder/file and CSS class name is renamed from `Base*`/`base-*` to `Forge*`/`forge-*` (e.g. `BaseButton` → `ForgeButton`), and previously-unprefixed components (`HideAt`, `ShowAt`, `BreakpointDebug`) and every icon (`IconStar` → `ForgeIconStar`) now carry the `Forge` prefix. Consumers must update all imports and template usages accordingly.

- ac98203: normalize composable directories, package barrels, and colocated tests
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

- b23115e: add a workspace-local .prettierignore so build output is excluded from format checks

## 0.2.0

### Minor Changes

- edb785f: extract a framework-agnostic `attachHarperMonaco` core

  The imperative Harper ↔ Monaco integration (worker spawn, debounced checking, marker mapping, quick-fix code-action
  provider) is now a framework-agnostic
  `attachHarperMonaco(editor, monaco, language)` helper returning a
  `{ dispose, recheck }` handle. The Vue `useHarperMonaco` composable delegates to it, and it is exported so non-Vue
  consumers (e.g. the write-once
  `@mission-platform/components` `BaseMonacoEditor`) can wire grammar checking from a single shared implementation.

### Patch Changes

- d39b6fc: add per-workspace reference documentation and refresh llms.txt/README metadata

## 0.1.5

### Patch Changes

- 075a5a2: normalize source formatting and import ordering

  Apply the repo-wide Prettier/ESLint formatting pass (line reflow, attribute and import ordering, barrel-import paths,
  and simplified GeoJSON `Feature` typings in `map`). No runtime behaviour changes.

## 0.1.4

### Patch Changes

- f0a0e11: emit code-split, tree-shakeable library builds

  `defineLibraryConfig` now preserves the source module graph (one output file per module) and externalises each
  package's own `dependencies`/`peerDependencies` by default, so consumers get first-class tree shaking and code
  splitting. Packages that ship a single self-contained artifact (workers, WASM entries, the flat token bundle) opt out
  via the new `preserveModules: false` option. The main entry of each preserved-module package is now emitted as
  `dist/index.js`.

## 0.1.3

### Patch Changes

- 266acd6: add `build:watch` script for incremental rebuilds during development
- 5050849: migrate vite build config to rolldownOptions and bump harper.js to ^2.4.0
- ca1660f: reorganise package src layout into logical folders (`monaco/`, `worker/`, and — for hunspell — `wasm/`); the
  public package entry points and built output filenames are unchanged

## 0.1.2

### Patch Changes

- e0390bc: use shared `@mission-platform/typescript-config` and `@mission-platform/vite-config`

  Migrates `vite.config.ts`, `vitest.config.ts`, and the `tsconfig.*.json`
  files to extend the shared workspaces under `configs/`. `monaco-editor`
  is added as a Rollup external via the helper's `external` option, and
  `preserveModules: false` is layered in via `overrides`. No runtime or public-API change.

- 05d31c9: normalize lint and format scripts across all workspaces

  Add consistent `lint:fix`, `lint:style:fix`, and `format:write` scripts to every workspace, and make `format` run
  `prettier --check` instead of `prettier --write` so it can be used as a non-mutating verification step.

- cf89515: enable tree shaking support when consumed by apps

  Declares `"sideEffects"` in each package's `package.json` so app bundlers (Vite/Rollup) can safely drop unused
  exports. Pure-TypeScript packages (`harper`, `hunspell`, `i18n`) opt out of side effects entirely with
  `"sideEffects": false`. Packages that ship styles and/or Vue SFCs (`breakpoints`, `components`, `icons`, `map`,
  `tokens`) keep `*.css`,
  `*.scss`, and `*.vue` files marked as side-effectful so component styles and SCSS entrypoints are preserved.

## 0.1.1

### Patch Changes

- b5bbd19: add harper grammar and style checker package and integrate into monaco editor
  - add new `@mission-platform/harper` package providing Harper grammar/style checker integration for Monaco editor via
    `useHarperMonaco` composable
  - integrate `useHarperMonaco` into `base-monaco-editor` alongside the existing Hunspell spell-checker
  - add `@mission-platform/harper` as a dependency to `@mission-platform/components` and
    `@mission-platform/my-care-notes`
  - wire `HarperWorker` into `my-care-notes` main entry and declare `HarperEnvironment` global type
  - update root `package.json` build scripts: split assets into `build:tokens` and `build:icons`, add `build:monaco`
    step for hunspell + harper
  - fix hunspell worker dictionary import casing from `en_au` to `en_AU`
