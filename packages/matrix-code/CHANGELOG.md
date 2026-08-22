# @mission-platform/matrix-code

## 2.0.0

### Major Changes

- 4714506: collapse the action-toolbar props into a single `showActions` prop

  `ForgeBarcode`, `ForgeMatrixCode` and `ForgeQrCode` now take one `showActions`
  prop accepting either `true` (every button) or an object naming the buttons to
  show. Each package exports the matching options interface — `BarcodeActions`,
  `MatrixCodeActions` and `QrCodeActions` — alongside its `*Properties` type.

  BREAKING CHANGE: the `showDownloadButton`, `showCopyImageButton` and
  `showCopyValueButton` props have been removed. Pass their object equivalents to
  `showActions` instead — `showDownloadButton: true` becomes
  `showActions: { download: true }`, `showCopyImageButton: true` becomes
  `showActions: { copyImage: true }`, and `showCopyValueButton: true` becomes
  `showActions: { copyValue: true }`. `showActions: true` still enables the whole
  toolbar, and omitting the prop still renders no toolbar.

### Minor Changes

- be97ac0: add framework-specific Storyblok output builds for Forge packages

  The CMS driver and Storyblok target now support shared assets plus React, Vue,
  Svelte, Solid, and Web Components output. Forge packages expose the associated
  build targets and components adds the generated Storyblok entry points.

  BREAKING CHANGE: the generated `@mission-platform/icons` components barrel no
  longer re-exports the catalog and sprite APIs; import those APIs from their
  dedicated modules instead.

### Patch Changes

- be97ac0: Render matrix-code action icons outside the action descriptor array so Vue output remains valid.
- Updated dependencies [4714506]
- Updated dependencies [be97ac0]
- Updated dependencies [be97ac0]
- Updated dependencies [be97ac0]
- Updated dependencies [66130ee]
- Updated dependencies [be97ac0]
- Updated dependencies [4714506]
- Updated dependencies [be97ac0]
  - @mission-platform/components@3.0.0
  - @mission-platform/icons@2.0.0
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
  export default defineFrameworkAppConfig({ framework: "vue" });
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

- 8bd60ae: reformat sources with prettier

  Apply the repository prettier style across sources, config manifests (`tsconfig.test.json`, `turbo.json`,
  `vite.config.ts`), stories, and documentation. Formatting-only; no runtime or API changes.

- ffa5129: relicense the project from MIT to BSD-4-Clause
- d920693: move matrix codec execution to package-local Forge Web Script artifacts

  Matrix encoding and decoding now load bounded package-local FWS graphs through generated synchronous and asynchronous loaders. The public package no longer depends on generated matrix WebAssembly wrapper packages.

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

## 0.2.0

### Minor Changes

- 3a3ba6c: Add `@mission-platform/matrix-code`: a dependency-free 2D matrix barcode encoder backed by package-local
  Forge Web Script artifacts and wrapped in a typed ES module. The initial release supports Data Matrix (ECC 200,
  single-data-region square symbols 10×10–26×26) via `encodeMatrix`/`encodeMatrixAsync`, returning a square grid of
  module bits. The artifact loader is synchronous and works during SSR and in tests.

### Patch Changes

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
  - @mission-platform/components@1.0.0
  - @mission-platform/icons@0.2.0
  - @mission-platform/forge@0.2.0

## 0.2.0

### Minor Changes

- 3a3ba6c: Add `@mission-platform/matrix-code`: a dependency-free 2D matrix barcode encoder backed by package-local
  Forge Web Script artifacts and wrapped in a typed ES module. The initial release supports Data Matrix (ECC 200,
  single-data-region square symbols 10×10–26×26) via `encodeMatrix`/`encodeMatrixAsync`, returning a square grid of
  module bits. The artifact loader is synchronous and works during SSR and in tests.

### Patch Changes

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
  - @mission-platform/components@1.0.0
  - @mission-platform/icons@0.2.0
  - @mission-platform/forge@0.2.0

## 0.2.0

### Minor Changes

- 3a3ba6c: Add `@mission-platform/matrix-code`: a dependency-free 2D matrix barcode encoder backed by package-local
  Forge Web Script artifacts and wrapped in a typed ES module. The initial release supports Data Matrix (ECC 200,
  single-data-region square symbols 10×10–26×26) via `encodeMatrix`/`encodeMatrixAsync`, returning a square grid of
  module bits. The artifact loader is synchronous and works during SSR and in tests.

### Patch Changes

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
  - @mission-platform/components@1.0.0
  - @mission-platform/icons@0.2.0
  - @mission-platform/forge@0.2.0

## 0.2.0

### Minor Changes

- 3a3ba6c: Add `@mission-platform/matrix-code`: a dependency-free 2D matrix barcode encoder backed by package-local
  Forge Web Script artifacts and wrapped in a typed ES module. The initial release supports Data Matrix (ECC 200,
  single-data-region square symbols 10×10–26×26) via `encodeMatrix`/`encodeMatrixAsync`, returning a square grid of
  module bits. The artifact loader is synchronous and works during SSR and in tests.

### Patch Changes

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
  - @mission-platform/components@1.0.0
  - @mission-platform/icons@0.2.0
  - @mission-platform/forge@0.2.0
