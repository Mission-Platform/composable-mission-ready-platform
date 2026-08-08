# @mission-platform/storybook-framework

## 0.2.0

### Minor Changes

- a1e2d64: add an env-driven Storybook framework preset

  `@mission-platform/storybook-framework` provides `createStorybookConfig`, which
  reads the `STORYBOOK_FRAMEWORK` env var (or an explicit `framework` option) to select the
  matching Storybook renderer and story globs and wire the shared `viteFinal`
  (i18n, Vue JSX for the Vue renderer, ES-module workers, inlined CSS). This lets
  a single Storybook app render the platform's neutral and per-framework stories
  on any supported framework instead of maintaining one app per framework.

### Patch Changes

- bd88e5e: rename the component library prefix from `Base` to `Forge`

  BREAKING CHANGE: every exported component symbol and its folder/file and CSS class name is renamed from `Base*`/`base-*` to `Forge*`/`forge-*` (e.g. `BaseButton` → `ForgeButton`), and previously-unprefixed components (`HideAt`, `ShowAt`, `BreakpointDebug`) and every icon (`IconStar` → `ForgeIconStar`) now carry the `Forge` prefix. Consumers must update all imports and template usages accordingly.

- 8b55278: load nested Storybook locale bundles

  Point the shared `i18nPlugin` at `localesDir: 'locales'` so Storybook's translations under
  `locales/<code>/mp.storybook.yaml` actually load. Previously the plugin defaulted to `src/locales`, which only holds the
  generated `.d.ts` shims, so `virtual:i18n-resources` resolved to the English defaults only.

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

- Updated dependencies [2bee7f1]
- Updated dependencies [6290b4c]
- Updated dependencies [29848a3]
- Updated dependencies [ffa5129]
- Updated dependencies [0371781]
- Updated dependencies [f67e304]
- Updated dependencies [a93c68a]
- Updated dependencies [b23115e]
  - @mission-platform/vite-plugin-i18n@0.1.1
  - @mission-platform/vite-config@1.1.0
