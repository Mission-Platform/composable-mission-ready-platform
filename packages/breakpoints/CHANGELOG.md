# @mission-platform/breakpoints

## 6.0.0

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

- be97ac0: Use deterministic fixtures and interaction setup in React Storybook stories.
- Updated dependencies [be97ac0]
  - @mission-platform/i18n@2.1.0
  - @mission-platform/forge@1.0.0

## 5.0.0

### Major Changes

- 204ed8e: split breakpoints into a framework-agnostic, write-once package

  `@mission-platform/breakpoints` is now authored once in the neutral `@mission-platform/forge` dialect and compiled to **both Vue 3 and React** by `@mission-platform/vite-plugin-forge` (mirroring `@mission-platform/icons`), replacing the hand-written Vue SFCs.

  - **New subpaths:** import components from `@mission-platform/breakpoints/vue` or `@mission-platform/breakpoints/react`. The framework-agnostic utilities (`breakpointKeys`, `breakpoints`, `getBreakpointValue`, `mediaQuery`, `maxMediaQuery`, `resolveBreakpoint`) and types now live on `@mission-platform/breakpoints/core`. The root `.` entry is the neutral JSX source barrel for write-once components.
  - **Breaking — root exports:** the root `.` entry no longer re-exports the core utilities/values; import them from `@mission-platform/breakpoints/core` instead.
  - **Breaking — `useBreakpoints` removed:** the Vue-only composable relied on `ref`/`onMounted` and cannot exist as a standalone compiled hook. Build custom reactive viewport logic on the `/core` helpers with your framework's own hooks.
  - `ShowAt`, `HideAt`, and `BreakpointDebug` are unchanged in behaviour; `BreakpointDebug` keeps its i18next-localised labels (`mp.breakpoints` namespace) with English defaults.

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

### Patch Changes

- f67e304: fix component styles not loading in apps and Storybook

  `defineTsdownLibrary` now re-links every extracted stylesheet to the JS module that owns it via a `writeBundle` pass (opt out with `cssBundle: false`). Under the tsdown/Rolldown build, co-located `*.module.scss` / `*.scss` imports were extracted to standalone `.css` assets but their side-effect imports were dropped from the JS (left as `/* empty css */`), so importing a component shipped its markup without its styles. Each `X.css` is now imported from its CSS-Module class map (`X.module.js`) — or, for the Vue build, from the component chunk (`X.vue_vue_type_style_*.css` → `X.js`) — so importing a single component (or the package barrel) automatically loads exactly its styles again, matching the historical Vite library build.

- ac98203: normalize composable directories, package barrels, and colocated tests
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
- Updated dependencies [96f607a]
- Updated dependencies [7a1b1a1]
- Updated dependencies [bd88e5e]
- Updated dependencies [6290b4c]
- Updated dependencies [828331e]
- Updated dependencies [0c0d5d7]
- Updated dependencies [ac98203]
- Updated dependencies [ffa5129]
- Updated dependencies [0371781]
- Updated dependencies [3fb8ddb]
- Updated dependencies [7d95459]
- Updated dependencies [f67e304]
  - @mission-platform/forge@1.0.0
  - @mission-platform/i18n@2.0.0

## 4.0.0

### Major Changes

- 4218ce5: move the breakpoint SCSS layer into the tokens package

  The breakpoint SCSS variables (`$bp-*`, `$breakpoints`), the
  `bp-up`/`bp-down`/`bp-between`/`bp-only` mixins, and the
  `.bp-show-*`/`.bp-hide-*`/`.bp-only-*` visibility utility classes now live in
  `@mission-platform/tokens`, exported as `@mission-platform/tokens/scss/breakpoints-mixins`
  (variables + mixins, no emitted CSS) and `@mission-platform/tokens/scss/breakpoints`
  (the above plus the utility classes).

  BREAKING CHANGE: `@mission-platform/breakpoints` no longer exports
  `./scss/breakpoints` or `./scss/mixins`; import the breakpoint SCSS from
  `@mission-platform/tokens/scss/breakpoints-mixins` (or `.../scss/breakpoints`)
  instead. The package continues to export the `useBreakpoints` composable and the
  `<ShowAt>`/`<HideAt>`/`<BreakpointDebug>` components unchanged.

### Minor Changes

- 47a5188: wrap component styles in the `@layer mp.breakpoints` cascade layer

  The `@mission-platform/breakpoints` SFC `<style>` rules are now wrapped in the
  `@layer mp.breakpoints` cascade layer (any leading `@use` stays outside the layer), so unlayered application styles
  win over them without specificity battles.

### Patch Changes

- 651c349: rebuild i18n as a framework-agnostic i18next wrapper

  `@mission-platform/i18n` is now built on [i18next](https://www.i18next.com/)
  instead of vue-i18n. The root entry is framework-neutral — `createMpI18n()`
  returns a plain, synchronously-initialised i18next instance with single-brace interpolation (`{name}`) and HTML
  escaping left to the framework — and two thin adapter subpaths are added: `@mission-platform/i18n/vue` (built on
  `i18next-vue`, exporting `createMpI18nVue` + a reactive `useI18n`) and `@mission-platform/i18n/react`
  (built on `react-i18next`, exporting `MpI18nProvider` + `useI18n`).

  BREAKING CHANGE: the root export no longer installs a Vue plugin or exposes a Vue `useI18n`. Install the instance with
  `app.use(createMpI18nVue(createMpI18n(...)))`
  and import `useI18n` from `@mission-platform/i18n/vue` (or `/react`). `createMpI18n`
  now returns an i18next instance (`i18n.t`, `i18n.changeLanguage`, `i18n.language`)
  rather than a vue-i18n instance with `i18n.global`. Consumers of the Vue adapter must provide `vue` + `i18next-vue`
  (React consumers: `react`/`react-dom` +
  `react-i18next`) as they are optional peer dependencies.

- 651c349: add `mp.<workspace>` i18next namespaces with per-namespace app overrides

  `@mission-platform/i18n` now groups strings into i18next namespaces: every package lives under `mp.<package_name>` and
  every app under `mp.<app_name>`. New exports `mpNamespace('<workspace>')` (e.g. `mp.breakpoints`) and
  `localeNamespaces(locale, bundles)` (turns the extractor's namespace-keyed runtime `src/locales/<locale>.yaml` into
  the option shape) join the existing core API, alongside the `namespaces` and `overrides` options on `createMpI18n`
  and the `deepMergeMessages`/`deepMergeLocales` helpers.

  Apps set their own `namespace: mpNamespace('<app>')` as the default (which falls back to every other namespace, so
  component code keeps resolving keys it owns)
  and can deep-merge per-namespace `overrides` on top of a package's strings to relabel just the keys they need. The
  Vue/React `useI18n(namespace?)` accepts an optional namespace, and `breakpoint-debug` now resolves its own
  `mp.breakpoints`
  namespace.

- d39b6fc: add per-workspace reference documentation and refresh llms.txt/README metadata
- f681d82: rename storybook stories to the .vue.stories suffix for framework clarity
- Updated dependencies [651c349]
- Updated dependencies [4ffe6a7]
- Updated dependencies [651c349]
- Updated dependencies [d37e102]
- Updated dependencies [d39b6fc]
  - @mission-platform/i18n@1.0.0

## 3.0.1

### Patch Changes

- 075a5a2: normalize source formatting and import ordering

  Apply the repo-wide Prettier/ESLint formatting pass (line reflow, attribute and import ordering, barrel-import paths,
  and simplified GeoJSON `Feature` typings in `map`). No runtime behaviour changes.

- Updated dependencies [dc84af7]
  - @mission-platform/i18n@0.4.1

## 3.0.0

### Minor Changes

- f0a0e11: emit code-split, tree-shakeable library builds

  `defineLibraryConfig` now preserves the source module graph (one output file per module) and externalises each
  package's own `dependencies`/`peerDependencies` by default, so consumers get first-class tree shaking and code
  splitting. Packages that ship a single self-contained artifact (workers, WASM entries, the flat token bundle) opt out
  via the new `preserveModules: false` option. The main entry of each preserved-module package is now emitted as
  `dist/index.js`.

### Patch Changes

- Updated dependencies [f0a0e11]
  - @mission-platform/i18n@0.4.0

## 2.0.1

### Patch Changes

- 266acd6: add `build:watch` script for incremental rebuilds during development
- Updated dependencies [266acd6]
  - @mission-platform/i18n@0.3.1

## 2.0.0

### Patch Changes

- 9e8198e: use shared `@mission-platform/typescript-config` and `@mission-platform/vite-config`

  Migrates the package's `vite.config.ts`, `vitest.config.ts`, and the four `tsconfig.*.json` files to extend the shared
  workspaces under
  `configs/`. No runtime or public-API change — `dist/` output is identical.

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

- Updated dependencies [d2bf0e1]
- Updated dependencies [c8f7e0a]
- Updated dependencies [2e27467]
- Updated dependencies [05d31c9]
- Updated dependencies [cf89515]
  - @mission-platform/i18n@0.3.0

## 1.0.0

### Patch Changes

- Updated dependencies [ba565b3]
  - @mission-platform/i18n@0.2.0

## 0.1.0

### Minor Changes

- feat: initial breakpoints package with responsive SCSS utilities and useBreakpoints composable
