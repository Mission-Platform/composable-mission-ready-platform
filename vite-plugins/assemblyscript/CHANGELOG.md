# @mission-platform/vite-plugin-assemblyscript

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
