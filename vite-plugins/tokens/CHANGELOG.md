# @mission-platform/vite-plugin-tokens

## 0.1.0

### Minor Changes

- 4218ce5: ship the `[data-theme]`/`.theme-*` scheme pins in the generated theme

  The generated `_theme.scss` now also emits the opt-in scheme pins —
  `[data-theme='light'], .theme-light { color-scheme: light }` and the matching
  dark rules — directly inside the `mp.tokens` cascade layer, alongside the
  `:root` `light-dark()` colour tokens. Importing `@mission-platform/tokens/scss/tokens`
  is therefore enough to pin a subtree (or the whole document) to one scheme via
  `data-theme`/`.theme-*`; the behaviour no longer depends on import order or on
  importing a separate theme entry point. The hand-written
  `@mission-platform/tokens/scss/themes/{light,dark}` partials are kept as
  backwards-compatible shims that now emit no CSS (the pin lives in `scss/tokens`),
  so a subtree pinned with `data-theme` re-themes itself and its descendants
  purely through `color-scheme` + `light-dark()`, without redefining any colour
  custom property.

- 4218ce5: add motion, z-index, opacity and border-width tokens and split the structural scale sources per concern

  Added four new DTCG token groups, each in its own source file: `motion.tokens.json` (`duration.*` transition/animation timings + `easing.*` curves), `z-index.tokens.json` (a shared `base` → `toast` stacking order), `opacity.tokens.json` (`disabled`/`muted`/`subtle`/… alpha levels) and `border-width.tokens.json` (`thin`/`thick`/`heavy`). These generate `--mp-duration-*`, `--mp-easing-*`, `--mp-z-index-*`, `--mp-opacity-*` and `--mp-border-width-*` CSS custom properties, matching SCSS `$`-variables, and new `durations`/`easings`/`zIndices`/`opacities`/`borderWidths` TypeScript exports.

  The monolithic `scale.tokens.json` was broken up into one DTCG file per scale (`breakpoint`, `spacing`, `radius`, `shadow`, `size`); the plugin merges them by top-level group so all existing `--mp-*` / `$` / TS token names and values are unchanged. `@mission-platform/vite-plugin-tokens` now resolves a configurable list of structural sources instead of a single `scale` path.

- be8ab67: add marginBlock/marginInline logical-margin fields to the composite typography tokens

  Each `typography.tokens.json` variant (`display`, `h1`–`h6`, `body-lg`/`md`/`sm`/`xs`,
  `label`, `caption`, `code`) now carries `marginBlock` and `marginInline` fields aliased
  from the `spacing.*` scale (`{spacing.3}`, `{spacing.0}`, …). The generator's typography
  field list emits the matching `--mp-typography-<variant>-margin-block` /
  `--mp-typography-<variant>-margin-inline` CSS custom properties (referencing the primitive
  `--mp-spacing-*` tokens) and the `typography` TypeScript export gains the new
  `marginBlock`/`marginInline` keys. The plugin now resolves the composite typography
  `{spacing.*}` aliases (alongside the existing `{font.*}` aliases) when emitting the
  TypeScript module. The existing typography fields and public surface are unchanged.

- 4218ce5: generate font and composite typography artefacts from the new DTCG sources

  The plugin now reads the dedicated `font.tokens.json` and `typography.tokens.json`
  sources in addition to `palette`/`scale`/theme files. Font primitives are emitted
  alongside the structural scales (stable `$font-*` / `--mp-font-*` names), and the
  composite `typography` tokens — which are not plain aliases — are expanded by the
  plugin into `_typography.scss` (`--mp-typography-<variant>-*` custom properties) and a
  `typography` export in the generated TypeScript module. New helpers
  `buildTypographyCss` and `buildTypographyLiteral` are exported, and
  `buildLegacyModule` accepts an optional `typographyLiteral` argument.

- fe4917d: add vite plugin that generates the design-token code at build time

  Introduces the `@mission-platform/vite-plugin-tokens` workspace, whose
  `tokensPlugin` runs a self-contained custom generator during `vite build` (and
  on dev-server start) — no external CLI is involved. Each non-theme `*.tokens.json`
  DTCG source yields a matching self-contained `generated/scss/_<file>.scss` partial
  (its `$`-variables, `--mp-*` custom properties that interpolate the matching local
  `$`-variable, and `@property` registrations) — the colour palette and the
  flattened composite typography are emitted through this same structural path. The
  two theme sources are merged into one `generated/scss/_theme.scss` that emits
  `:root { color-scheme: light dark; --mp-color-*: light-dark(<light>, <dark>) }`
  with each value referencing a palette `var(--mp-color-*)`. Every source also
  yields a nested `as const` `generated/ts/<file>.ts` module (colours emitted as
  `oklab(...)` strings, aliases resolved). The aggregate `generated/_tokens.scss`
  (SCSS `@forward` barrel, including the theme) and `generated/tokens.ts`
  (TypeScript re-export barrel) are emitted alongside them. The generator is split
  into focused modules (`dtcg.ts`, `generators/scss.ts`, `generators/typescript.ts`).
  `@property` registrations use a typed `syntax` (with a local-`$var`
  `initial-value`) for the literal `color`/`dimension`/`number`/`fontWeight`/`duration`
  tokens and fall back to the universal `*` syntax (no `initial-value`) for
  `var()`-referencing tokens (typography) and non-typeable literals (shadows, easing
  curves, font-family stacks). The structural partials wrap both their `:root`
  custom properties and their `@property` registrations in the `@layer mp.tokens`
  cascade layer (the theme partial's `:root` is layered too), and each non-theme
  source additionally emits a CSS-free `generated/scss/_<file>-vars.scss` (the
  `$`-variables only) so internal SCSS can read a token's compile-time value without
  pulling in its `:root`/`@property` CSS.

### Patch Changes

- c7aeba7: simplify the DTCG flattener/generator and add missing doc comments

  Extracts the token-flattening walk and per-source artefact emission into
  smaller, documented helpers to lower their cyclomatic complexity, and adds
  the missing documentation comments on the DTCG type guards and helpers. The
  generated SCSS/TypeScript output is unchanged.

## 0.1.0

### Minor Changes

- 4218ce5: ship the `[data-theme]`/`.theme-*` scheme pins in the generated theme

  The generated `_theme.scss` now also emits the opt-in scheme pins —
  `[data-theme='light'], .theme-light { color-scheme: light }` and the matching
  dark rules — directly inside the `mp.tokens` cascade layer, alongside the
  `:root` `light-dark()` colour tokens. Importing `@mission-platform/tokens/scss/tokens`
  is therefore enough to pin a subtree (or the whole document) to one scheme via
  `data-theme`/`.theme-*`; the behaviour no longer depends on import order or on
  importing a separate theme entry point. The hand-written
  `@mission-platform/tokens/scss/themes/{light,dark}` partials are kept as
  backwards-compatible shims that now emit no CSS (the pin lives in `scss/tokens`),
  so a subtree pinned with `data-theme` re-themes itself and its descendants
  purely through `color-scheme` + `light-dark()`, without redefining any colour
  custom property.

- 4218ce5: add motion, z-index, opacity and border-width tokens and split the structural scale sources per concern

  Added four new DTCG token groups, each in its own source file: `motion.tokens.json` (`duration.*` transition/animation timings + `easing.*` curves), `z-index.tokens.json` (a shared `base` → `toast` stacking order), `opacity.tokens.json` (`disabled`/`muted`/`subtle`/… alpha levels) and `border-width.tokens.json` (`thin`/`thick`/`heavy`). These generate `--mp-duration-*`, `--mp-easing-*`, `--mp-z-index-*`, `--mp-opacity-*` and `--mp-border-width-*` CSS custom properties, matching SCSS `$`-variables, and new `durations`/`easings`/`zIndices`/`opacities`/`borderWidths` TypeScript exports.

  The monolithic `scale.tokens.json` was broken up into one DTCG file per scale (`breakpoint`, `spacing`, `radius`, `shadow`, `size`); the plugin merges them by top-level group so all existing `--mp-*` / `$` / TS token names and values are unchanged. `@mission-platform/vite-plugin-tokens` now resolves a configurable list of structural sources instead of a single `scale` path.

- be8ab67: add marginBlock/marginInline logical-margin fields to the composite typography tokens

  Each `typography.tokens.json` variant (`display`, `h1`–`h6`, `body-lg`/`md`/`sm`/`xs`,
  `label`, `caption`, `code`) now carries `marginBlock` and `marginInline` fields aliased
  from the `spacing.*` scale (`{spacing.3}`, `{spacing.0}`, …). The generator's typography
  field list emits the matching `--mp-typography-<variant>-margin-block` /
  `--mp-typography-<variant>-margin-inline` CSS custom properties (referencing the primitive
  `--mp-spacing-*` tokens) and the `typography` TypeScript export gains the new
  `marginBlock`/`marginInline` keys. The plugin now resolves the composite typography
  `{spacing.*}` aliases (alongside the existing `{font.*}` aliases) when emitting the
  TypeScript module. The existing typography fields and public surface are unchanged.

- 4218ce5: generate font and composite typography artefacts from the new DTCG sources

  The plugin now reads the dedicated `font.tokens.json` and `typography.tokens.json`
  sources in addition to `palette`/`scale`/theme files. Font primitives are emitted
  alongside the structural scales (stable `$font-*` / `--mp-font-*` names), and the
  composite `typography` tokens — which are not plain aliases — are expanded by the
  plugin into `_typography.scss` (`--mp-typography-<variant>-*` custom properties) and a
  `typography` export in the generated TypeScript module. New helpers
  `buildTypographyCss` and `buildTypographyLiteral` are exported, and
  `buildLegacyModule` accepts an optional `typographyLiteral` argument.

- fe4917d: add vite plugin that generates the design-token code at build time

  Introduces the `@mission-platform/vite-plugin-tokens` workspace, whose
  `tokensPlugin` runs a self-contained custom generator during `vite build` (and
  on dev-server start) — no external CLI is involved. Each non-theme `*.tokens.json`
  DTCG source yields a matching self-contained `generated/scss/_<file>.scss` partial
  (its `$`-variables, `--mp-*` custom properties that interpolate the matching local
  `$`-variable, and `@property` registrations) — the colour palette and the
  flattened composite typography are emitted through this same structural path. The
  two theme sources are merged into one `generated/scss/_theme.scss` that emits
  `:root { color-scheme: light dark; --mp-color-*: light-dark(<light>, <dark>) }`
  with each value referencing a palette `var(--mp-color-*)`. Every source also
  yields a nested `as const` `generated/ts/<file>.ts` module (colours emitted as
  `oklab(...)` strings, aliases resolved). The aggregate `generated/_tokens.scss`
  (SCSS `@forward` barrel, including the theme) and `generated/tokens.ts`
  (TypeScript re-export barrel) are emitted alongside them. The generator is split
  into focused modules (`dtcg.ts`, `generators/scss.ts`, `generators/typescript.ts`).
  `@property` registrations use a typed `syntax` (with a local-`$var`
  `initial-value`) for the literal `color`/`dimension`/`number`/`fontWeight`/`duration`
  tokens and fall back to the universal `*` syntax (no `initial-value`) for
  `var()`-referencing tokens (typography) and non-typeable literals (shadows, easing
  curves, font-family stacks). The structural partials wrap both their `:root`
  custom properties and their `@property` registrations in the `@layer mp.tokens`
  cascade layer (the theme partial's `:root` is layered too), and each non-theme
  source additionally emits a CSS-free `generated/scss/_<file>-vars.scss` (the
  `$`-variables only) so internal SCSS can read a token's compile-time value without
  pulling in its `:root`/`@property` CSS.

### Patch Changes

- c7aeba7: simplify the DTCG flattener/generator and add missing doc comments

  Extracts the token-flattening walk and per-source artefact emission into
  smaller, documented helpers to lower their cyclomatic complexity, and adds
  the missing documentation comments on the DTCG type guards and helpers. The
  generated SCSS/TypeScript output is unchanged.

## 0.1.0

### Minor Changes

- 4218ce5: ship the `[data-theme]`/`.theme-*` scheme pins in the generated theme

  The generated `_theme.scss` now also emits the opt-in scheme pins —
  `[data-theme='light'], .theme-light { color-scheme: light }` and the matching
  dark rules — directly inside the `mp.tokens` cascade layer, alongside the
  `:root` `light-dark()` colour tokens. Importing `@mission-platform/tokens/scss/tokens`
  is therefore enough to pin a subtree (or the whole document) to one scheme via
  `data-theme`/`.theme-*`; the behaviour no longer depends on import order or on
  importing a separate theme entry point. The hand-written
  `@mission-platform/tokens/scss/themes/{light,dark}` partials are kept as
  backwards-compatible shims that now emit no CSS (the pin lives in `scss/tokens`),
  so a subtree pinned with `data-theme` re-themes itself and its descendants
  purely through `color-scheme` + `light-dark()`, without redefining any colour
  custom property.

- 4218ce5: add motion, z-index, opacity and border-width tokens and split the structural scale sources per concern

  Added four new DTCG token groups, each in its own source file: `motion.tokens.json` (`duration.*` transition/animation timings + `easing.*` curves), `z-index.tokens.json` (a shared `base` → `toast` stacking order), `opacity.tokens.json` (`disabled`/`muted`/`subtle`/… alpha levels) and `border-width.tokens.json` (`thin`/`thick`/`heavy`). These generate `--mp-duration-*`, `--mp-easing-*`, `--mp-z-index-*`, `--mp-opacity-*` and `--mp-border-width-*` CSS custom properties, matching SCSS `$`-variables, and new `durations`/`easings`/`zIndices`/`opacities`/`borderWidths` TypeScript exports.

  The monolithic `scale.tokens.json` was broken up into one DTCG file per scale (`breakpoint`, `spacing`, `radius`, `shadow`, `size`); the plugin merges them by top-level group so all existing `--mp-*` / `$` / TS token names and values are unchanged. `@mission-platform/vite-plugin-tokens` now resolves a configurable list of structural sources instead of a single `scale` path.

- be8ab67: add marginBlock/marginInline logical-margin fields to the composite typography tokens

  Each `typography.tokens.json` variant (`display`, `h1`–`h6`, `body-lg`/`md`/`sm`/`xs`,
  `label`, `caption`, `code`) now carries `marginBlock` and `marginInline` fields aliased
  from the `spacing.*` scale (`{spacing.3}`, `{spacing.0}`, …). The generator's typography
  field list emits the matching `--mp-typography-<variant>-margin-block` /
  `--mp-typography-<variant>-margin-inline` CSS custom properties (referencing the primitive
  `--mp-spacing-*` tokens) and the `typography` TypeScript export gains the new
  `marginBlock`/`marginInline` keys. The plugin now resolves the composite typography
  `{spacing.*}` aliases (alongside the existing `{font.*}` aliases) when emitting the
  TypeScript module. The existing typography fields and public surface are unchanged.

- 4218ce5: generate font and composite typography artefacts from the new DTCG sources

  The plugin now reads the dedicated `font.tokens.json` and `typography.tokens.json`
  sources in addition to `palette`/`scale`/theme files. Font primitives are emitted
  alongside the structural scales (stable `$font-*` / `--mp-font-*` names), and the
  composite `typography` tokens — which are not plain aliases — are expanded by the
  plugin into `_typography.scss` (`--mp-typography-<variant>-*` custom properties) and a
  `typography` export in the generated TypeScript module. New helpers
  `buildTypographyCss` and `buildTypographyLiteral` are exported, and
  `buildLegacyModule` accepts an optional `typographyLiteral` argument.

- fe4917d: add vite plugin that generates the design-token code at build time

  Introduces the `@mission-platform/vite-plugin-tokens` workspace, whose
  `tokensPlugin` runs a self-contained custom generator during `vite build` (and
  on dev-server start) — no external CLI is involved. Each non-theme `*.tokens.json`
  DTCG source yields a matching self-contained `generated/scss/_<file>.scss` partial
  (its `$`-variables, `--mp-*` custom properties that interpolate the matching local
  `$`-variable, and `@property` registrations) — the colour palette and the
  flattened composite typography are emitted through this same structural path. The
  two theme sources are merged into one `generated/scss/_theme.scss` that emits
  `:root { color-scheme: light dark; --mp-color-*: light-dark(<light>, <dark>) }`
  with each value referencing a palette `var(--mp-color-*)`. Every source also
  yields a nested `as const` `generated/ts/<file>.ts` module (colours emitted as
  `oklab(...)` strings, aliases resolved). The aggregate `generated/_tokens.scss`
  (SCSS `@forward` barrel, including the theme) and `generated/tokens.ts`
  (TypeScript re-export barrel) are emitted alongside them. The generator is split
  into focused modules (`dtcg.ts`, `generators/scss.ts`, `generators/typescript.ts`).
  `@property` registrations use a typed `syntax` (with a local-`$var`
  `initial-value`) for the literal `color`/`dimension`/`number`/`fontWeight`/`duration`
  tokens and fall back to the universal `*` syntax (no `initial-value`) for
  `var()`-referencing tokens (typography) and non-typeable literals (shadows, easing
  curves, font-family stacks). The structural partials wrap both their `:root`
  custom properties and their `@property` registrations in the `@layer mp.tokens`
  cascade layer (the theme partial's `:root` is layered too), and each non-theme
  source additionally emits a CSS-free `generated/scss/_<file>-vars.scss` (the
  `$`-variables only) so internal SCSS can read a token's compile-time value without
  pulling in its `:root`/`@property` CSS.

### Patch Changes

- c7aeba7: simplify the DTCG flattener/generator and add missing doc comments

  Extracts the token-flattening walk and per-source artefact emission into
  smaller, documented helpers to lower their cyclomatic complexity, and adds
  the missing documentation comments on the DTCG type guards and helpers. The
  generated SCSS/TypeScript output is unchanged.

## 0.1.0

### Minor Changes

- 4218ce5: ship the `[data-theme]`/`.theme-*` scheme pins in the generated theme

  The generated `_theme.scss` now also emits the opt-in scheme pins —
  `[data-theme='light'], .theme-light { color-scheme: light }` and the matching
  dark rules — directly inside the `mp.tokens` cascade layer, alongside the
  `:root` `light-dark()` colour tokens. Importing `@mission-platform/tokens/scss/tokens`
  is therefore enough to pin a subtree (or the whole document) to one scheme via
  `data-theme`/`.theme-*`; the behaviour no longer depends on import order or on
  importing a separate theme entry point. The hand-written
  `@mission-platform/tokens/scss/themes/{light,dark}` partials are kept as
  backwards-compatible shims that now emit no CSS (the pin lives in `scss/tokens`),
  so a subtree pinned with `data-theme` re-themes itself and its descendants
  purely through `color-scheme` + `light-dark()`, without redefining any colour
  custom property.

- 4218ce5: add motion, z-index, opacity and border-width tokens and split the structural scale sources per concern

  Added four new DTCG token groups, each in its own source file: `motion.tokens.json` (`duration.*` transition/animation timings + `easing.*` curves), `z-index.tokens.json` (a shared `base` → `toast` stacking order), `opacity.tokens.json` (`disabled`/`muted`/`subtle`/… alpha levels) and `border-width.tokens.json` (`thin`/`thick`/`heavy`). These generate `--mp-duration-*`, `--mp-easing-*`, `--mp-z-index-*`, `--mp-opacity-*` and `--mp-border-width-*` CSS custom properties, matching SCSS `$`-variables, and new `durations`/`easings`/`zIndices`/`opacities`/`borderWidths` TypeScript exports.

  The monolithic `scale.tokens.json` was broken up into one DTCG file per scale (`breakpoint`, `spacing`, `radius`, `shadow`, `size`); the plugin merges them by top-level group so all existing `--mp-*` / `$` / TS token names and values are unchanged. `@mission-platform/vite-plugin-tokens` now resolves a configurable list of structural sources instead of a single `scale` path.

- be8ab67: add marginBlock/marginInline logical-margin fields to the composite typography tokens

  Each `typography.tokens.json` variant (`display`, `h1`–`h6`, `body-lg`/`md`/`sm`/`xs`,
  `label`, `caption`, `code`) now carries `marginBlock` and `marginInline` fields aliased
  from the `spacing.*` scale (`{spacing.3}`, `{spacing.0}`, …). The generator's typography
  field list emits the matching `--mp-typography-<variant>-margin-block` /
  `--mp-typography-<variant>-margin-inline` CSS custom properties (referencing the primitive
  `--mp-spacing-*` tokens) and the `typography` TypeScript export gains the new
  `marginBlock`/`marginInline` keys. The plugin now resolves the composite typography
  `{spacing.*}` aliases (alongside the existing `{font.*}` aliases) when emitting the
  TypeScript module. The existing typography fields and public surface are unchanged.

- 4218ce5: generate font and composite typography artefacts from the new DTCG sources

  The plugin now reads the dedicated `font.tokens.json` and `typography.tokens.json`
  sources in addition to `palette`/`scale`/theme files. Font primitives are emitted
  alongside the structural scales (stable `$font-*` / `--mp-font-*` names), and the
  composite `typography` tokens — which are not plain aliases — are expanded by the
  plugin into `_typography.scss` (`--mp-typography-<variant>-*` custom properties) and a
  `typography` export in the generated TypeScript module. New helpers
  `buildTypographyCss` and `buildTypographyLiteral` are exported, and
  `buildLegacyModule` accepts an optional `typographyLiteral` argument.

- fe4917d: add vite plugin that generates the design-token code at build time

  Introduces the `@mission-platform/vite-plugin-tokens` workspace, whose
  `tokensPlugin` runs a self-contained custom generator during `vite build` (and
  on dev-server start) — no external CLI is involved. Each non-theme `*.tokens.json`
  DTCG source yields a matching self-contained `generated/scss/_<file>.scss` partial
  (its `$`-variables, `--mp-*` custom properties that interpolate the matching local
  `$`-variable, and `@property` registrations) — the colour palette and the
  flattened composite typography are emitted through this same structural path. The
  two theme sources are merged into one `generated/scss/_theme.scss` that emits
  `:root { color-scheme: light dark; --mp-color-*: light-dark(<light>, <dark>) }`
  with each value referencing a palette `var(--mp-color-*)`. Every source also
  yields a nested `as const` `generated/ts/<file>.ts` module (colours emitted as
  `oklab(...)` strings, aliases resolved). The aggregate `generated/_tokens.scss`
  (SCSS `@forward` barrel, including the theme) and `generated/tokens.ts`
  (TypeScript re-export barrel) are emitted alongside them. The generator is split
  into focused modules (`dtcg.ts`, `generators/scss.ts`, `generators/typescript.ts`).
  `@property` registrations use a typed `syntax` (with a local-`$var`
  `initial-value`) for the literal `color`/`dimension`/`number`/`fontWeight`/`duration`
  tokens and fall back to the universal `*` syntax (no `initial-value`) for
  `var()`-referencing tokens (typography) and non-typeable literals (shadows, easing
  curves, font-family stacks). The structural partials wrap both their `:root`
  custom properties and their `@property` registrations in the `@layer mp.tokens`
  cascade layer (the theme partial's `:root` is layered too), and each non-theme
  source additionally emits a CSS-free `generated/scss/_<file>-vars.scss` (the
  `$`-variables only) so internal SCSS can read a token's compile-time value without
  pulling in its `:root`/`@property` CSS.

### Patch Changes

- c7aeba7: simplify the DTCG flattener/generator and add missing doc comments

  Extracts the token-flattening walk and per-source artefact emission into
  smaller, documented helpers to lower their cyclomatic complexity, and adds
  the missing documentation comments on the DTCG type guards and helpers. The
  generated SCSS/TypeScript output is unchanged.
