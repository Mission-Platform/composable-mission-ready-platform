# @mission-platform/phone-number

## 0.3.1

### Patch Changes

- bd88e5e: rename the component library prefix from `Base` to `Forge`

  BREAKING CHANGE: every exported component symbol and its folder/file and CSS class name is renamed from `Base*`/`base-*` to `Forge*`/`forge-*` (e.g. `BaseButton` → `ForgeButton`), and previously-unprefixed components (`HideAt`, `ShowAt`, `BreakpointDebug`) and every icon (`IconStar` → `ForgeIconStar`) now carry the `Forge` prefix. Consumers must update all imports and template usages accordingly.

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

## 0.3.0

### Minor Changes

- 9cdfef1: Add a synchronous instantiation path and higher-level phone helpers so
  `@mission-platform/phone-number` can be a drop-in replacement for
  `google-libphonenumber` in render-time code.

  - `vite-plugin-assemblyscript`: the generated module now also exposes a memoised synchronous `loadModuleSync()`
    (derived from the async bindings by swapping the single `await WebAssembly.instantiate(...)` for the synchronous
    `new WebAssembly.Instance(...)`), alongside the existing async `loadModule()`.
  - `phone-number`: add `PhoneNumberUtil.getInstanceSync()` /
    `getPhoneNumberUtilSync()` and the new methods `isValidNumberForRegion`,
    `getSupportedRegions`, `getExampleNumber` and `formatAsYouType` (an as-you-type national formatter), plus example
    numbers for every curated region.

### Patch Changes

- 9cdfef1: Removed the vendored upstream libphonenumber sources (`vendor/`) and the
  `src/metadata/upstream-loader.ts` build-time loader that evaluated them. The regex pattern corpus they provided is now
  captured directly in
  `src/metadata/pattern-corpus.ts` as self-contained TypeScript data, so the regex compiler/VM diff-tests run without
  any external reference sources.

## 0.2.0

### Minor Changes

- Added a **regex precompilation engine** — the foundation for converting the full Google libphonenumber rule set (which
  is driven by JavaScript `RegExp`)
  to AssemblyScript, where no native `RegExp` exists. Per the chosen
  "precompile patterns" strategy, regex patterns are compiled ahead of time into compact, flat `i32` bytecode that a
  small backtracking VM executes at runtime — so the AssemblyScript/WebAssembly core stays regex-free.

  - `src/regex/compiler.ts`: a build-time regex → bytecode compiler covering the syntax used by libphonenumber metadata
    (literals, `.`, character classes/ranges/negation, `\d \D \w \W \s \S`, capturing and `(?:)` groups, alternation,
    `* + ?` and `{n} {n,} {n,m}` greedy/lazy, `^`/`$`).
  - `src/regex/reference-vm.ts`: a TypeScript reference VM (full/prefix/search + capture groups) with leftmost-first
    (JavaScript) semantics.
  - `assembly/regex.ts`: the same VM in AssemblyScript, exercised inside wasm and diff-tested against the reference VM.
  - `src/metadata/pattern-corpus.ts`: the captured upstream pattern corpus — every distinct rule pattern used across all
    regions of libphonenumber's metadata — stored as TypeScript data so the compiler/VM can be diff-tested without any
    vendored upstream sources.

  Validated against the **entire upstream pattern corpus** (500+ distinct patterns): every pattern compiles, and the VM
  agrees with the native engine.

  Note: the higher-level `PhoneNumberUtil`, `AsYouTypeFormatter` and
  `ShortNumberInfo` ports (and the original upstream test suites) build on this engine and remain in progress; the
  shipped runtime API is still the curated 0.1.0 surface.

## 0.1.0

### Minor Changes

- Initial release: a focused reimplementation of the core of Google libphonenumber in AssemblyScript, compiled to
  WebAssembly.

  Provides a typed `PhoneNumberUtil` façade (via `getPhoneNumberUtil()`) with parsing, possibility/validity checks,
  number-type classification and formatting (`E164`, `INTERNATIONAL`, `NATIONAL`, `RFC3966`) for a curated set of
  regions (US, CA, GB, FR, DE, AU, IN, JP, BR, CN, RU). The wasm binary is inlined as base64 into a single
  self-contained ES module, so the package has no runtime dependencies and needs no `.wasm` URL resolution.
