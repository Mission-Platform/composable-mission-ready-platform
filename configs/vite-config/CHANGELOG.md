# @mission-platform/vite-config

## 1.1.0

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

### Patch Changes

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

- a93c68a: mirror framework resolve conditions into the SSR/prerender pass so bare `@mission-platform/<pkg>` imports pick the same framework build server-side
- b23115e: add a workspace-local .prettierignore so build output is excluded from format checks
- Updated dependencies [ffa5129]
- Updated dependencies [f67e304]
  - @mission-platform/postcss-config@0.1.2

## 1.0.0

### Major Changes

- 651c349: drop the bundled vue-i18n plugin and add an i18n-block ignore plugin

  `defineLibraryConfig`, `defineAppConfig`, and `defineVitestConfig` no longer bundle `@intlify/unplugin-vue-i18n`, and
  `vue-i18n` is removed from
  `DEFAULT_LIBRARY_EXTERNALS`. A new `ignoreVueI18nBlocksPlugin` export turns Vue SFC `<i18n>` custom blocks into inert
  no-op modules (those blocks are now only consumed by `scripts/i18n-extract.ts`; translations load from the generated
  `src/locales/*.yaml` bundles via i18next).

  BREAKING CHANGE: Vue SFC `<i18n>` YAML blocks are no longer compiled into vue-i18n message modules, and `vue-i18n` is
  no longer treated as an external by library builds. Load translations through `@mission-platform/i18n` (i18next)
  instead; apps that build their own Vite config can add `ignoreVueI18nBlocksPlugin()`
  to keep `<i18n>` blocks inert.

### Patch Changes

- d39b6fc: add per-workspace reference documentation and refresh llms.txt/README metadata
- e907250: fix a Node ESM directory import in the shared vitest config so recursive test runs resolve correctly
- 72d305a: import ignoreVueI18nBlocksPlugin from the package root instead of index.js
  - @mission-platform/postcss-config@0.1.1

## 0.3.0

### Minor Changes

- f0a0e11: emit code-split, tree-shakeable library builds

  `defineLibraryConfig` now preserves the source module graph (one output file per module) and externalises each
  package's own `dependencies`/`peerDependencies` by default, so consumers get first-class tree shaking and code
  splitting. Packages that ship a single self-contained artifact (workers, WASM entries, the flat token bundle) opt out
  via the new `preserveModules: false` option. The main entry of each preserved-module package is now emitted as
  `dist/index.js`.

### Patch Changes

- c09a726: reduce cyclomatic complexity of `defineLibraryConfig`

  Extract the entry-resolution and Rollup `output` branching into the
  `resolveLibraryEntry` and `buildLibraryOutput` helpers so the main
  `defineLibraryConfig` function has fewer decision points. Behaviour is unchanged.

## 0.2.0

### Minor Changes

- a2ad954: add shared `@mission-platform/vite-config` workspace

  Introduces a new shared tooling workspace under `configs/` that exposes
  `defineLibraryConfig`, `defineAppConfig`, and `defineVitestConfig`
  (via the `./vitest` subpath) helpers, bundling the standard Vue + vue-i18n plugins, shared PostCSS pipeline, and
  library build defaults consumed by every Mission Platform workspace. Built with `tsc` against
  `@mission-platform/typescript-config/library`.

### Patch Changes

- 05d31c9: normalize lint and format scripts across all workspaces

  Add consistent `lint:fix`, `lint:style:fix`, and `format:write` scripts to every workspace, and make `format` run
  `prettier --check` instead of `prettier --write` so it can be used as a non-mutating verification step.

- daf4be2: add `fileName` option to `defineLibraryConfig`

  Consumers can now set the Rollup output bundle name (without extension)
  directly via `defineLibraryConfig({ fileName: 'breakpoints' })` instead of re-declaring the full `build.lib.entry` +
  `fileName` pair under
  `overrides`. The option is ignored when `entry` is an entry map.

- 5eaacf4: reformat README tables and code samples for consistent column widths
- Updated dependencies [021a647]
- Updated dependencies [05d31c9]
- Updated dependencies [91deb58]
  - @mission-platform/postcss-config@0.1.1

## 0.1.0

### Minor Changes

- Initial release. Shared Vite and Vitest helpers (`defineLibraryConfig`,
  `defineAppConfig`, `defineVitestConfig`) for all Mission Platform packages and apps.
