# @mission-platform/rxjs

## 1.0.1

### Patch Changes

- c32bb83: centralize package documentation generation in the repository build
- 26a9cfe: align package import ordering lint configuration
- f331f02: fix story import ordering
- 8a15dbc: add generated package API references and build-time documentation extraction
- Updated dependencies [c32bb83]
- Updated dependencies [f216404]
- Updated dependencies [89aab02]
- Updated dependencies [8a15dbc]
  - @mission-platform/forge@1.1.0

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

- 7c91132: add Solid, Svelte, and Web Components code generators and per-framework build targets

  The JSX plugin now emits Solid, Svelte, and Web Components modules alongside the existing Vue and React outputs, and every write-once component package gains matching `build:solid`, `build:svelte`, and `build:web-components` targets plus optional peer dependencies for the new frameworks.

### Patch Changes

- 4cd7197: support nested composables/utils folders in the hook-library compiler

  The write-once hook compiler in `@mission-platform/vite-plugin-forge` now
  preserves nested module folders instead of flattening hook files to the `src/`
  root: relative re-exports are kept, the shared effect helper import is rewritten
  to the correct depth (`../mp-effect`), and per-framework declarations are
  emitted recursively. This lets hook libraries adopt the same hierarchical
  `src/{composables,utils}/` layout as component packages.

  `@mission-platform/d3` and `@mission-platform/rxjs` are reorganised onto that
  layout — their composables move under `src/composables/` (and d3's helpers
  under `src/utils/`) with `index.ts` barrels — with no change to their public
  export surface.

- ac98203: normalize composable directories, package barrels, and colocated tests
- 8bd60ae: reformat sources with prettier

  Apply the repository prettier style across sources, config manifests (`tsconfig.test.json`, `turbo.json`,
  `vite.config.ts`), stories, and documentation. Formatting-only; no runtime or API changes.

- ffa5129: relicense the project from MIT to BSD-4-Clause
- 4367cef: fix Storybook rendering on non-Vue frameworks

  The unified Storybook only registered a JSX transform for the Vue renderer, so
  under React/Solid/Svelte/Web-Component the shared neutral `*.stories.tsx` were
  compiled by Vite's core esbuild using the stories tsconfig's
  `jsxImportSource: "vue"` — emitting Vue vnodes into the wrong runtime and
  crashing every non-Vue renderer with `Objects are not valid as a React child`.

  `createStorybookConfig` now registers the matching JSX transform per framework
  (`@vitejs/plugin-react` for React; the `storybook-solidjs-vite` framework adapter
  for Solid, replacing the generic `@storybook/html-vite` fallback that could not
  mount Solid components), and drops a package's stories when that package ships no
  build for the active framework (so `wysiwyg`/`breakpoints`, which build only Vue
  and React, no longer break the Solid/Svelte/Web-Component preview with
  `MISSING_EXPORT`). The `@mission-platform/rxjs` demo story now authors its markup
  in JSX instead of a direct neutral `h(...)` call so it compiles to the active
  framework.

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
- Updated dependencies [ffa5129]
- Updated dependencies [3fb8ddb]
- Updated dependencies [7d95459]
- Updated dependencies [f67e304]
  - @mission-platform/forge@1.0.0

## 0.2.0

### Minor Changes

- 6f9dfef: add a framework-neutral rxjs integration package with useObservable, useSubscription and useSubscribe built
  on the neutral jsx hooks

### Patch Changes

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
  - @mission-platform/forge@0.2.0
