# @mission-platform/scheduler-core

## 0.2.1

### Patch Changes

- bd88e5e: rename the component library prefix from `Base` to `Forge`

  BREAKING CHANGE: every exported component symbol and its folder/file and CSS class name is renamed from `Base*`/`base-*` to `Forge*`/`forge-*` (e.g. `BaseButton` → `ForgeButton`), and previously-unprefixed components (`HideAt`, `ShowAt`, `BreakpointDebug`) and every icon (`IconStar` → `ForgeIconStar`) now carry the `Forge` prefix. Consumers must update all imports and template usages accordingly.

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

- b23115e: add a workspace-local .prettierignore so build output is excluded from format checks

## 0.2.0

### Minor Changes

- edb785f: add the framework-agnostic scheduler core (RFC 5545 event model + RRULE/RDATE/EXDATE recurrence expansion,
  view range/navigation math, event selectors + create/move/resize helpers, duration formatting, and time-grid collision
  layout) shared by the Vue `@mission-platform/components` and the write-once `@mission-platform/components`
  BaseScheduler

### Patch Changes

- eefe5d0: bump nanoid and other shared dependencies to their latest patch releases
- d37e102: add targeted eslint-disable comments for new unicorn rule violations
- ca1d98b: reformat sources with updated prettier print width and import ordering
