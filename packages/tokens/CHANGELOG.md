# @mission-platform/tokens

## 1.1.0

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

## 1.0.1

### Patch Changes

- bd88e5e: rename the component library prefix from `Base` to `Forge`

  BREAKING CHANGE: every exported component symbol and its folder/file and CSS class name is renamed from `Base*`/`base-*` to `Forge*`/`forge-*` (e.g. `BaseButton` → `ForgeButton`), and previously-unprefixed components (`HideAt`, `ShowAt`, `BreakpointDebug`) and every icon (`IconStar` → `ForgeIconStar`) now carry the `Forge` prefix. Consumers must update all imports and template usages accordingly.

- ac98203: normalize composable directories, package barrels, and colocated tests
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

## 1.0.0

### Major Changes

- 4218ce5: add a `font.size.base` (14px) token and source the breakpoint SCSS from the generated properties

  - `font.tokens.json` gains a `font.size.base` step (`14px`, the absolute root font-size every other rem step is
    relative to). It is emitted as
    `$font-size-base` / `--mp-font-size-base` (with a `<length>` `@property`
    registration); `scss/mixins`' `mp-font-base` and the `scss/tokens` `:root`
    reset now use `var(--mp-font-size-base)` instead of the hard-coded `14px` /
    `var(--mp-font-size-md)`, and `scss/mixins`' `mp-rem()` now divides by the base token (read from the new CSS-free
    `generated/scss/_font-vars.scss`) rather than a hard-coded `16`.
  - The generated token CSS (the `:root` custom properties **and** the `@property`
    registrations, including the `light-dark()` theme) is now wrapped in the
    `@layer mp.tokens` cascade layer, as are the `scss/tokens` base resets, so unlayered application styles win over the
    tokens without specificity battles.
  - `scss/_breakpoints.scss` now builds its `$breakpoints` map directly from the generated `$breakpoint-*` design-token
    properties (the redundant hand-maintained
    `$bp-*` aliases are dropped); the `.bp-show-*`/`.bp-hide-*`/`.bp-only-*`
    visibility utilities are unchanged.
  - **BREAKING:** the redundant `scss/breakpoints` entry point (and its
    `./scss/breakpoints` package export) is removed. Import the mixins from
    `@mission-platform/tokens/scss/breakpoints-mixins` and, if you need the visibility utility classes, the new
    `@mission-platform/tokens/scss/breakpoints-utilities`
    export.

- 4218ce5: generate a single `light-dark()` theme; treat palette and typography as structural

  - The semantic colour tokens are now emitted as one generated `light-dark()`
    theme: `:root { color-scheme: light dark; --mp-color-*: light-dark(<light>,
<dark>); }`, included in the `scss/tokens` barrel so the colours follow the OS preference automatically. The
    `theme-light.tokens.json` / `theme-dark.tokens.json`
    sources now reference the palette via DTCG aliases (`{color.cyan.950}`, …) and mirror the previous hand-authored
    `themes/{light,dark}/index.scss` mappings, and new primitive tokens were added to `palette.tokens.json` (the dark
    teal surface/border steps and the translucent black/white scrim/shimmer overlays).
  - The colour palette and the composite typography are now emitted exactly like the other structural scales: the
    palette gets `--mp-color-*` custom properties +
    `<color>` `@property` registrations, and typography is flattened to
    `--mp-typography-<variant>-<field>` custom properties that reference the primitive
    `var(--mp-font-*)` tokens (registered under the universal `*` `@property` syntax). Every `:root` custom property now
    interpolates its local `$`-variable (`--mp-*: #{$<token>}`) rather than inlining the literal.
  - **BREAKING:** `scss/themes/light` and `scss/themes/dark` no longer redefine the colour custom properties — they only
    force `color-scheme` on the
    `[data-theme]`/`.theme-*` opt-in selectors (import `scss/tokens` for the values). The `mp-dark-theme-vars` mixin and
    the (previously dangling) `scss/themes/light/colours`
    export are removed; pin a scheme with `data-theme="light|dark"` instead. The theme sources moved under
    `src/scss/themes/{light,dark}/` (the `scss/themes/*` export specifiers are unchanged).
  - The `scss/mixins` font helpers (`mp-font*`, `mp-font-base`, the `mp-font-size`/
    `mp-font-weight`/`mp-line-height`/`mp-letter-spacing` lookups) now resolve to the generated `var(--mp-*)` custom
    properties instead of the underlying SCSS
    `$`-variables, so a runtime token override flows through automatically.

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

### Minor Changes

- 4218ce5: move the breakpoint SCSS layer into the tokens package

  The breakpoint SCSS variables (`$bp-*`, `$breakpoints`), the
  `bp-up`/`bp-down`/`bp-between`/`bp-only` mixins, and the
  `.bp-show-*`/`.bp-hide-*`/`.bp-only-*` visibility utility classes now live in
  `@mission-platform/tokens`, exported as `@mission-platform/tokens/scss/breakpoints-mixins`
  (variables + mixins, no emitted CSS) and `@mission-platform/tokens/scss/breakpoints`
  (the above plus the utility classes).

  BREAKING CHANGE: `@mission-platform/breakpoints` no longer exports
  `./scss/breakpoints` or `./scss/mixins`; import the breakpoint SCSS from
  `@mission-platform/tokens/scss/breakpoints-mixins` (or `.../scss/breakpoints`)
  instead. The package continues to export the `useBreakpoints` composable and the
  `<ShowAt>`/`<HideAt>`/`<BreakpointDebug>` components unchanged.

- 4218ce5: split the font primitives into a dedicated font tokens file and add a composite typography tokens file

  The font primitives (`font.family`, `font.size`, `font.weight`, `line-height`,
  `letter-spacing`) are moved out of `scale.tokens.json` into a new
  `font.tokens.json`, and a new `typography.tokens.json` adds composite DTCG
  `typography` styles (`display`, `h1`–`h6`, `body-lg`/`md`/`sm`/`xs`, `label`,
  `caption`, `code`) composed from those primitives. Generation now emits the composite `--mp-typography-<variant>-*`
  CSS custom properties (referencing the primitive `--mp-*` tokens) and a `typography` export in the TypeScript token
  module. The existing `--mp-*` / SCSS `$` / TS public surface is unchanged.

- be8ab67: add the named `2xs … 2xl` t-shirt spacing steps to the `spacing` scale (alongside the numeric base-unit
  steps) for the component `padding`/`margin`/`gap` props
- 4218ce5: ship the `[data-theme]`/`.theme-*` scheme pins in the generated theme

  The generated `_theme.scss` now also emits the opt-in scheme pins —
  `[data-theme='light'], .theme-light { color-scheme: light }` and the matching dark rules — directly inside the
  `mp.tokens` cascade layer, alongside the
  `:root` `light-dark()` colour tokens. Importing `@mission-platform/tokens/scss/tokens`
  is therefore enough to pin a subtree (or the whole document) to one scheme via
  `data-theme`/`.theme-*`; the behaviour no longer depends on import order or on importing a separate theme entry point.
  The hand-written
  `@mission-platform/tokens/scss/themes/{light,dark}` partials are kept as backwards-compatible shims that now emit no
  CSS (the pin lives in `scss/tokens`), so a subtree pinned with `data-theme` re-themes itself and its descendants
  purely through `color-scheme` + `light-dark()`, without redefining any colour custom property.

- 4218ce5: source the responsive breakpoint thresholds from design tokens

  The seven breakpoint min-width thresholds are now authored as a `breakpoint` DTCG group in `scale.tokens.json` and
  generated as `$breakpoint-2xs` … `$breakpoint-2xl` SCSS variables (and `--mp-breakpoint-*` CSS custom properties). The
  hand-written `_breakpoints.scss` partial now builds its `$bp-*` / `$breakpoints` map and the `bp-up`/`bp-down`/
  `bp-between`/`bp-only` mixins from those generated tokens instead of hard-coded literals. The public
  mixin/utility-class API and emitted media queries are unchanged.

- 4218ce5: document every design token with a DTCG `$description`

  Added `$description` metadata across the DTCG sources so each token group and value is self-documenting: the colour
  palette (the `color` group plus every hue ramp and the black/white/primary helper swatches), the structural scales
  (`spacing`, `radius`, `shadow`, `breakpoint`, and the `size.*` subgroups, with per-token notes and px equivalents),
  and the font primitives (`font.family`/`size`/`weight`, `line-height`, `letter-spacing`). The descriptions are emitted
  as `///` doc comments in the generated SCSS/CSS/TS output. Token names, values and generated artefacts are otherwise
  unchanged.

- be8ab67: migrate design tokens to the DTCG format

  - The design tokens are now authored in the DTCG (designtokens.org) **v2025.10**
    format under `tokens/*.tokens.json` (primitive palette, structural scales, and light/dark semantic themes), which
    become the single source of truth.
  - Colours are defined in the **OKLab** colour space (emitted as `oklab(L a b / α)`), replacing the previous hex /
    `rgb()` values.
  - The primary sans font is now **Comfortaa** and the primary mono font is **Datatype**.
  - The SCSS variables, `--mp-*` CSS custom properties, theme blocks, the standalone
    `@mission-platform/tokens/css` bundle, and the TypeScript token module are generated from the DTCG sources at build
    time by `@mission-platform/vite-plugin-tokens`, replacing the hand-maintained value files. The public SCSS/CSS/TS
    API (names and exports) is unchanged.

- 4218ce5: add motion, z-index, opacity and border-width tokens and split the structural scale sources per concern

  Added four new DTCG token groups, each in its own source file: `motion.tokens.json` (`duration.*` transition/animation
  timings + `easing.*` curves), `z-index.tokens.json` (a shared `base` → `toast` stacking order), `opacity.tokens.json`
  (`disabled`/`muted`/`subtle`/… alpha levels) and `border-width.tokens.json` (`thin`/`thick`/`heavy`). These generate
  `--mp-duration-*`, `--mp-easing-*`, `--mp-z-index-*`, `--mp-opacity-*` and `--mp-border-width-*` CSS custom
  properties, matching SCSS `$`-variables, and new `durations`/`easings`/`zIndices`/`opacities`/`borderWidths`
  TypeScript exports.

  The monolithic `scale.tokens.json` was broken up into one DTCG file per scale (`breakpoint`, `spacing`, `radius`,
  `shadow`, `size`); the plugin merges them by top-level group so all existing `--mp-*` / `$` / TS token names and
  values are unchanged. `@mission-platform/vite-plugin-tokens` now resolves a configurable list of structural sources
  instead of a single `scale` path.

- 4218ce5: use rem instead of px for the radius, shadow and border-width token scales

  The `radius.*`, `shadow.*` and `border-width.*` DTCG token values are now expressed in **rem** (relative to the `14px`
  root font-size) instead of absolute px, so these dimensions scale with the user's font size — matching the `spacing.*`
  and `size.*`
  scales, which were already rem. The emitted values are visually equivalent (e.g.
  `--mp-radius-md` is now `0.429rem` ≈ the previous `6px`, `--mp-border-width-thin` is
  `0.071rem` ≈ `1px`, and the `--mp-shadow-*` offsets/blur/spread now match the existing rem `--mp-size-shadow-*`
  mirror).

  `breakpoint.*` intentionally stays in absolute px (a rem in a media query is relative to the browser root, not
  `:root`), and `radius.full` keeps its `9999px` pill sentinel.

- be8ab67: add the shared `size` and `a11y` SCSS partials

  `@mission-platform/tokens` is now the canonical home of two shared stylesheets previously copied into the component
  packages: `./scss/size`
  (`src/scss/_size.scss` — the `base-size--<step>` `font-size` modifier classes over the `--mp-size-font-*` scale, in
  `@layer mp.components`) and `./scss/a11y`
  (`src/scss/_a11y.scss` — the global `prefers-reduced-motion` reset). The write-once packages now `@use` these partials
  from their thin `size.module.scss`
  / `./styles` entries instead of duplicating the rules.

- be8ab67: increase the default typography line-heights for more vertical rhythm (normal 1.5 → 1.6, relaxed 1.625 →
  1.75, snug 1.375 → 1.45, tight 1.25 → 1.3)
- be8ab67: add marginBlock/marginInline logical-margin fields to the composite typography tokens

  Each `typography.tokens.json` variant (`display`, `h1`–`h6`, `body-lg`/`md`/`sm`/`xs`,
  `label`, `caption`, `code`) now carries `marginBlock` and `marginInline` fields aliased from the `spacing.*` scale
  (`{spacing.3}`, `{spacing.0}`, …). The generator's typography field list emits the matching
  `--mp-typography-<variant>-margin-block` /
  `--mp-typography-<variant>-margin-inline` CSS custom properties (referencing the primitive
  `--mp-spacing-*` tokens) and the `typography` TypeScript export gains the new
  `marginBlock`/`marginInline` keys. The plugin now resolves the composite typography
  `{spacing.*}` aliases (alongside the existing `{font.*}` aliases) when emitting the TypeScript module. The existing
  typography fields and public surface are unchanged.

### Patch Changes

- ca1d98b: reformat sources with updated prettier print width and import ordering
- 4218ce5: remove the unused typography variant mixins from the SCSS mixin layer

  As part of the staged Phase 2 retirement of the `mp-font-*` SCSS mixins, the variant mixins with no remaining
  consumers (`mp-font-display`, `mp-font-h2`,
  `mp-font-h4`, `mp-font-h5`, `mp-font-body-lg`, and `mp-font-body-xs`) are removed. The still-used variant mixins
  (`mp-font-h1`, `mp-font-h3`,
  `mp-font-body-md`, `mp-font-body-sm`, `mp-font-label`, `mp-font-caption`,
  `mp-font-code`, `mp-font-base`), the core `mp-font` mixin, and the lookup functions (`mp-rem`, `mp-font-size`,
  `mp-font-weight`, `mp-line-height`,
  `mp-letter-spacing`) are retained.

- be8ab67: remove the asimonim tooling integration

  Dropped asimonim from the package entirely: removed the `tokens:validate` script, deleted the
  `.config/design-tokens.yaml` asimonim config (and its `files` entry), and updated `llms.txt` to describe the
  self-contained `@mission-platform/vite-plugin-tokens`
  generator instead. The DTCG sources and all generated SCSS/CSS/TS artefacts are unchanged.

## 0.3.1

### Patch Changes

- 075a5a2: normalize source formatting and import ordering

  Apply the repo-wide Prettier/ESLint formatting pass (line reflow, attribute and import ordering, barrel-import paths,
  and simplified GeoJSON `Feature` typings in `map`). No runtime behaviour changes.

## 0.3.0

### Minor Changes

- a6ac78b: unify component variants on `primary`, `secondary`, `tertiary`, `default`, `success`, `warning`,
  `information`, `error` & `critical`

  All semantic-color components (`BaseButton`, `BaseBadge`, `BaseTag`, `BaseSpinner`,
  `BaseProgressBar`, `BaseMenuItem`, `BaseNavbarItem`) now share one canonical
  `variant` set. **Breaking:** the old per-component values were renamed —
  `danger` → `error`, `info` → `information`, `neutral` → `default`, and the button's
  `ghost` → `tertiary`. `default` keeps the neutral treatment, `tertiary` keeps the ghost/transparent treatment, and
  `information` keeps the info treatment.

  `@mission-platform/tokens` adds the backing semantic CSS-variable families (`secondary`, `tertiary`, `default`,
  `information`, `critical`) for both the light and dark themes, plus a new `critical` primitive colour scale.

### Patch Changes

- f0a0e11: emit code-split, tree-shakeable library builds

  `defineLibraryConfig` now preserves the source module graph (one output file per module) and externalises each
  package's own `dependencies`/`peerDependencies` by default, so consumers get first-class tree shaking and code
  splitting. Packages that ship a single self-contained artifact (workers, WASM entries, the flat token bundle) opt out
  via the new `preserveModules: false` option. The main entry of each preserved-module package is now emitted as
  `dist/index.js`.

## 0.2.0

### Minor Changes

- 37571da: add `--mp-color-bg-base-alt` semantic background token to light and dark themes — a subtle shade off the base
  background (slightly darker in light, slightly lighter in dark) for alternating sections, banded surfaces, and zebra
  layouts

### Patch Changes

- 266acd6: add `build:watch` script for incremental rebuilds during development

## 0.1.2

### Patch Changes

- 05d31c9: normalize lint and format scripts across all workspaces

  Add consistent `lint:fix`, `lint:style:fix`, and `format:write` scripts to every workspace, and make `format` run
  `prettier --check` instead of `prettier --write` so it can be used as a non-mutating verification step.

- cf89515: enable tree shaking support when consumed by apps

  Declares `"sideEffects"` in each package's `package.json` so app bundlers (Vite/Rollup) can safely drop unused
  exports. Pure-TypeScript packages (`harper`, `hunspell`, `i18n`) opt out of side effects entirely with
  `"sideEffects": false`. Packages that ship styles and/or Vue SFCs (`breakpoints`, `components`, `icons`, `map`,
  `tokens`) keep `*.css`,
  `*.scss`, and `*.vue` files marked as side-effectful so component styles and SCSS entrypoints are preserved.

- 8314555: use shared `@mission-platform/typescript-config` and `@mission-platform/vite-config`

  Migrates `vite.config.ts` and the `tsconfig.*.json` files to extend the shared workspaces under `configs/`. No runtime
  or public-API change.

## 0.1.1

### Patch Changes

- b5e4353: broaden composable APIs to MaybeRefOrGetter and fix token re-export extensions
  - refactor `useHunspellMonaco` to accept `MaybeRefOrGetter` for all three parameters instead of `Ref`, allowing plain
    values, refs, and getters
  - update `useHunspellMonaco` spec to use native `ReturnType<typeof ref<...>>` instead of explicit `Ref` import
  - migrate `useId` from `nanoid` to Vue's built-in `useId` for stable server-side-compatible IDs
  - update `useRouterClose` to call `toValue(router.currentRoute)` instead of `.value` directly
  - refactor `useIconSize` in `@mission-platform/icons` to accept `MaybeRefOrGetter<number | string>` instead of a
    getter function `() => number | string`
  - fix token barrel re-exports in `@mission-platform/tokens` to use `.js` extensions instead of `.ts` for ESM
    compatibility

## 0.1.0

### Minor Changes

- feat: initial design tokens including colors, typography, spacing, radii, shadows and theme SCSS variables
