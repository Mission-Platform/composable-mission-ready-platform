# @mission-platform/i18n

## 0.4.1

### Patch Changes

- dc84af7: create the vue-i18n instance in Composition API mode (`legacy: false`)

  `createMpI18n` now sets `legacy: false`, matching how every consumer already uses the package (`useI18n()` in `<script setup>`). This makes `i18n.global.locale` a `WritableComputedRef`, so apps can read and assign the active locale via `i18n.global.locale.value` without TypeScript errors.

## 0.4.0

### Minor Changes

- f0a0e11: emit code-split, tree-shakeable library builds

  `defineLibraryConfig` now preserves the source module graph (one output file per
  module) and externalises each package's own `dependencies`/`peerDependencies` by
  default, so consumers get first-class tree shaking and code splitting. Packages
  that ship a single self-contained artifact (workers, WASM entries, the flat token
  bundle) opt out via the new `preserveModules: false` option. The main entry of
  each preserved-module package is now emitted as `dist/index.js`.

## 0.3.1

### Patch Changes

- 266acd6: add `build:watch` script for incremental rebuilds during development

## 0.3.0

### Minor Changes

- d2bf0e1: Export public locale types (`MpLocaleModule`, `MpLocales`, `MpMessageObject`, `MpMessageValue`) from the
  package entry point so consumers can type their locale message bundles without reaching into internal paths.
- 2e27467: Support nested message objects in `MpLocaleModule` and `MpLocales` types. Locale message values can now be
  either strings or recursively nested message objects, aligning with vue-i18n's native message schema.

### Patch Changes

- c8f7e0a: use shared `@mission-platform/typescript-config` and `@mission-platform/vite-config`

  Migrates `vite.config.ts`, `vitest.config.ts`, `tsconfig.build.json`,
  and `tsconfig.node.json` to extend the shared workspaces under
  `configs/`. No runtime or public-API change.

- 05d31c9: normalize lint and format scripts across all workspaces

  Add consistent `lint:fix`, `lint:style:fix`, and `format:write` scripts to every workspace, and make `format` run
  `prettier --check` instead of `prettier --write` so it can be used as a non-mutating verification step.

- cf89515: enable tree shaking support when consumed by apps

  Declares `"sideEffects"` in each package's `package.json` so app bundlers
  (Vite/Rollup) can safely drop unused exports. Pure-TypeScript packages
  (`harper`, `hunspell`, `i18n`) opt out of side effects entirely with
  `"sideEffects": false`. Packages that ship styles and/or Vue SFCs
  (`breakpoints`, `components`, `icons`, `map`, `tokens`) keep `*.css`,
  `*.scss`, and `*.vue` files marked as side-effectful so component
  styles and SCSS entrypoints are preserved.

## 0.2.0

### Minor Changes

- ba565b3: refactor locale strategy to use SFC-local i18n blocks

  Remove file-based locale modules (`defineLocales`, `mergeLocales`, `MpMessages`, `MpLocales` types,
  `./locales` entry point, and `i18n:compile` script). Component locale strings now live directly in
  each SFC `<i18n>` block. `createMpI18n` still accepts optional `modules` and `messages` for app-level
  custom keys.

## 0.1.0

### Minor Changes

- feat: initial i18n package with locale definition helpers, merging utilities and Vue I18n integration
