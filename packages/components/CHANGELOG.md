# @mission-platform/components

## 3.0.0

### Major Changes

- e02caaf: drive BaseFormBuilder from JSON Schema with Ajv-generated validation

  `BaseFormBuilder` / `useFormSchema` now take a single JSON Schema definition
  (`FormJsonSchema`) as their source of truth. Both the rendered fields and the
  validation rules are derived from it, with validation performed by
  [Ajv](https://ajv.js.org/) directly against the JSON Schema. Zod is no longer a
  dependency and validation schemas are no longer accepted as input.

  BREAKING CHANGE: the `schema` prop is now a JSON Schema document
  (`{ type: 'object', properties, required }` with an optional `ui` extension and
  `errorMessage` overrides) instead of `{ fields, zodSchema }`. The per-field
  `schema` / form-level `zodSchema` Zod inputs and the `FormSchema` type have been
  removed; use JSON Schema keywords (`minLength`, `format`, `minimum`, `enum`/
  `oneOf`, `required`, …) instead.

- 81b33bd: rebuild BaseFormBuilder from scratch with a simpler, clearer architecture

  The form builder is recreated around a three-column `BaseVerticalLayout`: a draggable field palette in the start
  sidebar, a tabbed Editor/Preview view in the centre, and an inspector in the end sidebar that shows the selected
  field's properties or the form/wizard settings. Drag-and-drop (powered by `@dnd-kit/vue`) supports dragging from the
  palette onto the canvas, reordering, moving fields between wizard steps, and nesting fields into field sets to any
  depth. The emitted JSON Schema definition remains compatible with `BaseSchemaForm`.

  BREAKING CHANGE: The public surface is now minimal. The granular sub-component exports (`BaseFormBuilderPalette`,
  `BaseFormBuilderPaletteItem`, `BaseFormBuilderCanvasItem`, `BaseFormBuilderFieldSet`, `BaseFormBuilderDropzone`,
  `BaseFormBuilderFieldEditor`, `BaseFormBuilderConditionEditor`, `BaseFormBuilderStepsEditor`) are no longer exported —
  only `BaseFormBuilder`, `useFormBuilder`, the schema helpers, and the public types remain. The builder's
  `paletteDraggable` / `inspectorDraggable` props are replaced by `startDraggable` / `endDraggable`.

- e02caaf: rename BaseFormBuilder to BaseSchemaForm and support multi-step form wizards

  The JSON-Schema-driven form builder is now `BaseSchemaForm` / `useSchemaForm`.
  Passing the `schema` prop a single object renders a one-step form as before;
  passing a top-level **array** of object schemas renders a multi-step **form
  wizard** — one step per entry, with each step's `title`/`description` labelling
  the step indicator and forward navigation gated on the current step validating.
  Step schemas share a single values bag, and `validate()` checks every step.

  BREAKING CHANGE: `BaseFormBuilder` → `BaseSchemaForm`, `BaseFormBuilderField` →
  `BaseSchemaFormField`, `BaseFormBuilderActions` → `BaseSchemaFormActions`,
  `useFormSchema` → `useSchemaForm`, and `FormBuilderTranslate` →
  `SchemaFormTranslate`. The `schema` prop now accepts `SchemaFormDefinition`
  (`FormJsonSchema | FormJsonSchema[]`); update imports and usages accordingly.

- 577c4d7: `BaseVerticalLayout` now sizes each side column via the canonical sidebar size scale. The free-form
  `startWidth`/`endWidth` CSS-length props are replaced with `startSize`/`endSize` (`SidebarSize`, `2xs`–`2xl`, default
  `md`), which are forwarded to the backing `BaseSidebar`'s `size` and used to derive the inline grid track widths from
  `SIDEBAR_SIZE_REM`.

### Minor Changes

- e02caaf: localise BaseFormBuilder validation messages and reuse Ajv's schema types

  Generated validation messages from `BaseFormBuilder` / `useFormSchema` /
  `createFormValidator` are now localised through vue-i18n. `BaseFormBuilder`
  translates them via its local i18n scope (new `errors.*` keys), and
  `useFormSchema` / `createFormValidator` accept an optional `translate` function
  (mirroring vue-i18n's `t(key, named)`). When no translate function is supplied,
  built-in English messages are used, and author-supplied `errorMessage`
  overrides always win verbatim.

  The form schema types now reuse Ajv's own published types: `JsonSchemaType` is
  derived from Ajv's `JSONType`, and the compiled `FormValidator.jsonSchema` is
  typed as Ajv's `SchemaObject`. A new `FormBuilderTranslate` type and a
  re-exported `SchemaObject` type are available from the package.

- 81b33bd: type `autocomplete` with the standard MDN tokens and expose autocapitalize presets

  The `autocomplete` attribute is now typed against the standard
  [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/autocomplete)
  token list rather than a free-form string. A new `Autocomplete` /
  `AutocompleteToken` union and a grouped `AUTOCOMPLETE_OPTIONS` list are exported
  from the package; `BaseInput`, `BaseTextarea`, the `BaseSchemaForm` `ui`
  options, and `BaseFormBuilder`'s `BuilderField` all adopt the union (any other
  string is still accepted for the rarer compound / section-prefixed forms).

  In the `BaseFormBuilder` inspector, the Autocomplete field is now a grouped
  dropdown of those tokens, and the Autocapitalize dropdown offers the full set of
  HTML presets (`none`, `off`, `on`, `sentences`, `words`, `characters`).

- 81b33bd: `BaseFormBuilder`: dnd-kit drag-and-drop, a wizard mode, and three new field types

  The visual form builder now uses [`@dnd-kit/vue`](https://dndkit.com/vue)
  (`useDraggable` / `useSortable` / `useDroppable`) for palette-to-canvas
  insertion and canvas reordering, replacing the previous native HTML5
  drag-and-drop while keeping the click/keyboard fallbacks.

  A new `wizard` prop groups fields into steps (each `BuilderField` carries a
  `step`) and emits a top-level array `SchemaFormDefinition`, which
  `BaseSchemaForm` renders as a multi-step form wizard. New `fieldsToWizardSchema`,
  `fieldsToDefinition`, and `schemaStepTitles` helpers are exported, and
  `schemaToFields` now accepts a wizard array.

  Three field types are added across both `BaseFormBuilder` and `BaseSchemaForm`:
  `multiselect` (array of options), `datetime` (paired date + time picker), and
  `file` (file upload, with `accept` / `multiple` `ui` hints).

- 81b33bd: `BaseFormBuilder`: show a drag ghost of the real control across the sortable lists

  Following dnd-kit's [multiple sortable lists](https://dndkit.com/react/guides/multiple-sortable-lists/)
  pattern, the builder now renders a shared `DragOverlay` ghost that tracks the
  pointer as a field travels from the palette to the canvas (or row to row).
  For a palette entry the ghost previews the **actual control** the field type
  represents — a live, disabled `BaseSchemaFormField` — rather than the palette
  chip; for an existing canvas row it shows a compact summary. The palette entry
  itself stays put and visibly dims while dragging, resetting once the drag ends,
  and the drop is still materialised as the real field on the canvas.

  A new `BaseFormBuilderDragPreview` component (the ghost) is exported from the
  package.

- 81b33bd: `BaseFormBuilder` now lets consumers configure whether its sidebar layout columns are resizable: new
  `paletteDraggable` (start) and `inspectorDraggable` (end) props (`SidebarDraggable`, default `false`) are forwarded to
  the underlying `BaseVerticalLayout`'s `startDraggable`/`endDraggable`, so the Fields palette and Inspector can be
  dragged to resize.
- 81b33bd: expose more input attributes in the form builder schema editor

  The form builder's field editor now supports the remaining input attributes already honoured by the schema-form
  pipeline: a "Disabled (read-only in the form)" toggle for any field (serialised to `ui.disabled`), and, for
  number/stepper fields, **Exclusive minimum**, **Exclusive maximum**, and **Multiple of** validations (serialised to
  `exclusiveMinimum`, `exclusiveMaximum`, and `multipleOf`). These attributes round-trip through `fieldsToSchema`/
  `schemaToFields`.

- 81b33bd: `BaseFormBuilder`: validate field keys to prevent silent property collisions

  A field's key becomes its JSON Schema property name, so two sibling fields
  sharing a key — or an empty key — silently collided in the generated schema (the
  later property overwrote the earlier one, dropping a field). The field editor's
  **Key** input now surfaces an inline error when the key is empty or duplicates a
  sibling in the same container (root canvas or field set), so authors can fix it
  before that data loss happens. A new pure `fieldKeyError` helper performs the
  check and `useFormBuilder` exposes `siblingKeys(id)` to feed it.

- 81b33bd: add nested field sets to BaseFormBuilder and a reusable BaseFieldSet

  `BaseFormBuilder` now supports building **nested groups** of fields. A new
  `fieldset` palette type creates a group that owns its own children; dragging a
  widget from the palette onto a field set (or clicking its "Add field to group"
  button) nests the new field inside it, and field sets can be nested to any
  depth. A field set serialises to a nested `object` JSON-Schema property
  (`properties` + nested `required`) and round-trips back through
  `schemaToFields`.

  Dragging a field type from the palette onto the canvas now always **creates a
  new field** (a duplicate of the chosen type) and never consumes the palette
  entry, and existing canvas items can never be dragged back into the palette —
  drops are only ever applied within the canvas (root list or a field set).

  A new presentation-only `BaseFieldSet` component is exported for reuse: a
  semantic `<fieldset>` with an optional `<legend>`, description, `flush` and
  native `disabled` support. `BaseFormBuilderFieldSet` (also exported) composes it
  with the builder's drag-and-drop behaviour. The shared schema-form types gain a
  `fieldset` `FormFieldType`, an `object` `JsonSchemaType`, and nested
  `properties`/`required` on `JsonSchemaProperty`.

- 81b33bd: add number stepper, location, date/time and range inputs, conditional field blocks, and start/end input
  extensions

  - add `BaseNumberStepper`, a numeric input with decrement/increment controls configurable as a signed/unsigned integer
    or a fixed-precision float
  - add `BaseLocationInput` capturing a centimetre-accurate coordinate in LatLng, Decimal Degrees, DMS, DM, or GeoJSON,
    with `convertLocation`/`parseLocation` and other coordinate-conversion utilities
  - extend the schema form and form builder with `stepper`, `date`, `time`, `daterange`, `timerange`, `datetimerange`,
    and `location` widgets plus integer/float/precision options
  - support conditional field visibility via JSON Schema `ui.visibleWhen` (`allOf`/`anyOf`/`oneOf`), excluding hidden
    fields from validation
  - add `start`/`end` extension slots to `BaseInput`, `BaseTextarea`, `BaseSelect`, `BaseMultiselect`, `BaseDateInput`,
    `BaseTimeInput`, `BaseDateRangeInput`, `BaseTimeRangeInput`, and `BaseDateTimeRangeInput`

- 81b33bd: preview where a dragged palette field will land in the `BaseFormBuilder` canvas

  - the palette entries are now `@dnd-kit/vue` **sortables** (in their own `PALETTE_GROUP`) instead of plain draggables,
    so dragging one over the canvas is a cross-group sortable move
  - dnd-kit's built-in `OptimisticSortingPlugin` projects the dragged entry into the canvas (and field-set /
    wizard-step) lists as you drag, opening a placeholder gap that previews exactly where the new field will be inserted
  - the drop now commits the new field at that projected position (falling back to the hovered drop target when no
    projection is reported), and the palette stays intact — drops never consume an entry or create duplicates

- 81b33bd: add a Schema tab to BaseFormBuilder showing the emitted JSON Schema

  - the centre tab strip now has a third **Schema** tab next to **Editor** and **Preview**, rendering the builder's
    emitted definition as pretty-printed JSON via `BaseCodeBlock` (with syntax highlighting and line numbers)
  - the JSON stays in sync with the form as you build it, so you can inspect or copy the schema the builder produces

- 81b33bd: `BaseFormBuilder`: let dnd-kit determine where a dragged field lands

  Dragging a field type from the palette onto the canvas previously relied on a
  bespoke placeholder "ghost" whose position was computed by hand, which made it
  jump around as the layout shifted. Palette entries are now `@dnd-kit/vue`
  sortables in their own group, so dragging one onto the canvas is a _cross-group_
  move: dnd-kit's `OptimisticSortingPlugin` opens the placeholder gap and projects
  the insertion index itself, and the field is committed at that exact slot on
  drop. The result is a stable, library-driven insertion position; the previous
  custom ghost row has been removed.

- 81b33bd: add a wizard-only Steps tab to BaseFormBuilder for configuring steps

  - in `wizard` mode the centre tab strip now shows a **Steps** tab right next to **Editor** for adding / removing steps
    and editing each step's title, description, and conditional visibility
  - the step configuration moved out of the end inspector into this dedicated tab; the inspector's no-selection panel is
    now just the form title / description ("Form settings")
  - the Steps tab is only present in wizard mode, and the active tab falls back to **Editor** when wizard mode is turned
    off

- 81b33bd: update a field's wizard step when it is dragged between step lists in `BaseFormBuilder`

  - in wizard mode, dragging a top-level field row from one step's list and dropping it onto another step (its drop
    zone, or a row that belongs to it) now reassigns the field to that step instead of leaving its step number unchanged
  - the moved field is slotted into the target step — just before the hovered row, or appended to the end when dropped
    onto the step's empty drop zone
  - dropping a row back onto its own step keeps its step, and field-set children (which carry no step) are unaffected

- 81b33bd: represent `BaseFormBuilder` wizard fields as a per-step matrix instead of tagging each field with a step

  - the builder's working field tree is now shape-driven: in wizard mode `useFormBuilder().fields` is a
    `BuilderField[][]` (one inner list per step), and in single-step mode it stays a flat `BuilderField[]` — the `step`
    property has been removed from `BuilderField`, so a field's step is simply which list it lives in
  - `schemaToFields` now returns the matching shape (`BuilderField[][]` for a wizard/array definition, `BuilderField[]`
    for a single-step/object definition), and `fieldsToWizardSchema` accepts the per-step matrix; `createField` no
    longer takes a `step` option
  - `useFormBuilder` exposes `selectedStep` and `moveFieldToStep`, derives `stepCount` from the step lists, and
    reorders/duplicates/removes within each step's own list; the properties inspector moves a field between steps
    instead of patching a `step` field

- 81b33bd: show one canvas list per step when `BaseFormBuilder` runs in wizard mode

  - in wizard mode the builder canvas now renders a separate, titled list for each wizard step (using the step's
    title/description, falling back to `"Step {n}"`) instead of a single flat list, so authors see at a glance which
    fields belong to which step; single-step (non-wizard) forms keep the original single list
  - each step list is its own drop target and `@dnd-kit/vue` sortable group: dropping a palette field onto a step adds
    it to that step, dragging a field onto an existing row inherits that row's step, and reordering / move-up /
    move-down operate within the step the field belongs to
  - empty steps render a per-step drop placeholder so fields can be added to any step directly
  - new `canvasStepGroup` / `canvasGroupStep` helpers and a `step` drop-zone kind back the per-step grouping

- 81b33bd: add a dedicated wizard "Steps" inspector tab to `BaseFormBuilder` and make `BaseCodeBlock` body scrollable
  with a sticky header

  - `BaseFormBuilder` now configures wizard steps in their own **Steps** inspector tab (wizard mode only) that lists
    every step at once, independently of the selected field — add/remove steps and edit each step's title, description,
    and conditional visibility in one place
  - the per-step `visibleWhen` editor moved out of the field editor (which keeps only the per-field "Wizard step"
    assignment), decoupling step configuration from individual fields
  - new `BaseFormBuilderStepsEditor` component and `useFormBuilder` step operations (`addStep`, `removeStep`,
    `setStepTitle`, `setStepDescription`) plus an explicit `stepCount` and `stepDescriptions`; wizard schemas now emit
    contiguous steps so empty steps are preserved
  - added `schemaStepDescriptions` and a `stepDescriptions` / `stepCount` option to `fieldsToWizardSchema`
  - `BaseCodeBlock` gains a `maxHeight` prop: the code body scrolls vertically within the cap while the header (
    filename/language + copy button) stays pinned; the form builder's schema preview adopts it

- 577c4d7: limit BaseLocationInput to DD, DM, and DMS formats on a single line

  The coordinate-format selector now offers only Decimal Degrees (DD), Degrees Decimal Minutes (DM), and Degrees Minutes
  Seconds (DMS), and the format selector and latitude/longitude inputs are laid out on a single row. The form builder's
  location field editor offers the same three formats.

- a085437: render and validate field sets in BaseSchemaForm, and fix palette drag duplicates

  `BaseSchemaForm` now renders **field sets**: an `object`-typed property (with or
  without `ui.widget: 'fieldset'`) becomes a labelled `BaseFieldSet` group whose
  nested `properties` render as child fields and whose value is a nested object
  (e.g. `address: { street, city }`). Field sets nest to any depth; defaults,
  Ajv validation, and value updates all recurse, and nested validation errors are
  keyed by their dotted path (`address.street`) and shown on the individual
  nested controls (including wizard step error highlighting).

  Palette entries in `BaseFormBuilder` are now plain draggables instead of
  sortables, so a palette item is no longer "dragged over" into the canvas while
  dragging. This fixes spurious **duplicate fields** appearing after the first
  field was placed: each palette drop now adds exactly one new field, resolved
  from the drop target (the canvas, a row, or a field set).

- e02caaf: add per-step and final wizard validation modes to schema form with errored-step highlighting

  `BaseSchemaForm` gains a `validationMode` prop (`'per-step'` | `'final'`): `'per-step'` (default) keeps gating forward
  navigation on the current step validating, while `'final'` lets the user move freely between steps and defers
  validation until submit. In both modes any step whose fields currently hold errors is highlighted in the wizard step
  indicator. `WizardStep` gains an optional `error` flag and `useSchemaForm` exposes a reactive `stepHasErrors` array.

- 577c4d7: add an inline, fixed-open variant to `BaseSidebar`

  - new `variant` prop (`overlay` | `inline`) plus `inlineBreakpoint` (defaults to `md`): an `inline` sidebar renders in
    normal document flow as a static, always-open column at and above the breakpoint, and falls back to the toggleable
    overlay drawer below it (responsive sidebar)
  - in inline mode the sidebar drops the backdrop/teleport/slide transition, ignores `open`, never auto-closes on route
    change, and hides its header close button (new `hideClose` prop on `BaseSidebarHeader`)
  - export the new `SidebarVariant` type; this lets layout primitives (e.g. a three-column form builder) reuse
    `BaseSidebar` for their start/end panels

- 577c4d7: add a resizable `draggable` option to `BaseSidebar` and `BaseVerticalLayout`

  `BaseSidebar` gains a `draggable` prop that renders a drag handle on the
  sidebar's inner edge and lets the user resize it. It accepts `true` (resizable
  up to the full viewport width), a named size (`2xs`–`2xl`, e.g. `lg` for a fixed
  maximum width), or a `number` treated as a custom maximum width in `rem`. While
  dragging, the new `resize` event reports the current width in `rem`. The named
  width scale (`2xs`–`2xl`, default `md`) is also exposed as the
  `SIDEBAR_SIZE_REM` map.

  `BaseVerticalLayout` forwards the same capability via new `startDraggable` /
  `endDraggable` props, keeping each inline column's grid track in lock-step with
  the dragged width.

- 81b33bd: add `BaseVerticalLayout` and adopt it in `BaseFormBuilder`

  - new `BaseVerticalLayout` three-column layout primitive (start / content / end): the start and end columns reuse
    `BaseSidebar`'s `inline` variant so they render as static, fixed-open columns at and above a configurable
    `breakpoint` and collapse into toggleable overlay drawers below it
  - exposes `startOpen` / `endOpen` models for the mobile drawers plus a scoped default slot (
    `{ isInline, toggleStart, toggleEnd }`) for rendering drawer-toggle controls
  - `BaseFormBuilder` now uses `BaseVerticalLayout` for its palette / canvas / inspector columns, making the builder
    mobile-responsive (palette and inspector become toggleable sidebars on small screens) instead of a hard-coded CSS
    grid

- 81b33bd: add BaseFormBuilder for visual drag-and-drop JSON-Schema form building

  `BaseFormBuilder` is a visual authoring surface for JSON-Schema forms — the
  counterpart to `BaseSchemaForm`. Drag field types from a palette (or click them)
  onto a canvas, reorder fields by dragging, and edit each field's label, key,
  type, validation, and options in the inspector. The component emits a
  `FormJsonSchema` document via `v-model` that can be fed straight back into
  `BaseSchemaForm`, and the inspector offers a live preview and the raw generated
  schema. Also exports the `useFormBuilder` composable and the pure
  field-to-schema conversion helpers (`fieldsToSchema`, `schemaToFields`,
  `createField`, …).

- 81b33bd: add conditional wizard steps to the schema form and form builder

  - support a step-level `visibleWhen` rule on each wizard step schema (`FormJsonSchema`), so a whole step — its
    indicator entry and its fields — is shown or skipped as a unit based on the shared form values
  - `useSchemaForm` now exposes `visibleStepIndices` and skips hidden steps during `next`/`previous`/`goTo` navigation
    and `validate`, so a required field on a hidden step never blocks finishing; the active step snaps to the nearest
    visible one when its condition stops holding
  - `BaseFormBuilder` can configure step conditionals: selecting a field in wizard mode exposes a "Step N visibility"
    editor, round-tripped through the step schema's `visibleWhen`
  - add a reusable `BaseFormBuilderConditionEditor` (used for both field and step rules) and the `schemaStepConditions`
    helper

### Patch Changes

- 576b2ed: reformat SFC style blocks and form-builder stories with Prettier

  Whitespace-only formatting (multi-line SCSS `@each` maps and a story's nested
  condition objects) with no template, script, or behaviour change.

- 81b33bd: add form builder stories covering every field type and condition

  - add an `AllFieldTypes` story loading a schema with one of every palette field (`text`, `textarea`, `markdown`,
    `email`, `password`, `url`, `tel`, `number`, `stepper`, `select`, `multiselect`, `radio`, `checkbox`, `switch`,
    `date`, `time`, `datetime`, `daterange`, `timerange`, `datetimerange`, `location`, `file`, and a nested `fieldset`)
  - add a `Conditions` story demonstrating each `ui.visibleWhen` operator (`equals`, `notEquals`, `in`, `contains`,
    `gt`, `gte`, `lt`, `lte`, `truthy`) and each combinator (`allOf`, `anyOf`, `oneOf`)

- c1834ea: clean up form-builder internals to satisfy DeepSource

  Internal-only refactors with no public API or behaviour change, addressing the
  DeepSource findings for the form builder and location input:

  - decomposed high-complexity helpers (`inferWidget`, `propertyToField`,
    `buildUi`, `builderFieldToProperty`, `moveField`, `updateField`, `resolveDrop`,
    `onDragEnd`) into small, single-purpose functions and lookup maps;
  - added the missing `u` flag to the `slugify` regexes and replaced
    non-interpolated template strings with plain string literals;
  - added JSDoc to the builder/location-input helper functions and removed a
    redundant `undefined` argument.

- 81b33bd: prioritise nested form-builder drop zones so dragging into them is easier

  - the form builder's drop zones now set an explicit `@dnd-kit/vue` collision priority that grows with nesting depth (
    canvas < wizard step < field set), so the innermost drop target wins instead of the larger outer canvas stealing the
    drop
  - each wizard step is its own prioritised droppable, so dropping a field onto a step reliably adds it to that step

- 81b33bd: reuse the components and icons library across the form builder

  - the form builder's inspector now uses `BaseTabs` for the Properties / Steps / Preview / Schema tabs instead of a
    bespoke `<nav>` of `<button>`s
  - every action control (move up/down, duplicate, remove, add field/option/rule/step, add field to group) now renders a
    `BaseButton` with the matching `@mission-platform/icons` icon (`IconChevron`, `IconCopy`, `IconMove`, `IconTrash`,
    `IconPlus`) instead of raw `<button>`s and unicode glyphs
  - `BaseTabs` now reacts to external `v-model` (`modelValue`) changes so it can be driven as a controlled input
  - fix: `BaseTabs` now shows only the active tab's panel — inactive `BaseTabPanel`s are hidden with `v-show` (an inline
    `display: none` that reliably beats the scoped `.base-tabs__panel { display: flex }` rule), in addition to keeping
    the `[hidden]` attribute for accessibility

- 81b33bd: fix the `BaseFormBuilder` palette so a dropped entry resets back to the palette instead of being duplicated
  in the canvas

  - `BaseFormBuilderPaletteItem` now owns its `<li>` list item as its root element, and that `<li>` is the registered
    `@dnd-kit/vue` sortable element (the palette `<ul>` renders the item directly rather than wrapping it in its own
    `<li>`)
  - while dragging, dnd-kit physically relocates the sortable element to preview the drop gap and does not move it back
    on a (non-cancelled) drop; because the relocated node is now the item's keyed component root that Vue owns in the
    palette `<ul>`, Vue reconciles it back into the palette on the re-render the drop triggers
  - the dropped entry therefore returns to the palette and the canvas only shows the newly added field — no
    leftover/duplicate palette node
  - the sortable `handle` is set to the list item so a drag still starts when the press lands on the inner `<button>` (
    dnd-kit's pointer sensor otherwise suppresses drags begun on an interactive descendant), while clicking the button
    keeps adding a field

- 81b33bd: render the form builder schema preview in a `BaseCodeBlock`

  - the inspector's "Schema" tab now displays the generated JSON Schema via `BaseCodeBlock` (with `language="json"`,
    syntax highlighting, and a copy button) instead of a plain `<pre><code>` block

- 81b33bd: stop form-builder field rows from jumping around while dragging, especially when nesting

  - the canvas field rows now drop `@dnd-kit/vue`'s default sortable plugins (chiefly the optimistic-sorting plugin),
    which live-reordered and re-parented the DOM on every `dragover`; with the builder's deeply nested, per-container
    sortable groups that made rows visibly jump around mid-drag and fought Vue, which only mutates the field tree once
    on drop
  - each field row's sortable now scopes its _droppable_ shape to the row header (via dnd-kit's `target`) instead of the
    whole card; a field set's card wraps its nested drop area, so the full-card droppable used to cover and shadow the
    nested (lower-priority) dropzone — dragging a field into a group resolved to the group row itself, so the field
    landed _beside_ the group instead of _inside_ it, and the overlapping targets made the drop marker flip-flop ("
    bounce"). With the header-only drop shape, nesting into a group now resolves correctly and the jitter is gone
  - rows now stay put during a drag, with the pointer-following drag overlay and a steady accent-line drop-target marker
    on the row showing where a field will land
  - keyboard reordering is unaffected — it is provided by the explicit move-up / move-down buttons on every row (the
    drag handle was never keyboard-focusable)

- dfb4eaa: use BaseTypography for presentational text across components

  Replace raw `<h2>`/`<h3>`/`<p>`/`<legend>`/`<strong>` text markup with `BaseTypography` (variant/weight/color props)
  in `BaseFieldSet`, the form-builder family (`BaseFormBuilder`, palette, steps editor, canvas item, field editor, field
  set), `BaseSchemaForm`'s datetime field, `BaseVirtualTableFooter`, and `BaseFileInput`, and drop the now-redundant
  font CSS those elements carried.

  - @mission-platform/breakpoints@3.0.0
  - @mission-platform/harper@0.1.4
  - @mission-platform/hunspell@0.3.1
  - @mission-platform/i18n@0.4.0
  - @mission-platform/icons@1.0.0
  - @mission-platform/tokens@0.3.0

## 2.0.0

### Major Changes

- a6ac78b: unify component variants on `primary`, `secondary`, `tertiary`, `default`, `success`, `warning`,
  `information`, `error` & `critical`

  All semantic-color components (`BaseButton`, `BaseBadge`, `BaseTag`, `BaseSpinner`,
  `BaseProgressBar`, `BaseMenuItem`, `BaseNavbarItem`) now share one canonical
  `variant` set. **Breaking:** the old per-component values were renamed —
  `danger` → `error`, `info` → `information`, `neutral` → `default`, and the button's
  `ghost` → `tertiary`. `default` keeps the neutral treatment, `tertiary` keeps the
  ghost/transparent treatment, and `information` keeps the info treatment.

  `@mission-platform/tokens` adds the backing semantic CSS-variable families
  (`secondary`, `tertiary`, `default`, `information`, `critical`) for both the light
  and dark themes, plus a new `critical` primitive colour scale.

### Minor Changes

- a6ac78b: unify all component `size` props on the canonical `2xs`, `xs`, `sm`, `md`, `lg`, `xl` & `2xl` scale

  Every `size`-bearing component (`BaseButton`, `BaseBadge`, `BaseTag`, `BaseSpinner`,
  `BaseProgressBar`, `BaseAvatar`, `BaseSwitch`, `BaseInput`, `BaseTextarea`, `BaseSelect`,
  `BaseMultiselect`, `BaseSearchInput`, `BaseDateInput`, `BaseTimeInput`, `BaseDateRangeInput`,
  `BaseTimeRangeInput`, `BaseDateTimeRangeInput`, `BaseColorInput`, `BaseCalendar`, `BaseList`,
  `BaseStatusIcon`, `BaseSidebar`, `BaseModal`) now accepts the full seven-step scale
  `2xs | xs | sm | md | lg | xl | 2xl`, with `md` remaining the default. The component SCSS
  is wired to the shared `--mp-size-*` tokens so every step is consistent across the library.
  `BaseModal` additionally keeps its special `full` (near-fullscreen) value. The change is
  additive for existing values (`sm`/`md`/`lg`/`xs`/`xl`/`full` still work), though the rendered
  metrics of some steps are refined to match the token scale.

  `@mission-platform/icons` `useIconSize` (and every icon's numeric `size` prop) now emits the
  value in `rem` instead of `px`.

  BREAKING CHANGE: a numeric icon `size` is now interpreted as pixels and converted to `rem`
  (e.g. `size={32}` → `2rem` instead of `32px`, assuming a 16px root). Pass a named token
  (`md`, `lg`, …) or an explicit unit string if you need different behaviour.

### Patch Changes

- Updated dependencies [f0a0e11]
- Updated dependencies [a6ac78b]
- Updated dependencies [a6ac78b]
  - @mission-platform/breakpoints@3.0.0
  - @mission-platform/icons@1.0.0
  - @mission-platform/i18n@0.4.0
  - @mission-platform/harper@0.1.4
  - @mission-platform/hunspell@0.3.1
  - @mission-platform/tokens@0.3.0

## 1.0.0

### Major Changes

- 6a1d844: Move `BaseMonacoEditor` (and its `MonacoEditorLanguage` / `MonacoEditorTheme`
  type aliases) from the main barrel to a dedicated `./monaco` subpath export so
  apps that don't render a code editor pay no Monaco / language-worker bundle
  cost. The component is now exported as an async (dynamically imported)
  component, so even consumers that opt in only pay the load cost lazily on
  first mount.

  **Migration:**

  ```diff
  -import { BaseMonacoEditor } from '@mission-platform/components'
  -import type { MonacoEditorLanguage, MonacoEditorTheme } from '@mission-platform/components'
  +import { BaseMonacoEditor } from '@mission-platform/components/monaco'
  +import type { MonacoEditorLanguage, MonacoEditorTheme } from '@mission-platform/components/monaco'
  ```

### Minor Changes

- c0e4b38: add `BaseCarousel` component — a horizontally-scrollable slide container with optional previous/next
  controls, indicator dots, looping behaviour, `v-model` support for the active slide index, keyboard navigation (
  ArrowLeft/ArrowRight/Home/End), pointer-based touch swipe with a configurable threshold, and pauseable `autoplay` (
  with `interval` and `pauseOnHover` options)
- 3944f87: add `removable` prop to `BaseTag` (default `false`) to make the inline remove (×) button opt-in, and add an
  `align` prop (`'start' | 'center' | 'end'`, default `'start'`) to `BaseNavbar` to control the alignment of the
  default-slot navigation items
- 3944f87: add `stickyHeader` prop to `BaseApplicationLayout` to opt the navbar/header slot into sticky positioning at
  the top of the layout
- 3944f87: extend `base-theme-toggle` to support a three-state cycle: `light`, `dark`, and `auto` (follows the system
  `prefers-color-scheme`)

### Patch Changes

- 266acd6: add `build:watch` script for incremental rebuilds during development
- 895c0e3: use semantic `<header>` and `<footer>` elements in `base-application-layout` instead of `<div role="none">`
  wrappers
- 5053fb0: fix base-carousel a11y by using a div with role="region" and simplify goTo logic
- ccc2c34: fix(components): make `BaseDropdown` SSR/SSG-safe by guarding the `document`-touching `watch` callback
  against environments where `document` is undefined (e.g. `vite-ssg` prerendering). Behaviour is unchanged in the
  browser.
- 1e135ae: add unit test coverage for `base-avatar`, `base-in-view`, and `base-theme-toggle`
- 387331e: add baseline TSDoc and Storybook autodocs descriptions across the component library
- c958b81: reformat stories and specs to match prettier-aligned eslint config; refactor `base-in-view` spec to avoid
  `unicorn/no-this-assignment` and switch `base-theme-toggle` spec to the `dataset` DOM API
- 72c7c44: replace unnecessary template literals with string literals in storybook autodocs descriptions
- b47b849: extract individual tab into a dedicated `base-tab.vue` to better differentiate the tab bar from the tabs it
  renders
- e917051: use a `<section>` element as the BaseCarousel root and drop the leading template comment so keyboard, hover,
  and tabindex behaviour reaches the wrapper element
- 3b322ce: fix accessibility violations in `BaseApplicationLayout` and `BaseTabs`:

  - `BaseApplicationLayout` now wraps the `navbar` slot in a `<div>` rather than a `<header>` so that a slotted
    `BaseNavbar` (itself a `<header>` banner landmark) is not nested inside another banner landmark (
    `landmark-banner-is-top-level`).
  - `BaseTabs`/`BaseVirtualTabs`: the individual tab element is now a `<div role="tab">` instead of a nested `<button>`,
    and the optional close affordance is a `<span aria-hidden="true">` inside the tab rather than a sibling `<button>`
    inside the `role="tablist"` container. This resolves `aria-required-children` (tablist children must all be tabs)
    and `nested-interactive` violations while preserving all existing keyboard, click, and emit behaviour.

- a5d10fd: move `useHunspellMonaco` composable from `@mission-platform/components` to `@mission-platform/hunspell` to
  mirror the structure of `@mission-platform/harper`. The composable is now exported from `@mission-platform/hunspell`;
  update imports accordingly.
- 3944f87: fix(components): end-align the navbar hamburger menu on mobile
- 3944f87: increase the gap between navbar items in `BaseNavbar`
- b162ee6: fix `base-theme-toggle` default label so it reflects the current theme (`Light mode` / `Dark mode` /
  `Auto mode`) instead of the next state in the cycle, matching the icon
- Updated dependencies [266acd6]
- Updated dependencies [37571da]
- Updated dependencies [5050849]
- Updated dependencies [a443677]
- Updated dependencies [fef2a3a]
- Updated dependencies [3c17696]
- Updated dependencies [58f2f50]
- Updated dependencies [a5d10fd]
- Updated dependencies [ca1660f]
  - @mission-platform/breakpoints@2.0.1
  - @mission-platform/harper@0.1.3
  - @mission-platform/hunspell@0.3.0
  - @mission-platform/i18n@0.3.1
  - @mission-platform/icons@0.2.0
  - @mission-platform/tokens@0.2.0

## 0.3.0

### Minor Changes

- 2b0cce4: tune base-monaco-editor typography and overflow behavior

  Apply the shared `@mission-platform/tokens` font families to the Monaco
  editor (`fontFamily`, `codeLensFontFamily`), enable `fontLigatures`,
  `fontVariations`, and `allowOverflow`, and disable
  `copyWithSyntaxHighlighting` to keep clipboard payloads as plain text.
  Also drop the redundant `role="region"` attribute from the wrapper so
  the editor's own ARIA semantics are not overridden.

## 0.2.2

### Patch Changes

- a77eafa: use shared `@mission-platform/typescript-config` and `@mission-platform/vite-config`

  Migrates `vite.config.ts`, `vitest.config.ts`, and the `tsconfig.*.json`
  files to extend the shared workspaces under `configs/`. `tsconfig.test.json`
  now explicitly excludes `*.stories.tsx` (the shared `base` preset enables
  `noUnusedParameters`, which the previous local test config did not). No
  runtime or public-API change.

- 37a17e4: log submitted values in BaseFormBuilder WithValidation story
- 05d31c9: normalize lint and format scripts across all workspaces

  Add consistent `lint:fix`, `lint:style:fix`, and `format:write` scripts to every workspace, and make `format` run
  `prettier --check` instead of `prettier --write` so it can be used as a non-mutating verification step.

- 6679759: adopt shared `stories` tsconfig preset for Storybook story files

  Each package that ships Storybook stories now has a dedicated
  `tsconfig.stories.json` extending
  `@mission-platform/typescript-config/stories` and is registered as a
  project reference from the workspace's root `tsconfig.json`. This gives
  `src/**/*.stories.{ts,tsx}` files a dedicated TypeScript project so
  ESLint's `projectService` can type-check them out of the box, and
  removes the legacy `tsconfig.storybook.json` from
  `@mission-platform/map` in favour of the shared name.

- cf89515: enable tree shaking support when consumed by apps

  Declares `"sideEffects"` in each package's `package.json` so app bundlers
  (Vite/Rollup) can safely drop unused exports. Pure-TypeScript packages
  (`harper`, `hunspell`, `i18n`) opt out of side effects entirely with
  `"sideEffects": false`. Packages that ship styles and/or Vue SFCs
  (`breakpoints`, `components`, `icons`, `map`, `tokens`) keep `*.css`,
  `*.scss`, and `*.vue` files marked as side-effectful so component
  styles and SCSS entrypoints are preserved.

- Updated dependencies [9e8198e]
- Updated dependencies [d2bf0e1]
- Updated dependencies [e0390bc]
- Updated dependencies [8a910f9]
- Updated dependencies [c8f7e0a]
- Updated dependencies [14521e9]
- Updated dependencies [2e27467]
- Updated dependencies [05d31c9]
- Updated dependencies [6679759]
- Updated dependencies [cf89515]
- Updated dependencies [8314555]
  - @mission-platform/breakpoints@2.0.0
  - @mission-platform/i18n@0.3.0
  - @mission-platform/harper@0.1.2
  - @mission-platform/hunspell@0.2.2
  - @mission-platform/icons@0.1.3
  - @mission-platform/tokens@0.1.2

## 0.2.1

### Patch Changes

- 8687deb: fix(base-scheduler): compute accessible text colour using WCAG contrast ratio

  Add colour-contrast utilities (hexToRgb, relativeLuminance, contrastRatio,
  alphaBlend, accessibleTextColor) to BaseSchedulerEvent and BaseSchedulerMonthView
  so that event-pill text automatically switches between dark (#1a1a1a) and light
  (#ffffff) depending on the effective background colour, satisfying WCAG AAA
  contrast requirements even when semi-transparent event colours are used.

  Replace element-level opacity on cancelled/tentative events with alpha-blending
  in JS so text contrast is always preserved. Add a slot button to
  BaseSchedulerTimeGrid for click-to-create interactions.

- Updated dependencies [ee616a0]
  - @mission-platform/icons@0.1.2

## 0.2.0

### Minor Changes

- ba565b3: add BaseScheduler component, BaseColorInput component, and useZIndex composable
  - BaseScheduler: full calendar/scheduler component with day, week, month, and year views, RFC 5545 VEvent support,
    drag-and-drop, and event dialog
  - BaseColorInput: colour picker input component
  - useZIndex / ZLayer: composable for managing z-index stacking layers across the component library

### Patch Changes

- Updated dependencies [ba565b3]
- Updated dependencies [40b0054]
  - @mission-platform/i18n@0.2.0
  - @mission-platform/hunspell@0.2.1
  - @mission-platform/breakpoints@1.0.0
  - @mission-platform/harper@0.1.1
  - @mission-platform/icons@0.1.1
  - @mission-platform/tokens@0.1.1

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

- 5ed2115: add vue/html-self-closing eslint rule and reformat time column headers

  - add `vue/html-self-closing` rule to eslint-config enforcing `always` self-closing on void, normal, and component
    elements
  - reformat time column header elements (HH, MM, SS) in BaseTimeInput, BaseTimeRangeInput, and BaseDateTimeRangeInput
    to comply with the new rule

- 7b0b1ca: Remove redundant `interface Window { HunspellEnvironment? }` extension from `use-hunspell-monaco.ts`. The
  `declare global { var HunspellEnvironment }` declaration already covers both `globalThis` and `window`, making the
  `Window` interface block unnecessary.
- b5bbd19: add harper grammar and style checker package and integrate into monaco editor

  - add new `@mission-platform/harper` package providing Harper grammar/style checker integration for Monaco editor via
    `useHarperMonaco` composable
  - integrate `useHarperMonaco` into `base-monaco-editor` alongside the existing Hunspell spell-checker
  - add `@mission-platform/harper` as a dependency to `@mission-platform/components` and
    `@mission-platform/my-care-notes`
  - wire `HarperWorker` into `my-care-notes` main entry and declare `HarperEnvironment` global type
  - update root `package.json` build scripts: split assets into `build:tokens` and `build:icons`, add `build:monaco`
    step for hunspell + harper
  - fix hunspell worker dictionary import casing from `en_au` to `en_AU`

- 74736b6: Add `tokenize` method to `HunspellChecker` with `TokenResult` and `TokenResultVector` types; export new types
  from package index. Refactor hunspell build script to separate `build:wasm` and `build:ts` steps. Remove redundant
  `role="region"` from `BaseMonacoEditor`.
- Updated dependencies [b5e4353]
- Updated dependencies [b5bbd19]
- Updated dependencies [ce4e4f2]
- Updated dependencies [74736b6]
- Updated dependencies [bb5e252]
  - @mission-platform/icons@0.1.1
  - @mission-platform/tokens@0.1.1
  - @mission-platform/harper@0.1.1
  - @mission-platform/hunspell@0.2.0
  - @mission-platform/breakpoints@0.1.0
  - @mission-platform/i18n@0.1.0

## 0.1.0

### Minor Changes

- feat: initial Vue 3 shared component library with composables, i18n locales and web worker utilities

### Patch Changes

- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
  - @mission-platform/breakpoints@0.1.0
  - @mission-platform/hunspell@0.1.0
  - @mission-platform/i18n@0.1.0
  - @mission-platform/icons@0.1.0
  - @mission-platform/tokens@0.1.0
