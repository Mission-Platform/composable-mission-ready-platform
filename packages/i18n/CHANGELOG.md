# @mission-platform/i18n

## 2.1.0

### Minor Changes

- be97ac0: Expose the neutral `useI18n` fallback (`useI18n` / `UseI18nReturn`) so non-Vue/non-React builds can compile consistently.

## 2.0.0

### Major Changes

- 96f607a: restructure the package into `components`/`composables`/`utils`/`stores` and rebrand the public API from `Mp`/`mp` to `Forge`/`forge`

  BREAKING CHANGE: the shipped implementation now adopts the server-context-aware core, and every public symbol is renamed (`MpI18n` → `ForgeI18N`, `MpI18nProvider` → `ForgeI18NProvider`, `createMpI18n` → `createForgeI18N`, `createMpI18nVue` → `createForgeI18NVue`, `mpNamespace` → `forgeNamespace`, `MP_*` → `FORGE_*`, etc.). Consumers must update all imports; runtime namespace string values (`'mp'`) are unchanged.

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

### Patch Changes

- 828331e: lazily load `node:async_hooks` so it never enters the browser bundle

  A static `import { AsyncLocalStorage } from 'node:async_hooks'` made bundlers such as Vite externalize the module for
  the browser and hoist the property access above the environment guard, throwing at module load in client code. The
  server-side request-context storage is now initialised via a dynamic import restricted to non-browser environments,
  keeping `node:async_hooks` out of the browser module graph while the server (Node, Cloudflare Workers with
  `nodejs_compat`) still gets real request-scoped isolation.

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

## 1.0.0

### Major Changes

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

### Minor Changes

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

### Patch Changes

- 4ffe6a7: align build tsconfig compiler options and add the test project reference
- d37e102: add targeted eslint-disable comments for new unicorn rule violations
- d39b6fc: add per-workspace reference documentation and refresh llms.txt/README metadata

## 0.4.1

### Patch Changes

- dc84af7: create the vue-i18n instance in Composition API mode (`legacy: false`)

  `createMpI18n` now sets `legacy: false`, matching how every consumer already uses the package (`useI18n()` in
  `<script setup>`). This makes `i18n.global.locale` a `WritableComputedRef`, so apps can read and assign the active
  locale via `i18n.global.locale.value` without TypeScript errors.

## 0.4.0

### Minor Changes

- f0a0e11: emit code-split, tree-shakeable library builds

  `defineLibraryConfig` now preserves the source module graph (one output file per module) and externalises each
  package's own `dependencies`/`peerDependencies` by default, so consumers get first-class tree shaking and code
  splitting. Packages that ship a single self-contained artifact (workers, WASM entries, the flat token bundle) opt out
  via the new `preserveModules: false` option. The main entry of each preserved-module package is now emitted as
  `dist/index.js`.

## 0.3.1

### Patch Changes

- 266acd6: add `build:watch` script for incremental rebuilds during development

## 0.3.0

### Minor Changes

- d2bf0e1: Export public locale types (`MpLocaleModule`, `MpLocales`, `MpMessageObject`, `MpMessageValue`) from the
  package entry point so consumers can type their locale message bundles without reaching into internal paths.
- 2e27467: Support nested message objects in `MpLocaleModule` and `MpLocales` types. Locale message values can now be
  either strings or recursively nested message objects, aligning with vue-i18n's native message schema.

### Patch Changes

- c8f7e0a: use shared `@mission-platform/typescript-config` and `@mission-platform/vite-config`

  Migrates `vite.config.ts`, `vitest.config.ts`, `tsconfig.build.json`, and `tsconfig.node.json` to extend the shared
  workspaces under
  `configs/`. No runtime or public-API change.

- 05d31c9: normalize lint and format scripts across all workspaces

  Add consistent `lint:fix`, `lint:style:fix`, and `format:write` scripts to every workspace, and make `format` run
  `prettier --check` instead of `prettier --write` so it can be used as a non-mutating verification step.

- cf89515: enable tree shaking support when consumed by apps

  Declares `"sideEffects"` in each package's `package.json` so app bundlers (Vite/Rollup) can safely drop unused
  exports. Pure-TypeScript packages (`harper`, `hunspell`, `i18n`) opt out of side effects entirely with
  `"sideEffects": false`. Packages that ship styles and/or Vue SFCs (`breakpoints`, `components`, `icons`, `map`,
  `tokens`) keep `*.css`,
  `*.scss`, and `*.vue` files marked as side-effectful so component styles and SCSS entrypoints are preserved.

## 0.2.0

### Minor Changes

- ba565b3: refactor locale strategy to use SFC-local i18n blocks

  Remove file-based locale modules (`defineLocales`, `mergeLocales`, `MpMessages`, `MpLocales` types,
  `./locales` entry point, and `i18n:compile` script). Component locale strings now live directly in each SFC `<i18n>`
  block. `createMpI18n` still accepts optional `modules` and `messages` for app-level custom keys.

## 0.1.0

### Minor Changes

- feat: initial i18n package with locale definition helpers, merging utilities and Vue I18n integration
