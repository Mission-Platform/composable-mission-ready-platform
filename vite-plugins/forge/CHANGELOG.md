# @mission-platform/vite-plugin-forge

## 1.2.0

### Minor Changes

- 89aab02: add typed style generation support for Forge components

### Patch Changes

- Updated dependencies [c32bb83]
- Updated dependencies [f216404]
- Updated dependencies [89aab02]
- Updated dependencies [8a15dbc]
  - @mission-platform/forge@1.1.0
  - @mission-platform/forge-plugin-api@0.3.0
  - @mission-platform/forge-router-plugin-api@0.1.1

## 1.1.0

### Minor Changes

- be97ac0: add framework-specific Storyblok output builds for Forge packages

  The CMS driver and Storyblok target now support shared assets plus React, Vue,
  Svelte, Solid, and Web Components output. Forge packages expose the associated
  build targets and components adds the generated Storyblok entry points.

  BREAKING CHANGE: the generated `@mission-platform/icons` components barrel no
  longer re-exports the catalog and sprite APIs; import those APIs from their
  dedicated modules instead.

- 4714506: expose `analyzeForgeModule` as the neutral semantic IR accessor

  The previously private `createSemanticModule` is now exported as
  `analyzeForgeModule(input)`, so consumers that need the target-neutral IR — such
  as the CMS projection driver — can obtain it without electing a
  `FrameworkOutputPlugin`. Results are shared through the existing semantic cache,
  so a component analysed for several targets in one build is only inferred once.

### Patch Changes

- be97ac0: Render typed member calls such as deferred wizard-step content as Vue nodes instead of stringifying VNodes.

  Normalize primitive and array-valued Svelte slots to snippets so Storybook args render safely without callable-value errors or invalid structural-element text holes.

  Preserve native string-tag dynamic hosts when lowering Svelte components, including PascalCase locals with object-valued inline styles.

  Fix Svelte lowering for runtime module declarations, neutral `useId` imports, children-alias presence checks, value-position array/spread markup (itemNodes/childList), non-literal $props defaults, JSX-returning local render helpers (including expression-bodied `.map()`/`.flatMap()`/`Array.from()` helpers such as `ForgeTabs`' `renderPanels`, and **block-bodied** mapped helpers with leading typed `const`s + terminal `return` such as `ForgeMenu`/`ForgeMenubar`'s `renderItems`, lowered to a `{#snippet}` containing an `{#each}` with `{@const}` bindings and invoked via `{@render}` instead of leaving an undeclared `renderItems is not defined` call; each-header keys that reference block-local consts are expanded into the header, and TypeScript `as` assertions are stripped from helper-call arguments in markup), control-flow render helpers whose bodies branch through `if`/`switch`/early-return before returning JSX (such as `ForgeFormBuilder`'s `renderPanel` and `ForgeSchemaForm`'s `renderField`), lowered to parameterized `{#snippet}` declarations, callback props that render a known helper (such as `panel={(scope) => renderPanel(scope.tab.id)}`), lowered to implicit snippet props, and consumer-side render-prop invocations (both the destructured `panel?.(…)` form and the `properties.panel?.(…)` member form) lowered to `{@render panel?.(…)}` snippet renders instead of leaving a `panel?.(…)` call hole; the generated Svelte `MpRenderProperty<S>` local JSX type is now a native `Snippet<[S]>` so those `{@render}` invocations typecheck. Also fix template-position `h(Slot, …)` markers (including named slots and fallback children), source-ordered component initialization (preventing setup-dependent `$state`/`$derived`temporal-dead-zone failures), and scope-safe static snippet hoisting (including ignoring comment/JSDoc words when determining the component's top-level bindings, so an each-local such as`option`in`options.map((option) => …)`is no longer hoisted into a top-level snippet and can no longer throw`ReferenceError: option is not defined` at render time); use a deterministic Storybook image fixture for EmailImage stories.

- Updated dependencies [be97ac0]
- Updated dependencies [be97ac0]
  - @mission-platform/forge-plugin-api@0.2.0
  - @mission-platform/forge@1.0.0

## 1.0.0

### Major Changes

- e2525a3: rename the neutral class attribute from `classNames` to `className`

  The framework-neutral JSX **class attribute** is now spelled `className={…}` everywhere (matching React's own spelling and the plain `class` static attribute it complements). The runtime **helper** `classNames(...)` is unchanged — it is still exported from `@mission-platform/forge` and still re-injected into the compiled React output.

  - **Authoring:** drive dynamic classes with `className={[…]}` (array / string / `{ class: boolean }` forms); the author still never imports the helper.
  - **`@mission-platform/forge`:** the `./react` and `./vue` runtime adapters now recognise the `className` prop (React collapses it to a `className={classNames(…)}` string, Vue maps it onto the native `class` binding).
  - **`@mission-platform/vite-plugin-forge`:** the two-stage compiler recognises only `className` as the neutral class attribute; the legacy `classNames` attribute alias has been removed from every generator (React/Vue/Solid/Svelte).
  - **Breaking:** neutral components authored with the old `classNames={…}` attribute must be updated to `className={…}`.

- 16253a6: keep the `Forge` prefix through compilation instead of stripping it

  BREAKING CHANGE: the compiler no longer strips the component prefix, so the public API of compiled packages now exposes `Forge`-prefixed names (e.g. `ForgeButton`) rather than the previously stripped names (e.g. `Button`). The `stripPrefix` default now defaults to keeping the prefix.

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

- 3fb8ddb: rename the write-once runtime and compiler packages from `jsx` to `forge`

  The neutral runtime `@mission-platform/jsx` is now `@mission-platform/forge`
  and its two-stage compiler `@mission-platform/vite-plugin-jsx` is now
  `@mission-platform/vite-plugin-forge`, reflecting that these packages now cover
  components, composables, and more — not just JSX.

  BREAKING CHANGE: update every import specifier from `@mission-platform/jsx` to
  `@mission-platform/forge` (including subpaths such as `@mission-platform/jsx/react`
  → `@mission-platform/forge/react` and `@mission-platform/jsx/jsx-globals` →
  `@mission-platform/forge/jsx-globals`), swap the dev dependency and Vite plugin
  import from `@mission-platform/vite-plugin-jsx` to
  `@mission-platform/vite-plugin-forge`, and update the plugin identifier
  references accordingly.

### Minor Changes

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

- 1db440e: Several compiler improvements:

  - **Native Web Components (no Lit).** The Web-Components generator now emits `class X extends ForgeElement` importing only `@mission-platform/forge/web-components` — never `lit`. `lit` is removed from the plugin's peer dependencies and framework externals.
  - **Full Storyblok coverage.** `emitStoryblokBlokWrapper` now emits Solid (`.tsx`), Svelte (`.svelte`) and native Web-Component (`.ts`) blok wrappers in addition to React/Vue, and `generateStoryblokBloks`/`defineJsxStoryblokLibraryConfig` accept all five frameworks (externalising the matching `@storyblok/*` binding).
  - **Structure-preserving cache.** `generateFrameworkSources` now mirrors the source `components/<folder>/…` tree in the generated cache instead of flattening it, rewriting flat `./<base>` imports to the correct nested relative paths.
  - **Co-located sibling components.** The generator auto-discovers focused child components authored beside a primary (via PascalCase relative imports) and compiles them as first-class components, so a folder can ship e.g. `forge-tree-view.tsx` + `forge-tree-view-item.tsx` without adding the child to the public barrel.

- 1db440e: flatten far more neutral components to native Vue `<template>` markup instead of the `<render v-bind="$attrs" />` render-closure fallback

  The Vue template builder gained several AST-driven flattening passes, taking the component library from 17 render-closure fallbacks down to 9:

  - **Object-literal keys are no longer misread as node-typed slot props.** `producesNodes` ignores identifiers in object-literal key / shorthand position, and a `.map()`/`.flatMap()` is only treated as node-producing when its callback body actually builds nodes — so a `{ start, end }` handler object or a data `.map()` inside a `void` handler no longer forces the fallback (`forge-date-range-input`, `forge-scheduler`).
  - **Array-literal children template natively.** `emitExpressionChild` now delegates a `{[a, ...b]}` child (node consts, spreads, `.map()` projections) to the node-array child emitter (`forge-list`, `forge-calendar`).
  - **Imperative array/object builds fold declaratively.** A `const arr = <init>; if (…) arr.push(…); for (…) arr.push(…)` build folds into a single array literal (`...(c ? [x] : [])`, `...xs.map(…)`), preserving its declared element type via an `as <T>[]` assertion so discriminated-union control lists still type-check (`forge-pagination`, `forge-multiselect`, `forge-select`).
  - **Block-body and `if`-guard-chain render helpers inline.** A helper whose body is leading `const`s + a single `return`, or an `if (c) return X; … return Y;` dispatch, folds to one expression and inlines at its call site.
  - **The memo `.value` rewriter is scope-aware**, so a handler-local binding that shadows a render-scope `computed` compiles without corruption (`forge-time-input`).

  Several correctness guards were added so a genuinely non-flattenable shape falls back cleanly instead of emitting invalid or type-unsafe markup: a prop bound to a value that embeds VNodes, a helper that would inline a literal-vs-literal comparison, a looped multi-element `flatMap` (key hoisted onto the `<template v-for>`), and an inline handler reading a React-style `.current` on a `useRef`. A new repo-wide `vue-no-fallback` audit spec compiles every component to Vue and pins the remaining fallbacks to an allowlist, so no component can silently regress.

- 1db440e: flatten the remaining Category-C/D neutral components to native Vue `<template>` markup, cutting the render-closure (`<render v-bind="$attrs" />`) fallback count from 9 to 2

  The Vue template builder gained four more AST-driven flattening passes so `forge-select`, `forge-radio-group`, `forge-range-input`, `forge-slider`, `forge-toast`, `forge-alert-banner`, `forge-tabs`, and `forge-virtual-tabs` now compile to native `<template>` (only `forge-time-range-input` / `forge-date-time-range-input` — a separate "function-valued node helper" shape — still fall back):

  - **Render-scope ref-sync lifts to `watchEffect`.** A top-level `<ref>.current = <expr>;` side effect (kept in step with a derived value in React's re-render model) is emitted as a reactive `watchEffect(() => { <ref>.value = <expr>; })` rather than rejected as a "non-const derived statement" (`forge-slider`, `forge-range-input`).
  - **Inline-handler `useRef` reads are rewritten.** A `.current` read inside an inline template handler (`onClick={() => searchReference.current?.focus()}`) now drops to the bare, auto-unwrapped template-ref identifier, so a `useRef` used only inside markup no longer forces the fallback (`forge-select`).
  - **A props-children spread in a folded node array maps to the default slot.** `...(properties.children as MpChild[])` appended to a built node array emits as `<slot />` (`forge-radio-group`).
  - **An element-returning `switch` module helper inlines as a `v-if` chain.** A single-argument `variantIcon(variant)`-style helper is inlined as the equivalent `v-if`/`v-else-if`/`v-else` conditional chain (`forge-toast`, `forge-alert-banner`).
  - **A render-prop call in child position renders via `<component :is>`.** `{properties.panel?.({ tab })}` binds the returned VNode directly to `<component :is>` (per Vue's "Using Vnodes in `<template>`" guide), keeping `panel` a real prop — never a Vue named slot — so a compiled neutral parent can still pass it plainly (`forge-tabs`, `forge-virtual-tabs`).

  The `vue-no-fallback` audit allowlist shrinks to the two remaining range composites, and per-category compiler assertions cover each new shape.

- 1db440e: compile recursive render-prop components to native Vue `<template>` and forward scoped slots to child components

  The Vue template builder's node-typed-prop-as-child guard is now receiver-aware: a plain field read whose name coincides with a render-prop (e.g. `{node.label}`) renders as a normal `{{ … }}` interpolation instead of forcing the `<render v-bind="$attrs" />` render-closure fallback, so recursive components like `forge-tree-view-item` compile to native `<template>`. A node-typed render-prop passed to a child component (`label={properties.label}`) is now emitted as a real `<template #label="scope"><slot name="label" v-bind="scope" /></template>` forwarding block rather than a `:label` prop binding, so a custom scoped slot renders correctly at every recursion depth.

- 7c91132: add Solid, Svelte, and Web Components code generators and per-framework build targets

  The JSX plugin now emits Solid, Svelte, and Web Components modules alongside the existing Vue and React outputs, and every write-once component package gains matching `build:solid`, `build:svelte`, and `build:web-components` targets plus optional peer dependencies for the new frameworks.

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

- fec1238: retry the generated-tree cleanup on transient `ENOTEMPTY` errors

  `generateFrameworkSources` and `generateStoryblokBloks` wipe the generated source tree with a recursive `rmSync` before
  each Stage-1 emit. On macOS/APFS, or when a sibling framework build is still touching the same package's
  `node_modules/.cache`, the final `rmdir` can intermittently fail with `ENOTEMPTY` (also `EBUSY`/`EPERM`) and crash the
  build (e.g. `ENOTEMPTY … icons-solid`). Both deletes now pass Node's `maxRetries`/`retryDelay` options so the operation
  retries with linear backoff on exactly those transient errors instead of failing hard.

- fec1238: fix dangling declaration references in the Solid and Web Components builds

  The Web Components emitter now resolves the neutral `MpChild`/`MpElement` types against the co-located per-framework
  types module and carries a sibling component's type-only exports (e.g. `TabItem`, `TabsVariant`, `MenuNode`) across its
  side-effect import, so they no longer dangle in the generated declarations. The Solid emitter imports Solid's
  hyperscript `h` as a default binding (`import h from 'solid-js/h'`) to match its `export default`. The declaration-emit
  diagnostic filter also ignores references inside a typed class-field initializer (e.g. `openIds: any = defaultOpen`),
  which are elided from the emitted `.d.ts`.

- 4cd7197: Compile the neutral `useRef` to Vue's `shallowRef` instead of a deep `ref`.

  `useRef` is a non-reactive, mutable container (React's `useRef` semantics), so a deep, fully-reactive `ref` was the
  wrong mapping: assigning a large external instance into `.current` (e.g. a Monaco editor) made Vue deep-proxy the whole
  object, so every internal property access went through a reactivity trap and, when read inside an effect, subscribed
  that effect to the instance's internals. In the WYSIWYG code editor / schema-form `code` field this produced an
  unbounded pre-flush watcher storm that silently froze the tab on the first keystroke (no Vue
  "recursive updates" warning, since pre-flush jobs are not recursion-capped).

  `useRef` now maps to `shallowRef`, which keeps `.value`-reassignment reactivity (harmless) while leaving the stored
  object un-proxied. The component and hook (composable) emitters both add the `shallowRef` import, and a `useRef` bound
  to an element still becomes `useTemplateRef`.

- 8bd60ae: reformat sources with prettier

  Apply the repository prettier style across sources, config manifests (`tsconfig.test.json`, `turbo.json`,
  `vite.config.ts`), stories, and documentation. Formatting-only; no runtime or API changes.

- ffa5129: relicense the project from MIT to BSD-4-Clause
- Updated dependencies [e2525a3]
- Updated dependencies [7a1b1a1]
- Updated dependencies [bd88e5e]
- Updated dependencies [0c0d5d7]
- Updated dependencies [ffa5129]
- Updated dependencies [3fb8ddb]
- Updated dependencies [7d95459]
- Updated dependencies [f67e304]
  - @mission-platform/forge@1.0.0

## 0.1.0

### Minor Changes

- edb785f: add a framework-neutral `classNames` helper and move component CSS Modules to the `mp.components` layer

  `@mission-platform/forge` now exports a `classNames(...values)` helper (and its
  `ClassValue` type) for assembling class names the same way on every framework
  from the string (`'a b'`), object (`{ 'class': boolean }`), and array
  (`['class']`) forms — falsy entries are dropped and duplicates de-duplicated.

  `@mission-platform/vite-plugin-forge`'s two-stage compiler now (1) preserves
  neutral framework-agnostic value imports such as `classNames` verbatim (instead
  of translating them like `h`/the hooks), and (2) carries each component's
  own relative stylesheet imports (CSS Modules and bare CSS) onto both the React
  and Vue generated source trees, so a neutral component can own and ship its own
  CSS.

  `@mission-platform/components`' co-located `.module.scss` files are now real
  CSS Modules whose rules live in the shared `@layer mp.components` cascade layer
  with no `:global`. The styled components (`BaseBadge`, `BaseButton`,
  `BaseSeparator`) own their styling via the hashed class map + `classNames`, and
  the package now ships that CSS through new `./vue.css` and `./react.css`
  exports.

- edb785f: add the platform-owned `className={…}` JSX attribute for class management

  Neutral components now drive dynamic classes with a `className={…}` attribute
  (reserving the plain `class="…"` for static strings) instead of calling the
  `classNames` helper inline — the author never imports the helper. The canonical
  value is an array holding the same arguments the helper accepts.

  `@mission-platform/vite-plugin-forge`'s two-stage compiler owns the transform: on
  React an array value collapses to a `className={classNames(…)}` string call
  (re-injecting the neutral `classNames` import), while any other value passes
  through as `className`; on Vue it maps onto the native `class` binding, which
  understands the array/object forms (no helper needed). `@mission-platform/forge`'s
  `./react` and `./vue` runtime adapters apply the same mapping at render time so
  the ad-hoc/SSR output matches the compiled output. The `classNames(...values)`
  helper is still exported for the rare precompute and `h(tag, { class: … })`
  object form.

  `@mission-platform/components` and `@mission-platform/icons` migrate
  their components' `class={…}` attributes to `className={…}` accordingly.

- edb785f: ship the `Base*` export aliases, public-type re-exports, a `./styles` entry, and a `BaseVirtualTable` `cell` slot so apps can adopt the JSX components in place of the Vue component library

  `@mission-platform/vite-plugin-forge`'s entry generator now re-exports each
  compiled component under **both** its public name (`Button`) **and** its neutral
  `Base`-prefixed name (`BaseButton`) as aliases of the same component, and
  re-exports **every public type** each component ships alongside it (variants,
  option shapes, props interfaces, scoped-slot scopes, …) from the neutral
  declarations — both in the runtime entry and its synthesised `.d.ts`.

  `@mission-platform/components` therefore exposes every component under the
  `Base*` name on its `./react` / `./vue` subpaths (alongside the bare names), and
  adds:

  - a `./styles` side-effect entry (`@mission-platform/components/styles`) — a
    global `prefers-reduced-motion` reset mirroring the Vue component library's
    global accessibility safety net.
  - a scoped `cell` slot on `BaseVirtualTable` (`{ column, row, value }`, exported
    as `VirtualTableCellScope`) for fully custom (interactive) cell content,
    falling back to each column's `render` formatter.

- edb785f: add scoped-slot (render-prop) support and migrate the self-contained Data components to write-once JSX

  `@mission-platform/forge` gains a `MpRenderProperty<Scope>` type and the neutral
  `<Slot>` element now accepts **scope props** (`<Slot name="row" item={item}
index={i} />`) so a write-once component can drive a **scoped slot**.

  `@mission-platform/vite-plugin-forge`'s two-stage compiler translates a scoped
  `<Slot>` to a Vue scoped slot (`slots.x?.(scope)`) and a React render-prop call
  (`properties.x?.(scope)`), reusing the existing named-slot path. Both emitters
  have a regression test.

  `@mission-platform/components` gains three cross-framework `Components/Data`
  components, authored once in the neutral dialect and compiled straight to both
  React and Vue:

  - `BaseVirtualList` — windowed list with a scoped `row` slot.
  - `BaseVirtualLogViewer` — virtual-scrolling log with per-level colouring, a
    substring filter + matching-count toolbar, follow-tail, and an `onSelect`
    callback (composes `BaseTypography`).
  - `BaseVirtualTreeView` — flattened virtual tree with a built-in expand/collapse
    label (overridable via the scoped `row` slot) and `onSelect`/`onToggle`
    callbacks.

  Each ships its per-component folder (`.tsx`/`.module.scss`/`.stories.tsx`/
  `.spec.ts`/`index.ts`), categorised `JSX Components/Data/<Name>` stories, and
  cross-framework SSR specs. Vue-only features the neutral dialect cannot model
  (icons, scoped **default** slots, generics) are substituted with documented
  equivalents (a `●`/`▸`/`▾` glyph, named `row` scoped slots, `unknown` items).

- edb785f: migrate the Components/Display components to write-once JSX and fix two compiler prop/name collisions

  `@mission-platform/components` gains nine cross-framework `Components/Display`
  components, authored once in the neutral JSX dialect and compiled straight to
  both React and Vue:

  - **Self-contained:** `BaseAvatar` (inline-styled image/initials/slot + presence
    dot), `BaseButtonGroup` (segmented `attached` group), `BaseIconButton`
    (icon-only button with required `label`).
  - **Composing `BaseTypography`:** `BaseTag` (toned, removable), `BaseQuote`
    (blockquote + attribution), `BaseList` (ul/ol/dl from `items`), `BaseCard`
    (header/body/footer surface), `BaseTable` (sortable, hooks-driven), and
    `BaseCollapse` (native `<details>` disclosure).

  Each ships its per-component folder (`.tsx`/`.module.scss`/`.stories.tsx`/
  `.spec.ts`/`index.ts`), categorised `JSX Components/Display/<Name>` stories, and
  cross-framework SSR specs. Vue-only features the neutral dialect cannot model
  (icons, scoped slots, provide/inject, transitions) are substituted with
  documented equivalents; `BaseAccordion`, `BaseCarousel`, and `BaseThemeToggle`
  remain Vue-only in `@mission-platform/components`.

  `@mission-platform/vite-plugin-forge`'s Vue emitter no longer rewrites JSX
  **attribute names** or **element tag names** when they collide with a
  destructured prop. Previously a `src` prop turned `src={src}` into the invalid
  `properties.src={properties.src}`, and a `caption` prop turned a `<caption>`
  element into the invalid dynamic `createVNode(properties.caption, …)`; both now
  keep the literal name and rewrite only the value. Regression tests cover both.

- edb785f: add a `hasSlot` slot-presence helper and move the component content props to named slots

  `@mission-platform/forge` now exports `hasSlot('x')` — the neutral counterpart of
  Vue's `$slots.x` / a React `properties.x != null` check (an omitted name targets
  the default slot) — so a write-once component can render an optional wrapper
  region only when a slot is filled. The runtime adapters also gain
  `resolveSlotMarkers`, which resolves a forwarded `<Slot>` marker lexically
  against the forwarding component before handing children to a child component,
  so a component can forward its own slots into a child's slots.

  `@mission-platform/vite-plugin-forge` compiles `hasSlot('x')` to each framework's
  native presence check — Vue's `v-if="$slots.x"` (template path) / `!!slots.x`
  (render-closure path, pulling in `useSlots()`) and React's `properties.x != null`
  — and consumes the `hasSlot` import (never emitting it).

  `@mission-platform/components` migrates every component that exposed `MpChild`
  content props (`BaseCard`, `BaseDialog`, `BaseModal`, `BaseDrawer`, `BaseHero`,
  `BaseAlertBanner`, `BaseToast`, `BaseChatBubble`, `BaseInput`, `BaseTextarea`,
  the date/time pickers, `BaseFormWizard`, `BaseWindowPopout`, `BaseVerticalLayout`,
  …) to author those regions as named slots (`<Slot>`), gating optional regions
  with `hasSlot`. React consumers are unaffected (named slots are props), but Vue
  consumers must now pass this content through named slots (`<template #header>`)
  rather than props.

- 13cfc7f: remap the write-once icon import to each framework build

  A neutral component that imports an icon from `@mission-platform/icons` now
  has that bare specifier rewritten to the per-framework subpath when compiled:
  `@mission-platform/icons/vue` in the Vue output and
  `@mission-platform/icons/react` in the React output. The Vue path handles it
  in `readExternalImports` (which now takes the target framework) and the React
  emitter rewrites it in its own import pass, mirroring the existing
  `Teleport`/`Transition` neutral-to-framework remap. The `<IconX />` usages are
  left intact as native component tags.

- edb785f: ship per-component CSS + strongly tree-shakeable output, and add a framework-neutral named-`Slot` primitive

  `@mission-platform/components` now compiles to **per-component** JS **and**
  CSS chunks instead of one bundled `vue.js` / `react.js` + one combined
  `vue.css` / `react.css`. Each framework is emitted into its own
  `dist/<framework>/` subtree (`preserveModules` + `cssCodeSplit`), every
  component is its own ESM chunk that imports its own stylesheet, and the entries
  are thin re-export barrels — so a consumer importing a single component pulls in
  only that component's JS + CSS and tree-shakes the rest of the library (styles
  included). **Breaking:** the `./vue.css` and `./react.css` subpath exports are
  removed (component CSS now loads automatically with the component), and the
  `./vue` / `./react` exports resolve to `dist/<framework>/index.js`.

  `@mission-platform/vite-plugin-forge` gains `jsxComponentsCssImportPlugin`, which
  re-links each component's extracted CSS to its JS chunk (Vite library builds
  emit per-chunk CSS but do not inject the import), and its two-stage compiler now
  translates the new named-slot marker.

  `@mission-platform/forge` adds a framework-neutral named-slot primitive `Slot`
  (`<Slot name="…" />`, with the nameless `<Slot />` for the default slot, scoped
  slots, and fallback children). The runtime adapters resolve slots against a
  per-component scope, and the build-time compiler rewrites `<Slot name="x" />` to
  Vue's `slots.x?.()` and React's `properties.x`.

- edb785f: migrate the remaining layout components and emit scoped SCSS for the Vue build

  `@mission-platform/components` completes the `Components/Layout` migration:
  `BaseTypography`, `BaseHero`, `BaseDrawer`, `BaseNavbar`, `BaseVerticalLayout`,
  and `BaseWindowPopout` are now authored once in the neutral JSX dialect and
  compiled straight to both React and Vue. Cross-framework events use the
  **callback-prop** convention (`onOpenChange` / `onClose` / `onStartOpenChange` /
  …). Behaviours the neutral dialect does not model are substituted with documented
  equivalents: `BaseDrawer` renders an in-place `position: fixed` overlay (or a
  reactive `matchMedia`-driven `inline` panel) instead of a `<Teleport>` +
  `<Transition>`; `BaseWindowPopout` opens a real second window via `window.open`
  and shows a cloned-HTML snapshot instead of a portal; would-be slots become
  `MpChild` props; `BaseTypography` drops the `@floating-ui` truncate-popup. Each
  ships its own per-component `@layer mp.components` CSS, with co-located stories
  (`JSX Components/<Category>/…`) and cross-framework SSR specs.

  `@mission-platform/vite-plugin-forge`'s two-stage compiler now scopes styling per
  framework: the **React** build keeps the hashed **CSS Module**, while the **Vue**
  build inlines each component's `*.module.scss` as a scoped
  `<style scoped lang="scss">` block in the generated SFC (preserving the
  `@layer mp.components` wrapper) and rewrites every `styles['x']` /
  `styles[`x`]` read — including computed object keys — to its literal class name,
  so `classNames(...)` produces plain, `data-v-`-scoped classes.

  `@mission-platform/forge`'s `Slot` marker is a (never-invoked) function component
  so `<Slot name="…" />` type-checks under the classic `h` factory.

- edb785f: add a framework-neutral `Teleport`/portal primitive and migrate the popup overlays with CSS anchor positioning

  - `@mission-platform/forge`: add the neutral `<Teleport to="…">` portal element (`MpTeleportProperties`) — a compile-time/adapter marker like `Slot`. The runtime adapters render its children in place (SSR parity), and `@mission-platform/forge/react` now also exports a real `createPortal`-backed `Teleport` component (SSR-safe; resolves its target after mount).
  - `@mission-platform/vite-plugin-forge`: remap the neutral `Teleport` import per framework — Vue resolves it from the `vue` runtime (built-in `<Teleport>`) and React imports it from `@mission-platform/forge/react` (the `createPortal` wrapper) — while leaving the `<Teleport>` JSX usage intact.
  - `@mission-platform/components`: migrate the `Components/Overlays` popups `BaseTooltip`, `BasePopover`, and `BaseDropdown` from `@mission-platform/components` to the write-once neutral package. Each teleports its panel to `document.body` and positions it with the CSS Anchor Positioning API (`anchor-name`/`position-anchor`/`position-area` + `position-try-fallbacks` + `@position-try`, plus `anchor-size(width)` for the dropdown's trigger-width match) instead of `@floating-ui`; `<Transition>` is dropped. The popover's and dropdown's compound (`-start`/`-end`) placements use **fully-logical** `position-area` values (e.g. `block-end span-inline-end`) — mixing a physical side keyword with a logical span (`bottom span-inline-end`) is an invalid value that browsers silently drop, which would leave the teleported panel un-anchored at its static position. The modal overlays (`BaseDialog`/`BaseModal`) remain Vue-only.

- edb785f: migrate the Components/Theme group to the write-once components library

  `@mission-platform/components` now ships the complete `Components/Theme`
  group — `BaseThemeToggle`, `BaseThemeProvider`, and `BaseThemeComposer` —
  authored once in the neutral JSX dialect and compiled to both React and Vue.
  Because the neutral dialect has no `provide`/`inject` context primitive,
  cross-component theme state is shared through a framework-agnostic observable
  singleton store (`theme-store.ts`), and the composer is a controlled component
  (`modelValue`/`onUpdateModelValue` in place of `v-model`).

  `@mission-platform/vite-plugin-forge` gains **shared helper module** support: a
  neutral component can import a sibling plain `.ts`/`.tsx` helper (e.g. the theme
  store); the two-stage compiler now distinguishes such helpers from sibling
  components (so the Vue emitter keeps a named `./x` import instead of `./x.vue`)
  and copies each referenced helper into both generated framework trees.

- 18bd49a: extract the common layouts into a new `@mission-platform/layouts` package

  Adds the write-once `@mission-platform/layouts` package containing the common
  layout primitives — `BaseApplicationLayout` (public `ApplicationLayout`) and
  `BaseVerticalLayout` (public `VerticalLayout`) — authored once in the neutral
  `@mission-platform/forge` dialect and compiled straight to both Vue 3 (`./vue`)
  and React (`./react`) by the two-stage `@mission-platform/vite-plugin-forge`
  compiler, with co-located `JSX Components/Layout/<Name>` stories and
  cross-framework SSR specs.

  **BREAKING (`@mission-platform/components`):** `BaseApplicationLayout` /
  `ApplicationLayout` and `BaseVerticalLayout` / `VerticalLayout` are no longer
  exported from `@mission-platform/components` — import them from
  `@mission-platform/layouts/vue` (or `/react`) instead. `@mission-platform/components`
  gains a neutral `.` root export and a neutral `./base-drawer` subpath so the
  write-once layouts can reuse `BaseDrawer` across packages.

  `@mission-platform/vite-plugin-forge`'s two-stage compiler now remaps neutral
  imports of the framework-split component libraries (`@mission-platform/components`
  and `@mission-platform/layouts`, in addition to `@mission-platform/icons`) — from
  their root or a neutral subpath — to the matching built `./react` / `./vue`
  entry, so write-once components can compose components published by another
  package.

- edb785f: forward non-component helper re-exports through the generated entry

  The two-stage compiler now also forwards a barrel's **helper-module**
  re-exports (e.g. `export { useToast, … } from './toast-store'`) through the
  generated `./react` / `./vue` entry (and its synthesised `.d.ts`), re-pointing
  them at the helper file copied into the flat per-framework tree. This lets a
  write-once package expose shared framework-agnostic APIs (such as the
  `@mission-platform/components` toast store) alongside its components, so each
  framework's consumers drive the same per-framework singleton the components use.
  A new `discoverHelperExports` helper distinguishes these from component exports
  (component re-exports are unaffected).

- 94f9acf: support neutral hooks and generate the per-framework entry modules

  The plugin now also handles the framework-neutral React-style hooks
  (`useState`/`useRef`/`useEffect`/`useMemo`/`useCallback`) when compiling a
  component, and **generates** the per-framework entry module for a neutral
  components package (`generateFrameworkSources` + `jsxComponentsEntryDtsPlugin`),
  so consumers no longer hand-author `react.ts` / `vue.ts` — the entry is produced
  from the components barrel and its `<framework>.d.ts` is synthesised.

- 94f9acf: compile named-slot passing into child components

  A write-once component can now pass content into a child component's named slot
  by marking a child with `slot="name"`. The compiler routes it to each
  framework's native mechanism: the React emitter turns `<Child><x slot="name"/></Child>`
  into a `name={<x/>}` prop; the Vue template path emits a `<template #name>`
  block (with the default-slot children in `<template #default>`); and the Vue
  render-closure path emits the `@vitejs/plugin-vue-jsx` `{{ name: () => … }}`
  object-children form (composed before the reference rewriter, so setters and
  state reads inside the slot functions are still translated to Vue reactivity).
  The `slot` marker is always stripped from the generated output.

- 94f9acf: add a Storyblok target that emits blok configurations and framework blok wrappers

  Alongside the React and Vue source generators, the plugin now projects the same
  neutral `@mission-platform/forge` components onto Storyblok via the new
  `generateStoryblokBloks`. For every component it derives, from the props
  contract, a Storyblok component object — string-literal unions (incl. local
  `type` aliases) become `option` fields, `boolean`/`number`/`string` map to the
  matching primitive field, `string | number` degrades to `text`, callbacks are
  dropped, and the default slot / `MpChild` props become nestable `bloks` fields,
  with JSDoc as the field `description` and `?? <literal>` / destructuring defaults
  as `default_value` — plus a thin React `.tsx` / Vue `.vue` blok wrapper that
  binds `blok.<field>` onto the built component, tags it editable
  (`storyblokEditable` / `v-editable`), and renders `bloks` fields through
  `StoryblokComponent`. It writes per-component `<name>.json`, the aggregate
  `components.json`, the wrapper sources, and a wrapper entry barrel.

  The per-framework emitters move from `src/compiler/` into a dedicated
  `src/generators/` directory (`react.ts`, `vue.ts`, `storyblok.ts`), with the
  shared parsing/discovery helpers remaining in `src/compiler/`.

- 94f9acf: compile the new neutral structural primitives to native code: remap the `Transition` import (Vue built-in / React CSS-class driver), rewrite `<Dynamic is={X}>` to `h(X, …)` (React `createElement` / Vue `<component :is>`), map `createContext`/`useContext` to each framework's provide/inject (React-native / Vue `@mission-platform/forge/vue`, keeping `useContext` a synchronous setup const), and resolve recursive self-referencing components via `defineOptions({ name })` + `resolveComponent`
- 94f9acf: remap the neutral `TransitionGroup` import like `Transition`/`Teleport` — Vue resolves the built-in `<TransitionGroup>` from `vue` and React imports the `@mission-platform/forge/react` group driver, while the `<TransitionGroup>` JSX usage is left intact on both targets
- edb785f: rework the plugin into a two-stage source-to-source compiler

  `@mission-platform/vite-plugin-forge` no longer ships a per-framework runtime that
  neutral imports are rewritten to. Instead it is a **two-stage compiler**:

  - **Stage 1 (source-to-source)** — `generateFrameworkSources` parses each neutral
    `.tsx` with the TypeScript compiler API and emits a per-framework source tree:
    a React `.tsx` module (`class` → `className`, `h` → `React.createElement`,
    hooks kept as React's own) or a real Vue `.vue` SFC (`<script lang="tsx">`
    `defineComponent`/`setup`, with the React-style hooks translated to Vue
    reactivity/lifecycle — `useState` → `ref`, `useRef` → `ref`, `useMemo` →
    `computed`, `useEffect` → `onMounted` + `watch(deps)` + cleanup — derived work
    and the returned JSX moved into the render closure, `children` → default slot,
    and prop defaults lifted into the runtime `props` declaration).
  - **Stage 2 (native compile)** — the generated tree is compiled by the framework's
    own toolchain: the classic-`h` React JSX transform (`reactJsxPlugin`) or
    `@vitejs/plugin-vue` (+ `@vitejs/plugin-vue-jsx`).

  This keeps each framework's runtime performance native (no neutral-tree walk, no
  React-hooks-on-Vue shim) and makes new target frameworks a matter of adding
  another emitter. `@mission-platform/components` now builds through this
  pipeline (its Vue build compiles generated `.vue` SFCs via `@vitejs/plugin-vue-jsx`).

  BREAKING CHANGE: the `./react` and `./vue` runtime subpath exports, the
  `jsxPlugin` / `vueJsxPlugin` factories, the runtime `defineVueBoundary`, and
  `writeJsxComponentsEntry` are removed. Use `generateFrameworkSources` (Stage 1),
  `reactJsxPlugin` (React Stage 2), `@vitejs/plugin-vue(-jsx)` (Vue Stage 2), and
  `jsxComponentsEntryDtsPlugin` instead.

- edb785f: type the Storyblok blok wrapper's `blok` prop precisely

  The Storyblok target now derives a precise interface for each wrapper's `blok`
  prop instead of the open `SbBlokData & Record<string, unknown>`. A new
  `emitBlokDataType` builds `SbBlokData & { … }` from the component's analysed
  schema — one member per field (`option` → string-literal union, `text` →
  `string`, `number`, `boolean`, `bloks` → `SbBlokData[]`; non-optional props stay
  required, a field-less component degrades to bare `SbBlokData`) — and it is used
  in the generated Vue `defineProps`, the React `<Name>BlokProperties` interface,
  and the synthesised wrapper-entry `index.d.ts`. `@mission-platform/components`
  now ships that typed `index.d.ts` for its `./storyblok/{react,vue}` subpaths.

- edb785f: add vite plugin that compiles the neutral jsx components to react/vue at build time

  Introduces the `@mission-platform/vite-plugin-forge` workspace, which compiles the
  framework-neutral `@mission-platform/forge` components to React or Vue 3 at build
  time instead of wrapping them with the runtime `toReactComponent` /
  `toVueComponent` adapters.

  `@mission-platform/components` produces its `./react` and `./vue` subpaths by
  running one `vite build` per framework through this plugin, rather than the
  runtime adapters.

### Patch Changes

- 38416d9: map classNames attribute to native class in vue compiler
- edb785f: forward consumer fall-through attributes onto the generated Vue component root

  The Vue emitter stamps every generated SFC with `defineOptions({ inheritAttrs:
false })` (so multi-root / render-closure components don't warn), but it never
  re-enabled attribute inheritance — so consumer-supplied fall-through attributes
  (`class`/`style`/`id`/`data-*`/listeners) were silently dropped, unlike the
  hand-authored `.vue` SFCs they replaced. This regressed components relied on the
  fall-through, e.g. the Monaco editor lost its consumer `class` (and therefore
  its `flex: 1` / border overrides) when wrapped by an app.

  The two-stage compiler now opts the root back in explicitly: a single root
  element in the `<template>` path is emitted with a trailing `v-bind="$attrs"`
  (placed last to mirror Vue's default-inheritance precedence; `class`/`style`
  still merge), and the render-closure fallback forwards `$attrs` onto its
  `<component :is="render">` host. `@mission-platform/components` and
  `@mission-platform/icons` pick this up when their `./vue` subpaths are rebuilt.

- 94f9acf: fix a Vue compile bug where a derived local read by a hook initialiser was left out of `setup`

  When a neutral component declared a derived `const` and then read it from a hook
  initialiser — e.g. `const initial = parseTime(modelValue); const [h] = useState(initial.h)` —
  the Vue emitter only hoisted derived declarations that a `useEffect` closed over.
  Because `useState`/`useRef`/`useMemo`/`useCallback`/`useContext` initialisers are
  also emitted in `setup`, the derived `const` stayed in the per-render closure and
  resolved to an undefined name at runtime (`ReferenceError: initial is not defined`).

  The hoist analysis now also seeds from hook-declaration initialisers, so a derived
  value read by a hook is lifted into `setup` (as a `computed`) ahead of the hook
  that consumes it.

- 94f9acf: fix slot translation for the `h(Slot, …)` call form and kebab slot names

  The two-stage compiler's reference rewriters now translate the **call form** of
  the named-slot marker — `h(Slot, { name: 'x' }, …fallback)` — exactly like the
  `<Slot name="x" />` JSX element, on both the Vue (`createReferenceRewriter`
  render-closure) and React paths. Previously only the JSX element form was
  handled, so a component that composed slots with `h(Slot, …)` (e.g. inside an
  intermediate `const column = … ? h(Drawer, …, h(Slot, { name: 'start' })) : …`
  that forces the `<script setup>` render-closure fallback) emitted an undefined
  `Slot` reference and threw `ReferenceError: Slot is not defined` at render.

  Slot/`hasSlot` reads for **non-identifier (kebab-case) slot names** now use
  bracket access (`slots["start-header"]` / `properties["start-header"]`) instead
  of dot access, which JavaScript mis-parsed as a subtraction
  (`slots.start-header` → `slots.start - header`). The Vue emitter also now wires
  up `useSlots()` when a body references slots via bracket access.

- edb785f: fix the Vue build so each component's styles load and apply (stories were unstyled)

  Two issues kept the `@mission-platform/components/vue` components (consumed
  by Storybook) unstyled, now both fixed so the components are a like-for-like
  visual match with the original `@mission-platform/components` SFCs:

  1. **CSS not loaded.** `jsxComponentsCssImportPlugin` now runs with
     `enforce: 'post'`, so its `generateBundle` hook executes **after** Vite has
     populated each chunk's `viteMetadata.importedCss`. Previously it ran first,
     found the metadata empty, and never re-linked the per-component CSS — under
     `preserveModules` the Vue style assets were emitted but orphaned
     (`/* empty css */`). Now each Vue component chunk imports its own extracted
     stylesheet (e.g. `base-badge.js` → `import "./base-badge.vue_..._lang.css"`),
     while inline-styled primitives (`BaseGrid`/`BaseStack`/`BaseMasonry`/
     `BaseInView`) correctly stay CSS-free. A regression test guards this.
  2. **CSS not applied.** The Vue emitter now inlines each component's SCSS as a
     **non-scoped** `<style lang="scss">` block instead of `<style scoped>`. These
     SFCs render via a `<script>` render function, and Vue only auto-applies the
     `data-v-…` scope attribute to a render function's **root** vnode — so nested
     elements (`base-separator__line`, drawer/hero/navbar internals, …) never
     received it and the scoped rules silently failed to match. The rules stay in
     the `@layer mp.components` cascade layer and rely on the components' unique
     BEM class names (exactly how the original SFCs are namespaced), so styling
     now applies to every element.

- 94f9acf: lowercase multi-word native DOM event listeners on the Vue target

  Vue derives a DOM listener's event name by hyphenating the prop key after `on` (`onDragOver` → the dead `drag-over`), so a React-style multi-word listener on a native element bound nothing and events such as `dragover`/`drop` never fired. The Vue emitter now lowercases the event portion of `on<Event>` listeners on **native** (intrinsic) elements (`onDragOver` → `onDragover`, `@dragover`) on both the render-closure and `<template>` paths, so they bind the real DOM event; listeners on **component** elements keep their camelCase form to match the child's emits.

- 94f9acf: make the `<Dynamic is>` primitive accept hyphenated attributes and slotted children

  `dynamicToHCall` now quotes non-identifier prop keys (e.g. `aria-current`,
  `data-id`) as string-literal property names so the emitted `h(tag, { … })`
  object literal is valid JS, and `jsxChildToArgument` unwraps the `{ … }`
  `JsxExpression` wrapper produced by the `<Slot>` rewrite so a `<Dynamic>` may
  carry `<Slot>` children (e.g. `<Dynamic is={tag}><Slot/></Dynamic>`). This
  unblocks `BaseNavbarItem`'s dynamic-tag rendering on both frameworks.

- edb785f: fix the Vue render-closure fallback so an effect can reference a derived declaration

  A `useEffect` is emitted into Vue `setup` (`onMounted`/`watch`), but the derived
  `const`s and functions it closes over defaulted to the per-render closure — so
  an effect that referenced one (e.g. `BaseCarousel`'s `slideCount`/`commit`)
  threw `slideCount is not defined` at runtime. The Vue emitter now finds the
  transitive set of derived declarations every effect depends on and hoists them
  into `setup` ahead of the effects: a derived **function** stays a plain `const`,
  while a derived **value** becomes a reactive `computed` (registered in the scope
  so every read — in the effect, its deps array, and the render closure — is
  rewritten to `<name>.value`).

- f70ecc8: carry external package imports into the generated Vue SFC

  The Vue emitter reconstructed a component's imports from only a fixed set of
  categories (the neutral `@mission-platform/forge` package, relative
  component/helper modules, stylesheets, and the Vue adapter), silently dropping
  every other bare-package import. A component that referenced an external value —
  e.g. `@mission-platform/forms-core`'s `DEFAULT_FIELD_TYPES` used as a prop
  default — therefore compiled to a Vue SFC that crashed at runtime with
  `ReferenceError: <name> is not defined` (e.g. the `BaseFormBuilder` Vue build).
  External (non-relative, non-neutral, non-stylesheet) imports are now carried
  through verbatim, matching the React emitter.

- 94f9acf: split the React, Vue and Storyblok emitters into per-generator folders

  Each Stage-1 emitter that previously lived in a single `src/generators/<name>.ts`
  file is now a `src/generators/<name>/` folder with an `index.ts` barrel and the
  implementation split across focused modules — `react/` (`aliases`, `imports`,
  `emit-module`), `vue/` (`shared`, `scope`, `effects`, `body`, `imports`,
  `styles`, `emit-module`), and `storyblok/` (`types`, `names`, `classify`,
  `analyze`, `wrappers`) — to make future maintenance easier. The public API and
  all generated output are unchanged.

- 94f9acf: emit native Vue `<template>` markup instead of a render function where possible

  The Vue Stage-1 emitter now rewrites a component's returned JSX/`h()` tree into real Vue `<template>` markup for the single-tree primitives: a dynamic tag becomes `<component :is="tag">`, `class`/`style`/`on<Event>`/`ref`/other dynamic attributes become the matching binding, `cond ? <a/> : <b/>` becomes `v-if`/`v-else`, `properties.children`/`<Slot>` become native `<slot>`, and each derived scalar `const` is lifted to a reactive `computed`. Components whose body falls outside that shape (node-valued local consts, `.map()` lists, prop spreads, or `MpChild`-typed props rendered as children — the complex layout components) automatically fall back to the previous `<script setup>` + `const render = () => …` + `<component :is="render" />` closure. The compiled output stays functionally identical.

- 94f9acf: emit Vue components as `<script setup>` SFCs instead of `export default defineComponent`

  The Vue Stage-1 emitter now produces a `<script setup lang="tsx">` single-file component — `defineOptions({ name, inheritAttrs: false })`, a `defineProps(…)` declaration, `useSlots()`, and the translated hooks emitted once at the top level — with the per-render JSX moved into a `const render = () => …` closure rendered from the `<template>` via `<component :is="render" />` (since `<script setup>` cannot itself return a render function). The compiled output stays functionally identical.

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

## 0.1.0

### Minor Changes

- edb785f: add a framework-neutral `classNames` helper and move component CSS Modules to the `mp.components` layer

  `@mission-platform/forge` now exports a `classNames(...values)` helper (and its
  `ClassValue` type) for assembling class names the same way on every framework
  from the string (`'a b'`), object (`{ 'class': boolean }`), and array
  (`['class']`) forms — falsy entries are dropped and duplicates de-duplicated.

  `@mission-platform/vite-plugin-forge`'s two-stage compiler now (1) preserves
  neutral framework-agnostic value imports such as `classNames` verbatim (instead
  of translating them like `h`/the hooks), and (2) carries each component's
  own relative stylesheet imports (CSS Modules and bare CSS) onto both the React
  and Vue generated source trees, so a neutral component can own and ship its own
  CSS.

  `@mission-platform/components`' co-located `.module.scss` files are now real
  CSS Modules whose rules live in the shared `@layer mp.components` cascade layer
  with no `:global`. The styled components (`BaseBadge`, `BaseButton`,
  `BaseSeparator`) own their styling via the hashed class map + `classNames`, and
  the package now ships that CSS through new `./vue.css` and `./react.css`
  exports.

- edb785f: add the platform-owned `className={…}` JSX attribute for class management

  Neutral components now drive dynamic classes with a `className={…}` attribute
  (reserving the plain `class="…"` for static strings) instead of calling the
  `classNames` helper inline — the author never imports the helper. The canonical
  value is an array holding the same arguments the helper accepts.

  `@mission-platform/vite-plugin-forge`'s two-stage compiler owns the transform: on
  React an array value collapses to a `className={classNames(…)}` string call
  (re-injecting the neutral `classNames` import), while any other value passes
  through as `className`; on Vue it maps onto the native `class` binding, which
  understands the array/object forms (no helper needed). `@mission-platform/forge`'s
  `./react` and `./vue` runtime adapters apply the same mapping at render time so
  the ad-hoc/SSR output matches the compiled output. The `classNames(...values)`
  helper is still exported for the rare precompute and `h(tag, { class: … })`
  object form.

  `@mission-platform/components` and `@mission-platform/icons` migrate
  their components' `class={…}` attributes to `className={…}` accordingly.

- edb785f: ship the `Base*` export aliases, public-type re-exports, a `./styles` entry, and a `BaseVirtualTable` `cell` slot so apps can adopt the JSX components in place of the Vue component library

  `@mission-platform/vite-plugin-forge`'s entry generator now re-exports each
  compiled component under **both** its public name (`Button`) **and** its neutral
  `Base`-prefixed name (`BaseButton`) as aliases of the same component, and
  re-exports **every public type** each component ships alongside it (variants,
  option shapes, props interfaces, scoped-slot scopes, …) from the neutral
  declarations — both in the runtime entry and its synthesised `.d.ts`.

  `@mission-platform/components` therefore exposes every component under the
  `Base*` name on its `./react` / `./vue` subpaths (alongside the bare names), and
  adds:

  - a `./styles` side-effect entry (`@mission-platform/components/styles`) — a
    global `prefers-reduced-motion` reset mirroring the Vue component library's
    global accessibility safety net.
  - a scoped `cell` slot on `BaseVirtualTable` (`{ column, row, value }`, exported
    as `VirtualTableCellScope`) for fully custom (interactive) cell content,
    falling back to each column's `render` formatter.

- edb785f: add scoped-slot (render-prop) support and migrate the self-contained Data components to write-once JSX

  `@mission-platform/forge` gains a `MpRenderProperty<Scope>` type and the neutral
  `<Slot>` element now accepts **scope props** (`<Slot name="row" item={item}
index={i} />`) so a write-once component can drive a **scoped slot**.

  `@mission-platform/vite-plugin-forge`'s two-stage compiler translates a scoped
  `<Slot>` to a Vue scoped slot (`slots.x?.(scope)`) and a React render-prop call
  (`properties.x?.(scope)`), reusing the existing named-slot path. Both emitters
  have a regression test.

  `@mission-platform/components` gains three cross-framework `Components/Data`
  components, authored once in the neutral dialect and compiled straight to both
  React and Vue:

  - `BaseVirtualList` — windowed list with a scoped `row` slot.
  - `BaseVirtualLogViewer` — virtual-scrolling log with per-level colouring, a
    substring filter + matching-count toolbar, follow-tail, and an `onSelect`
    callback (composes `BaseTypography`).
  - `BaseVirtualTreeView` — flattened virtual tree with a built-in expand/collapse
    label (overridable via the scoped `row` slot) and `onSelect`/`onToggle`
    callbacks.

  Each ships its per-component folder (`.tsx`/`.module.scss`/`.stories.tsx`/
  `.spec.ts`/`index.ts`), categorised `JSX Components/Data/<Name>` stories, and
  cross-framework SSR specs. Vue-only features the neutral dialect cannot model
  (icons, scoped **default** slots, generics) are substituted with documented
  equivalents (a `●`/`▸`/`▾` glyph, named `row` scoped slots, `unknown` items).

- edb785f: migrate the Components/Display components to write-once JSX and fix two compiler prop/name collisions

  `@mission-platform/components` gains nine cross-framework `Components/Display`
  components, authored once in the neutral JSX dialect and compiled straight to
  both React and Vue:

  - **Self-contained:** `BaseAvatar` (inline-styled image/initials/slot + presence
    dot), `BaseButtonGroup` (segmented `attached` group), `BaseIconButton`
    (icon-only button with required `label`).
  - **Composing `BaseTypography`:** `BaseTag` (toned, removable), `BaseQuote`
    (blockquote + attribution), `BaseList` (ul/ol/dl from `items`), `BaseCard`
    (header/body/footer surface), `BaseTable` (sortable, hooks-driven), and
    `BaseCollapse` (native `<details>` disclosure).

  Each ships its per-component folder (`.tsx`/`.module.scss`/`.stories.tsx`/
  `.spec.ts`/`index.ts`), categorised `JSX Components/Display/<Name>` stories, and
  cross-framework SSR specs. Vue-only features the neutral dialect cannot model
  (icons, scoped slots, provide/inject, transitions) are substituted with
  documented equivalents; `BaseAccordion`, `BaseCarousel`, and `BaseThemeToggle`
  remain Vue-only in `@mission-platform/components`.

  `@mission-platform/vite-plugin-forge`'s Vue emitter no longer rewrites JSX
  **attribute names** or **element tag names** when they collide with a
  destructured prop. Previously a `src` prop turned `src={src}` into the invalid
  `properties.src={properties.src}`, and a `caption` prop turned a `<caption>`
  element into the invalid dynamic `createVNode(properties.caption, …)`; both now
  keep the literal name and rewrite only the value. Regression tests cover both.

- edb785f: add a `hasSlot` slot-presence helper and move the component content props to named slots

  `@mission-platform/forge` now exports `hasSlot('x')` — the neutral counterpart of
  Vue's `$slots.x` / a React `properties.x != null` check (an omitted name targets
  the default slot) — so a write-once component can render an optional wrapper
  region only when a slot is filled. The runtime adapters also gain
  `resolveSlotMarkers`, which resolves a forwarded `<Slot>` marker lexically
  against the forwarding component before handing children to a child component,
  so a component can forward its own slots into a child's slots.

  `@mission-platform/vite-plugin-forge` compiles `hasSlot('x')` to each framework's
  native presence check — Vue's `v-if="$slots.x"` (template path) / `!!slots.x`
  (render-closure path, pulling in `useSlots()`) and React's `properties.x != null`
  — and consumes the `hasSlot` import (never emitting it).

  `@mission-platform/components` migrates every component that exposed `MpChild`
  content props (`BaseCard`, `BaseDialog`, `BaseModal`, `BaseDrawer`, `BaseHero`,
  `BaseAlertBanner`, `BaseToast`, `BaseChatBubble`, `BaseInput`, `BaseTextarea`,
  the date/time pickers, `BaseFormWizard`, `BaseWindowPopout`, `BaseVerticalLayout`,
  …) to author those regions as named slots (`<Slot>`), gating optional regions
  with `hasSlot`. React consumers are unaffected (named slots are props), but Vue
  consumers must now pass this content through named slots (`<template #header>`)
  rather than props.

- 13cfc7f: remap the write-once icon import to each framework build

  A neutral component that imports an icon from `@mission-platform/icons` now
  has that bare specifier rewritten to the per-framework subpath when compiled:
  `@mission-platform/icons/vue` in the Vue output and
  `@mission-platform/icons/react` in the React output. The Vue path handles it
  in `readExternalImports` (which now takes the target framework) and the React
  emitter rewrites it in its own import pass, mirroring the existing
  `Teleport`/`Transition` neutral-to-framework remap. The `<IconX />` usages are
  left intact as native component tags.

- edb785f: ship per-component CSS + strongly tree-shakeable output, and add a framework-neutral named-`Slot` primitive

  `@mission-platform/components` now compiles to **per-component** JS **and**
  CSS chunks instead of one bundled `vue.js` / `react.js` + one combined
  `vue.css` / `react.css`. Each framework is emitted into its own
  `dist/<framework>/` subtree (`preserveModules` + `cssCodeSplit`), every
  component is its own ESM chunk that imports its own stylesheet, and the entries
  are thin re-export barrels — so a consumer importing a single component pulls in
  only that component's JS + CSS and tree-shakes the rest of the library (styles
  included). **Breaking:** the `./vue.css` and `./react.css` subpath exports are
  removed (component CSS now loads automatically with the component), and the
  `./vue` / `./react` exports resolve to `dist/<framework>/index.js`.

  `@mission-platform/vite-plugin-forge` gains `jsxComponentsCssImportPlugin`, which
  re-links each component's extracted CSS to its JS chunk (Vite library builds
  emit per-chunk CSS but do not inject the import), and its two-stage compiler now
  translates the new named-slot marker.

  `@mission-platform/forge` adds a framework-neutral named-slot primitive `Slot`
  (`<Slot name="…" />`, with the nameless `<Slot />` for the default slot, scoped
  slots, and fallback children). The runtime adapters resolve slots against a
  per-component scope, and the build-time compiler rewrites `<Slot name="x" />` to
  Vue's `slots.x?.()` and React's `properties.x`.

- edb785f: migrate the remaining layout components and emit scoped SCSS for the Vue build

  `@mission-platform/components` completes the `Components/Layout` migration:
  `BaseTypography`, `BaseHero`, `BaseDrawer`, `BaseNavbar`, `BaseVerticalLayout`,
  and `BaseWindowPopout` are now authored once in the neutral JSX dialect and
  compiled straight to both React and Vue. Cross-framework events use the
  **callback-prop** convention (`onOpenChange` / `onClose` / `onStartOpenChange` /
  …). Behaviours the neutral dialect does not model are substituted with documented
  equivalents: `BaseDrawer` renders an in-place `position: fixed` overlay (or a
  reactive `matchMedia`-driven `inline` panel) instead of a `<Teleport>` +
  `<Transition>`; `BaseWindowPopout` opens a real second window via `window.open`
  and shows a cloned-HTML snapshot instead of a portal; would-be slots become
  `MpChild` props; `BaseTypography` drops the `@floating-ui` truncate-popup. Each
  ships its own per-component `@layer mp.components` CSS, with co-located stories
  (`JSX Components/<Category>/…`) and cross-framework SSR specs.

  `@mission-platform/vite-plugin-forge`'s two-stage compiler now scopes styling per
  framework: the **React** build keeps the hashed **CSS Module**, while the **Vue**
  build inlines each component's `*.module.scss` as a scoped
  `<style scoped lang="scss">` block in the generated SFC (preserving the
  `@layer mp.components` wrapper) and rewrites every `styles['x']` /
  `styles[`x`]` read — including computed object keys — to its literal class name,
  so `classNames(...)` produces plain, `data-v-`-scoped classes.

  `@mission-platform/forge`'s `Slot` marker is a (never-invoked) function component
  so `<Slot name="…" />` type-checks under the classic `h` factory.

- edb785f: add a framework-neutral `Teleport`/portal primitive and migrate the popup overlays with CSS anchor positioning

  - `@mission-platform/forge`: add the neutral `<Teleport to="…">` portal element (`MpTeleportProperties`) — a compile-time/adapter marker like `Slot`. The runtime adapters render its children in place (SSR parity), and `@mission-platform/forge/react` now also exports a real `createPortal`-backed `Teleport` component (SSR-safe; resolves its target after mount).
  - `@mission-platform/vite-plugin-forge`: remap the neutral `Teleport` import per framework — Vue resolves it from the `vue` runtime (built-in `<Teleport>`) and React imports it from `@mission-platform/forge/react` (the `createPortal` wrapper) — while leaving the `<Teleport>` JSX usage intact.
  - `@mission-platform/components`: migrate the `Components/Overlays` popups `BaseTooltip`, `BasePopover`, and `BaseDropdown` from `@mission-platform/components` to the write-once neutral package. Each teleports its panel to `document.body` and positions it with the CSS Anchor Positioning API (`anchor-name`/`position-anchor`/`position-area` + `position-try-fallbacks` + `@position-try`, plus `anchor-size(width)` for the dropdown's trigger-width match) instead of `@floating-ui`; `<Transition>` is dropped. The popover's and dropdown's compound (`-start`/`-end`) placements use **fully-logical** `position-area` values (e.g. `block-end span-inline-end`) — mixing a physical side keyword with a logical span (`bottom span-inline-end`) is an invalid value that browsers silently drop, which would leave the teleported panel un-anchored at its static position. The modal overlays (`BaseDialog`/`BaseModal`) remain Vue-only.

- edb785f: migrate the Components/Theme group to the write-once components library

  `@mission-platform/components` now ships the complete `Components/Theme`
  group — `BaseThemeToggle`, `BaseThemeProvider`, and `BaseThemeComposer` —
  authored once in the neutral JSX dialect and compiled to both React and Vue.
  Because the neutral dialect has no `provide`/`inject` context primitive,
  cross-component theme state is shared through a framework-agnostic observable
  singleton store (`theme-store.ts`), and the composer is a controlled component
  (`modelValue`/`onUpdateModelValue` in place of `v-model`).

  `@mission-platform/vite-plugin-forge` gains **shared helper module** support: a
  neutral component can import a sibling plain `.ts`/`.tsx` helper (e.g. the theme
  store); the two-stage compiler now distinguishes such helpers from sibling
  components (so the Vue emitter keeps a named `./x` import instead of `./x.vue`)
  and copies each referenced helper into both generated framework trees.

- 18bd49a: extract the common layouts into a new `@mission-platform/layouts` package

  Adds the write-once `@mission-platform/layouts` package containing the common
  layout primitives — `BaseApplicationLayout` (public `ApplicationLayout`) and
  `BaseVerticalLayout` (public `VerticalLayout`) — authored once in the neutral
  `@mission-platform/forge` dialect and compiled straight to both Vue 3 (`./vue`)
  and React (`./react`) by the two-stage `@mission-platform/vite-plugin-forge`
  compiler, with co-located `JSX Components/Layout/<Name>` stories and
  cross-framework SSR specs.

  **BREAKING (`@mission-platform/components`):** `BaseApplicationLayout` /
  `ApplicationLayout` and `BaseVerticalLayout` / `VerticalLayout` are no longer
  exported from `@mission-platform/components` — import them from
  `@mission-platform/layouts/vue` (or `/react`) instead. `@mission-platform/components`
  gains a neutral `.` root export and a neutral `./base-drawer` subpath so the
  write-once layouts can reuse `BaseDrawer` across packages.

  `@mission-platform/vite-plugin-forge`'s two-stage compiler now remaps neutral
  imports of the framework-split component libraries (`@mission-platform/components`
  and `@mission-platform/layouts`, in addition to `@mission-platform/icons`) — from
  their root or a neutral subpath — to the matching built `./react` / `./vue`
  entry, so write-once components can compose components published by another
  package.

- edb785f: forward non-component helper re-exports through the generated entry

  The two-stage compiler now also forwards a barrel's **helper-module**
  re-exports (e.g. `export { useToast, … } from './toast-store'`) through the
  generated `./react` / `./vue` entry (and its synthesised `.d.ts`), re-pointing
  them at the helper file copied into the flat per-framework tree. This lets a
  write-once package expose shared framework-agnostic APIs (such as the
  `@mission-platform/components` toast store) alongside its components, so each
  framework's consumers drive the same per-framework singleton the components use.
  A new `discoverHelperExports` helper distinguishes these from component exports
  (component re-exports are unaffected).

- 94f9acf: support neutral hooks and generate the per-framework entry modules

  The plugin now also handles the framework-neutral React-style hooks
  (`useState`/`useRef`/`useEffect`/`useMemo`/`useCallback`) when compiling a
  component, and **generates** the per-framework entry module for a neutral
  components package (`generateFrameworkSources` + `jsxComponentsEntryDtsPlugin`),
  so consumers no longer hand-author `react.ts` / `vue.ts` — the entry is produced
  from the components barrel and its `<framework>.d.ts` is synthesised.

- 94f9acf: compile named-slot passing into child components

  A write-once component can now pass content into a child component's named slot
  by marking a child with `slot="name"`. The compiler routes it to each
  framework's native mechanism: the React emitter turns `<Child><x slot="name"/></Child>`
  into a `name={<x/>}` prop; the Vue template path emits a `<template #name>`
  block (with the default-slot children in `<template #default>`); and the Vue
  render-closure path emits the `@vitejs/plugin-vue-jsx` `{{ name: () => … }}`
  object-children form (composed before the reference rewriter, so setters and
  state reads inside the slot functions are still translated to Vue reactivity).
  The `slot` marker is always stripped from the generated output.

- 94f9acf: add a Storyblok target that emits blok configurations and framework blok wrappers

  Alongside the React and Vue source generators, the plugin now projects the same
  neutral `@mission-platform/forge` components onto Storyblok via the new
  `generateStoryblokBloks`. For every component it derives, from the props
  contract, a Storyblok component object — string-literal unions (incl. local
  `type` aliases) become `option` fields, `boolean`/`number`/`string` map to the
  matching primitive field, `string | number` degrades to `text`, callbacks are
  dropped, and the default slot / `MpChild` props become nestable `bloks` fields,
  with JSDoc as the field `description` and `?? <literal>` / destructuring defaults
  as `default_value` — plus a thin React `.tsx` / Vue `.vue` blok wrapper that
  binds `blok.<field>` onto the built component, tags it editable
  (`storyblokEditable` / `v-editable`), and renders `bloks` fields through
  `StoryblokComponent`. It writes per-component `<name>.json`, the aggregate
  `components.json`, the wrapper sources, and a wrapper entry barrel.

  The per-framework emitters move from `src/compiler/` into a dedicated
  `src/generators/` directory (`react.ts`, `vue.ts`, `storyblok.ts`), with the
  shared parsing/discovery helpers remaining in `src/compiler/`.

- 94f9acf: compile the new neutral structural primitives to native code: remap the `Transition` import (Vue built-in / React CSS-class driver), rewrite `<Dynamic is={X}>` to `h(X, …)` (React `createElement` / Vue `<component :is>`), map `createContext`/`useContext` to each framework's provide/inject (React-native / Vue `@mission-platform/forge/vue`, keeping `useContext` a synchronous setup const), and resolve recursive self-referencing components via `defineOptions({ name })` + `resolveComponent`
- 94f9acf: remap the neutral `TransitionGroup` import like `Transition`/`Teleport` — Vue resolves the built-in `<TransitionGroup>` from `vue` and React imports the `@mission-platform/forge/react` group driver, while the `<TransitionGroup>` JSX usage is left intact on both targets
- edb785f: rework the plugin into a two-stage source-to-source compiler

  `@mission-platform/vite-plugin-forge` no longer ships a per-framework runtime that
  neutral imports are rewritten to. Instead it is a **two-stage compiler**:

  - **Stage 1 (source-to-source)** — `generateFrameworkSources` parses each neutral
    `.tsx` with the TypeScript compiler API and emits a per-framework source tree:
    a React `.tsx` module (`class` → `className`, `h` → `React.createElement`,
    hooks kept as React's own) or a real Vue `.vue` SFC (`<script lang="tsx">`
    `defineComponent`/`setup`, with the React-style hooks translated to Vue
    reactivity/lifecycle — `useState` → `ref`, `useRef` → `ref`, `useMemo` →
    `computed`, `useEffect` → `onMounted` + `watch(deps)` + cleanup — derived work
    and the returned JSX moved into the render closure, `children` → default slot,
    and prop defaults lifted into the runtime `props` declaration).
  - **Stage 2 (native compile)** — the generated tree is compiled by the framework's
    own toolchain: the classic-`h` React JSX transform (`reactJsxPlugin`) or
    `@vitejs/plugin-vue` (+ `@vitejs/plugin-vue-jsx`).

  This keeps each framework's runtime performance native (no neutral-tree walk, no
  React-hooks-on-Vue shim) and makes new target frameworks a matter of adding
  another emitter. `@mission-platform/components` now builds through this
  pipeline (its Vue build compiles generated `.vue` SFCs via `@vitejs/plugin-vue-jsx`).

  BREAKING CHANGE: the `./react` and `./vue` runtime subpath exports, the
  `jsxPlugin` / `vueJsxPlugin` factories, the runtime `defineVueBoundary`, and
  `writeJsxComponentsEntry` are removed. Use `generateFrameworkSources` (Stage 1),
  `reactJsxPlugin` (React Stage 2), `@vitejs/plugin-vue(-jsx)` (Vue Stage 2), and
  `jsxComponentsEntryDtsPlugin` instead.

- edb785f: type the Storyblok blok wrapper's `blok` prop precisely

  The Storyblok target now derives a precise interface for each wrapper's `blok`
  prop instead of the open `SbBlokData & Record<string, unknown>`. A new
  `emitBlokDataType` builds `SbBlokData & { … }` from the component's analysed
  schema — one member per field (`option` → string-literal union, `text` →
  `string`, `number`, `boolean`, `bloks` → `SbBlokData[]`; non-optional props stay
  required, a field-less component degrades to bare `SbBlokData`) — and it is used
  in the generated Vue `defineProps`, the React `<Name>BlokProperties` interface,
  and the synthesised wrapper-entry `index.d.ts`. `@mission-platform/components`
  now ships that typed `index.d.ts` for its `./storyblok/{react,vue}` subpaths.

- edb785f: add vite plugin that compiles the neutral jsx components to react/vue at build time

  Introduces the `@mission-platform/vite-plugin-forge` workspace, which compiles the
  framework-neutral `@mission-platform/forge` components to React or Vue 3 at build
  time instead of wrapping them with the runtime `toReactComponent` /
  `toVueComponent` adapters.

  `@mission-platform/components` produces its `./react` and `./vue` subpaths by
  running one `vite build` per framework through this plugin, rather than the
  runtime adapters.

### Patch Changes

- 38416d9: map classNames attribute to native class in vue compiler
- edb785f: forward consumer fall-through attributes onto the generated Vue component root

  The Vue emitter stamps every generated SFC with `defineOptions({ inheritAttrs:
false })` (so multi-root / render-closure components don't warn), but it never
  re-enabled attribute inheritance — so consumer-supplied fall-through attributes
  (`class`/`style`/`id`/`data-*`/listeners) were silently dropped, unlike the
  hand-authored `.vue` SFCs they replaced. This regressed components relied on the
  fall-through, e.g. the Monaco editor lost its consumer `class` (and therefore
  its `flex: 1` / border overrides) when wrapped by an app.

  The two-stage compiler now opts the root back in explicitly: a single root
  element in the `<template>` path is emitted with a trailing `v-bind="$attrs"`
  (placed last to mirror Vue's default-inheritance precedence; `class`/`style`
  still merge), and the render-closure fallback forwards `$attrs` onto its
  `<component :is="render">` host. `@mission-platform/components` and
  `@mission-platform/icons` pick this up when their `./vue` subpaths are rebuilt.

- 94f9acf: fix a Vue compile bug where a derived local read by a hook initialiser was left out of `setup`

  When a neutral component declared a derived `const` and then read it from a hook
  initialiser — e.g. `const initial = parseTime(modelValue); const [h] = useState(initial.h)` —
  the Vue emitter only hoisted derived declarations that a `useEffect` closed over.
  Because `useState`/`useRef`/`useMemo`/`useCallback`/`useContext` initialisers are
  also emitted in `setup`, the derived `const` stayed in the per-render closure and
  resolved to an undefined name at runtime (`ReferenceError: initial is not defined`).

  The hoist analysis now also seeds from hook-declaration initialisers, so a derived
  value read by a hook is lifted into `setup` (as a `computed`) ahead of the hook
  that consumes it.

- 94f9acf: fix slot translation for the `h(Slot, …)` call form and kebab slot names

  The two-stage compiler's reference rewriters now translate the **call form** of
  the named-slot marker — `h(Slot, { name: 'x' }, …fallback)` — exactly like the
  `<Slot name="x" />` JSX element, on both the Vue (`createReferenceRewriter`
  render-closure) and React paths. Previously only the JSX element form was
  handled, so a component that composed slots with `h(Slot, …)` (e.g. inside an
  intermediate `const column = … ? h(Drawer, …, h(Slot, { name: 'start' })) : …`
  that forces the `<script setup>` render-closure fallback) emitted an undefined
  `Slot` reference and threw `ReferenceError: Slot is not defined` at render.

  Slot/`hasSlot` reads for **non-identifier (kebab-case) slot names** now use
  bracket access (`slots["start-header"]` / `properties["start-header"]`) instead
  of dot access, which JavaScript mis-parsed as a subtraction
  (`slots.start-header` → `slots.start - header`). The Vue emitter also now wires
  up `useSlots()` when a body references slots via bracket access.

- edb785f: fix the Vue build so each component's styles load and apply (stories were unstyled)

  Two issues kept the `@mission-platform/components/vue` components (consumed
  by Storybook) unstyled, now both fixed so the components are a like-for-like
  visual match with the original `@mission-platform/components` SFCs:

  1. **CSS not loaded.** `jsxComponentsCssImportPlugin` now runs with
     `enforce: 'post'`, so its `generateBundle` hook executes **after** Vite has
     populated each chunk's `viteMetadata.importedCss`. Previously it ran first,
     found the metadata empty, and never re-linked the per-component CSS — under
     `preserveModules` the Vue style assets were emitted but orphaned
     (`/* empty css */`). Now each Vue component chunk imports its own extracted
     stylesheet (e.g. `base-badge.js` → `import "./base-badge.vue_..._lang.css"`),
     while inline-styled primitives (`BaseGrid`/`BaseStack`/`BaseMasonry`/
     `BaseInView`) correctly stay CSS-free. A regression test guards this.
  2. **CSS not applied.** The Vue emitter now inlines each component's SCSS as a
     **non-scoped** `<style lang="scss">` block instead of `<style scoped>`. These
     SFCs render via a `<script>` render function, and Vue only auto-applies the
     `data-v-…` scope attribute to a render function's **root** vnode — so nested
     elements (`base-separator__line`, drawer/hero/navbar internals, …) never
     received it and the scoped rules silently failed to match. The rules stay in
     the `@layer mp.components` cascade layer and rely on the components' unique
     BEM class names (exactly how the original SFCs are namespaced), so styling
     now applies to every element.

- 94f9acf: lowercase multi-word native DOM event listeners on the Vue target

  Vue derives a DOM listener's event name by hyphenating the prop key after `on` (`onDragOver` → the dead `drag-over`), so a React-style multi-word listener on a native element bound nothing and events such as `dragover`/`drop` never fired. The Vue emitter now lowercases the event portion of `on<Event>` listeners on **native** (intrinsic) elements (`onDragOver` → `onDragover`, `@dragover`) on both the render-closure and `<template>` paths, so they bind the real DOM event; listeners on **component** elements keep their camelCase form to match the child's emits.

- 94f9acf: make the `<Dynamic is>` primitive accept hyphenated attributes and slotted children

  `dynamicToHCall` now quotes non-identifier prop keys (e.g. `aria-current`,
  `data-id`) as string-literal property names so the emitted `h(tag, { … })`
  object literal is valid JS, and `jsxChildToArgument` unwraps the `{ … }`
  `JsxExpression` wrapper produced by the `<Slot>` rewrite so a `<Dynamic>` may
  carry `<Slot>` children (e.g. `<Dynamic is={tag}><Slot/></Dynamic>`). This
  unblocks `BaseNavbarItem`'s dynamic-tag rendering on both frameworks.

- edb785f: fix the Vue render-closure fallback so an effect can reference a derived declaration

  A `useEffect` is emitted into Vue `setup` (`onMounted`/`watch`), but the derived
  `const`s and functions it closes over defaulted to the per-render closure — so
  an effect that referenced one (e.g. `BaseCarousel`'s `slideCount`/`commit`)
  threw `slideCount is not defined` at runtime. The Vue emitter now finds the
  transitive set of derived declarations every effect depends on and hoists them
  into `setup` ahead of the effects: a derived **function** stays a plain `const`,
  while a derived **value** becomes a reactive `computed` (registered in the scope
  so every read — in the effect, its deps array, and the render closure — is
  rewritten to `<name>.value`).

- f70ecc8: carry external package imports into the generated Vue SFC

  The Vue emitter reconstructed a component's imports from only a fixed set of
  categories (the neutral `@mission-platform/forge` package, relative
  component/helper modules, stylesheets, and the Vue adapter), silently dropping
  every other bare-package import. A component that referenced an external value —
  e.g. `@mission-platform/forms-core`'s `DEFAULT_FIELD_TYPES` used as a prop
  default — therefore compiled to a Vue SFC that crashed at runtime with
  `ReferenceError: <name> is not defined` (e.g. the `BaseFormBuilder` Vue build).
  External (non-relative, non-neutral, non-stylesheet) imports are now carried
  through verbatim, matching the React emitter.

- 94f9acf: split the React, Vue and Storyblok emitters into per-generator folders

  Each Stage-1 emitter that previously lived in a single `src/generators/<name>.ts`
  file is now a `src/generators/<name>/` folder with an `index.ts` barrel and the
  implementation split across focused modules — `react/` (`aliases`, `imports`,
  `emit-module`), `vue/` (`shared`, `scope`, `effects`, `body`, `imports`,
  `styles`, `emit-module`), and `storyblok/` (`types`, `names`, `classify`,
  `analyze`, `wrappers`) — to make future maintenance easier. The public API and
  all generated output are unchanged.

- 94f9acf: emit native Vue `<template>` markup instead of a render function where possible

  The Vue Stage-1 emitter now rewrites a component's returned JSX/`h()` tree into real Vue `<template>` markup for the single-tree primitives: a dynamic tag becomes `<component :is="tag">`, `class`/`style`/`on<Event>`/`ref`/other dynamic attributes become the matching binding, `cond ? <a/> : <b/>` becomes `v-if`/`v-else`, `properties.children`/`<Slot>` become native `<slot>`, and each derived scalar `const` is lifted to a reactive `computed`. Components whose body falls outside that shape (node-valued local consts, `.map()` lists, prop spreads, or `MpChild`-typed props rendered as children — the complex layout components) automatically fall back to the previous `<script setup>` + `const render = () => …` + `<component :is="render" />` closure. The compiled output stays functionally identical.

- 94f9acf: emit Vue components as `<script setup>` SFCs instead of `export default defineComponent`

  The Vue Stage-1 emitter now produces a `<script setup lang="tsx">` single-file component — `defineOptions({ name, inheritAttrs: false })`, a `defineProps(…)` declaration, `useSlots()`, and the translated hooks emitted once at the top level — with the per-render JSX moved into a `const render = () => …` closure rendered from the `<template>` via `<component :is="render" />` (since `<script setup>` cannot itself return a render function). The compiled output stays functionally identical.

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

## 0.1.0

### Minor Changes

- edb785f: add a framework-neutral `classNames` helper and move component CSS Modules to the `mp.components` layer

  `@mission-platform/forge` now exports a `classNames(...values)` helper (and its
  `ClassValue` type) for assembling class names the same way on every framework
  from the string (`'a b'`), object (`{ 'class': boolean }`), and array
  (`['class']`) forms — falsy entries are dropped and duplicates de-duplicated.

  `@mission-platform/vite-plugin-forge`'s two-stage compiler now (1) preserves
  neutral framework-agnostic value imports such as `classNames` verbatim (instead
  of translating them like `h`/the hooks), and (2) carries each component's
  own relative stylesheet imports (CSS Modules and bare CSS) onto both the React
  and Vue generated source trees, so a neutral component can own and ship its own
  CSS.

  `@mission-platform/components`' co-located `.module.scss` files are now real
  CSS Modules whose rules live in the shared `@layer mp.components` cascade layer
  with no `:global`. The styled components (`BaseBadge`, `BaseButton`,
  `BaseSeparator`) own their styling via the hashed class map + `classNames`, and
  the package now ships that CSS through new `./vue.css` and `./react.css`
  exports.

- edb785f: add the platform-owned `className={…}` JSX attribute for class management

  Neutral components now drive dynamic classes with a `className={…}` attribute
  (reserving the plain `class="…"` for static strings) instead of calling the
  `classNames` helper inline — the author never imports the helper. The canonical
  value is an array holding the same arguments the helper accepts.

  `@mission-platform/vite-plugin-forge`'s two-stage compiler owns the transform: on
  React an array value collapses to a `className={classNames(…)}` string call
  (re-injecting the neutral `classNames` import), while any other value passes
  through as `className`; on Vue it maps onto the native `class` binding, which
  understands the array/object forms (no helper needed). `@mission-platform/forge`'s
  `./react` and `./vue` runtime adapters apply the same mapping at render time so
  the ad-hoc/SSR output matches the compiled output. The `classNames(...values)`
  helper is still exported for the rare precompute and `h(tag, { class: … })`
  object form.

  `@mission-platform/components` and `@mission-platform/icons` migrate
  their components' `class={…}` attributes to `className={…}` accordingly.

- edb785f: ship the `Base*` export aliases, public-type re-exports, a `./styles` entry, and a `BaseVirtualTable` `cell` slot so apps can adopt the JSX components in place of the Vue component library

  `@mission-platform/vite-plugin-forge`'s entry generator now re-exports each
  compiled component under **both** its public name (`Button`) **and** its neutral
  `Base`-prefixed name (`BaseButton`) as aliases of the same component, and
  re-exports **every public type** each component ships alongside it (variants,
  option shapes, props interfaces, scoped-slot scopes, …) from the neutral
  declarations — both in the runtime entry and its synthesised `.d.ts`.

  `@mission-platform/components` therefore exposes every component under the
  `Base*` name on its `./react` / `./vue` subpaths (alongside the bare names), and
  adds:

  - a `./styles` side-effect entry (`@mission-platform/components/styles`) — a
    global `prefers-reduced-motion` reset mirroring the Vue component library's
    global accessibility safety net.
  - a scoped `cell` slot on `BaseVirtualTable` (`{ column, row, value }`, exported
    as `VirtualTableCellScope`) for fully custom (interactive) cell content,
    falling back to each column's `render` formatter.

- edb785f: add scoped-slot (render-prop) support and migrate the self-contained Data components to write-once JSX

  `@mission-platform/forge` gains a `MpRenderProperty<Scope>` type and the neutral
  `<Slot>` element now accepts **scope props** (`<Slot name="row" item={item}
index={i} />`) so a write-once component can drive a **scoped slot**.

  `@mission-platform/vite-plugin-forge`'s two-stage compiler translates a scoped
  `<Slot>` to a Vue scoped slot (`slots.x?.(scope)`) and a React render-prop call
  (`properties.x?.(scope)`), reusing the existing named-slot path. Both emitters
  have a regression test.

  `@mission-platform/components` gains three cross-framework `Components/Data`
  components, authored once in the neutral dialect and compiled straight to both
  React and Vue:

  - `BaseVirtualList` — windowed list with a scoped `row` slot.
  - `BaseVirtualLogViewer` — virtual-scrolling log with per-level colouring, a
    substring filter + matching-count toolbar, follow-tail, and an `onSelect`
    callback (composes `BaseTypography`).
  - `BaseVirtualTreeView` — flattened virtual tree with a built-in expand/collapse
    label (overridable via the scoped `row` slot) and `onSelect`/`onToggle`
    callbacks.

  Each ships its per-component folder (`.tsx`/`.module.scss`/`.stories.tsx`/
  `.spec.ts`/`index.ts`), categorised `JSX Components/Data/<Name>` stories, and
  cross-framework SSR specs. Vue-only features the neutral dialect cannot model
  (icons, scoped **default** slots, generics) are substituted with documented
  equivalents (a `●`/`▸`/`▾` glyph, named `row` scoped slots, `unknown` items).

- edb785f: migrate the Components/Display components to write-once JSX and fix two compiler prop/name collisions

  `@mission-platform/components` gains nine cross-framework `Components/Display`
  components, authored once in the neutral JSX dialect and compiled straight to
  both React and Vue:

  - **Self-contained:** `BaseAvatar` (inline-styled image/initials/slot + presence
    dot), `BaseButtonGroup` (segmented `attached` group), `BaseIconButton`
    (icon-only button with required `label`).
  - **Composing `BaseTypography`:** `BaseTag` (toned, removable), `BaseQuote`
    (blockquote + attribution), `BaseList` (ul/ol/dl from `items`), `BaseCard`
    (header/body/footer surface), `BaseTable` (sortable, hooks-driven), and
    `BaseCollapse` (native `<details>` disclosure).

  Each ships its per-component folder (`.tsx`/`.module.scss`/`.stories.tsx`/
  `.spec.ts`/`index.ts`), categorised `JSX Components/Display/<Name>` stories, and
  cross-framework SSR specs. Vue-only features the neutral dialect cannot model
  (icons, scoped slots, provide/inject, transitions) are substituted with
  documented equivalents; `BaseAccordion`, `BaseCarousel`, and `BaseThemeToggle`
  remain Vue-only in `@mission-platform/components`.

  `@mission-platform/vite-plugin-forge`'s Vue emitter no longer rewrites JSX
  **attribute names** or **element tag names** when they collide with a
  destructured prop. Previously a `src` prop turned `src={src}` into the invalid
  `properties.src={properties.src}`, and a `caption` prop turned a `<caption>`
  element into the invalid dynamic `createVNode(properties.caption, …)`; both now
  keep the literal name and rewrite only the value. Regression tests cover both.

- edb785f: add a `hasSlot` slot-presence helper and move the component content props to named slots

  `@mission-platform/forge` now exports `hasSlot('x')` — the neutral counterpart of
  Vue's `$slots.x` / a React `properties.x != null` check (an omitted name targets
  the default slot) — so a write-once component can render an optional wrapper
  region only when a slot is filled. The runtime adapters also gain
  `resolveSlotMarkers`, which resolves a forwarded `<Slot>` marker lexically
  against the forwarding component before handing children to a child component,
  so a component can forward its own slots into a child's slots.

  `@mission-platform/vite-plugin-forge` compiles `hasSlot('x')` to each framework's
  native presence check — Vue's `v-if="$slots.x"` (template path) / `!!slots.x`
  (render-closure path, pulling in `useSlots()`) and React's `properties.x != null`
  — and consumes the `hasSlot` import (never emitting it).

  `@mission-platform/components` migrates every component that exposed `MpChild`
  content props (`BaseCard`, `BaseDialog`, `BaseModal`, `BaseDrawer`, `BaseHero`,
  `BaseAlertBanner`, `BaseToast`, `BaseChatBubble`, `BaseInput`, `BaseTextarea`,
  the date/time pickers, `BaseFormWizard`, `BaseWindowPopout`, `BaseVerticalLayout`,
  …) to author those regions as named slots (`<Slot>`), gating optional regions
  with `hasSlot`. React consumers are unaffected (named slots are props), but Vue
  consumers must now pass this content through named slots (`<template #header>`)
  rather than props.

- 13cfc7f: remap the write-once icon import to each framework build

  A neutral component that imports an icon from `@mission-platform/icons` now
  has that bare specifier rewritten to the per-framework subpath when compiled:
  `@mission-platform/icons/vue` in the Vue output and
  `@mission-platform/icons/react` in the React output. The Vue path handles it
  in `readExternalImports` (which now takes the target framework) and the React
  emitter rewrites it in its own import pass, mirroring the existing
  `Teleport`/`Transition` neutral-to-framework remap. The `<IconX />` usages are
  left intact as native component tags.

- edb785f: ship per-component CSS + strongly tree-shakeable output, and add a framework-neutral named-`Slot` primitive

  `@mission-platform/components` now compiles to **per-component** JS **and**
  CSS chunks instead of one bundled `vue.js` / `react.js` + one combined
  `vue.css` / `react.css`. Each framework is emitted into its own
  `dist/<framework>/` subtree (`preserveModules` + `cssCodeSplit`), every
  component is its own ESM chunk that imports its own stylesheet, and the entries
  are thin re-export barrels — so a consumer importing a single component pulls in
  only that component's JS + CSS and tree-shakes the rest of the library (styles
  included). **Breaking:** the `./vue.css` and `./react.css` subpath exports are
  removed (component CSS now loads automatically with the component), and the
  `./vue` / `./react` exports resolve to `dist/<framework>/index.js`.

  `@mission-platform/vite-plugin-forge` gains `jsxComponentsCssImportPlugin`, which
  re-links each component's extracted CSS to its JS chunk (Vite library builds
  emit per-chunk CSS but do not inject the import), and its two-stage compiler now
  translates the new named-slot marker.

  `@mission-platform/forge` adds a framework-neutral named-slot primitive `Slot`
  (`<Slot name="…" />`, with the nameless `<Slot />` for the default slot, scoped
  slots, and fallback children). The runtime adapters resolve slots against a
  per-component scope, and the build-time compiler rewrites `<Slot name="x" />` to
  Vue's `slots.x?.()` and React's `properties.x`.

- edb785f: migrate the remaining layout components and emit scoped SCSS for the Vue build

  `@mission-platform/components` completes the `Components/Layout` migration:
  `BaseTypography`, `BaseHero`, `BaseDrawer`, `BaseNavbar`, `BaseVerticalLayout`,
  and `BaseWindowPopout` are now authored once in the neutral JSX dialect and
  compiled straight to both React and Vue. Cross-framework events use the
  **callback-prop** convention (`onOpenChange` / `onClose` / `onStartOpenChange` /
  …). Behaviours the neutral dialect does not model are substituted with documented
  equivalents: `BaseDrawer` renders an in-place `position: fixed` overlay (or a
  reactive `matchMedia`-driven `inline` panel) instead of a `<Teleport>` +
  `<Transition>`; `BaseWindowPopout` opens a real second window via `window.open`
  and shows a cloned-HTML snapshot instead of a portal; would-be slots become
  `MpChild` props; `BaseTypography` drops the `@floating-ui` truncate-popup. Each
  ships its own per-component `@layer mp.components` CSS, with co-located stories
  (`JSX Components/<Category>/…`) and cross-framework SSR specs.

  `@mission-platform/vite-plugin-forge`'s two-stage compiler now scopes styling per
  framework: the **React** build keeps the hashed **CSS Module**, while the **Vue**
  build inlines each component's `*.module.scss` as a scoped
  `<style scoped lang="scss">` block in the generated SFC (preserving the
  `@layer mp.components` wrapper) and rewrites every `styles['x']` /
  `styles[`x`]` read — including computed object keys — to its literal class name,
  so `classNames(...)` produces plain, `data-v-`-scoped classes.

  `@mission-platform/forge`'s `Slot` marker is a (never-invoked) function component
  so `<Slot name="…" />` type-checks under the classic `h` factory.

- edb785f: add a framework-neutral `Teleport`/portal primitive and migrate the popup overlays with CSS anchor positioning

  - `@mission-platform/forge`: add the neutral `<Teleport to="…">` portal element (`MpTeleportProperties`) — a compile-time/adapter marker like `Slot`. The runtime adapters render its children in place (SSR parity), and `@mission-platform/forge/react` now also exports a real `createPortal`-backed `Teleport` component (SSR-safe; resolves its target after mount).
  - `@mission-platform/vite-plugin-forge`: remap the neutral `Teleport` import per framework — Vue resolves it from the `vue` runtime (built-in `<Teleport>`) and React imports it from `@mission-platform/forge/react` (the `createPortal` wrapper) — while leaving the `<Teleport>` JSX usage intact.
  - `@mission-platform/components`: migrate the `Components/Overlays` popups `BaseTooltip`, `BasePopover`, and `BaseDropdown` from `@mission-platform/components` to the write-once neutral package. Each teleports its panel to `document.body` and positions it with the CSS Anchor Positioning API (`anchor-name`/`position-anchor`/`position-area` + `position-try-fallbacks` + `@position-try`, plus `anchor-size(width)` for the dropdown's trigger-width match) instead of `@floating-ui`; `<Transition>` is dropped. The popover's and dropdown's compound (`-start`/`-end`) placements use **fully-logical** `position-area` values (e.g. `block-end span-inline-end`) — mixing a physical side keyword with a logical span (`bottom span-inline-end`) is an invalid value that browsers silently drop, which would leave the teleported panel un-anchored at its static position. The modal overlays (`BaseDialog`/`BaseModal`) remain Vue-only.

- edb785f: migrate the Components/Theme group to the write-once components library

  `@mission-platform/components` now ships the complete `Components/Theme`
  group — `BaseThemeToggle`, `BaseThemeProvider`, and `BaseThemeComposer` —
  authored once in the neutral JSX dialect and compiled to both React and Vue.
  Because the neutral dialect has no `provide`/`inject` context primitive,
  cross-component theme state is shared through a framework-agnostic observable
  singleton store (`theme-store.ts`), and the composer is a controlled component
  (`modelValue`/`onUpdateModelValue` in place of `v-model`).

  `@mission-platform/vite-plugin-forge` gains **shared helper module** support: a
  neutral component can import a sibling plain `.ts`/`.tsx` helper (e.g. the theme
  store); the two-stage compiler now distinguishes such helpers from sibling
  components (so the Vue emitter keeps a named `./x` import instead of `./x.vue`)
  and copies each referenced helper into both generated framework trees.

- 18bd49a: extract the common layouts into a new `@mission-platform/layouts` package

  Adds the write-once `@mission-platform/layouts` package containing the common
  layout primitives — `BaseApplicationLayout` (public `ApplicationLayout`) and
  `BaseVerticalLayout` (public `VerticalLayout`) — authored once in the neutral
  `@mission-platform/forge` dialect and compiled straight to both Vue 3 (`./vue`)
  and React (`./react`) by the two-stage `@mission-platform/vite-plugin-forge`
  compiler, with co-located `JSX Components/Layout/<Name>` stories and
  cross-framework SSR specs.

  **BREAKING (`@mission-platform/components`):** `BaseApplicationLayout` /
  `ApplicationLayout` and `BaseVerticalLayout` / `VerticalLayout` are no longer
  exported from `@mission-platform/components` — import them from
  `@mission-platform/layouts/vue` (or `/react`) instead. `@mission-platform/components`
  gains a neutral `.` root export and a neutral `./base-drawer` subpath so the
  write-once layouts can reuse `BaseDrawer` across packages.

  `@mission-platform/vite-plugin-forge`'s two-stage compiler now remaps neutral
  imports of the framework-split component libraries (`@mission-platform/components`
  and `@mission-platform/layouts`, in addition to `@mission-platform/icons`) — from
  their root or a neutral subpath — to the matching built `./react` / `./vue`
  entry, so write-once components can compose components published by another
  package.

- edb785f: forward non-component helper re-exports through the generated entry

  The two-stage compiler now also forwards a barrel's **helper-module**
  re-exports (e.g. `export { useToast, … } from './toast-store'`) through the
  generated `./react` / `./vue` entry (and its synthesised `.d.ts`), re-pointing
  them at the helper file copied into the flat per-framework tree. This lets a
  write-once package expose shared framework-agnostic APIs (such as the
  `@mission-platform/components` toast store) alongside its components, so each
  framework's consumers drive the same per-framework singleton the components use.
  A new `discoverHelperExports` helper distinguishes these from component exports
  (component re-exports are unaffected).

- 94f9acf: support neutral hooks and generate the per-framework entry modules

  The plugin now also handles the framework-neutral React-style hooks
  (`useState`/`useRef`/`useEffect`/`useMemo`/`useCallback`) when compiling a
  component, and **generates** the per-framework entry module for a neutral
  components package (`generateFrameworkSources` + `jsxComponentsEntryDtsPlugin`),
  so consumers no longer hand-author `react.ts` / `vue.ts` — the entry is produced
  from the components barrel and its `<framework>.d.ts` is synthesised.

- 94f9acf: compile named-slot passing into child components

  A write-once component can now pass content into a child component's named slot
  by marking a child with `slot="name"`. The compiler routes it to each
  framework's native mechanism: the React emitter turns `<Child><x slot="name"/></Child>`
  into a `name={<x/>}` prop; the Vue template path emits a `<template #name>`
  block (with the default-slot children in `<template #default>`); and the Vue
  render-closure path emits the `@vitejs/plugin-vue-jsx` `{{ name: () => … }}`
  object-children form (composed before the reference rewriter, so setters and
  state reads inside the slot functions are still translated to Vue reactivity).
  The `slot` marker is always stripped from the generated output.

- 94f9acf: add a Storyblok target that emits blok configurations and framework blok wrappers

  Alongside the React and Vue source generators, the plugin now projects the same
  neutral `@mission-platform/forge` components onto Storyblok via the new
  `generateStoryblokBloks`. For every component it derives, from the props
  contract, a Storyblok component object — string-literal unions (incl. local
  `type` aliases) become `option` fields, `boolean`/`number`/`string` map to the
  matching primitive field, `string | number` degrades to `text`, callbacks are
  dropped, and the default slot / `MpChild` props become nestable `bloks` fields,
  with JSDoc as the field `description` and `?? <literal>` / destructuring defaults
  as `default_value` — plus a thin React `.tsx` / Vue `.vue` blok wrapper that
  binds `blok.<field>` onto the built component, tags it editable
  (`storyblokEditable` / `v-editable`), and renders `bloks` fields through
  `StoryblokComponent`. It writes per-component `<name>.json`, the aggregate
  `components.json`, the wrapper sources, and a wrapper entry barrel.

  The per-framework emitters move from `src/compiler/` into a dedicated
  `src/generators/` directory (`react.ts`, `vue.ts`, `storyblok.ts`), with the
  shared parsing/discovery helpers remaining in `src/compiler/`.

- 94f9acf: compile the new neutral structural primitives to native code: remap the `Transition` import (Vue built-in / React CSS-class driver), rewrite `<Dynamic is={X}>` to `h(X, …)` (React `createElement` / Vue `<component :is>`), map `createContext`/`useContext` to each framework's provide/inject (React-native / Vue `@mission-platform/forge/vue`, keeping `useContext` a synchronous setup const), and resolve recursive self-referencing components via `defineOptions({ name })` + `resolveComponent`
- 94f9acf: remap the neutral `TransitionGroup` import like `Transition`/`Teleport` — Vue resolves the built-in `<TransitionGroup>` from `vue` and React imports the `@mission-platform/forge/react` group driver, while the `<TransitionGroup>` JSX usage is left intact on both targets
- edb785f: rework the plugin into a two-stage source-to-source compiler

  `@mission-platform/vite-plugin-forge` no longer ships a per-framework runtime that
  neutral imports are rewritten to. Instead it is a **two-stage compiler**:

  - **Stage 1 (source-to-source)** — `generateFrameworkSources` parses each neutral
    `.tsx` with the TypeScript compiler API and emits a per-framework source tree:
    a React `.tsx` module (`class` → `className`, `h` → `React.createElement`,
    hooks kept as React's own) or a real Vue `.vue` SFC (`<script lang="tsx">`
    `defineComponent`/`setup`, with the React-style hooks translated to Vue
    reactivity/lifecycle — `useState` → `ref`, `useRef` → `ref`, `useMemo` →
    `computed`, `useEffect` → `onMounted` + `watch(deps)` + cleanup — derived work
    and the returned JSX moved into the render closure, `children` → default slot,
    and prop defaults lifted into the runtime `props` declaration).
  - **Stage 2 (native compile)** — the generated tree is compiled by the framework's
    own toolchain: the classic-`h` React JSX transform (`reactJsxPlugin`) or
    `@vitejs/plugin-vue` (+ `@vitejs/plugin-vue-jsx`).

  This keeps each framework's runtime performance native (no neutral-tree walk, no
  React-hooks-on-Vue shim) and makes new target frameworks a matter of adding
  another emitter. `@mission-platform/components` now builds through this
  pipeline (its Vue build compiles generated `.vue` SFCs via `@vitejs/plugin-vue-jsx`).

  BREAKING CHANGE: the `./react` and `./vue` runtime subpath exports, the
  `jsxPlugin` / `vueJsxPlugin` factories, the runtime `defineVueBoundary`, and
  `writeJsxComponentsEntry` are removed. Use `generateFrameworkSources` (Stage 1),
  `reactJsxPlugin` (React Stage 2), `@vitejs/plugin-vue(-jsx)` (Vue Stage 2), and
  `jsxComponentsEntryDtsPlugin` instead.

- edb785f: type the Storyblok blok wrapper's `blok` prop precisely

  The Storyblok target now derives a precise interface for each wrapper's `blok`
  prop instead of the open `SbBlokData & Record<string, unknown>`. A new
  `emitBlokDataType` builds `SbBlokData & { … }` from the component's analysed
  schema — one member per field (`option` → string-literal union, `text` →
  `string`, `number`, `boolean`, `bloks` → `SbBlokData[]`; non-optional props stay
  required, a field-less component degrades to bare `SbBlokData`) — and it is used
  in the generated Vue `defineProps`, the React `<Name>BlokProperties` interface,
  and the synthesised wrapper-entry `index.d.ts`. `@mission-platform/components`
  now ships that typed `index.d.ts` for its `./storyblok/{react,vue}` subpaths.

- edb785f: add vite plugin that compiles the neutral jsx components to react/vue at build time

  Introduces the `@mission-platform/vite-plugin-forge` workspace, which compiles the
  framework-neutral `@mission-platform/forge` components to React or Vue 3 at build
  time instead of wrapping them with the runtime `toReactComponent` /
  `toVueComponent` adapters.

  `@mission-platform/components` produces its `./react` and `./vue` subpaths by
  running one `vite build` per framework through this plugin, rather than the
  runtime adapters.

### Patch Changes

- 38416d9: map classNames attribute to native class in vue compiler
- edb785f: forward consumer fall-through attributes onto the generated Vue component root

  The Vue emitter stamps every generated SFC with `defineOptions({ inheritAttrs:
false })` (so multi-root / render-closure components don't warn), but it never
  re-enabled attribute inheritance — so consumer-supplied fall-through attributes
  (`class`/`style`/`id`/`data-*`/listeners) were silently dropped, unlike the
  hand-authored `.vue` SFCs they replaced. This regressed components relied on the
  fall-through, e.g. the Monaco editor lost its consumer `class` (and therefore
  its `flex: 1` / border overrides) when wrapped by an app.

  The two-stage compiler now opts the root back in explicitly: a single root
  element in the `<template>` path is emitted with a trailing `v-bind="$attrs"`
  (placed last to mirror Vue's default-inheritance precedence; `class`/`style`
  still merge), and the render-closure fallback forwards `$attrs` onto its
  `<component :is="render">` host. `@mission-platform/components` and
  `@mission-platform/icons` pick this up when their `./vue` subpaths are rebuilt.

- 94f9acf: fix a Vue compile bug where a derived local read by a hook initialiser was left out of `setup`

  When a neutral component declared a derived `const` and then read it from a hook
  initialiser — e.g. `const initial = parseTime(modelValue); const [h] = useState(initial.h)` —
  the Vue emitter only hoisted derived declarations that a `useEffect` closed over.
  Because `useState`/`useRef`/`useMemo`/`useCallback`/`useContext` initialisers are
  also emitted in `setup`, the derived `const` stayed in the per-render closure and
  resolved to an undefined name at runtime (`ReferenceError: initial is not defined`).

  The hoist analysis now also seeds from hook-declaration initialisers, so a derived
  value read by a hook is lifted into `setup` (as a `computed`) ahead of the hook
  that consumes it.

- 94f9acf: fix slot translation for the `h(Slot, …)` call form and kebab slot names

  The two-stage compiler's reference rewriters now translate the **call form** of
  the named-slot marker — `h(Slot, { name: 'x' }, …fallback)` — exactly like the
  `<Slot name="x" />` JSX element, on both the Vue (`createReferenceRewriter`
  render-closure) and React paths. Previously only the JSX element form was
  handled, so a component that composed slots with `h(Slot, …)` (e.g. inside an
  intermediate `const column = … ? h(Drawer, …, h(Slot, { name: 'start' })) : …`
  that forces the `<script setup>` render-closure fallback) emitted an undefined
  `Slot` reference and threw `ReferenceError: Slot is not defined` at render.

  Slot/`hasSlot` reads for **non-identifier (kebab-case) slot names** now use
  bracket access (`slots["start-header"]` / `properties["start-header"]`) instead
  of dot access, which JavaScript mis-parsed as a subtraction
  (`slots.start-header` → `slots.start - header`). The Vue emitter also now wires
  up `useSlots()` when a body references slots via bracket access.

- edb785f: fix the Vue build so each component's styles load and apply (stories were unstyled)

  Two issues kept the `@mission-platform/components/vue` components (consumed
  by Storybook) unstyled, now both fixed so the components are a like-for-like
  visual match with the original `@mission-platform/components` SFCs:

  1. **CSS not loaded.** `jsxComponentsCssImportPlugin` now runs with
     `enforce: 'post'`, so its `generateBundle` hook executes **after** Vite has
     populated each chunk's `viteMetadata.importedCss`. Previously it ran first,
     found the metadata empty, and never re-linked the per-component CSS — under
     `preserveModules` the Vue style assets were emitted but orphaned
     (`/* empty css */`). Now each Vue component chunk imports its own extracted
     stylesheet (e.g. `base-badge.js` → `import "./base-badge.vue_..._lang.css"`),
     while inline-styled primitives (`BaseGrid`/`BaseStack`/`BaseMasonry`/
     `BaseInView`) correctly stay CSS-free. A regression test guards this.
  2. **CSS not applied.** The Vue emitter now inlines each component's SCSS as a
     **non-scoped** `<style lang="scss">` block instead of `<style scoped>`. These
     SFCs render via a `<script>` render function, and Vue only auto-applies the
     `data-v-…` scope attribute to a render function's **root** vnode — so nested
     elements (`base-separator__line`, drawer/hero/navbar internals, …) never
     received it and the scoped rules silently failed to match. The rules stay in
     the `@layer mp.components` cascade layer and rely on the components' unique
     BEM class names (exactly how the original SFCs are namespaced), so styling
     now applies to every element.

- 94f9acf: lowercase multi-word native DOM event listeners on the Vue target

  Vue derives a DOM listener's event name by hyphenating the prop key after `on` (`onDragOver` → the dead `drag-over`), so a React-style multi-word listener on a native element bound nothing and events such as `dragover`/`drop` never fired. The Vue emitter now lowercases the event portion of `on<Event>` listeners on **native** (intrinsic) elements (`onDragOver` → `onDragover`, `@dragover`) on both the render-closure and `<template>` paths, so they bind the real DOM event; listeners on **component** elements keep their camelCase form to match the child's emits.

- 94f9acf: make the `<Dynamic is>` primitive accept hyphenated attributes and slotted children

  `dynamicToHCall` now quotes non-identifier prop keys (e.g. `aria-current`,
  `data-id`) as string-literal property names so the emitted `h(tag, { … })`
  object literal is valid JS, and `jsxChildToArgument` unwraps the `{ … }`
  `JsxExpression` wrapper produced by the `<Slot>` rewrite so a `<Dynamic>` may
  carry `<Slot>` children (e.g. `<Dynamic is={tag}><Slot/></Dynamic>`). This
  unblocks `BaseNavbarItem`'s dynamic-tag rendering on both frameworks.

- edb785f: fix the Vue render-closure fallback so an effect can reference a derived declaration

  A `useEffect` is emitted into Vue `setup` (`onMounted`/`watch`), but the derived
  `const`s and functions it closes over defaulted to the per-render closure — so
  an effect that referenced one (e.g. `BaseCarousel`'s `slideCount`/`commit`)
  threw `slideCount is not defined` at runtime. The Vue emitter now finds the
  transitive set of derived declarations every effect depends on and hoists them
  into `setup` ahead of the effects: a derived **function** stays a plain `const`,
  while a derived **value** becomes a reactive `computed` (registered in the scope
  so every read — in the effect, its deps array, and the render closure — is
  rewritten to `<name>.value`).

- f70ecc8: carry external package imports into the generated Vue SFC

  The Vue emitter reconstructed a component's imports from only a fixed set of
  categories (the neutral `@mission-platform/forge` package, relative
  component/helper modules, stylesheets, and the Vue adapter), silently dropping
  every other bare-package import. A component that referenced an external value —
  e.g. `@mission-platform/forms-core`'s `DEFAULT_FIELD_TYPES` used as a prop
  default — therefore compiled to a Vue SFC that crashed at runtime with
  `ReferenceError: <name> is not defined` (e.g. the `BaseFormBuilder` Vue build).
  External (non-relative, non-neutral, non-stylesheet) imports are now carried
  through verbatim, matching the React emitter.

- 94f9acf: split the React, Vue and Storyblok emitters into per-generator folders

  Each Stage-1 emitter that previously lived in a single `src/generators/<name>.ts`
  file is now a `src/generators/<name>/` folder with an `index.ts` barrel and the
  implementation split across focused modules — `react/` (`aliases`, `imports`,
  `emit-module`), `vue/` (`shared`, `scope`, `effects`, `body`, `imports`,
  `styles`, `emit-module`), and `storyblok/` (`types`, `names`, `classify`,
  `analyze`, `wrappers`) — to make future maintenance easier. The public API and
  all generated output are unchanged.

- 94f9acf: emit native Vue `<template>` markup instead of a render function where possible

  The Vue Stage-1 emitter now rewrites a component's returned JSX/`h()` tree into real Vue `<template>` markup for the single-tree primitives: a dynamic tag becomes `<component :is="tag">`, `class`/`style`/`on<Event>`/`ref`/other dynamic attributes become the matching binding, `cond ? <a/> : <b/>` becomes `v-if`/`v-else`, `properties.children`/`<Slot>` become native `<slot>`, and each derived scalar `const` is lifted to a reactive `computed`. Components whose body falls outside that shape (node-valued local consts, `.map()` lists, prop spreads, or `MpChild`-typed props rendered as children — the complex layout components) automatically fall back to the previous `<script setup>` + `const render = () => …` + `<component :is="render" />` closure. The compiled output stays functionally identical.

- 94f9acf: emit Vue components as `<script setup>` SFCs instead of `export default defineComponent`

  The Vue Stage-1 emitter now produces a `<script setup lang="tsx">` single-file component — `defineOptions({ name, inheritAttrs: false })`, a `defineProps(…)` declaration, `useSlots()`, and the translated hooks emitted once at the top level — with the per-render JSX moved into a `const render = () => …` closure rendered from the `<template>` via `<component :is="render" />` (since `<script setup>` cannot itself return a render function). The compiled output stays functionally identical.

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

## 0.1.0

### Minor Changes

- edb785f: add a framework-neutral `classNames` helper and move component CSS Modules to the `mp.components` layer

  `@mission-platform/forge` now exports a `classNames(...values)` helper (and its
  `ClassValue` type) for assembling class names the same way on every framework
  from the string (`'a b'`), object (`{ 'class': boolean }`), and array
  (`['class']`) forms — falsy entries are dropped and duplicates de-duplicated.

  `@mission-platform/vite-plugin-forge`'s two-stage compiler now (1) preserves
  neutral framework-agnostic value imports such as `classNames` verbatim (instead
  of translating them like `h`/the hooks), and (2) carries each component's
  own relative stylesheet imports (CSS Modules and bare CSS) onto both the React
  and Vue generated source trees, so a neutral component can own and ship its own
  CSS.

  `@mission-platform/components`' co-located `.module.scss` files are now real
  CSS Modules whose rules live in the shared `@layer mp.components` cascade layer
  with no `:global`. The styled components (`BaseBadge`, `BaseButton`,
  `BaseSeparator`) own their styling via the hashed class map + `classNames`, and
  the package now ships that CSS through new `./vue.css` and `./react.css`
  exports.

- edb785f: add the platform-owned `className={…}` JSX attribute for class management

  Neutral components now drive dynamic classes with a `className={…}` attribute
  (reserving the plain `class="…"` for static strings) instead of calling the
  `classNames` helper inline — the author never imports the helper. The canonical
  value is an array holding the same arguments the helper accepts.

  `@mission-platform/vite-plugin-forge`'s two-stage compiler owns the transform: on
  React an array value collapses to a `className={classNames(…)}` string call
  (re-injecting the neutral `classNames` import), while any other value passes
  through as `className`; on Vue it maps onto the native `class` binding, which
  understands the array/object forms (no helper needed). `@mission-platform/forge`'s
  `./react` and `./vue` runtime adapters apply the same mapping at render time so
  the ad-hoc/SSR output matches the compiled output. The `classNames(...values)`
  helper is still exported for the rare precompute and `h(tag, { class: … })`
  object form.

  `@mission-platform/components` and `@mission-platform/icons` migrate
  their components' `class={…}` attributes to `className={…}` accordingly.

- edb785f: ship the `Base*` export aliases, public-type re-exports, a `./styles` entry, and a `BaseVirtualTable` `cell` slot so apps can adopt the JSX components in place of the Vue component library

  `@mission-platform/vite-plugin-forge`'s entry generator now re-exports each
  compiled component under **both** its public name (`Button`) **and** its neutral
  `Base`-prefixed name (`BaseButton`) as aliases of the same component, and
  re-exports **every public type** each component ships alongside it (variants,
  option shapes, props interfaces, scoped-slot scopes, …) from the neutral
  declarations — both in the runtime entry and its synthesised `.d.ts`.

  `@mission-platform/components` therefore exposes every component under the
  `Base*` name on its `./react` / `./vue` subpaths (alongside the bare names), and
  adds:

  - a `./styles` side-effect entry (`@mission-platform/components/styles`) — a
    global `prefers-reduced-motion` reset mirroring the Vue component library's
    global accessibility safety net.
  - a scoped `cell` slot on `BaseVirtualTable` (`{ column, row, value }`, exported
    as `VirtualTableCellScope`) for fully custom (interactive) cell content,
    falling back to each column's `render` formatter.

- edb785f: add scoped-slot (render-prop) support and migrate the self-contained Data components to write-once JSX

  `@mission-platform/forge` gains a `MpRenderProperty<Scope>` type and the neutral
  `<Slot>` element now accepts **scope props** (`<Slot name="row" item={item}
index={i} />`) so a write-once component can drive a **scoped slot**.

  `@mission-platform/vite-plugin-forge`'s two-stage compiler translates a scoped
  `<Slot>` to a Vue scoped slot (`slots.x?.(scope)`) and a React render-prop call
  (`properties.x?.(scope)`), reusing the existing named-slot path. Both emitters
  have a regression test.

  `@mission-platform/components` gains three cross-framework `Components/Data`
  components, authored once in the neutral dialect and compiled straight to both
  React and Vue:

  - `BaseVirtualList` — windowed list with a scoped `row` slot.
  - `BaseVirtualLogViewer` — virtual-scrolling log with per-level colouring, a
    substring filter + matching-count toolbar, follow-tail, and an `onSelect`
    callback (composes `BaseTypography`).
  - `BaseVirtualTreeView` — flattened virtual tree with a built-in expand/collapse
    label (overridable via the scoped `row` slot) and `onSelect`/`onToggle`
    callbacks.

  Each ships its per-component folder (`.tsx`/`.module.scss`/`.stories.tsx`/
  `.spec.ts`/`index.ts`), categorised `JSX Components/Data/<Name>` stories, and
  cross-framework SSR specs. Vue-only features the neutral dialect cannot model
  (icons, scoped **default** slots, generics) are substituted with documented
  equivalents (a `●`/`▸`/`▾` glyph, named `row` scoped slots, `unknown` items).

- edb785f: migrate the Components/Display components to write-once JSX and fix two compiler prop/name collisions

  `@mission-platform/components` gains nine cross-framework `Components/Display`
  components, authored once in the neutral JSX dialect and compiled straight to
  both React and Vue:

  - **Self-contained:** `BaseAvatar` (inline-styled image/initials/slot + presence
    dot), `BaseButtonGroup` (segmented `attached` group), `BaseIconButton`
    (icon-only button with required `label`).
  - **Composing `BaseTypography`:** `BaseTag` (toned, removable), `BaseQuote`
    (blockquote + attribution), `BaseList` (ul/ol/dl from `items`), `BaseCard`
    (header/body/footer surface), `BaseTable` (sortable, hooks-driven), and
    `BaseCollapse` (native `<details>` disclosure).

  Each ships its per-component folder (`.tsx`/`.module.scss`/`.stories.tsx`/
  `.spec.ts`/`index.ts`), categorised `JSX Components/Display/<Name>` stories, and
  cross-framework SSR specs. Vue-only features the neutral dialect cannot model
  (icons, scoped slots, provide/inject, transitions) are substituted with
  documented equivalents; `BaseAccordion`, `BaseCarousel`, and `BaseThemeToggle`
  remain Vue-only in `@mission-platform/components`.

  `@mission-platform/vite-plugin-forge`'s Vue emitter no longer rewrites JSX
  **attribute names** or **element tag names** when they collide with a
  destructured prop. Previously a `src` prop turned `src={src}` into the invalid
  `properties.src={properties.src}`, and a `caption` prop turned a `<caption>`
  element into the invalid dynamic `createVNode(properties.caption, …)`; both now
  keep the literal name and rewrite only the value. Regression tests cover both.

- edb785f: add a `hasSlot` slot-presence helper and move the component content props to named slots

  `@mission-platform/forge` now exports `hasSlot('x')` — the neutral counterpart of
  Vue's `$slots.x` / a React `properties.x != null` check (an omitted name targets
  the default slot) — so a write-once component can render an optional wrapper
  region only when a slot is filled. The runtime adapters also gain
  `resolveSlotMarkers`, which resolves a forwarded `<Slot>` marker lexically
  against the forwarding component before handing children to a child component,
  so a component can forward its own slots into a child's slots.

  `@mission-platform/vite-plugin-forge` compiles `hasSlot('x')` to each framework's
  native presence check — Vue's `v-if="$slots.x"` (template path) / `!!slots.x`
  (render-closure path, pulling in `useSlots()`) and React's `properties.x != null`
  — and consumes the `hasSlot` import (never emitting it).

  `@mission-platform/components` migrates every component that exposed `MpChild`
  content props (`BaseCard`, `BaseDialog`, `BaseModal`, `BaseDrawer`, `BaseHero`,
  `BaseAlertBanner`, `BaseToast`, `BaseChatBubble`, `BaseInput`, `BaseTextarea`,
  the date/time pickers, `BaseFormWizard`, `BaseWindowPopout`, `BaseVerticalLayout`,
  …) to author those regions as named slots (`<Slot>`), gating optional regions
  with `hasSlot`. React consumers are unaffected (named slots are props), but Vue
  consumers must now pass this content through named slots (`<template #header>`)
  rather than props.

- 13cfc7f: remap the write-once icon import to each framework build

  A neutral component that imports an icon from `@mission-platform/icons` now
  has that bare specifier rewritten to the per-framework subpath when compiled:
  `@mission-platform/icons/vue` in the Vue output and
  `@mission-platform/icons/react` in the React output. The Vue path handles it
  in `readExternalImports` (which now takes the target framework) and the React
  emitter rewrites it in its own import pass, mirroring the existing
  `Teleport`/`Transition` neutral-to-framework remap. The `<IconX />` usages are
  left intact as native component tags.

- edb785f: ship per-component CSS + strongly tree-shakeable output, and add a framework-neutral named-`Slot` primitive

  `@mission-platform/components` now compiles to **per-component** JS **and**
  CSS chunks instead of one bundled `vue.js` / `react.js` + one combined
  `vue.css` / `react.css`. Each framework is emitted into its own
  `dist/<framework>/` subtree (`preserveModules` + `cssCodeSplit`), every
  component is its own ESM chunk that imports its own stylesheet, and the entries
  are thin re-export barrels — so a consumer importing a single component pulls in
  only that component's JS + CSS and tree-shakes the rest of the library (styles
  included). **Breaking:** the `./vue.css` and `./react.css` subpath exports are
  removed (component CSS now loads automatically with the component), and the
  `./vue` / `./react` exports resolve to `dist/<framework>/index.js`.

  `@mission-platform/vite-plugin-forge` gains `jsxComponentsCssImportPlugin`, which
  re-links each component's extracted CSS to its JS chunk (Vite library builds
  emit per-chunk CSS but do not inject the import), and its two-stage compiler now
  translates the new named-slot marker.

  `@mission-platform/forge` adds a framework-neutral named-slot primitive `Slot`
  (`<Slot name="…" />`, with the nameless `<Slot />` for the default slot, scoped
  slots, and fallback children). The runtime adapters resolve slots against a
  per-component scope, and the build-time compiler rewrites `<Slot name="x" />` to
  Vue's `slots.x?.()` and React's `properties.x`.

- edb785f: migrate the remaining layout components and emit scoped SCSS for the Vue build

  `@mission-platform/components` completes the `Components/Layout` migration:
  `BaseTypography`, `BaseHero`, `BaseDrawer`, `BaseNavbar`, `BaseVerticalLayout`,
  and `BaseWindowPopout` are now authored once in the neutral JSX dialect and
  compiled straight to both React and Vue. Cross-framework events use the
  **callback-prop** convention (`onOpenChange` / `onClose` / `onStartOpenChange` /
  …). Behaviours the neutral dialect does not model are substituted with documented
  equivalents: `BaseDrawer` renders an in-place `position: fixed` overlay (or a
  reactive `matchMedia`-driven `inline` panel) instead of a `<Teleport>` +
  `<Transition>`; `BaseWindowPopout` opens a real second window via `window.open`
  and shows a cloned-HTML snapshot instead of a portal; would-be slots become
  `MpChild` props; `BaseTypography` drops the `@floating-ui` truncate-popup. Each
  ships its own per-component `@layer mp.components` CSS, with co-located stories
  (`JSX Components/<Category>/…`) and cross-framework SSR specs.

  `@mission-platform/vite-plugin-forge`'s two-stage compiler now scopes styling per
  framework: the **React** build keeps the hashed **CSS Module**, while the **Vue**
  build inlines each component's `*.module.scss` as a scoped
  `<style scoped lang="scss">` block in the generated SFC (preserving the
  `@layer mp.components` wrapper) and rewrites every `styles['x']` /
  `styles[`x`]` read — including computed object keys — to its literal class name,
  so `classNames(...)` produces plain, `data-v-`-scoped classes.

  `@mission-platform/forge`'s `Slot` marker is a (never-invoked) function component
  so `<Slot name="…" />` type-checks under the classic `h` factory.

- edb785f: add a framework-neutral `Teleport`/portal primitive and migrate the popup overlays with CSS anchor positioning

  - `@mission-platform/forge`: add the neutral `<Teleport to="…">` portal element (`MpTeleportProperties`) — a compile-time/adapter marker like `Slot`. The runtime adapters render its children in place (SSR parity), and `@mission-platform/forge/react` now also exports a real `createPortal`-backed `Teleport` component (SSR-safe; resolves its target after mount).
  - `@mission-platform/vite-plugin-forge`: remap the neutral `Teleport` import per framework — Vue resolves it from the `vue` runtime (built-in `<Teleport>`) and React imports it from `@mission-platform/forge/react` (the `createPortal` wrapper) — while leaving the `<Teleport>` JSX usage intact.
  - `@mission-platform/components`: migrate the `Components/Overlays` popups `BaseTooltip`, `BasePopover`, and `BaseDropdown` from `@mission-platform/components` to the write-once neutral package. Each teleports its panel to `document.body` and positions it with the CSS Anchor Positioning API (`anchor-name`/`position-anchor`/`position-area` + `position-try-fallbacks` + `@position-try`, plus `anchor-size(width)` for the dropdown's trigger-width match) instead of `@floating-ui`; `<Transition>` is dropped. The popover's and dropdown's compound (`-start`/`-end`) placements use **fully-logical** `position-area` values (e.g. `block-end span-inline-end`) — mixing a physical side keyword with a logical span (`bottom span-inline-end`) is an invalid value that browsers silently drop, which would leave the teleported panel un-anchored at its static position. The modal overlays (`BaseDialog`/`BaseModal`) remain Vue-only.

- edb785f: migrate the Components/Theme group to the write-once components library

  `@mission-platform/components` now ships the complete `Components/Theme`
  group — `BaseThemeToggle`, `BaseThemeProvider`, and `BaseThemeComposer` —
  authored once in the neutral JSX dialect and compiled to both React and Vue.
  Because the neutral dialect has no `provide`/`inject` context primitive,
  cross-component theme state is shared through a framework-agnostic observable
  singleton store (`theme-store.ts`), and the composer is a controlled component
  (`modelValue`/`onUpdateModelValue` in place of `v-model`).

  `@mission-platform/vite-plugin-forge` gains **shared helper module** support: a
  neutral component can import a sibling plain `.ts`/`.tsx` helper (e.g. the theme
  store); the two-stage compiler now distinguishes such helpers from sibling
  components (so the Vue emitter keeps a named `./x` import instead of `./x.vue`)
  and copies each referenced helper into both generated framework trees.

- 18bd49a: extract the common layouts into a new `@mission-platform/layouts` package

  Adds the write-once `@mission-platform/layouts` package containing the common
  layout primitives — `BaseApplicationLayout` (public `ApplicationLayout`) and
  `BaseVerticalLayout` (public `VerticalLayout`) — authored once in the neutral
  `@mission-platform/forge` dialect and compiled straight to both Vue 3 (`./vue`)
  and React (`./react`) by the two-stage `@mission-platform/vite-plugin-forge`
  compiler, with co-located `JSX Components/Layout/<Name>` stories and
  cross-framework SSR specs.

  **BREAKING (`@mission-platform/components`):** `BaseApplicationLayout` /
  `ApplicationLayout` and `BaseVerticalLayout` / `VerticalLayout` are no longer
  exported from `@mission-platform/components` — import them from
  `@mission-platform/layouts/vue` (or `/react`) instead. `@mission-platform/components`
  gains a neutral `.` root export and a neutral `./base-drawer` subpath so the
  write-once layouts can reuse `BaseDrawer` across packages.

  `@mission-platform/vite-plugin-forge`'s two-stage compiler now remaps neutral
  imports of the framework-split component libraries (`@mission-platform/components`
  and `@mission-platform/layouts`, in addition to `@mission-platform/icons`) — from
  their root or a neutral subpath — to the matching built `./react` / `./vue`
  entry, so write-once components can compose components published by another
  package.

- edb785f: forward non-component helper re-exports through the generated entry

  The two-stage compiler now also forwards a barrel's **helper-module**
  re-exports (e.g. `export { useToast, … } from './toast-store'`) through the
  generated `./react` / `./vue` entry (and its synthesised `.d.ts`), re-pointing
  them at the helper file copied into the flat per-framework tree. This lets a
  write-once package expose shared framework-agnostic APIs (such as the
  `@mission-platform/components` toast store) alongside its components, so each
  framework's consumers drive the same per-framework singleton the components use.
  A new `discoverHelperExports` helper distinguishes these from component exports
  (component re-exports are unaffected).

- 94f9acf: support neutral hooks and generate the per-framework entry modules

  The plugin now also handles the framework-neutral React-style hooks
  (`useState`/`useRef`/`useEffect`/`useMemo`/`useCallback`) when compiling a
  component, and **generates** the per-framework entry module for a neutral
  components package (`generateFrameworkSources` + `jsxComponentsEntryDtsPlugin`),
  so consumers no longer hand-author `react.ts` / `vue.ts` — the entry is produced
  from the components barrel and its `<framework>.d.ts` is synthesised.

- 94f9acf: compile named-slot passing into child components

  A write-once component can now pass content into a child component's named slot
  by marking a child with `slot="name"`. The compiler routes it to each
  framework's native mechanism: the React emitter turns `<Child><x slot="name"/></Child>`
  into a `name={<x/>}` prop; the Vue template path emits a `<template #name>`
  block (with the default-slot children in `<template #default>`); and the Vue
  render-closure path emits the `@vitejs/plugin-vue-jsx` `{{ name: () => … }}`
  object-children form (composed before the reference rewriter, so setters and
  state reads inside the slot functions are still translated to Vue reactivity).
  The `slot` marker is always stripped from the generated output.

- 94f9acf: add a Storyblok target that emits blok configurations and framework blok wrappers

  Alongside the React and Vue source generators, the plugin now projects the same
  neutral `@mission-platform/forge` components onto Storyblok via the new
  `generateStoryblokBloks`. For every component it derives, from the props
  contract, a Storyblok component object — string-literal unions (incl. local
  `type` aliases) become `option` fields, `boolean`/`number`/`string` map to the
  matching primitive field, `string | number` degrades to `text`, callbacks are
  dropped, and the default slot / `MpChild` props become nestable `bloks` fields,
  with JSDoc as the field `description` and `?? <literal>` / destructuring defaults
  as `default_value` — plus a thin React `.tsx` / Vue `.vue` blok wrapper that
  binds `blok.<field>` onto the built component, tags it editable
  (`storyblokEditable` / `v-editable`), and renders `bloks` fields through
  `StoryblokComponent`. It writes per-component `<name>.json`, the aggregate
  `components.json`, the wrapper sources, and a wrapper entry barrel.

  The per-framework emitters move from `src/compiler/` into a dedicated
  `src/generators/` directory (`react.ts`, `vue.ts`, `storyblok.ts`), with the
  shared parsing/discovery helpers remaining in `src/compiler/`.

- 94f9acf: compile the new neutral structural primitives to native code: remap the `Transition` import (Vue built-in / React CSS-class driver), rewrite `<Dynamic is={X}>` to `h(X, …)` (React `createElement` / Vue `<component :is>`), map `createContext`/`useContext` to each framework's provide/inject (React-native / Vue `@mission-platform/forge/vue`, keeping `useContext` a synchronous setup const), and resolve recursive self-referencing components via `defineOptions({ name })` + `resolveComponent`
- 94f9acf: remap the neutral `TransitionGroup` import like `Transition`/`Teleport` — Vue resolves the built-in `<TransitionGroup>` from `vue` and React imports the `@mission-platform/forge/react` group driver, while the `<TransitionGroup>` JSX usage is left intact on both targets
- edb785f: rework the plugin into a two-stage source-to-source compiler

  `@mission-platform/vite-plugin-forge` no longer ships a per-framework runtime that
  neutral imports are rewritten to. Instead it is a **two-stage compiler**:

  - **Stage 1 (source-to-source)** — `generateFrameworkSources` parses each neutral
    `.tsx` with the TypeScript compiler API and emits a per-framework source tree:
    a React `.tsx` module (`class` → `className`, `h` → `React.createElement`,
    hooks kept as React's own) or a real Vue `.vue` SFC (`<script lang="tsx">`
    `defineComponent`/`setup`, with the React-style hooks translated to Vue
    reactivity/lifecycle — `useState` → `ref`, `useRef` → `ref`, `useMemo` →
    `computed`, `useEffect` → `onMounted` + `watch(deps)` + cleanup — derived work
    and the returned JSX moved into the render closure, `children` → default slot,
    and prop defaults lifted into the runtime `props` declaration).
  - **Stage 2 (native compile)** — the generated tree is compiled by the framework's
    own toolchain: the classic-`h` React JSX transform (`reactJsxPlugin`) or
    `@vitejs/plugin-vue` (+ `@vitejs/plugin-vue-jsx`).

  This keeps each framework's runtime performance native (no neutral-tree walk, no
  React-hooks-on-Vue shim) and makes new target frameworks a matter of adding
  another emitter. `@mission-platform/components` now builds through this
  pipeline (its Vue build compiles generated `.vue` SFCs via `@vitejs/plugin-vue-jsx`).

  BREAKING CHANGE: the `./react` and `./vue` runtime subpath exports, the
  `jsxPlugin` / `vueJsxPlugin` factories, the runtime `defineVueBoundary`, and
  `writeJsxComponentsEntry` are removed. Use `generateFrameworkSources` (Stage 1),
  `reactJsxPlugin` (React Stage 2), `@vitejs/plugin-vue(-jsx)` (Vue Stage 2), and
  `jsxComponentsEntryDtsPlugin` instead.

- edb785f: type the Storyblok blok wrapper's `blok` prop precisely

  The Storyblok target now derives a precise interface for each wrapper's `blok`
  prop instead of the open `SbBlokData & Record<string, unknown>`. A new
  `emitBlokDataType` builds `SbBlokData & { … }` from the component's analysed
  schema — one member per field (`option` → string-literal union, `text` →
  `string`, `number`, `boolean`, `bloks` → `SbBlokData[]`; non-optional props stay
  required, a field-less component degrades to bare `SbBlokData`) — and it is used
  in the generated Vue `defineProps`, the React `<Name>BlokProperties` interface,
  and the synthesised wrapper-entry `index.d.ts`. `@mission-platform/components`
  now ships that typed `index.d.ts` for its `./storyblok/{react,vue}` subpaths.

- edb785f: add vite plugin that compiles the neutral jsx components to react/vue at build time

  Introduces the `@mission-platform/vite-plugin-forge` workspace, which compiles the
  framework-neutral `@mission-platform/forge` components to React or Vue 3 at build
  time instead of wrapping them with the runtime `toReactComponent` /
  `toVueComponent` adapters.

  `@mission-platform/components` produces its `./react` and `./vue` subpaths by
  running one `vite build` per framework through this plugin, rather than the
  runtime adapters.

### Patch Changes

- 38416d9: map classNames attribute to native class in vue compiler
- edb785f: forward consumer fall-through attributes onto the generated Vue component root

  The Vue emitter stamps every generated SFC with `defineOptions({ inheritAttrs:
false })` (so multi-root / render-closure components don't warn), but it never
  re-enabled attribute inheritance — so consumer-supplied fall-through attributes
  (`class`/`style`/`id`/`data-*`/listeners) were silently dropped, unlike the
  hand-authored `.vue` SFCs they replaced. This regressed components relied on the
  fall-through, e.g. the Monaco editor lost its consumer `class` (and therefore
  its `flex: 1` / border overrides) when wrapped by an app.

  The two-stage compiler now opts the root back in explicitly: a single root
  element in the `<template>` path is emitted with a trailing `v-bind="$attrs"`
  (placed last to mirror Vue's default-inheritance precedence; `class`/`style`
  still merge), and the render-closure fallback forwards `$attrs` onto its
  `<component :is="render">` host. `@mission-platform/components` and
  `@mission-platform/icons` pick this up when their `./vue` subpaths are rebuilt.

- 94f9acf: fix a Vue compile bug where a derived local read by a hook initialiser was left out of `setup`

  When a neutral component declared a derived `const` and then read it from a hook
  initialiser — e.g. `const initial = parseTime(modelValue); const [h] = useState(initial.h)` —
  the Vue emitter only hoisted derived declarations that a `useEffect` closed over.
  Because `useState`/`useRef`/`useMemo`/`useCallback`/`useContext` initialisers are
  also emitted in `setup`, the derived `const` stayed in the per-render closure and
  resolved to an undefined name at runtime (`ReferenceError: initial is not defined`).

  The hoist analysis now also seeds from hook-declaration initialisers, so a derived
  value read by a hook is lifted into `setup` (as a `computed`) ahead of the hook
  that consumes it.

- 94f9acf: fix slot translation for the `h(Slot, …)` call form and kebab slot names

  The two-stage compiler's reference rewriters now translate the **call form** of
  the named-slot marker — `h(Slot, { name: 'x' }, …fallback)` — exactly like the
  `<Slot name="x" />` JSX element, on both the Vue (`createReferenceRewriter`
  render-closure) and React paths. Previously only the JSX element form was
  handled, so a component that composed slots with `h(Slot, …)` (e.g. inside an
  intermediate `const column = … ? h(Drawer, …, h(Slot, { name: 'start' })) : …`
  that forces the `<script setup>` render-closure fallback) emitted an undefined
  `Slot` reference and threw `ReferenceError: Slot is not defined` at render.

  Slot/`hasSlot` reads for **non-identifier (kebab-case) slot names** now use
  bracket access (`slots["start-header"]` / `properties["start-header"]`) instead
  of dot access, which JavaScript mis-parsed as a subtraction
  (`slots.start-header` → `slots.start - header`). The Vue emitter also now wires
  up `useSlots()` when a body references slots via bracket access.

- edb785f: fix the Vue build so each component's styles load and apply (stories were unstyled)

  Two issues kept the `@mission-platform/components/vue` components (consumed
  by Storybook) unstyled, now both fixed so the components are a like-for-like
  visual match with the original `@mission-platform/components` SFCs:

  1. **CSS not loaded.** `jsxComponentsCssImportPlugin` now runs with
     `enforce: 'post'`, so its `generateBundle` hook executes **after** Vite has
     populated each chunk's `viteMetadata.importedCss`. Previously it ran first,
     found the metadata empty, and never re-linked the per-component CSS — under
     `preserveModules` the Vue style assets were emitted but orphaned
     (`/* empty css */`). Now each Vue component chunk imports its own extracted
     stylesheet (e.g. `base-badge.js` → `import "./base-badge.vue_..._lang.css"`),
     while inline-styled primitives (`BaseGrid`/`BaseStack`/`BaseMasonry`/
     `BaseInView`) correctly stay CSS-free. A regression test guards this.
  2. **CSS not applied.** The Vue emitter now inlines each component's SCSS as a
     **non-scoped** `<style lang="scss">` block instead of `<style scoped>`. These
     SFCs render via a `<script>` render function, and Vue only auto-applies the
     `data-v-…` scope attribute to a render function's **root** vnode — so nested
     elements (`base-separator__line`, drawer/hero/navbar internals, …) never
     received it and the scoped rules silently failed to match. The rules stay in
     the `@layer mp.components` cascade layer and rely on the components' unique
     BEM class names (exactly how the original SFCs are namespaced), so styling
     now applies to every element.

- 94f9acf: lowercase multi-word native DOM event listeners on the Vue target

  Vue derives a DOM listener's event name by hyphenating the prop key after `on` (`onDragOver` → the dead `drag-over`), so a React-style multi-word listener on a native element bound nothing and events such as `dragover`/`drop` never fired. The Vue emitter now lowercases the event portion of `on<Event>` listeners on **native** (intrinsic) elements (`onDragOver` → `onDragover`, `@dragover`) on both the render-closure and `<template>` paths, so they bind the real DOM event; listeners on **component** elements keep their camelCase form to match the child's emits.

- 94f9acf: make the `<Dynamic is>` primitive accept hyphenated attributes and slotted children

  `dynamicToHCall` now quotes non-identifier prop keys (e.g. `aria-current`,
  `data-id`) as string-literal property names so the emitted `h(tag, { … })`
  object literal is valid JS, and `jsxChildToArgument` unwraps the `{ … }`
  `JsxExpression` wrapper produced by the `<Slot>` rewrite so a `<Dynamic>` may
  carry `<Slot>` children (e.g. `<Dynamic is={tag}><Slot/></Dynamic>`). This
  unblocks `BaseNavbarItem`'s dynamic-tag rendering on both frameworks.

- edb785f: fix the Vue render-closure fallback so an effect can reference a derived declaration

  A `useEffect` is emitted into Vue `setup` (`onMounted`/`watch`), but the derived
  `const`s and functions it closes over defaulted to the per-render closure — so
  an effect that referenced one (e.g. `BaseCarousel`'s `slideCount`/`commit`)
  threw `slideCount is not defined` at runtime. The Vue emitter now finds the
  transitive set of derived declarations every effect depends on and hoists them
  into `setup` ahead of the effects: a derived **function** stays a plain `const`,
  while a derived **value** becomes a reactive `computed` (registered in the scope
  so every read — in the effect, its deps array, and the render closure — is
  rewritten to `<name>.value`).

- f70ecc8: carry external package imports into the generated Vue SFC

  The Vue emitter reconstructed a component's imports from only a fixed set of
  categories (the neutral `@mission-platform/forge` package, relative
  component/helper modules, stylesheets, and the Vue adapter), silently dropping
  every other bare-package import. A component that referenced an external value —
  e.g. `@mission-platform/forms-core`'s `DEFAULT_FIELD_TYPES` used as a prop
  default — therefore compiled to a Vue SFC that crashed at runtime with
  `ReferenceError: <name> is not defined` (e.g. the `BaseFormBuilder` Vue build).
  External (non-relative, non-neutral, non-stylesheet) imports are now carried
  through verbatim, matching the React emitter.

- 94f9acf: split the React, Vue and Storyblok emitters into per-generator folders

  Each Stage-1 emitter that previously lived in a single `src/generators/<name>.ts`
  file is now a `src/generators/<name>/` folder with an `index.ts` barrel and the
  implementation split across focused modules — `react/` (`aliases`, `imports`,
  `emit-module`), `vue/` (`shared`, `scope`, `effects`, `body`, `imports`,
  `styles`, `emit-module`), and `storyblok/` (`types`, `names`, `classify`,
  `analyze`, `wrappers`) — to make future maintenance easier. The public API and
  all generated output are unchanged.

- 94f9acf: emit native Vue `<template>` markup instead of a render function where possible

  The Vue Stage-1 emitter now rewrites a component's returned JSX/`h()` tree into real Vue `<template>` markup for the single-tree primitives: a dynamic tag becomes `<component :is="tag">`, `class`/`style`/`on<Event>`/`ref`/other dynamic attributes become the matching binding, `cond ? <a/> : <b/>` becomes `v-if`/`v-else`, `properties.children`/`<Slot>` become native `<slot>`, and each derived scalar `const` is lifted to a reactive `computed`. Components whose body falls outside that shape (node-valued local consts, `.map()` lists, prop spreads, or `MpChild`-typed props rendered as children — the complex layout components) automatically fall back to the previous `<script setup>` + `const render = () => …` + `<component :is="render" />` closure. The compiled output stays functionally identical.

- 94f9acf: emit Vue components as `<script setup>` SFCs instead of `export default defineComponent`

  The Vue Stage-1 emitter now produces a `<script setup lang="tsx">` single-file component — `defineOptions({ name, inheritAttrs: false })`, a `defineProps(…)` declaration, `useSlots()`, and the translated hooks emitted once at the top level — with the per-render JSX moved into a `const render = () => …` closure rendered from the `<template>` via `<component :is="render" />` (since `<script setup>` cannot itself return a render function). The compiled output stays functionally identical.

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
