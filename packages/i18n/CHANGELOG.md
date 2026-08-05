# @mission-platform/i18n

## 1.0.0

### Major Changes

- 651c349: rebuild i18n as a framework-agnostic i18next wrapper

  `@mission-platform/i18n` is now built on [i18next](https://www.i18next.com/)
  instead of vue-i18n. The root entry is framework-neutral — `createMpI18n()`
  returns a plain, synchronously-initialised i18next instance with single-brace interpolation (`{name}`) and HTML
  escaping left to the framework — and two thin adapter subpaths are added: `@mission-platform/i18n/vue` (built on
  `i18next-vue`, exporting `createMpI18nVue` + a reactive `useI18n`) and `@mission-platform/i18n/react`
  (built on `react-i18next`, exporting `MpI18nProvider` + `useI18n`).

  BREAKING CHANGE: the root export no longer installs a Vue plugin or exposes a Vue `useI18n`. Install the instance with
  `app.use(createMpI18nVue(createMpI18n(...)))`
  and import `useI18n` from `@mission-platform/i18n/vue` (or `/react`). `createMpI18n`
  now returns an i18next instance (`i18n.t`, `i18n.changeLanguage`, `i18n.language`)
  rather than a vue-i18n instance with `i18n.global`. Consumers of the Vue adapter must provide `vue` + `i18next-vue`
  (React consumers: `react`/`react-dom` +
  `react-i18next`) as they are optional peer dependencies.

### Minor Changes

- 651c349: add `mp.<workspace>` i18next namespaces with per-namespace app overrides

  `@mission-platform/i18n` now groups strings into i18next namespaces: every package lives under `mp.<package_name>` and
  every app under `mp.<app_name>`. New exports `mpNamespace('<workspace>')` (e.g. `mp.breakpoints`) and
  `localeNamespaces(locale, bundles)` (turns the extractor's namespace-keyed runtime `src/locales/<locale>.yaml` into
  the option shape) join the existing core API, alongside the `namespaces` and `overrides` options on `createMpI18n`
  and the `deepMergeMessages`/`deepMergeLocales` helpers.

  Apps set their own `namespace: mpNamespace('<app>')` as the default (which falls back to every other namespace, so
  component code keeps resolving keys it owns)
  and can deep-merge per-namespace `overrides` on top of a package's strings to relabel just the keys they need. The
  Vue/React `useI18n(namespace?)` accepts an optional namespace, and `breakpoint-debug` now resolves its own
  `mp.breakpoints`
  namespace.

### Patch Changes

- 4ffe6a7: align build tsconfig compiler options and add the test project reference
- d37e102: add targeted eslint-disable comments for new unicorn rule violations
- d39b6fc: add per-workspace reference documentation and refresh llms.txt/README metadata

## 0.4.1

### Patch Changes

- dc84af7: create the vue-i18n instance in Composition API mode (`legacy: false`)

  `createMpI18n` now sets `legacy: false`, matching how every consumer already uses the package (`useI18n()` in
  `<script setup>`). This makes `i18n.global.locale` a `WritableComputedRef`, so apps can read and assign the active
  locale via `i18n.global.locale.value` without TypeScript errors.

## 0.4.0

### Minor Changes

- f0a0e11: emit code-split, tree-shakeable library builds

  `defineLibraryConfig` now preserves the source module graph (one output file per module) and externalises each
  package's own `dependencies`/`peerDependencies` by default, so consumers get first-class tree shaking and code
  splitting. Packages that ship a single self-contained artifact (workers, WASM entries, the flat token bundle) opt out
  via the new `preserveModules: false` option. The main entry of each preserved-module package is now emitted as
  `dist/index.js`.

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

  Migrates `vite.config.ts`, `vitest.config.ts`, `tsconfig.build.json`, and `tsconfig.node.json` to extend the shared
  workspaces under
  `configs/`. No runtime or public-API change.

- 05d31c9: normalize lint and format scripts across all workspaces

  Add consistent `lint:fix`, `lint:style:fix`, and `format:write` scripts to every workspace, and make `format` run
  `prettier --check` instead of `prettier --write` so it can be used as a non-mutating verification step.

- cf89515: enable tree shaking support when consumed by apps

  Declares `"sideEffects"` in each package's `package.json` so app bundlers (Vite/Rollup) can safely drop unused
  exports. Pure-TypeScript packages (`harper`, `hunspell`, `i18n`) opt out of side effects entirely with
  `"sideEffects": false`. Packages that ship styles and/or Vue SFCs (`breakpoints`, `components`, `icons`, `map`,
  `tokens`) keep `*.css`,
  `*.scss`, and `*.vue` files marked as side-effectful so component styles and SCSS entrypoints are preserved.

## 0.2.0

### Minor Changes

- ba565b3: refactor locale strategy to use SFC-local i18n blocks

  Remove file-based locale modules (`defineLocales`, `mergeLocales`, `MpMessages`, `MpLocales` types,
  `./locales` entry point, and `i18n:compile` script). Component locale strings now live directly in each SFC `<i18n>`
  block. `createMpI18n` still accepts optional `modules` and `messages` for app-level custom keys.

## 0.1.0

### Minor Changes

- feat: initial i18n package with locale definition helpers, merging utilities and Vue I18n integration
