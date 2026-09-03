# @mission-platform/forge

## 1.1.0

### Minor Changes

- 89aab02: add typed style generation support for Forge components

### Patch Changes

- c32bb83: centralize package documentation generation in the repository build
- f216404: add framework-neutral router contracts and compiler tooling integration
- 8a15dbc: add generated package API references and build-time documentation extraction

## 1.0.0

### Major Changes

- e2525a3: rename the neutral class attribute from `classNames` to `className`

  The framework-neutral JSX **class attribute** is now spelled `className={…}` everywhere (matching React's own spelling and the plain `class` static attribute it complements). The runtime **helper** `classNames(...)` is unchanged — it is still exported from `@mission-platform/forge` and still re-injected into the compiled React output.

  - **Authoring:** drive dynamic classes with `className={[…]}` (array / string / `{ class: boolean }` forms); the author still never imports the helper.
  - **`@mission-platform/forge`:** the `./react` and `./vue` runtime adapters now recognise the `className` prop (React collapses it to a `className={classNames(…)}` string, Vue maps it onto the native `class` binding).
  - **`@mission-platform/vite-plugin-forge`:** the two-stage compiler recognises only `className` as the neutral class attribute; the legacy `classNames` attribute alias has been removed from every generator (React/Vue/Solid/Svelte).
  - **Breaking:** neutral components authored with the old `classNames={…}` attribute must be updated to `className={…}`.

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

- 7a1b1a1: Add a native, dependency-free Web Components runtime exported as `@mission-platform/forge/web-components` (`ForgeElement`, `html`, `nothing`, `render`). It replaces Lit as the base for compiled custom elements: `ForgeElement` renders a lit-style tagged template into an open shadow root with reactive `static properties`/state and coalesced microtask updates.
- 0c0d5d7: add a SolidJS adapter exposing the neutral framework primitives

  The new `@mission-platform/forge/solid` subpath exports `Teleport`, `Transition`, and `TransitionGroup` built for
  SolidJS, so write-once components compiled to the Solid target can resolve their framework-component imports.

- 7d95459: portal element targets synchronously in Teleport so top-layer panels mount in the same commit

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

## 0.2.0

### Minor Changes

- edb785f: add a framework-neutral `classNames` helper and move component CSS Modules to the `mp.components` layer

  `@mission-platform/forge` now exports a `classNames(...values)` helper (and its
  `ClassValue` type) for assembling class names the same way on every framework from the string (`'a b'`), object
  (`{ 'class': boolean }`), and array (`['class']`) forms — falsy entries are dropped and duplicates de-duplicated.

  `@mission-platform/vite-plugin-forge`'s two-stage compiler now (1) preserves neutral framework-agnostic value imports
  such as `classNames` verbatim (instead of translating them like `h`/the hooks), and (2) carries each component's own
  relative stylesheet imports (CSS Modules and bare CSS) onto both the React and Vue generated source trees, so a
  neutral component can own and ship its own CSS.

  `@mission-platform/components`' co-located `.module.scss` files are now real CSS Modules whose rules live in the
  shared `@layer mp.components` cascade layer with no `:global`. The styled components (`BaseBadge`, `BaseButton`,
  `BaseSeparator`) own their styling via the hashed class map + `classNames`, and the package now ships that CSS through
  new `./vue.css` and `./react.css`
  exports.

- edb785f: add the platform-owned `className={…}` JSX attribute for class management

  Neutral components now drive dynamic classes with a `className={…}` attribute (reserving the plain `class="…"` for
  static strings) instead of calling the
  `classNames` helper inline — the author never imports the helper. The canonical value is an array holding the same
  arguments the helper accepts.

  `@mission-platform/vite-plugin-forge`'s two-stage compiler owns the transform: on React an array value collapses to a
  `className={classNames(…)}` string call (re-injecting the neutral `classNames` import), while any other value passes
  through as `className`; on Vue it maps onto the native `class` binding, which understands the array/object forms (no
  helper needed). `@mission-platform/forge`'s
  `./react` and `./vue` runtime adapters apply the same mapping at render time so the ad-hoc/SSR output matches the
  compiled output. The `classNames(...values)`
  helper is still exported for the rare precompute and `h(tag, { class: … })`
  object form.

  `@mission-platform/components` and `@mission-platform/icons` migrate their components' `class={…}` attributes to
  `className={…}` accordingly.

- edb785f: migrate `BaseApplicationLayout` to the write-once jsx-components library

  `@mission-platform/components` gains `BaseApplicationLayout` (public
  `ApplicationLayout`) — the top-level application shell (status banner, header, scrollable content, footer) authored
  once in the neutral JSX dialect and compiled straight to both React and Vue by `@mission-platform/vite-plugin-forge`.
  It is the first migrated component to use the framework-neutral **named-slot**
  primitive (`<Slot name="status" | "navbar" | "content" | "footer" />`), derives the status banner's colour/ARIA role
  from `statusLevel`, and ships its own per-component CSS (`@layer mp.components`). Co-located stories
  (`JSX Components/Layout/BaseApplicationLayout`) and cross-framework SSR specs are included.

  `@mission-platform/forge`'s `Slot` marker is now a (never-invoked) function component instead of a `unique symbol`, so
  `<Slot name="…" />` type-checks as a JSX element under the classic `h` factory. The runtime adapters still intercept
  it by identity (`type === Slot`) and the build-time compiler still rewrites it away, so behaviour is unchanged.

- edb785f: add a write-once JSX layer that renders on both Vue 3 and React

  Introduces `@mission-platform/forge`, a tiny dependency-free runtime whose classic JSX factory (`h`) builds a
  framework-neutral element tree, plus `./react` and
  `./vue` adapters (`toReactComponent` / `toVueComponent`) that map that tree onto
  `React.createElement` or Vue's `h` at render time — a hand-rolled alternative to build-time compilers like Mitosis.

  Also adds `@mission-platform/components`, a reference consumer that authors
  `BaseBadge` and `BaseButton` once and ships them as both Vue 3 and React components via the `./react` and `./vue`
  subpath exports.

- edb785f: add scoped-slot (render-prop) support and migrate the self-contained Data components to write-once JSX

  `@mission-platform/forge` gains a `MpRenderProperty<Scope>` type and the neutral
  `<Slot>` element now accepts **scope props** (`<Slot name="row" item={item}
index={i} />`) so a write-once component can drive a **scoped slot**.

  `@mission-platform/vite-plugin-forge`'s two-stage compiler translates a scoped
  `<Slot>` to a Vue scoped slot (`slots.x?.(scope)`) and a React render-prop call (`properties.x?.(scope)`), reusing the
  existing named-slot path. Both emitters have a regression test.

  `@mission-platform/components` gains three cross-framework `Components/Data`
  components, authored once in the neutral dialect and compiled straight to both React and Vue:

  - `BaseVirtualList` — windowed list with a scoped `row` slot.
  - `BaseVirtualLogViewer` — virtual-scrolling log with per-level colouring, a substring filter + matching-count
    toolbar, follow-tail, and an `onSelect`
    callback (composes `BaseTypography`).
  - `BaseVirtualTreeView` — flattened virtual tree with a built-in expand/collapse label (overridable via the scoped
    `row` slot) and `onSelect`/`onToggle`
    callbacks.

  Each ships its per-component folder (`.tsx`/`.module.scss`/`.stories.tsx`/
  `.spec.ts`/`index.ts`), categorised `JSX Components/Data/<Name>` stories, and cross-framework SSR specs. Vue-only
  features the neutral dialect cannot model (icons, scoped **default** slots, generics) are substituted with documented
  equivalents (a `●`/`▸`/`▾` glyph, named `row` scoped slots, `unknown` items).

- edb785f: add a `hasSlot` slot-presence helper and move the component content props to named slots

  `@mission-platform/forge` now exports `hasSlot('x')` — the neutral counterpart of Vue's `$slots.x` / a React
  `properties.x != null` check (an omitted name targets the default slot) — so a write-once component can render an
  optional wrapper region only when a slot is filled. The runtime adapters also gain
  `resolveSlotMarkers`, which resolves a forwarded `<Slot>` marker lexically against the forwarding component before
  handing children to a child component, so a component can forward its own slots into a child's slots.

  `@mission-platform/vite-plugin-forge` compiles `hasSlot('x')` to each framework's native presence check — Vue's
  `v-if="$slots.x"` (template path) / `!!slots.x`
  (render-closure path, pulling in `useSlots()`) and React's `properties.x != null`
  — and consumes the `hasSlot` import (never emitting it).

  `@mission-platform/components` migrates every component that exposed `MpChild`
  content props (`BaseCard`, `BaseDialog`, `BaseModal`, `BaseDrawer`, `BaseHero`,
  `BaseAlertBanner`, `BaseToast`, `BaseChatBubble`, `BaseInput`, `BaseTextarea`, the date/time pickers,
  `BaseFormWizard`, `BaseWindowPopout`, `BaseVerticalLayout`, …) to author those regions as named slots (`<Slot>`),
  gating optional regions with `hasSlot`. React consumers are unaffected (named slots are props), but Vue consumers must
  now pass this content through named slots (`<template #header>`)
  rather than props.

- 94f9acf: support passing content into a child component's named slot

  The runtime adapters now route a child element marked `slot="name"` into the matching named slot of the component
  being expanded — mirroring native Vue
  `<template #name>` / a React `name` prop. A new `collectSlottedChildren` helper partitions a parent's children by
  their `slot` marker (stripping the marker so no stray attribute is emitted) and both the React and Vue adapters fold
  the named groups into the child's props, with the unmarked children staying in the default slot. `MpProperties` gains
  a documented optional `slot?: string`.

- 94f9acf: add framework-neutral React-style hooks and an opt-in JSX globals typings export

  `@mission-platform/forge` now exposes neutral, render-once hooks (`useState`,
  `useRef`, `useEffect`, `useMemo`, `useCallback`) so neutral components can hold state and run effects;
  `@mission-platform/vite-plugin-forge` compiles them to React's own hooks or a Vue hook shim at build time. The package
  also ships the ambient JSX typings (previously duplicated in consumers) as an **opt-in**
  `@mission-platform/forge/jsx-globals` export — add it to a consumer's
  `compilerOptions.types` to wire the classic `h` JSX factory's global `JSX`
  namespace to `MpElement`.

- edb785f: ship per-component CSS + strongly tree-shakeable output, and add a framework-neutral named-`Slot` primitive

  `@mission-platform/components` now compiles to **per-component** JS **and**
  CSS chunks instead of one bundled `vue.js` / `react.js` + one combined
  `vue.css` / `react.css`. Each framework is emitted into its own
  `dist/<framework>/` subtree (`preserveModules` + `cssCodeSplit`), every component is its own ESM chunk that imports
  its own stylesheet, and the entries are thin re-export barrels — so a consumer importing a single component pulls in
  only that component's JS + CSS and tree-shakes the rest of the library (styles included). **Breaking:** the
  `./vue.css` and `./react.css` subpath exports are removed (component CSS now loads automatically with the component),
  and the
  `./vue` / `./react` exports resolve to `dist/<framework>/index.js`.

  `@mission-platform/vite-plugin-forge` gains `jsxComponentsCssImportPlugin`, which re-links each component's extracted
  CSS to its JS chunk (Vite library builds emit per-chunk CSS but do not inject the import), and its two-stage compiler
  now translates the new named-slot marker.

  `@mission-platform/forge` adds a framework-neutral named-slot primitive `Slot`
  (`<Slot name="…" />`, with the nameless `<Slot />` for the default slot, scoped slots, and fallback children). The
  runtime adapters resolve slots against a per-component scope, and the build-time compiler rewrites `<Slot name="x" />`
  to Vue's `slots.x?.()` and React's `properties.x`.

- edb785f: migrate the remaining layout components and emit scoped SCSS for the Vue build

  `@mission-platform/components` completes the `Components/Layout` migration:
  `BaseTypography`, `BaseHero`, `BaseDrawer`, `BaseNavbar`, `BaseVerticalLayout`, and `BaseWindowPopout` are now
  authored once in the neutral JSX dialect and compiled straight to both React and Vue. Cross-framework events use the
  **callback-prop** convention (`onOpenChange` / `onClose` / `onStartOpenChange` / …). Behaviours the neutral dialect
  does not model are substituted with documented equivalents: `BaseDrawer` renders an in-place `position: fixed` overlay
  (or a reactive `matchMedia`-driven `inline` panel) instead of a `<Teleport>` +
  `<Transition>`; `BaseWindowPopout` opens a real second window via `window.open`
  and shows a cloned-HTML snapshot instead of a portal; would-be slots become
  `MpChild` props; `BaseTypography` drops the `@floating-ui` truncate-popup. Each ships its own per-component
  `@layer mp.components` CSS, with co-located stories (`JSX Components/<Category>/…`) and cross-framework SSR specs.

  `@mission-platform/vite-plugin-forge`'s two-stage compiler now scopes styling per framework: the **React** build keeps
  the hashed **CSS Module**, while the **Vue**
  build inlines each component's `*.module.scss` as a scoped
  `<style scoped lang="scss">` block in the generated SFC (preserving the
  `@layer mp.components` wrapper) and rewrites every `styles['x']` /
  `styles[`x`]` read — including computed object keys — to its literal class name, so `classNames(...)` produces plain,
  `data-v-`-scoped classes.

  `@mission-platform/forge`'s `Slot` marker is a (never-invoked) function component so `<Slot name="…" />` type-checks
  under the classic `h` factory.

- 94f9acf: add the `Transition` (enter/leave), `Dynamic` (dynamic component), and context (`createContext`/`useContext`)
  neutral primitives, and verify recursive self-referencing components — the React/Vue adapters intercept the new
  markers for SSR, ship a CSS-class React `Transition`, and provide a `provide`/`inject`-backed Vue `createContext`/
  `useContext`
- edb785f: add a framework-neutral `Teleport`/portal primitive and migrate the popup overlays with CSS anchor
  positioning

  - `@mission-platform/forge`: add the neutral `<Teleport to="…">` portal element (`MpTeleportProperties`) — a
    compile-time/adapter marker like `Slot`. The runtime adapters render its children in place (SSR parity), and
    `@mission-platform/forge/react` now also exports a real `createPortal`-backed `Teleport` component (SSR-safe;
    resolves its target after mount).
  - `@mission-platform/vite-plugin-forge`: remap the neutral `Teleport` import per framework — Vue resolves it from the
    `vue` runtime (built-in `<Teleport>`) and React imports it from `@mission-platform/forge/react` (the `createPortal`
    wrapper) — while leaving the `<Teleport>` JSX usage intact.
  - `@mission-platform/components`: migrate the `Components/Overlays` popups `BaseTooltip`, `BasePopover`, and
    `BaseDropdown` from `@mission-platform/components` to the write-once neutral package. Each teleports its panel to
    `document.body` and positions it with the CSS Anchor Positioning API (`anchor-name`/`position-anchor`/
    `position-area` + `position-try-fallbacks` + `@position-try`, plus `anchor-size(width)` for the dropdown's
    trigger-width match) instead of `@floating-ui`; `<Transition>` is dropped. The popover's and dropdown's compound
    (`-start`/`-end`) placements use **fully-logical** `position-area` values (e.g. `block-end span-inline-end`) —
    mixing a physical side keyword with a logical span (`bottom span-inline-end`) is an invalid value that browsers
    silently drop, which would leave the teleported panel un-anchored at its static position. The modal overlays
    (`BaseDialog`/`BaseModal`) remain Vue-only.

- 94f9acf: add explicit per-phase transition-class props for scoped (non-global) transitions

  `<Transition>` and `<TransitionGroup>` now accept explicit `enterFromClass` /
  `enterActiveClass` / `enterToClass` / `leaveFromClass` / `leaveActiveClass` /
  `leaveToClass` props (plus the existing `moveClass`), each overriding the
  `<name>`-derived default for one phase and mirroring Vue's built-in class props. Passing hashed CSS-Module class names
  keeps a component's enter/leave styling **scoped** instead of forcing a global `:global(.<name>-…)` rule. The React
  CSS-class driver applies the given classes verbatim (falling back to the
  `<name>`-derived class for any phase left unset) and Vue's native transition does the same, so the cross-framework
  behaviour stays identical.

- 94f9acf: add the `TransitionGroup` neutral primitive (the keyed-list counterpart of `Transition`) — the React/Vue
  adapters intercept the marker for SSR (children rendered in place) and the React build ships a CSS-class group driver
  (per-item enter/leave + FLIP move, applied to DOM-element children), mirroring Vue's built-in `<TransitionGroup>`

### Patch Changes

- 94f9acf: allow array children in any position in the neutral JSX child typing

  The `jsx-globals` `IntrinsicElements` children type now accepts a nested array
  (`MpChild | readonly (MpChild | readonly MpChild[])[]`) so a `{items.map(…)}`
  list can sit **alongside** other children (e.g. a header element next to a list)
  rather than only as the sole child. This is type-safe because the `h` factory already flattens nested arrays
  recursively, and unblocks components like
  `BaseTabs` that render a list of panels next to a tab bar.

- ca1d98b: reformat sources with updated prettier print width and import ordering
- d39b6fc: add per-workspace reference documentation and refresh llms.txt/README metadata

## 0.2.0

### Minor Changes

- edb785f: add a framework-neutral `classNames` helper and move component CSS Modules to the `mp.components` layer

  `@mission-platform/forge` now exports a `classNames(...values)` helper (and its
  `ClassValue` type) for assembling class names the same way on every framework from the string (`'a b'`), object
  (`{ 'class': boolean }`), and array (`['class']`) forms — falsy entries are dropped and duplicates de-duplicated.

  `@mission-platform/vite-plugin-forge`'s two-stage compiler now (1) preserves neutral framework-agnostic value imports
  such as `classNames` verbatim (instead of translating them like `h`/the hooks), and (2) carries each component's own
  relative stylesheet imports (CSS Modules and bare CSS) onto both the React and Vue generated source trees, so a
  neutral component can own and ship its own CSS.

  `@mission-platform/components`' co-located `.module.scss` files are now real CSS Modules whose rules live in the
  shared `@layer mp.components` cascade layer with no `:global`. The styled components (`BaseBadge`, `BaseButton`,
  `BaseSeparator`) own their styling via the hashed class map + `classNames`, and the package now ships that CSS through
  new `./vue.css` and `./react.css`
  exports.

- edb785f: add the platform-owned `className={…}` JSX attribute for class management

  Neutral components now drive dynamic classes with a `className={…}` attribute (reserving the plain `class="…"` for
  static strings) instead of calling the
  `classNames` helper inline — the author never imports the helper. The canonical value is an array holding the same
  arguments the helper accepts.

  `@mission-platform/vite-plugin-forge`'s two-stage compiler owns the transform: on React an array value collapses to a
  `className={classNames(…)}` string call (re-injecting the neutral `classNames` import), while any other value passes
  through as `className`; on Vue it maps onto the native `class` binding, which understands the array/object forms (no
  helper needed). `@mission-platform/forge`'s
  `./react` and `./vue` runtime adapters apply the same mapping at render time so the ad-hoc/SSR output matches the
  compiled output. The `classNames(...values)`
  helper is still exported for the rare precompute and `h(tag, { class: … })`
  object form.

  `@mission-platform/components` and `@mission-platform/icons` migrate their components' `class={…}` attributes to
  `className={…}` accordingly.

- edb785f: migrate `BaseApplicationLayout` to the write-once jsx-components library

  `@mission-platform/components` gains `BaseApplicationLayout` (public
  `ApplicationLayout`) — the top-level application shell (status banner, header, scrollable content, footer) authored
  once in the neutral JSX dialect and compiled straight to both React and Vue by `@mission-platform/vite-plugin-forge`.
  It is the first migrated component to use the framework-neutral **named-slot**
  primitive (`<Slot name="status" | "navbar" | "content" | "footer" />`), derives the status banner's colour/ARIA role
  from `statusLevel`, and ships its own per-component CSS (`@layer mp.components`). Co-located stories
  (`JSX Components/Layout/BaseApplicationLayout`) and cross-framework SSR specs are included.

  `@mission-platform/forge`'s `Slot` marker is now a (never-invoked) function component instead of a `unique symbol`, so
  `<Slot name="…" />` type-checks as a JSX element under the classic `h` factory. The runtime adapters still intercept
  it by identity (`type === Slot`) and the build-time compiler still rewrites it away, so behaviour is unchanged.

- edb785f: add a write-once JSX layer that renders on both Vue 3 and React

  Introduces `@mission-platform/forge`, a tiny dependency-free runtime whose classic JSX factory (`h`) builds a
  framework-neutral element tree, plus `./react` and
  `./vue` adapters (`toReactComponent` / `toVueComponent`) that map that tree onto
  `React.createElement` or Vue's `h` at render time — a hand-rolled alternative to build-time compilers like Mitosis.

  Also adds `@mission-platform/components`, a reference consumer that authors
  `BaseBadge` and `BaseButton` once and ships them as both Vue 3 and React components via the `./react` and `./vue`
  subpath exports.

- edb785f: add scoped-slot (render-prop) support and migrate the self-contained Data components to write-once JSX

  `@mission-platform/forge` gains a `MpRenderProperty<Scope>` type and the neutral
  `<Slot>` element now accepts **scope props** (`<Slot name="row" item={item}
index={i} />`) so a write-once component can drive a **scoped slot**.

  `@mission-platform/vite-plugin-forge`'s two-stage compiler translates a scoped
  `<Slot>` to a Vue scoped slot (`slots.x?.(scope)`) and a React render-prop call (`properties.x?.(scope)`), reusing the
  existing named-slot path. Both emitters have a regression test.

  `@mission-platform/components` gains three cross-framework `Components/Data`
  components, authored once in the neutral dialect and compiled straight to both React and Vue:

  - `BaseVirtualList` — windowed list with a scoped `row` slot.
  - `BaseVirtualLogViewer` — virtual-scrolling log with per-level colouring, a substring filter + matching-count
    toolbar, follow-tail, and an `onSelect`
    callback (composes `BaseTypography`).
  - `BaseVirtualTreeView` — flattened virtual tree with a built-in expand/collapse label (overridable via the scoped
    `row` slot) and `onSelect`/`onToggle`
    callbacks.

  Each ships its per-component folder (`.tsx`/`.module.scss`/`.stories.tsx`/
  `.spec.ts`/`index.ts`), categorised `JSX Components/Data/<Name>` stories, and cross-framework SSR specs. Vue-only
  features the neutral dialect cannot model (icons, scoped **default** slots, generics) are substituted with documented
  equivalents (a `●`/`▸`/`▾` glyph, named `row` scoped slots, `unknown` items).

- edb785f: add a `hasSlot` slot-presence helper and move the component content props to named slots

  `@mission-platform/forge` now exports `hasSlot('x')` — the neutral counterpart of Vue's `$slots.x` / a React
  `properties.x != null` check (an omitted name targets the default slot) — so a write-once component can render an
  optional wrapper region only when a slot is filled. The runtime adapters also gain
  `resolveSlotMarkers`, which resolves a forwarded `<Slot>` marker lexically against the forwarding component before
  handing children to a child component, so a component can forward its own slots into a child's slots.

  `@mission-platform/vite-plugin-forge` compiles `hasSlot('x')` to each framework's native presence check — Vue's
  `v-if="$slots.x"` (template path) / `!!slots.x`
  (render-closure path, pulling in `useSlots()`) and React's `properties.x != null`
  — and consumes the `hasSlot` import (never emitting it).

  `@mission-platform/components` migrates every component that exposed `MpChild`
  content props (`BaseCard`, `BaseDialog`, `BaseModal`, `BaseDrawer`, `BaseHero`,
  `BaseAlertBanner`, `BaseToast`, `BaseChatBubble`, `BaseInput`, `BaseTextarea`, the date/time pickers,
  `BaseFormWizard`, `BaseWindowPopout`, `BaseVerticalLayout`, …) to author those regions as named slots (`<Slot>`),
  gating optional regions with `hasSlot`. React consumers are unaffected (named slots are props), but Vue consumers must
  now pass this content through named slots (`<template #header>`)
  rather than props.

- 94f9acf: support passing content into a child component's named slot

  The runtime adapters now route a child element marked `slot="name"` into the matching named slot of the component
  being expanded — mirroring native Vue
  `<template #name>` / a React `name` prop. A new `collectSlottedChildren` helper partitions a parent's children by
  their `slot` marker (stripping the marker so no stray attribute is emitted) and both the React and Vue adapters fold
  the named groups into the child's props, with the unmarked children staying in the default slot. `MpProperties` gains
  a documented optional `slot?: string`.

- 94f9acf: add framework-neutral React-style hooks and an opt-in JSX globals typings export

  `@mission-platform/forge` now exposes neutral, render-once hooks (`useState`,
  `useRef`, `useEffect`, `useMemo`, `useCallback`) so neutral components can hold state and run effects;
  `@mission-platform/vite-plugin-forge` compiles them to React's own hooks or a Vue hook shim at build time. The package
  also ships the ambient JSX typings (previously duplicated in consumers) as an **opt-in**
  `@mission-platform/forge/jsx-globals` export — add it to a consumer's
  `compilerOptions.types` to wire the classic `h` JSX factory's global `JSX`
  namespace to `MpElement`.

- edb785f: ship per-component CSS + strongly tree-shakeable output, and add a framework-neutral named-`Slot` primitive

  `@mission-platform/components` now compiles to **per-component** JS **and**
  CSS chunks instead of one bundled `vue.js` / `react.js` + one combined
  `vue.css` / `react.css`. Each framework is emitted into its own
  `dist/<framework>/` subtree (`preserveModules` + `cssCodeSplit`), every component is its own ESM chunk that imports
  its own stylesheet, and the entries are thin re-export barrels — so a consumer importing a single component pulls in
  only that component's JS + CSS and tree-shakes the rest of the library (styles included). **Breaking:** the
  `./vue.css` and `./react.css` subpath exports are removed (component CSS now loads automatically with the component),
  and the
  `./vue` / `./react` exports resolve to `dist/<framework>/index.js`.

  `@mission-platform/vite-plugin-forge` gains `jsxComponentsCssImportPlugin`, which re-links each component's extracted
  CSS to its JS chunk (Vite library builds emit per-chunk CSS but do not inject the import), and its two-stage compiler
  now translates the new named-slot marker.

  `@mission-platform/forge` adds a framework-neutral named-slot primitive `Slot`
  (`<Slot name="…" />`, with the nameless `<Slot />` for the default slot, scoped slots, and fallback children). The
  runtime adapters resolve slots against a per-component scope, and the build-time compiler rewrites `<Slot name="x" />`
  to Vue's `slots.x?.()` and React's `properties.x`.

- edb785f: migrate the remaining layout components and emit scoped SCSS for the Vue build

  `@mission-platform/components` completes the `Components/Layout` migration:
  `BaseTypography`, `BaseHero`, `BaseDrawer`, `BaseNavbar`, `BaseVerticalLayout`, and `BaseWindowPopout` are now
  authored once in the neutral JSX dialect and compiled straight to both React and Vue. Cross-framework events use the
  **callback-prop** convention (`onOpenChange` / `onClose` / `onStartOpenChange` / …). Behaviours the neutral dialect
  does not model are substituted with documented equivalents: `BaseDrawer` renders an in-place `position: fixed` overlay
  (or a reactive `matchMedia`-driven `inline` panel) instead of a `<Teleport>` +
  `<Transition>`; `BaseWindowPopout` opens a real second window via `window.open`
  and shows a cloned-HTML snapshot instead of a portal; would-be slots become
  `MpChild` props; `BaseTypography` drops the `@floating-ui` truncate-popup. Each ships its own per-component
  `@layer mp.components` CSS, with co-located stories (`JSX Components/<Category>/…`) and cross-framework SSR specs.

  `@mission-platform/vite-plugin-forge`'s two-stage compiler now scopes styling per framework: the **React** build keeps
  the hashed **CSS Module**, while the **Vue**
  build inlines each component's `*.module.scss` as a scoped
  `<style scoped lang="scss">` block in the generated SFC (preserving the
  `@layer mp.components` wrapper) and rewrites every `styles['x']` /
  `styles[`x`]` read — including computed object keys — to its literal class name, so `classNames(...)` produces plain,
  `data-v-`-scoped classes.

  `@mission-platform/forge`'s `Slot` marker is a (never-invoked) function component so `<Slot name="…" />` type-checks
  under the classic `h` factory.

- 94f9acf: add the `Transition` (enter/leave), `Dynamic` (dynamic component), and context (`createContext`/`useContext`)
  neutral primitives, and verify recursive self-referencing components — the React/Vue adapters intercept the new
  markers for SSR, ship a CSS-class React `Transition`, and provide a `provide`/`inject`-backed Vue `createContext`/
  `useContext`
- edb785f: add a framework-neutral `Teleport`/portal primitive and migrate the popup overlays with CSS anchor
  positioning

  - `@mission-platform/forge`: add the neutral `<Teleport to="…">` portal element (`MpTeleportProperties`) — a
    compile-time/adapter marker like `Slot`. The runtime adapters render its children in place (SSR parity), and
    `@mission-platform/forge/react` now also exports a real `createPortal`-backed `Teleport` component (SSR-safe;
    resolves its target after mount).
  - `@mission-platform/vite-plugin-forge`: remap the neutral `Teleport` import per framework — Vue resolves it from the
    `vue` runtime (built-in `<Teleport>`) and React imports it from `@mission-platform/forge/react` (the `createPortal`
    wrapper) — while leaving the `<Teleport>` JSX usage intact.
  - `@mission-platform/components`: migrate the `Components/Overlays` popups `BaseTooltip`, `BasePopover`, and
    `BaseDropdown` from `@mission-platform/components` to the write-once neutral package. Each teleports its panel to
    `document.body` and positions it with the CSS Anchor Positioning API (`anchor-name`/`position-anchor`/
    `position-area` + `position-try-fallbacks` + `@position-try`, plus `anchor-size(width)` for the dropdown's
    trigger-width match) instead of `@floating-ui`; `<Transition>` is dropped. The popover's and dropdown's compound
    (`-start`/`-end`) placements use **fully-logical** `position-area` values (e.g. `block-end span-inline-end`) —
    mixing a physical side keyword with a logical span (`bottom span-inline-end`) is an invalid value that browsers
    silently drop, which would leave the teleported panel un-anchored at its static position. The modal overlays
    (`BaseDialog`/`BaseModal`) remain Vue-only.

- 94f9acf: add explicit per-phase transition-class props for scoped (non-global) transitions

  `<Transition>` and `<TransitionGroup>` now accept explicit `enterFromClass` /
  `enterActiveClass` / `enterToClass` / `leaveFromClass` / `leaveActiveClass` /
  `leaveToClass` props (plus the existing `moveClass`), each overriding the
  `<name>`-derived default for one phase and mirroring Vue's built-in class props. Passing hashed CSS-Module class names
  keeps a component's enter/leave styling **scoped** instead of forcing a global `:global(.<name>-…)` rule. The React
  CSS-class driver applies the given classes verbatim (falling back to the
  `<name>`-derived class for any phase left unset) and Vue's native transition does the same, so the cross-framework
  behaviour stays identical.

- 94f9acf: add the `TransitionGroup` neutral primitive (the keyed-list counterpart of `Transition`) — the React/Vue
  adapters intercept the marker for SSR (children rendered in place) and the React build ships a CSS-class group driver
  (per-item enter/leave + FLIP move, applied to DOM-element children), mirroring Vue's built-in `<TransitionGroup>`

### Patch Changes

- 94f9acf: allow array children in any position in the neutral JSX child typing

  The `jsx-globals` `IntrinsicElements` children type now accepts a nested array
  (`MpChild | readonly (MpChild | readonly MpChild[])[]`) so a `{items.map(…)}`
  list can sit **alongside** other children (e.g. a header element next to a list)
  rather than only as the sole child. This is type-safe because the `h` factory already flattens nested arrays
  recursively, and unblocks components like
  `BaseTabs` that render a list of panels next to a tab bar.

- ca1d98b: reformat sources with updated prettier print width and import ordering
- d39b6fc: add per-workspace reference documentation and refresh llms.txt/README metadata

## 0.2.0

### Minor Changes

- edb785f: add a framework-neutral `classNames` helper and move component CSS Modules to the `mp.components` layer

  `@mission-platform/forge` now exports a `classNames(...values)` helper (and its
  `ClassValue` type) for assembling class names the same way on every framework from the string (`'a b'`), object
  (`{ 'class': boolean }`), and array (`['class']`) forms — falsy entries are dropped and duplicates de-duplicated.

  `@mission-platform/vite-plugin-forge`'s two-stage compiler now (1) preserves neutral framework-agnostic value imports
  such as `classNames` verbatim (instead of translating them like `h`/the hooks), and (2) carries each component's own
  relative stylesheet imports (CSS Modules and bare CSS) onto both the React and Vue generated source trees, so a
  neutral component can own and ship its own CSS.

  `@mission-platform/components`' co-located `.module.scss` files are now real CSS Modules whose rules live in the
  shared `@layer mp.components` cascade layer with no `:global`. The styled components (`BaseBadge`, `BaseButton`,
  `BaseSeparator`) own their styling via the hashed class map + `classNames`, and the package now ships that CSS through
  new `./vue.css` and `./react.css`
  exports.

- edb785f: add the platform-owned `className={…}` JSX attribute for class management

  Neutral components now drive dynamic classes with a `className={…}` attribute (reserving the plain `class="…"` for
  static strings) instead of calling the
  `classNames` helper inline — the author never imports the helper. The canonical value is an array holding the same
  arguments the helper accepts.

  `@mission-platform/vite-plugin-forge`'s two-stage compiler owns the transform: on React an array value collapses to a
  `className={classNames(…)}` string call (re-injecting the neutral `classNames` import), while any other value passes
  through as `className`; on Vue it maps onto the native `class` binding, which understands the array/object forms (no
  helper needed). `@mission-platform/forge`'s
  `./react` and `./vue` runtime adapters apply the same mapping at render time so the ad-hoc/SSR output matches the
  compiled output. The `classNames(...values)`
  helper is still exported for the rare precompute and `h(tag, { class: … })`
  object form.

  `@mission-platform/components` and `@mission-platform/icons` migrate their components' `class={…}` attributes to
  `className={…}` accordingly.

- edb785f: migrate `BaseApplicationLayout` to the write-once jsx-components library

  `@mission-platform/components` gains `BaseApplicationLayout` (public
  `ApplicationLayout`) — the top-level application shell (status banner, header, scrollable content, footer) authored
  once in the neutral JSX dialect and compiled straight to both React and Vue by `@mission-platform/vite-plugin-forge`.
  It is the first migrated component to use the framework-neutral **named-slot**
  primitive (`<Slot name="status" | "navbar" | "content" | "footer" />`), derives the status banner's colour/ARIA role
  from `statusLevel`, and ships its own per-component CSS (`@layer mp.components`). Co-located stories
  (`JSX Components/Layout/BaseApplicationLayout`) and cross-framework SSR specs are included.

  `@mission-platform/forge`'s `Slot` marker is now a (never-invoked) function component instead of a `unique symbol`, so
  `<Slot name="…" />` type-checks as a JSX element under the classic `h` factory. The runtime adapters still intercept
  it by identity (`type === Slot`) and the build-time compiler still rewrites it away, so behaviour is unchanged.

- edb785f: add a write-once JSX layer that renders on both Vue 3 and React

  Introduces `@mission-platform/forge`, a tiny dependency-free runtime whose classic JSX factory (`h`) builds a
  framework-neutral element tree, plus `./react` and
  `./vue` adapters (`toReactComponent` / `toVueComponent`) that map that tree onto
  `React.createElement` or Vue's `h` at render time — a hand-rolled alternative to build-time compilers like Mitosis.

  Also adds `@mission-platform/components`, a reference consumer that authors
  `BaseBadge` and `BaseButton` once and ships them as both Vue 3 and React components via the `./react` and `./vue`
  subpath exports.

- edb785f: add scoped-slot (render-prop) support and migrate the self-contained Data components to write-once JSX

  `@mission-platform/forge` gains a `MpRenderProperty<Scope>` type and the neutral
  `<Slot>` element now accepts **scope props** (`<Slot name="row" item={item}
index={i} />`) so a write-once component can drive a **scoped slot**.

  `@mission-platform/vite-plugin-forge`'s two-stage compiler translates a scoped
  `<Slot>` to a Vue scoped slot (`slots.x?.(scope)`) and a React render-prop call (`properties.x?.(scope)`), reusing the
  existing named-slot path. Both emitters have a regression test.

  `@mission-platform/components` gains three cross-framework `Components/Data`
  components, authored once in the neutral dialect and compiled straight to both React and Vue:

  - `BaseVirtualList` — windowed list with a scoped `row` slot.
  - `BaseVirtualLogViewer` — virtual-scrolling log with per-level colouring, a substring filter + matching-count
    toolbar, follow-tail, and an `onSelect`
    callback (composes `BaseTypography`).
  - `BaseVirtualTreeView` — flattened virtual tree with a built-in expand/collapse label (overridable via the scoped
    `row` slot) and `onSelect`/`onToggle`
    callbacks.

  Each ships its per-component folder (`.tsx`/`.module.scss`/`.stories.tsx`/
  `.spec.ts`/`index.ts`), categorised `JSX Components/Data/<Name>` stories, and cross-framework SSR specs. Vue-only
  features the neutral dialect cannot model (icons, scoped **default** slots, generics) are substituted with documented
  equivalents (a `●`/`▸`/`▾` glyph, named `row` scoped slots, `unknown` items).

- edb785f: add a `hasSlot` slot-presence helper and move the component content props to named slots

  `@mission-platform/forge` now exports `hasSlot('x')` — the neutral counterpart of Vue's `$slots.x` / a React
  `properties.x != null` check (an omitted name targets the default slot) — so a write-once component can render an
  optional wrapper region only when a slot is filled. The runtime adapters also gain
  `resolveSlotMarkers`, which resolves a forwarded `<Slot>` marker lexically against the forwarding component before
  handing children to a child component, so a component can forward its own slots into a child's slots.

  `@mission-platform/vite-plugin-forge` compiles `hasSlot('x')` to each framework's native presence check — Vue's
  `v-if="$slots.x"` (template path) / `!!slots.x`
  (render-closure path, pulling in `useSlots()`) and React's `properties.x != null`
  — and consumes the `hasSlot` import (never emitting it).

  `@mission-platform/components` migrates every component that exposed `MpChild`
  content props (`BaseCard`, `BaseDialog`, `BaseModal`, `BaseDrawer`, `BaseHero`,
  `BaseAlertBanner`, `BaseToast`, `BaseChatBubble`, `BaseInput`, `BaseTextarea`, the date/time pickers,
  `BaseFormWizard`, `BaseWindowPopout`, `BaseVerticalLayout`, …) to author those regions as named slots (`<Slot>`),
  gating optional regions with `hasSlot`. React consumers are unaffected (named slots are props), but Vue consumers must
  now pass this content through named slots (`<template #header>`)
  rather than props.

- 94f9acf: support passing content into a child component's named slot

  The runtime adapters now route a child element marked `slot="name"` into the matching named slot of the component
  being expanded — mirroring native Vue
  `<template #name>` / a React `name` prop. A new `collectSlottedChildren` helper partitions a parent's children by
  their `slot` marker (stripping the marker so no stray attribute is emitted) and both the React and Vue adapters fold
  the named groups into the child's props, with the unmarked children staying in the default slot. `MpProperties` gains
  a documented optional `slot?: string`.

- 94f9acf: add framework-neutral React-style hooks and an opt-in JSX globals typings export

  `@mission-platform/forge` now exposes neutral, render-once hooks (`useState`,
  `useRef`, `useEffect`, `useMemo`, `useCallback`) so neutral components can hold state and run effects;
  `@mission-platform/vite-plugin-forge` compiles them to React's own hooks or a Vue hook shim at build time. The package
  also ships the ambient JSX typings (previously duplicated in consumers) as an **opt-in**
  `@mission-platform/forge/jsx-globals` export — add it to a consumer's
  `compilerOptions.types` to wire the classic `h` JSX factory's global `JSX`
  namespace to `MpElement`.

- edb785f: ship per-component CSS + strongly tree-shakeable output, and add a framework-neutral named-`Slot` primitive

  `@mission-platform/components` now compiles to **per-component** JS **and**
  CSS chunks instead of one bundled `vue.js` / `react.js` + one combined
  `vue.css` / `react.css`. Each framework is emitted into its own
  `dist/<framework>/` subtree (`preserveModules` + `cssCodeSplit`), every component is its own ESM chunk that imports
  its own stylesheet, and the entries are thin re-export barrels — so a consumer importing a single component pulls in
  only that component's JS + CSS and tree-shakes the rest of the library (styles included). **Breaking:** the
  `./vue.css` and `./react.css` subpath exports are removed (component CSS now loads automatically with the component),
  and the
  `./vue` / `./react` exports resolve to `dist/<framework>/index.js`.

  `@mission-platform/vite-plugin-forge` gains `jsxComponentsCssImportPlugin`, which re-links each component's extracted
  CSS to its JS chunk (Vite library builds emit per-chunk CSS but do not inject the import), and its two-stage compiler
  now translates the new named-slot marker.

  `@mission-platform/forge` adds a framework-neutral named-slot primitive `Slot`
  (`<Slot name="…" />`, with the nameless `<Slot />` for the default slot, scoped slots, and fallback children). The
  runtime adapters resolve slots against a per-component scope, and the build-time compiler rewrites `<Slot name="x" />`
  to Vue's `slots.x?.()` and React's `properties.x`.

- edb785f: migrate the remaining layout components and emit scoped SCSS for the Vue build

  `@mission-platform/components` completes the `Components/Layout` migration:
  `BaseTypography`, `BaseHero`, `BaseDrawer`, `BaseNavbar`, `BaseVerticalLayout`, and `BaseWindowPopout` are now
  authored once in the neutral JSX dialect and compiled straight to both React and Vue. Cross-framework events use the
  **callback-prop** convention (`onOpenChange` / `onClose` / `onStartOpenChange` / …). Behaviours the neutral dialect
  does not model are substituted with documented equivalents: `BaseDrawer` renders an in-place `position: fixed` overlay
  (or a reactive `matchMedia`-driven `inline` panel) instead of a `<Teleport>` +
  `<Transition>`; `BaseWindowPopout` opens a real second window via `window.open`
  and shows a cloned-HTML snapshot instead of a portal; would-be slots become
  `MpChild` props; `BaseTypography` drops the `@floating-ui` truncate-popup. Each ships its own per-component
  `@layer mp.components` CSS, with co-located stories (`JSX Components/<Category>/…`) and cross-framework SSR specs.

  `@mission-platform/vite-plugin-forge`'s two-stage compiler now scopes styling per framework: the **React** build keeps
  the hashed **CSS Module**, while the **Vue**
  build inlines each component's `*.module.scss` as a scoped
  `<style scoped lang="scss">` block in the generated SFC (preserving the
  `@layer mp.components` wrapper) and rewrites every `styles['x']` /
  `styles[`x`]` read — including computed object keys — to its literal class name, so `classNames(...)` produces plain,
  `data-v-`-scoped classes.

  `@mission-platform/forge`'s `Slot` marker is a (never-invoked) function component so `<Slot name="…" />` type-checks
  under the classic `h` factory.

- 94f9acf: add the `Transition` (enter/leave), `Dynamic` (dynamic component), and context (`createContext`/`useContext`)
  neutral primitives, and verify recursive self-referencing components — the React/Vue adapters intercept the new
  markers for SSR, ship a CSS-class React `Transition`, and provide a `provide`/`inject`-backed Vue `createContext`/
  `useContext`
- edb785f: add a framework-neutral `Teleport`/portal primitive and migrate the popup overlays with CSS anchor
  positioning

  - `@mission-platform/forge`: add the neutral `<Teleport to="…">` portal element (`MpTeleportProperties`) — a
    compile-time/adapter marker like `Slot`. The runtime adapters render its children in place (SSR parity), and
    `@mission-platform/forge/react` now also exports a real `createPortal`-backed `Teleport` component (SSR-safe;
    resolves its target after mount).
  - `@mission-platform/vite-plugin-forge`: remap the neutral `Teleport` import per framework — Vue resolves it from the
    `vue` runtime (built-in `<Teleport>`) and React imports it from `@mission-platform/forge/react` (the `createPortal`
    wrapper) — while leaving the `<Teleport>` JSX usage intact.
  - `@mission-platform/components`: migrate the `Components/Overlays` popups `BaseTooltip`, `BasePopover`, and
    `BaseDropdown` from `@mission-platform/components` to the write-once neutral package. Each teleports its panel to
    `document.body` and positions it with the CSS Anchor Positioning API (`anchor-name`/`position-anchor`/
    `position-area` + `position-try-fallbacks` + `@position-try`, plus `anchor-size(width)` for the dropdown's
    trigger-width match) instead of `@floating-ui`; `<Transition>` is dropped. The popover's and dropdown's compound
    (`-start`/`-end`) placements use **fully-logical** `position-area` values (e.g. `block-end span-inline-end`) —
    mixing a physical side keyword with a logical span (`bottom span-inline-end`) is an invalid value that browsers
    silently drop, which would leave the teleported panel un-anchored at its static position. The modal overlays
    (`BaseDialog`/`BaseModal`) remain Vue-only.

- 94f9acf: add explicit per-phase transition-class props for scoped (non-global) transitions

  `<Transition>` and `<TransitionGroup>` now accept explicit `enterFromClass` /
  `enterActiveClass` / `enterToClass` / `leaveFromClass` / `leaveActiveClass` /
  `leaveToClass` props (plus the existing `moveClass`), each overriding the
  `<name>`-derived default for one phase and mirroring Vue's built-in class props. Passing hashed CSS-Module class names
  keeps a component's enter/leave styling **scoped** instead of forcing a global `:global(.<name>-…)` rule. The React
  CSS-class driver applies the given classes verbatim (falling back to the
  `<name>`-derived class for any phase left unset) and Vue's native transition does the same, so the cross-framework
  behaviour stays identical.

- 94f9acf: add the `TransitionGroup` neutral primitive (the keyed-list counterpart of `Transition`) — the React/Vue
  adapters intercept the marker for SSR (children rendered in place) and the React build ships a CSS-class group driver
  (per-item enter/leave + FLIP move, applied to DOM-element children), mirroring Vue's built-in `<TransitionGroup>`

### Patch Changes

- 94f9acf: allow array children in any position in the neutral JSX child typing

  The `jsx-globals` `IntrinsicElements` children type now accepts a nested array
  (`MpChild | readonly (MpChild | readonly MpChild[])[]`) so a `{items.map(…)}`
  list can sit **alongside** other children (e.g. a header element next to a list)
  rather than only as the sole child. This is type-safe because the `h` factory already flattens nested arrays
  recursively, and unblocks components like
  `BaseTabs` that render a list of panels next to a tab bar.

- ca1d98b: reformat sources with updated prettier print width and import ordering
- d39b6fc: add per-workspace reference documentation and refresh llms.txt/README metadata

## 0.2.0

### Minor Changes

- edb785f: add a framework-neutral `classNames` helper and move component CSS Modules to the `mp.components` layer

  `@mission-platform/forge` now exports a `classNames(...values)` helper (and its
  `ClassValue` type) for assembling class names the same way on every framework from the string (`'a b'`), object
  (`{ 'class': boolean }`), and array (`['class']`) forms — falsy entries are dropped and duplicates de-duplicated.

  `@mission-platform/vite-plugin-forge`'s two-stage compiler now (1) preserves neutral framework-agnostic value imports
  such as `classNames` verbatim (instead of translating them like `h`/the hooks), and (2) carries each component's own
  relative stylesheet imports (CSS Modules and bare CSS) onto both the React and Vue generated source trees, so a
  neutral component can own and ship its own CSS.

  `@mission-platform/components`' co-located `.module.scss` files are now real CSS Modules whose rules live in the
  shared `@layer mp.components` cascade layer with no `:global`. The styled components (`BaseBadge`, `BaseButton`,
  `BaseSeparator`) own their styling via the hashed class map + `classNames`, and the package now ships that CSS through
  new `./vue.css` and `./react.css`
  exports.

- edb785f: add the platform-owned `className={…}` JSX attribute for class management

  Neutral components now drive dynamic classes with a `className={…}` attribute (reserving the plain `class="…"` for
  static strings) instead of calling the
  `classNames` helper inline — the author never imports the helper. The canonical value is an array holding the same
  arguments the helper accepts.

  `@mission-platform/vite-plugin-forge`'s two-stage compiler owns the transform: on React an array value collapses to a
  `className={classNames(…)}` string call (re-injecting the neutral `classNames` import), while any other value passes
  through as `className`; on Vue it maps onto the native `class` binding, which understands the array/object forms (no
  helper needed). `@mission-platform/forge`'s
  `./react` and `./vue` runtime adapters apply the same mapping at render time so the ad-hoc/SSR output matches the
  compiled output. The `classNames(...values)`
  helper is still exported for the rare precompute and `h(tag, { class: … })`
  object form.

  `@mission-platform/components` and `@mission-platform/icons` migrate their components' `class={…}` attributes to
  `className={…}` accordingly.

- edb785f: migrate `BaseApplicationLayout` to the write-once jsx-components library

  `@mission-platform/components` gains `BaseApplicationLayout` (public
  `ApplicationLayout`) — the top-level application shell (status banner, header, scrollable content, footer) authored
  once in the neutral JSX dialect and compiled straight to both React and Vue by `@mission-platform/vite-plugin-forge`.
  It is the first migrated component to use the framework-neutral **named-slot**
  primitive (`<Slot name="status" | "navbar" | "content" | "footer" />`), derives the status banner's colour/ARIA role
  from `statusLevel`, and ships its own per-component CSS (`@layer mp.components`). Co-located stories
  (`JSX Components/Layout/BaseApplicationLayout`) and cross-framework SSR specs are included.

  `@mission-platform/forge`'s `Slot` marker is now a (never-invoked) function component instead of a `unique symbol`, so
  `<Slot name="…" />` type-checks as a JSX element under the classic `h` factory. The runtime adapters still intercept
  it by identity (`type === Slot`) and the build-time compiler still rewrites it away, so behaviour is unchanged.

- edb785f: add a write-once JSX layer that renders on both Vue 3 and React

  Introduces `@mission-platform/forge`, a tiny dependency-free runtime whose classic JSX factory (`h`) builds a
  framework-neutral element tree, plus `./react` and
  `./vue` adapters (`toReactComponent` / `toVueComponent`) that map that tree onto
  `React.createElement` or Vue's `h` at render time — a hand-rolled alternative to build-time compilers like Mitosis.

  Also adds `@mission-platform/components`, a reference consumer that authors
  `BaseBadge` and `BaseButton` once and ships them as both Vue 3 and React components via the `./react` and `./vue`
  subpath exports.

- edb785f: add scoped-slot (render-prop) support and migrate the self-contained Data components to write-once JSX

  `@mission-platform/forge` gains a `MpRenderProperty<Scope>` type and the neutral
  `<Slot>` element now accepts **scope props** (`<Slot name="row" item={item}
index={i} />`) so a write-once component can drive a **scoped slot**.

  `@mission-platform/vite-plugin-forge`'s two-stage compiler translates a scoped
  `<Slot>` to a Vue scoped slot (`slots.x?.(scope)`) and a React render-prop call (`properties.x?.(scope)`), reusing the
  existing named-slot path. Both emitters have a regression test.

  `@mission-platform/components` gains three cross-framework `Components/Data`
  components, authored once in the neutral dialect and compiled straight to both React and Vue:

  - `BaseVirtualList` — windowed list with a scoped `row` slot.
  - `BaseVirtualLogViewer` — virtual-scrolling log with per-level colouring, a substring filter + matching-count
    toolbar, follow-tail, and an `onSelect`
    callback (composes `BaseTypography`).
  - `BaseVirtualTreeView` — flattened virtual tree with a built-in expand/collapse label (overridable via the scoped
    `row` slot) and `onSelect`/`onToggle`
    callbacks.

  Each ships its per-component folder (`.tsx`/`.module.scss`/`.stories.tsx`/
  `.spec.ts`/`index.ts`), categorised `JSX Components/Data/<Name>` stories, and cross-framework SSR specs. Vue-only
  features the neutral dialect cannot model (icons, scoped **default** slots, generics) are substituted with documented
  equivalents (a `●`/`▸`/`▾` glyph, named `row` scoped slots, `unknown` items).

- edb785f: add a `hasSlot` slot-presence helper and move the component content props to named slots

  `@mission-platform/forge` now exports `hasSlot('x')` — the neutral counterpart of Vue's `$slots.x` / a React
  `properties.x != null` check (an omitted name targets the default slot) — so a write-once component can render an
  optional wrapper region only when a slot is filled. The runtime adapters also gain
  `resolveSlotMarkers`, which resolves a forwarded `<Slot>` marker lexically against the forwarding component before
  handing children to a child component, so a component can forward its own slots into a child's slots.

  `@mission-platform/vite-plugin-forge` compiles `hasSlot('x')` to each framework's native presence check — Vue's
  `v-if="$slots.x"` (template path) / `!!slots.x`
  (render-closure path, pulling in `useSlots()`) and React's `properties.x != null`
  — and consumes the `hasSlot` import (never emitting it).

  `@mission-platform/components` migrates every component that exposed `MpChild`
  content props (`BaseCard`, `BaseDialog`, `BaseModal`, `BaseDrawer`, `BaseHero`,
  `BaseAlertBanner`, `BaseToast`, `BaseChatBubble`, `BaseInput`, `BaseTextarea`, the date/time pickers,
  `BaseFormWizard`, `BaseWindowPopout`, `BaseVerticalLayout`, …) to author those regions as named slots (`<Slot>`),
  gating optional regions with `hasSlot`. React consumers are unaffected (named slots are props), but Vue consumers must
  now pass this content through named slots (`<template #header>`)
  rather than props.

- 94f9acf: support passing content into a child component's named slot

  The runtime adapters now route a child element marked `slot="name"` into the matching named slot of the component
  being expanded — mirroring native Vue
  `<template #name>` / a React `name` prop. A new `collectSlottedChildren` helper partitions a parent's children by
  their `slot` marker (stripping the marker so no stray attribute is emitted) and both the React and Vue adapters fold
  the named groups into the child's props, with the unmarked children staying in the default slot. `MpProperties` gains
  a documented optional `slot?: string`.

- 94f9acf: add framework-neutral React-style hooks and an opt-in JSX globals typings export

  `@mission-platform/forge` now exposes neutral, render-once hooks (`useState`,
  `useRef`, `useEffect`, `useMemo`, `useCallback`) so neutral components can hold state and run effects;
  `@mission-platform/vite-plugin-forge` compiles them to React's own hooks or a Vue hook shim at build time. The package
  also ships the ambient JSX typings (previously duplicated in consumers) as an **opt-in**
  `@mission-platform/forge/jsx-globals` export — add it to a consumer's
  `compilerOptions.types` to wire the classic `h` JSX factory's global `JSX`
  namespace to `MpElement`.

- edb785f: ship per-component CSS + strongly tree-shakeable output, and add a framework-neutral named-`Slot` primitive

  `@mission-platform/components` now compiles to **per-component** JS **and**
  CSS chunks instead of one bundled `vue.js` / `react.js` + one combined
  `vue.css` / `react.css`. Each framework is emitted into its own
  `dist/<framework>/` subtree (`preserveModules` + `cssCodeSplit`), every component is its own ESM chunk that imports
  its own stylesheet, and the entries are thin re-export barrels — so a consumer importing a single component pulls in
  only that component's JS + CSS and tree-shakes the rest of the library (styles included). **Breaking:** the
  `./vue.css` and `./react.css` subpath exports are removed (component CSS now loads automatically with the component),
  and the
  `./vue` / `./react` exports resolve to `dist/<framework>/index.js`.

  `@mission-platform/vite-plugin-forge` gains `jsxComponentsCssImportPlugin`, which re-links each component's extracted
  CSS to its JS chunk (Vite library builds emit per-chunk CSS but do not inject the import), and its two-stage compiler
  now translates the new named-slot marker.

  `@mission-platform/forge` adds a framework-neutral named-slot primitive `Slot`
  (`<Slot name="…" />`, with the nameless `<Slot />` for the default slot, scoped slots, and fallback children). The
  runtime adapters resolve slots against a per-component scope, and the build-time compiler rewrites `<Slot name="x" />`
  to Vue's `slots.x?.()` and React's `properties.x`.

- edb785f: migrate the remaining layout components and emit scoped SCSS for the Vue build

  `@mission-platform/components` completes the `Components/Layout` migration:
  `BaseTypography`, `BaseHero`, `BaseDrawer`, `BaseNavbar`, `BaseVerticalLayout`, and `BaseWindowPopout` are now
  authored once in the neutral JSX dialect and compiled straight to both React and Vue. Cross-framework events use the
  **callback-prop** convention (`onOpenChange` / `onClose` / `onStartOpenChange` / …). Behaviours the neutral dialect
  does not model are substituted with documented equivalents: `BaseDrawer` renders an in-place `position: fixed` overlay
  (or a reactive `matchMedia`-driven `inline` panel) instead of a `<Teleport>` +
  `<Transition>`; `BaseWindowPopout` opens a real second window via `window.open`
  and shows a cloned-HTML snapshot instead of a portal; would-be slots become
  `MpChild` props; `BaseTypography` drops the `@floating-ui` truncate-popup. Each ships its own per-component
  `@layer mp.components` CSS, with co-located stories (`JSX Components/<Category>/…`) and cross-framework SSR specs.

  `@mission-platform/vite-plugin-forge`'s two-stage compiler now scopes styling per framework: the **React** build keeps
  the hashed **CSS Module**, while the **Vue**
  build inlines each component's `*.module.scss` as a scoped
  `<style scoped lang="scss">` block in the generated SFC (preserving the
  `@layer mp.components` wrapper) and rewrites every `styles['x']` /
  `styles[`x`]` read — including computed object keys — to its literal class name, so `classNames(...)` produces plain,
  `data-v-`-scoped classes.

  `@mission-platform/forge`'s `Slot` marker is a (never-invoked) function component so `<Slot name="…" />` type-checks
  under the classic `h` factory.

- 94f9acf: add the `Transition` (enter/leave), `Dynamic` (dynamic component), and context (`createContext`/`useContext`)
  neutral primitives, and verify recursive self-referencing components — the React/Vue adapters intercept the new
  markers for SSR, ship a CSS-class React `Transition`, and provide a `provide`/`inject`-backed Vue `createContext`/
  `useContext`
- edb785f: add a framework-neutral `Teleport`/portal primitive and migrate the popup overlays with CSS anchor
  positioning

  - `@mission-platform/forge`: add the neutral `<Teleport to="…">` portal element (`MpTeleportProperties`) — a
    compile-time/adapter marker like `Slot`. The runtime adapters render its children in place (SSR parity), and
    `@mission-platform/forge/react` now also exports a real `createPortal`-backed `Teleport` component (SSR-safe;
    resolves its target after mount).
  - `@mission-platform/vite-plugin-forge`: remap the neutral `Teleport` import per framework — Vue resolves it from the
    `vue` runtime (built-in `<Teleport>`) and React imports it from `@mission-platform/forge/react` (the `createPortal`
    wrapper) — while leaving the `<Teleport>` JSX usage intact.
  - `@mission-platform/components`: migrate the `Components/Overlays` popups `BaseTooltip`, `BasePopover`, and
    `BaseDropdown` from `@mission-platform/components` to the write-once neutral package. Each teleports its panel to
    `document.body` and positions it with the CSS Anchor Positioning API (`anchor-name`/`position-anchor`/
    `position-area` + `position-try-fallbacks` + `@position-try`, plus `anchor-size(width)` for the dropdown's
    trigger-width match) instead of `@floating-ui`; `<Transition>` is dropped. The popover's and dropdown's compound
    (`-start`/`-end`) placements use **fully-logical** `position-area` values (e.g. `block-end span-inline-end`) —
    mixing a physical side keyword with a logical span (`bottom span-inline-end`) is an invalid value that browsers
    silently drop, which would leave the teleported panel un-anchored at its static position. The modal overlays
    (`BaseDialog`/`BaseModal`) remain Vue-only.

- 94f9acf: add explicit per-phase transition-class props for scoped (non-global) transitions

  `<Transition>` and `<TransitionGroup>` now accept explicit `enterFromClass` /
  `enterActiveClass` / `enterToClass` / `leaveFromClass` / `leaveActiveClass` /
  `leaveToClass` props (plus the existing `moveClass`), each overriding the
  `<name>`-derived default for one phase and mirroring Vue's built-in class props. Passing hashed CSS-Module class names
  keeps a component's enter/leave styling **scoped** instead of forcing a global `:global(.<name>-…)` rule. The React
  CSS-class driver applies the given classes verbatim (falling back to the
  `<name>`-derived class for any phase left unset) and Vue's native transition does the same, so the cross-framework
  behaviour stays identical.

- 94f9acf: add the `TransitionGroup` neutral primitive (the keyed-list counterpart of `Transition`) — the React/Vue
  adapters intercept the marker for SSR (children rendered in place) and the React build ships a CSS-class group driver
  (per-item enter/leave + FLIP move, applied to DOM-element children), mirroring Vue's built-in `<TransitionGroup>`

### Patch Changes

- 94f9acf: allow array children in any position in the neutral JSX child typing

  The `jsx-globals` `IntrinsicElements` children type now accepts a nested array
  (`MpChild | readonly (MpChild | readonly MpChild[])[]`) so a `{items.map(…)}`
  list can sit **alongside** other children (e.g. a header element next to a list)
  rather than only as the sole child. This is type-safe because the `h` factory already flattens nested arrays
  recursively, and unblocks components like
  `BaseTabs` that render a list of panels next to a tab bar.

- ca1d98b: reformat sources with updated prettier print width and import ordering
- d39b6fc: add per-workspace reference documentation and refresh llms.txt/README metadata
