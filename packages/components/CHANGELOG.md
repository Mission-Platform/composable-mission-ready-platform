# @mission-platform/components

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
