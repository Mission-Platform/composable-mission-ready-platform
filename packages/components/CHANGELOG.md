# @mission-platform/components

## 0.3.0

### Minor Changes

- 2b0cce4: tune base-monaco-editor typography and overflow behavior

  Apply the shared `@mission-platform/tokens` font families to the Monaco
  editor (`fontFamily`, `codeLensFontFamily`), enable `fontLigatures`,
  `fontVariations`, and `allowOverflow`, and disable
  `copyWithSyntaxHighlighting` to keep clipboard payloads as plain text.
  Also drop the redundant `role="region"` attribute from the wrapper so
  the editor's own ARIA semantics are not overridden.

## 0.2.2

### Patch Changes

- a77eafa: use shared `@mission-platform/typescript-config` and `@mission-platform/vite-config`

  Migrates `vite.config.ts`, `vitest.config.ts`, and the `tsconfig.*.json`
  files to extend the shared workspaces under `configs/`. `tsconfig.test.json`
  now explicitly excludes `*.stories.tsx` (the shared `base` preset enables
  `noUnusedParameters`, which the previous local test config did not). No
  runtime or public-API change.

- 37a17e4: log submitted values in BaseFormBuilder WithValidation story
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

- Updated dependencies [9e8198e]
- Updated dependencies [d2bf0e1]
- Updated dependencies [e0390bc]
- Updated dependencies [8a910f9]
- Updated dependencies [c8f7e0a]
- Updated dependencies [14521e9]
- Updated dependencies [2e27467]
- Updated dependencies [05d31c9]
- Updated dependencies [6679759]
- Updated dependencies [cf89515]
- Updated dependencies [8314555]
  - @mission-platform/breakpoints@2.0.0
  - @mission-platform/i18n@0.3.0
  - @mission-platform/harper@0.1.2
  - @mission-platform/hunspell@0.2.2
  - @mission-platform/icons@0.1.3
  - @mission-platform/tokens@0.1.2

## 0.2.1

### Patch Changes

- 8687deb: fix(base-scheduler): compute accessible text colour using WCAG contrast ratio

  Add colour-contrast utilities (hexToRgb, relativeLuminance, contrastRatio,
  alphaBlend, accessibleTextColor) to BaseSchedulerEvent and BaseSchedulerMonthView
  so that event-pill text automatically switches between dark (#1a1a1a) and light
  (#ffffff) depending on the effective background colour, satisfying WCAG AAA
  contrast requirements even when semi-transparent event colours are used.

  Replace element-level opacity on cancelled/tentative events with alpha-blending
  in JS so text contrast is always preserved. Add a slot button to
  BaseSchedulerTimeGrid for click-to-create interactions.

- Updated dependencies [ee616a0]
  - @mission-platform/icons@0.1.2

## 0.2.0

### Minor Changes

- ba565b3: add BaseScheduler component, BaseColorInput component, and useZIndex composable
  - BaseScheduler: full calendar/scheduler component with day, week, month, and year views, RFC 5545 VEvent support, drag-and-drop, and event dialog
  - BaseColorInput: colour picker input component
  - useZIndex / ZLayer: composable for managing z-index stacking layers across the component library

### Patch Changes

- Updated dependencies [ba565b3]
- Updated dependencies [40b0054]
  - @mission-platform/i18n@0.2.0
  - @mission-platform/hunspell@0.2.1
  - @mission-platform/breakpoints@1.0.0
  - @mission-platform/harper@0.1.1
  - @mission-platform/icons@0.1.1
  - @mission-platform/tokens@0.1.1

## 0.1.1

### Patch Changes

- b5e4353: broaden composable APIs to MaybeRefOrGetter and fix token re-export extensions

  - refactor `useHunspellMonaco` to accept `MaybeRefOrGetter` for all three parameters instead of `Ref`, allowing plain values, refs, and getters
  - update `useHunspellMonaco` spec to use native `ReturnType<typeof ref<...>>` instead of explicit `Ref` import
  - migrate `useId` from `nanoid` to Vue's built-in `useId` for stable server-side-compatible IDs
  - update `useRouterClose` to call `toValue(router.currentRoute)` instead of `.value` directly
  - refactor `useIconSize` in `@mission-platform/icons` to accept `MaybeRefOrGetter<number | string>` instead of a getter function `() => number | string`
  - fix token barrel re-exports in `@mission-platform/tokens` to use `.js` extensions instead of `.ts` for ESM compatibility

- 5ed2115: add vue/html-self-closing eslint rule and reformat time column headers

  - add `vue/html-self-closing` rule to eslint-config enforcing `always` self-closing on void, normal, and component elements
  - reformat time column header elements (HH, MM, SS) in BaseTimeInput, BaseTimeRangeInput, and BaseDateTimeRangeInput to comply with the new rule

- 7b0b1ca: Remove redundant `interface Window { HunspellEnvironment? }` extension from `use-hunspell-monaco.ts`. The `declare global { var HunspellEnvironment }` declaration already covers both `globalThis` and `window`, making the `Window` interface block unnecessary.
- b5bbd19: add harper grammar and style checker package and integrate into monaco editor

  - add new `@mission-platform/harper` package providing Harper grammar/style checker integration for Monaco editor via `useHarperMonaco` composable
  - integrate `useHarperMonaco` into `base-monaco-editor` alongside the existing Hunspell spell-checker
  - add `@mission-platform/harper` as a dependency to `@mission-platform/components` and `@mission-platform/my-care-notes`
  - wire `HarperWorker` into `my-care-notes` main entry and declare `HarperEnvironment` global type
  - update root `package.json` build scripts: split assets into `build:tokens` and `build:icons`, add `build:monaco` step for hunspell + harper
  - fix hunspell worker dictionary import casing from `en_au` to `en_AU`

- 74736b6: Add `tokenize` method to `HunspellChecker` with `TokenResult` and `TokenResultVector` types; export new types from package index. Refactor hunspell build script to separate `build:wasm` and `build:ts` steps. Remove redundant `role="region"` from `BaseMonacoEditor`.
- Updated dependencies [b5e4353]
- Updated dependencies [b5bbd19]
- Updated dependencies [ce4e4f2]
- Updated dependencies [74736b6]
- Updated dependencies [bb5e252]
  - @mission-platform/icons@0.1.1
  - @mission-platform/tokens@0.1.1
  - @mission-platform/harper@0.1.1
  - @mission-platform/hunspell@0.2.0
  - @mission-platform/breakpoints@0.1.0
  - @mission-platform/i18n@0.1.0

## 0.1.0

### Minor Changes

- feat: initial Vue 3 shared component library with composables, i18n locales and web worker utilities

### Patch Changes

- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
  - @mission-platform/breakpoints@0.1.0
  - @mission-platform/hunspell@0.1.0
  - @mission-platform/i18n@0.1.0
  - @mission-platform/icons@0.1.0
  - @mission-platform/tokens@0.1.0
