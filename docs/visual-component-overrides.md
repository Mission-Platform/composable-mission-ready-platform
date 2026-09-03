# Visual component override contract and migration inventory

Status: Component-property registration and Vue scoped-style support are
implemented. Typed `properties` bags, neutral `style` emission, co-located
`@property` partials, and target-aware Vue `v-bind()` lowering are in place.

## Scope and audit method

The audit target is the complete set matched by:

```text
packages/**/src/components/**/*.module.scss
```

The current audit found **258 source modules in 17 packages**. For each module, the following
co-located touch points were checked:

- `<component>.tsx` — the neutral JSX interface and root/wrapper ownership;
- `<component>.module.scss` — declarations, existing `--forge-*` variables,
  `--mp-*` token coverage, selectors, pseudo-classes and media rules; every
  concrete component-prefixed `--forge-*` reference is checked against a local
  registration partial;
- `<component>.stories.tsx` — the representative Storybook surface;
- `<component>.spec.ts` — neutral and/or target-rendering regression coverage;
- `index.ts` — the local type/component export and the package component
  barrel (`packages/<package>/src/components/index.ts`).

Every audited module has a neutral `.tsx` source and a co-located
`.stories.tsx`. Every module has a co-located `index.ts` except
`packages/ui/resource-planner/src/components/organisms/forge-resource-planner`;
that package barrel exports the source file directly. The package-level
barrels are therefore the export touch point even when a local barrel is
missing.

The classification is intentionally conservative:

- **Prototype** — already implements the nested bag/inherited-variable pattern
  and is the compatibility reference.
- **Existing semantic variable** — already emits a custom property, but the
  value is derived from a semantic prop such as `columns`; do not duplicate it
  in a generic override bag.
- **Migrate/review** — visual co-located CSS that can expose narrowly owned,
  token-backed controls after a component-by-component API decision. A
  tokenized declaration is not by itself a reason to make it public.
- **Excluded** — generated glyph, diagnostic, vendor/canvas, renderless state,
  or editor-owned styling with no safe component-owned override in this pass.

## Contract

### Public shape

Each component that is approved for overrides owns a named interface. The
property is optional and has no index signature:

```ts
export interface ComponentProperties {
  readonly "surface-color"?: string;
  readonly "border-width"?: string;
}

export interface ComponentProps {
  readonly properties?: Readonly<ComponentProperties>;
}
```

The concrete component interface remains the public export, for example
`TypographyProperties`; do not introduce a global `CSSProperties` dictionary.
Use a more descriptive alias when a value has a stable grammar (for example,
`TypographyFontFamily` or `TypographyLineHeight`) and use `string` only when
the CSS grammar legitimately includes token references, `calc()`, commas, or
browser-defined values. Unknown keys must be rejected by TypeScript excess
property checking.

The nested key is the component-owned concept, not a raw CSS declaration. Do
not expose `display`, `position`, `content`, animation internals, or a
declaration whose intended decision is already represented by a semantic prop
(`size`, `variant`, `columns`, `rows`, `gap`, and similar).

### Custom-property names and stylesheet resolution

Convert a nested key to one stable kebab-case custom property:

| Nested key      | Custom property                   |
| --------------- | --------------------------------- |
| `surface-color` | `--forge-component-surface-color` |
| `border-width`  | `--forge-component-border-width`  |
| `font-family`   | `--forge-typography-font-family`  |

The component slug is the public CSS namespace. The SCSS declaration resolves
the override before the token/default fallback:

```scss
color: var(--forge-component-surface-color, var(--mp-color-bg-surface));
```

If the current declaration has a meaningful non-token default, retain it as a
last fallback (`var(--forge-..., var(--mp-token, 1px))`). Do not create a new
Mission Platform token for a value already covered by `packages/tokens`.

Use `@property` with `inherits: true` when the value must cross descendants,
variant selectors, pseudo-classes, or a popup/wrapper boundary. Put the
inline custom-property map on the element owning the BEM root. For a
multi-element component, put it on the reliable existing wrapper so all
descendants inherit it; do not rely on Vue scoped attributes on nested
render-closure nodes. A portal rendered outside that wrapper needs an explicit
portal host/propagation decision, not a silently global variable.

### Declaration completeness

Every concrete `--forge-*` property read by a component module must have
exactly one matching `@property` registration in the module's imported,
co-located `_forge-<component>-properties.scss` partial. Registrations use
`inherits: true`, preserve the consuming token or literal fallback as their
`initial-value`, and are written as concrete names rather than unresolved Sass
interpolations. This includes every finite size, tone, state, typography,
popup, and map-generated variant, plus semantic anchors such as
`--forge-logo-columns`, `--forge-stats-columns`,
`--forge-testimonial-columns`, `--forge-grid-columns`, and
`--forge-grid-rows`.

The `--forge-*` declarations are component-local override metadata. The
`--mp-*` variables remain owned by `packages/tokens` and must not be
redeclared in component partials. A repeatable guard is available as
`pnpm validate:component-properties`; it scans source modules only and reports
the exact module and property for missing, duplicate, orphaned, or unresolved
declarations.

### Neutral output and precedence

The neutral JSX output uses the standard `style` property. Its type is an
intersection with the platform's `CSSStyleProperties`, not a separate
untyped/custom-property bag. Each component narrows the intersection to its
own stable custom-property names; the optional keys preserve the equivalent
`string | undefined` value contract while allowing omitted overrides:

```ts
type ComponentStyle = CSSStyleProperties & {
  readonly "--forge-component-surface-color"?: string | undefined;
  readonly "--forge-component-border-width"?: string | undefined;
};

const style: ComponentStyle = {};
if (properties.properties?.["surface-color"] !== undefined) {
  style["--forge-component-surface-color"] =
    properties.properties["surface-color"];
}
```

The concrete extension must list every exposed key; it must not use a string
index signature. Undefined values are omitted from the emitted object, so
token fallbacks remain active. Never emit a `styles` property; it is not part
of the neutral runtime contract and would be an unknown DOM attribute in
targets that do not lower it specially. Numeric semantic variables may keep
their existing `number` representation; typed override values are CSS strings
so units, commas, spaces, and `calc()` remain intact.

Precedence is, from lowest to highest: token/theme fallback, component
variant/default rule, semantic prop selection, component override custom
property, then an explicitly supplied consumer inline style (if the target
supports one). `className` remains the caller's class hook and can add rules,
but it must not be treated as a replacement for the typed bag. The override
bag does not change the selected semantic variant or bypass focus, disabled,
reduced-motion, or cascade-layer rules.

React, Svelte, Solid, and web-component output consume the neutral `style` map.
Only the Vue native-template SFC style path may later rewrite the corresponding
SCSS value to `v-bind('properties.<name>')`; Vue render-closure fallback and
all non-Vue stylesheet paths must remain valid ordinary CSS/SCSS.

The implementation touch points for that lowering are the neutral runtime
contract in `packages/compiler/forge/forge/src/runtime/types.ts` and `packages/compiler/forge/forge/src/runtime/h.ts`,
the existing neutral-to-Vue style lowering in
`packages/compiler/plugins/forge-vue/src/transformers/template.ts`, and the co-located
style assembly/emission in `packages/compiler/plugins/forge-vue/src/runtime/styles.ts` and
`packages/compiler/plugins/forge-vue/src/emitters/sfc.ts`. These files carry or lower the
typed `style` value; they must not add a framework-specific `styles` attribute.

## Prototype and existing candidates

These are the exact existing custom-property sites. They are regression and
compatibility anchors, not a request to replace semantic APIs with bags.

| Component                  | Style module                                                                                                     | Existing variables                                                                                      | Current owner/disposition                                                                          | Later touch points                                                                                                                |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `ForgeTypography`          | `packages/ui/typography/src/components/atoms/forge-typography/forge-typography.module.scss`                         | Complete `--forge-typography-*` surface, including base, display, variant, color, link and popup values | Prototype; inherited through the typography root and truncate-popup wrapper                        | `forge-typography.tsx`, local `index.ts`, `.spec.ts`, `.stories.tsx`; all concrete names are registered in the co-located partial |
| `ForgeLogoCloud`           | `packages/ui/components/src/components/organisms/forge-logo-cloud/forge-logo-cloud.module.scss`                     | `--forge-logo-columns`                                                                                  | Existing semantic variable; retain `columns` and its clamping                                      | `forge-logo-cloud.tsx`, local barrel, spec, story; no duplicate `properties.columns`                                              |
| `ForgeStatsSection`        | `packages/ui/components/src/components/organisms/forge-stats-section/forge-stats-section.module.scss`               | `--forge-stats-columns`                                                                                 | Existing semantic variable; retain `columns`                                                       | `forge-stats-section.tsx`, local barrel, spec, story; no duplicate `properties.columns`                                           |
| `ForgeTestimonialsSection` | `packages/ui/components/src/components/organisms/forge-testimonials-section/forge-testimonials-section.module.scss` | `--forge-testimonial-columns`                                                                           | Existing semantic variable; retain `columns`                                                       | `forge-testimonials-section.tsx`, local barrel, spec, story; no duplicate `properties.columns`                                    |
| `ForgeGridLayout`          | `packages/ui/layout/src/components/templates/forge-grid-layout/forge-grid-layout.module.scss`                       | `--forge-grid-columns`, `--forge-grid-rows`                                                             | Existing semantic variables derived from `columns`/`rows`; retain clamping and breakpoint behavior | `forge-grid-layout.tsx`, local barrel, spec, story; no duplicate grid bag                                                         |

The typography prototype now has a complete registration partial for every
concrete property consumed by its module, including all finite variant and
popup names. Its neutral JSX output uses `style={style}` and keeps the typed
`CSSStyleProperties` extension; the semantic typography API remains unchanged.

## Package-level inventory

The lists below are the complete component-slug inventory for the 258 matched
style modules. For every slug, the module, neutral source, story and (where
present) spec are in the same directory under the package's existing atom,
molecule, organism, or template path. The package module glob in the first
column is an exact pathspec for the style files.

| Package and exact module pathspec                           |   Count | Disposition                                                        |
| ----------------------------------------------------------- | ------: | ------------------------------------------------------------------ |
| `packages/integrations/barcode/src/components/**/*.module.scss`          |       1 | Migrate/review generated barcode presentation                      |
| `packages/ui/breakpoints/src/components/**/*.module.scss`      |       1 | Excluded diagnostic/debug presentation                             |
| `packages/integrations/code-scanner/src/components/**/*.module.scss`     |       1 | Migrate/review scanner host/frame presentation                     |
| `packages/ui/components/src/components/**/*.module.scss`       |      84 | 3 existing semantic variables; 81 migrate/review                   |
| `packages/content/content/content/src/components/**/*.module.scss`          |      10 | 8 migrate/review; 2 editor-owned/excluded                          |
| `packages/ui/float/src/components/**/*.module.scss`            |       8 | Migrate/review; popup/portal inheritance priority                  |
| `packages/ui/forms/src/components/**/*.module.scss`            |      28 | Migrate/review, preserving control semantics                       |
| `packages/ui/icons/src/components/**/*.module.scss`            |     106 | Excluded generated glyph wrappers                                  |
| `packages/ui/layout/src/components/**/*.module.scss`           |       7 | 1 existing semantic variable; 6 migrate/review                     |
| `packages/integrations/map/src/components/**/*.module.scss`              |       1 | Excluded MapLibre/canvas host                                      |
| `packages/integrations/matrix-code/src/components/**/*.module.scss`      |       1 | Migrate/review generated code presentation                         |
| `packages/integrations/qr-code/src/components/**/*.module.scss`          |       1 | Migrate/review generated code presentation                         |
| `packages/ui/resource-planner/src/components/**/*.module.scss` |       1 | Migrate/review domain presentation                                 |
| `packages/core/scheduler/src/components/**/*.module.scss`        |       1 | Migrate/review domain presentation                                 |
| `packages/ui/select/src/components/**/*.module.scss`           |       3 | Migrate/review, preserving selection semantics                     |
| `packages/ui/theme/src/components/**/*.module.scss`            |       3 | 1 migrate/review; 2 renderless/state exclusions                    |
| `packages/ui/typography/src/components/**/*.module.scss`       |       1 | Prototype                                                          |
| **Total**                                                   | **258** | **141 migrate/review, 5 prototype/semantic anchors, 112 excluded** |

### Coverage signals

The following signals are from the same module scan and are intentionally
orthogonal. **MP refs** counts modules containing `--mp-*` references; **color
literals** counts modules containing a color function or hex; **dimension
literals** counts modules containing a CSS length/percentage literal (including
intentional zero/viewport values); **Forge vars** counts modules containing an
existing `--forge-*` variable; **no token signal** counts modules containing
neither `--mp-*` nor `--forge-*`. These are triage signals, not automatic API
decisions.

| Package | Modules | MP refs | Color literals | Dimension literals | Forge vars | No token signal | Root/wrapper classification |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| barcode | 1 | 1 | 0 | 1 | 0 | 0 | single barcode root |
| breakpoints | 1 | 1 | 1 | 1 | 0 | 0 | diagnostic root |
| code-scanner | 1 | 1 | 0 | 1 | 0 | 0 | scanner host/frame root |
| components | 84 | 83 | 3 | 75 | 3 | 1 | BEM roots; selected inner grids and wrappers |
| content | 10 | 9 | 0 | 6 | 0 | 1 | roots plus editor/toolbar wrappers |
| float | 8 | 8 | 0 | 8 | 0 | 0 | popup, dialog, toast and portal-adjacent wrappers |
| forms | 28 | 28 | 0 | 25 | 0 | 0 | control roots with state descendants |
| icons | 106 | 0 | 0 | 1 | 0 | 106 | generated glyph roots/SVG wrappers |
| layout | 7 | 2 | 0 | 7 | 1 | 4 | layout roots; grid variables on grid root |
| map | 1 | 0 | 0 | 1 | 0 | 1 | MapLibre host/canvas root |
| matrix-code | 1 | 1 | 0 | 1 | 0 | 0 | generated-code root |
| qr-code | 1 | 1 | 0 | 1 | 0 | 0 | generated-code root |
| resource-planner | 1 | 1 | 0 | 1 | 0 | 0 | planner root with dense descendants |
| scheduler | 1 | 1 | 0 | 1 | 0 | 0 | scheduler root with dense descendants |
| select | 3 | 3 | 0 | 3 | 0 | 0 | select/control roots with popup descendants |
| theme | 3 | 2 | 0 | 0 | 0 | 1 | toggle root; composer/provider wrappers |
| typography | 1 | 1 | 0 | 1 | 1 | 0 | typography root plus truncate-popup wrapper |
| **Total** | **258** | **143** | **4** | **134** | **5** | **114** | Signals overlap by design |

The root placement rule follows from this classification: ordinary BEM modules
attach the map to their root; `ForgeLogoCloud`, `ForgeStatsSection`, and
`ForgeTestimonialsSection` currently place semantic column variables on their
inner grid/list; `ForgeGridLayout` places rows/columns on its root; and
`ForgeTypography` places inherited values on the popup wrapper when that
wrapper exists. Float/select popup structures use the same wrapper-level
inheritance rule, and the declaration guard covers every property used by their
popup styles.

### `@mission-platform/barcode`, `breakpoints`, and `code-scanner`

- `forge-barcode` — `packages/integrations/barcode/src/components/molecules/forge-barcode/`
  — source, module, local index, spec, story. Review only generated/barcode
  dimensions or surface controls that are not part of the barcode encoding API.
- `forge-breakpoint-debug` — `packages/ui/breakpoints/src/components/molecules/forge-breakpoint-debug/`
  — source, module, local index, spec, story. Excluded: this is a diagnostic
  viewport/debug display, not a reusable visual theme surface.
- `forge-code-scanner` — `packages/integrations/code-scanner/src/components/organisms/forge-code-scanner/`
  — source, module, local index, spec, story. Review scanner frame/container
  controls only; scanner engine behavior is not styling API.

### `@mission-platform/components` (84)

All entries below have `<slug>.tsx`, `<slug>.module.scss`,
`<slug>.stories.tsx`, `<slug>.spec.ts`, and `<slug>/index.ts`, with the package
barrel at `packages/ui/components/src/components/index.ts`.

**Existing semantic-variable anchors:**
`forge-logo-cloud`, `forge-stats-section`, `forge-testimonials-section`.

**Migrate/review:**

- Atoms: `forge-avatar`, `forge-background-video`, `forge-badge`,
  `forge-button`, `forge-divider`, `forge-gauge`, `forge-icon-button`,
  `forge-icon`, `forge-kbd`, `forge-progress-bar`, `forge-quote`,
  `forge-responsive-image`, `forge-responsive-video`, `forge-separator`,
  `forge-skeleton`, `forge-spinner`, `forge-stack`, `forge-status-icon`,
  `forge-surface`, `forge-sync-status-indicator`.
- Molecules: `forge-accordion`, `forge-alert`, `forge-breadcrumb`,
  `forge-button-group`, `forge-callout-block`, `forge-card`,
  `forge-carousel-indicator`, `forge-chat-bubble`, `forge-collapse`,
  `forge-device-mock`, `forge-drop-zone`, `forge-empty-state`, `forge-grid`,
  `forge-in-view`, `forge-inline-edit`, `forge-list`, `forge-masonry`,
  `forge-mention-input`, `forge-menu-item`, `forge-menu`, `forge-metric-card`,
  `forge-navbar-item`, `forge-pagination`, `forge-shortcut-hint`, `forge-tabs`,
  `forge-tag-input`, `forge-timeline`, `forge-window-popout`.
- Organisms: `forge-activity-feed`, `forge-announcement-bar`,
  `forge-asset-browser`, `forge-carousel`, `forge-chat-area`,
  `forge-command-palette`, `forge-comment-thread`, `forge-comparison-table`,
  `forge-cookie-consent`, `forge-cta-banner`, `forge-data-card`,
  `forge-diff-viewer`, `forge-drawer`, `forge-error-page`,
  `forge-kanban-board`, `forge-marketing-header`, `forge-menubar`,
  `forge-navbar`, `forge-notification-panel`, `forge-onboarding-tour`,
  `forge-pricing-table`, `forge-profile-card`, `forge-site-footer`,
  `forge-split-pane`, `forge-table`, `forge-transfer-list`, `forge-tree-view`,
  `forge-virtual-list`, `forge-virtual-log-viewer`, `forge-virtual-table`,
  `forge-virtual-tabs`, `forge-virtual-tree-view`.
- Template: `forge-hero`.

The three existing anchors remain semantic-prop-only for their current
`columns` API; a later pass may add other narrowly owned properties, but must
not expose a second way to select columns.

### `@mission-platform/content` (10)

`forge-code-block`, `forge-mermaid`, `forge-wysiwyg-toolbar-button`,
`forge-markdown`, `forge-wysiwyg-block-controls`, `forge-wysiwyg-block-menu`,
`forge-wysiwyg-status-bar`, `forge-wysiwyg-toolbar`, `forge-monaco-editor`,
`forge-wysiwyg-editor` are under their existing atom/molecule/organism
directories and all have source, module, story, local index, and the package
barrel at `packages/content/content/content/src/components/index.ts`.

Specs exist for `forge-code-block`, `forge-mermaid`, `forge-markdown`,
`forge-monaco-editor`, `forge-wysiwyg-status-bar`, and
`forge-wysiwyg-editor`. Specs are absent for the other four WYSIWYG controls.
`forge-monaco-editor` and `forge-wysiwyg-editor` are excluded from direct
editor styling overrides: Monaco/editor DOM and editor state own their inner
styles. Their surrounding host/toolbars remain review candidates.

### `@mission-platform/float`, `forms`, `layout`, and domain packages

- Float (all 8, each with source/module/spec/story/local index):
  `forge-alert-banner`, `forge-dropdown`, `forge-popover`, `forge-toast`,
  `forge-tooltip`, `forge-dialog`, `forge-modal`, `forge-toast-container`.
  Prioritize root-to-popup inheritance and wrapper/portal behavior.
- Forms (all 28, each with source/module/spec/story/local index):
  `forge-checkbox`, `forge-input`, `forge-radio`, `forge-range-input`,
  `forge-rating`, `forge-slider`, `forge-switch`, `forge-textarea`,
  `forge-calendar`, `forge-color-input`, `forge-date-input`,
  `forge-date-range-input`, `forge-field-set`, `forge-file-input`,
  `forge-location-input`, `forge-number-stepper`, `forge-otp-input`,
  `forge-phone-input`, `forge-radio-group`, `forge-search-input`,
  `forge-segment-control`, `forge-time-input`, `forge-time-range-input`,
  `forge-date-time-range-input`, `forge-form-builder`, `forge-form-wizard`,
  `forge-schema-form-dialog`, `forge-schema-form`.
  Preserve `size`, validation, checked, disabled, and selection semantics.
- Layout: `forge-container`, `forge-application-layout`, `forge-bento-layout`,
  `forge-f-pattern-layout`, `forge-vertical-layout`, `forge-z-pattern-layout`
  are review candidates. `forge-grid-layout` is the existing semantic anchor
  and keeps `rows`, `columns`, `gap`, `margin`, `padding`, and `breakpoint`.
  The package barrel is `packages/ui/layout/src/components/index.ts`.
- Generated/domain candidates (each has source/module/story/local index/spec
  unless noted): `forge-matrix-code` (`packages/matrix-code`), `forge-qr-code`
  (`packages/qr-code`), `forge-resource-planner`
  (`packages/resource-planner`; no local index, direct export from
  `src/components/index.ts`), and `forge-scheduler` (`packages/scheduler`).
- Select: `forge-tag`, `forge-multiselect`, and `forge-select`, each with
  source/module/spec/story/local index and the package barrel. Keep option
  state and selection props semantic.
- Theme: `forge-theme-toggle` is a review candidate; `forge-theme-composer`
  and `forge-theme-provider` are excluded from visual override migration as
  theme state/renderless provider infrastructure. The package barrel is
  `packages/ui/theme/src/components/index.ts`.

### `@mission-platform/icons` (106)

All 106 icon modules are generated glyph wrappers under
`packages/ui/icons/src/components/**`, have a neutral source, module, story and
local export, and are exported by the generated
`packages/ui/icons/src/components/index.ts`. None has a co-located spec. The
complete generated names are:

`forge-icon-alert`, `forge-icon-alert-critical`, `forge-icon-alert-info`,
`forge-icon-alert-neutral`, `forge-icon-alert-warning`, `forge-icon-align-center`,
`forge-icon-align-justify`, `forge-icon-align-left`, `forge-icon-align-right`,
`forge-icon-arrow`, `forge-icon-bell`, `forge-icon-blockquote`, `forge-icon-bold`,
`forge-icon-bullet-list`, `forge-icon-calendar`, `forge-icon-camera`,
`forge-icon-chat`, `forge-icon-check`, `forge-icon-chevron`, `forge-icon-chevrons`,
`forge-icon-clock`, `forge-icon-close`, `forge-icon-cloud`, `forge-icon-code-block`,
`forge-icon-code-inline`, `forge-icon-copy`, `forge-icon-debug`, `forge-icon-download`,
`forge-icon-draw-circle`, `forge-icon-draw-line`, `forge-icon-draw-polygon`,
`forge-icon-draw-square`, `forge-icon-draw-triangle`, `forge-icon-edit`,
`forge-icon-error`, `forge-icon-external-link`, `forge-icon-eye`, `forge-icon-eye-off`,
`forge-icon-filter`, `forge-icon-geodesic`, `forge-icon-globe`,
`forge-icon-country-globe`, `forge-icon-layer`, `forge-icon-map-marker-cluster`,
`forge-icon-flag`, `forge-icon-heading`, `forge-icon-heading-five`,
`forge-icon-heading-four`, `forge-icon-heading-one`, `forge-icon-heading-six`,
`forge-icon-heading-three`, `forge-icon-heading-two`, `forge-icon-heart`,
`forge-icon-home`, `forge-icon-image`, `forge-icon-info`, `forge-icon-italic`,
`forge-icon-join`, `forge-icon-language`, `forge-icon-lightning`, `forge-icon-link`,
`forge-icon-lock`, `forge-icon-lock-open`, `forge-icon-mail`, `forge-icon-map-pin`,
`forge-icon-menu`, `forge-icon-minus`, `forge-icon-move`, `forge-icon-notice`,
`forge-icon-numbered-list`, `forge-icon-palette`, `forge-icon-pause`,
`forge-icon-pencil`, `forge-icon-phone`, `forge-icon-play`, `forge-icon-plus`,
`forge-icon-puzzle`, `forge-icon-qr-code`, `forge-icon-refresh`, `forge-icon-redo`,
`forge-icon-route`, `forge-icon-rotate-ccw`, `forge-icon-rotate-cw`,
`forge-icon-scale-down`, `forge-icon-scale-up`, `forge-icon-search`,
`forge-icon-send`, `forge-icon-settings`, `forge-icon-share`, `forge-icon-sort`,
`forge-icon-split`, `forge-icon-star`, `forge-icon-strikethrough`,
`forge-icon-table`, `forge-icon-table-column-add`, `forge-icon-table-column-remove`,
`forge-icon-table-row-add`, `forge-icon-table-row-remove`, `forge-icon-trash`,
`forge-icon-undo`, `forge-icon-underline`, `forge-icon-upload`, `forge-icon-user`,
`forge-icon-warning`, `forge-icon-waypoint`, `forge-icon-wrench`.

These styles only establish the glyph wrapper (`inline-flex`, alignment,
`currentColor`, or SVG sizing). Consumers already control icon size through
the surrounding icon/font context or the icon's semantic API. Do not add a
bag to each generated icon.

### `@mission-platform/map` and `@mission-platform/typography`

`forge-map-libre` is the sole MapLibre host module at
`packages/integrations/map/src/components/organisms/forge-map-libre/`; it has a story and
local/package exports but no co-located spec. Its canvas/map engine owns the
inner visual model, so it is excluded; only host sizing behavior should be
considered if a later API explicitly requires it.

`forge-typography` is the sole typography module at
`packages/ui/typography/src/components/atoms/forge-typography/`. Its source,
local index, package barrel (`packages/ui/typography/src/components/index.ts`),
spec and story are the exact Step 2 touch points. Its existing inherited
properties are the reference for font-family, leading, display metrics and
truncate-popup descendants.

## Explicit exclusions and semantic-only rules

1. **Email components:** no email module is in the 258-match set. Email styles
   are intentionally inline and follow a separate rendering model; do not add
   this contract to `packages/email-components`.
2. **Generated icons:** all 106 `@mission-platform/icons` modules remain
   semantic glyph components, with no per-icon visual bag.
3. **Diagnostic/infrastructure hosts:** `ForgeBreakpointDebug`, `ForgeMapLibre`,
   `ForgeThemeComposer`, and `ForgeThemeProvider` remain excluded for the
   reasons above. Monaco/editor-owned DOM also remains excluded.
4. **Existing semantic dimensions:** `ForgeLogoCloud.columns`,
   `ForgeStatsSection.columns`, `ForgeTestimonialsSection.columns`, and
   `ForgeGridLayout.rows`/`columns` remain the only owners of those decisions.
   Their existing custom-property names must not conflict with future bag
   names.
5. **Semantic interaction props:** `size`, `variant`, checked/selected state,
   validation state, breakpoint, rows/columns, and control behavior are not
   CSS override keys. The bag may tune a component-owned visual value around
   the selected semantic state, but may not replace that state.

## Step 2 implementation checklist

- Add a typed `properties` interface only to rows classified
  **Migrate/review** after confirming the declaration is component-owned.
- Type each neutral override style as `CSSStyleProperties` intersected with
  the component's explicit custom-property keys (`string | undefined`); do
  not replace this with `Record<string, string>` or a global CSS dictionary.
- Add one `--forge-<slug>-<key>` fallback per exposed key, with token fallback
  and `inherits: true` where descendants require it.
- Attach only defined values to the component root/wrapper through `style`;
  never `styles` and never an unknown bag attribute.
- Update the exact local index and package component barrel when a new public
  type is introduced; preserve the existing export order/conventions.
- Add default/one-override/nested-state coverage to each affected spec and an
  override example to the existing co-located story. Use the anchor specs for
  logo/stats/testimonials/grid to protect semantic variables.
- Keep the Vue emitter work separate: native-template scoped styles may use
  Vue `v-bind()`, while neutral source and other target styles must remain
  framework-neutral.
