# @mission-platform/forms-core

## 0.3.1

### Patch Changes

- c32bb83: centralize package documentation generation in the repository build
- 8a15dbc: add generated package API references and build-time documentation extraction

## 0.3.0

### Minor Changes

- 90a72fc: Insert WYSIWYG code blocks through a Monaco dialog built from a schema form.

  - `@mission-platform/forms-core`: add an optional `ui.language` hint (surfaced on the resolved
    `FormFieldSchema.language`) so a `code` field can carry a syntax language.
  - `@mission-platform/forms`: `ForgeSchemaForm` now renders the `code` widget as a `ForgeMonacoEditor` code field, and a
    new **`ForgeSchemaFormDialog`** component hosts any schema form inside a `ForgeModal` with Cancel / Submit actions
    wired to the form's own validation.
  - `@mission-platform/wysiwyg`: the toolbar's code-block control now opens the new `ForgeSchemaFormDialog` (a language
    selector + Monaco code editor) instead of a `window.prompt`, preserving the caret position so the inserted block lands
    where you were editing.
  - `@mission-platform/vite-plugin-forge`: add `@mission-platform/forms` to the framework-split module allowlist so
    write-once packages can consume its compiled Vue/React builds.

### Patch Changes

- bd88e5e: rename the component library prefix from `Base` to `Forge`

  BREAKING CHANGE: every exported component symbol and its folder/file and CSS class name is renamed from `Base*`/`base-*` to `Forge*`/`forge-*` (e.g. `BaseButton` → `ForgeButton`), and previously-unprefixed components (`HideAt`, `ShowAt`, `BreakpointDebug`) and every icon (`IconStar` → `ForgeIconStar`) now carry the `Forge` prefix. Consumers must update all imports and template usages accordingly.

- d952712: defer Ajv compilation until first validate so validators work on the Cloudflare Workers runtime
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

## 0.2.0

### Minor Changes

- edb785f: support every form input in the form builder palette and inspector

  The builder palette (`DEFAULT_FIELD_TYPES`) now offers every `FormFieldType` the schema-driven form can render — text,
  text area, markdown, email, password, url, tel, number, number stepper, select, multi-select, radio, checkbox, switch,
  date, time, date-time, the date/time/date-time ranges, file upload and location — alongside the grouping field set and
  the multi-step wizard. The inspector gains input-specific editors (multi-line rows, text length/pattern, number
  step/integer/unsigned, date min/max bounds, show-seconds, file accept/multiple, and the location coordinate format),
  and `@mission-platform/forms-core` exposes new widget-classifier helpers (`isTextWidget`, `isMultilineWidget`,
  `isDateWidget`, `isTimeWidget`, `isFileWidget`, `isLocationWidget`).

- edb785f: add the framework-agnostic forms core (JSON Schema → field derivation + Ajv validation,
  conditional-visibility evaluation, and the form-builder field ⇄ schema model) shared by the Vue
  `@mission-platform/components` and the write-once `@mission-platform/components` SchemaForm/FormBuilder

### Patch Changes

- eefe5d0: bump nanoid and other shared dependencies to their latest patch releases
- d39b6fc: add per-workspace reference documentation and refresh llms.txt/README metadata
