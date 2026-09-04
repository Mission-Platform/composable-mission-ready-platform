# @mission-platform/icons

## 2.0.1

### Patch Changes

- c32bb83: centralize package documentation generation in the repository build
- 8a15dbc: add generated package API references and build-time documentation extraction
- 46fe17a: scope Forge build environment variables to package build tasks
- 9e59f09: split shared UI capabilities into focused workspaces and update their design tokens
- Updated dependencies [c32bb83]
- Updated dependencies [f216404]
- Updated dependencies [89aab02]
- Updated dependencies [8a15dbc]
  - @mission-platform/forge-jsx@1.1.0

## 2.0.0

### Major Changes

- be97ac0: add framework-specific Storyblok output builds for Forge packages

  The CMS driver and Storyblok target now support shared assets plus React, Vue,
  Svelte, Solid, and Web Components output. Forge packages expose the associated
  build targets and components adds the generated Storyblok entry points.

  BREAKING CHANGE: the generated `@mission-platform/icons` components barrel no
  longer re-exports the catalog and sprite APIs; import those APIs from their
  dedicated modules instead.

### Patch Changes

- 66130ee: restore catalog icon geometry in generated sprites
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

  - @mission-platform/forge-jsx@1.0.0

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

  The `@mission-platform/forge-jsx` adapter subpaths (`/react`, `/vue`, `/solid`,
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

- 90a72fc: Add `@mission-platform/wysiwyg`, a framework-agnostic (write-once Vue 3 + React) WYSIWYG rich-text editor.

  The editor is authored once with `@mission-platform/forge-jsx` and composes existing packages: a `contenteditable` surface
  with a formatting toolbar built from `@mission-platform/icons` and `@mission-platform/components`' `ForgeButton`, an
  optional Monaco-backed HTML source view (`ForgeMonacoEditor` with Hunspell + Harper spell/grammar checking), design
  tokens via `@mission-platform/tokens`, and an RxJS-powered live word/character counter.

  Also adds two new icons to `@mission-platform/icons` used by the editor toolbar: `IconUnderline` and
  `IconStrikethrough`.

### Patch Changes

- f67e304: fix component styles not loading in apps and Storybook

  `defineTsdownLibrary` now re-links every extracted stylesheet to the JS module that owns it via a `writeBundle` pass (opt out with `cssBundle: false`). Under the tsdown/Rolldown build, co-located `*.module.scss` / `*.scss` imports were extracted to standalone `.css` assets but their side-effect imports were dropped from the JS (left as `/* empty css */`), so importing a component shipped its markup without its styles. Each `X.css` is now imported from its CSS-Module class map (`X.module.js`) — or, for the Vue build, from the component chunk (`X.vue_vue_type_style_*.css` → `X.js`) — so importing a single component (or the package barrel) automatically loads exactly its styles again, matching the historical Vite library build.

- ac98203: normalize composable directories, package barrels, and colocated tests
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

- Updated dependencies [e2525a3]
- Updated dependencies [7a1b1a1]
- Updated dependencies [bd88e5e]
- Updated dependencies [0c0d5d7]
- Updated dependencies [ffa5129]
- Updated dependencies [3fb8ddb]
- Updated dependencies [7d95459]
- Updated dependencies [f67e304]
  - @mission-platform/forge-jsx@1.0.0

## 0.2.0

### Minor Changes

- 76ebb1f: wrap icon component styles in the `@layer mp.icons` cascade layer

  Every `@mission-platform/icons` SFC `<style>` block now wraps its rules in the
  `@layer mp.icons` cascade layer (any leading `@use` stays outside the layer), so unlayered application styles win over
  the icon styles without specificity battles.

- 13cfc7f: populate the package with the full Mission Platform icon set

  Every `icon-*` from `@mission-platform/icons` is now ported to a framework-neutral JSX component (89 icons) and
  compiled straight to both the `./react` and `./vue`
  subpaths by the two-stage compiler. The icons are generated from the Vue SFC sources by `scripts/generate-icons.js`;
  `IconArrow`/`IconChevron` keep their
  `direction` prop and `IconSort` its `active`/`direction` props. The package's build/test tooling (vite, vitest,
  tsconfig, eslint/prettier configs) was fixed so the two-stage build, declarations, and tests run cleanly.

- 13cfc7f: add a framework-neutral entry point

  The package now exposes a framework-neutral `.` export (the neutral icon source, typed against the built
  `dist/components` declarations) alongside the existing compiled `./react` / `./vue` subpaths. This lets a write-once
  `@mission-platform/forge-jsx` component import an icon from `@mission-platform/icons`
  so it type-checks and renders through the runtime adapters in unit tests, while
  `@mission-platform/vite-plugin-forge` remaps that specifier to the matching per-framework build for the emitted
  React/Vue output. The package `src` is now published so the neutral entry resolves.

### Patch Changes

- 13cfc7f: remove the legacy `generate-icons`/`generate-stories` scripts (and the `stories:generate` package script) —
  they derived this package from the now-removed Vue `@mission-platform/icons` source, which no longer exists
- 13cfc7f: add per-icon Storybook stories for every icon

  Each icon now has a co-located `*.vue.stories.tsx` (consumed by the Vue Storybook) and a matching
  `*.react.stories.tsx` in the React Storybook app, catalogued in a dedicated top-level `JSX Icons` section grouped by
  category (titles `JSX Icons/<Category>/<Name>`, mirroring the `Icons/<Category>`
  groupings of `@mission-platform/icons`), plus a `JSX Icons/Overview` gallery in both. The story pair is generated by
  the new `scripts/generate-stories.js`
  (`pnpm stories:generate`), and `@storybook/vue3-vite` + `storybook` were added as devDependencies to support the
  co-located Vue stories.

- 0a5d7dd: add react storybook stories colocated with the icon components
- edb785f: add the platform-owned `className={…}` JSX attribute for class management

  Neutral components now drive dynamic classes with a `className={…}` attribute (reserving the plain `class="…"` for
  static strings) instead of calling the
  `classNames` helper inline — the author never imports the helper. The canonical value is an array holding the same
  arguments the helper accepts.

  `@mission-platform/vite-plugin-forge`'s two-stage compiler owns the transform: on React an array value collapses to a
  `className={classNames(…)}` string call (re-injecting the neutral `classNames` import), while any other value passes
  through as `className`; on Vue it maps onto the native `class` binding, which understands the array/object forms (no
  helper needed). `@mission-platform/forge-jsx`'s
  `./react` and `./vue` runtime adapters apply the same mapping at render time so the ad-hoc/SSR output matches the
  compiled output. The `classNames(...values)`
  helper is still exported for the rare precompute and `h(tag, { class: … })`
  object form.

  `@mission-platform/components` and `@mission-platform/icons` migrate their components' `class={…}` attributes to
  `className={…}` accordingly.

- edb785f: forward consumer fall-through attributes onto the generated Vue component root

  The Vue emitter stamps every generated SFC with `defineOptions({ inheritAttrs:
false })` (so multi-root / render-closure components don't warn), but it never re-enabled attribute inheritance — so
  consumer-supplied fall-through attributes (`class`/`style`/`id`/`data-*`/listeners) were silently dropped, unlike the
  hand-authored `.vue` SFCs they replaced. This regressed components relied on the fall-through, e.g. the Monaco editor
  lost its consumer `class` (and therefore its `flex: 1` / border overrides) when wrapped by an app.

  The two-stage compiler now opts the root back in explicitly: a single root element in the `<template>` path is emitted
  with a trailing `v-bind="$attrs"`
  (placed last to mirror Vue's default-inheritance precedence; `class`/`style`
  still merge), and the render-closure fallback forwards `$attrs` onto its
  `<component :is="render">` host. `@mission-platform/components` and
  `@mission-platform/icons` pick this up when their `./vue` subpaths are rebuilt.

- d39b6fc: add per-workspace reference documentation and refresh llms.txt/README metadata
- 18bd49a: rename the Storybook top-level sections so the catalogue reflects the package split

  The cross-framework catalogue no longer prefixes its sections with `JSX`: the
  `JSX Components/<Category>/<Name>` stories are now `Components/<Category>/<Name>`
  and the `JSX Icons/<Category>/<Name>` stories are now `Icons/<Category>/<Name>`
  (both Vue and React Storybooks). The components extracted into their own packages get their own top-level Storybook
  section instead of nesting under `Components`:
  `@mission-platform/layouts` stories move to `Layouts/<Name>` and
  `@mission-platform/forms` stories move to `Forms/<Name>`.

- 4218ce5: generate one SCSS partial and TS module per token source, with barrels

  - The generated token output is now split per DTCG source: every
    `tokens/<file>.tokens.json` produces `src/generated/scss/_<file>.scss` (a self-contained partial with its `$`
    -variables, `--mp-*` custom properties, and
    `@property` registrations whose `initial-value`s resolve to the matching local
    `$`-variables) and `src/generated/ts/<file>.ts` (a single nested `as const`
    object). The aggregate `src/generated/_tokens.scss` (`@forward` barrel) and
    `src/generated/tokens.ts` (re-export barrel) replace the previous
    `_structural.scss`, `flat.ts`, and `tokens.css` artefacts.
  - **BREAKING:** the TypeScript API is now a flat set of per-source nested objects (`palette`, `size`, `font`,
    `typography`, `borderWidth`, `breakpoint`, `motion`,
    `opacity`, `radius`, `shadow`, `spacing`, `zIndex`, `themeLight`, `themeDark`), replacing the previous bespoke
    exports (`colors`, `spacing`, `fontFamilies`,
    `sizeIcons`, `radii`, `shadows`, …). The standalone `@mission-platform/tokens/css`
    bundle export is removed; consume the SCSS entry points instead.
  - `@mission-platform/components`, `@mission-platform/map`, and
    `@mission-platform/icons` are updated to the new token exports (`font.font.family`,
    `palette.color`, and `size.icon` respectively).

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
  - @mission-platform/forge-jsx@0.2.0

## 0.2.0

### Minor Changes

- 76ebb1f: wrap icon component styles in the `@layer mp.icons` cascade layer

  Every `@mission-platform/icons` SFC `<style>` block now wraps its rules in the
  `@layer mp.icons` cascade layer (any leading `@use` stays outside the layer), so unlayered application styles win over
  the icon styles without specificity battles.

- 13cfc7f: populate the package with the full Mission Platform icon set

  Every `icon-*` from `@mission-platform/icons` is now ported to a framework-neutral JSX component (89 icons) and
  compiled straight to both the `./react` and `./vue`
  subpaths by the two-stage compiler. The icons are generated from the Vue SFC sources by `scripts/generate-icons.js`;
  `IconArrow`/`IconChevron` keep their
  `direction` prop and `IconSort` its `active`/`direction` props. The package's build/test tooling (vite, vitest,
  tsconfig, eslint/prettier configs) was fixed so the two-stage build, declarations, and tests run cleanly.

- 13cfc7f: add a framework-neutral entry point

  The package now exposes a framework-neutral `.` export (the neutral icon source, typed against the built
  `dist/components` declarations) alongside the existing compiled `./react` / `./vue` subpaths. This lets a write-once
  `@mission-platform/forge-jsx` component import an icon from `@mission-platform/icons`
  so it type-checks and renders through the runtime adapters in unit tests, while
  `@mission-platform/vite-plugin-forge` remaps that specifier to the matching per-framework build for the emitted
  React/Vue output. The package `src` is now published so the neutral entry resolves.

### Patch Changes

- 13cfc7f: remove the legacy `generate-icons`/`generate-stories` scripts (and the `stories:generate` package script) —
  they derived this package from the now-removed Vue `@mission-platform/icons` source, which no longer exists
- 13cfc7f: add per-icon Storybook stories for every icon

  Each icon now has a co-located `*.vue.stories.tsx` (consumed by the Vue Storybook) and a matching
  `*.react.stories.tsx` in the React Storybook app, catalogued in a dedicated top-level `JSX Icons` section grouped by
  category (titles `JSX Icons/<Category>/<Name>`, mirroring the `Icons/<Category>`
  groupings of `@mission-platform/icons`), plus a `JSX Icons/Overview` gallery in both. The story pair is generated by
  the new `scripts/generate-stories.js`
  (`pnpm stories:generate`), and `@storybook/vue3-vite` + `storybook` were added as devDependencies to support the
  co-located Vue stories.

- 0a5d7dd: add react storybook stories colocated with the icon components
- edb785f: add the platform-owned `className={…}` JSX attribute for class management

  Neutral components now drive dynamic classes with a `className={…}` attribute (reserving the plain `class="…"` for
  static strings) instead of calling the
  `classNames` helper inline — the author never imports the helper. The canonical value is an array holding the same
  arguments the helper accepts.

  `@mission-platform/vite-plugin-forge`'s two-stage compiler owns the transform: on React an array value collapses to a
  `className={classNames(…)}` string call (re-injecting the neutral `classNames` import), while any other value passes
  through as `className`; on Vue it maps onto the native `class` binding, which understands the array/object forms (no
  helper needed). `@mission-platform/forge-jsx`'s
  `./react` and `./vue` runtime adapters apply the same mapping at render time so the ad-hoc/SSR output matches the
  compiled output. The `classNames(...values)`
  helper is still exported for the rare precompute and `h(tag, { class: … })`
  object form.

  `@mission-platform/components` and `@mission-platform/icons` migrate their components' `class={…}` attributes to
  `className={…}` accordingly.

- edb785f: forward consumer fall-through attributes onto the generated Vue component root

  The Vue emitter stamps every generated SFC with `defineOptions({ inheritAttrs:
false })` (so multi-root / render-closure components don't warn), but it never re-enabled attribute inheritance — so
  consumer-supplied fall-through attributes (`class`/`style`/`id`/`data-*`/listeners) were silently dropped, unlike the
  hand-authored `.vue` SFCs they replaced. This regressed components relied on the fall-through, e.g. the Monaco editor
  lost its consumer `class` (and therefore its `flex: 1` / border overrides) when wrapped by an app.

  The two-stage compiler now opts the root back in explicitly: a single root element in the `<template>` path is emitted
  with a trailing `v-bind="$attrs"`
  (placed last to mirror Vue's default-inheritance precedence; `class`/`style`
  still merge), and the render-closure fallback forwards `$attrs` onto its
  `<component :is="render">` host. `@mission-platform/components` and
  `@mission-platform/icons` pick this up when their `./vue` subpaths are rebuilt.

- d39b6fc: add per-workspace reference documentation and refresh llms.txt/README metadata
- 18bd49a: rename the Storybook top-level sections so the catalogue reflects the package split

  The cross-framework catalogue no longer prefixes its sections with `JSX`: the
  `JSX Components/<Category>/<Name>` stories are now `Components/<Category>/<Name>`
  and the `JSX Icons/<Category>/<Name>` stories are now `Icons/<Category>/<Name>`
  (both Vue and React Storybooks). The components extracted into their own packages get their own top-level Storybook
  section instead of nesting under `Components`:
  `@mission-platform/layouts` stories move to `Layouts/<Name>` and
  `@mission-platform/forms` stories move to `Forms/<Name>`.

- 4218ce5: generate one SCSS partial and TS module per token source, with barrels

  - The generated token output is now split per DTCG source: every
    `tokens/<file>.tokens.json` produces `src/generated/scss/_<file>.scss` (a self-contained partial with its `$`
    -variables, `--mp-*` custom properties, and
    `@property` registrations whose `initial-value`s resolve to the matching local
    `$`-variables) and `src/generated/ts/<file>.ts` (a single nested `as const`
    object). The aggregate `src/generated/_tokens.scss` (`@forward` barrel) and
    `src/generated/tokens.ts` (re-export barrel) replace the previous
    `_structural.scss`, `flat.ts`, and `tokens.css` artefacts.
  - **BREAKING:** the TypeScript API is now a flat set of per-source nested objects (`palette`, `size`, `font`,
    `typography`, `borderWidth`, `breakpoint`, `motion`,
    `opacity`, `radius`, `shadow`, `spacing`, `zIndex`, `themeLight`, `themeDark`), replacing the previous bespoke
    exports (`colors`, `spacing`, `fontFamilies`,
    `sizeIcons`, `radii`, `shadows`, …). The standalone `@mission-platform/tokens/css`
    bundle export is removed; consume the SCSS entry points instead.
  - `@mission-platform/components`, `@mission-platform/map`, and
    `@mission-platform/icons` are updated to the new token exports (`font.font.family`,
    `palette.color`, and `size.icon` respectively).

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
  - @mission-platform/forge-jsx@0.2.0

## 0.2.0

### Minor Changes

- 76ebb1f: wrap icon component styles in the `@layer mp.icons` cascade layer

  Every `@mission-platform/icons` SFC `<style>` block now wraps its rules in the
  `@layer mp.icons` cascade layer (any leading `@use` stays outside the layer), so unlayered application styles win over
  the icon styles without specificity battles.

- 13cfc7f: populate the package with the full Mission Platform icon set

  Every `icon-*` from `@mission-platform/icons` is now ported to a framework-neutral JSX component (89 icons) and
  compiled straight to both the `./react` and `./vue`
  subpaths by the two-stage compiler. The icons are generated from the Vue SFC sources by `scripts/generate-icons.js`;
  `IconArrow`/`IconChevron` keep their
  `direction` prop and `IconSort` its `active`/`direction` props. The package's build/test tooling (vite, vitest,
  tsconfig, eslint/prettier configs) was fixed so the two-stage build, declarations, and tests run cleanly.

- 13cfc7f: add a framework-neutral entry point

  The package now exposes a framework-neutral `.` export (the neutral icon source, typed against the built
  `dist/components` declarations) alongside the existing compiled `./react` / `./vue` subpaths. This lets a write-once
  `@mission-platform/forge-jsx` component import an icon from `@mission-platform/icons`
  so it type-checks and renders through the runtime adapters in unit tests, while
  `@mission-platform/vite-plugin-forge` remaps that specifier to the matching per-framework build for the emitted
  React/Vue output. The package `src` is now published so the neutral entry resolves.

### Patch Changes

- 13cfc7f: remove the legacy `generate-icons`/`generate-stories` scripts (and the `stories:generate` package script) —
  they derived this package from the now-removed Vue `@mission-platform/icons` source, which no longer exists
- 13cfc7f: add per-icon Storybook stories for every icon

  Each icon now has a co-located `*.vue.stories.tsx` (consumed by the Vue Storybook) and a matching
  `*.react.stories.tsx` in the React Storybook app, catalogued in a dedicated top-level `JSX Icons` section grouped by
  category (titles `JSX Icons/<Category>/<Name>`, mirroring the `Icons/<Category>`
  groupings of `@mission-platform/icons`), plus a `JSX Icons/Overview` gallery in both. The story pair is generated by
  the new `scripts/generate-stories.js`
  (`pnpm stories:generate`), and `@storybook/vue3-vite` + `storybook` were added as devDependencies to support the
  co-located Vue stories.

- 0a5d7dd: add react storybook stories colocated with the icon components
- edb785f: add the platform-owned `className={…}` JSX attribute for class management

  Neutral components now drive dynamic classes with a `className={…}` attribute (reserving the plain `class="…"` for
  static strings) instead of calling the
  `classNames` helper inline — the author never imports the helper. The canonical value is an array holding the same
  arguments the helper accepts.

  `@mission-platform/vite-plugin-forge`'s two-stage compiler owns the transform: on React an array value collapses to a
  `className={classNames(…)}` string call (re-injecting the neutral `classNames` import), while any other value passes
  through as `className`; on Vue it maps onto the native `class` binding, which understands the array/object forms (no
  helper needed). `@mission-platform/forge-jsx`'s
  `./react` and `./vue` runtime adapters apply the same mapping at render time so the ad-hoc/SSR output matches the
  compiled output. The `classNames(...values)`
  helper is still exported for the rare precompute and `h(tag, { class: … })`
  object form.

  `@mission-platform/components` and `@mission-platform/icons` migrate their components' `class={…}` attributes to
  `className={…}` accordingly.

- edb785f: forward consumer fall-through attributes onto the generated Vue component root

  The Vue emitter stamps every generated SFC with `defineOptions({ inheritAttrs:
false })` (so multi-root / render-closure components don't warn), but it never re-enabled attribute inheritance — so
  consumer-supplied fall-through attributes (`class`/`style`/`id`/`data-*`/listeners) were silently dropped, unlike the
  hand-authored `.vue` SFCs they replaced. This regressed components relied on the fall-through, e.g. the Monaco editor
  lost its consumer `class` (and therefore its `flex: 1` / border overrides) when wrapped by an app.

  The two-stage compiler now opts the root back in explicitly: a single root element in the `<template>` path is emitted
  with a trailing `v-bind="$attrs"`
  (placed last to mirror Vue's default-inheritance precedence; `class`/`style`
  still merge), and the render-closure fallback forwards `$attrs` onto its
  `<component :is="render">` host. `@mission-platform/components` and
  `@mission-platform/icons` pick this up when their `./vue` subpaths are rebuilt.

- d39b6fc: add per-workspace reference documentation and refresh llms.txt/README metadata
- 18bd49a: rename the Storybook top-level sections so the catalogue reflects the package split

  The cross-framework catalogue no longer prefixes its sections with `JSX`: the
  `JSX Components/<Category>/<Name>` stories are now `Components/<Category>/<Name>`
  and the `JSX Icons/<Category>/<Name>` stories are now `Icons/<Category>/<Name>`
  (both Vue and React Storybooks). The components extracted into their own packages get their own top-level Storybook
  section instead of nesting under `Components`:
  `@mission-platform/layouts` stories move to `Layouts/<Name>` and
  `@mission-platform/forms` stories move to `Forms/<Name>`.

- 4218ce5: generate one SCSS partial and TS module per token source, with barrels

  - The generated token output is now split per DTCG source: every
    `tokens/<file>.tokens.json` produces `src/generated/scss/_<file>.scss` (a self-contained partial with its `$`
    -variables, `--mp-*` custom properties, and
    `@property` registrations whose `initial-value`s resolve to the matching local
    `$`-variables) and `src/generated/ts/<file>.ts` (a single nested `as const`
    object). The aggregate `src/generated/_tokens.scss` (`@forward` barrel) and
    `src/generated/tokens.ts` (re-export barrel) replace the previous
    `_structural.scss`, `flat.ts`, and `tokens.css` artefacts.
  - **BREAKING:** the TypeScript API is now a flat set of per-source nested objects (`palette`, `size`, `font`,
    `typography`, `borderWidth`, `breakpoint`, `motion`,
    `opacity`, `radius`, `shadow`, `spacing`, `zIndex`, `themeLight`, `themeDark`), replacing the previous bespoke
    exports (`colors`, `spacing`, `fontFamilies`,
    `sizeIcons`, `radii`, `shadows`, …). The standalone `@mission-platform/tokens/css`
    bundle export is removed; consume the SCSS entry points instead.
  - `@mission-platform/components`, `@mission-platform/map`, and
    `@mission-platform/icons` are updated to the new token exports (`font.font.family`,
    `palette.color`, and `size.icon` respectively).

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
  - @mission-platform/forge-jsx@0.2.0

## 0.2.0

### Minor Changes

- 76ebb1f: wrap icon component styles in the `@layer mp.icons` cascade layer

  Every `@mission-platform/icons` SFC `<style>` block now wraps its rules in the
  `@layer mp.icons` cascade layer (any leading `@use` stays outside the layer), so unlayered application styles win over
  the icon styles without specificity battles.

- 13cfc7f: populate the package with the full Mission Platform icon set

  Every `icon-*` from `@mission-platform/icons` is now ported to a framework-neutral JSX component (89 icons) and
  compiled straight to both the `./react` and `./vue`
  subpaths by the two-stage compiler. The icons are generated from the Vue SFC sources by `scripts/generate-icons.js`;
  `IconArrow`/`IconChevron` keep their
  `direction` prop and `IconSort` its `active`/`direction` props. The package's build/test tooling (vite, vitest,
  tsconfig, eslint/prettier configs) was fixed so the two-stage build, declarations, and tests run cleanly.

- 13cfc7f: add a framework-neutral entry point

  The package now exposes a framework-neutral `.` export (the neutral icon source, typed against the built
  `dist/components` declarations) alongside the existing compiled `./react` / `./vue` subpaths. This lets a write-once
  `@mission-platform/forge-jsx` component import an icon from `@mission-platform/icons`
  so it type-checks and renders through the runtime adapters in unit tests, while
  `@mission-platform/vite-plugin-forge` remaps that specifier to the matching per-framework build for the emitted
  React/Vue output. The package `src` is now published so the neutral entry resolves.

### Patch Changes

- 13cfc7f: remove the legacy `generate-icons`/`generate-stories` scripts (and the `stories:generate` package script) —
  they derived this package from the now-removed Vue `@mission-platform/icons` source, which no longer exists
- 13cfc7f: add per-icon Storybook stories for every icon

  Each icon now has a co-located `*.vue.stories.tsx` (consumed by the Vue Storybook) and a matching
  `*.react.stories.tsx` in the React Storybook app, catalogued in a dedicated top-level `JSX Icons` section grouped by
  category (titles `JSX Icons/<Category>/<Name>`, mirroring the `Icons/<Category>`
  groupings of `@mission-platform/icons`), plus a `JSX Icons/Overview` gallery in both. The story pair is generated by
  the new `scripts/generate-stories.js`
  (`pnpm stories:generate`), and `@storybook/vue3-vite` + `storybook` were added as devDependencies to support the
  co-located Vue stories.

- 0a5d7dd: add react storybook stories colocated with the icon components
- edb785f: add the platform-owned `className={…}` JSX attribute for class management

  Neutral components now drive dynamic classes with a `className={…}` attribute (reserving the plain `class="…"` for
  static strings) instead of calling the
  `classNames` helper inline — the author never imports the helper. The canonical value is an array holding the same
  arguments the helper accepts.

  `@mission-platform/vite-plugin-forge`'s two-stage compiler owns the transform: on React an array value collapses to a
  `className={classNames(…)}` string call (re-injecting the neutral `classNames` import), while any other value passes
  through as `className`; on Vue it maps onto the native `class` binding, which understands the array/object forms (no
  helper needed). `@mission-platform/forge-jsx`'s
  `./react` and `./vue` runtime adapters apply the same mapping at render time so the ad-hoc/SSR output matches the
  compiled output. The `classNames(...values)`
  helper is still exported for the rare precompute and `h(tag, { class: … })`
  object form.

  `@mission-platform/components` and `@mission-platform/icons` migrate their components' `class={…}` attributes to
  `className={…}` accordingly.

- edb785f: forward consumer fall-through attributes onto the generated Vue component root

  The Vue emitter stamps every generated SFC with `defineOptions({ inheritAttrs:
false })` (so multi-root / render-closure components don't warn), but it never re-enabled attribute inheritance — so
  consumer-supplied fall-through attributes (`class`/`style`/`id`/`data-*`/listeners) were silently dropped, unlike the
  hand-authored `.vue` SFCs they replaced. This regressed components relied on the fall-through, e.g. the Monaco editor
  lost its consumer `class` (and therefore its `flex: 1` / border overrides) when wrapped by an app.

  The two-stage compiler now opts the root back in explicitly: a single root element in the `<template>` path is emitted
  with a trailing `v-bind="$attrs"`
  (placed last to mirror Vue's default-inheritance precedence; `class`/`style`
  still merge), and the render-closure fallback forwards `$attrs` onto its
  `<component :is="render">` host. `@mission-platform/components` and
  `@mission-platform/icons` pick this up when their `./vue` subpaths are rebuilt.

- d39b6fc: add per-workspace reference documentation and refresh llms.txt/README metadata
- 18bd49a: rename the Storybook top-level sections so the catalogue reflects the package split

  The cross-framework catalogue no longer prefixes its sections with `JSX`: the
  `JSX Components/<Category>/<Name>` stories are now `Components/<Category>/<Name>`
  and the `JSX Icons/<Category>/<Name>` stories are now `Icons/<Category>/<Name>`
  (both Vue and React Storybooks). The components extracted into their own packages get their own top-level Storybook
  section instead of nesting under `Components`:
  `@mission-platform/layouts` stories move to `Layouts/<Name>` and
  `@mission-platform/forms` stories move to `Forms/<Name>`.

- 4218ce5: generate one SCSS partial and TS module per token source, with barrels

  - The generated token output is now split per DTCG source: every
    `tokens/<file>.tokens.json` produces `src/generated/scss/_<file>.scss` (a self-contained partial with its `$`
    -variables, `--mp-*` custom properties, and
    `@property` registrations whose `initial-value`s resolve to the matching local
    `$`-variables) and `src/generated/ts/<file>.ts` (a single nested `as const`
    object). The aggregate `src/generated/_tokens.scss` (`@forward` barrel) and
    `src/generated/tokens.ts` (re-export barrel) replace the previous
    `_structural.scss`, `flat.ts`, and `tokens.css` artefacts.
  - **BREAKING:** the TypeScript API is now a flat set of per-source nested objects (`palette`, `size`, `font`,
    `typography`, `borderWidth`, `breakpoint`, `motion`,
    `opacity`, `radius`, `shadow`, `spacing`, `zIndex`, `themeLight`, `themeDark`), replacing the previous bespoke
    exports (`colors`, `spacing`, `fontFamilies`,
    `sizeIcons`, `radii`, `shadows`, …). The standalone `@mission-platform/tokens/css`
    bundle export is removed; consume the SCSS entry points instead.
  - `@mission-platform/components`, `@mission-platform/map`, and
    `@mission-platform/icons` are updated to the new token exports (`font.font.family`,
    `palette.color`, and `size.icon` respectively).

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
  - @mission-platform/forge-jsx@0.2.0
