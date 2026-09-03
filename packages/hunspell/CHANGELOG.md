# @mission-platform/hunspell

## 0.4.2

### Patch Changes

- c32bb83: centralize package documentation generation in the repository build
- 8a15dbc: add generated package API references and build-time documentation extraction

## 0.4.1

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

## 0.4.0

### Minor Changes

- edb785f: extract a framework-agnostic `attachHunspellMonaco` core

  The imperative Hunspell ↔ Monaco integration (worker spawn, debounced checking, marker mapping, quick-fix code-action
  provider) is now a framework-agnostic
  `attachHunspellMonaco(editor, monaco, language)` helper returning a
  `{ dispose, recheck }` handle. The Vue `useHunspellMonaco` composable delegates to it, and it is exported so non-Vue
  consumers (e.g. the write-once
  `@mission-platform/components` `BaseMonacoEditor`) can wire spell checking from a single shared implementation.

### Patch Changes

- d39b6fc: add per-workspace reference documentation and refresh llms.txt/README metadata

## 0.3.2

### Patch Changes

- 075a5a2: normalize source formatting and import ordering

  Apply the repo-wide Prettier/ESLint formatting pass (line reflow, attribute and import ordering, barrel-import paths,
  and simplified GeoJSON `Feature` typings in `map`). No runtime behaviour changes.

## 0.3.1

### Patch Changes

- f0a0e11: emit code-split, tree-shakeable library builds

  `defineLibraryConfig` now preserves the source module graph (one output file per module) and externalises each
  package's own `dependencies`/`peerDependencies` by default, so consumers get first-class tree shaking and code
  splitting. Packages that ship a single self-contained artifact (workers, WASM entries, the flat token bundle) opt out
  via the new `preserveModules: false` option. The main entry of each preserved-module package is now emitted as
  `dist/index.js`.

## 0.3.0

### Minor Changes

- a5d10fd: move `useHunspellMonaco` composable from `@mission-platform/components` to `@mission-platform/hunspell` to
  mirror the structure of `@mission-platform/harper`. The composable is now exported from `@mission-platform/hunspell`;
  update imports accordingly.

### Patch Changes

- 266acd6: add `build:watch` script for incremental rebuilds during development
- a443677: migrate vite build config to rolldownOptions and externalize monaco-editor
- fef2a3a: include `vitest.config.ts` in `tsconfig.node.json` so ESLint's TypeScript project service can parse it, and
  reorder worker imports to satisfy `import/order`
- 3c17696: correct `types` entry points in `package.json` to match the actual emitted declaration files (
  `./dist/index.d.ts` for the main entry and `./dist/worker/hunspell.worker.d.ts` for the `./worker` subpath)
- ca1660f: reorganise package src layout into logical folders (`monaco/`, `worker/`, and — for hunspell — `wasm/`); the
  public package entry points and built output filenames are unchanged

## 0.2.2

### Patch Changes

- 8a910f9: use shared `@mission-platform/typescript-config` and `@mission-platform/vite-config`

  Migrates `vite.config.ts`, `tsconfig.build.json`, and `tsconfig.node.json`
  to extend the shared workspaces under `configs/`. The `assetsInclude`

  - `assetFileNames` settings (for the WebAssembly artefact) are layered in via `overrides`. No runtime or public-API
    change.

- 05d31c9: normalize lint and format scripts across all workspaces

  Add consistent `lint:fix`, `lint:style:fix`, and `format:write` scripts to every workspace, and make `format` run
  `prettier --check` instead of `prettier --write` so it can be used as a non-mutating verification step.

- cf89515: enable tree shaking support when consumed by apps

  Declares `"sideEffects"` in each package's `package.json` so app bundlers (Vite/Rollup) can safely drop unused
  exports. Pure-TypeScript packages (`harper`, `hunspell`, `i18n`) opt out of side effects entirely with
  `"sideEffects": false`. Packages that ship styles and/or Vue SFCs (`breakpoints`, `components`, `icons`, `map`,
  `tokens`) keep `*.css`,
  `*.scss`, and `*.vue` files marked as side-effectful so component styles and SCSS entrypoints are preserved.

## 0.2.1

### Patch Changes

- 40b0054: fix build script to exclude wasm build step from default build

## 0.2.0

### Minor Changes

- 74736b6: Add `tokenize` method to `HunspellChecker` with `TokenResult` and `TokenResultVector` types; export new types
  from package index. Refactor hunspell build script to separate `build:wasm` and `build:ts` steps. Remove redundant
  `role="region"` from `BaseMonacoEditor`.

### Patch Changes

- ce4e4f2: switch docker build to buildx and add github actions cache backend support
  - replace `docker build` with `docker buildx build` in build.sh for multi-platform support
  - add optional gha cache backend via `GHA_CACHE=1` env var or auto-detection of `GITHUB_ACTIONS=true`
  - update dockerfile base image from `emscripten/emsdk:5.0.7-arm64` to the multi-platform `emscripten/emsdk:5.0.7`
  - add `docker/setup-buildx-action@v4` step to the publish workflow before dependency installation

## 0.1.0

### Minor Changes

- feat: initial Hunspell spell-checking package with WASM bindings and dictionary support
