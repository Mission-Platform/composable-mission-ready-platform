# @mission-platform/router

## 1.1.0

### Minor Changes

- f216404: add framework-neutral router contracts and compiler tooling integration

### Patch Changes

- c32bb83: centralize package documentation generation in the repository build
- 8a15dbc: add generated package API references and build-time documentation extraction

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

## 0.2.0

### Minor Changes

- afcf930: add a framework-agnostic routing package with a vue-router adapter

  `@mission-platform/router` lets you describe routes and navigation targets once in a framework-neutral model and
  translate them into a real router per framework. The root entry is dependency-free — an `MpRoute` tree plus pure
  helpers for compiling/matching/building paths (`compilePath`, `matchPath`,
  `buildPath`, `normalizePath`), parsing/serialising query strings (`parseQuery`, `stringifyQuery`) and locations
  (`parseLocation`,
  `stringifyLocation`, `normalizeHash`), and flattening/resolving route trees (`defineRoutes`, `flattenRoutes`,
  `findRouteByName`, `matchRoutes`,
  `resolveLocation`, `createRouteResolver`).

  The `@mission-platform/router/vue` adapter (built on `vue-router` 4, an optional peer dependency) ships
  `createMpRouter` (returns an installable `Router` with
  `web`/`hash`/`memory` history), the `useMpRouter`/`useMpRoute` composables, an
  `MpRouterLink` component whose `to` accepts the neutral location, and the
  `toVueRoutes`/`toVueLocation` translators. The neutral path grammar (`:param`,
  `:param?`, `:param*`/`:param+`, and a standalone `*` catch-all) mirrors vue-router's, so translation is near
  pass-through and the same `MpRoute` tree is designed to extend to react-router, TanStack Router, Next.js, and Nuxt.

### Patch Changes

- d39b6fc: add per-workspace reference documentation and refresh llms.txt/README metadata

## 0.2.0

### Minor Changes

- afcf930: add a framework-agnostic routing package with a vue-router adapter

  `@mission-platform/router` lets you describe routes and navigation targets once in a framework-neutral model and
  translate them into a real router per framework. The root entry is dependency-free — an `MpRoute` tree plus pure
  helpers for compiling/matching/building paths (`compilePath`, `matchPath`,
  `buildPath`, `normalizePath`), parsing/serialising query strings (`parseQuery`, `stringifyQuery`) and locations
  (`parseLocation`,
  `stringifyLocation`, `normalizeHash`), and flattening/resolving route trees (`defineRoutes`, `flattenRoutes`,
  `findRouteByName`, `matchRoutes`,
  `resolveLocation`, `createRouteResolver`).

  The `@mission-platform/router/vue` adapter (built on `vue-router` 4, an optional peer dependency) ships
  `createMpRouter` (returns an installable `Router` with
  `web`/`hash`/`memory` history), the `useMpRouter`/`useMpRoute` composables, an
  `MpRouterLink` component whose `to` accepts the neutral location, and the
  `toVueRoutes`/`toVueLocation` translators. The neutral path grammar (`:param`,
  `:param?`, `:param*`/`:param+`, and a standalone `*` catch-all) mirrors vue-router's, so translation is near
  pass-through and the same `MpRoute` tree is designed to extend to react-router, TanStack Router, Next.js, and Nuxt.

### Patch Changes

- d39b6fc: add per-workspace reference documentation and refresh llms.txt/README metadata

## 0.2.0

### Minor Changes

- afcf930: add a framework-agnostic routing package with a vue-router adapter

  `@mission-platform/router` lets you describe routes and navigation targets once in a framework-neutral model and
  translate them into a real router per framework. The root entry is dependency-free — an `MpRoute` tree plus pure
  helpers for compiling/matching/building paths (`compilePath`, `matchPath`,
  `buildPath`, `normalizePath`), parsing/serialising query strings (`parseQuery`, `stringifyQuery`) and locations
  (`parseLocation`,
  `stringifyLocation`, `normalizeHash`), and flattening/resolving route trees (`defineRoutes`, `flattenRoutes`,
  `findRouteByName`, `matchRoutes`,
  `resolveLocation`, `createRouteResolver`).

  The `@mission-platform/router/vue` adapter (built on `vue-router` 4, an optional peer dependency) ships
  `createMpRouter` (returns an installable `Router` with
  `web`/`hash`/`memory` history), the `useMpRouter`/`useMpRoute` composables, an
  `MpRouterLink` component whose `to` accepts the neutral location, and the
  `toVueRoutes`/`toVueLocation` translators. The neutral path grammar (`:param`,
  `:param?`, `:param*`/`:param+`, and a standalone `*` catch-all) mirrors vue-router's, so translation is near
  pass-through and the same `MpRoute` tree is designed to extend to react-router, TanStack Router, Next.js, and Nuxt.

### Patch Changes

- d39b6fc: add per-workspace reference documentation and refresh llms.txt/README metadata

## 0.2.0

### Minor Changes

- afcf930: add a framework-agnostic routing package with a vue-router adapter

  `@mission-platform/router` lets you describe routes and navigation targets once in a framework-neutral model and
  translate them into a real router per framework. The root entry is dependency-free — an `MpRoute` tree plus pure
  helpers for compiling/matching/building paths (`compilePath`, `matchPath`,
  `buildPath`, `normalizePath`), parsing/serialising query strings (`parseQuery`, `stringifyQuery`) and locations
  (`parseLocation`,
  `stringifyLocation`, `normalizeHash`), and flattening/resolving route trees (`defineRoutes`, `flattenRoutes`,
  `findRouteByName`, `matchRoutes`,
  `resolveLocation`, `createRouteResolver`).

  The `@mission-platform/router/vue` adapter (built on `vue-router` 4, an optional peer dependency) ships
  `createMpRouter` (returns an installable `Router` with
  `web`/`hash`/`memory` history), the `useMpRouter`/`useMpRoute` composables, an
  `MpRouterLink` component whose `to` accepts the neutral location, and the
  `toVueRoutes`/`toVueLocation` translators. The neutral path grammar (`:param`,
  `:param?`, `:param*`/`:param+`, and a standalone `*` catch-all) mirrors vue-router's, so translation is near
  pass-through and the same `MpRoute` tree is designed to extend to react-router, TanStack Router, Next.js, and Nuxt.

### Patch Changes

- d39b6fc: add per-workspace reference documentation and refresh llms.txt/README metadata
