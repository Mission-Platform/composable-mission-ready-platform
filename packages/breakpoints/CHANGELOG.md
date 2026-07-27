# @mission-platform/breakpoints

## 4.0.0

### Major Changes

- 4218ce5: move the breakpoint SCSS layer into the tokens package

  The breakpoint SCSS variables (`$bp-*`, `$breakpoints`), the
  `bp-up`/`bp-down`/`bp-between`/`bp-only` mixins, and the
  `.bp-show-*`/`.bp-hide-*`/`.bp-only-*` visibility utility classes now live in
  `@mission-platform/tokens`, exported as `@mission-platform/tokens/scss/breakpoints-mixins`
  (variables + mixins, no emitted CSS) and `@mission-platform/tokens/scss/breakpoints`
  (the above plus the utility classes).

  BREAKING CHANGE: `@mission-platform/breakpoints` no longer exports
  `./scss/breakpoints` or `./scss/mixins`; import the breakpoint SCSS from
  `@mission-platform/tokens/scss/breakpoints-mixins` (or `.../scss/breakpoints`)
  instead. The package continues to export the `useBreakpoints` composable and the
  `<ShowAt>`/`<HideAt>`/`<BreakpointDebug>` components unchanged.

### Minor Changes

- 47a5188: wrap component styles in the `@layer mp.breakpoints` cascade layer

  The `@mission-platform/breakpoints` SFC `<style>` rules are now wrapped in the
  `@layer mp.breakpoints` cascade layer (any leading `@use` stays outside the
  layer), so unlayered application styles win over them without specificity battles.

### Patch Changes

- 651c349: rebuild i18n as a framework-agnostic i18next wrapper

  `@mission-platform/i18n` is now built on [i18next](https://www.i18next.com/)
  instead of vue-i18n. The root entry is framework-neutral — `createMpI18n()`
  returns a plain, synchronously-initialised i18next instance with single-brace
  interpolation (`{name}`) and HTML escaping left to the framework — and two thin
  adapter subpaths are added: `@mission-platform/i18n/vue` (built on `i18next-vue`,
  exporting `createMpI18nVue` + a reactive `useI18n`) and `@mission-platform/i18n/react`
  (built on `react-i18next`, exporting `MpI18nProvider` + `useI18n`).

  BREAKING CHANGE: the root export no longer installs a Vue plugin or exposes a
  Vue `useI18n`. Install the instance with `app.use(createMpI18nVue(createMpI18n(...)))`
  and import `useI18n` from `@mission-platform/i18n/vue` (or `/react`). `createMpI18n`
  now returns an i18next instance (`i18n.t`, `i18n.changeLanguage`, `i18n.language`)
  rather than a vue-i18n instance with `i18n.global`. Consumers of the Vue adapter
  must provide `vue` + `i18next-vue` (React consumers: `react`/`react-dom` +
  `react-i18next`) as they are optional peer dependencies.

- 651c349: add `mp.<workspace>` i18next namespaces with per-namespace app overrides

  `@mission-platform/i18n` now groups strings into i18next namespaces: every
  package lives under `mp.<package_name>` and every app under `mp.<app_name>`. New
  exports `mpNamespace('<workspace>')` (e.g. `mp.breakpoints`) and
  `localeNamespaces(locale, bundles)` (turns the extractor's namespace-keyed
  runtime `src/locales/<locale>.yaml` into the option shape) join the existing
  core API, alongside the `namespaces` and `overrides` options on `createMpI18n`
  and the `deepMergeMessages`/`deepMergeLocales` helpers.

  Apps set their own `namespace: mpNamespace('<app>')` as the default (which falls
  back to every other namespace, so component code keeps resolving keys it owns)
  and can deep-merge per-namespace `overrides` on top of a package's strings to
  relabel just the keys they need. The Vue/React `useI18n(namespace?)` accepts an
  optional namespace, and `breakpoint-debug` now resolves its own `mp.breakpoints`
  namespace.

- d39b6fc: add per-workspace reference documentation and refresh llms.txt/README metadata
- f681d82: rename storybook stories to the .vue.stories suffix for framework clarity
- Updated dependencies [651c349]
- Updated dependencies [4ffe6a7]
- Updated dependencies [651c349]
- Updated dependencies [d37e102]
- Updated dependencies [d39b6fc]
  - @mission-platform/i18n@1.0.0

## 3.0.1

### Patch Changes

- 075a5a2: normalize source formatting and import ordering

  Apply the repo-wide Prettier/ESLint formatting pass (line reflow, attribute and import ordering, barrel-import paths, and simplified GeoJSON `Feature` typings in `map`). No runtime behaviour changes.

- Updated dependencies [dc84af7]
  - @mission-platform/i18n@0.4.1

## 3.0.0

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
  - @mission-platform/i18n@0.4.0

## 2.0.1

### Patch Changes

- 266acd6: add `build:watch` script for incremental rebuilds during development
- Updated dependencies [266acd6]
  - @mission-platform/i18n@0.3.1

## 2.0.0

### Patch Changes

- 9e8198e: use shared `@mission-platform/typescript-config` and `@mission-platform/vite-config`

  Migrates the package's `vite.config.ts`, `vitest.config.ts`, and the
  four `tsconfig.*.json` files to extend the shared workspaces under
  `configs/`. No runtime or public-API change — `dist/` output is
  identical.

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

- Updated dependencies [d2bf0e1]
- Updated dependencies [c8f7e0a]
- Updated dependencies [2e27467]
- Updated dependencies [05d31c9]
- Updated dependencies [cf89515]
  - @mission-platform/i18n@0.3.0

## 1.0.0

### Patch Changes

- Updated dependencies [ba565b3]
  - @mission-platform/i18n@0.2.0

## 0.1.0

### Minor Changes

- feat: initial breakpoints package with responsive SCSS utilities and useBreakpoints composable
