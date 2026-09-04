# @mission-platform/layouts

## 2.1.0

### Minor Changes

- 97c3f20: add typed custom-property overrides for visual components

### Patch Changes

- c32bb83: centralize package documentation generation in the repository build
- 8a15dbc: add generated package API references and build-time documentation extraction
- 46fe17a: scope Forge build environment variables to package build tasks
- 9e59f09: split shared UI capabilities into focused workspaces and update their design tokens
- 31ed685: Run i18n extraction from each configured workspace through the root Turbo task
- Updated dependencies [140f802]
- Updated dependencies [c32bb83]
- Updated dependencies [f216404]
- Updated dependencies [89aab02]
- Updated dependencies [93ddb34]
- Updated dependencies [8a15dbc]
- Updated dependencies [46fe17a]
- Updated dependencies [b88a08e]
- Updated dependencies [9e59f09]
- Updated dependencies [97c3f20]
- Updated dependencies [31ed685]
  - @mission-platform/phone-number@0.3.2
  - @mission-platform/components@3.1.0
  - @mission-platform/forge-jsx@1.1.0
  - @mission-platform/forms-core@0.3.1
  - @mission-platform/harper@0.2.2
  - @mission-platform/hunspell@0.4.2
  - @mission-platform/icons@2.0.1
  - @mission-platform/tokens@2.0.0

## 2.0.0

### Major Changes

- 4714506: move the Storyblok projection under the `./cms/storyblok/*` export namespace

  Storyblok output is now produced by `@mission-platform/forge-cms-storyblok`
  through the shared CMS driver, which namespaces every content-platform build
  under `dist/cms/<cms>/<framework>/`.

  BREAKING CHANGE: the `./storyblok/react`, `./storyblok/vue`, and
  `./storyblok/components.json` subpath exports are now `./cms/storyblok/react`,
  `./cms/storyblok/vue`, and `./cms/storyblok/components.json`, resolving to
  `dist/cms/storyblok/**` instead of `dist/storyblok/**`. Update imports
  accordingly; the module contents are unchanged.

### Minor Changes

- be97ac0: add framework-specific Storyblok output builds for Forge packages

  The CMS driver and Storyblok target now support shared assets plus React, Vue,
  Svelte, Solid, and Web Components output. Forge packages expose the associated
  build targets and components adds the generated Storyblok entry points.

  BREAKING CHANGE: the generated `@mission-platform/icons` components barrel no
  longer re-exports the catalog and sprite APIs; import those APIs from their
  dedicated modules instead.

### Patch Changes

- be97ac0: Fix explicit h() calls crashing in Solid.js by spreading children arrays instead of passing undefined arguments.
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
  - @mission-platform/tokens@1.1.0
  - @mission-platform/forge-jsx@1.0.0
  - @mission-platform/forms-core@0.3.0
  - @mission-platform/harper@0.2.1
  - @mission-platform/hunspell@0.4.1
  - @mission-platform/phone-number@0.3.1

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

  The `@mission-platform/forge-jsx` adapter subpaths (`/react`, `/vue`, `/solid`,
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
- ac98203: normalize composable directories, package barrels, and colocated tests
- 8bd60ae: reformat sources with prettier

  Apply the repository prettier style across sources, config manifests (`tsconfig.test.json`, `turbo.json`,
  `vite.config.ts`), stories, and documentation. Formatting-only; no runtime or API changes.

- ffa5129: relicense the project from MIT to BSD-4-Clause
- f67e304: migrate library builds to tsdown

  Every library workspace across `packages/`, `packages/tooling/vite/`, `packages/tooling/configs/`, `packages/edge/workers/`, and the MCP servers now builds
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
- Updated dependencies [d952712]
- Updated dependencies [6290b4c]
- Updated dependencies [7c91132]
- Updated dependencies [0c0d5d7]
- Updated dependencies [56e0456]
- Updated dependencies [ac98203]
- Updated dependencies [8bd60ae]
- Updated dependencies [ffa5129]
- Updated dependencies [0371781]
- Updated dependencies [3fb8ddb]
- Updated dependencies [7d95459]
- Updated dependencies [f67e304]
- Updated dependencies [b23115e]
- Updated dependencies [90a72fc]
- Updated dependencies [90a72fc]
  - @mission-platform/forge-jsx@1.0.0
  - @mission-platform/components@2.0.0
  - @mission-platform/icons@1.0.0
  - @mission-platform/tokens@1.0.1
  - @mission-platform/forms-core@0.3.0
  - @mission-platform/scheduler-core@0.2.1
  - @mission-platform/hunspell@0.4.1
  - @mission-platform/harper@0.2.1
  - @mission-platform/phone-number@0.3.1

## 0.2.0

### Minor Changes

- 18bd49a: Add the write-once `BaseContainer` layout primitive (shipped to both Vue and React as `Container`). It
  constrains and centres page/section content on the inline axis through three layout options selected by `variant`: **
  `fixed`** (a constant `max-width` from the `sm … 2xl` scale that never changes with the viewport), **`fluid`** (always
  100% of the available width, no `max-width`), and **`responsive`** (a `max-width` that steps up at each platform
  breakpoint, mobile-first). The `fixed`/`fluid` widths plus the `gutter`/`center` controls are inline styles, while the
  `responsive` step-ups live in the co-located CSS Module (the platform breakpoints inlined as range-notation
  `min-width` media queries). Adds the matching Storybook stories (`Layouts/BaseContainer`) and a cross-framework parity
  spec.
- 18bd49a: extract the common layouts into a new `@mission-platform/layouts` package

  Adds the write-once `@mission-platform/layouts` package containing the common layout primitives —
  `BaseApplicationLayout` (public `ApplicationLayout`) and
  `BaseVerticalLayout` (public `VerticalLayout`) — authored once in the neutral
  `@mission-platform/forge-jsx` dialect and compiled straight to both Vue 3 (`./vue`)
  and React (`./react`) by the two-stage `@mission-platform/vite-plugin-forge`
  compiler, with co-located `JSX Components/Layout/<Name>` stories and cross-framework SSR specs.

  **BREAKING (`@mission-platform/components`):** `BaseApplicationLayout` /
  `ApplicationLayout` and `BaseVerticalLayout` / `VerticalLayout` are no longer exported from
  `@mission-platform/components` — import them from
  `@mission-platform/layouts/vue` (or `/react`) instead. `@mission-platform/components`
  gains a neutral `.` root export and a neutral `./base-drawer` subpath so the write-once layouts can reuse `BaseDrawer`
  across packages.

  `@mission-platform/vite-plugin-forge`'s two-stage compiler now remaps neutral imports of the framework-split component
  libraries (`@mission-platform/components`
  and `@mission-platform/layouts`, in addition to `@mission-platform/icons`) — from their root or a neutral subpath — to
  the matching built `./react` / `./vue`
  entry, so write-once components can compose components published by another package.

### Patch Changes

- e1a9272: Drop the third-party `google-libphonenumber` dependency and power `BasePhoneInput`
  with the platform's own `@mission-platform/phone-number` (AssemblyScript/WebAssembly)
  package instead. The co-located `phone.ts` helper now parses, formats (national/E.164), validates per region, lists
  supported regions, provides example numbers and formats as-you-type through the synchronous `PhoneNumberUtil`
  instance, so behaviour is unchanged while the external dependency is removed.
- 10b9e2a: reformat base-container spec SSR render calls onto single lines
- 18bd49a: Add a `src/examples/` Storybook catalogue of layout composition examples (`Layouts/Examples/<Category>`) that
  wire the `Container`, `ApplicationLayout`
  and `VerticalLayout` primitives into realistic page shells for common domains:
  forms, dashboards, configurations, admin, websites, mapping, and routing. The examples are Storybook-only and
  presentational (design-token inline styles, no real widgets), and the package `llms.txt` documents the new catalogue.
- ca1d98b: reformat sources with updated prettier print width and import ordering
- d39b6fc: add per-workspace reference documentation and refresh llms.txt/README metadata
- f681d82: rename storybook stories to the .vue.stories suffix for framework clarity
- 18bd49a: rename the Storybook top-level sections so the catalogue reflects the package split

  The cross-framework catalogue no longer prefixes its sections with `JSX`: the
  `JSX Components/<Category>/<Name>` stories are now `Components/<Category>/<Name>`
  and the `JSX Icons/<Category>/<Name>` stories are now `Icons/<Category>/<Name>`
  (both Vue and React Storybooks). The components extracted into their own packages get their own top-level Storybook
  section instead of nesting under `Components`:
  `@mission-platform/layouts` stories move to `Layouts/<Name>` and
  `@mission-platform/forms` stories move to `Forms/<Name>`.

- Updated dependencies [e1a9272]
- Updated dependencies [e1a9272]
- Updated dependencies [4218ce5]
- Updated dependencies [eefe5d0]
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
- Updated dependencies [4218ce5]
- Updated dependencies [bbc9903]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [18bd49a]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
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
- Updated dependencies [d37e102]
- Updated dependencies [ca1d98b]
- Updated dependencies [d39b6fc]
- Updated dependencies [9cdfef1]
- Updated dependencies [9cdfef1]
- Updated dependencies [6551abb]
- Updated dependencies [4218ce5]
- Updated dependencies [edb785f]
- Updated dependencies [be8ab67]
- Updated dependencies [18bd49a]
- Updated dependencies [8d64a2b]
- Updated dependencies [4218ce5]
- Updated dependencies [4218ce5]
- Updated dependencies [4218ce5]
- Updated dependencies [4218ce5]
- Updated dependencies [be8ab67]
- Updated dependencies [4218ce5]
- Updated dependencies [4218ce5]
- Updated dependencies [4218ce5]
- Updated dependencies [4218ce5]
- Updated dependencies [be8ab67]
- Updated dependencies [be8ab67]
- Updated dependencies [be8ab67]
- Updated dependencies [7534f50]
- Updated dependencies [edb785f]
- Updated dependencies [be8ab67]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
  - @mission-platform/components@1.0.0
  - @mission-platform/tokens@1.0.0
  - @mission-platform/forms-core@0.2.0
  - @mission-platform/scheduler-core@0.2.0
  - @mission-platform/harper@0.2.0
  - @mission-platform/hunspell@0.4.0
  - @mission-platform/icons@0.2.0
  - @mission-platform/forge-jsx@0.2.0
  - @mission-platform/phone-number@0.3.0

## 0.2.0

### Minor Changes

- 18bd49a: Add the write-once `BaseContainer` layout primitive (shipped to both Vue and React as `Container`). It
  constrains and centres page/section content on the inline axis through three layout options selected by `variant`: **
  `fixed`** (a constant `max-width` from the `sm … 2xl` scale that never changes with the viewport), **`fluid`** (always
  100% of the available width, no `max-width`), and **`responsive`** (a `max-width` that steps up at each platform
  breakpoint, mobile-first). The `fixed`/`fluid` widths plus the `gutter`/`center` controls are inline styles, while the
  `responsive` step-ups live in the co-located CSS Module (the platform breakpoints inlined as range-notation
  `min-width` media queries). Adds the matching Storybook stories (`Layouts/BaseContainer`) and a cross-framework parity
  spec.
- 18bd49a: extract the common layouts into a new `@mission-platform/layouts` package

  Adds the write-once `@mission-platform/layouts` package containing the common layout primitives —
  `BaseApplicationLayout` (public `ApplicationLayout`) and
  `BaseVerticalLayout` (public `VerticalLayout`) — authored once in the neutral
  `@mission-platform/forge-jsx` dialect and compiled straight to both Vue 3 (`./vue`)
  and React (`./react`) by the two-stage `@mission-platform/vite-plugin-forge`
  compiler, with co-located `JSX Components/Layout/<Name>` stories and cross-framework SSR specs.

  **BREAKING (`@mission-platform/components`):** `BaseApplicationLayout` /
  `ApplicationLayout` and `BaseVerticalLayout` / `VerticalLayout` are no longer exported from
  `@mission-platform/components` — import them from
  `@mission-platform/layouts/vue` (or `/react`) instead. `@mission-platform/components`
  gains a neutral `.` root export and a neutral `./base-drawer` subpath so the write-once layouts can reuse `BaseDrawer`
  across packages.

  `@mission-platform/vite-plugin-forge`'s two-stage compiler now remaps neutral imports of the framework-split component
  libraries (`@mission-platform/components`
  and `@mission-platform/layouts`, in addition to `@mission-platform/icons`) — from their root or a neutral subpath — to
  the matching built `./react` / `./vue`
  entry, so write-once components can compose components published by another package.

### Patch Changes

- e1a9272: Drop the third-party `google-libphonenumber` dependency and power `BasePhoneInput`
  with the platform's own `@mission-platform/phone-number` (AssemblyScript/WebAssembly)
  package instead. The co-located `phone.ts` helper now parses, formats (national/E.164), validates per region, lists
  supported regions, provides example numbers and formats as-you-type through the synchronous `PhoneNumberUtil`
  instance, so behaviour is unchanged while the external dependency is removed.
- 10b9e2a: reformat base-container spec SSR render calls onto single lines
- 18bd49a: Add a `src/examples/` Storybook catalogue of layout composition examples (`Layouts/Examples/<Category>`) that
  wire the `Container`, `ApplicationLayout`
  and `VerticalLayout` primitives into realistic page shells for common domains:
  forms, dashboards, configurations, admin, websites, mapping, and routing. The examples are Storybook-only and
  presentational (design-token inline styles, no real widgets), and the package `llms.txt` documents the new catalogue.
- ca1d98b: reformat sources with updated prettier print width and import ordering
- d39b6fc: add per-workspace reference documentation and refresh llms.txt/README metadata
- f681d82: rename storybook stories to the .vue.stories suffix for framework clarity
- 18bd49a: rename the Storybook top-level sections so the catalogue reflects the package split

  The cross-framework catalogue no longer prefixes its sections with `JSX`: the
  `JSX Components/<Category>/<Name>` stories are now `Components/<Category>/<Name>`
  and the `JSX Icons/<Category>/<Name>` stories are now `Icons/<Category>/<Name>`
  (both Vue and React Storybooks). The components extracted into their own packages get their own top-level Storybook
  section instead of nesting under `Components`:
  `@mission-platform/layouts` stories move to `Layouts/<Name>` and
  `@mission-platform/forms` stories move to `Forms/<Name>`.

- Updated dependencies [e1a9272]
- Updated dependencies [e1a9272]
- Updated dependencies [4218ce5]
- Updated dependencies [eefe5d0]
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
- Updated dependencies [4218ce5]
- Updated dependencies [bbc9903]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [18bd49a]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
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
- Updated dependencies [d37e102]
- Updated dependencies [ca1d98b]
- Updated dependencies [d39b6fc]
- Updated dependencies [9cdfef1]
- Updated dependencies [9cdfef1]
- Updated dependencies [6551abb]
- Updated dependencies [4218ce5]
- Updated dependencies [edb785f]
- Updated dependencies [be8ab67]
- Updated dependencies [18bd49a]
- Updated dependencies [8d64a2b]
- Updated dependencies [4218ce5]
- Updated dependencies [4218ce5]
- Updated dependencies [4218ce5]
- Updated dependencies [4218ce5]
- Updated dependencies [be8ab67]
- Updated dependencies [4218ce5]
- Updated dependencies [4218ce5]
- Updated dependencies [4218ce5]
- Updated dependencies [4218ce5]
- Updated dependencies [be8ab67]
- Updated dependencies [be8ab67]
- Updated dependencies [be8ab67]
- Updated dependencies [7534f50]
- Updated dependencies [edb785f]
- Updated dependencies [be8ab67]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
  - @mission-platform/components@1.0.0
  - @mission-platform/tokens@1.0.0
  - @mission-platform/forms-core@0.2.0
  - @mission-platform/scheduler-core@0.2.0
  - @mission-platform/harper@0.2.0
  - @mission-platform/hunspell@0.4.0
  - @mission-platform/icons@0.2.0
  - @mission-platform/forge-jsx@0.2.0
  - @mission-platform/phone-number@0.3.0

## 0.2.0

### Minor Changes

- 18bd49a: Add the write-once `BaseContainer` layout primitive (shipped to both Vue and React as `Container`). It
  constrains and centres page/section content on the inline axis through three layout options selected by `variant`: **
  `fixed`** (a constant `max-width` from the `sm … 2xl` scale that never changes with the viewport), **`fluid`** (always
  100% of the available width, no `max-width`), and **`responsive`** (a `max-width` that steps up at each platform
  breakpoint, mobile-first). The `fixed`/`fluid` widths plus the `gutter`/`center` controls are inline styles, while the
  `responsive` step-ups live in the co-located CSS Module (the platform breakpoints inlined as range-notation
  `min-width` media queries). Adds the matching Storybook stories (`Layouts/BaseContainer`) and a cross-framework parity
  spec.
- 18bd49a: extract the common layouts into a new `@mission-platform/layouts` package

  Adds the write-once `@mission-platform/layouts` package containing the common layout primitives —
  `BaseApplicationLayout` (public `ApplicationLayout`) and
  `BaseVerticalLayout` (public `VerticalLayout`) — authored once in the neutral
  `@mission-platform/forge-jsx` dialect and compiled straight to both Vue 3 (`./vue`)
  and React (`./react`) by the two-stage `@mission-platform/vite-plugin-forge`
  compiler, with co-located `JSX Components/Layout/<Name>` stories and cross-framework SSR specs.

  **BREAKING (`@mission-platform/components`):** `BaseApplicationLayout` /
  `ApplicationLayout` and `BaseVerticalLayout` / `VerticalLayout` are no longer exported from
  `@mission-platform/components` — import them from
  `@mission-platform/layouts/vue` (or `/react`) instead. `@mission-platform/components`
  gains a neutral `.` root export and a neutral `./base-drawer` subpath so the write-once layouts can reuse `BaseDrawer`
  across packages.

  `@mission-platform/vite-plugin-forge`'s two-stage compiler now remaps neutral imports of the framework-split component
  libraries (`@mission-platform/components`
  and `@mission-platform/layouts`, in addition to `@mission-platform/icons`) — from their root or a neutral subpath — to
  the matching built `./react` / `./vue`
  entry, so write-once components can compose components published by another package.

### Patch Changes

- e1a9272: Drop the third-party `google-libphonenumber` dependency and power `BasePhoneInput`
  with the platform's own `@mission-platform/phone-number` (AssemblyScript/WebAssembly)
  package instead. The co-located `phone.ts` helper now parses, formats (national/E.164), validates per region, lists
  supported regions, provides example numbers and formats as-you-type through the synchronous `PhoneNumberUtil`
  instance, so behaviour is unchanged while the external dependency is removed.
- 10b9e2a: reformat base-container spec SSR render calls onto single lines
- 18bd49a: Add a `src/examples/` Storybook catalogue of layout composition examples (`Layouts/Examples/<Category>`) that
  wire the `Container`, `ApplicationLayout`
  and `VerticalLayout` primitives into realistic page shells for common domains:
  forms, dashboards, configurations, admin, websites, mapping, and routing. The examples are Storybook-only and
  presentational (design-token inline styles, no real widgets), and the package `llms.txt` documents the new catalogue.
- ca1d98b: reformat sources with updated prettier print width and import ordering
- d39b6fc: add per-workspace reference documentation and refresh llms.txt/README metadata
- f681d82: rename storybook stories to the .vue.stories suffix for framework clarity
- 18bd49a: rename the Storybook top-level sections so the catalogue reflects the package split

  The cross-framework catalogue no longer prefixes its sections with `JSX`: the
  `JSX Components/<Category>/<Name>` stories are now `Components/<Category>/<Name>`
  and the `JSX Icons/<Category>/<Name>` stories are now `Icons/<Category>/<Name>`
  (both Vue and React Storybooks). The components extracted into their own packages get their own top-level Storybook
  section instead of nesting under `Components`:
  `@mission-platform/layouts` stories move to `Layouts/<Name>` and
  `@mission-platform/forms` stories move to `Forms/<Name>`.

- Updated dependencies [e1a9272]
- Updated dependencies [e1a9272]
- Updated dependencies [4218ce5]
- Updated dependencies [eefe5d0]
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
- Updated dependencies [4218ce5]
- Updated dependencies [bbc9903]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [18bd49a]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
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
- Updated dependencies [d37e102]
- Updated dependencies [ca1d98b]
- Updated dependencies [d39b6fc]
- Updated dependencies [9cdfef1]
- Updated dependencies [9cdfef1]
- Updated dependencies [6551abb]
- Updated dependencies [4218ce5]
- Updated dependencies [edb785f]
- Updated dependencies [be8ab67]
- Updated dependencies [18bd49a]
- Updated dependencies [8d64a2b]
- Updated dependencies [4218ce5]
- Updated dependencies [4218ce5]
- Updated dependencies [4218ce5]
- Updated dependencies [4218ce5]
- Updated dependencies [be8ab67]
- Updated dependencies [4218ce5]
- Updated dependencies [4218ce5]
- Updated dependencies [4218ce5]
- Updated dependencies [4218ce5]
- Updated dependencies [be8ab67]
- Updated dependencies [be8ab67]
- Updated dependencies [be8ab67]
- Updated dependencies [7534f50]
- Updated dependencies [edb785f]
- Updated dependencies [be8ab67]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
  - @mission-platform/components@1.0.0
  - @mission-platform/tokens@1.0.0
  - @mission-platform/forms-core@0.2.0
  - @mission-platform/scheduler-core@0.2.0
  - @mission-platform/harper@0.2.0
  - @mission-platform/hunspell@0.4.0
  - @mission-platform/icons@0.2.0
  - @mission-platform/forge-jsx@0.2.0
  - @mission-platform/phone-number@0.3.0

## 0.2.0

### Minor Changes

- 18bd49a: Add the write-once `BaseContainer` layout primitive (shipped to both Vue and React as `Container`). It
  constrains and centres page/section content on the inline axis through three layout options selected by `variant`: **
  `fixed`** (a constant `max-width` from the `sm … 2xl` scale that never changes with the viewport), **`fluid`** (always
  100% of the available width, no `max-width`), and **`responsive`** (a `max-width` that steps up at each platform
  breakpoint, mobile-first). The `fixed`/`fluid` widths plus the `gutter`/`center` controls are inline styles, while the
  `responsive` step-ups live in the co-located CSS Module (the platform breakpoints inlined as range-notation
  `min-width` media queries). Adds the matching Storybook stories (`Layouts/BaseContainer`) and a cross-framework parity
  spec.
- 18bd49a: extract the common layouts into a new `@mission-platform/layouts` package

  Adds the write-once `@mission-platform/layouts` package containing the common layout primitives —
  `BaseApplicationLayout` (public `ApplicationLayout`) and
  `BaseVerticalLayout` (public `VerticalLayout`) — authored once in the neutral
  `@mission-platform/forge-jsx` dialect and compiled straight to both Vue 3 (`./vue`)
  and React (`./react`) by the two-stage `@mission-platform/vite-plugin-forge`
  compiler, with co-located `JSX Components/Layout/<Name>` stories and cross-framework SSR specs.

  **BREAKING (`@mission-platform/components`):** `BaseApplicationLayout` /
  `ApplicationLayout` and `BaseVerticalLayout` / `VerticalLayout` are no longer exported from
  `@mission-platform/components` — import them from
  `@mission-platform/layouts/vue` (or `/react`) instead. `@mission-platform/components`
  gains a neutral `.` root export and a neutral `./base-drawer` subpath so the write-once layouts can reuse `BaseDrawer`
  across packages.

  `@mission-platform/vite-plugin-forge`'s two-stage compiler now remaps neutral imports of the framework-split component
  libraries (`@mission-platform/components`
  and `@mission-platform/layouts`, in addition to `@mission-platform/icons`) — from their root or a neutral subpath — to
  the matching built `./react` / `./vue`
  entry, so write-once components can compose components published by another package.

### Patch Changes

- e1a9272: Drop the third-party `google-libphonenumber` dependency and power `BasePhoneInput`
  with the platform's own `@mission-platform/phone-number` (AssemblyScript/WebAssembly)
  package instead. The co-located `phone.ts` helper now parses, formats (national/E.164), validates per region, lists
  supported regions, provides example numbers and formats as-you-type through the synchronous `PhoneNumberUtil`
  instance, so behaviour is unchanged while the external dependency is removed.
- 10b9e2a: reformat base-container spec SSR render calls onto single lines
- 18bd49a: Add a `src/examples/` Storybook catalogue of layout composition examples (`Layouts/Examples/<Category>`) that
  wire the `Container`, `ApplicationLayout`
  and `VerticalLayout` primitives into realistic page shells for common domains:
  forms, dashboards, configurations, admin, websites, mapping, and routing. The examples are Storybook-only and
  presentational (design-token inline styles, no real widgets), and the package `llms.txt` documents the new catalogue.
- ca1d98b: reformat sources with updated prettier print width and import ordering
- d39b6fc: add per-workspace reference documentation and refresh llms.txt/README metadata
- f681d82: rename storybook stories to the .vue.stories suffix for framework clarity
- 18bd49a: rename the Storybook top-level sections so the catalogue reflects the package split

  The cross-framework catalogue no longer prefixes its sections with `JSX`: the
  `JSX Components/<Category>/<Name>` stories are now `Components/<Category>/<Name>`
  and the `JSX Icons/<Category>/<Name>` stories are now `Icons/<Category>/<Name>`
  (both Vue and React Storybooks). The components extracted into their own packages get their own top-level Storybook
  section instead of nesting under `Components`:
  `@mission-platform/layouts` stories move to `Layouts/<Name>` and
  `@mission-platform/forms` stories move to `Forms/<Name>`.

- Updated dependencies [e1a9272]
- Updated dependencies [e1a9272]
- Updated dependencies [4218ce5]
- Updated dependencies [eefe5d0]
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
- Updated dependencies [4218ce5]
- Updated dependencies [bbc9903]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [18bd49a]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
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
- Updated dependencies [d37e102]
- Updated dependencies [ca1d98b]
- Updated dependencies [d39b6fc]
- Updated dependencies [9cdfef1]
- Updated dependencies [9cdfef1]
- Updated dependencies [6551abb]
- Updated dependencies [4218ce5]
- Updated dependencies [edb785f]
- Updated dependencies [be8ab67]
- Updated dependencies [18bd49a]
- Updated dependencies [8d64a2b]
- Updated dependencies [4218ce5]
- Updated dependencies [4218ce5]
- Updated dependencies [4218ce5]
- Updated dependencies [4218ce5]
- Updated dependencies [be8ab67]
- Updated dependencies [4218ce5]
- Updated dependencies [4218ce5]
- Updated dependencies [4218ce5]
- Updated dependencies [4218ce5]
- Updated dependencies [be8ab67]
- Updated dependencies [be8ab67]
- Updated dependencies [be8ab67]
- Updated dependencies [7534f50]
- Updated dependencies [edb785f]
- Updated dependencies [be8ab67]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
  - @mission-platform/components@1.0.0
  - @mission-platform/tokens@1.0.0
  - @mission-platform/forms-core@0.2.0
  - @mission-platform/scheduler-core@0.2.0
  - @mission-platform/harper@0.2.0
  - @mission-platform/hunspell@0.4.0
  - @mission-platform/icons@0.2.0
  - @mission-platform/forge-jsx@0.2.0
  - @mission-platform/phone-number@0.3.0
