# @mission-platform/map

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
  - Fix spec files to use `mockImplementation(() => {})` instead of `mockReturnValue()` for `getSource` and `getLayer` mocks, avoiding misleading `undefined` return type
  - `mountWithMap` test utility now accepts `Component` type for extra components and uses a type-safe `mergedOptions` variable
  - Add `lib` compiler option to `tsconfig.build.json` and `tsconfig.test.json` for explicit DOM/ES2022 lib targets
  - Exclude stories files from `tsconfig.test.json` include and add `tsconfig.storybook.json` reference to root `tsconfig.json`
  - Fix `arguments_` destructuring in map-draw and map-layer specs to use index access instead of destructured parameter patterns
  - Fix type-unsafe `arguments_.geodesic` access in map-libre.stories.ts by casting through `Record<string, unknown>`

- 30480f4: Remove `@storybook/vue3-vite` from devDependencies. Storybook is an app-level concern and must not be a dependency of a library package; it lives exclusively in `apps/storybook`. Also remove unnecessary `as Story` type assertion in `map-layer.stories.ts` — the variable's declared type annotation already provides full type checking.
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
