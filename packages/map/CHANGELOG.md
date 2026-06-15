# @mission-platform/map

## 0.2.1

### Patch Changes

- Updated dependencies [576b2ed]
- Updated dependencies [e02caaf]
- Updated dependencies [81b33bd]
- Updated dependencies [81b33bd]
- Updated dependencies [c1834ea]
- Updated dependencies [81b33bd]
- Updated dependencies [81b33bd]
- Updated dependencies [81b33bd]
- Updated dependencies [81b33bd]
- Updated dependencies [81b33bd]
- Updated dependencies [e02caaf]
- Updated dependencies [81b33bd]
- Updated dependencies [81b33bd]
- Updated dependencies [81b33bd]
- Updated dependencies [81b33bd]
- Updated dependencies [81b33bd]
- Updated dependencies [81b33bd]
- Updated dependencies [81b33bd]
- Updated dependencies [81b33bd]
- Updated dependencies [81b33bd]
- Updated dependencies [81b33bd]
- Updated dependencies [81b33bd]
- Updated dependencies [81b33bd]
- Updated dependencies [81b33bd]
- Updated dependencies [81b33bd]
- Updated dependencies [81b33bd]
- Updated dependencies [577c4d7]
- Updated dependencies [81b33bd]
- Updated dependencies [a085437]
- Updated dependencies [e02caaf]
- Updated dependencies [e02caaf]
- Updated dependencies [577c4d7]
- Updated dependencies [577c4d7]
- Updated dependencies [dfb4eaa]
- Updated dependencies [81b33bd]
- Updated dependencies [577c4d7]
- Updated dependencies [81b33bd]
- Updated dependencies [81b33bd]
  - @mission-platform/components@3.0.0
  - @mission-platform/i18n@0.4.0
  - @mission-platform/icons@1.0.0
  - @mission-platform/tokens@0.3.0

## 0.2.0

### Minor Changes

- f0a0e11: emit code-split, tree-shakeable library builds

  `defineLibraryConfig` now preserves the source module graph (one output file per
  module) and externalises each package's own `dependencies`/`peerDependencies` by
  default, so consumers get first-class tree shaking and code splitting. Packages
  that ship a single self-contained artifact (workers, WASM entries, the flat token
  bundle) opt out via the new `preserveModules: false` option. The main entry of
  each preserved-module package is now emitted as `dist/index.js`.

### Patch Changes

- Updated dependencies [f0a0e11]
- Updated dependencies [a6ac78b]
- Updated dependencies [a6ac78b]
  - @mission-platform/icons@1.0.0
  - @mission-platform/i18n@0.4.0
  - @mission-platform/tokens@0.3.0
  - @mission-platform/components@2.0.0

## 0.1.6

### Patch Changes

- 266acd6: add `build:watch` script for incremental rebuilds during development
- Updated dependencies [266acd6]
- Updated dependencies [895c0e3]
- Updated dependencies [5053fb0]
- Updated dependencies [ccc2c34]
- Updated dependencies [37571da]
- Updated dependencies [1e135ae]
- Updated dependencies [c0e4b38]
- Updated dependencies [387331e]
- Updated dependencies [6a1d844]
- Updated dependencies [c958b81]
- Updated dependencies [72c7c44]
- Updated dependencies [3944f87]
- Updated dependencies [b47b849]
- Updated dependencies [e917051]
- Updated dependencies [3b322ce]
- Updated dependencies [58f2f50]
- Updated dependencies [a5d10fd]
- Updated dependencies [3944f87]
- Updated dependencies [3944f87]
- Updated dependencies [3944f87]
- Updated dependencies [3944f87]
- Updated dependencies [b162ee6]
  - @mission-platform/components@1.0.0
  - @mission-platform/i18n@0.3.1
  - @mission-platform/icons@0.2.0
  - @mission-platform/tokens@0.2.0

## 0.1.5

### Patch Changes

- Updated dependencies [2b0cce4]
  - @mission-platform/components@0.3.0

## 0.1.4

### Patch Changes

- 65106e2: use shared `@mission-platform/typescript-config` and `@mission-platform/vite-config`

  Migrates `vite.config.ts`, `vitest.config.ts`, and the `tsconfig.*.json`
  files (build, node, test, storybook) to extend the shared workspaces
  under `configs/`. `maplibre-gl` is added as a Rollup external via the
  helper's `external`/`globals` options. No runtime or public-API change.

- 05d31c9: normalize lint and format scripts across all workspaces

  Add consistent `lint:fix`, `lint:style:fix`, and `format:write` scripts to every workspace, and make `format` run
  `prettier --check` instead of `prettier --write` so it can be used as a non-mutating verification step.

- 6679759: adopt shared `stories` tsconfig preset for Storybook story files

  Each package that ships Storybook stories now has a dedicated
  `tsconfig.stories.json` extending
  `@mission-platform/typescript-config/stories` and is registered as a
  project reference from the workspace's root `tsconfig.json`. This gives
  `src/**/*.stories.{ts,tsx}` files a dedicated TypeScript project so
  ESLint's `projectService` can type-check them out of the box, and
  removes the legacy `tsconfig.storybook.json` from
  `@mission-platform/map` in favour of the shared name.

- cf89515: enable tree shaking support when consumed by apps

  Declares `"sideEffects"` in each package's `package.json` so app bundlers
  (Vite/Rollup) can safely drop unused exports. Pure-TypeScript packages
  (`harper`, `hunspell`, `i18n`) opt out of side effects entirely with
  `"sideEffects": false`. Packages that ship styles and/or Vue SFCs
  (`breakpoints`, `components`, `icons`, `map`, `tokens`) keep `*.css`,
  `*.scss`, and `*.vue` files marked as side-effectful so component
  styles and SCSS entrypoints are preserved.

- Updated dependencies [a77eafa]
- Updated dependencies [d2bf0e1]
- Updated dependencies [c8f7e0a]
- Updated dependencies [14521e9]
- Updated dependencies [37a17e4]
- Updated dependencies [2e27467]
- Updated dependencies [05d31c9]
- Updated dependencies [6679759]
- Updated dependencies [cf89515]
- Updated dependencies [8314555]
  - @mission-platform/components@0.2.2
  - @mission-platform/i18n@0.3.0
  - @mission-platform/icons@0.1.3
  - @mission-platform/tokens@0.1.2

## 0.1.3

### Patch Changes

- 5dee755: docs(map): add Storybook stories for all map components

  Add stories for MapLibre, MapLayer, MapMarker, MapPopup, and MapSource
  components with realistic args and controls so each component is browsable
  and visually testable in the Storybook catalogue.

- Updated dependencies [ee616a0]
- Updated dependencies [8687deb]
  - @mission-platform/icons@0.1.2
  - @mission-platform/components@0.2.1

## 0.1.2

### Patch Changes

- ba565b3: remove empty locales placeholder and ./locales export

  The map package had a placeholder `src/locales/index.ts` that depended on
  `defineLocales` from `@mission-platform/i18n`. Since that API has been removed
  and the map package has no translated strings, the file and its `./locales`
  package export are dropped.

- Updated dependencies [ba565b3]
- Updated dependencies [ba565b3]
  - @mission-platform/components@0.2.0
  - @mission-platform/i18n@0.2.0
  - @mission-platform/icons@0.1.1
  - @mission-platform/tokens@0.1.1

## 0.1.1

### Patch Changes

- 735d1d6: Improve `useDrawing` composable and map test infrastructure:

  - `selectFeature` parameter is now optional (`id?: FeatureId`) for more ergonomic deselection calls
  - Fix spec files to use `mockImplementation(() => {})` instead of `mockReturnValue()` for `getSource` and `getLayer`
    mocks, avoiding misleading `undefined` return type
  - `mountWithMap` test utility now accepts `Component` type for extra components and uses a type-safe `mergedOptions`
    variable
  - Add `lib` compiler option to `tsconfig.build.json` and `tsconfig.test.json` for explicit DOM/ES2022 lib targets
  - Exclude stories files from `tsconfig.test.json` include and add `tsconfig.storybook.json` reference to root
    `tsconfig.json`
  - Fix `arguments_` destructuring in map-draw and map-layer specs to use index access instead of destructured parameter
    patterns
  - Fix type-unsafe `arguments_.geodesic` access in map-libre.stories.ts by casting through `Record<string, unknown>`

- 30480f4: Remove `@storybook/vue3-vite` from devDependencies. Storybook is an app-level concern and must not be a
  dependency of a library package; it lives exclusively in `apps/storybook`. Also remove unnecessary `as Story` type
  assertion in `map-layer.stories.ts` — the variable's declared type annotation already provides full type checking.
- Updated dependencies [b5e4353]
- Updated dependencies [5ed2115]
- Updated dependencies [7b0b1ca]
- Updated dependencies [b5bbd19]
- Updated dependencies [74736b6]
- Updated dependencies [bb5e252]
  - @mission-platform/components@0.1.1
  - @mission-platform/icons@0.1.1
  - @mission-platform/tokens@0.1.1
  - @mission-platform/i18n@0.1.0

## 0.1.0

### Minor Changes

- feat: initial map package with Vue 3 map components, composables, i18n locales and test utilities

### Patch Changes

- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
  - @mission-platform/components@0.1.0
  - @mission-platform/i18n@0.1.0
  - @mission-platform/icons@0.1.0
  - @mission-platform/tokens@0.1.0
