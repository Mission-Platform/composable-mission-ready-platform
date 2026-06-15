# @mission-platform/tokens

## 0.3.0

### Minor Changes

- a6ac78b: unify component variants on `primary`, `secondary`, `tertiary`, `default`, `success`, `warning`,
  `information`, `error` & `critical`

  All semantic-color components (`BaseButton`, `BaseBadge`, `BaseTag`, `BaseSpinner`,
  `BaseProgressBar`, `BaseMenuItem`, `BaseNavbarItem`) now share one canonical
  `variant` set. **Breaking:** the old per-component values were renamed —
  `danger` → `error`, `info` → `information`, `neutral` → `default`, and the button's
  `ghost` → `tertiary`. `default` keeps the neutral treatment, `tertiary` keeps the
  ghost/transparent treatment, and `information` keeps the info treatment.

  `@mission-platform/tokens` adds the backing semantic CSS-variable families
  (`secondary`, `tertiary`, `default`, `information`, `critical`) for both the light
  and dark themes, plus a new `critical` primitive colour scale.

### Patch Changes

- f0a0e11: emit code-split, tree-shakeable library builds

  `defineLibraryConfig` now preserves the source module graph (one output file per
  module) and externalises each package's own `dependencies`/`peerDependencies` by
  default, so consumers get first-class tree shaking and code splitting. Packages
  that ship a single self-contained artifact (workers, WASM entries, the flat token
  bundle) opt out via the new `preserveModules: false` option. The main entry of
  each preserved-module package is now emitted as `dist/index.js`.

## 0.2.0

### Minor Changes

- 37571da: add `--mp-color-bg-base-alt` semantic background token to light and dark themes — a subtle shade off the base
  background (slightly darker in light, slightly lighter in dark) for alternating sections, banded surfaces, and zebra
  layouts

### Patch Changes

- 266acd6: add `build:watch` script for incremental rebuilds during development

## 0.1.2

### Patch Changes

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

- 8314555: use shared `@mission-platform/typescript-config` and `@mission-platform/vite-config`

  Migrates `vite.config.ts` and the `tsconfig.*.json` files to extend the
  shared workspaces under `configs/`. No runtime or public-API change.

## 0.1.1

### Patch Changes

- b5e4353: broaden composable APIs to MaybeRefOrGetter and fix token re-export extensions
  - refactor `useHunspellMonaco` to accept `MaybeRefOrGetter` for all three parameters instead of `Ref`, allowing plain
    values, refs, and getters
  - update `useHunspellMonaco` spec to use native `ReturnType<typeof ref<...>>` instead of explicit `Ref` import
  - migrate `useId` from `nanoid` to Vue's built-in `useId` for stable server-side-compatible IDs
  - update `useRouterClose` to call `toValue(router.currentRoute)` instead of `.value` directly
  - refactor `useIconSize` in `@mission-platform/icons` to accept `MaybeRefOrGetter<number | string>` instead of a
    getter function `() => number | string`
  - fix token barrel re-exports in `@mission-platform/tokens` to use `.js` extensions instead of `.ts` for ESM
    compatibility

## 0.1.0

### Minor Changes

- feat: initial design tokens including colors, typography, spacing, radii, shadows and theme SCSS variables
