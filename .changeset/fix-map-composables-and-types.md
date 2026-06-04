---
"@mission-platform/map": patch
---

Improve `useDrawing` composable and map test infrastructure:

- `selectFeature` parameter is now optional (`id?: FeatureId`) for more ergonomic deselection calls
- Fix spec files to use `mockImplementation(() => {})` instead of `mockReturnValue()` for `getSource` and `getLayer` mocks, avoiding misleading `undefined` return type
- `mountWithMap` test utility now accepts `Component` type for extra components and uses a type-safe `mergedOptions` variable
- Add `lib` compiler option to `tsconfig.build.json` and `tsconfig.test.json` for explicit DOM/ES2022 lib targets
- Exclude stories files from `tsconfig.test.json` include and add `tsconfig.storybook.json` reference to root `tsconfig.json`
- Fix `arguments_` destructuring in map-draw and map-layer specs to use index access instead of destructured parameter patterns
- Fix type-unsafe `arguments_.geodesic` access in map-libre.stories.ts by casting through `Record<string, unknown>`
