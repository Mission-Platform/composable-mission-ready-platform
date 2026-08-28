# @mission-platform/forms

## 2.1.0

### Minor Changes

- 97c3f20: add typed custom-property overrides for visual components

### Patch Changes

- c32bb83: centralize package documentation generation in the repository build
- 8a15dbc: add generated package API references and build-time documentation extraction
- 46fe17a: scope Forge build environment variables to package build tasks
- 9e59f09: split shared UI capabilities into focused workspaces and update their design tokens
- 31ed685: Run i18n extraction from each configured workspace through the root Turbo task
- Updated dependencies [140f802]
- Updated dependencies [7e40fba]
- Updated dependencies [c32bb83]
- Updated dependencies [f216404]
- Updated dependencies [89aab02]
- Updated dependencies [93ddb34]
- Updated dependencies [8a15dbc]
- Updated dependencies [0c74365]
- Updated dependencies [46fe17a]
- Updated dependencies [b88a08e]
- Updated dependencies [9e59f09]
- Updated dependencies [e56f10c]
- Updated dependencies [97c3f20]
- Updated dependencies [31ed685]
  - @mission-platform/phone-number@0.3.2
  - @mission-platform/content@1.1.0
  - @mission-platform/components@3.1.0
  - @mission-platform/float@1.1.0
  - @mission-platform/forge@1.1.0
  - @mission-platform/forms-core@0.3.1
  - @mission-platform/icons@2.0.1
  - @mission-platform/layouts@2.1.0
  - @mission-platform/select@1.1.0
  - @mission-platform/tokens@2.0.0
  - @mission-platform/typography@1.1.0

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

- be97ac0: Render typed member calls such as deferred wizard-step content as Vue nodes instead of stringifying VNodes.

  Normalize primitive and array-valued Svelte slots to snippets so Storybook args render safely without callable-value errors or invalid structural-element text holes.

  Preserve native string-tag dynamic hosts when lowering Svelte components, including PascalCase locals with object-valued inline styles.

  Fix Svelte lowering for runtime module declarations, neutral `useId` imports, children-alias presence checks, value-position array/spread markup (itemNodes/childList), non-literal $props defaults, JSX-returning local render helpers (including expression-bodied `.map()`/`.flatMap()`/`Array.from()` helpers such as `ForgeTabs`' `renderPanels`, and **block-bodied** mapped helpers with leading typed `const`s + terminal `return` such as `ForgeMenu`/`ForgeMenubar`'s `renderItems`, lowered to a `{#snippet}` containing an `{#each}` with `{@const}` bindings and invoked via `{@render}` instead of leaving an undeclared `renderItems is not defined` call; each-header keys that reference block-local consts are expanded into the header, and TypeScript `as` assertions are stripped from helper-call arguments in markup), control-flow render helpers whose bodies branch through `if`/`switch`/early-return before returning JSX (such as `ForgeFormBuilder`'s `renderPanel` and `ForgeSchemaForm`'s `renderField`), lowered to parameterized `{#snippet}` declarations, callback props that render a known helper (such as `panel={(scope) => renderPanel(scope.tab.id)}`), lowered to implicit snippet props, and consumer-side render-prop invocations (both the destructured `panel?.(…)` form and the `properties.panel?.(…)` member form) lowered to `{@render panel?.(…)}` snippet renders instead of leaving a `panel?.(…)` call hole; the generated Svelte `MpRenderProperty<S>` local JSX type is now a native `Snippet<[S]>` so those `{@render}` invocations typecheck. Also fix template-position `h(Slot, …)` markers (including named slots and fallback children), source-ordered component initialization (preventing setup-dependent `$state`/`$derived`temporal-dead-zone failures), and scope-safe static snippet hoisting (including ignoring comment/JSDoc words when determining the component's top-level bindings, so an each-local such as`option`in`options.map((option) => …)`is no longer hoisted into a top-level snippet and can no longer throw`ReferenceError: option is not defined` at render time); use a deterministic Storybook image fixture for EmailImage stories.

- Updated dependencies [4714506]
- Updated dependencies [be97ac0]
- Updated dependencies [be97ac0]
- Updated dependencies [be97ac0]
- Updated dependencies [be97ac0]
- Updated dependencies [66130ee]
- Updated dependencies [be97ac0]
- Updated dependencies [4714506]
- Updated dependencies [be97ac0]
  - @mission-platform/components@3.0.0
  - @mission-platform/layouts@2.0.0
  - @mission-platform/content@1.0.0
  - @mission-platform/icons@2.0.0
  - @mission-platform/tokens@1.1.0
  - @mission-platform/forge@1.0.0
  - @mission-platform/forms-core@0.3.0
  - @mission-platform/phone-number@0.3.1

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

- 7c91132: add Solid, Svelte, and Web Components code generators and per-framework build targets

  The JSX plugin now emits Solid, Svelte, and Web Components modules alongside the existing Vue and React outputs, and every write-once component package gains matching `build:solid`, `build:svelte`, and `build:web-components` targets plus optional peer dependencies for the new frameworks.

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

- f67e304: fix component styles not loading in apps and Storybook

  `defineTsdownLibrary` now re-links every extracted stylesheet to the JS module that owns it via a `writeBundle` pass (opt out with `cssBundle: false`). Under the tsdown/Rolldown build, co-located `*.module.scss` / `*.scss` imports were extracted to standalone `.css` assets but their side-effect imports were dropped from the JS (left as `/* empty css */`), so importing a component shipped its markup without its styles. Each `X.css` is now imported from its CSS-Module class map (`X.module.js`) — or, for the Vue build, from the component chunk (`X.vue_vue_type_style_*.css` → `X.js`) — so importing a single component (or the package barrel) automatically loads exactly its styles again, matching the historical Vite library build.

- 81ca915: Fix `ForgeSchemaFormDialog` silently dropping every value update on the Vue build.
  `modelValue` is a `@model` prop, so the host's `onUpdate:modelValue` listener is consumed by Vue's model system and is
  not exposed as
  `properties.onUpdateModelValue`; forwarding that reference to the inner
  `ForgeSchemaForm` emitted `undefined`, so field edits never reached the host. The dialog now re-emits its model through
  a wrapper that calls the callback (which compiles to the model setter). This is why a hosted code-block dialog's
  language picker appeared inert — the picked language never propagated out of the dialog.
- 56e0456: modernize component styles with `@supports`, `@container`, `@starting-style`, and `@namespace`, and replace arbitrary box-model and breakpoint values with design tokens
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
- Updated dependencies [ddf20bd]
- Updated dependencies [3fc6203]
- Updated dependencies [ca646ea]
- Updated dependencies [9a876eb]
- Updated dependencies [c6e83c0]
- Updated dependencies [ddf20bd]
- Updated dependencies [ddf20bd]
- Updated dependencies [f67e304]
- Updated dependencies [a4f0f68]
- Updated dependencies [bd88e5e]
- Updated dependencies [7a1b1a1]
- Updated dependencies [bd88e5e]
- Updated dependencies [bd88e5e]
- Updated dependencies [1db440e]
- Updated dependencies [d952712]
- Updated dependencies [6290b4c]
- Updated dependencies [7c91132]
- Updated dependencies [0c0d5d7]
- Updated dependencies [56e0456]
- Updated dependencies [ac98203]
- Updated dependencies [8bd60ae]
- Updated dependencies [ffa5129]
- Updated dependencies [0371781]
- Updated dependencies [3fb8ddb]
- Updated dependencies [7d95459]
- Updated dependencies [f67e304]
- Updated dependencies [b23115e]
- Updated dependencies [90a72fc]
- Updated dependencies [90a72fc]
  - @mission-platform/forge@1.0.0
  - @mission-platform/components@2.0.0
  - @mission-platform/layouts@1.0.0
  - @mission-platform/icons@1.0.0
  - @mission-platform/tokens@1.0.1
  - @mission-platform/forms-core@0.3.0
  - @mission-platform/scheduler-core@0.2.1
  - @mission-platform/hunspell@0.4.1
  - @mission-platform/harper@0.2.1
  - @mission-platform/phone-number@0.3.1

## 0.2.0

### Minor Changes

- 18bd49a: extract the form builder and schema form into a new `@mission-platform/forms` package

  Adds the write-once `@mission-platform/forms` package containing
  `BaseFormBuilder` (public `FormBuilder`) and `BaseSchemaForm` (public
  `SchemaForm`), authored once in the neutral `@mission-platform/forge` dialect and compiled to both Vue 3 (`./vue`) and
  React (`./react`). The package depends on **both** `@mission-platform/components` (field widgets + `BaseDrawer`) and
  `@mission-platform/layouts` (`BaseVerticalLayout`), which is why it lives in its own package rather than in
  `@mission-platform/components` — keeping the dependency graph acyclic. Co-located `JSX Components/Forms/<Name>`
  stories and cross-framework specs are included.

  **BREAKING (`@mission-platform/components`):** `BaseFormBuilder` / `FormBuilder`
  and `BaseSchemaForm` / `SchemaForm` are no longer exported from
  `@mission-platform/components` — import them from `@mission-platform/forms/vue`
  (or `/react`) instead.

### Patch Changes

- e1a9272: Drop the third-party `google-libphonenumber` dependency and power `BasePhoneInput`
  with the platform's own `@mission-platform/phone-number` (AssemblyScript/WebAssembly)
  package instead. The co-located `phone.ts` helper now parses, formats (national/E.164), validates per region, lists
  supported regions, provides example numbers and formats as-you-type through the synchronous `PhoneNumberUtil`
  instance, so behaviour is unchanged while the external dependency is removed.
- ca1d98b: reformat sources with updated prettier print width and import ordering
- d39b6fc: add per-workspace reference documentation and refresh llms.txt/README metadata
- f681d82: rename storybook stories to the .vue.stories suffix for framework clarity
- 18bd49a: rename the Storybook top-level sections so the catalogue reflects the package split

  The cross-framework catalogue no longer prefixes its sections with `JSX`: the
  `JSX Components/<Category>/<Name>` stories are now `Components/<Category>/<Name>`
  and the `JSX Icons/<Category>/<Name>` stories are now `Icons/<Category>/<Name>`
  (both Vue and React Storybooks). The components extracted into their own packages get their own top-level Storybook
  section instead of nesting under `Components`:
  `@mission-platform/layouts` stories move to `Layouts/<Name>` and
  `@mission-platform/forms` stories move to `Forms/<Name>`.

- Updated dependencies [e1a9272]
- Updated dependencies [e1a9272]
- Updated dependencies [4218ce5]
- Updated dependencies [eefe5d0]
- Updated dependencies [c99c4cc]
- Updated dependencies [338c7db]
- Updated dependencies [fb5e319]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [7534f50]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [23c0463]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [429d400]
- Updated dependencies [1c73a0e]
- Updated dependencies [4218ce5]
- Updated dependencies [bbc9903]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [18bd49a]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [76ebb1f]
- Updated dependencies [13cfc7f]
- Updated dependencies [13cfc7f]
- Updated dependencies [13cfc7f]
- Updated dependencies [13cfc7f]
- Updated dependencies [0a5d7dd]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [94f9acf]
- Updated dependencies [edb785f]
- Updated dependencies [94f9acf]
- Updated dependencies [94f9acf]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [94f9acf]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [94f9acf]
- Updated dependencies [94f9acf]
- Updated dependencies [edb785f]
- Updated dependencies [10b9e2a]
- Updated dependencies [18bd49a]
- Updated dependencies [18bd49a]
- Updated dependencies [18bd49a]
- Updated dependencies [d37e102]
- Updated dependencies [ca1d98b]
- Updated dependencies [d39b6fc]
- Updated dependencies [9cdfef1]
- Updated dependencies [9cdfef1]
- Updated dependencies [6551abb]
- Updated dependencies [4218ce5]
- Updated dependencies [f681d82]
- Updated dependencies [edb785f]
- Updated dependencies [be8ab67]
- Updated dependencies [18bd49a]
- Updated dependencies [8d64a2b]
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
- Updated dependencies [7534f50]
- Updated dependencies [edb785f]
- Updated dependencies [be8ab67]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
  - @mission-platform/components@1.0.0
  - @mission-platform/layouts@0.2.0
  - @mission-platform/tokens@1.0.0
  - @mission-platform/forms-core@0.2.0
  - @mission-platform/scheduler-core@0.2.0
  - @mission-platform/harper@0.2.0
  - @mission-platform/hunspell@0.4.0
  - @mission-platform/icons@0.2.0
  - @mission-platform/forge@0.2.0
  - @mission-platform/phone-number@0.3.0

## 0.2.0

### Minor Changes

- 18bd49a: extract the form builder and schema form into a new `@mission-platform/forms` package

  Adds the write-once `@mission-platform/forms` package containing
  `BaseFormBuilder` (public `FormBuilder`) and `BaseSchemaForm` (public
  `SchemaForm`), authored once in the neutral `@mission-platform/forge` dialect and compiled to both Vue 3 (`./vue`) and
  React (`./react`). The package depends on **both** `@mission-platform/components` (field widgets + `BaseDrawer`) and
  `@mission-platform/layouts` (`BaseVerticalLayout`), which is why it lives in its own package rather than in
  `@mission-platform/components` — keeping the dependency graph acyclic. Co-located `JSX Components/Forms/<Name>`
  stories and cross-framework specs are included.

  **BREAKING (`@mission-platform/components`):** `BaseFormBuilder` / `FormBuilder`
  and `BaseSchemaForm` / `SchemaForm` are no longer exported from
  `@mission-platform/components` — import them from `@mission-platform/forms/vue`
  (or `/react`) instead.

### Patch Changes

- e1a9272: Drop the third-party `google-libphonenumber` dependency and power `BasePhoneInput`
  with the platform's own `@mission-platform/phone-number` (AssemblyScript/WebAssembly)
  package instead. The co-located `phone.ts` helper now parses, formats (national/E.164), validates per region, lists
  supported regions, provides example numbers and formats as-you-type through the synchronous `PhoneNumberUtil`
  instance, so behaviour is unchanged while the external dependency is removed.
- ca1d98b: reformat sources with updated prettier print width and import ordering
- d39b6fc: add per-workspace reference documentation and refresh llms.txt/README metadata
- f681d82: rename storybook stories to the .vue.stories suffix for framework clarity
- 18bd49a: rename the Storybook top-level sections so the catalogue reflects the package split

  The cross-framework catalogue no longer prefixes its sections with `JSX`: the
  `JSX Components/<Category>/<Name>` stories are now `Components/<Category>/<Name>`
  and the `JSX Icons/<Category>/<Name>` stories are now `Icons/<Category>/<Name>`
  (both Vue and React Storybooks). The components extracted into their own packages get their own top-level Storybook
  section instead of nesting under `Components`:
  `@mission-platform/layouts` stories move to `Layouts/<Name>` and
  `@mission-platform/forms` stories move to `Forms/<Name>`.

- Updated dependencies [e1a9272]
- Updated dependencies [e1a9272]
- Updated dependencies [4218ce5]
- Updated dependencies [eefe5d0]
- Updated dependencies [c99c4cc]
- Updated dependencies [338c7db]
- Updated dependencies [fb5e319]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [7534f50]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [23c0463]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [429d400]
- Updated dependencies [1c73a0e]
- Updated dependencies [4218ce5]
- Updated dependencies [bbc9903]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [18bd49a]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [76ebb1f]
- Updated dependencies [13cfc7f]
- Updated dependencies [13cfc7f]
- Updated dependencies [13cfc7f]
- Updated dependencies [13cfc7f]
- Updated dependencies [0a5d7dd]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [94f9acf]
- Updated dependencies [edb785f]
- Updated dependencies [94f9acf]
- Updated dependencies [94f9acf]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [94f9acf]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [94f9acf]
- Updated dependencies [94f9acf]
- Updated dependencies [edb785f]
- Updated dependencies [10b9e2a]
- Updated dependencies [18bd49a]
- Updated dependencies [18bd49a]
- Updated dependencies [18bd49a]
- Updated dependencies [d37e102]
- Updated dependencies [ca1d98b]
- Updated dependencies [d39b6fc]
- Updated dependencies [9cdfef1]
- Updated dependencies [9cdfef1]
- Updated dependencies [6551abb]
- Updated dependencies [4218ce5]
- Updated dependencies [f681d82]
- Updated dependencies [edb785f]
- Updated dependencies [be8ab67]
- Updated dependencies [18bd49a]
- Updated dependencies [8d64a2b]
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
- Updated dependencies [7534f50]
- Updated dependencies [edb785f]
- Updated dependencies [be8ab67]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
  - @mission-platform/components@1.0.0
  - @mission-platform/layouts@0.2.0
  - @mission-platform/tokens@1.0.0
  - @mission-platform/forms-core@0.2.0
  - @mission-platform/scheduler-core@0.2.0
  - @mission-platform/harper@0.2.0
  - @mission-platform/hunspell@0.4.0
  - @mission-platform/icons@0.2.0
  - @mission-platform/forge@0.2.0
  - @mission-platform/phone-number@0.3.0

## 0.2.0

### Minor Changes

- 18bd49a: extract the form builder and schema form into a new `@mission-platform/forms` package

  Adds the write-once `@mission-platform/forms` package containing
  `BaseFormBuilder` (public `FormBuilder`) and `BaseSchemaForm` (public
  `SchemaForm`), authored once in the neutral `@mission-platform/forge` dialect and compiled to both Vue 3 (`./vue`) and
  React (`./react`). The package depends on **both** `@mission-platform/components` (field widgets + `BaseDrawer`) and
  `@mission-platform/layouts` (`BaseVerticalLayout`), which is why it lives in its own package rather than in
  `@mission-platform/components` — keeping the dependency graph acyclic. Co-located `JSX Components/Forms/<Name>`
  stories and cross-framework specs are included.

  **BREAKING (`@mission-platform/components`):** `BaseFormBuilder` / `FormBuilder`
  and `BaseSchemaForm` / `SchemaForm` are no longer exported from
  `@mission-platform/components` — import them from `@mission-platform/forms/vue`
  (or `/react`) instead.

### Patch Changes

- e1a9272: Drop the third-party `google-libphonenumber` dependency and power `BasePhoneInput`
  with the platform's own `@mission-platform/phone-number` (AssemblyScript/WebAssembly)
  package instead. The co-located `phone.ts` helper now parses, formats (national/E.164), validates per region, lists
  supported regions, provides example numbers and formats as-you-type through the synchronous `PhoneNumberUtil`
  instance, so behaviour is unchanged while the external dependency is removed.
- ca1d98b: reformat sources with updated prettier print width and import ordering
- d39b6fc: add per-workspace reference documentation and refresh llms.txt/README metadata
- f681d82: rename storybook stories to the .vue.stories suffix for framework clarity
- 18bd49a: rename the Storybook top-level sections so the catalogue reflects the package split

  The cross-framework catalogue no longer prefixes its sections with `JSX`: the
  `JSX Components/<Category>/<Name>` stories are now `Components/<Category>/<Name>`
  and the `JSX Icons/<Category>/<Name>` stories are now `Icons/<Category>/<Name>`
  (both Vue and React Storybooks). The components extracted into their own packages get their own top-level Storybook
  section instead of nesting under `Components`:
  `@mission-platform/layouts` stories move to `Layouts/<Name>` and
  `@mission-platform/forms` stories move to `Forms/<Name>`.

- Updated dependencies [e1a9272]
- Updated dependencies [e1a9272]
- Updated dependencies [4218ce5]
- Updated dependencies [eefe5d0]
- Updated dependencies [c99c4cc]
- Updated dependencies [338c7db]
- Updated dependencies [fb5e319]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [7534f50]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [23c0463]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [429d400]
- Updated dependencies [1c73a0e]
- Updated dependencies [4218ce5]
- Updated dependencies [bbc9903]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [18bd49a]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [76ebb1f]
- Updated dependencies [13cfc7f]
- Updated dependencies [13cfc7f]
- Updated dependencies [13cfc7f]
- Updated dependencies [13cfc7f]
- Updated dependencies [0a5d7dd]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [94f9acf]
- Updated dependencies [edb785f]
- Updated dependencies [94f9acf]
- Updated dependencies [94f9acf]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [94f9acf]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [94f9acf]
- Updated dependencies [94f9acf]
- Updated dependencies [edb785f]
- Updated dependencies [10b9e2a]
- Updated dependencies [18bd49a]
- Updated dependencies [18bd49a]
- Updated dependencies [18bd49a]
- Updated dependencies [d37e102]
- Updated dependencies [ca1d98b]
- Updated dependencies [d39b6fc]
- Updated dependencies [9cdfef1]
- Updated dependencies [9cdfef1]
- Updated dependencies [6551abb]
- Updated dependencies [4218ce5]
- Updated dependencies [f681d82]
- Updated dependencies [edb785f]
- Updated dependencies [be8ab67]
- Updated dependencies [18bd49a]
- Updated dependencies [8d64a2b]
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
- Updated dependencies [7534f50]
- Updated dependencies [edb785f]
- Updated dependencies [be8ab67]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
  - @mission-platform/components@1.0.0
  - @mission-platform/layouts@0.2.0
  - @mission-platform/tokens@1.0.0
  - @mission-platform/forms-core@0.2.0
  - @mission-platform/scheduler-core@0.2.0
  - @mission-platform/harper@0.2.0
  - @mission-platform/hunspell@0.4.0
  - @mission-platform/icons@0.2.0
  - @mission-platform/forge@0.2.0
  - @mission-platform/phone-number@0.3.0

## 0.2.0

### Minor Changes

- 18bd49a: extract the form builder and schema form into a new `@mission-platform/forms` package

  Adds the write-once `@mission-platform/forms` package containing
  `BaseFormBuilder` (public `FormBuilder`) and `BaseSchemaForm` (public
  `SchemaForm`), authored once in the neutral `@mission-platform/forge` dialect and compiled to both Vue 3 (`./vue`) and
  React (`./react`). The package depends on **both** `@mission-platform/components` (field widgets + `BaseDrawer`) and
  `@mission-platform/layouts` (`BaseVerticalLayout`), which is why it lives in its own package rather than in
  `@mission-platform/components` — keeping the dependency graph acyclic. Co-located `JSX Components/Forms/<Name>`
  stories and cross-framework specs are included.

  **BREAKING (`@mission-platform/components`):** `BaseFormBuilder` / `FormBuilder`
  and `BaseSchemaForm` / `SchemaForm` are no longer exported from
  `@mission-platform/components` — import them from `@mission-platform/forms/vue`
  (or `/react`) instead.

### Patch Changes

- e1a9272: Drop the third-party `google-libphonenumber` dependency and power `BasePhoneInput`
  with the platform's own `@mission-platform/phone-number` (AssemblyScript/WebAssembly)
  package instead. The co-located `phone.ts` helper now parses, formats (national/E.164), validates per region, lists
  supported regions, provides example numbers and formats as-you-type through the synchronous `PhoneNumberUtil`
  instance, so behaviour is unchanged while the external dependency is removed.
- ca1d98b: reformat sources with updated prettier print width and import ordering
- d39b6fc: add per-workspace reference documentation and refresh llms.txt/README metadata
- f681d82: rename storybook stories to the .vue.stories suffix for framework clarity
- 18bd49a: rename the Storybook top-level sections so the catalogue reflects the package split

  The cross-framework catalogue no longer prefixes its sections with `JSX`: the
  `JSX Components/<Category>/<Name>` stories are now `Components/<Category>/<Name>`
  and the `JSX Icons/<Category>/<Name>` stories are now `Icons/<Category>/<Name>`
  (both Vue and React Storybooks). The components extracted into their own packages get their own top-level Storybook
  section instead of nesting under `Components`:
  `@mission-platform/layouts` stories move to `Layouts/<Name>` and
  `@mission-platform/forms` stories move to `Forms/<Name>`.

- Updated dependencies [e1a9272]
- Updated dependencies [e1a9272]
- Updated dependencies [4218ce5]
- Updated dependencies [eefe5d0]
- Updated dependencies [c99c4cc]
- Updated dependencies [338c7db]
- Updated dependencies [fb5e319]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [7534f50]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [23c0463]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [429d400]
- Updated dependencies [1c73a0e]
- Updated dependencies [4218ce5]
- Updated dependencies [bbc9903]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [18bd49a]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [76ebb1f]
- Updated dependencies [13cfc7f]
- Updated dependencies [13cfc7f]
- Updated dependencies [13cfc7f]
- Updated dependencies [13cfc7f]
- Updated dependencies [0a5d7dd]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [94f9acf]
- Updated dependencies [edb785f]
- Updated dependencies [94f9acf]
- Updated dependencies [94f9acf]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [94f9acf]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [94f9acf]
- Updated dependencies [94f9acf]
- Updated dependencies [edb785f]
- Updated dependencies [10b9e2a]
- Updated dependencies [18bd49a]
- Updated dependencies [18bd49a]
- Updated dependencies [18bd49a]
- Updated dependencies [d37e102]
- Updated dependencies [ca1d98b]
- Updated dependencies [d39b6fc]
- Updated dependencies [9cdfef1]
- Updated dependencies [9cdfef1]
- Updated dependencies [6551abb]
- Updated dependencies [4218ce5]
- Updated dependencies [f681d82]
- Updated dependencies [edb785f]
- Updated dependencies [be8ab67]
- Updated dependencies [18bd49a]
- Updated dependencies [8d64a2b]
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
- Updated dependencies [7534f50]
- Updated dependencies [edb785f]
- Updated dependencies [be8ab67]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
  - @mission-platform/components@1.0.0
  - @mission-platform/layouts@0.2.0
  - @mission-platform/tokens@1.0.0
  - @mission-platform/forms-core@0.2.0
  - @mission-platform/scheduler-core@0.2.0
  - @mission-platform/harper@0.2.0
  - @mission-platform/hunspell@0.4.0
  - @mission-platform/icons@0.2.0
  - @mission-platform/forge@0.2.0
  - @mission-platform/phone-number@0.3.0
