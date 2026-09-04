# Changelog

## 2.0.2

### Patch Changes

- 7788642: Normalize generated changelog formatting.
- Updated dependencies [355f413]
  - @mission-platform/forge-jsx@2.0.0

## 2.0.1

### Patch Changes

- c32bb83: centralize package documentation generation in the repository build
- 8a15dbc: add generated package API references and build-time documentation extraction
- Updated dependencies [c32bb83]
- Updated dependencies [f216404]
- Updated dependencies [89aab02]
- Updated dependencies [8a15dbc]
  - @mission-platform/forge-jsx@1.1.0

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

### Patch Changes

- @mission-platform/forge-jsx@1.0.0

## 1.0.0

### Major Changes

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

### Patch Changes

- ac98203: normalize composable directories, package barrels, and colocated tests
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
- Updated dependencies [7a1b1a1]
- Updated dependencies [bd88e5e]
- Updated dependencies [0c0d5d7]
- Updated dependencies [ffa5129]
- Updated dependencies [3fb8ddb]
- Updated dependencies [7d95459]
- Updated dependencies [f67e304]
  - @mission-platform/forge-jsx@1.0.0

All notable changes to this project will be documented in this file.

## 0.1.0 (2026-08-04)

### Features

- Initial release of `@mission-platform/observers`.
- Added `useIntersectionObserver`, `useMutationObserver`, and `usePerformanceObserver`.
