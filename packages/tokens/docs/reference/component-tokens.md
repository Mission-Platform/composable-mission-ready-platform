# Forge component-token reference

This is the canonical inventory and Figma handoff for Forge-authored components. It is intentionally independent of
the generated framework adapters: the same entry applies to Vue, React, Solid, Svelte, and Web Components.

## Reading the contract

The source of truth is the recursive component source tree under
[`tokens/component/`](../../tokens/component/), grouped by atomic level
(`atoms/`, `molecules/`, `organisms/`, and `templates/`). Each source is independently generated, while all sources
preserve the same stable `component.*` DTCG contract:

```text
component.<component>.<variant?>.<slot>.<state?>
  -> --mp-<component>-<variant?>-<slot>-<state?>
  -> Mission Platform / Component / <component> / <variant?> / <slot> / <state?>
```

The DTCG path is also the Figma and runtime override path; only the generated CSS name drops the `component` wrapper.
For example, `component.button.primary.background.hover` is emitted as `--mp-button-primary-background-hover`. A
source ID such as `component/atoms/button` identifies the file that owns the contract, not a new DTCG path.

Component values alias the existing primitive and semantic theme documents. Consequently, the Figma collection has
**Light** and **Dark** modes without duplicating component tokens. Runtime light/dark behavior continues to use
`color-scheme`, `light-dark()`, `[data-theme]`, and `.theme-*` subtree pins. Consumers and Storybook may override any
leaf below `component` in `overrides.tokens.json`; an override is applied after the generated token stylesheet. Overrides
continue to use `component.*` keys even though CSS custom properties use the layer namespace.

## Source and generated output layout

Every visual contract has one owner under the atomic source tree. The generator discovers new files recursively, so a
new source does not require a descriptor registration:

```text
packages/tokens/tokens/component/<atomic-level>/<source>.tokens.json
  -> packages/tokens/src/generated/scss/component/<atomic-level>/_<source>.scss
  -> packages/tokens/src/generated/scss/component/<atomic-level>/_<source>-vars.scss
  -> packages/tokens/src/generated/ts/component/<atomic-level>/<source>.ts
```

The generated SCSS and TypeScript barrels include every component source in deterministic source-ID order. Component
files may reuse shared contracts such as `button`, `field`, `input`, `navigation`, and `overlay`; composed components
must not duplicate those token paths. Behavior-only components, inherited-only glyphs, and layout/DOM formulas remain
outside the visual token contract unless an inventory entry assigns them visual ownership.

### Semantic slots and state vocabulary

| Slot family                                  | Figma role                                  | Typical states                                                                         |
| -------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------- |
| `background` / `surface` / `track` / `thumb` | Fill or control surface                     | `default`, `hover`, `active`, `disabled`, `loading`, `expanded`, `selected`, `invalid` |
| `text` / `label` / `helper-text`             | Typography colour or named typography style | `default`, `hover`, `disabled`, `selected`, `invalid`                                  |
| `border` / `focus-ring`                      | Stroke and keyboard indication              | `default`, `hover`, `focus-visible`, `active`, `disabled`, `selected`, `invalid`       |
| `padding` / `gap` / `radius` / `shadow`      | Geometry and elevation                      | default or size-specific                                                               |
| `opacity` / `transition`                     | De-emphasis and motion                      | `disabled`, `loading`, `hover`, `active`                                               |

Only states supported by a component are listed below. `expanded` is used for disclosure/select surfaces, `selected`
for choices/tabs/navigation, and `invalid` for form validation; no unused state variables are required.

## Inventory summary

The repository inventory is based on the following narrow source paths:

```text
packages/*/src/components/**/*.tsx
packages/*/src/components/**/*.stories.tsx
packages/*/src/components/**/*.module.scss
```

| Artifact              | Count | Meaning                                                                              |
| --------------------- | ----: | ------------------------------------------------------------------------------------ |
| Component TSX sources |   249 | Non-story Forge and email component sources                                          |
| Co-located stories    |   246 | Three recursive Markdown/tree helper sources intentionally have no standalone story  |
| CSS modules           |   219 | Local visual style modules; inline email and inherited contracts are also documented |
| Packages              |    20 | Every package containing a component source                                          |

The post-audit generated surface contains **2,841 token leaves**: 132 active, 2,161 protected, and 548 ambiguous;
there are no remaining candidates. The cleanup removed 189 unreachable leaves in total: the 185 candidates from the
review report plus 4 net second-order palette leaves (6 removed, 2 restored as reachable `.500` leaves) exposed after alias closure. This reduction affects generated
primitive, semantic, typography, and structural exports only; retained `component.*` paths and their
`--mp-<layer>-*` names are unchanged. The three unresolved aliases (`color.surface.raised`, `radius.2xs`, and
`font.weight.light`) predate this audit and remain unchanged.

Classification is per source, not per package:

- **Visual** — owns a CSS module or inline visual output and maps to the contract shown in the package table.
- **Inherited-visual** — renders no independently styled host; its appearance comes from a child, parent, `currentColor`,
  a third-party host/canvas, or the contract of the composed component.
- **Behavior-only** — controls rendering or viewport behavior and makes no visual decision of its own.

Every bullet below is one inventory entry. Unless a story is marked `story: missing`, the component has a matching
`<component>.stories.tsx` beside the source. A package/level heading supplies the stable source path prefix.

## `@mission-platform/components`

### Atoms — `packages/components/src/components/atoms/`

| Component                | Classification | Contract                                        | Appearance props / states                                                                   |
| ------------------------ | -------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `forge-avatar`           | visual         | `component.media`                               | `src`, `initials`, `size`, `shape`, `status`, `variant`; default/disabled status colours    |
| `forge-background-video` | visual         | `component.media`                               | source, autoplay/muted/loop; default/overlay                                                |
| `forge-badge`            | visual         | `component.feedback`                            | `variant`, `size`; default/disabled                                                         |
| `forge-button`           | visual         | `component.button.<variant>`                    | `variant`, `size`, `padding`, `margin`; default/hover/active/focus-visible/disabled/loading |
| `forge-icon-button`      | visual         | `component.button.<variant>` + `component.icon` | label, `variant`, `size`; default/hover/active/focus-visible/disabled/loading               |
| `forge-progress-bar`     | visual         | `component.feedback`                            | value, variant; default/loading/disabled                                                    |
| `forge-quote`            | visual         | `component.typography` + `component.surface`    | citation, variant; default                                                                  |
| `forge-responsive-image` | visual         | `component.media`                               | source, aspect/fit; default/placeholder                                                     |
| `forge-responsive-video` | visual         | `component.media`                               | source, controls/autoplay; default/overlay                                                  |
| `forge-separator`        | visual         | `component.surface`                             | orientation; default                                                                        |
| `forge-skeleton`         | visual         | `component.feedback`                            | shape/size; loading                                                                         |
| `forge-spinner`          | visual         | `component.feedback`                            | size, variant; loading                                                                      |
| `forge-stack`            | visual         | `component.layout`                              | direction, `gap`, alignment; default                                                        |
| `forge-status-icon`      | visual         | `component.feedback.<status>`                   | status, size; default/disabled                                                              |
| `forge-tag`              | visual         | `component.feedback`                            | variant, size, removable; default/hover/disabled                                            |
| `forge-theme-toggle`     | visual         | `component.button` + `component.icon`           | theme, size; default/hover/active/selected                                                  |
| `forge-typography`       | visual         | `component.typography`                          | `as`, typography variant, colour; default/link/disabled                                     |

### Molecules — `packages/components/src/components/molecules/`

| Component                 | Classification   | Contract                                       | Appearance props / states                                                                   |
| ------------------------- | ---------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `forge-accordion`         | visual           | `component.surface` + `component.navigation`   | items, expanded; default/hover/focus-visible/expanded/disabled                              |
| `forge-alert-banner`      | visual           | `component.feedback` + `component.overlay`     | status, dismissible; default/hover/focus-visible                                            |
| `forge-breadcrumb`        | visual           | `component.navigation`                         | items; default/hover/selected/focus-visible                                                 |
| `forge-button-group`      | visual           | `component.button-group`                       | orientation, attached, variant, gap; default/focus-visible/disabled                         |
| `forge-card`              | visual           | `component.surface`                            | variant, padding; default/hover/selected                                                    |
| `forge-chat-bubble`       | visual           | `component.media` + `component.surface`        | author, direction/status; default/selected                                                  |
| `forge-collapse`          | visual           | `component.collapse`                           | open, variant, disabled; default/hover/focus-visible/expanded/disabled                      |
| `forge-device-mock`       | visual           | `component.media.device`                       | device, orientation, size; default                                                          |
| `forge-dropdown`          | visual           | `component.overlay` + `component.navigation`   | open, placement; default/expanded/focus-visible                                             |
| `forge-grid`              | visual           | `component.layout.grid`                        | columns, gap, padding; default                                                              |
| `forge-in-view`           | visual           | `component.layout`                             | threshold; inherited child contract                                                         |
| `forge-language-switcher` | inherited-visual | `component.navigation` + child select contract | locale; default/expanded/selected                                                           |
| `forge-list`              | visual           | `component.surface`                            | variant, gap; default/selected                                                              |
| `forge-masonry`           | visual           | `component.layout.masonry`                     | columns, gap, padding; default                                                              |
| `forge-menu-item`         | visual           | `component.navigation`                         | active/disabled; default/hover/focus-visible/selected/disabled                              |
| `forge-menu`              | visual           | `component.navigation`                         | open/orientation; default/expanded                                                          |
| `forge-navbar-item`       | visual           | `component.navigation.navbar-item`             | active, dropdown, variant, disabled; default/hover/focus-visible/selected/expanded/disabled |
| `forge-pagination`        | visual           | `component.navigation`                         | page, size; default/hover/focus-visible/selected/disabled                                   |
| `forge-popover`           | visual           | `component.overlay`                            | open, placement; default/expanded/focus-visible                                             |
| `forge-tabs`              | visual           | `component.navigation`                         | orientation, active tab; default/hover/focus-visible/selected/disabled                      |
| `forge-timeline`          | visual           | `component.timeline`                           | status, orientation, outlined marker; default/selected                                      |
| `forge-toast`             | visual           | `component.overlay` + `component.feedback`     | status, duration; default/loading                                                           |
| `forge-tooltip`           | visual           | `component.overlay`                            | open, placement; default/expanded                                                           |
| `forge-window-popout`     | visual           | `component.overlay.window-popout`              | open, size; default/hover/focus-visible/selected                                            |

### Organisms and templates — `packages/components/src/components/{organisms,templates}/`

| Component                  | Classification   | Contract                                                | Appearance props / states                                                                                  |
| -------------------------- | ---------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `forge-carousel`           | visual           | `component.navigation.carousel`                         | slides, controls, autoplay, tone; default/hover/focus-visible/selected/disabled                            |
| `forge-chat-area`          | visual           | `component.media.chat-area`                             | size, header/footer slots, auto-scroll; default/loading                                                    |
| `forge-dialog`             | visual           | `component.overlay`                                     | open, title/footer; default/expanded/focus-visible                                                         |
| `forge-drawer`             | visual           | `component.overlay.drawer`                              | open, placement/size, resize; default/hover/active/expanded                                                |
| `forge-menubar`            | visual           | `component.navigation.menubar`                          | items, bordered, size; default/hover/focus-visible/expanded/disabled                                       |
| `forge-modal`              | visual           | `component.overlay`                                     | open, size, header/footer; default/expanded/focus-visible                                                  |
| `forge-navbar`             | visual           | `component.navigation.navbar`                           | items, responsive mode; default/hover/focus-visible/selected                                               |
| `forge-table`              | visual           | `component.data.table`                                  | columns, size, caption, striped/bordered/hoverable, tone, loading; default/hover/focus-visible/loading     |
| `forge-theme-composer`     | visual           | `component.surface` + `component.field`                 | theme values; default/invalid                                                                              |
| `forge-theme-provider`     | visual           | `component.layout`                                      | theme mode; default/light/dark                                                                             |
| `forge-toast-container`    | visual           | `component.overlay`                                     | placement; default/loading                                                                                 |
| `forge-tree-view-item`     | inherited-visual | `component.navigation` + `component.surface`            | expanded, selected, disabled; default/hover/focus-visible/expanded/selected/disabled                       |
| `forge-tree-view`          | visual           | `component.data.tree`                                   | nodes, size, defaultOpen, label renderer; default/hover/focus-visible/expanded/selected                    |
| `forge-virtual-list`       | visual           | `component.data.virtual-list`                           | items, size, itemHeight, height, overscan, row renderer; default/selected                                  |
| `forge-virtual-log-viewer` | visual           | `component.code.virtual-log-viewer`                     | level/filter, columns, follow-tail; default/hover/focus-visible/warn/error/fatal                           |
| `forge-virtual-table`      | visual           | `component.data.virtual-table` + `component.data.table` | columns, size, rowHeight, height, overscan, striped/bordered, sort; default/hover/focus-visible            |
| `forge-virtual-tabs`       | visual           | `component.navigation.tabs`                             | variant, active tab, closable/addable; default/hover/focus-visible/selected/disabled                       |
| `forge-virtual-tree-view`  | visual           | `component.data.virtual-tree`                           | nodes, size, itemHeight, height, overscan, defaultOpen, row renderer; default/hover/focus-visible/expanded |
| `forge-hero`               | visual           | `component.layout.hero`                                 | media, alignment, size, overlay; default                                                                   |

## Specialized Forge packages

| Package / level          | Component                      | Classification   | Contract                                               | Appearance props / states                                             |
| ------------------------ | ------------------------------ | ---------------- | ------------------------------------------------------ | --------------------------------------------------------------------- |
| `barcode/molecules`      | `forge-barcode`                | visual           | `component.code.barcode`                               | value, format, size; default/loading/invalid                          |
| `breakpoints/atoms`      | `forge-hide-at`                | behavior-only    | none                                                   | `min`, `max`; viewport visibility only                                |
| `breakpoints/atoms`      | `forge-show-at`                | behavior-only    | none                                                   | `min`, `max`; viewport visibility only                                |
| `breakpoints/molecules`  | `forge-breakpoint-debug`       | visual           | `component.debug.breakpoint`                           | breakpoint display; default                                           |
| `code-scanner/organisms` | `forge-code-scanner`           | visual           | `component.code.scanner`                               | camera/format, scanning; default/loading/invalid                      |
| `content/atoms`          | `forge-code-block`             | visual           | `component.code`                                       | language, copy; default/selected                                      |
| `content/atoms`          | `forge-mermaid`                | visual           | `component.code`                                       | diagram source, loading/error; default/loading/invalid                |
| `content/atoms`          | `forge-wysiwyg-toolbar-button` | visual           | `component.button` + `component.icon`                  | command, active; default/hover/active/focus-visible/disabled/selected |
| `content/molecules`      | `forge-markdown`               | visual           | `component.typography` + `component.code`              | size, links; default/invalid                                          |
| `content/molecules`      | `markdown-block`               | inherited-visual | `component.typography` + child contracts               | token, size; inherited                                                |
| `content/molecules`      | `markdown-inline`              | inherited-visual | `component.typography`                                 | token, links; inherited/hover/selected                                |
| `content/molecules`      | `forge-wysiwyg-block-controls` | visual           | `component.editor.block-controls` + `component.button` | block selection; default/hover/focus-visible/selected                 |
| `content/molecules`      | `forge-wysiwyg-block-menu`     | visual           | `component.editor.block-menu` + `component.overlay`    | open; default/expanded/selected                                       |
| `content/molecules`      | `forge-wysiwyg-status-bar`     | visual           | `component.editor.status-bar`                          | status; default/invalid/loading                                       |
| `content/molecules`      | `forge-wysiwyg-toolbar`        | visual           | `component.editor.toolbar` + `component.button`        | commands; default/disabled                                            |
| `content/organisms`      | `forge-monaco-editor`          | visual           | `component.editor.monaco` + `component.code`           | language, read-only; default/disabled/invalid                         |
| `content/organisms`      | `forge-wysiwyg-editor`         | visual           | `component.editor.wysiwyg` + `component.code`          | editable, invalid; default/focus-visible/invalid/disabled             |
| `float/molecules`        | `forge-alert-banner`           | visual           | `component.feedback` + `component.overlay`             | status, dismissible; default/focus-visible                            |
| `float/molecules`        | `forge-dropdown`               | visual           | `component.overlay` + `component.navigation`           | open; default/expanded/selected                                       |
| `float/molecules`        | `forge-popover`                | visual           | `component.overlay`                                    | open; default/expanded                                                |
| `float/molecules`        | `forge-toast`                  | visual           | `component.overlay` + `component.feedback`             | status; default/loading                                               |
| `float/molecules`        | `forge-tooltip`                | visual           | `component.overlay`                                    | open; default/expanded                                                |
| `float/organisms`        | `forge-dialog`                 | visual           | `component.overlay`                                    | open, title/footer; default/expanded/focus-visible                    |
| `float/organisms`        | `forge-modal`                  | visual           | `component.overlay`                                    | open, size, header/footer; default/expanded/focus-visible             |
| `float/organisms`        | `forge-toast-container`        | visual           | `component.overlay`                                    | placement; default/loading                                            |

### Forms — `packages/forms/src/components/`

All form entries use the shared `component.field` label/helper/error roles in addition to the contract below. Native
control states are represented only where the control supports them.

| Level     | Components (one entry per comma-separated name)                                                                                                                                                                                                                                                                                                                           | Classification / contract                                                                                                 | Shared appearance props and states                                                                           |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| atoms     | `forge-checkbox`, `forge-input`, `forge-radio`, `forge-range-input`, `forge-rating`, `forge-slider`, `forge-switch`, `forge-textarea`                                                                                                                                                                                                                                     | visual / `component.checkable` for checkbox/radio/rating/slider/switch; `component.input` for input/range-input/textarea  | `size`, label/value props; default/hover/active/focus-visible/disabled/invalid/selected where supported      |
| molecules | `forge-calendar`, `forge-color-input`, `forge-date-input`, `forge-date-range-input`, `forge-field-set`, `forge-file-input`, `forge-location-input`, `forge-multiselect`, `forge-number-stepper`, `forge-otp-input`, `forge-phone-input`, `forge-radio-group`, `forge-search-input`, `forge-segment-control`, `forge-select`, `forge-time-input`, `forge-time-range-input` | visual / `component.input`, `component.select`, `component.checkable`, or `component.field` according to composed control | `size`, `disabled`, validation and selection props; default/focus-visible/disabled/expanded/selected/invalid |
| organisms | `forge-date-time-range-input`, `forge-form-builder`, `forge-form-wizard`, `forge-schema-form-dialog`, `forge-schema-form`                                                                                                                                                                                                                                                 | visual / `component.field` + composed input/select/overlay contracts                                                      | schema, steps, validation; default/focus-visible/disabled/expanded/selected/invalid                          |

### Icons — `packages/icons/src/components/`

All 106 icon entries are **inherited-visual**. Glyphs use `currentColor`; their size is consumer-controlled or maps to
`component.icon.size`. They do not receive a per-glyph variable. Each has a co-located story and follows the same
default/selected/disabled colour roles where the parent exposes that state.

| Icon category           | Components                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| communication/messaging | `forge-icon-bell`, `forge-icon-chat`, `forge-icon-mail`, `forge-icon-phone`, `forge-icon-send`                                                                                                                                                                                                                                                                                                                                                                                                                               |
| communication/sharing   | `forge-icon-share`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| content/editing         | `forge-icon-copy`, `forge-icon-edit`, `forge-icon-eye`, `forge-icon-eye-off`, `forge-icon-redo`, `forge-icon-trash`, `forge-icon-undo`                                                                                                                                                                                                                                                                                                                                                                                       |
| content/files           | `forge-icon-download`, `forge-icon-upload`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| data/filtering          | `forge-icon-filter`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| data/tables             | `forge-icon-sort`, `forge-icon-table`, `forge-icon-table-column-add`, `forge-icon-table-column-remove`, `forge-icon-table-row-add`, `forge-icon-table-row-remove`                                                                                                                                                                                                                                                                                                                                                            |
| drawing/transform       | `forge-icon-draw-circle`, `forge-icon-draw-line`, `forge-icon-draw-polygon`, `forge-icon-draw-square`, `forge-icon-draw-triangle`, `forge-icon-move`, `forge-icon-palette`, `forge-icon-pencil`, `forge-icon-rotate-ccw`, `forge-icon-rotate-cw`, `forge-icon-scale-down`, `forge-icon-scale-up`                                                                                                                                                                                                                             |
| maps/countries          | `forge-icon-country-globe`, `forge-icon-flag`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| maps/geography          | `forge-icon-geodesic`, `forge-icon-globe`, `forge-icon-language`, `forge-icon-map-pin`                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| maps/layers             | `forge-icon-layer`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| maps/markers            | `forge-icon-map-marker-cluster`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| media/capture           | `forge-icon-camera`, `forge-icon-image`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| media/playback          | `forge-icon-pause`, `forge-icon-play`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| navigation/controls     | `forge-icon-arrow`, `forge-icon-chevron`, `forge-icon-chevrons`, `forge-icon-close`, `forge-icon-home`, `forge-icon-join`, `forge-icon-menu`, `forge-icon-minus`, `forge-icon-plus`, `forge-icon-refresh`, `forge-icon-split`                                                                                                                                                                                                                                                                                                |
| navigation/links        | `forge-icon-external-link`, `forge-icon-link`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| navigation/search       | `forge-icon-search`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| objects/system          | `forge-icon-cloud`, `forge-icon-debug`, `forge-icon-heart`, `forge-icon-lightning`, `forge-icon-puzzle`, `forge-icon-qr-code`, `forge-icon-settings`, `forge-icon-star`, `forge-icon-wrench`                                                                                                                                                                                                                                                                                                                                 |
| routing/directions      | `forge-icon-route`, `forge-icon-waypoint`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| security/access         | `forge-icon-lock`, `forge-icon-lock-open`, `forge-icon-user`                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| status/feedback         | `forge-icon-alert`, `forge-icon-alert-critical`, `forge-icon-alert-info`, `forge-icon-alert-neutral`, `forge-icon-alert-warning`, `forge-icon-check`, `forge-icon-error`, `forge-icon-info`, `forge-icon-notice`, `forge-icon-warning`                                                                                                                                                                                                                                                                                       |
| text/formatting         | `forge-icon-align-center`, `forge-icon-align-justify`, `forge-icon-align-left`, `forge-icon-align-right`, `forge-icon-blockquote`, `forge-icon-bold`, `forge-icon-bullet-list`, `forge-icon-code-block`, `forge-icon-code-inline`, `forge-icon-heading`, `forge-icon-heading-five`, `forge-icon-heading-four`, `forge-icon-heading-one`, `forge-icon-heading-six`, `forge-icon-heading-three`, `forge-icon-heading-two`, `forge-icon-italic`, `forge-icon-numbered-list`, `forge-icon-strikethrough`, `forge-icon-underline` |
| time/calendar           | `forge-icon-calendar`, `forge-icon-clock`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

### Other visual packages

| Package / level              | Component                                                                                                                                          | Classification   | Contract                                                     | Appearance props / states                                                                        |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `layout/atoms`               | `forge-container`                                                                                                                                  | visual           | `component.layout`                                           | max width, padding; default                                                                      |
| `layout/templates`           | `forge-application-layout`, `forge-bento-layout`, `forge-f-pattern-layout`, `forge-grid-layout`, `forge-vertical-layout`, `forge-z-pattern-layout` | visual           | `component.layout`                                           | layout configuration and gaps; default                                                           |
| `map/molecules`              | `forge-map-draw`, `forge-map-layer`, `forge-map-marker`, `forge-map-popup`, `forge-map-source`                                                     | inherited-visual | `component.map`                                              | map source/layer/marker/popup options; popup default/focus-visible, others host-inherited        |
| `map/organisms`              | `forge-map-libre`                                                                                                                                  | visual           | `component.map`                                              | controls, style, popup; default/loading/selected                                                 |
| `matrix-code/molecules`      | `forge-matrix-code`                                                                                                                                | visual           | `component.code`                                             | value, size; default/invalid/loading                                                             |
| `qr-code/molecules`          | `forge-qr-code`                                                                                                                                    | visual           | `component.code`                                             | value, size; default/invalid/loading                                                             |
| `resource-planner/organisms` | `forge-resource-planner`                                                                                                                           | visual           | `component.resource-planner`                                 | resources, range, selection; default/hover/selected/focus-visible/conflict/unavailable           |
| `scheduler/organisms`        | `forge-scheduler`                                                                                                                                  | visual           | `component.scheduler`                                        | range, events, selection; default/focus-visible/today/outside/busy                               |
| `select/atoms`               | `forge-tag`                                                                                                                                        | visual           | `component.feedback`                                         | variant, size, removable; default/hover/disabled                                                 |
| `select/molecules`           | `forge-language-switcher`                                                                                                                          | inherited-visual | `component.select` + `component.navigation`                  | locale; default/expanded/selected                                                                |
| `select/molecules`           | `forge-multiselect`, `forge-select`                                                                                                                | visual           | `component.select` + `component.input` + `component.field`   | size, options, model, validation; default/hover/focus-visible/disabled/expanded/selected/invalid |
| `theme/atoms`                | `forge-theme-toggle`                                                                                                                               | visual           | `component.button` + `component.icon`                        | mode; default/hover/active/selected                                                              |
| `theme/organisms`            | `forge-theme-composer`, `forge-theme-provider`                                                                                                     | visual           | `component.surface` + `component.field` / `component.layout` | theme values/mode; default/light/dark/invalid                                                    |
| `three/organisms`            | `forge-three-canvas`                                                                                                                               | inherited-visual | `component.media`                                            | canvas host dimensions are structural; inherited surface                                         |
| `typography/atoms`           | `forge-typography`                                                                                                                                 | visual           | `component.typography`                                       | variant, colour, `as`; default/link/disabled                                                     |
| `vcard`                      | `forge-icalendar`                                                                                                                                  | behavior-only    | none                                                         | serializes calendar data; no visual host                                                         |
| `vcard`                      | `forge-vcard`                                                                                                                                      | behavior-only    | none                                                         | serializes contact data; no visual host                                                          |

## Email components

`@mission-platform/email-components` is included because its TSX sources are Forge-authored. Email clients do not
consume runtime custom properties: the renderer resolves the same semantic roles into inline values. Every entry below
is visual and uses `component.email`, with `component.button`, `component.typography`, or `component.media` where noted.

| Level     | Components                                                                    | Contract                                                                                                                                                               |
| --------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| atoms     | `email-button`                                                                | `component.email` + `component.button.<variant>`; variants neutral/primary/secondary/tertiary/success/warning/info/error/critical/ghost; default/hover/active/disabled |
| atoms     | `email-divider`, `email-image`, `email-spacer`, `email-typography`            | `component.email` + `component.surface`/`component.media`/`component.typography`; default                                                                              |
| molecules | `email-card`, `email-column`, `email-list`, `email-row`, `email-social-links` | `component.email`; default/selected where links are interactive                                                                                                        |
| organisms | `email-footer`, `email-header`, `email-preheader`                             | `component.email` + `component.typography`; default                                                                                                                    |
| templates | `email-container`, `email-document`, `email-section`                          | `component.email`; default/light/dark source mode                                                                                                                      |

## Story and override coverage

There are 246 co-located stories for 249 component sources. The only sources without standalone stories are the
recursive helpers `components/organisms/forge-tree-view/forge-tree-view-item`,
`content/molecules/forge-markdown/markdown-block`, and `content/molecules/forge-markdown/markdown-inline`; their
visual states are exercised by their parent stories and are documented above as inherited-visual.

The shared Storybook preview loads `@mission-platform/tokens/scss/tokens`, the Storybook override plugin, and the
`theme` global. To inspect the contract, set the theme global to light or dark and use the component stories' controls;
to test consumer overrides, edit `apps/storybook/design-tokens/overrides.tokens.json` under `component` using a
`{ "light": "...", "dark": "..." }` value. The override schema is
[`vite-plugins/token-overrides/schema/token-overrides.schema.json`](../../../../vite-plugins/token-overrides/schema/token-overrides.schema.json).

The following leaves are intentionally component-scoped and can also be overridden on an individual component host
with the generated CSS custom property. The fallback values in composed components preserve the default when a host
does not define an override.

| Component            | DTCG override path                                 | Generated CSS variable pattern                         |
| -------------------- | -------------------------------------------------- | ------------------------------------------------------ |
| `forge-avatar`       | `component.media.avatar.size.<size>`               | `--mp-media-avatar-size-<size>`                        |
| `forge-avatar`       | `component.media.avatar.status-size.<size>`        | `--mp-media-avatar-status-size-<size>`                 |
| `forge-avatar`       | `component.media.avatar.status-border-width`       | `--mp-media-avatar-status-border-width`                |
| `forge-progress-bar` | `component.feedback.progress.size.<size>`          | `--mp-feedback-progress-size-<size>`                   |
| `forge-progress-bar` | `component.feedback.progress.indeterminate-*`      | `--mp-feedback-progress-indeterminate-duration/easing` |
| `forge-spinner`      | `component.feedback.spinner.border-width.<size>`   | `--mp-feedback-spinner-border-width-<size>`            |
| `forge-spinner`      | `component.feedback.spinner.animation-*`           | `--mp-feedback-spinner-animation-duration/easing`      |
| `forge-button`       | `component.button.spinner.animation-*`             | `--mp-button-spinner-animation-duration/easing`        |
| `forge-timeline`     | `component.timeline.marker.size/gutter/line.width` | `--mp-timeline-marker-size/gutter/line-width`          |

## Figma handoff checklist

1. Create the `Mission Platform / Component` variable collection with Light and Dark modes.
2. Import the component paths from the `component/<atomic-level>/` source tree, preserving component, variant, slot,
   and state segments.
3. Bind component variables to the corresponding primitive/semantic variables rather than copying raw colour or scale values.
4. Create component properties for the documented variants and sizes; create state variants only for states listed in the inventory.
5. Keep layout formulas, viewport breakpoints, canvas behavior, and DOM/accessibility behavior outside the visual variable collection.
