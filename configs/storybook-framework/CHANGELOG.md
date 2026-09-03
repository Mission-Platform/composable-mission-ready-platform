# @mission-platform/storybook-framework

## 0.3.1

### Patch Changes

- c32bb83: centralize package documentation generation in the repository build
- f216404: add framework-neutral router contracts and compiler tooling integration
- 8a15dbc: add generated package API references and build-time documentation extraction
- b899a3c: add the Storybook designs addon to the shared framework preset
- Updated dependencies [c32bb83]
- Updated dependencies [f216404]
- Updated dependencies [8a15dbc]
  - @mission-platform/vite-config@1.1.1
  - @mission-platform/vite-plugin-i18n@0.1.3

## 0.3.0

### Minor Changes

- 4714506: add link styles to `ForgeTypography` and a five-renderer story slot helper

  `ForgeTypography` can now render a link two ways: `variant="link"` for
  standalone link text, and `href` on **any** variant so a heading or caption can
  be a link without leaving its own type scale. Links get the link colour, its
  hover/active and `:visited` treatment, a visible focus ring and an
  `underline?: 'always' | 'hover' | 'none'` mode (`'hover'` by default);
  `target="_blank"` adds `rel="noopener noreferrer"` automatically, and an
  explicit `color` still wins. Three new semantic tokens back it in both themes:
  `color.text.link`, `color.text.link-hover` and `color.text.link-visited`.

  `@mission-platform/storybook-framework` gains a `./slots` entry point exporting
  `renderWithSlots(component, properties, slots, children?)` and a `node()` JSX
  factory, with one implementation per renderer behind the `mp:vue`, `mp:react`,
  `mp:solid`, `mp:svelte` and `mp:web-component` export conditions. It is the one
  supported way to fill a component's **named slot** from a neutral story: passing
  a node as a prop only works on the React and Solid builds, so the dropdown,
  popover and navbar stories rendered blank on the other three. The Svelte and
  Web-Component workbenches additionally now compile story JSX through that
  factory, having previously had no JSX transform at all.

  Visual fixes in `@mission-platform/components`: the breadcrumb's current crumb
  now matches its sibling links (it inherits the trail's font and differs only in
  colour, instead of being wrapped in a smaller typography variant); `ForgeMenu`
  reads as a menu surface at rest and its `horizontal` orientation lays out as a
  row with floating submenus; and the `line` tab variant draws its active
  indicator inside the tab's own box, so the tab list's `overflow-x: auto` can no
  longer clip it, with the active label's weight bound to the active state.

  The icon overview gallery now finds every icon on every framework (the Vue build
  exports `defineComponent` objects, not functions), and the map stories render a
  live basemap again — their sized wrapper is an inline element rather than a local
  component taking `children`, which the Vue JSX transform turns into a slot.

### Patch Changes

- be97ac0: Force Vite 8's built-in Oxc JSX transform to `react/jsx-runtime` for the React Storybook renderer. Without this override Oxc stripped `.tsx` syntax using the shared stories tsconfig's `jsxImportSource: 'vue'` before `@vitejs/plugin-react`'s Babel step ever saw raw JSX, so every neutral `*.stories.tsx` compiled to a Vue `VNode` under the React renderer and crashed with "Objects are not valid as a React child" (e.g. all `@mission-platform/scheduler` React stories).
- be97ac0: Render typed member calls such as deferred wizard-step content as Vue nodes instead of stringifying VNodes.

  Normalize primitive and array-valued Svelte slots to snippets so Storybook args render safely without callable-value errors or invalid structural-element text holes.

  Preserve native string-tag dynamic hosts when lowering Svelte components, including PascalCase locals with object-valued inline styles.

  Fix Svelte lowering for runtime module declarations, neutral `useId` imports, children-alias presence checks, value-position array/spread markup (itemNodes/childList), non-literal $props defaults, JSX-returning local render helpers (including expression-bodied `.map()`/`.flatMap()`/`Array.from()` helpers such as `ForgeTabs`' `renderPanels`, and **block-bodied** mapped helpers with leading typed `const`s + terminal `return` such as `ForgeMenu`/`ForgeMenubar`'s `renderItems`, lowered to a `{#snippet}` containing an `{#each}` with `{@const}` bindings and invoked via `{@render}` instead of leaving an undeclared `renderItems is not defined` call; each-header keys that reference block-local consts are expanded into the header, and TypeScript `as` assertions are stripped from helper-call arguments in markup), control-flow render helpers whose bodies branch through `if`/`switch`/early-return before returning JSX (such as `ForgeFormBuilder`'s `renderPanel` and `ForgeSchemaForm`'s `renderField`), lowered to parameterized `{#snippet}` declarations, callback props that render a known helper (such as `panel={(scope) => renderPanel(scope.tab.id)}`), lowered to implicit snippet props, and consumer-side render-prop invocations (both the destructured `panel?.(…)` form and the `properties.panel?.(…)` member form) lowered to `{@render panel?.(…)}` snippet renders instead of leaving a `panel?.(…)` call hole; the generated Svelte `MpRenderProperty<S>` local JSX type is now a native `Snippet<[S]>` so those `{@render}` invocations typecheck. Also fix template-position `h(Slot, …)` markers (including named slots and fallback children), source-ordered component initialization (preventing setup-dependent `$state`/`$derived`temporal-dead-zone failures), and scope-safe static snippet hoisting (including ignoring comment/JSDoc words when determining the component's top-level bindings, so an each-local such as`option`in`options.map((option) => …)`is no longer hoisted into a top-level snippet and can no longer throw`ReferenceError: option is not defined` at render time); use a deterministic Storybook image fixture for EmailImage stories.

- be97ac0: Force static Storybook docs source under the Svelte renderer so CSF `useArgs()` stories are not re-invoked outside the preview hooks context by `@storybook/svelte`'s source decorator.
  - @mission-platform/vite-config@1.1.0
  - @mission-platform/vite-plugin-i18n@0.1.2

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
