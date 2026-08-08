# @mission-platform/vite-plugin-assemblyscript

## 0.1.1

### Patch Changes

- ffa5129: relicense the project from MIT to BSD-4-Clause
- f67e304: migrate library builds to tsdown

  Every library workspace across `packages/`, `vite-plugins/`, `configs/`, `workers/`, and the MCP servers now builds
  with [tsdown](https://tsdown.dev) (Rolldown/Oxc)
  instead of `tsc` / `vite build`. A new shared `@mission-platform/tsdown-config`
  package exposes the generic `defineTsdownLibrary` / `defineTsdownVueLibrary`
  helpers, and `@mission-platform/vite-plugin-forge` now additionally exports tsdown-compatible forge helpers
  (`defineTsdownForgeHooks(All)`,
  `defineTsdownForgeComponents(All)`, `defineTsdownForgeStoryblok(All)`) plus the Rolldown stage-2 adapters needed to
  reproduce the write-once multi-framework output under tsdown.

  This is a build-tooling change only: every package's public `exports`, `dist`
  layout, `types`, and framework auto-resolution (`mp:*` conditions) are unchanged, so consumers are unaffected. The
  `@mission-platform/forms` `web-components`
  target remains a hybrid Vite step, and `@mission-platform/hunspell` keeps its
  `build:wasm` toolchain.

## 0.1.0

### Minor Changes

- 9cdfef1: Add a synchronous instantiation path and higher-level phone helpers so
  `@mission-platform/phone-number` can be a drop-in replacement for
  `google-libphonenumber` in render-time code.

  - `vite-plugin-assemblyscript`: the generated module now also exposes a memoised
    synchronous `loadModuleSync()` (derived from the async bindings by swapping the
    single `await WebAssembly.instantiate(...)` for the synchronous
    `new WebAssembly.Instance(...)`), alongside the existing async `loadModule()`.
  - `phone-number`: add `PhoneNumberUtil.getInstanceSync()` /
    `getPhoneNumberUtilSync()` and the new methods `isValidNumberForRegion`,
    `getSupportedRegions`, `getExampleNumber` and `formatAsYouType` (an as-you-type
    national formatter), plus example numbers for every curated region.

## 0.1.0

### Minor Changes

- 9cdfef1: Add a synchronous instantiation path and higher-level phone helpers so
  `@mission-platform/phone-number` can be a drop-in replacement for
  `google-libphonenumber` in render-time code.

  - `vite-plugin-assemblyscript`: the generated module now also exposes a memoised
    synchronous `loadModuleSync()` (derived from the async bindings by swapping the
    single `await WebAssembly.instantiate(...)` for the synchronous
    `new WebAssembly.Instance(...)`), alongside the existing async `loadModule()`.
  - `phone-number`: add `PhoneNumberUtil.getInstanceSync()` /
    `getPhoneNumberUtilSync()` and the new methods `isValidNumberForRegion`,
    `getSupportedRegions`, `getExampleNumber` and `formatAsYouType` (an as-you-type
    national formatter), plus example numbers for every curated region.

## 0.1.0

### Minor Changes

- 9cdfef1: Add a synchronous instantiation path and higher-level phone helpers so
  `@mission-platform/phone-number` can be a drop-in replacement for
  `google-libphonenumber` in render-time code.

  - `vite-plugin-assemblyscript`: the generated module now also exposes a memoised
    synchronous `loadModuleSync()` (derived from the async bindings by swapping the
    single `await WebAssembly.instantiate(...)` for the synchronous
    `new WebAssembly.Instance(...)`), alongside the existing async `loadModule()`.
  - `phone-number`: add `PhoneNumberUtil.getInstanceSync()` /
    `getPhoneNumberUtilSync()` and the new methods `isValidNumberForRegion`,
    `getSupportedRegions`, `getExampleNumber` and `formatAsYouType` (an as-you-type
    national formatter), plus example numbers for every curated region.

## 0.1.0

### Minor Changes

- 9cdfef1: Add a synchronous instantiation path and higher-level phone helpers so
  `@mission-platform/phone-number` can be a drop-in replacement for
  `google-libphonenumber` in render-time code.

  - `vite-plugin-assemblyscript`: the generated module now also exposes a memoised
    synchronous `loadModuleSync()` (derived from the async bindings by swapping the
    single `await WebAssembly.instantiate(...)` for the synchronous
    `new WebAssembly.Instance(...)`), alongside the existing async `loadModule()`.
  - `phone-number`: add `PhoneNumberUtil.getInstanceSync()` /
    `getPhoneNumberUtilSync()` and the new methods `isValidNumberForRegion`,
    `getSupportedRegions`, `getExampleNumber` and `formatAsYouType` (an as-you-type
    national formatter), plus example numbers for every curated region.
