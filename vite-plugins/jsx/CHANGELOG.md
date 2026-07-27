# @mission-platform/vite-plugin-jsx

## 0.1.0

### Minor Changes

- edb785f: add a framework-neutral `classNames` helper and move component CSS Modules to the `mp.components` layer

  `@mission-platform/jsx` now exports a `classNames(...values)` helper (and its
  `ClassValue` type) for assembling class names the same way on every framework
  from the string (`'a b'`), object (`{ 'class': boolean }`), and array
  (`['class']`) forms — falsy entries are dropped and duplicates de-duplicated.

  `@mission-platform/vite-plugin-jsx`'s two-stage compiler now (1) preserves
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

  `@mission-platform/vite-plugin-jsx`'s two-stage compiler owns the transform: on
  React an array value collapses to a `className={classNames(…)}` string call
  (re-injecting the neutral `classNames` import), while any other value passes
  through as `className`; on Vue it maps onto the native `class` binding, which
  understands the array/object forms (no helper needed). `@mission-platform/jsx`'s
  `./react` and `./vue` runtime adapters apply the same mapping at render time so
  the ad-hoc/SSR output matches the compiled output. The `classNames(...values)`
  helper is still exported for the rare precompute and `h(tag, { class: … })`
  object form.

  `@mission-platform/components` and `@mission-platform/icons` migrate
  their components' `class={…}` attributes to `className={…}` accordingly.

- edb785f: ship the `Base*` export aliases, public-type re-exports, a `./styles` entry, and a `BaseVirtualTable` `cell` slot so apps can adopt the JSX components in place of the Vue component library

  `@mission-platform/vite-plugin-jsx`'s entry generator now re-exports each
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

  `@mission-platform/jsx` gains a `MpRenderProperty<Scope>` type and the neutral
  `<Slot>` element now accepts **scope props** (`<Slot name="row" item={item}
index={i} />`) so a write-once component can drive a **scoped slot**.

  `@mission-platform/vite-plugin-jsx`'s two-stage compiler translates a scoped
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

  `@mission-platform/vite-plugin-jsx`'s Vue emitter no longer rewrites JSX
  **attribute names** or **element tag names** when they collide with a
  destructured prop. Previously a `src` prop turned `src={src}` into the invalid
  `properties.src={properties.src}`, and a `caption` prop turned a `<caption>`
  element into the invalid dynamic `createVNode(properties.caption, …)`; both now
  keep the literal name and rewrite only the value. Regression tests cover both.

- edb785f: add a `hasSlot` slot-presence helper and move the component content props to named slots

  `@mission-platform/jsx` now exports `hasSlot('x')` — the neutral counterpart of
  Vue's `$slots.x` / a React `properties.x != null` check (an omitted name targets
  the default slot) — so a write-once component can render an optional wrapper
  region only when a slot is filled. The runtime adapters also gain
  `resolveSlotMarkers`, which resolves a forwarded `<Slot>` marker lexically
  against the forwarding component before handing children to a child component,
  so a component can forward its own slots into a child's slots.

  `@mission-platform/vite-plugin-jsx` compiles `hasSlot('x')` to each framework's
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

  `@mission-platform/vite-plugin-jsx` gains `jsxComponentsCssImportPlugin`, which
  re-links each component's extracted CSS to its JS chunk (Vite library builds
  emit per-chunk CSS but do not inject the import), and its two-stage compiler now
  translates the new named-slot marker.

  `@mission-platform/jsx` adds a framework-neutral named-slot primitive `Slot`
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

  `@mission-platform/vite-plugin-jsx`'s two-stage compiler now scopes styling per
  framework: the **React** build keeps the hashed **CSS Module**, while the **Vue**
  build inlines each component's `*.module.scss` as a scoped
  `<style scoped lang="scss">` block in the generated SFC (preserving the
  `@layer mp.components` wrapper) and rewrites every `styles['x']` /
  `styles[`x`]` read — including computed object keys — to its literal class name,
  so `classNames(...)` produces plain, `data-v-`-scoped classes.

  `@mission-platform/jsx`'s `Slot` marker is a (never-invoked) function component
  so `<Slot name="…" />` type-checks under the classic `h` factory.

- edb785f: add a framework-neutral `Teleport`/portal primitive and migrate the popup overlays with CSS anchor positioning

  - `@mission-platform/jsx`: add the neutral `<Teleport to="…">` portal element (`MpTeleportProperties`) — a compile-time/adapter marker like `Slot`. The runtime adapters render its children in place (SSR parity), and `@mission-platform/jsx/react` now also exports a real `createPortal`-backed `Teleport` component (SSR-safe; resolves its target after mount).
  - `@mission-platform/vite-plugin-jsx`: remap the neutral `Teleport` import per framework — Vue resolves it from the `vue` runtime (built-in `<Teleport>`) and React imports it from `@mission-platform/jsx/react` (the `createPortal` wrapper) — while leaving the `<Teleport>` JSX usage intact.
  - `@mission-platform/components`: migrate the `Components/Overlays` popups `BaseTooltip`, `BasePopover`, and `BaseDropdown` from `@mission-platform/components` to the write-once neutral package. Each teleports its panel to `document.body` and positions it with the CSS Anchor Positioning API (`anchor-name`/`position-anchor`/`position-area` + `position-try-fallbacks` + `@position-try`, plus `anchor-size(width)` for the dropdown's trigger-width match) instead of `@floating-ui`; `<Transition>` is dropped. The popover's and dropdown's compound (`-start`/`-end`) placements use **fully-logical** `position-area` values (e.g. `block-end span-inline-end`) — mixing a physical side keyword with a logical span (`bottom span-inline-end`) is an invalid value that browsers silently drop, which would leave the teleported panel un-anchored at its static position. The modal overlays (`BaseDialog`/`BaseModal`) remain Vue-only.

- edb785f: migrate the Components/Theme group to the write-once components library

  `@mission-platform/components` now ships the complete `Components/Theme`
  group — `BaseThemeToggle`, `BaseThemeProvider`, and `BaseThemeComposer` —
  authored once in the neutral JSX dialect and compiled to both React and Vue.
  Because the neutral dialect has no `provide`/`inject` context primitive,
  cross-component theme state is shared through a framework-agnostic observable
  singleton store (`theme-store.ts`), and the composer is a controlled component
  (`modelValue`/`onUpdateModelValue` in place of `v-model`).

  `@mission-platform/vite-plugin-jsx` gains **shared helper module** support: a
  neutral component can import a sibling plain `.ts`/`.tsx` helper (e.g. the theme
  store); the two-stage compiler now distinguishes such helpers from sibling
  components (so the Vue emitter keeps a named `./x` import instead of `./x.vue`)
  and copies each referenced helper into both generated framework trees.

- 18bd49a: extract the common layouts into a new `@mission-platform/layouts` package

  Adds the write-once `@mission-platform/layouts` package containing the common
  layout primitives — `BaseApplicationLayout` (public `ApplicationLayout`) and
  `BaseVerticalLayout` (public `VerticalLayout`) — authored once in the neutral
  `@mission-platform/jsx` dialect and compiled straight to both Vue 3 (`./vue`)
  and React (`./react`) by the two-stage `@mission-platform/vite-plugin-jsx`
  compiler, with co-located `JSX Components/Layout/<Name>` stories and
  cross-framework SSR specs.

  **BREAKING (`@mission-platform/components`):** `BaseApplicationLayout` /
  `ApplicationLayout` and `BaseVerticalLayout` / `VerticalLayout` are no longer
  exported from `@mission-platform/components` — import them from
  `@mission-platform/layouts/vue` (or `/react`) instead. `@mission-platform/components`
  gains a neutral `.` root export and a neutral `./base-drawer` subpath so the
  write-once layouts can reuse `BaseDrawer` across packages.

  `@mission-platform/vite-plugin-jsx`'s two-stage compiler now remaps neutral
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
  neutral `@mission-platform/jsx` components onto Storyblok via the new
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

- 94f9acf: compile the new neutral structural primitives to native code: remap the `Transition` import (Vue built-in / React CSS-class driver), rewrite `<Dynamic is={X}>` to `h(X, …)` (React `createElement` / Vue `<component :is>`), map `createContext`/`useContext` to each framework's provide/inject (React-native / Vue `@mission-platform/jsx/vue`, keeping `useContext` a synchronous setup const), and resolve recursive self-referencing components via `defineOptions({ name })` + `resolveComponent`
- 94f9acf: remap the neutral `TransitionGroup` import like `Transition`/`Teleport` — Vue resolves the built-in `<TransitionGroup>` from `vue` and React imports the `@mission-platform/jsx/react` group driver, while the `<TransitionGroup>` JSX usage is left intact on both targets
- edb785f: rework the plugin into a two-stage source-to-source compiler

  `@mission-platform/vite-plugin-jsx` no longer ships a per-framework runtime that
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

  Introduces the `@mission-platform/vite-plugin-jsx` workspace, which compiles the
  framework-neutral `@mission-platform/jsx` components to React or Vue 3 at build
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
  categories (the neutral `@mission-platform/jsx` package, relative
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
  - @mission-platform/jsx@0.2.0

## 0.1.0

### Minor Changes

- edb785f: add a framework-neutral `classNames` helper and move component CSS Modules to the `mp.components` layer

  `@mission-platform/jsx` now exports a `classNames(...values)` helper (and its
  `ClassValue` type) for assembling class names the same way on every framework
  from the string (`'a b'`), object (`{ 'class': boolean }`), and array
  (`['class']`) forms — falsy entries are dropped and duplicates de-duplicated.

  `@mission-platform/vite-plugin-jsx`'s two-stage compiler now (1) preserves
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

  `@mission-platform/vite-plugin-jsx`'s two-stage compiler owns the transform: on
  React an array value collapses to a `className={classNames(…)}` string call
  (re-injecting the neutral `classNames` import), while any other value passes
  through as `className`; on Vue it maps onto the native `class` binding, which
  understands the array/object forms (no helper needed). `@mission-platform/jsx`'s
  `./react` and `./vue` runtime adapters apply the same mapping at render time so
  the ad-hoc/SSR output matches the compiled output. The `classNames(...values)`
  helper is still exported for the rare precompute and `h(tag, { class: … })`
  object form.

  `@mission-platform/components` and `@mission-platform/icons` migrate
  their components' `class={…}` attributes to `className={…}` accordingly.

- edb785f: ship the `Base*` export aliases, public-type re-exports, a `./styles` entry, and a `BaseVirtualTable` `cell` slot so apps can adopt the JSX components in place of the Vue component library

  `@mission-platform/vite-plugin-jsx`'s entry generator now re-exports each
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

  `@mission-platform/jsx` gains a `MpRenderProperty<Scope>` type and the neutral
  `<Slot>` element now accepts **scope props** (`<Slot name="row" item={item}
index={i} />`) so a write-once component can drive a **scoped slot**.

  `@mission-platform/vite-plugin-jsx`'s two-stage compiler translates a scoped
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

  `@mission-platform/vite-plugin-jsx`'s Vue emitter no longer rewrites JSX
  **attribute names** or **element tag names** when they collide with a
  destructured prop. Previously a `src` prop turned `src={src}` into the invalid
  `properties.src={properties.src}`, and a `caption` prop turned a `<caption>`
  element into the invalid dynamic `createVNode(properties.caption, …)`; both now
  keep the literal name and rewrite only the value. Regression tests cover both.

- edb785f: add a `hasSlot` slot-presence helper and move the component content props to named slots

  `@mission-platform/jsx` now exports `hasSlot('x')` — the neutral counterpart of
  Vue's `$slots.x` / a React `properties.x != null` check (an omitted name targets
  the default slot) — so a write-once component can render an optional wrapper
  region only when a slot is filled. The runtime adapters also gain
  `resolveSlotMarkers`, which resolves a forwarded `<Slot>` marker lexically
  against the forwarding component before handing children to a child component,
  so a component can forward its own slots into a child's slots.

  `@mission-platform/vite-plugin-jsx` compiles `hasSlot('x')` to each framework's
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

  `@mission-platform/vite-plugin-jsx` gains `jsxComponentsCssImportPlugin`, which
  re-links each component's extracted CSS to its JS chunk (Vite library builds
  emit per-chunk CSS but do not inject the import), and its two-stage compiler now
  translates the new named-slot marker.

  `@mission-platform/jsx` adds a framework-neutral named-slot primitive `Slot`
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

  `@mission-platform/vite-plugin-jsx`'s two-stage compiler now scopes styling per
  framework: the **React** build keeps the hashed **CSS Module**, while the **Vue**
  build inlines each component's `*.module.scss` as a scoped
  `<style scoped lang="scss">` block in the generated SFC (preserving the
  `@layer mp.components` wrapper) and rewrites every `styles['x']` /
  `styles[`x`]` read — including computed object keys — to its literal class name,
  so `classNames(...)` produces plain, `data-v-`-scoped classes.

  `@mission-platform/jsx`'s `Slot` marker is a (never-invoked) function component
  so `<Slot name="…" />` type-checks under the classic `h` factory.

- edb785f: add a framework-neutral `Teleport`/portal primitive and migrate the popup overlays with CSS anchor positioning

  - `@mission-platform/jsx`: add the neutral `<Teleport to="…">` portal element (`MpTeleportProperties`) — a compile-time/adapter marker like `Slot`. The runtime adapters render its children in place (SSR parity), and `@mission-platform/jsx/react` now also exports a real `createPortal`-backed `Teleport` component (SSR-safe; resolves its target after mount).
  - `@mission-platform/vite-plugin-jsx`: remap the neutral `Teleport` import per framework — Vue resolves it from the `vue` runtime (built-in `<Teleport>`) and React imports it from `@mission-platform/jsx/react` (the `createPortal` wrapper) — while leaving the `<Teleport>` JSX usage intact.
  - `@mission-platform/components`: migrate the `Components/Overlays` popups `BaseTooltip`, `BasePopover`, and `BaseDropdown` from `@mission-platform/components` to the write-once neutral package. Each teleports its panel to `document.body` and positions it with the CSS Anchor Positioning API (`anchor-name`/`position-anchor`/`position-area` + `position-try-fallbacks` + `@position-try`, plus `anchor-size(width)` for the dropdown's trigger-width match) instead of `@floating-ui`; `<Transition>` is dropped. The popover's and dropdown's compound (`-start`/`-end`) placements use **fully-logical** `position-area` values (e.g. `block-end span-inline-end`) — mixing a physical side keyword with a logical span (`bottom span-inline-end`) is an invalid value that browsers silently drop, which would leave the teleported panel un-anchored at its static position. The modal overlays (`BaseDialog`/`BaseModal`) remain Vue-only.

- edb785f: migrate the Components/Theme group to the write-once components library

  `@mission-platform/components` now ships the complete `Components/Theme`
  group — `BaseThemeToggle`, `BaseThemeProvider`, and `BaseThemeComposer` —
  authored once in the neutral JSX dialect and compiled to both React and Vue.
  Because the neutral dialect has no `provide`/`inject` context primitive,
  cross-component theme state is shared through a framework-agnostic observable
  singleton store (`theme-store.ts`), and the composer is a controlled component
  (`modelValue`/`onUpdateModelValue` in place of `v-model`).

  `@mission-platform/vite-plugin-jsx` gains **shared helper module** support: a
  neutral component can import a sibling plain `.ts`/`.tsx` helper (e.g. the theme
  store); the two-stage compiler now distinguishes such helpers from sibling
  components (so the Vue emitter keeps a named `./x` import instead of `./x.vue`)
  and copies each referenced helper into both generated framework trees.

- 18bd49a: extract the common layouts into a new `@mission-platform/layouts` package

  Adds the write-once `@mission-platform/layouts` package containing the common
  layout primitives — `BaseApplicationLayout` (public `ApplicationLayout`) and
  `BaseVerticalLayout` (public `VerticalLayout`) — authored once in the neutral
  `@mission-platform/jsx` dialect and compiled straight to both Vue 3 (`./vue`)
  and React (`./react`) by the two-stage `@mission-platform/vite-plugin-jsx`
  compiler, with co-located `JSX Components/Layout/<Name>` stories and
  cross-framework SSR specs.

  **BREAKING (`@mission-platform/components`):** `BaseApplicationLayout` /
  `ApplicationLayout` and `BaseVerticalLayout` / `VerticalLayout` are no longer
  exported from `@mission-platform/components` — import them from
  `@mission-platform/layouts/vue` (or `/react`) instead. `@mission-platform/components`
  gains a neutral `.` root export and a neutral `./base-drawer` subpath so the
  write-once layouts can reuse `BaseDrawer` across packages.

  `@mission-platform/vite-plugin-jsx`'s two-stage compiler now remaps neutral
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
  neutral `@mission-platform/jsx` components onto Storyblok via the new
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

- 94f9acf: compile the new neutral structural primitives to native code: remap the `Transition` import (Vue built-in / React CSS-class driver), rewrite `<Dynamic is={X}>` to `h(X, …)` (React `createElement` / Vue `<component :is>`), map `createContext`/`useContext` to each framework's provide/inject (React-native / Vue `@mission-platform/jsx/vue`, keeping `useContext` a synchronous setup const), and resolve recursive self-referencing components via `defineOptions({ name })` + `resolveComponent`
- 94f9acf: remap the neutral `TransitionGroup` import like `Transition`/`Teleport` — Vue resolves the built-in `<TransitionGroup>` from `vue` and React imports the `@mission-platform/jsx/react` group driver, while the `<TransitionGroup>` JSX usage is left intact on both targets
- edb785f: rework the plugin into a two-stage source-to-source compiler

  `@mission-platform/vite-plugin-jsx` no longer ships a per-framework runtime that
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

  Introduces the `@mission-platform/vite-plugin-jsx` workspace, which compiles the
  framework-neutral `@mission-platform/jsx` components to React or Vue 3 at build
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
  categories (the neutral `@mission-platform/jsx` package, relative
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
  - @mission-platform/jsx@0.2.0

## 0.1.0

### Minor Changes

- edb785f: add a framework-neutral `classNames` helper and move component CSS Modules to the `mp.components` layer

  `@mission-platform/jsx` now exports a `classNames(...values)` helper (and its
  `ClassValue` type) for assembling class names the same way on every framework
  from the string (`'a b'`), object (`{ 'class': boolean }`), and array
  (`['class']`) forms — falsy entries are dropped and duplicates de-duplicated.

  `@mission-platform/vite-plugin-jsx`'s two-stage compiler now (1) preserves
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

  `@mission-platform/vite-plugin-jsx`'s two-stage compiler owns the transform: on
  React an array value collapses to a `className={classNames(…)}` string call
  (re-injecting the neutral `classNames` import), while any other value passes
  through as `className`; on Vue it maps onto the native `class` binding, which
  understands the array/object forms (no helper needed). `@mission-platform/jsx`'s
  `./react` and `./vue` runtime adapters apply the same mapping at render time so
  the ad-hoc/SSR output matches the compiled output. The `classNames(...values)`
  helper is still exported for the rare precompute and `h(tag, { class: … })`
  object form.

  `@mission-platform/components` and `@mission-platform/icons` migrate
  their components' `class={…}` attributes to `className={…}` accordingly.

- edb785f: ship the `Base*` export aliases, public-type re-exports, a `./styles` entry, and a `BaseVirtualTable` `cell` slot so apps can adopt the JSX components in place of the Vue component library

  `@mission-platform/vite-plugin-jsx`'s entry generator now re-exports each
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

  `@mission-platform/jsx` gains a `MpRenderProperty<Scope>` type and the neutral
  `<Slot>` element now accepts **scope props** (`<Slot name="row" item={item}
index={i} />`) so a write-once component can drive a **scoped slot**.

  `@mission-platform/vite-plugin-jsx`'s two-stage compiler translates a scoped
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

  `@mission-platform/vite-plugin-jsx`'s Vue emitter no longer rewrites JSX
  **attribute names** or **element tag names** when they collide with a
  destructured prop. Previously a `src` prop turned `src={src}` into the invalid
  `properties.src={properties.src}`, and a `caption` prop turned a `<caption>`
  element into the invalid dynamic `createVNode(properties.caption, …)`; both now
  keep the literal name and rewrite only the value. Regression tests cover both.

- edb785f: add a `hasSlot` slot-presence helper and move the component content props to named slots

  `@mission-platform/jsx` now exports `hasSlot('x')` — the neutral counterpart of
  Vue's `$slots.x` / a React `properties.x != null` check (an omitted name targets
  the default slot) — so a write-once component can render an optional wrapper
  region only when a slot is filled. The runtime adapters also gain
  `resolveSlotMarkers`, which resolves a forwarded `<Slot>` marker lexically
  against the forwarding component before handing children to a child component,
  so a component can forward its own slots into a child's slots.

  `@mission-platform/vite-plugin-jsx` compiles `hasSlot('x')` to each framework's
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

  `@mission-platform/vite-plugin-jsx` gains `jsxComponentsCssImportPlugin`, which
  re-links each component's extracted CSS to its JS chunk (Vite library builds
  emit per-chunk CSS but do not inject the import), and its two-stage compiler now
  translates the new named-slot marker.

  `@mission-platform/jsx` adds a framework-neutral named-slot primitive `Slot`
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

  `@mission-platform/vite-plugin-jsx`'s two-stage compiler now scopes styling per
  framework: the **React** build keeps the hashed **CSS Module**, while the **Vue**
  build inlines each component's `*.module.scss` as a scoped
  `<style scoped lang="scss">` block in the generated SFC (preserving the
  `@layer mp.components` wrapper) and rewrites every `styles['x']` /
  `styles[`x`]` read — including computed object keys — to its literal class name,
  so `classNames(...)` produces plain, `data-v-`-scoped classes.

  `@mission-platform/jsx`'s `Slot` marker is a (never-invoked) function component
  so `<Slot name="…" />` type-checks under the classic `h` factory.

- edb785f: add a framework-neutral `Teleport`/portal primitive and migrate the popup overlays with CSS anchor positioning

  - `@mission-platform/jsx`: add the neutral `<Teleport to="…">` portal element (`MpTeleportProperties`) — a compile-time/adapter marker like `Slot`. The runtime adapters render its children in place (SSR parity), and `@mission-platform/jsx/react` now also exports a real `createPortal`-backed `Teleport` component (SSR-safe; resolves its target after mount).
  - `@mission-platform/vite-plugin-jsx`: remap the neutral `Teleport` import per framework — Vue resolves it from the `vue` runtime (built-in `<Teleport>`) and React imports it from `@mission-platform/jsx/react` (the `createPortal` wrapper) — while leaving the `<Teleport>` JSX usage intact.
  - `@mission-platform/components`: migrate the `Components/Overlays` popups `BaseTooltip`, `BasePopover`, and `BaseDropdown` from `@mission-platform/components` to the write-once neutral package. Each teleports its panel to `document.body` and positions it with the CSS Anchor Positioning API (`anchor-name`/`position-anchor`/`position-area` + `position-try-fallbacks` + `@position-try`, plus `anchor-size(width)` for the dropdown's trigger-width match) instead of `@floating-ui`; `<Transition>` is dropped. The popover's and dropdown's compound (`-start`/`-end`) placements use **fully-logical** `position-area` values (e.g. `block-end span-inline-end`) — mixing a physical side keyword with a logical span (`bottom span-inline-end`) is an invalid value that browsers silently drop, which would leave the teleported panel un-anchored at its static position. The modal overlays (`BaseDialog`/`BaseModal`) remain Vue-only.

- edb785f: migrate the Components/Theme group to the write-once components library

  `@mission-platform/components` now ships the complete `Components/Theme`
  group — `BaseThemeToggle`, `BaseThemeProvider`, and `BaseThemeComposer` —
  authored once in the neutral JSX dialect and compiled to both React and Vue.
  Because the neutral dialect has no `provide`/`inject` context primitive,
  cross-component theme state is shared through a framework-agnostic observable
  singleton store (`theme-store.ts`), and the composer is a controlled component
  (`modelValue`/`onUpdateModelValue` in place of `v-model`).

  `@mission-platform/vite-plugin-jsx` gains **shared helper module** support: a
  neutral component can import a sibling plain `.ts`/`.tsx` helper (e.g. the theme
  store); the two-stage compiler now distinguishes such helpers from sibling
  components (so the Vue emitter keeps a named `./x` import instead of `./x.vue`)
  and copies each referenced helper into both generated framework trees.

- 18bd49a: extract the common layouts into a new `@mission-platform/layouts` package

  Adds the write-once `@mission-platform/layouts` package containing the common
  layout primitives — `BaseApplicationLayout` (public `ApplicationLayout`) and
  `BaseVerticalLayout` (public `VerticalLayout`) — authored once in the neutral
  `@mission-platform/jsx` dialect and compiled straight to both Vue 3 (`./vue`)
  and React (`./react`) by the two-stage `@mission-platform/vite-plugin-jsx`
  compiler, with co-located `JSX Components/Layout/<Name>` stories and
  cross-framework SSR specs.

  **BREAKING (`@mission-platform/components`):** `BaseApplicationLayout` /
  `ApplicationLayout` and `BaseVerticalLayout` / `VerticalLayout` are no longer
  exported from `@mission-platform/components` — import them from
  `@mission-platform/layouts/vue` (or `/react`) instead. `@mission-platform/components`
  gains a neutral `.` root export and a neutral `./base-drawer` subpath so the
  write-once layouts can reuse `BaseDrawer` across packages.

  `@mission-platform/vite-plugin-jsx`'s two-stage compiler now remaps neutral
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
  neutral `@mission-platform/jsx` components onto Storyblok via the new
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

- 94f9acf: compile the new neutral structural primitives to native code: remap the `Transition` import (Vue built-in / React CSS-class driver), rewrite `<Dynamic is={X}>` to `h(X, …)` (React `createElement` / Vue `<component :is>`), map `createContext`/`useContext` to each framework's provide/inject (React-native / Vue `@mission-platform/jsx/vue`, keeping `useContext` a synchronous setup const), and resolve recursive self-referencing components via `defineOptions({ name })` + `resolveComponent`
- 94f9acf: remap the neutral `TransitionGroup` import like `Transition`/`Teleport` — Vue resolves the built-in `<TransitionGroup>` from `vue` and React imports the `@mission-platform/jsx/react` group driver, while the `<TransitionGroup>` JSX usage is left intact on both targets
- edb785f: rework the plugin into a two-stage source-to-source compiler

  `@mission-platform/vite-plugin-jsx` no longer ships a per-framework runtime that
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

  Introduces the `@mission-platform/vite-plugin-jsx` workspace, which compiles the
  framework-neutral `@mission-platform/jsx` components to React or Vue 3 at build
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
  categories (the neutral `@mission-platform/jsx` package, relative
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
  - @mission-platform/jsx@0.2.0
