# @mission-platform/code-scanner

## 1.2.0

### Minor Changes

- 06a8934: Replace the legacy `@mission-platform/code-scan-wasm` runtime with a statically linked Forge Web Script scanner graph.
  The static build enables WebAssembly SIMD and aggressive link-time optimization; dynamic builds retain explicit decoder
  module boundaries with cached dispatch. The public image, file, camera, synchronous, and asynchronous scanner APIs
  remain compatible.
- 97c3f20: add typed custom-property overrides for visual components

### Patch Changes

- c32bb83: centralize package documentation generation in the repository build
- 0c74365: Harden content rendering and scanner runtime behavior
- 46fe17a: scope Forge build environment variables to package build tasks
- 31ed685: Run i18n extraction from each configured workspace through the root Turbo task
- Updated dependencies [c32bb83]
- Updated dependencies [f216404]
- Updated dependencies [89aab02]
- Updated dependencies [8a15dbc]
- Updated dependencies [46fe17a]
- Updated dependencies [9e59f09]
- Updated dependencies [97c3f20]
- Updated dependencies [31ed685]
  - @mission-platform/components@3.1.0
  - @mission-platform/forge@1.1.0
  - @mission-platform/icons@2.0.1
  - @mission-platform/typography@1.1.0

## 1.1.0

### Minor Changes

- be97ac0: add framework-specific Storyblok output builds for Forge packages

  The CMS driver and Storyblok target now support shared assets plus React, Vue,
  Svelte, Solid, and Web Components output. Forge packages expose the associated
  build targets and components adds the generated Storyblok entry points.

  BREAKING CHANGE: the generated `@mission-platform/icons` components barrel no
  longer re-exports the catalog and sprite APIs; import those APIs from their
  dedicated modules instead.

### Patch Changes

- Updated dependencies [4714506]
- Updated dependencies [be97ac0]
- Updated dependencies [4714506]
- Updated dependencies [be97ac0]
- Updated dependencies [be97ac0]
- Updated dependencies [be97ac0]
- Updated dependencies [66130ee]
- Updated dependencies [be97ac0]
- Updated dependencies [4714506]
- Updated dependencies [be97ac0]
  - @mission-platform/barcode@2.0.0
  - @mission-platform/components@3.0.0
  - @mission-platform/icons@2.0.0
  - @mission-platform/matrix-code@2.0.0
  - @mission-platform/qr-code@2.0.0
  - @mission-platform/code-scan-wasm@0.2.0
  - @mission-platform/forge@1.0.0

## 1.0.0

### Major Changes

- bd88e5e: rename the component library prefix from `Base` to `Forge`

  BREAKING CHANGE: every exported component symbol and its folder/file and CSS class name is renamed from `Base*`/`base-*` to `Forge*`/`forge-*` (e.g. `BaseButton` → `ForgeButton`), and previously-unprefixed components (`HideAt`, `ShowAt`, `BreakpointDebug`) and every icon (`IconStar` → `ForgeIconStar`) now carry the `Forge` prefix. Consumers must update all imports and template usages accordingly.

- 0371781: remove the per-framework subpath exports in favour of `mp:<framework>` conditions

  The legacy `./vue`, `./react`, `./solid`, `./svelte` and `./web-components`
  subpath exports have been deleted from every framework-shipping package. The framework build is now selected **only** by
  the `mp:<framework>` custom export condition on the bare `.` entry, so there is exactly one specifier per package and it
  is impossible for an app to mix two framework builds by importing inconsistently.

  **Breaking.** Replace every framework subpath with the bare specifier and select the framework once, at the app level:

  ```diff
  -import { ForgeButton } from '@mission-platform/components/vue';
  -import { ForgeIconChevron } from '@mission-platform/icons/vue';
  +import { ForgeButton } from '@mission-platform/components';
  +import { ForgeIconChevron } from '@mission-platform/icons';
  ```

  ```ts
  // vite.config.ts
  export default defineFrameworkAppConfig({ framework: 'vue' });
  ```

  ```jsonc
  // tsconfig.app.json
  { "compilerOptions": { "customConditions": ["mp:vue"] } }
  ```

  `@mission-platform/components` keeps its per-component deep imports, but the wildcard is now condition-aware and carries
  no framework segment:

  ```diff
  -import { ForgeBadge } from '@mission-platform/components/react/atoms/forge-badge/forge-badge';
  +import { ForgeBadge } from '@mission-platform/components/atoms/forge-badge/forge-badge';
  ```

  The `@mission-platform/forge` adapter subpaths (`/react`, `/vue`, `/solid`,
  `/web-components`, `/runtime`, `/jsx-globals`), the Storyblok wrappers (`/storyblok/react`, `/storyblok/vue`),
  `@mission-platform/router/redwood`,
  `@mission-platform/breakpoints/core` and every `…/styles` entry are unaffected.

  `@mission-platform/vite-plugin-forge` now emits bare `@mission-platform/*`
  specifiers into the generated per-framework sources (previously it rewrote them to the matching subpath), and passes the
  framework's `customConditions` to every declaration-emit path so the generated `.d.ts` files resolve sibling packages
  against the same build the bundler picks.

  `@mission-platform/vite-config` gains `framework` and `frameworkInclude` options on `defineVitestConfig`, so a package
  can run its compiled-build specs under a framework condition while leaving cross-framework parity specs resolving
  neutrally.

### Minor Changes

- 6290b4c: add framework auto-resolution via custom export conditions

  Every framework-shipping `@mission-platform/*` package now declares `mp:vue`,
  `mp:react`, `mp:solid`, and `mp:web-component` custom export
  conditions on its bare `.` entry (each resolving to the matching built `dist`
  artifact), so consumers can `import { X } from '@mission-platform/<pkg>'` with
  no framework subpath and have Vite and the TypeScript LSP resolve the correct
  framework build from a single app-level setting.

  `@mission-platform/vite-config` adds `defineFrameworkAppConfig`,
  `frameworkResolveConditions`, and `frameworkCondition` (plus the
  `MissionPlatformFramework` type) to set `resolve.conditions` from one
  `framework` option, and `@mission-platform/typescript-config` adds matching
  `framework-vue`, `framework-react`, `framework-solid`, and `framework-web-component`
  presets wiring the equivalent `customConditions`.

- 7c91132: add Solid, Svelte, and Web Components code generators and per-framework build targets

  The JSX plugin now emits Solid, Svelte, and Web Components modules alongside the existing Vue and React outputs, and every write-once component package gains matching `build:solid`, `build:svelte`, and `build:web-components` targets plus optional peer dependencies for the new frameworks.

### Patch Changes

- f67e304: fix component styles not loading in apps and Storybook

  `defineTsdownLibrary` now re-links every extracted stylesheet to the JS module that owns it via a `writeBundle` pass (opt out with `cssBundle: false`). Under the tsdown/Rolldown build, co-located `*.module.scss` / `*.scss` imports were extracted to standalone `.css` assets but their side-effect imports were dropped from the JS (left as `/* empty css */`), so importing a component shipped its markup without its styles. Each `X.css` is now imported from its CSS-Module class map (`X.module.js`) — or, for the Vue build, from the component chunk (`X.vue_vue_type_style_*.css` → `X.js`) — so importing a single component (or the package barrel) automatically loads exactly its styles again, matching the historical Vite library build.

- 56e0456: modernize component styles with `@supports`, `@container`, `@starting-style`, and `@namespace`, and replace arbitrary box-model and breakpoint values with design tokens
- 8bd60ae: reformat sources with prettier

  Apply the repository prettier style across sources, config manifests (`tsconfig.test.json`, `turbo.json`,
  `vite.config.ts`), stories, and documentation. Formatting-only; no runtime or API changes.

- ffa5129: relicense the project from MIT to BSD-4-Clause
- d920693: move wasm-pack builds onto crate workspace members and make `-wasm` packages self-contained tsdown libraries

  Each wasm-pack crate is now a private pnpm/turbo workspace member (`@mission-platform/<crate>-crate`) that runs `wasm-pack build --target bundler --no-pack` into `packages/<crate>-wasm/src/wasm` (turbo-cached cargo output). The published `@mission-platform/<crate>-wasm` package is now a `tsdown` library: a small `src/index.ts` wrapper inlines the `_bg.wasm` binary as base64, instantiates it synchronously at import, and re-exports the crate's typed functions ready to use — so `@mission-platform/<crate>-wasm` ships a single self-contained `dist/index.js` with no external `.wasm` and no async init. Consuming packages (`barcode`, `qr-code`, `matrix-code`, `code-scanner`) now import these ready functions and bundle the `-wasm` dist, so their `init*` helpers are backwards-compatible no-ops and their own inline-wasm plugins are removed.

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

- Updated dependencies [e2525a3]
- Updated dependencies [ddf20bd]
- Updated dependencies [3fc6203]
- Updated dependencies [ca646ea]
- Updated dependencies [9a876eb]
- Updated dependencies [c6e83c0]
- Updated dependencies [ddf20bd]
- Updated dependencies [ddf20bd]
- Updated dependencies [f67e304]
- Updated dependencies [a4f0f68]
- Updated dependencies [bd88e5e]
- Updated dependencies [7a1b1a1]
- Updated dependencies [bd88e5e]
- Updated dependencies [bd88e5e]
- Updated dependencies [1db440e]
- Updated dependencies [6290b4c]
- Updated dependencies [7c91132]
- Updated dependencies [0c0d5d7]
- Updated dependencies [56e0456]
- Updated dependencies [ac98203]
- Updated dependencies [8bd60ae]
- Updated dependencies [ffa5129]
- Updated dependencies [0371781]
- Updated dependencies [3fb8ddb]
- Updated dependencies [d920693]
- Updated dependencies [7d95459]
- Updated dependencies [f67e304]
- Updated dependencies [2cbbd16]
- Updated dependencies [b23115e]
- Updated dependencies [90a72fc]
  - @mission-platform/forge@1.0.0
  - @mission-platform/components@2.0.0
  - @mission-platform/icons@1.0.0
  - @mission-platform/barcode@1.0.0
  - @mission-platform/qr-code@1.0.0
  - @mission-platform/matrix-code@1.0.0
  - @mission-platform/code-scan-wasm@0.2.0

## 0.2.0

### Minor Changes

- b0c25e6: Add opt-in diagnostic logging to help debug codes that are located but fail to decode (the common Data
  Matrix / 1D-barcode symptom). The JS façade now traces each scan stage — capture size, the located format, its sampled
  payload (module counts) and each decoder's verdict — via a new `setCodeScannerDebug(true)` toggle (also enabled by the
  `__CODE_SCANNER_DEBUG__` global or the `BaseCodeScanner` `debug` prop). The wasm scanner emits matching `tracing`
  events at every decision point (Otsu threshold, dense bounds, inferred Data Matrix size and module geometry, barcode
  scan-line quality, and each rejection reason), visible in the devtools console. Logging is off by default so
  production output stays quiet.

### Patch Changes

- b0c25e6: Improve the 1D-barcode locator for real camera photos, where the bars are one block inside a cluttered scene.
  Vertically the scanner now finds the _transition band_ — the tallest stripe of edge-dense rows — so the scan lines
  land on the bars rather than the human-readable digit row or plain background (the previous whole-frame ink bounds
  ballooned onto both). Horizontally, each scan line is trimmed to its densest run of narrow alternating elements,
  splitting away the quiet zones and any wide background object beside the symbol. The unit-width estimate now rejects
  rare specks by requiring a candidate module width to recur, so a lone stray run can no longer inflate the module
  count. Finally the locator emits a ranked shortlist of candidate scan lines and the decode stage tries each until one
  reads — a single "cleanest" line is a poor proxy for a decodable one on a photo. Validated against genuine barcode
  photos from the zxing blackbox corpus (EAN-13/8, UPC-A, Code 128/39), lifting the decode rate several-fold; a new
  cluttered-frame pipeline test locks in the behaviour. Tightly-cropped file uploads are unaffected.
- b0c25e6: Fix Data Matrix and 1D-barcode captures that were located but failed to decode. The scanner now localises
  from an ink- _density_ bounding box (so stray speckle or clutter in the quiet zone no longer explodes the symbol
  bounds), infers the Data Matrix size from the mode of several timing-edge probes instead of a single line, reads each
  Data Matrix module by a small majority vote (falling back to a single centre sample for very small modules), and picks
  the cleanest of several barcode scan-lines rather than blindly trusting the middle one. QR scanning is unchanged.
  Native end-to-end tests now drive real encoders → scanner → real decoders across clean, downscaled, cluttered and
  noisy images.
- Updated dependencies [3e48edf]
- Updated dependencies [e1a9272]
- Updated dependencies [e1a9272]
- Updated dependencies [4218ce5]
- Updated dependencies [c99c4cc]
- Updated dependencies [338c7db]
- Updated dependencies [fb5e319]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [7534f50]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [23c0463]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [429d400]
- Updated dependencies [b4a8da8]
- Updated dependencies [1c73a0e]
- Updated dependencies [bbc9903]
- Updated dependencies [edb785f]
- Updated dependencies [18bd49a]
- Updated dependencies [76ebb1f]
- Updated dependencies [13cfc7f]
- Updated dependencies [13cfc7f]
- Updated dependencies [13cfc7f]
- Updated dependencies [13cfc7f]
- Updated dependencies [0a5d7dd]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [94f9acf]
- Updated dependencies [edb785f]
- Updated dependencies [94f9acf]
- Updated dependencies [94f9acf]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [94f9acf]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [94f9acf]
- Updated dependencies [94f9acf]
- Updated dependencies [edb785f]
- Updated dependencies [18bd49a]
- Updated dependencies [3a3ba6c]
- Updated dependencies [ca1d98b]
- Updated dependencies [d39b6fc]
- Updated dependencies [6551abb]
- Updated dependencies [18bd49a]
- Updated dependencies [8d64a2b]
- Updated dependencies [4218ce5]
- Updated dependencies [7534f50]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
  - @mission-platform/barcode@0.2.0
  - @mission-platform/components@1.0.0
  - @mission-platform/qr-code@0.1.1
  - @mission-platform/icons@0.2.0
  - @mission-platform/forge@0.2.0
  - @mission-platform/matrix-code@0.2.0

## 0.2.0

### Minor Changes

- b0c25e6: Add opt-in diagnostic logging to help debug codes that are located but fail to decode (the common Data
  Matrix / 1D-barcode symptom). The JS façade now traces each scan stage — capture size, the located format, its sampled
  payload (module counts) and each decoder's verdict — via a new `setCodeScannerDebug(true)` toggle (also enabled by the
  `__CODE_SCANNER_DEBUG__` global or the `BaseCodeScanner` `debug` prop). The wasm scanner emits matching `tracing`
  events at every decision point (Otsu threshold, dense bounds, inferred Data Matrix size and module geometry, barcode
  scan-line quality, and each rejection reason), visible in the devtools console. Logging is off by default so
  production output stays quiet.

### Patch Changes

- b0c25e6: Improve the 1D-barcode locator for real camera photos, where the bars are one block inside a cluttered scene.
  Vertically the scanner now finds the _transition band_ — the tallest stripe of edge-dense rows — so the scan lines
  land on the bars rather than the human-readable digit row or plain background (the previous whole-frame ink bounds
  ballooned onto both). Horizontally, each scan line is trimmed to its densest run of narrow alternating elements,
  splitting away the quiet zones and any wide background object beside the symbol. The unit-width estimate now rejects
  rare specks by requiring a candidate module width to recur, so a lone stray run can no longer inflate the module
  count. Finally the locator emits a ranked shortlist of candidate scan lines and the decode stage tries each until one
  reads — a single "cleanest" line is a poor proxy for a decodable one on a photo. Validated against genuine barcode
  photos from the zxing blackbox corpus (EAN-13/8, UPC-A, Code 128/39), lifting the decode rate several-fold; a new
  cluttered-frame pipeline test locks in the behaviour. Tightly-cropped file uploads are unaffected.
- b0c25e6: Fix Data Matrix and 1D-barcode captures that were located but failed to decode. The scanner now localises
  from an ink- _density_ bounding box (so stray speckle or clutter in the quiet zone no longer explodes the symbol
  bounds), infers the Data Matrix size from the mode of several timing-edge probes instead of a single line, reads each
  Data Matrix module by a small majority vote (falling back to a single centre sample for very small modules), and picks
  the cleanest of several barcode scan-lines rather than blindly trusting the middle one. QR scanning is unchanged.
  Native end-to-end tests now drive real encoders → scanner → real decoders across clean, downscaled, cluttered and
  noisy images.
- Updated dependencies [3e48edf]
- Updated dependencies [e1a9272]
- Updated dependencies [e1a9272]
- Updated dependencies [4218ce5]
- Updated dependencies [c99c4cc]
- Updated dependencies [338c7db]
- Updated dependencies [fb5e319]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [7534f50]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [23c0463]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [429d400]
- Updated dependencies [b4a8da8]
- Updated dependencies [1c73a0e]
- Updated dependencies [bbc9903]
- Updated dependencies [edb785f]
- Updated dependencies [18bd49a]
- Updated dependencies [76ebb1f]
- Updated dependencies [13cfc7f]
- Updated dependencies [13cfc7f]
- Updated dependencies [13cfc7f]
- Updated dependencies [13cfc7f]
- Updated dependencies [0a5d7dd]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [94f9acf]
- Updated dependencies [edb785f]
- Updated dependencies [94f9acf]
- Updated dependencies [94f9acf]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [94f9acf]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [94f9acf]
- Updated dependencies [94f9acf]
- Updated dependencies [edb785f]
- Updated dependencies [18bd49a]
- Updated dependencies [3a3ba6c]
- Updated dependencies [ca1d98b]
- Updated dependencies [d39b6fc]
- Updated dependencies [6551abb]
- Updated dependencies [18bd49a]
- Updated dependencies [8d64a2b]
- Updated dependencies [4218ce5]
- Updated dependencies [7534f50]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
  - @mission-platform/barcode@0.2.0
  - @mission-platform/components@1.0.0
  - @mission-platform/qr-code@0.1.1
  - @mission-platform/icons@0.2.0
  - @mission-platform/forge@0.2.0
  - @mission-platform/matrix-code@0.2.0

## 0.2.0

### Minor Changes

- b0c25e6: Add opt-in diagnostic logging to help debug codes that are located but fail to decode (the common Data
  Matrix / 1D-barcode symptom). The JS façade now traces each scan stage — capture size, the located format, its sampled
  payload (module counts) and each decoder's verdict — via a new `setCodeScannerDebug(true)` toggle (also enabled by the
  `__CODE_SCANNER_DEBUG__` global or the `BaseCodeScanner` `debug` prop). The wasm scanner emits matching `tracing`
  events at every decision point (Otsu threshold, dense bounds, inferred Data Matrix size and module geometry, barcode
  scan-line quality, and each rejection reason), visible in the devtools console. Logging is off by default so
  production output stays quiet.

### Patch Changes

- b0c25e6: Improve the 1D-barcode locator for real camera photos, where the bars are one block inside a cluttered scene.
  Vertically the scanner now finds the _transition band_ — the tallest stripe of edge-dense rows — so the scan lines
  land on the bars rather than the human-readable digit row or plain background (the previous whole-frame ink bounds
  ballooned onto both). Horizontally, each scan line is trimmed to its densest run of narrow alternating elements,
  splitting away the quiet zones and any wide background object beside the symbol. The unit-width estimate now rejects
  rare specks by requiring a candidate module width to recur, so a lone stray run can no longer inflate the module
  count. Finally the locator emits a ranked shortlist of candidate scan lines and the decode stage tries each until one
  reads — a single "cleanest" line is a poor proxy for a decodable one on a photo. Validated against genuine barcode
  photos from the zxing blackbox corpus (EAN-13/8, UPC-A, Code 128/39), lifting the decode rate several-fold; a new
  cluttered-frame pipeline test locks in the behaviour. Tightly-cropped file uploads are unaffected.
- b0c25e6: Fix Data Matrix and 1D-barcode captures that were located but failed to decode. The scanner now localises
  from an ink- _density_ bounding box (so stray speckle or clutter in the quiet zone no longer explodes the symbol
  bounds), infers the Data Matrix size from the mode of several timing-edge probes instead of a single line, reads each
  Data Matrix module by a small majority vote (falling back to a single centre sample for very small modules), and picks
  the cleanest of several barcode scan-lines rather than blindly trusting the middle one. QR scanning is unchanged.
  Native end-to-end tests now drive real encoders → scanner → real decoders across clean, downscaled, cluttered and
  noisy images.
- Updated dependencies [3e48edf]
- Updated dependencies [e1a9272]
- Updated dependencies [e1a9272]
- Updated dependencies [4218ce5]
- Updated dependencies [c99c4cc]
- Updated dependencies [338c7db]
- Updated dependencies [fb5e319]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [7534f50]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [23c0463]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [429d400]
- Updated dependencies [b4a8da8]
- Updated dependencies [1c73a0e]
- Updated dependencies [bbc9903]
- Updated dependencies [edb785f]
- Updated dependencies [18bd49a]
- Updated dependencies [76ebb1f]
- Updated dependencies [13cfc7f]
- Updated dependencies [13cfc7f]
- Updated dependencies [13cfc7f]
- Updated dependencies [13cfc7f]
- Updated dependencies [0a5d7dd]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [94f9acf]
- Updated dependencies [edb785f]
- Updated dependencies [94f9acf]
- Updated dependencies [94f9acf]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [94f9acf]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [94f9acf]
- Updated dependencies [94f9acf]
- Updated dependencies [edb785f]
- Updated dependencies [18bd49a]
- Updated dependencies [3a3ba6c]
- Updated dependencies [ca1d98b]
- Updated dependencies [d39b6fc]
- Updated dependencies [6551abb]
- Updated dependencies [18bd49a]
- Updated dependencies [8d64a2b]
- Updated dependencies [4218ce5]
- Updated dependencies [7534f50]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
  - @mission-platform/barcode@0.2.0
  - @mission-platform/components@1.0.0
  - @mission-platform/qr-code@0.1.1
  - @mission-platform/icons@0.2.0
  - @mission-platform/forge@0.2.0
  - @mission-platform/matrix-code@0.2.0

## 0.2.0

### Minor Changes

- b0c25e6: Add opt-in diagnostic logging to help debug codes that are located but fail to decode (the common Data
  Matrix / 1D-barcode symptom). The JS façade now traces each scan stage — capture size, the located format, its sampled
  payload (module counts) and each decoder's verdict — via a new `setCodeScannerDebug(true)` toggle (also enabled by the
  `__CODE_SCANNER_DEBUG__` global or the `BaseCodeScanner` `debug` prop). The wasm scanner emits matching `tracing`
  events at every decision point (Otsu threshold, dense bounds, inferred Data Matrix size and module geometry, barcode
  scan-line quality, and each rejection reason), visible in the devtools console. Logging is off by default so
  production output stays quiet.

### Patch Changes

- b0c25e6: Improve the 1D-barcode locator for real camera photos, where the bars are one block inside a cluttered scene.
  Vertically the scanner now finds the _transition band_ — the tallest stripe of edge-dense rows — so the scan lines
  land on the bars rather than the human-readable digit row or plain background (the previous whole-frame ink bounds
  ballooned onto both). Horizontally, each scan line is trimmed to its densest run of narrow alternating elements,
  splitting away the quiet zones and any wide background object beside the symbol. The unit-width estimate now rejects
  rare specks by requiring a candidate module width to recur, so a lone stray run can no longer inflate the module
  count. Finally the locator emits a ranked shortlist of candidate scan lines and the decode stage tries each until one
  reads — a single "cleanest" line is a poor proxy for a decodable one on a photo. Validated against genuine barcode
  photos from the zxing blackbox corpus (EAN-13/8, UPC-A, Code 128/39), lifting the decode rate several-fold; a new
  cluttered-frame pipeline test locks in the behaviour. Tightly-cropped file uploads are unaffected.
- b0c25e6: Fix Data Matrix and 1D-barcode captures that were located but failed to decode. The scanner now localises
  from an ink- _density_ bounding box (so stray speckle or clutter in the quiet zone no longer explodes the symbol
  bounds), infers the Data Matrix size from the mode of several timing-edge probes instead of a single line, reads each
  Data Matrix module by a small majority vote (falling back to a single centre sample for very small modules), and picks
  the cleanest of several barcode scan-lines rather than blindly trusting the middle one. QR scanning is unchanged.
  Native end-to-end tests now drive real encoders → scanner → real decoders across clean, downscaled, cluttered and
  noisy images.
- Updated dependencies [3e48edf]
- Updated dependencies [e1a9272]
- Updated dependencies [e1a9272]
- Updated dependencies [4218ce5]
- Updated dependencies [c99c4cc]
- Updated dependencies [338c7db]
- Updated dependencies [fb5e319]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [7534f50]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [23c0463]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [429d400]
- Updated dependencies [b4a8da8]
- Updated dependencies [1c73a0e]
- Updated dependencies [bbc9903]
- Updated dependencies [edb785f]
- Updated dependencies [18bd49a]
- Updated dependencies [76ebb1f]
- Updated dependencies [13cfc7f]
- Updated dependencies [13cfc7f]
- Updated dependencies [13cfc7f]
- Updated dependencies [13cfc7f]
- Updated dependencies [0a5d7dd]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [94f9acf]
- Updated dependencies [edb785f]
- Updated dependencies [94f9acf]
- Updated dependencies [94f9acf]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [94f9acf]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [94f9acf]
- Updated dependencies [94f9acf]
- Updated dependencies [edb785f]
- Updated dependencies [18bd49a]
- Updated dependencies [3a3ba6c]
- Updated dependencies [ca1d98b]
- Updated dependencies [d39b6fc]
- Updated dependencies [6551abb]
- Updated dependencies [18bd49a]
- Updated dependencies [8d64a2b]
- Updated dependencies [4218ce5]
- Updated dependencies [7534f50]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
  - @mission-platform/barcode@0.2.0
  - @mission-platform/components@1.0.0
  - @mission-platform/qr-code@0.1.1
  - @mission-platform/icons@0.2.0
  - @mission-platform/forge@0.2.0
  - @mission-platform/matrix-code@0.2.0
