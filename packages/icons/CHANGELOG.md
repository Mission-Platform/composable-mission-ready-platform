# @mission-platform/icons

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
