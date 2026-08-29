# @mission-platform/map

## 2.0.1

### Patch Changes

- c32bb83: centralize package documentation generation in the repository build
- 8a15dbc: add generated package API references and build-time documentation extraction
- 46fe17a: scope Forge build environment variables to package build tasks
- 31ed685: Run i18n extraction from each configured workspace through the root Turbo task
- Updated dependencies [c32bb83]
- Updated dependencies [f216404]
- Updated dependencies [89aab02]
- Updated dependencies [8a15dbc]
- Updated dependencies [b88a08e]
- Updated dependencies [9e59f09]
- Updated dependencies [97c3f20]
  - @mission-platform/forge@1.1.0
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

- 4714506: add link styles to `ForgeTypography` and a five-renderer story slot helper

  `ForgeTypography` can now render a link two ways: `variant="link"` for
  standalone link text, and `href` on **any** variant so a heading or caption can
  be a link without leaving its own type scale. Links get the link colour, its
  hover/active and `:visited` treatment, a visible focus ring and an
  `underline?: 'always' | 'hover' | 'none'` mode (`'hover'` by default);
  `target="_blank"` adds `rel="noopener noreferrer"` automatically, and an
  explicit `color` still wins. Three new semantic tokens back it in both themes:
  `color.text.link`, `color.text.link-hover` and `color.text.link-visited`.

  `@mission-platform/storybook-framework` gains a `./slots` entry point exporting
  `renderWithSlots(component, properties, slots, children?)` and a `node()` JSX
  factory, with one implementation per renderer behind the `mp:vue`, `mp:react`,
  `mp:solid`, `mp:svelte` and `mp:web-component` export conditions. It is the one
  supported way to fill a component's **named slot** from a neutral story: passing
  a node as a prop only works on the React and Solid builds, so the dropdown,
  popover and navbar stories rendered blank on the other three. The Svelte and
  Web-Component workbenches additionally now compile story JSX through that
  factory, having previously had no JSX transform at all.

  Visual fixes in `@mission-platform/components`: the breadcrumb's current crumb
  now matches its sibling links (it inherits the trail's font and differs only in
  colour, instead of being wrapped in a smaller typography variant); `ForgeMenu`
  reads as a menu surface at rest and its `horizontal` orientation lays out as a
  row with floating submenus; and the `line` tab variant draws its active
  indicator inside the tab's own box, so the tab list's `overflow-x: auto` can no
  longer clip it, with the active label's weight bound to the active state.

  The icon overview gallery now finds every icon on every framework (the Vue build
  exports `defineComponent` objects, not functions), and the map stories render a
  live basemap again — their sized wrapper is an inline element rather than a local
  component taking `children`, which the Vue JSX transform turns into a slot.

- Updated dependencies [4714506]
  - @mission-platform/tokens@1.1.0
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

- acf3726: fix map context provider type error in the map-libre Vue build

  The map instance passed to the context provider is asserted as `Map`, so the Vue build no longer fails type-checking
  after `ref` unwrapping drops the maplibre `Map`'s private members.

- f67e304: fix component styles not loading in apps and Storybook

  `defineTsdownLibrary` now re-links every extracted stylesheet to the JS module that owns it via a `writeBundle` pass (opt out with `cssBundle: false`). Under the tsdown/Rolldown build, co-located `*.module.scss` / `*.scss` imports were extracted to standalone `.css` assets but their side-effect imports were dropped from the JS (left as `/* empty css */`), so importing a component shipped its markup without its styles. Each `X.css` is now imported from its CSS-Module class map (`X.module.js`) — or, for the Vue build, from the component chunk (`X.vue_vue_type_style_*.css` → `X.js`) — so importing a single component (or the package barrel) automatically loads exactly its styles again, matching the historical Vite library build.

- ac98203: normalize composable directories, package barrels, and colocated tests
- 8bd60ae: reformat sources with prettier

  Apply the repository prettier style across sources, config manifests (`tsconfig.test.json`, `turbo.json`,
  `vite.config.ts`), stories, and documentation. Formatting-only; no runtime or API changes.

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

- Updated dependencies [e2525a3]
- Updated dependencies [7a1b1a1]
- Updated dependencies [bd88e5e]
- Updated dependencies [0c0d5d7]
- Updated dependencies [ac98203]
- Updated dependencies [ffa5129]
- Updated dependencies [3fb8ddb]
- Updated dependencies [7d95459]
- Updated dependencies [f67e304]
  - @mission-platform/forge@1.0.0
  - @mission-platform/tokens@1.0.1

## 0.4.0

### Minor Changes

- 2a307f6: wrap component styles in the `@layer mp.map` cascade layer

  Every `@mission-platform/map` SFC `<style>` block now wraps its rules in the
  `@layer mp.map` cascade layer (any leading `@use` stays outside the layer), so unlayered application styles win over
  the map component styles without specificity battles.

### Patch Changes

- 2e24c62: drop redundant `undefined` argument from `shallowRef` calls in `MapLibre`
- 8a590fd: emit `update:mode` from `MapDraw` when the internal drawing mode resets so `:mode` / `v-model:mode` stays in
  sync and drawing can restart after a shape is committed
- 8a590fd: consume `@mission-platform/icons` in the stories instead of the removed Vue `@mission-platform/icons` package
  (`IconRotateCCW`/`IconRotateCW` are now `IconRotateCcw`/`IconRotateCw`)
- edb785f: use @mission-platform/components in stories instead of @mission-platform/components
- ca1d98b: reformat sources with updated prettier print width and import ordering
- d39b6fc: add per-workspace reference documentation and refresh llms.txt/README metadata
- f681d82: rename storybook stories to the .vue.stories suffix for framework clarity
- 4218ce5: generate one SCSS partial and TS module per token source, with barrels

  - The generated token output is now split per DTCG source: every
    `tokens/<file>.tokens.json` produces `src/generated/scss/_<file>.scss` (a self-contained partial with its `$`
    -variables, `--mp-*` custom properties, and
    `@property` registrations whose `initial-value`s resolve to the matching local
    `$`-variables) and `src/generated/ts/<file>.ts` (a single nested `as const`
    object). The aggregate `src/generated/_tokens.scss` (`@forward` barrel) and
    `src/generated/tokens.ts` (re-export barrel) replace the previous
    `_structural.scss`, `flat.ts`, and `tokens.css` artefacts.
  - **BREAKING:** the TypeScript API is now a flat set of per-source nested objects (`palette`, `size`, `font`,
    `typography`, `borderWidth`, `breakpoint`, `motion`,
    `opacity`, `radius`, `shadow`, `spacing`, `zIndex`, `themeLight`, `themeDark`), replacing the previous bespoke
    exports (`colors`, `spacing`, `fontFamilies`,
    `sizeIcons`, `radii`, `shadows`, …). The standalone `@mission-platform/tokens/css`
    bundle export is removed; consume the SCSS entry points instead.
  - `@mission-platform/components`, `@mission-platform/map`, and
    `@mission-platform/icons` are updated to the new token exports (`font.font.family`,
    `palette.color`, and `size.icon` respectively).

- Updated dependencies [4218ce5]
- Updated dependencies [4218ce5]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [94f9acf]
- Updated dependencies [94f9acf]
- Updated dependencies [94f9acf]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [94f9acf]
- Updated dependencies [edb785f]
- Updated dependencies [94f9acf]
- Updated dependencies [94f9acf]
- Updated dependencies [ca1d98b]
- Updated dependencies [d39b6fc]
- Updated dependencies [4218ce5]
- Updated dependencies [be8ab67]
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
- Updated dependencies [be8ab67]
  - @mission-platform/tokens@1.0.0
  - @mission-platform/forge@0.2.0

## 0.2.2

### Patch Changes

- 075a5a2: normalize source formatting and import ordering

  Apply the repo-wide Prettier/ESLint formatting pass (line reflow, attribute and import ordering, barrel-import paths,
  and simplified GeoJSON `Feature` typings in `map`). No runtime behaviour changes.

- Updated dependencies [776e32c]
- Updated dependencies [90bb7dc]
- Updated dependencies [8e634ea]
- Updated dependencies [32013ac]
- Updated dependencies [90928a1]
- Updated dependencies [4e887cf]
- Updated dependencies [6d51afc]
- Updated dependencies [f9f35db]
- Updated dependencies [cf0be57]
- Updated dependencies [2d48c37]
- Updated dependencies [01faab7]
- Updated dependencies [54fdc7a]
- Updated dependencies [dc84af7]
- Updated dependencies [a93a7b2]
- Updated dependencies [075a5a2]
- Updated dependencies [140ad29]
- Updated dependencies [026e5bc]
- Updated dependencies [b4feb31]
- Updated dependencies [bfab936]
  - @mission-platform/components@4.0.0
  - @mission-platform/i18n@0.4.1
  - @mission-platform/icons@1.1.0
  - @mission-platform/tokens@0.3.1

## 0.2.1

### Patch Changes

- Updated dependencies [576b2ed]
- Updated dependencies [e02caaf]
- Updated dependencies [81b33bd]
- Updated dependencies [81b33bd]
- Updated dependencies [c1834ea]
- Updated dependencies [81b33bd]
- Updated dependencies [81b33bd]
- Updated dependencies [81b33bd]
- Updated dependencies [81b33bd]
- Updated dependencies [81b33bd]
- Updated dependencies [e02caaf]
- Updated dependencies [81b33bd]
- Updated dependencies [81b33bd]
- Updated dependencies [81b33bd]
- Updated dependencies [81b33bd]
- Updated dependencies [81b33bd]
- Updated dependencies [81b33bd]
- Updated dependencies [81b33bd]
- Updated dependencies [81b33bd]
- Updated dependencies [81b33bd]
- Updated dependencies [81b33bd]
- Updated dependencies [81b33bd]
- Updated dependencies [81b33bd]
- Updated dependencies [81b33bd]
- Updated dependencies [81b33bd]
- Updated dependencies [81b33bd]
- Updated dependencies [577c4d7]
- Updated dependencies [81b33bd]
- Updated dependencies [a085437]
- Updated dependencies [e02caaf]
- Updated dependencies [e02caaf]
- Updated dependencies [577c4d7]
- Updated dependencies [577c4d7]
- Updated dependencies [dfb4eaa]
- Updated dependencies [81b33bd]
- Updated dependencies [577c4d7]
- Updated dependencies [81b33bd]
- Updated dependencies [81b33bd]
  - @mission-platform/components@3.0.0
  - @mission-platform/i18n@0.4.0
  - @mission-platform/icons@1.0.0
  - @mission-platform/tokens@0.3.0

## 0.2.0

### Minor Changes

- f0a0e11: emit code-split, tree-shakeable library builds

  `defineLibraryConfig` now preserves the source module graph (one output file per module) and externalises each
  package's own `dependencies`/`peerDependencies` by default, so consumers get first-class tree shaking and code
  splitting. Packages that ship a single self-contained artifact (workers, WASM entries, the flat token bundle) opt out
  via the new `preserveModules: false` option. The main entry of each preserved-module package is now emitted as
  `dist/index.js`.

### Patch Changes

- Updated dependencies [f0a0e11]
- Updated dependencies [a6ac78b]
- Updated dependencies [a6ac78b]
  - @mission-platform/icons@1.0.0
  - @mission-platform/i18n@0.4.0
  - @mission-platform/tokens@0.3.0
  - @mission-platform/components@2.0.0

## 0.1.6

### Patch Changes

- 266acd6: add `build:watch` script for incremental rebuilds during development
- Updated dependencies [266acd6]
- Updated dependencies [895c0e3]
- Updated dependencies [5053fb0]
- Updated dependencies [ccc2c34]
- Updated dependencies [37571da]
- Updated dependencies [1e135ae]
- Updated dependencies [c0e4b38]
- Updated dependencies [387331e]
- Updated dependencies [6a1d844]
- Updated dependencies [c958b81]
- Updated dependencies [72c7c44]
- Updated dependencies [3944f87]
- Updated dependencies [b47b849]
- Updated dependencies [e917051]
- Updated dependencies [3b322ce]
- Updated dependencies [58f2f50]
- Updated dependencies [a5d10fd]
- Updated dependencies [3944f87]
- Updated dependencies [3944f87]
- Updated dependencies [3944f87]
- Updated dependencies [3944f87]
- Updated dependencies [b162ee6]
  - @mission-platform/components@1.0.0
  - @mission-platform/i18n@0.3.1
  - @mission-platform/icons@0.2.0
  - @mission-platform/tokens@0.2.0

## 0.1.5

### Patch Changes

- Updated dependencies [2b0cce4]
  - @mission-platform/components@0.3.0

## 0.1.4

### Patch Changes

- 65106e2: use shared `@mission-platform/typescript-config` and `@mission-platform/vite-config`

  Migrates `vite.config.ts`, `vitest.config.ts`, and the `tsconfig.*.json`
  files (build, node, test, storybook) to extend the shared workspaces under `configs/`. `maplibre-gl` is added as a
  Rollup external via the helper's `external`/`globals` options. No runtime or public-API change.

- 05d31c9: normalize lint and format scripts across all workspaces

  Add consistent `lint:fix`, `lint:style:fix`, and `format:write` scripts to every workspace, and make `format` run
  `prettier --check` instead of `prettier --write` so it can be used as a non-mutating verification step.

- 6679759: adopt shared `stories` tsconfig preset for Storybook story files

  Each package that ships Storybook stories now has a dedicated
  `tsconfig.stories.json` extending
  `@mission-platform/typescript-config/stories` and is registered as a project reference from the workspace's root
  `tsconfig.json`. This gives
  `src/**/*.stories.{ts,tsx}` files a dedicated TypeScript project so ESLint's `projectService` can type-check them out
  of the box, and removes the legacy `tsconfig.storybook.json` from
  `@mission-platform/map` in favour of the shared name.

- cf89515: enable tree shaking support when consumed by apps

  Declares `"sideEffects"` in each package's `package.json` so app bundlers (Vite/Rollup) can safely drop unused
  exports. Pure-TypeScript packages (`harper`, `hunspell`, `i18n`) opt out of side effects entirely with
  `"sideEffects": false`. Packages that ship styles and/or Vue SFCs (`breakpoints`, `components`, `icons`, `map`,
  `tokens`) keep `*.css`,
  `*.scss`, and `*.vue` files marked as side-effectful so component styles and SCSS entrypoints are preserved.

- Updated dependencies [a77eafa]
- Updated dependencies [d2bf0e1]
- Updated dependencies [c8f7e0a]
- Updated dependencies [14521e9]
- Updated dependencies [37a17e4]
- Updated dependencies [2e27467]
- Updated dependencies [05d31c9]
- Updated dependencies [6679759]
- Updated dependencies [cf89515]
- Updated dependencies [8314555]
  - @mission-platform/components@0.2.2
  - @mission-platform/i18n@0.3.0
  - @mission-platform/icons@0.1.3
  - @mission-platform/tokens@0.1.2

## 0.1.3

### Patch Changes

- 5dee755: docs (map): add Storybook stories for all map components

  Add stories for MapLibre, MapLayer, MapMarker, MapPopup, and MapSource components with realistic args and controls so
  each component is browsable and visually testable in the Storybook catalogue.

- Updated dependencies [ee616a0]
- Updated dependencies [8687deb]
  - @mission-platform/icons@0.1.2
  - @mission-platform/components@0.2.1

## 0.1.2

### Patch Changes

- ba565b3: remove empty locales placeholder and ./locales export

  The map package had a placeholder `src/locales/index.ts` that depended on
  `defineLocales` from `@mission-platform/i18n`. Since that API has been removed and the map package has no translated
  strings, the file and its `./locales`
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
  - Fix spec files to use `mockImplementation(() => {})` instead of `mockReturnValue()` for `getSource` and `getLayer`
    mocks, avoiding misleading `undefined` return type
  - `mountWithMap` test utility now accepts `Component` type for extra components and uses a type-safe `mergedOptions`
    variable
  - Add `lib` compiler option to `tsconfig.build.json` and `tsconfig.test.json` for explicit DOM/ES2022 lib targets
  - Exclude stories files from `tsconfig.test.json` include and add `tsconfig.storybook.json` reference to root
    `tsconfig.json`
  - Fix `arguments_` destructuring in map-draw and map-layer specs to use index access instead of destructured parameter
    patterns
  - Fix type-unsafe `arguments_.geodesic` access in map-libre.stories.ts by casting through `Record<string, unknown>`

- 30480f4: Remove `@storybook/vue3-vite` from devDependencies. Storybook is an app-level concern and must not be a
  dependency of a library package; it lives exclusively in `apps/storybook`. Also remove unnecessary `as Story` type
  assertion in `map-layer.stories.ts` — the variable's declared type annotation already provides full type checking.
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
