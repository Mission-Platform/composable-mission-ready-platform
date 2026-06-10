# @mission-platform/icons

## 0.1.3

### Patch Changes

- 14521e9: use shared `@mission-platform/typescript-config` and `@mission-platform/vite-config`

  Migrates `vite.config.ts`, `vitest.config.ts`, and the `tsconfig.*.json`
  files to extend the shared workspaces under `configs/`. The
  `vite-svg-loader` plugin is layered in via `overrides`. No runtime or
  public-API change.

- 05d31c9: normalize lint and format scripts across all workspaces

  Add consistent `lint:fix`, `lint:style:fix`, and `format:write` scripts to every workspace, and make `format` run `prettier --check` instead of `prettier --write` so it can be used as a non-mutating verification step.

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

- Updated dependencies [05d31c9]
- Updated dependencies [cf89515]
- Updated dependencies [8314555]
  - @mission-platform/tokens@0.1.2

## 0.1.2

### Patch Changes

- ee616a0: docs(icons): add Storybook stories for all icon components

  Add icon.stories.ts files for every icon in the library, providing a Default
  story that renders each icon with configurable size and colour args so icons are
  browsable and visually testable in the Storybook catalogue.

## 0.1.1

### Patch Changes

- b5e4353: broaden composable APIs to MaybeRefOrGetter and fix token re-export extensions
  - refactor `useHunspellMonaco` to accept `MaybeRefOrGetter` for all three parameters instead of `Ref`, allowing plain values, refs, and getters
  - update `useHunspellMonaco` spec to use native `ReturnType<typeof ref<...>>` instead of explicit `Ref` import
  - migrate `useId` from `nanoid` to Vue's built-in `useId` for stable server-side-compatible IDs
  - update `useRouterClose` to call `toValue(router.currentRoute)` instead of `.value` directly
  - refactor `useIconSize` in `@mission-platform/icons` to accept `MaybeRefOrGetter<number | string>` instead of a getter function `() => number | string`
  - fix token barrel re-exports in `@mission-platform/tokens` to use `.js` extensions instead of `.ts` for ESM compatibility

- bb5e252: add unit tests and stories for all icon components
  - add `icon.spec.ts` for every icon component covering svg rendering, class application, named size tokens, and numeric size in px
  - add `icon.stories.ts` for icon components that benefit from visual documentation in Storybook
  - rename storybook story and test files to lowercase (`I18n` → `i18n`, `Themes` → `themes`) for consistent file naming conventions
  - add `@vue/test-utils` devDependency to `@mission-platform/storybook` to support icon component mounting in tests

- Updated dependencies [b5e4353]
  - @mission-platform/tokens@0.1.1

## 0.1.0

### Minor Changes

- feat: initial icons package with Vue 3 icon components and useIconSize composable

### Patch Changes

- Updated dependencies
  - @mission-platform/tokens@0.1.0
