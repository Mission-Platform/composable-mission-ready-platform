# @mission-platform/components

## 1.0.0

### Major Changes

- edb785f: Drop `'tel'` from `BaseInput`'s `InputType` union. Telephone numbers should use
  the dedicated `BasePhoneInput` (`Components/Forms`) instead, which provides a
  country picker, as-you-type formatting, and `google-libphonenumber` validation.
  The `BaseInput` story's `type` control and the `BaseFieldSet` example are
  updated to match (the field-set "Phone" field now composes `BasePhoneInput`).
- edb785f: Give every display, feedback, and typography component the same canonical colour
  set — `neutral`, `primary`, `secondary`, `tertiary`, `success`, `warning`,
  `info`, `error`, and `critical` (plus a transparent `ghost` for the button-like
  components).

  - **Breaking:** the components that already shipped the set (`BaseBadge`,
    `BaseButton`, `BaseTag`, `BaseProgressBar`, `BaseSpinner`) renamed their
    `default` variant to `neutral` and `information` to `info`. `BaseIconButton`'s
    `danger` variant is renamed to `error`.
  - **Buttons:** `BaseButton` and `BaseIconButton` gain a transparent, borderless
    `ghost` variant; `BaseIconButton` now exposes the full canonical set.
  - **Feedback:** `BaseAlertBanner`, `BaseStatusIcon`, and `BaseToast` (and the
    `useToast` store) extend their intent/colour axis to the full canonical set;
    `BaseSkeleton` gains a `variant` colour.
  - **Display:** `BaseCard`, `BaseAccordion`, `BaseCollapse`, `BaseAvatar`,
    `BaseButtonGroup`, `BaseCarousel`, `BaseCodeBlock`, and `BaseTable` gain a
    `variant` colour prop; `BaseList` and `BaseQuote` gain a `tone` colour prop
    (their existing `variant` is the structural style).
  - **Typography:** `BaseTypography`'s `color` prop accepts the canonical semantic
    tones (`neutral`/`success`/`warning`/`info`/`error`/`critical`) alongside the
    existing text tokens.

  For surface components the `neutral` tone keeps the plain/default appearance and
  the coloured tones tint the surface, borders, dividers, or accents via the
  matching `--mp-color-<family>-*` design tokens.

- edb785f: rename the `BaseTypography` `align` prop to `horizontalAlign` and add a `verticalAlign` prop

  `BaseTypography`'s horizontal alignment prop is now `horizontalAlign` (`start`/`center`/`end` → `text-align`), renamed from `align` for symmetry with the new `verticalAlign` prop (`baseline`/`top`/`middle`/`bottom`/`sub`/`super`/`text-top`/`text-bottom` → `vertical-align`). The exported `TypographyAlign` type is correspondingly renamed to `TypographyHorizontalAlign`, and `TypographyVerticalAlign` is exported alongside the other typography types. Storybook stories document both alignment axes.

  BREAKING CHANGE: the `BaseTypography` `align` prop is renamed to `horizontalAlign`, and the `TypographyAlign` type is renamed to `TypographyHorizontalAlign`.

- 18bd49a: extract the form builder and schema form into a new `@mission-platform/forms` package

  Adds the write-once `@mission-platform/forms` package containing
  `BaseFormBuilder` (public `FormBuilder`) and `BaseSchemaForm` (public
  `SchemaForm`), authored once in the neutral `@mission-platform/jsx` dialect and
  compiled to both Vue 3 (`./vue`) and React (`./react`). The package depends on
  **both** `@mission-platform/components` (field widgets + `BaseDrawer`) and
  `@mission-platform/layouts` (`BaseVerticalLayout`), which is why it lives in its
  own package rather than in `@mission-platform/components` — keeping the
  dependency graph acyclic. Co-located `JSX Components/Forms/<Name>` stories and
  cross-framework specs are included.

  **BREAKING (`@mission-platform/components`):** `BaseFormBuilder` / `FormBuilder`
  and `BaseSchemaForm` / `SchemaForm` are no longer exported from
  `@mission-platform/components` — import them from `@mission-platform/forms/vue`
  (or `/react`) instead.

- edb785f: rename the `BaseTypography` `align` prop to `horizontalAlign` and add a `verticalAlign` prop

  The write-once `BaseTypography`'s horizontal alignment prop is now `horizontalAlign` (`start`/`center`/`end` → `text-align`), renamed from `align` to mirror the `@mission-platform/components` `BaseTypography`. The exported `TypographyAlign` type is correspondingly renamed to `TypographyHorizontalAlign`, and the SCSS modifier class moves from `--align-*` to `--halign-*`. A new `verticalAlign` prop (`baseline`/`top`/`middle`/`bottom`/`sub`/`super`/`text-top`/`text-bottom` → `vertical-align`) is added alongside it, with the `TypographyVerticalAlign` type exported and a corresponding `--valign-*` SCSS modifier.

  BREAKING CHANGE: the `BaseTypography` `align` prop is renamed to `horizontalAlign`, and the `TypographyAlign` type is renamed to `TypographyHorizontalAlign`.

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

### Minor Changes

- e1a9272: Make the write-once `BaseSelect` (`Components/Forms`) searchable and use it for
  the `BasePhoneInput` country picker. By default the select trigger is now a text
  field that filters the options as the user types — mirroring `BaseMultiselect` —
  with a search-aware empty state (`No results for "…"`) and keyboard navigation
  over the filtered set; a new `searchable` prop (default `true`) restores the
  plain button trigger when set to `false`. The visually hidden native `<select>`,
  `modelValue`/`onUpdateModelValue`/`onChange` contract, and styling are unchanged.
  `BasePhoneInput` now renders its country dropdown through this searchable
  `BaseSelect` (flag + name + dial code) instead of a raw native `<select>`, so a
  region can be found by searching. Adds `Searchable`/`NonSearchable` stories and
  cross-framework specs for the new behaviour.
- fb5e319: add BaseDeviceMock component for framing preview content in mobile, tablet, desktop, and browser chrome, with correct landscape sizing
- edb785f: Enhance `BaseCalendar` and the date pickers that compose it:

  - Add a `flat` prop to `BaseCalendar` that drops its own border, shadow, and
    background so it sits flush inside an already-bordered container; the date
    pickers (`BaseDateInput`, `BaseDateRangeInput`, `BaseDateTimeRangeInput`) now
    set it to avoid the doubled outline against the `BaseDropdown` panel.
  - Add `rangeStart`/`rangeEnd` props that highlight a selected range (start/end
    caps plus the days in between, matching the original Vue range styling). The
    range pickers pass these to their calendars so the picked range is shown
    across the months.
  - Make the month label clickable to jump to a twelve-month grid, and the year
    clickable to jump to a decade year grid that pages in groups of ten
    (2026 → 2020–2029), for quick navigation to distant dates.
  - Give the date pickers' `BaseDropdown` panel a taller `maxHeight` so the
    calendar fits without an inner scrollbar.
  - Rebuild `BaseDateTimeRangeInput` as a two-step `BaseFormWizard` whose first
    step (**Date**) picks the range's start/end dates and whose second step
    (**Time**) picks the start/end times, with the Finish button closing the
    popover, instead of two side-by-side panes.

- 7534f50: drive `color-scheme` from the theme APIs and adopt modern CSS in components

  - `BaseThemeProvider` / `useTheme` now set the CSS `color-scheme` on
    `document.documentElement`: an explicit `'light'`/`'dark'` preference pins the
    scheme, while `'auto'` applies `color-scheme: light dark` so the root follows
    the OS `prefers-color-scheme` (and the tokens' `light-dark()` values switch
    with it).
  - `BaseThemeComposer` / `useThemeComposer` gain a `colorScheme` config attribute
    (`'light' | 'dark' | 'light dark' | 'normal'`) emitted as a real `color-scheme`
    declaration (scoped style string in local mode, inline property in global mode)
    rather than a `--mp-*` custom property.
  - Began adopting modern CSS where it makes sense: `BaseDialog` animates its native
    `<dialog>` and `::backdrop` in/out with `@starting-style` + `transition-behavior:
allow-discrete` (honouring `prefers-reduced-motion`), and `BaseCard` becomes an
    `inline-size` container and switches its internal padding to `@container` queries.
  - Every component now wraps its SFC `<style>` rules in the `@layer mp.components`
    cascade layer (any leading `@use` stays outside the layer), so unlayered
    application styles win over component styles without specificity battles.

- edb785f: Preview the tentative range while picking a date range:

  - Add a `previewEnd` prop and an `onHoverDate` callback to `BaseCalendar`. The
    grid reports the day under the cursor via `onHoverDate` (and `undefined` on
    leave), and when a `rangeStart` is set but no `rangeEnd` is yet, `previewEnd`
    lightly highlights the range from the start to that day (a softer in-between
    fill and a tentative end cap, distinct from the committed range styling).
  - Wire `BaseDateRangeInput` to track the hovered day and feed it back to both
    calendars as `previewEnd` once a start is selected but the end is still open,
    so the range being chosen is shown as you hover before the second click; the
    hover state is cleared when the popover closes.

- edb785f: show a drop-placement ghost while dragging in the form builder

  `BaseFormBuilder` now renders a placeholder "ghost" row at the exact slot a dragged field will land in — before the hovered canvas row, or appended at the end of the hovered container (a step root or a field set) — driven by a `dropIndicator` insert-target updated on `dragover`. The ghost is `aria-hidden` and acts as its own drop zone at that slot (so a field dropped on it lands precisely there), and it is cleared on drop and on drag-end.

- edb785f: stabilise form-builder drag placement, preview the landing field, and keep the properties panel in sync with the selection

  `BaseFormBuilder` now resolves a hovered row's drop slot from the pointer's position within it (top half drops _before_ the row, bottom half _after_), so the placement no longer jumps around as the inserted ghost reflows the list. The drop-placement ghost renders as a faded, non-interactive clone of the field it will become (the moved field, or the dragged palette entry) rather than a bare placeholder, the canvas drop area is now at least three field-rows tall so dropping is easier, and the dragged source row dims while in flight with smoothed motion (plus a brief ghost entrance animation). The field-properties inspector also resolves the selected field at render time so it correctly tracks the selected field on the Vue build (previously the panel stayed on "Form settings" because the forwarded inspector slot captured the selection once instead of reading it reactively).

- edb785f: Add conditional steps and per-step/final-step validation to the write-once
  `BaseFormWizard` (`Components/Forms`). Each `WizardStep` gains two optional
  fields: `when` (when `false`, the step is dropped from the indicator and
  navigation sequence entirely — a conditional step) and `valid` (when `false`,
  advancing past the step via Next, the final Finish, or a forward indicator jump
  is blocked and the primary button is disabled). Because completion fires from
  the last visible step, that step's `valid` doubles as the final-step validation
  gate. Visibility and validity stay parent-supplied so the component remains
  controlled and framework-neutral. Adds a `WithValidationAndConditionalSteps`
  story demonstrating all three behaviours together.
- edb785f: `BaseSchemaForm` now renders telephone fields (`{ format: 'tel' }`) with the
  dedicated `BasePhoneInput` instead of `BaseInput`, so schema-driven phone fields
  get a country picker, as-you-type formatting, and `google-libphonenumber`
  validation for free. The `'tel'` widget is removed from the form's text-input
  group and routed to a dedicated `BasePhoneInput` control.
- edb785f: add variant-scaled bottom-margin spacing between `BaseTypography` blocks

  `BaseTypography`'s block variants now carry a variant-scaled `margin-bottom` so stacked text blocks breathe instead of butting together: `--mp-spacing-3` for `display`/`h1`, `--mp-spacing-2` for `h2`–`h4`, and `--mp-spacing-1` for `h5`/`h6` and every `body-*` variant (the spacing increases with the type scale, from paragraph up to `h1`). The inline-style `label`, `caption`, and `code` variants stay flush (no margin).

- edb785f: Give **every** component the canonical `2xs … 2xl` size scale via a uniform
  `size` prop (`'2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'`), defaulting to
  `'md'`.

  - **New shared utility:** `src/components/size.module.scss` exposes
    `base-size--<step>` classes that set `font-size` to the matching
    `--mp-size-font-*` design token. Components without bespoke per-size styling now
    apply this class on their root so their text (and any `em`-relative box) scales
    with the requested size.
  - **Widened existing scales:** the components that previously only offered a
    partial scale now cover the full `2xs … 2xl` range — `BaseIconButton`,
    `BaseHero`, `BaseMarkdownInput`, `BaseOtpInput`, `BasePagination`, `BaseQuote`,
    `BaseRangeInput`, `BaseRating`, `BaseSegmentControl`, and `BaseSlider` (each
    was `sm | md | lg`), plus `BaseFileInput` (previously a single `md`), which
    gains a working `size` prop.
  - **New `size` prop** added to every component that previously had none (layout,
    navigation, overlay, feedback, data, media, form, and theme components).
  - **Exceptions:** `BaseTypography`'s `size` is opt-in — left unset by default so
    the chosen `variant` keeps driving its font-size, only overriding it when
    explicitly set — and `BaseModal` keeps its extra non-canonical `'full'` value
    alongside the `2xs … 2xl` range.

  All changes are additive (the new prop defaults to `'md'`) and the widened size
  unions are supersets of the previous ones, so existing usages are unaffected.

- edb785f: support every form input in the form builder palette and inspector

  The builder palette (`DEFAULT_FIELD_TYPES`) now offers every `FormFieldType` the schema-driven form can render — text, text area, markdown, email, password, url, tel, number, number stepper, select, multi-select, radio, checkbox, switch, date, time, date-time, the date/time/date-time ranges, file upload and location — alongside the grouping field set and the multi-step wizard. The inspector gains input-specific editors (multi-line rows, text length/pattern, number step/integer/unsigned, date min/max bounds, show-seconds, file accept/multiple, and the location coordinate format), and `@mission-platform/forms-core` exposes new widget-classifier helpers (`isTextWidget`, `isMultilineWidget`, `isDateWidget`, `isTimeWidget`, `isFileWidget`, `isLocationWidget`).

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

- edb785f: migrate `BaseApplicationLayout` to the write-once jsx-components library

  `@mission-platform/components` gains `BaseApplicationLayout` (public
  `ApplicationLayout`) — the top-level application shell (status banner, header,
  scrollable content, footer) authored once in the neutral JSX dialect and
  compiled straight to both React and Vue by `@mission-platform/vite-plugin-jsx`.
  It is the first migrated component to use the framework-neutral **named-slot**
  primitive (`<Slot name="status" | "navbar" | "content" | "footer" />`), derives
  the status banner's colour/ARIA role from `statusLevel`, and ships its own
  per-component CSS (`@layer mp.components`). Co-located stories
  (`JSX Components/Layout/BaseApplicationLayout`) and cross-framework SSR specs are
  included.

  `@mission-platform/jsx`'s `Slot` marker is now a (never-invoked) function
  component instead of a `unique symbol`, so `<Slot name="…" />` type-checks as a
  JSX element under the classic `h` factory. The runtime adapters still intercept
  it by identity (`type === Slot`) and the build-time compiler still rewrites it
  away, so behaviour is unchanged.

- edb785f: match the write-once `BaseBadge` and `BaseButton` styling to their `@mission-platform/components` sources: both now expose the same nine tone `variant`s and the canonical `2xs … 2xl` `size` scale driven by the shared design tokens. `BaseBadge` renders its label through the composed `BaseTypography` (caption, medium weight, inherited colour), and `BaseButton` gains focus-visible outlines, token-driven transitions, and a built-in accessible `loading` spinner (`loadingLabel` defaulting to `Loading…`), dropping the non-standard `ghost` variant and `badge` prop (the `ghost` button usages move to `tertiary`)
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

- edb785f: restore drag-interaction and drawer transition parity for the write-once components

  `BaseSlider` and `BaseRangeInput` now render the same bespoke `role="slider"` track/thumb(s) as their Vue originals — dragged with a pointer or moved with the keyboard (Arrow/PageUp/PageDown/Home/End) — instead of a native range input. `BaseDrawer` gains drag-to-resize (`draggable` + `onResize`) and the original fade/slide enter/leave via the neutral `<Transition>` primitive, and `BaseVerticalLayout` forwards `startDraggable`/`endDraggable` to resize its inline columns. A shared, SSG-safe `pointer-drag` helper backs all four. The slider and range-input reach full parity (no remaining gaps in the parity matrix).

- edb785f: build straight to both react and vue with no neutral build

  `@mission-platform/components` now compiles the write-once components
  directly to both React and Vue in a single `pnpm build`. The framework-neutral
  build (the `--mode neutral` pass that emitted `dist/index.js`) and the matching
  framework-neutral root export (`@mission-platform/components`) are removed —
  the package exposes only the `./react` and `./vue` subpaths. Consumers that
  previously imported the neutral components from the package root should import
  the matching framework subpath instead.

- edb785f: close the long-tail feedback/editor parity gaps (toast store, typography truncate popup, Monaco spell-check)

  - Add a framework-agnostic observable `toast-store` (the write-once counterpart
    of the Vue `useToast` composable) and a new `BaseToastContainer` component that
    teleports a positioned, store-driven stack of `BaseToast`s; the store's
    `useToast`/`showToast`/`dismissToast`/`clearToasts`/… API is re-exported from
    the generated `./react` and `./vue` entries so consumers drive the same
    per-framework singleton the container uses.
  - Restore the `BaseTypography` truncate popup via a new `truncatePopup` prop,
    positioned with CSS Anchor Positioning (replacing the original `@floating-ui`
    popup) and driven by the neutral `useRef`/`useState` hooks.
  - Wire `BaseMonacoEditor` spell/grammar checking to parity: when `spellCheck` is
    set it lazily imports the shared `attachHunspellMonaco`/`attachHarperMonaco`
    cores (browser-only WASM kept out of the synchronous module graph).
  - Fix `BaseToast` to treat an empty children array as "no default slot" so the
    `message` prop renders when nested (e.g. from `BaseToastContainer`).

- edb785f: bring `BaseSchemaForm` and `BaseFormBuilder` to full behavioral parity with their Vue counterparts: both are now driven by a JSON Schema through the shared `@mission-platform/forms-core` (Ajv validation, conditional `ui.visibleWhen` fields, nested field sets, multi-step wizards), and `BaseFormBuilder` gains the palette/canvas/properties/condition/steps editors with native HTML5 drag-and-drop, a live preview, and JSON-schema export
- edb785f: add the write-once InView component and use plugin-generated entries

  Adds `InView` (the write-once `BaseInView`) — the first stateful sample
  component, driven by the new neutral hooks (`useRef`/`useState`/`useEffect`)
  for its `IntersectionObserver` reveal — shipped to both `./react` and `./vue`.

  The package no longer hand-authors `react.ts` / `vue.ts`: both entries are now
  generated by `@mission-platform/vite-plugin-jsx` from the neutral components
  barrel, and the build uses plain `tsc` (instead of `vue-tsc`). The ambient JSX
  typings now come from `@mission-platform/jsx/jsx-globals` rather than a local
  `jsx.d.ts`.

- edb785f: migrate the default-slot `Components/Layout` primitives to write-once JSX

  Adds `BaseStack`, `BaseGrid`, `BaseSeparator`, and `BaseMasonry` — authored once
  in the neutral JSX dialect and shipped to both the `./react` and `./vue`
  subpaths via the two-stage compiler. The Storybook stories (in this package) are
  re-categorised to mirror the `@mission-platform/components` package:
  `JSX Components/Layout/<Name>` for the layout primitives and `BaseInView`, and
  `JSX Components/Display/<Name>` for `BaseBadge` / `BaseButton`. The complex
  layout components that depend on Vue features the neutral dialect does not model
  (named/scoped slots, Teleport, `v-model`, emits — `BaseApplicationLayout`,
  `BaseNavbar`, `BaseHero`, `BaseDrawer`, `BaseWindowPopout`, and
  `BaseVerticalLayout`) are intentionally not migrated.

- edb785f: match the jsx navbar item to its vue source by rendering the dropdown chevron with the write-once `IconChevron` (direction-driven, size `sm`), and make every component responsive by porting the table's `bp-up('sm')` cell-padding step-up as a 768px media query and capping all floating panels (navbar/menubar dropdowns, popover, and the date/date-range/date-time-range calendars) to the viewport width so they never overflow on mobile
- edb785f: Add the write-once `BasePhoneInput` (`Components/Forms`) — an international
  phone-number field authored once in neutral JSX and compiled straight to both
  React and Vue. A country `<select>` (flag + name + dial code) sits beside a
  `type="tel"` field that is formatted as-you-type and validated with
  **`google-libphonenumber`** through a co-located, framework-agnostic `phone.ts`
  helper (no neutral/JSX imports, so the dependency travels verbatim onto both
  framework builds); the canonical **E.164** form + validity are derived each
  render and a hidden `name` input submits the E.164 value. The national text is
  controlled via `modelValue`/`onUpdateModelValue` and the region via
  `country`/`onUpdateCountry`, with an `onChange` reporting
  `{ national, e164, valid, country }`. Ships the per-folder
  `.tsx`/`phone.ts`/`.module.scss`/`.stories.tsx`/cross-framework
  `.spec.ts`/`index.ts` and a `JSX Components/Forms/BasePhoneInput` story.
- edb785f: bring the recursive and navigation components to behavioral parity with `@mission-platform/components`

  `BaseTreeView` now renders **true nested markup** — each open branch recurses
  into a child `role="group"` sub-list (driven by a single root `openMap`) rather
  than flattening the visible tree, and exposes `aria-selected` while preserving
  the scoped `label` slot and keyboard nav. `BaseMenu` and `BaseMenubar` gain
  **arbitrarily deep** submenus via a single recursive `renderItems` walk keyed by
  a dotted `openPath` (one open per level, ancestor chain stays open), and
  `BaseMenubar` renders its default slot when `items` is omitted (matching the Vue
  `<slot v-else>`). `BaseNavbarItem` renders its childless item through the neutral
  `<Dynamic is={tag}>` primitive (`'a'`/`'button'`). `BaseTabs` now renders a
  `tabpanel` for every tab and keeps inactive panels mounted but `hidden`, so panel
  state survives tab switches (each panel invokes one scoped `panel` slot).

- edb785f: Reach full parity with `@mission-platform/components` by migrating the final 15
  components to write-once neutral JSX, compiling straight to both React and Vue:
  the simple form inputs `BaseColorInput` and `BaseRangeInput` (its dual
  pointer-drag thumbs substituted with two overlaid native `<input type="range">`);
  the date/time pickers `BaseDateInput`, `BaseDateRangeInput`,
  `BaseDateTimeRangeInput`, `BaseTimeInput`, and `BaseTimeRangeInput` (composing the
  migrated `BaseCalendar` / scrollable time lists inside a teleported,
  CSS-anchor-positioned popover — the `BasePopover` recipe replacing
  `@floating-ui` + `useZIndex` — with a shared framework-agnostic `date-time.ts`
  helper); the editors/viewers `BaseCodeBlock` (`highlight.js`) and
  `BaseMarkdownInput` (`marked`), keeping the dep verbatim and injecting the HTML
  via a `useRef` + `useEffect` `innerHTML` escape-hatch instead of `v-html`, plus
  `BaseMonacoEditor`, mounted imperatively with a dynamic `import('monaco-editor')`
  kept out of the synchronous module graph for SSG-safety; and the form
  meta-components `BaseSchemaForm` (a static `switch` over a resolved `fields`
  array composing the migrated inputs, replacing JSON-Schema + Ajv +
  `<component :is>`), `BaseFormWizard`, `BaseFormBuilder` (native HTML5
  drag-and-drop), and `BaseScheduler` (an agenda over a flat `events` array,
  reusing `BaseDialog` for the event details). Each ships its per-folder
  `.tsx`/`.module.scss`/`.stories.tsx`/cross-framework `.spec.ts`/`index.ts`, and
  is re-exported on the `./react`, `./vue`, and Storyblok subpaths. Behaviours the
  neutral dialect deliberately does not model (Ajv validation / JSON-Schema
  generation, RFC 5545 recurrence expansion, scheduler grid collision layout, and
  the harper/hunspell spell-check composables) stay framework-specific and are
  documented per component in `llms.txt`.
- edb785f: bring `BaseScheduler` to full behavioral parity with its Vue counterpart: it is now driven by RFC 5545 `VEvent`s through the shared `@mission-platform/scheduler-core` (recurrence expansion, view ranges, collision layout) with the full five-view set (day / 3-day / week time grids, month grid, year grid), pointer drag-to-move + resize, period navigation, and a `BaseDialog`-based create/edit/delete event dialog; its public surface now mirrors the Vue component (`modelValue` / `defaultView` / `weekStartsOn` + `onUpdateModelValue` / `onEventClick`)
- edb785f: render BaseSelect and BaseMultiselect through the write-once BaseDropdown

  `BaseSelect` and `BaseMultiselect` now render their floating listbox through the
  write-once `BaseDropdown` (a `<Teleport>` panel anchored with CSS Anchor
  Positioning) instead of an in-place, absolutely-positioned list. The combobox is
  passed to the dropdown's `trigger` slot and the `<ul role="listbox">` becomes
  its default slot, with the open state synced via `onUpdateOpen`. Because the
  dropdown panel is mounted only while open, the listbox markup (`role="listbox"`)
  is present only when the control is open; the option labels remain available in
  the always-rendered hidden native `<select>`.

- edb785f: add token-driven `padding`/`margin` spacing props (named `2xs … 2xl` scale) to the layout primitives plus `BaseButton`/`BaseSeparator` (and outer `margin` to `BaseCard`), a responsive `minColumnWidth` auto-fit mode to `BaseGrid`, and a `lineHeight` prop to `BaseTypography`
- edb785f: build the Storyblok output alongside the Vue and React builds

  The package now also projects its neutral components onto Storyblok via
  `@mission-platform/vite-plugin-jsx`'s `generateStoryblokBloks`. Two new build
  modes (`storyblok-vue`, `storyblok-react`) emit the framework blok wrappers into
  `dist/storyblok/{vue,react}/` (exposed as the `./storyblok/react` and
  `./storyblok/vue` subpaths), and the framework-agnostic blok configuration JSON
  (`components.json` plus one `<component>.json` per component) is shipped under
  `./storyblok/components.json`. `@storyblok/react` and `@storyblok/vue` are added
  as optional peer dependencies.

- edb785f: animate `BaseToastContainer` with the neutral `<TransitionGroup name="base-toast">` primitive (matching the Vue SFC's `<TransitionGroup>`), adding the shared `base-toast-*` enter/leave/move transition classes
- edb785f: use the write-once icons-jsx components instead of text glyphs

  Components that previously substituted the `@mission-platform/icons` SFCs with
  text/CSS glyphs now render the write-once `@mission-platform/icons`
  components (compiled to React/Vue alongside each consumer). Replaced: the
  chevrons in `BaseSelect`, `BaseMultiselect`, `BaseAccordion`, `BaseCollapse`,
  `BaseCalendar`, and `BaseScheduler` (`IconChevron`); the close affordances in
  `BaseDialog`, `BaseModal`, `BaseDrawer`, `BaseTabs`, `BaseVirtualTabs`,
  `BaseAlertBanner`, `BaseToast`, and `BaseSearchInput` (`IconClose`); the add
  buttons in `BaseTabs`/`BaseVirtualTabs` (`IconPlus`); the calendar trigger in
  `BaseDateInput`/`BaseDateRangeInput`/`BaseDateTimeRangeInput` (`IconCalendar`,
  plus `IconGlobe` for the timezone toggle); the upload glyph in `BaseFileInput`
  (`IconUpload`); the stepper buttons in `BaseNumberStepper` (`IconMinus`/`IconPlus`);
  and the search glyph in `BaseSearchInput` (`IconSearch`). The CSS chevron-rotation
  classes were removed where the icon's own `direction` prop now handles it.

- edb785f: add a write-once JSX layer that renders on both Vue 3 and React

  Introduces `@mission-platform/jsx`, a tiny dependency-free runtime whose classic
  JSX factory (`h`) builds a framework-neutral element tree, plus `./react` and
  `./vue` adapters (`toReactComponent` / `toVueComponent`) that map that tree onto
  `React.createElement` or Vue's `h` at render time — a hand-rolled alternative to
  build-time compilers like Mitosis.

  Also adds `@mission-platform/components`, a reference consumer that authors
  `BaseBadge` and `BaseButton` once and ships them as both Vue 3 and React
  components via the `./react` and `./vue` subpath exports.

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

- edb785f: migrate the Components/Feedback group to write-once JSX

  Adds the complete `Components/Feedback` group, authored once in the neutral
  `@mission-platform/jsx` dialect and compiled straight to both React and Vue by
  `@mission-platform/vite-plugin-jsx`:

  - `BaseSkeleton` — loading placeholder (line/circle/block shapes, optional
    shimmer, width/height overrides).
  - `BaseSpinner` — indeterminate `role="status"` ring (tone/size + accessible
    label; the i18n default label becomes a plain `'Loading…'`).
  - `BaseStatusIcon` — toned status indicator (icon SVGs substituted with
    `✓`/`⚠`/`✕`/`ℹ`/`–` glyphs; level type exported as `StatusIconLevel`).
  - `BaseProgressBar` — determinate/indeterminate native `<progress>` track with
    an optional label row (composes `BaseTypography`).
  - `BaseAlertBanner` — controlled inline notification banner (`modelValue` +
    `onUpdateModelValue`/`onDismiss` callbacks, `iconContent`/`actions` content
    props, glyph icons, `display: contents` host for visibility toggling).
  - `BaseToast` — presentational toast item (`onDismiss` callback, `iconContent`
    content prop, glyph icon).

  Each ships its per-component folder (`.tsx`/`.module.scss`/`.stories.tsx`/
  `.spec.ts`/`index.ts`), categorised `JSX Components/Feedback/<Name>` stories, and
  cross-framework SSR parity specs. Vue-only features the neutral dialect cannot
  model (`@mission-platform/icons`, i18n, `v-model`/emits, named/`$slots`-presence
  slots) are substituted with the documented equivalents (text glyphs, callback
  props, content props); the `useToast` store / `BaseToastContainer` orchestration
  is out of scope.

- edb785f: Migrate the `Components/Forms` group (plus the `Components/Communication`
  `BaseChatBubble`) to write-once neutral JSX, compiling straight to both React and
  Vue: `BaseCheckbox`, `BaseRadio`, `BaseSwitch`, `BaseInput`, `BaseTextarea`,
  `BaseNumberStepper`, `BaseSlider`, `BaseOtpInput`, `BaseRating`,
  `BaseSearchInput`, `BaseFieldSet`, `BaseFileInput`, and `BaseChatBubble`. Each
  ships its per-folder `.tsx`/`.module.scss`/`.stories.tsx`/cross-framework
  `.spec.ts`/`index.ts` with `JSX Components/<Category>/<Name>` stories. Vue-only
  features the neutral dialect does not model are substituted with documented
  equivalents: the `useId` composable → a shared `nextFieldId` `useRef` helper
  (`field-id.ts`), `v-model`/emits → the controlled `modelValue` +
  `onUpdateModelValue`/`onChange`/… callback props, named slots → `MpChild` content
  props, `@mission-platform/icons` → text glyphs, `useI18n` labels → plain string
  props, `BaseSlider`'s pointer-drag thumb → a native `<input type="range">`, and
  `BaseOtpInput`'s Vue template ref-array → a single container ref +
  `querySelectorAll`.
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

- edb785f: migrate the Components/Media group to write-once cross-framework JSX

  The complete `Components/Media` group is now authored once in the neutral JSX
  dialect (`@mission-platform/jsx`) and compiled straight to both React and Vue by
  `@mission-platform/vite-plugin-jsx`:

  - `BaseResponsiveImage` — an art-directed, responsive `<picture>` (one `<source>`
    per `sources` entry plus a fallback `<img>`) with `srcset`/`sizes`, lazy
    loading, async decoding, a fixed `aspectRatio`, and `object-fit` control.
  - `BaseResponsiveVideo` — a responsive `<video>` with format-specific sources, a
    poster, native controls, and the usual playback flags.
  - `BaseBackgroundVideo` — a decorative full-bleed background `<video>` with
    optional foreground default-slot content and a scrim overlay, honouring
    `prefers-reduced-motion` via a reactive `matchMedia` query driven by the
    neutral hooks.

  Each ships its per-component folder (`.tsx`/`.module.scss`/`.stories.tsx`/
  `.spec.ts`/`index.ts`), categorised `JSX Components/Media/<Name>` stories, and a
  cross-framework SSR parity spec. The native `load`/`error`/`play`/`pause`/`ended`
  emits are exposed as `onLoad`/`onError`/`onPlay`/`onPause`/`onEnded` callback
  props, consistent with the existing migration conventions.

- edb785f: Migrate the `Components/Navigation` group to write-once neutral JSX, compiling
  straight to both React and Vue: `BasePagination`, `BaseSegmentControl`,
  `BaseBreadcrumb`, `BaseMenuItem`, `BaseTabs`, `BaseVirtualTabs`, `BaseMenu`,
  `BaseMenubar`, and `BaseNavbarItem`. Each ships its per-folder
  `.tsx`/`.module.scss`/`.stories.tsx`/cross-framework `.spec.ts`/`index.ts` with
  `JSX Components/Navigation/<Name>` stories. Vue-only features the neutral dialect
  does not model are substituted with documented equivalents: `v-model`/emits →
  controlled `modelValue` + callback props, `vue-router` `RouterLink` → `<a href>`,
  `@mission-platform/icons` → text glyphs, the multi-file tab/menu sub-component
  trees inlined, the `BaseDropdown` overlay → an inline absolutely-positioned
  dropdown, and the menu/menubar/navbar-item open state via `useState` + `useEffect`
  document listeners.
- edb785f: add the modal overlays

  - Migrate the **modal** `Components/Overlays` members `BaseDialog` and `BaseModal` from `@mission-platform/components` to the write-once neutral package. Both render a **native `<dialog>`** driven with `showModal()`/`close()` (top layer, `::backdrop` scrim, focus trap, `Escape`-to-close); `BaseModal` adds a `size` scale (mobile bottom sheet / centred on `sm`+), a body-scroll lock, and a `closeOnEsc` opt-out. The Vue `<Transition>` becomes a CSS `@starting-style` fade, the `header`/`footer` named slots become `MpChild` content props (composing `BaseIconButton`/`BaseTypography`), and `useZIndex`/`useRouterClose` are dropped.
  - Update the `Components/Overlays` stories to compose other components from the package (`Button` triggers, `Stack`/`Typography` bodies, `Button` footer actions) and refresh `llms.txt`.

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

- edb785f: migrate the remaining `Components/Data` components to write-once JSX

  Adds the last two `Components/Data` components, authored once in the neutral
  `@mission-platform/jsx` dialect and compiled straight to both React and Vue by
  `@mission-platform/vite-plugin-jsx`. This completes the `Components/Data` group.

  - `BaseVirtualTable` — a virtual-scrolling, sortable data table that windows the
    body rows beneath a sticky header, with click-to-sort columns (asc → desc →
    unsorted, firing `onSort`), `onRowClick`, an empty state, and a `footer` named
    slot. Like the original it uses ARIA `role="table"` divs (not native
    `<table>`) for cross-browser scroll behaviour; sort/scroll state uses the
    neutral hooks. The per-column scoped `cell-<key>` slots are replaced by each
    column's optional `render` formatter (consistent with the migrated
    `BaseTable`), the icons-package sort glyph becomes `▲`/`▼`/`↕`, and the
    `sort`/`rowClick` emits become `onSort`/`onRowClick` callback props.
  - `BaseTreeView` — a recursive, accessible tree that renders every visible node
    with a built-in expand/collapse label (overridable via the scoped `label`
    slot, scope `{ node, depth }`), keyboard navigation, and `onSelect`/`onToggle`
    callbacks. It flattens the expanded tree into a single list (the neutral
    dialect models no recursive components), substitutes a `▸`/`▾` glyph for the
    icons chevron, and uses callback props for the SFC's `select`/`toggle` emits.

  Each ships its per-component folder (`.tsx`/`.module.scss`/`.stories.tsx`/
  `.spec.ts`/`index.ts`), categorised `JSX Components/Data/<Name>` stories, and
  cross-framework SSR parity specs.

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

- edb785f: migrate the Tier-2 components from `@mission-platform/components` to the write-once neutral JSX package, compiling straight to both React and Vue

  Adds `BaseRadioGroup`, `BaseAccordion`, `BaseTimeline`, `BaseSelect`, `BaseMultiselect`, `BaseChatArea`, and `BaseCarousel`. Compound parent/child SFCs (`BaseAccordion`/`BaseAccordionItem`, `BaseTimeline`/`BaseTimelineItem`) and slot-introspecting components (`BaseCarousel`) are flattened into a single `items`/`slides`-array component (the `BaseTabs` approach), with `provide`/`inject` replaced by internal `useState`. `BaseSelect`/`BaseMultiselect` substitute the Teleport + floating-ui `BaseDropdown` with an in-place absolutely-positioned listbox toggled by `useState` (keeping the hidden native `<select>` for autofill), and `BaseChatArea` reproduces its `ResizeObserver` auto-scroll with a single `useEffect`.

- edb785f: Migrate the self-contained Tier 3 components to write-once neutral JSX,
  compiling straight to both React and Vue: `BaseQrCode` (`Data Display`),
  `BaseLocationInput` and `BaseCalendar` (`Forms`). Each ships its per-folder
  `.tsx`/`.module.scss`/`.stories.tsx`/cross-framework `.spec.ts`/`index.ts` with
  `JSX Components/<Category>/<Name>` stories. The framework-agnostic logic travels
  verbatim onto both builds via co-located helpers — `qr-encode.ts` (the
  dependency-free QR encoder) and `location.ts` (the DD/DM/DMS coordinate
  conversion) — and `BaseCalendar`'s month grid is driven by `luxon` (added as a
  dependency). Vue-only features the neutral dialect does not model are substituted
  with documented equivalents: `computed` → `useMemo`, `ref` → `useState`,
  `watch` → `useEffect`, `useId` → the shared `nextFieldId` `useRef` helper,
  `@mission-platform/icons` chevrons → text glyphs, and `v-model`/emits → the
  controlled `modelValue` + `onUpdateModelValue`/`onChange`/`onError` callback
  props. The remaining Tier 3/4 components stay Vue-only in
  `@mission-platform/components` because they need primitives the neutral dialect
  does not model (Teleport/`@floating-ui` overlays and floating date/time pickers)
  or heavy browser-only toolchains (`BaseMonacoEditor`, `BaseCodeBlock`,
  `BaseMarkdownInput`, `BaseFormBuilder`, `BaseScheduler`, and the form
  meta-components).
- 8d64a2b: improve light/dark theme handling (subtree scoping, pre-paint init, `<meta>` sync, store-backed toggle)

  - `useTheme` / `createThemeStore` gain a `scoped` mode: pass `scoped: true` with
    a `target` element (or assign it later via the new `setTarget(element)`) to
    apply `data-theme`/`color-scheme` to a single subtree element instead of
    `document.documentElement`. Because the tokens' `light-dark()` colours resolve
    against the _used_ `color-scheme`, this re-themes the element and its
    descendants without redefining any custom property — enabling nested providers
    / per-subtree themes. Reassigning or disposing the store cleans up the previous
    element.
  - The store now keeps a `<meta name="color-scheme">` in sync with the resolved
    preference (root mode only; opt out with `syncMeta: false`) so the user-agent
    chrome (scrollbars, form controls, address bar) tracks the active theme, and it
    re-applies on system (`prefers-color-scheme`) changes while in `'auto'`.
  - New `themeInitScript(options?)` export returns a tiny, self-contained snippet
    to inline as a blocking `<script>` in the document `<head>`; it pins
    `data-theme`/`color-scheme` from the persisted preference **before first
    paint**, eliminating the flash of the wrong colour scheme.
  - `BaseThemeProvider` gains a `global` prop (default `true`); set `:global="false"`
    to scope the theme to a rendered (`display: contents`) wrapper element (`as`,
    default `div`) for subtree / nested theming.
  - `BaseThemeToggle` is now backed by the shared `useTheme` store instead of
    hand-rolling its own `data-theme` manipulation, so toggling persists the
    preference, pins `color-scheme` + the `<meta>`, stays in sync with the system
    theme, and drives a `BaseThemeProvider`'s store (global or subtree-scoped) when
    rendered inside one.

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

### Patch Changes

- e1a9272: Drop the third-party `google-libphonenumber` dependency and power `BasePhoneInput`
  with the platform's own `@mission-platform/phone-number` (AssemblyScript/WebAssembly)
  package instead. The co-located `phone.ts` helper now parses, formats
  (national/E.164), validates per region, lists supported regions, provides example
  numbers and formats as-you-type through the synchronous `PhoneNumberUtil` instance,
  so behaviour is unchanged while the external dependency is removed.
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

- c99c4cc: resolve axe colour-contrast violations in the chat bubble and theme composer stories

  The pending chat bubble's `opacity` is raised so its composited text still clears
  WCAG AA (4.5:1), and the outgoing bubble now uses the theme-aware
  `--mp-color-text-on-primary` token. The `BaseThemeComposer` demo stories use
  AA-compliant primary colours.

- 338c7db: use the new motion, opacity and border-width tokens in base-button

  `BaseButton` now composes the new `--mp-duration-*`/`--mp-easing-*`, `--mp-opacity-disabled` and `--mp-border-width-*` design tokens instead of the inline `150ms ease`, `opacity: 0.5` and `1px`/`2px` literals. The rendered output is unchanged (the tokens resolve to the same values); this is the first showcase consumer of the new token groups.

- edb785f: fix drag-and-drop on the Vue build of the form builder and file input

  `BaseFormBuilder` authored its native HTML5 drag-and-drop with React-style camelCase listeners (`onDragOver`/`onDragStart`/`onDrop`), which the Vue build hyphenated into dead events — items could be dragged but never dropped. With the Vue emitter now lowercasing native multi-word DOM events, the form builder's palette/canvas/fieldset drops work on the Vue build. `BaseFileInput`'s hand-lowercased workaround (`onDragover`/`onDragleave`) is restored to the canonical React-style casing so its drop zone works on **both** the React and Vue builds.

- edb785f: fix the form builder rendering only its tab bar in the compiled build

  `BaseFormBuilder` passed its palette and inspector to `BaseVerticalLayout` as the `start`/`end` props and the active panel to `BaseTabs` as the `panel` prop. Those targets render through a neutral `<Slot>`, which the Vue Stage-1 compiler turns into a native `<slot>` (read from `useSlots()`), so content supplied as a **prop** from a compiled neutral parent was dropped — only the tab bar showed. `BaseTabs`/`BaseVirtualTabs` now invoke the `panel` render-prop directly (`properties.panel?.({ tab })`) so it stays a real prop on both frameworks, and `BaseFormBuilder` forwards the palette/inspector through `slot="start"`/`slot="end"` marker children (the supported way to fill a named slot). The palette, inspector, Editor/Steps/Preview/Schema panels, and the wizard are now all visible.

- edb785f: refactor `base-schema-form` and `base-form-builder` to consume the new shared `@mission-platform/forms-core` (their JSON Schema/Ajv/condition/builder logic now re-exports the shared implementation), keeping the public surface and existing specs unchanged
- 23c0463: split component stories into per-framework vue and react variants
- edb785f: Rebuild the date/time pickers (`BaseDateInput`, `BaseTimeInput`,
  `BaseDateRangeInput`, `BaseTimeRangeInput`, `BaseDateTimeRangeInput`) on top of
  the write-once `BaseDropdown` instead of each hand-rolling its own teleported,
  CSS-anchored popover. The trigger is now projected into `BaseDropdown`'s
  `trigger` slot and the calendar/time panel into its default slot, so the
  teleport, anchor positioning, and outside-click/`Escape` dismissal are owned by
  `BaseDropdown` (which already gets the `position-area` value right). This also
  fixes the pickers not opening, since the duplicated popover logic that anchored
  with an invalid `position-area` is gone.
- edb785f: refactor `base-scheduler` to consume the new shared `@mission-platform/scheduler-core` (its `use-scheduler` composable is now a thin Vue-reactive wrapper over the shared recurrence/range/event/layout helpers, and `types` re-exports the shared RFC 5545 model), keeping the public surface and existing specs unchanged
- 429d400: reduce theme composable complexity and add missing doc comments

  Splits the higher-complexity theme helpers into smaller documented functions
  (`createThemeStore`'s initial-theme resolution and `<meta name="color-scheme">`
  sync, plus `useThemeComposer`'s document apply step) and converts the
  non-interpolated init-script template literals to plain string literals. No
  runtime behaviour changes.

- 1c73a0e: improve accessibility and aria semantics across components
- bbc9903: fix `BaseFormBuilder` accessibility violations

  - The field drag handle is no longer `aria-hidden` while being focusable: it
    gets an `aria-label="Drag to reorder"` instead, so `@dnd-kit/vue`'s
    `role="button"` handle is exposed correctly (resolves axe `aria-hidden-focus`).
  - The canvas, wizard-step, and nested field-set dropzones now only carry
    `role="list"` when they actually contain field rows; an empty dropzone (which
    shows a drop-hint placeholder) drops the role, so it no longer violates axe
    `aria-required-children`, and the `role="listitem"` rows always have a
    `role="list"` parent (`aria-required-parent`).

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

- edb785f: match the `BaseMasonry` layout styles to the `@mission-platform/components` original

  `BaseMasonry` now owns its `.base-masonry` rules in the co-located CSS Module —
  the container box (`width` / `min-width`) and, crucially, the per-child
  break-safety (`break-inside: avoid; margin-bottom: var(--mp-masonry-gap)`)
  equivalent to the Vue component's `:slotted(*)` rule — while keeping the dynamic
  multi-column properties inline. Default-slot children are now kept break-safe out
  of the box on both the `./react` and `./vue` subpaths, exactly matching the
  original component instead of relying on consumers to add their own class.

- edb785f: fix the controlled-value round-trip in every story that binds a model value

  The components built by `@mission-platform/vite-plugin-jsx` expose their
  controlled value as an `onUpdate<Name>` callback prop, so the parent listener
  must be the camelised `@update-<name>` form. The stories were using the Vue
  `v-model` colon form (`@update:model-value`), which compiles to the
  `onUpdate:modelValue` vnode key and never reaches the generated callback prop —
  so the value was silently ignored. All controlled-component stories (the entire
  `Forms` category plus `BaseCarousel`, `BaseAlertBanner`, `BasePagination`,
  `BaseSegmentControl`, `BaseTabs`, and `BaseVirtualTabs`) now use the correct
  `@update-model-value` (and `BasePhoneInput`'s `@update-country`,
  `BaseFileInput`'s seeded `ref`) so the value actually round-trips in Storybook.

- edb785f: Consume the `@mission-platform/tokens` design tokens in `BaseMonacoEditor`:
  source the editor's `fontFamily` (mono) and `codeLensFontFamily` (sans) from the
  shared `font` tokens (and re-enable `fontLigatures`/`fontVariations`), reaching
  parity with the `@mission-platform/components` SFC. Adds `@mission-platform/tokens`
  as a runtime dependency.
- edb785f: add a reusable cross-framework SSR DOM parity test helper

  A new `src/test-utils/ssr-parity.ts` helper renders a write-once component on
  both the React and Vue `@mission-platform/jsx` adapters to static SSR markup,
  normalises framework-specific artefacts, and asserts the two outputs are the
  **same DOM** before the per-component assertions run. It is wired into the
  canonical `base-badge.spec.ts` as the pattern for the rest of the suite, and is
  excluded from the published build (test-only). This underpins the cross-framework
  parity verification tracked by the repo's parity matrix tooling.

- edb785f: restructure sample components into per-component folders

  Each sample component now lives in its own folder under `src/components/<name>/`
  with a consistent set of co-located files:
  `<name>.tsx` (the write-once component), `<name>.module.scss` (demo styling),
  `<name>.stories.tsx` (Storybook story), `<name>.spec.ts` (cross-framework SSR
  parity test) and `index.ts` (re-export). The public `./react` and `./vue`
  exports are unchanged; this is an internal source reorganisation. The Storybook
  stories that previously lived in `apps/storybook` now live next to each
  component and are globbed from the package.

- edb785f: scope the drawer and toast enter/leave transition styling (no more `:global`)

  `BaseDrawer` (slide/fade) and `BaseToastContainer` (stack) now drive their
  enter/leave transitions through the neutral `<Transition>`/`<TransitionGroup>`
  explicit class props, passing their styled phase classes from the co-located CSS
  Module (`styles[...]`). The transition rules are no longer declared with
  `:global(.<name>-…)`, so they are hashed on the React build and plain BEM on the
  Vue build exactly like every other class in the package — matching the `scoped`
  `<style>` of the original `@mission-platform/components` SFCs. The animations are
  unchanged on both frameworks.

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

- ca1d98b: reformat sources with updated prettier print width and import ordering
- d39b6fc: add per-workspace reference documentation and refresh llms.txt/README metadata
- 6551abb: reformat source files to match the shared prettier configuration
- 18bd49a: rename the Storybook top-level sections so the catalogue reflects the package split

  The cross-framework catalogue no longer prefixes its sections with `JSX`: the
  `JSX Components/<Category>/<Name>` stories are now `Components/<Category>/<Name>`
  and the `JSX Icons/<Category>/<Name>` stories are now `Icons/<Category>/<Name>`
  (both Vue and React Storybooks). The components extracted into their own packages
  get their own top-level Storybook section instead of nesting under `Components`:
  `@mission-platform/layouts` stories move to `Layouts/<Name>` and
  `@mission-platform/forms` stories move to `Forms/<Name>`.

- 4218ce5: generate one SCSS partial and TS module per token source, with barrels

  - The generated token output is now split per DTCG source: every
    `tokens/<file>.tokens.json` produces `src/generated/scss/_<file>.scss` (a
    self-contained partial with its `$`-variables, `--mp-*` custom properties, and
    `@property` registrations whose `initial-value`s resolve to the matching local
    `$`-variables) and `src/generated/ts/<file>.ts` (a single nested `as const`
    object). The aggregate `src/generated/_tokens.scss` (`@forward` barrel) and
    `src/generated/tokens.ts` (re-export barrel) replace the previous
    `_structural.scss`, `flat.ts`, and `tokens.css` artefacts.
  - **BREAKING:** the TypeScript API is now a flat set of per-source nested objects
    (`palette`, `size`, `font`, `typography`, `borderWidth`, `breakpoint`, `motion`,
    `opacity`, `radius`, `shadow`, `spacing`, `zIndex`, `themeLight`, `themeDark`),
    replacing the previous bespoke exports (`colors`, `spacing`, `fontFamilies`,
    `sizeIcons`, `radii`, `shadows`, …). The standalone `@mission-platform/tokens/css`
    bundle export is removed; consume the SCSS entry points instead.
  - `@mission-platform/components`, `@mission-platform/map`, and
    `@mission-platform/icons` are updated to the new token exports (`font.font.family`,
    `palette.color`, and `size.icon` respectively).

- 7534f50: migrate BaseTypography variants off the SCSS font mixins to design-token CSS custom properties

  Starts the staged retirement of the `@mission-platform/tokens` SCSS `mp-font-*`
  mixin layer: `BaseTypography` now composes each variant directly from the
  generated `--mp-font-*` / `--mp-line-height-*` / `--mp-letter-spacing-*` tokens
  (rendered output is unchanged).

- edb785f: increase the BaseTypography block spacing by two steps

  The per-variant `margin-bottom` in the `BaseTypography` stylesheet is bumped two
  spacing steps (`--mp-spacing-1` → `--mp-spacing-3`, `--mp-spacing-2` →
  `--mp-spacing-4`, `--mp-spacing-3` → `--mp-spacing-5`), giving headings and body
  copy more vertical breathing room. The `label`/`caption`/`code` variants (which
  have no block margin) are left untouched, and no design tokens are changed.

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

- edb785f: add vite plugin that compiles the neutral jsx components to react/vue at build time

  Introduces the `@mission-platform/vite-plugin-jsx` workspace, which compiles the
  framework-neutral `@mission-platform/jsx` components to React or Vue 3 at build
  time instead of wrapping them with the runtime `toReactComponent` /
  `toVueComponent` adapters.

  `@mission-platform/components` produces its `./react` and `./vue` subpaths by
  running one `vite build` per framework through this plugin, rather than the
  runtime adapters.

- Updated dependencies [4218ce5]
- Updated dependencies [eefe5d0]
- Updated dependencies [4218ce5]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [76ebb1f]
- Updated dependencies [13cfc7f]
- Updated dependencies [13cfc7f]
- Updated dependencies [13cfc7f]
- Updated dependencies [13cfc7f]
- Updated dependencies [0a5d7dd]
- Updated dependencies [edb785f]
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
- Updated dependencies [d37e102]
- Updated dependencies [ca1d98b]
- Updated dependencies [d39b6fc]
- Updated dependencies [9cdfef1]
- Updated dependencies [9cdfef1]
- Updated dependencies [4218ce5]
- Updated dependencies [edb785f]
- Updated dependencies [be8ab67]
- Updated dependencies [18bd49a]
- Updated dependencies [4218ce5]
- Updated dependencies [4218ce5]
- Updated dependencies [4218ce5]
- Updated dependencies [4218ce5]
- Updated dependencies [be8ab67]
- Updated dependencies [4218ce5]
- Updated dependencies [4218ce5]
- Updated dependencies [4218ce5]
- Updated dependencies [4218ce5]
- Updated dependencies [be8ab67]
- Updated dependencies [be8ab67]
- Updated dependencies [be8ab67]
- Updated dependencies [be8ab67]
  - @mission-platform/tokens@1.0.0
  - @mission-platform/forms-core@0.2.0
  - @mission-platform/scheduler-core@0.2.0
  - @mission-platform/harper@0.2.0
  - @mission-platform/hunspell@0.4.0
  - @mission-platform/icons@0.2.0
  - @mission-platform/jsx@0.2.0
  - @mission-platform/phone-number@0.3.0

## 1.0.0

### Major Changes

- edb785f: Drop `'tel'` from `BaseInput`'s `InputType` union. Telephone numbers should use
  the dedicated `BasePhoneInput` (`Components/Forms`) instead, which provides a
  country picker, as-you-type formatting, and `google-libphonenumber` validation.
  The `BaseInput` story's `type` control and the `BaseFieldSet` example are
  updated to match (the field-set "Phone" field now composes `BasePhoneInput`).
- edb785f: Give every display, feedback, and typography component the same canonical colour
  set — `neutral`, `primary`, `secondary`, `tertiary`, `success`, `warning`,
  `info`, `error`, and `critical` (plus a transparent `ghost` for the button-like
  components).

  - **Breaking:** the components that already shipped the set (`BaseBadge`,
    `BaseButton`, `BaseTag`, `BaseProgressBar`, `BaseSpinner`) renamed their
    `default` variant to `neutral` and `information` to `info`. `BaseIconButton`'s
    `danger` variant is renamed to `error`.
  - **Buttons:** `BaseButton` and `BaseIconButton` gain a transparent, borderless
    `ghost` variant; `BaseIconButton` now exposes the full canonical set.
  - **Feedback:** `BaseAlertBanner`, `BaseStatusIcon`, and `BaseToast` (and the
    `useToast` store) extend their intent/colour axis to the full canonical set;
    `BaseSkeleton` gains a `variant` colour.
  - **Display:** `BaseCard`, `BaseAccordion`, `BaseCollapse`, `BaseAvatar`,
    `BaseButtonGroup`, `BaseCarousel`, `BaseCodeBlock`, and `BaseTable` gain a
    `variant` colour prop; `BaseList` and `BaseQuote` gain a `tone` colour prop
    (their existing `variant` is the structural style).
  - **Typography:** `BaseTypography`'s `color` prop accepts the canonical semantic
    tones (`neutral`/`success`/`warning`/`info`/`error`/`critical`) alongside the
    existing text tokens.

  For surface components the `neutral` tone keeps the plain/default appearance and
  the coloured tones tint the surface, borders, dividers, or accents via the
  matching `--mp-color-<family>-*` design tokens.

- edb785f: rename the `BaseTypography` `align` prop to `horizontalAlign` and add a `verticalAlign` prop

  `BaseTypography`'s horizontal alignment prop is now `horizontalAlign` (`start`/`center`/`end` → `text-align`), renamed from `align` for symmetry with the new `verticalAlign` prop (`baseline`/`top`/`middle`/`bottom`/`sub`/`super`/`text-top`/`text-bottom` → `vertical-align`). The exported `TypographyAlign` type is correspondingly renamed to `TypographyHorizontalAlign`, and `TypographyVerticalAlign` is exported alongside the other typography types. Storybook stories document both alignment axes.

  BREAKING CHANGE: the `BaseTypography` `align` prop is renamed to `horizontalAlign`, and the `TypographyAlign` type is renamed to `TypographyHorizontalAlign`.

- 18bd49a: extract the form builder and schema form into a new `@mission-platform/forms` package

  Adds the write-once `@mission-platform/forms` package containing
  `BaseFormBuilder` (public `FormBuilder`) and `BaseSchemaForm` (public
  `SchemaForm`), authored once in the neutral `@mission-platform/jsx` dialect and
  compiled to both Vue 3 (`./vue`) and React (`./react`). The package depends on
  **both** `@mission-platform/components` (field widgets + `BaseDrawer`) and
  `@mission-platform/layouts` (`BaseVerticalLayout`), which is why it lives in its
  own package rather than in `@mission-platform/components` — keeping the
  dependency graph acyclic. Co-located `JSX Components/Forms/<Name>` stories and
  cross-framework specs are included.

  **BREAKING (`@mission-platform/components`):** `BaseFormBuilder` / `FormBuilder`
  and `BaseSchemaForm` / `SchemaForm` are no longer exported from
  `@mission-platform/components` — import them from `@mission-platform/forms/vue`
  (or `/react`) instead.

- edb785f: rename the `BaseTypography` `align` prop to `horizontalAlign` and add a `verticalAlign` prop

  The write-once `BaseTypography`'s horizontal alignment prop is now `horizontalAlign` (`start`/`center`/`end` → `text-align`), renamed from `align` to mirror the `@mission-platform/components` `BaseTypography`. The exported `TypographyAlign` type is correspondingly renamed to `TypographyHorizontalAlign`, and the SCSS modifier class moves from `--align-*` to `--halign-*`. A new `verticalAlign` prop (`baseline`/`top`/`middle`/`bottom`/`sub`/`super`/`text-top`/`text-bottom` → `vertical-align`) is added alongside it, with the `TypographyVerticalAlign` type exported and a corresponding `--valign-*` SCSS modifier.

  BREAKING CHANGE: the `BaseTypography` `align` prop is renamed to `horizontalAlign`, and the `TypographyAlign` type is renamed to `TypographyHorizontalAlign`.

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

### Minor Changes

- e1a9272: Make the write-once `BaseSelect` (`Components/Forms`) searchable and use it for
  the `BasePhoneInput` country picker. By default the select trigger is now a text
  field that filters the options as the user types — mirroring `BaseMultiselect` —
  with a search-aware empty state (`No results for "…"`) and keyboard navigation
  over the filtered set; a new `searchable` prop (default `true`) restores the
  plain button trigger when set to `false`. The visually hidden native `<select>`,
  `modelValue`/`onUpdateModelValue`/`onChange` contract, and styling are unchanged.
  `BasePhoneInput` now renders its country dropdown through this searchable
  `BaseSelect` (flag + name + dial code) instead of a raw native `<select>`, so a
  region can be found by searching. Adds `Searchable`/`NonSearchable` stories and
  cross-framework specs for the new behaviour.
- fb5e319: add BaseDeviceMock component for framing preview content in mobile, tablet, desktop, and browser chrome, with correct landscape sizing
- edb785f: Enhance `BaseCalendar` and the date pickers that compose it:

  - Add a `flat` prop to `BaseCalendar` that drops its own border, shadow, and
    background so it sits flush inside an already-bordered container; the date
    pickers (`BaseDateInput`, `BaseDateRangeInput`, `BaseDateTimeRangeInput`) now
    set it to avoid the doubled outline against the `BaseDropdown` panel.
  - Add `rangeStart`/`rangeEnd` props that highlight a selected range (start/end
    caps plus the days in between, matching the original Vue range styling). The
    range pickers pass these to their calendars so the picked range is shown
    across the months.
  - Make the month label clickable to jump to a twelve-month grid, and the year
    clickable to jump to a decade year grid that pages in groups of ten
    (2026 → 2020–2029), for quick navigation to distant dates.
  - Give the date pickers' `BaseDropdown` panel a taller `maxHeight` so the
    calendar fits without an inner scrollbar.
  - Rebuild `BaseDateTimeRangeInput` as a two-step `BaseFormWizard` whose first
    step (**Date**) picks the range's start/end dates and whose second step
    (**Time**) picks the start/end times, with the Finish button closing the
    popover, instead of two side-by-side panes.

- 7534f50: drive `color-scheme` from the theme APIs and adopt modern CSS in components

  - `BaseThemeProvider` / `useTheme` now set the CSS `color-scheme` on
    `document.documentElement`: an explicit `'light'`/`'dark'` preference pins the
    scheme, while `'auto'` applies `color-scheme: light dark` so the root follows
    the OS `prefers-color-scheme` (and the tokens' `light-dark()` values switch
    with it).
  - `BaseThemeComposer` / `useThemeComposer` gain a `colorScheme` config attribute
    (`'light' | 'dark' | 'light dark' | 'normal'`) emitted as a real `color-scheme`
    declaration (scoped style string in local mode, inline property in global mode)
    rather than a `--mp-*` custom property.
  - Began adopting modern CSS where it makes sense: `BaseDialog` animates its native
    `<dialog>` and `::backdrop` in/out with `@starting-style` + `transition-behavior:
allow-discrete` (honouring `prefers-reduced-motion`), and `BaseCard` becomes an
    `inline-size` container and switches its internal padding to `@container` queries.
  - Every component now wraps its SFC `<style>` rules in the `@layer mp.components`
    cascade layer (any leading `@use` stays outside the layer), so unlayered
    application styles win over component styles without specificity battles.

- edb785f: Preview the tentative range while picking a date range:

  - Add a `previewEnd` prop and an `onHoverDate` callback to `BaseCalendar`. The
    grid reports the day under the cursor via `onHoverDate` (and `undefined` on
    leave), and when a `rangeStart` is set but no `rangeEnd` is yet, `previewEnd`
    lightly highlights the range from the start to that day (a softer in-between
    fill and a tentative end cap, distinct from the committed range styling).
  - Wire `BaseDateRangeInput` to track the hovered day and feed it back to both
    calendars as `previewEnd` once a start is selected but the end is still open,
    so the range being chosen is shown as you hover before the second click; the
    hover state is cleared when the popover closes.

- edb785f: show a drop-placement ghost while dragging in the form builder

  `BaseFormBuilder` now renders a placeholder "ghost" row at the exact slot a dragged field will land in — before the hovered canvas row, or appended at the end of the hovered container (a step root or a field set) — driven by a `dropIndicator` insert-target updated on `dragover`. The ghost is `aria-hidden` and acts as its own drop zone at that slot (so a field dropped on it lands precisely there), and it is cleared on drop and on drag-end.

- edb785f: stabilise form-builder drag placement, preview the landing field, and keep the properties panel in sync with the selection

  `BaseFormBuilder` now resolves a hovered row's drop slot from the pointer's position within it (top half drops _before_ the row, bottom half _after_), so the placement no longer jumps around as the inserted ghost reflows the list. The drop-placement ghost renders as a faded, non-interactive clone of the field it will become (the moved field, or the dragged palette entry) rather than a bare placeholder, the canvas drop area is now at least three field-rows tall so dropping is easier, and the dragged source row dims while in flight with smoothed motion (plus a brief ghost entrance animation). The field-properties inspector also resolves the selected field at render time so it correctly tracks the selected field on the Vue build (previously the panel stayed on "Form settings" because the forwarded inspector slot captured the selection once instead of reading it reactively).

- edb785f: Add conditional steps and per-step/final-step validation to the write-once
  `BaseFormWizard` (`Components/Forms`). Each `WizardStep` gains two optional
  fields: `when` (when `false`, the step is dropped from the indicator and
  navigation sequence entirely — a conditional step) and `valid` (when `false`,
  advancing past the step via Next, the final Finish, or a forward indicator jump
  is blocked and the primary button is disabled). Because completion fires from
  the last visible step, that step's `valid` doubles as the final-step validation
  gate. Visibility and validity stay parent-supplied so the component remains
  controlled and framework-neutral. Adds a `WithValidationAndConditionalSteps`
  story demonstrating all three behaviours together.
- edb785f: `BaseSchemaForm` now renders telephone fields (`{ format: 'tel' }`) with the
  dedicated `BasePhoneInput` instead of `BaseInput`, so schema-driven phone fields
  get a country picker, as-you-type formatting, and `google-libphonenumber`
  validation for free. The `'tel'` widget is removed from the form's text-input
  group and routed to a dedicated `BasePhoneInput` control.
- edb785f: add variant-scaled bottom-margin spacing between `BaseTypography` blocks

  `BaseTypography`'s block variants now carry a variant-scaled `margin-bottom` so stacked text blocks breathe instead of butting together: `--mp-spacing-3` for `display`/`h1`, `--mp-spacing-2` for `h2`–`h4`, and `--mp-spacing-1` for `h5`/`h6` and every `body-*` variant (the spacing increases with the type scale, from paragraph up to `h1`). The inline-style `label`, `caption`, and `code` variants stay flush (no margin).

- edb785f: Give **every** component the canonical `2xs … 2xl` size scale via a uniform
  `size` prop (`'2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'`), defaulting to
  `'md'`.

  - **New shared utility:** `src/components/size.module.scss` exposes
    `base-size--<step>` classes that set `font-size` to the matching
    `--mp-size-font-*` design token. Components without bespoke per-size styling now
    apply this class on their root so their text (and any `em`-relative box) scales
    with the requested size.
  - **Widened existing scales:** the components that previously only offered a
    partial scale now cover the full `2xs … 2xl` range — `BaseIconButton`,
    `BaseHero`, `BaseMarkdownInput`, `BaseOtpInput`, `BasePagination`, `BaseQuote`,
    `BaseRangeInput`, `BaseRating`, `BaseSegmentControl`, and `BaseSlider` (each
    was `sm | md | lg`), plus `BaseFileInput` (previously a single `md`), which
    gains a working `size` prop.
  - **New `size` prop** added to every component that previously had none (layout,
    navigation, overlay, feedback, data, media, form, and theme components).
  - **Exceptions:** `BaseTypography`'s `size` is opt-in — left unset by default so
    the chosen `variant` keeps driving its font-size, only overriding it when
    explicitly set — and `BaseModal` keeps its extra non-canonical `'full'` value
    alongside the `2xs … 2xl` range.

  All changes are additive (the new prop defaults to `'md'`) and the widened size
  unions are supersets of the previous ones, so existing usages are unaffected.

- edb785f: support every form input in the form builder palette and inspector

  The builder palette (`DEFAULT_FIELD_TYPES`) now offers every `FormFieldType` the schema-driven form can render — text, text area, markdown, email, password, url, tel, number, number stepper, select, multi-select, radio, checkbox, switch, date, time, date-time, the date/time/date-time ranges, file upload and location — alongside the grouping field set and the multi-step wizard. The inspector gains input-specific editors (multi-line rows, text length/pattern, number step/integer/unsigned, date min/max bounds, show-seconds, file accept/multiple, and the location coordinate format), and `@mission-platform/forms-core` exposes new widget-classifier helpers (`isTextWidget`, `isMultilineWidget`, `isDateWidget`, `isTimeWidget`, `isFileWidget`, `isLocationWidget`).

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

- edb785f: migrate `BaseApplicationLayout` to the write-once jsx-components library

  `@mission-platform/components` gains `BaseApplicationLayout` (public
  `ApplicationLayout`) — the top-level application shell (status banner, header,
  scrollable content, footer) authored once in the neutral JSX dialect and
  compiled straight to both React and Vue by `@mission-platform/vite-plugin-jsx`.
  It is the first migrated component to use the framework-neutral **named-slot**
  primitive (`<Slot name="status" | "navbar" | "content" | "footer" />`), derives
  the status banner's colour/ARIA role from `statusLevel`, and ships its own
  per-component CSS (`@layer mp.components`). Co-located stories
  (`JSX Components/Layout/BaseApplicationLayout`) and cross-framework SSR specs are
  included.

  `@mission-platform/jsx`'s `Slot` marker is now a (never-invoked) function
  component instead of a `unique symbol`, so `<Slot name="…" />` type-checks as a
  JSX element under the classic `h` factory. The runtime adapters still intercept
  it by identity (`type === Slot`) and the build-time compiler still rewrites it
  away, so behaviour is unchanged.

- edb785f: match the write-once `BaseBadge` and `BaseButton` styling to their `@mission-platform/components` sources: both now expose the same nine tone `variant`s and the canonical `2xs … 2xl` `size` scale driven by the shared design tokens. `BaseBadge` renders its label through the composed `BaseTypography` (caption, medium weight, inherited colour), and `BaseButton` gains focus-visible outlines, token-driven transitions, and a built-in accessible `loading` spinner (`loadingLabel` defaulting to `Loading…`), dropping the non-standard `ghost` variant and `badge` prop (the `ghost` button usages move to `tertiary`)
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

- edb785f: restore drag-interaction and drawer transition parity for the write-once components

  `BaseSlider` and `BaseRangeInput` now render the same bespoke `role="slider"` track/thumb(s) as their Vue originals — dragged with a pointer or moved with the keyboard (Arrow/PageUp/PageDown/Home/End) — instead of a native range input. `BaseDrawer` gains drag-to-resize (`draggable` + `onResize`) and the original fade/slide enter/leave via the neutral `<Transition>` primitive, and `BaseVerticalLayout` forwards `startDraggable`/`endDraggable` to resize its inline columns. A shared, SSG-safe `pointer-drag` helper backs all four. The slider and range-input reach full parity (no remaining gaps in the parity matrix).

- edb785f: build straight to both react and vue with no neutral build

  `@mission-platform/components` now compiles the write-once components
  directly to both React and Vue in a single `pnpm build`. The framework-neutral
  build (the `--mode neutral` pass that emitted `dist/index.js`) and the matching
  framework-neutral root export (`@mission-platform/components`) are removed —
  the package exposes only the `./react` and `./vue` subpaths. Consumers that
  previously imported the neutral components from the package root should import
  the matching framework subpath instead.

- edb785f: close the long-tail feedback/editor parity gaps (toast store, typography truncate popup, Monaco spell-check)

  - Add a framework-agnostic observable `toast-store` (the write-once counterpart
    of the Vue `useToast` composable) and a new `BaseToastContainer` component that
    teleports a positioned, store-driven stack of `BaseToast`s; the store's
    `useToast`/`showToast`/`dismissToast`/`clearToasts`/… API is re-exported from
    the generated `./react` and `./vue` entries so consumers drive the same
    per-framework singleton the container uses.
  - Restore the `BaseTypography` truncate popup via a new `truncatePopup` prop,
    positioned with CSS Anchor Positioning (replacing the original `@floating-ui`
    popup) and driven by the neutral `useRef`/`useState` hooks.
  - Wire `BaseMonacoEditor` spell/grammar checking to parity: when `spellCheck` is
    set it lazily imports the shared `attachHunspellMonaco`/`attachHarperMonaco`
    cores (browser-only WASM kept out of the synchronous module graph).
  - Fix `BaseToast` to treat an empty children array as "no default slot" so the
    `message` prop renders when nested (e.g. from `BaseToastContainer`).

- edb785f: bring `BaseSchemaForm` and `BaseFormBuilder` to full behavioral parity with their Vue counterparts: both are now driven by a JSON Schema through the shared `@mission-platform/forms-core` (Ajv validation, conditional `ui.visibleWhen` fields, nested field sets, multi-step wizards), and `BaseFormBuilder` gains the palette/canvas/properties/condition/steps editors with native HTML5 drag-and-drop, a live preview, and JSON-schema export
- edb785f: add the write-once InView component and use plugin-generated entries

  Adds `InView` (the write-once `BaseInView`) — the first stateful sample
  component, driven by the new neutral hooks (`useRef`/`useState`/`useEffect`)
  for its `IntersectionObserver` reveal — shipped to both `./react` and `./vue`.

  The package no longer hand-authors `react.ts` / `vue.ts`: both entries are now
  generated by `@mission-platform/vite-plugin-jsx` from the neutral components
  barrel, and the build uses plain `tsc` (instead of `vue-tsc`). The ambient JSX
  typings now come from `@mission-platform/jsx/jsx-globals` rather than a local
  `jsx.d.ts`.

- edb785f: migrate the default-slot `Components/Layout` primitives to write-once JSX

  Adds `BaseStack`, `BaseGrid`, `BaseSeparator`, and `BaseMasonry` — authored once
  in the neutral JSX dialect and shipped to both the `./react` and `./vue`
  subpaths via the two-stage compiler. The Storybook stories (in this package) are
  re-categorised to mirror the `@mission-platform/components` package:
  `JSX Components/Layout/<Name>` for the layout primitives and `BaseInView`, and
  `JSX Components/Display/<Name>` for `BaseBadge` / `BaseButton`. The complex
  layout components that depend on Vue features the neutral dialect does not model
  (named/scoped slots, Teleport, `v-model`, emits — `BaseApplicationLayout`,
  `BaseNavbar`, `BaseHero`, `BaseDrawer`, `BaseWindowPopout`, and
  `BaseVerticalLayout`) are intentionally not migrated.

- edb785f: match the jsx navbar item to its vue source by rendering the dropdown chevron with the write-once `IconChevron` (direction-driven, size `sm`), and make every component responsive by porting the table's `bp-up('sm')` cell-padding step-up as a 768px media query and capping all floating panels (navbar/menubar dropdowns, popover, and the date/date-range/date-time-range calendars) to the viewport width so they never overflow on mobile
- edb785f: Add the write-once `BasePhoneInput` (`Components/Forms`) — an international
  phone-number field authored once in neutral JSX and compiled straight to both
  React and Vue. A country `<select>` (flag + name + dial code) sits beside a
  `type="tel"` field that is formatted as-you-type and validated with
  **`google-libphonenumber`** through a co-located, framework-agnostic `phone.ts`
  helper (no neutral/JSX imports, so the dependency travels verbatim onto both
  framework builds); the canonical **E.164** form + validity are derived each
  render and a hidden `name` input submits the E.164 value. The national text is
  controlled via `modelValue`/`onUpdateModelValue` and the region via
  `country`/`onUpdateCountry`, with an `onChange` reporting
  `{ national, e164, valid, country }`. Ships the per-folder
  `.tsx`/`phone.ts`/`.module.scss`/`.stories.tsx`/cross-framework
  `.spec.ts`/`index.ts` and a `JSX Components/Forms/BasePhoneInput` story.
- edb785f: bring the recursive and navigation components to behavioral parity with `@mission-platform/components`

  `BaseTreeView` now renders **true nested markup** — each open branch recurses
  into a child `role="group"` sub-list (driven by a single root `openMap`) rather
  than flattening the visible tree, and exposes `aria-selected` while preserving
  the scoped `label` slot and keyboard nav. `BaseMenu` and `BaseMenubar` gain
  **arbitrarily deep** submenus via a single recursive `renderItems` walk keyed by
  a dotted `openPath` (one open per level, ancestor chain stays open), and
  `BaseMenubar` renders its default slot when `items` is omitted (matching the Vue
  `<slot v-else>`). `BaseNavbarItem` renders its childless item through the neutral
  `<Dynamic is={tag}>` primitive (`'a'`/`'button'`). `BaseTabs` now renders a
  `tabpanel` for every tab and keeps inactive panels mounted but `hidden`, so panel
  state survives tab switches (each panel invokes one scoped `panel` slot).

- edb785f: Reach full parity with `@mission-platform/components` by migrating the final 15
  components to write-once neutral JSX, compiling straight to both React and Vue:
  the simple form inputs `BaseColorInput` and `BaseRangeInput` (its dual
  pointer-drag thumbs substituted with two overlaid native `<input type="range">`);
  the date/time pickers `BaseDateInput`, `BaseDateRangeInput`,
  `BaseDateTimeRangeInput`, `BaseTimeInput`, and `BaseTimeRangeInput` (composing the
  migrated `BaseCalendar` / scrollable time lists inside a teleported,
  CSS-anchor-positioned popover — the `BasePopover` recipe replacing
  `@floating-ui` + `useZIndex` — with a shared framework-agnostic `date-time.ts`
  helper); the editors/viewers `BaseCodeBlock` (`highlight.js`) and
  `BaseMarkdownInput` (`marked`), keeping the dep verbatim and injecting the HTML
  via a `useRef` + `useEffect` `innerHTML` escape-hatch instead of `v-html`, plus
  `BaseMonacoEditor`, mounted imperatively with a dynamic `import('monaco-editor')`
  kept out of the synchronous module graph for SSG-safety; and the form
  meta-components `BaseSchemaForm` (a static `switch` over a resolved `fields`
  array composing the migrated inputs, replacing JSON-Schema + Ajv +
  `<component :is>`), `BaseFormWizard`, `BaseFormBuilder` (native HTML5
  drag-and-drop), and `BaseScheduler` (an agenda over a flat `events` array,
  reusing `BaseDialog` for the event details). Each ships its per-folder
  `.tsx`/`.module.scss`/`.stories.tsx`/cross-framework `.spec.ts`/`index.ts`, and
  is re-exported on the `./react`, `./vue`, and Storyblok subpaths. Behaviours the
  neutral dialect deliberately does not model (Ajv validation / JSON-Schema
  generation, RFC 5545 recurrence expansion, scheduler grid collision layout, and
  the harper/hunspell spell-check composables) stay framework-specific and are
  documented per component in `llms.txt`.
- edb785f: bring `BaseScheduler` to full behavioral parity with its Vue counterpart: it is now driven by RFC 5545 `VEvent`s through the shared `@mission-platform/scheduler-core` (recurrence expansion, view ranges, collision layout) with the full five-view set (day / 3-day / week time grids, month grid, year grid), pointer drag-to-move + resize, period navigation, and a `BaseDialog`-based create/edit/delete event dialog; its public surface now mirrors the Vue component (`modelValue` / `defaultView` / `weekStartsOn` + `onUpdateModelValue` / `onEventClick`)
- edb785f: render BaseSelect and BaseMultiselect through the write-once BaseDropdown

  `BaseSelect` and `BaseMultiselect` now render their floating listbox through the
  write-once `BaseDropdown` (a `<Teleport>` panel anchored with CSS Anchor
  Positioning) instead of an in-place, absolutely-positioned list. The combobox is
  passed to the dropdown's `trigger` slot and the `<ul role="listbox">` becomes
  its default slot, with the open state synced via `onUpdateOpen`. Because the
  dropdown panel is mounted only while open, the listbox markup (`role="listbox"`)
  is present only when the control is open; the option labels remain available in
  the always-rendered hidden native `<select>`.

- edb785f: add token-driven `padding`/`margin` spacing props (named `2xs … 2xl` scale) to the layout primitives plus `BaseButton`/`BaseSeparator` (and outer `margin` to `BaseCard`), a responsive `minColumnWidth` auto-fit mode to `BaseGrid`, and a `lineHeight` prop to `BaseTypography`
- edb785f: build the Storyblok output alongside the Vue and React builds

  The package now also projects its neutral components onto Storyblok via
  `@mission-platform/vite-plugin-jsx`'s `generateStoryblokBloks`. Two new build
  modes (`storyblok-vue`, `storyblok-react`) emit the framework blok wrappers into
  `dist/storyblok/{vue,react}/` (exposed as the `./storyblok/react` and
  `./storyblok/vue` subpaths), and the framework-agnostic blok configuration JSON
  (`components.json` plus one `<component>.json` per component) is shipped under
  `./storyblok/components.json`. `@storyblok/react` and `@storyblok/vue` are added
  as optional peer dependencies.

- edb785f: animate `BaseToastContainer` with the neutral `<TransitionGroup name="base-toast">` primitive (matching the Vue SFC's `<TransitionGroup>`), adding the shared `base-toast-*` enter/leave/move transition classes
- edb785f: use the write-once icons-jsx components instead of text glyphs

  Components that previously substituted the `@mission-platform/icons` SFCs with
  text/CSS glyphs now render the write-once `@mission-platform/icons`
  components (compiled to React/Vue alongside each consumer). Replaced: the
  chevrons in `BaseSelect`, `BaseMultiselect`, `BaseAccordion`, `BaseCollapse`,
  `BaseCalendar`, and `BaseScheduler` (`IconChevron`); the close affordances in
  `BaseDialog`, `BaseModal`, `BaseDrawer`, `BaseTabs`, `BaseVirtualTabs`,
  `BaseAlertBanner`, `BaseToast`, and `BaseSearchInput` (`IconClose`); the add
  buttons in `BaseTabs`/`BaseVirtualTabs` (`IconPlus`); the calendar trigger in
  `BaseDateInput`/`BaseDateRangeInput`/`BaseDateTimeRangeInput` (`IconCalendar`,
  plus `IconGlobe` for the timezone toggle); the upload glyph in `BaseFileInput`
  (`IconUpload`); the stepper buttons in `BaseNumberStepper` (`IconMinus`/`IconPlus`);
  and the search glyph in `BaseSearchInput` (`IconSearch`). The CSS chevron-rotation
  classes were removed where the icon's own `direction` prop now handles it.

- edb785f: add a write-once JSX layer that renders on both Vue 3 and React

  Introduces `@mission-platform/jsx`, a tiny dependency-free runtime whose classic
  JSX factory (`h`) builds a framework-neutral element tree, plus `./react` and
  `./vue` adapters (`toReactComponent` / `toVueComponent`) that map that tree onto
  `React.createElement` or Vue's `h` at render time — a hand-rolled alternative to
  build-time compilers like Mitosis.

  Also adds `@mission-platform/components`, a reference consumer that authors
  `BaseBadge` and `BaseButton` once and ships them as both Vue 3 and React
  components via the `./react` and `./vue` subpath exports.

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

- edb785f: migrate the Components/Feedback group to write-once JSX

  Adds the complete `Components/Feedback` group, authored once in the neutral
  `@mission-platform/jsx` dialect and compiled straight to both React and Vue by
  `@mission-platform/vite-plugin-jsx`:

  - `BaseSkeleton` — loading placeholder (line/circle/block shapes, optional
    shimmer, width/height overrides).
  - `BaseSpinner` — indeterminate `role="status"` ring (tone/size + accessible
    label; the i18n default label becomes a plain `'Loading…'`).
  - `BaseStatusIcon` — toned status indicator (icon SVGs substituted with
    `✓`/`⚠`/`✕`/`ℹ`/`–` glyphs; level type exported as `StatusIconLevel`).
  - `BaseProgressBar` — determinate/indeterminate native `<progress>` track with
    an optional label row (composes `BaseTypography`).
  - `BaseAlertBanner` — controlled inline notification banner (`modelValue` +
    `onUpdateModelValue`/`onDismiss` callbacks, `iconContent`/`actions` content
    props, glyph icons, `display: contents` host for visibility toggling).
  - `BaseToast` — presentational toast item (`onDismiss` callback, `iconContent`
    content prop, glyph icon).

  Each ships its per-component folder (`.tsx`/`.module.scss`/`.stories.tsx`/
  `.spec.ts`/`index.ts`), categorised `JSX Components/Feedback/<Name>` stories, and
  cross-framework SSR parity specs. Vue-only features the neutral dialect cannot
  model (`@mission-platform/icons`, i18n, `v-model`/emits, named/`$slots`-presence
  slots) are substituted with the documented equivalents (text glyphs, callback
  props, content props); the `useToast` store / `BaseToastContainer` orchestration
  is out of scope.

- edb785f: Migrate the `Components/Forms` group (plus the `Components/Communication`
  `BaseChatBubble`) to write-once neutral JSX, compiling straight to both React and
  Vue: `BaseCheckbox`, `BaseRadio`, `BaseSwitch`, `BaseInput`, `BaseTextarea`,
  `BaseNumberStepper`, `BaseSlider`, `BaseOtpInput`, `BaseRating`,
  `BaseSearchInput`, `BaseFieldSet`, `BaseFileInput`, and `BaseChatBubble`. Each
  ships its per-folder `.tsx`/`.module.scss`/`.stories.tsx`/cross-framework
  `.spec.ts`/`index.ts` with `JSX Components/<Category>/<Name>` stories. Vue-only
  features the neutral dialect does not model are substituted with documented
  equivalents: the `useId` composable → a shared `nextFieldId` `useRef` helper
  (`field-id.ts`), `v-model`/emits → the controlled `modelValue` +
  `onUpdateModelValue`/`onChange`/… callback props, named slots → `MpChild` content
  props, `@mission-platform/icons` → text glyphs, `useI18n` labels → plain string
  props, `BaseSlider`'s pointer-drag thumb → a native `<input type="range">`, and
  `BaseOtpInput`'s Vue template ref-array → a single container ref +
  `querySelectorAll`.
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

- edb785f: migrate the Components/Media group to write-once cross-framework JSX

  The complete `Components/Media` group is now authored once in the neutral JSX
  dialect (`@mission-platform/jsx`) and compiled straight to both React and Vue by
  `@mission-platform/vite-plugin-jsx`:

  - `BaseResponsiveImage` — an art-directed, responsive `<picture>` (one `<source>`
    per `sources` entry plus a fallback `<img>`) with `srcset`/`sizes`, lazy
    loading, async decoding, a fixed `aspectRatio`, and `object-fit` control.
  - `BaseResponsiveVideo` — a responsive `<video>` with format-specific sources, a
    poster, native controls, and the usual playback flags.
  - `BaseBackgroundVideo` — a decorative full-bleed background `<video>` with
    optional foreground default-slot content and a scrim overlay, honouring
    `prefers-reduced-motion` via a reactive `matchMedia` query driven by the
    neutral hooks.

  Each ships its per-component folder (`.tsx`/`.module.scss`/`.stories.tsx`/
  `.spec.ts`/`index.ts`), categorised `JSX Components/Media/<Name>` stories, and a
  cross-framework SSR parity spec. The native `load`/`error`/`play`/`pause`/`ended`
  emits are exposed as `onLoad`/`onError`/`onPlay`/`onPause`/`onEnded` callback
  props, consistent with the existing migration conventions.

- edb785f: Migrate the `Components/Navigation` group to write-once neutral JSX, compiling
  straight to both React and Vue: `BasePagination`, `BaseSegmentControl`,
  `BaseBreadcrumb`, `BaseMenuItem`, `BaseTabs`, `BaseVirtualTabs`, `BaseMenu`,
  `BaseMenubar`, and `BaseNavbarItem`. Each ships its per-folder
  `.tsx`/`.module.scss`/`.stories.tsx`/cross-framework `.spec.ts`/`index.ts` with
  `JSX Components/Navigation/<Name>` stories. Vue-only features the neutral dialect
  does not model are substituted with documented equivalents: `v-model`/emits →
  controlled `modelValue` + callback props, `vue-router` `RouterLink` → `<a href>`,
  `@mission-platform/icons` → text glyphs, the multi-file tab/menu sub-component
  trees inlined, the `BaseDropdown` overlay → an inline absolutely-positioned
  dropdown, and the menu/menubar/navbar-item open state via `useState` + `useEffect`
  document listeners.
- edb785f: add the modal overlays

  - Migrate the **modal** `Components/Overlays` members `BaseDialog` and `BaseModal` from `@mission-platform/components` to the write-once neutral package. Both render a **native `<dialog>`** driven with `showModal()`/`close()` (top layer, `::backdrop` scrim, focus trap, `Escape`-to-close); `BaseModal` adds a `size` scale (mobile bottom sheet / centred on `sm`+), a body-scroll lock, and a `closeOnEsc` opt-out. The Vue `<Transition>` becomes a CSS `@starting-style` fade, the `header`/`footer` named slots become `MpChild` content props (composing `BaseIconButton`/`BaseTypography`), and `useZIndex`/`useRouterClose` are dropped.
  - Update the `Components/Overlays` stories to compose other components from the package (`Button` triggers, `Stack`/`Typography` bodies, `Button` footer actions) and refresh `llms.txt`.

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

- edb785f: migrate the remaining `Components/Data` components to write-once JSX

  Adds the last two `Components/Data` components, authored once in the neutral
  `@mission-platform/jsx` dialect and compiled straight to both React and Vue by
  `@mission-platform/vite-plugin-jsx`. This completes the `Components/Data` group.

  - `BaseVirtualTable` — a virtual-scrolling, sortable data table that windows the
    body rows beneath a sticky header, with click-to-sort columns (asc → desc →
    unsorted, firing `onSort`), `onRowClick`, an empty state, and a `footer` named
    slot. Like the original it uses ARIA `role="table"` divs (not native
    `<table>`) for cross-browser scroll behaviour; sort/scroll state uses the
    neutral hooks. The per-column scoped `cell-<key>` slots are replaced by each
    column's optional `render` formatter (consistent with the migrated
    `BaseTable`), the icons-package sort glyph becomes `▲`/`▼`/`↕`, and the
    `sort`/`rowClick` emits become `onSort`/`onRowClick` callback props.
  - `BaseTreeView` — a recursive, accessible tree that renders every visible node
    with a built-in expand/collapse label (overridable via the scoped `label`
    slot, scope `{ node, depth }`), keyboard navigation, and `onSelect`/`onToggle`
    callbacks. It flattens the expanded tree into a single list (the neutral
    dialect models no recursive components), substitutes a `▸`/`▾` glyph for the
    icons chevron, and uses callback props for the SFC's `select`/`toggle` emits.

  Each ships its per-component folder (`.tsx`/`.module.scss`/`.stories.tsx`/
  `.spec.ts`/`index.ts`), categorised `JSX Components/Data/<Name>` stories, and
  cross-framework SSR parity specs.

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

- edb785f: migrate the Tier-2 components from `@mission-platform/components` to the write-once neutral JSX package, compiling straight to both React and Vue

  Adds `BaseRadioGroup`, `BaseAccordion`, `BaseTimeline`, `BaseSelect`, `BaseMultiselect`, `BaseChatArea`, and `BaseCarousel`. Compound parent/child SFCs (`BaseAccordion`/`BaseAccordionItem`, `BaseTimeline`/`BaseTimelineItem`) and slot-introspecting components (`BaseCarousel`) are flattened into a single `items`/`slides`-array component (the `BaseTabs` approach), with `provide`/`inject` replaced by internal `useState`. `BaseSelect`/`BaseMultiselect` substitute the Teleport + floating-ui `BaseDropdown` with an in-place absolutely-positioned listbox toggled by `useState` (keeping the hidden native `<select>` for autofill), and `BaseChatArea` reproduces its `ResizeObserver` auto-scroll with a single `useEffect`.

- edb785f: Migrate the self-contained Tier 3 components to write-once neutral JSX,
  compiling straight to both React and Vue: `BaseQrCode` (`Data Display`),
  `BaseLocationInput` and `BaseCalendar` (`Forms`). Each ships its per-folder
  `.tsx`/`.module.scss`/`.stories.tsx`/cross-framework `.spec.ts`/`index.ts` with
  `JSX Components/<Category>/<Name>` stories. The framework-agnostic logic travels
  verbatim onto both builds via co-located helpers — `qr-encode.ts` (the
  dependency-free QR encoder) and `location.ts` (the DD/DM/DMS coordinate
  conversion) — and `BaseCalendar`'s month grid is driven by `luxon` (added as a
  dependency). Vue-only features the neutral dialect does not model are substituted
  with documented equivalents: `computed` → `useMemo`, `ref` → `useState`,
  `watch` → `useEffect`, `useId` → the shared `nextFieldId` `useRef` helper,
  `@mission-platform/icons` chevrons → text glyphs, and `v-model`/emits → the
  controlled `modelValue` + `onUpdateModelValue`/`onChange`/`onError` callback
  props. The remaining Tier 3/4 components stay Vue-only in
  `@mission-platform/components` because they need primitives the neutral dialect
  does not model (Teleport/`@floating-ui` overlays and floating date/time pickers)
  or heavy browser-only toolchains (`BaseMonacoEditor`, `BaseCodeBlock`,
  `BaseMarkdownInput`, `BaseFormBuilder`, `BaseScheduler`, and the form
  meta-components).
- 8d64a2b: improve light/dark theme handling (subtree scoping, pre-paint init, `<meta>` sync, store-backed toggle)

  - `useTheme` / `createThemeStore` gain a `scoped` mode: pass `scoped: true` with
    a `target` element (or assign it later via the new `setTarget(element)`) to
    apply `data-theme`/`color-scheme` to a single subtree element instead of
    `document.documentElement`. Because the tokens' `light-dark()` colours resolve
    against the _used_ `color-scheme`, this re-themes the element and its
    descendants without redefining any custom property — enabling nested providers
    / per-subtree themes. Reassigning or disposing the store cleans up the previous
    element.
  - The store now keeps a `<meta name="color-scheme">` in sync with the resolved
    preference (root mode only; opt out with `syncMeta: false`) so the user-agent
    chrome (scrollbars, form controls, address bar) tracks the active theme, and it
    re-applies on system (`prefers-color-scheme`) changes while in `'auto'`.
  - New `themeInitScript(options?)` export returns a tiny, self-contained snippet
    to inline as a blocking `<script>` in the document `<head>`; it pins
    `data-theme`/`color-scheme` from the persisted preference **before first
    paint**, eliminating the flash of the wrong colour scheme.
  - `BaseThemeProvider` gains a `global` prop (default `true`); set `:global="false"`
    to scope the theme to a rendered (`display: contents`) wrapper element (`as`,
    default `div`) for subtree / nested theming.
  - `BaseThemeToggle` is now backed by the shared `useTheme` store instead of
    hand-rolling its own `data-theme` manipulation, so toggling persists the
    preference, pins `color-scheme` + the `<meta>`, stays in sync with the system
    theme, and drives a `BaseThemeProvider`'s store (global or subtree-scoped) when
    rendered inside one.

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

### Patch Changes

- e1a9272: Drop the third-party `google-libphonenumber` dependency and power `BasePhoneInput`
  with the platform's own `@mission-platform/phone-number` (AssemblyScript/WebAssembly)
  package instead. The co-located `phone.ts` helper now parses, formats
  (national/E.164), validates per region, lists supported regions, provides example
  numbers and formats as-you-type through the synchronous `PhoneNumberUtil` instance,
  so behaviour is unchanged while the external dependency is removed.
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

- c99c4cc: resolve axe colour-contrast violations in the chat bubble and theme composer stories

  The pending chat bubble's `opacity` is raised so its composited text still clears
  WCAG AA (4.5:1), and the outgoing bubble now uses the theme-aware
  `--mp-color-text-on-primary` token. The `BaseThemeComposer` demo stories use
  AA-compliant primary colours.

- 338c7db: use the new motion, opacity and border-width tokens in base-button

  `BaseButton` now composes the new `--mp-duration-*`/`--mp-easing-*`, `--mp-opacity-disabled` and `--mp-border-width-*` design tokens instead of the inline `150ms ease`, `opacity: 0.5` and `1px`/`2px` literals. The rendered output is unchanged (the tokens resolve to the same values); this is the first showcase consumer of the new token groups.

- edb785f: fix drag-and-drop on the Vue build of the form builder and file input

  `BaseFormBuilder` authored its native HTML5 drag-and-drop with React-style camelCase listeners (`onDragOver`/`onDragStart`/`onDrop`), which the Vue build hyphenated into dead events — items could be dragged but never dropped. With the Vue emitter now lowercasing native multi-word DOM events, the form builder's palette/canvas/fieldset drops work on the Vue build. `BaseFileInput`'s hand-lowercased workaround (`onDragover`/`onDragleave`) is restored to the canonical React-style casing so its drop zone works on **both** the React and Vue builds.

- edb785f: fix the form builder rendering only its tab bar in the compiled build

  `BaseFormBuilder` passed its palette and inspector to `BaseVerticalLayout` as the `start`/`end` props and the active panel to `BaseTabs` as the `panel` prop. Those targets render through a neutral `<Slot>`, which the Vue Stage-1 compiler turns into a native `<slot>` (read from `useSlots()`), so content supplied as a **prop** from a compiled neutral parent was dropped — only the tab bar showed. `BaseTabs`/`BaseVirtualTabs` now invoke the `panel` render-prop directly (`properties.panel?.({ tab })`) so it stays a real prop on both frameworks, and `BaseFormBuilder` forwards the palette/inspector through `slot="start"`/`slot="end"` marker children (the supported way to fill a named slot). The palette, inspector, Editor/Steps/Preview/Schema panels, and the wizard are now all visible.

- edb785f: refactor `base-schema-form` and `base-form-builder` to consume the new shared `@mission-platform/forms-core` (their JSON Schema/Ajv/condition/builder logic now re-exports the shared implementation), keeping the public surface and existing specs unchanged
- 23c0463: split component stories into per-framework vue and react variants
- edb785f: Rebuild the date/time pickers (`BaseDateInput`, `BaseTimeInput`,
  `BaseDateRangeInput`, `BaseTimeRangeInput`, `BaseDateTimeRangeInput`) on top of
  the write-once `BaseDropdown` instead of each hand-rolling its own teleported,
  CSS-anchored popover. The trigger is now projected into `BaseDropdown`'s
  `trigger` slot and the calendar/time panel into its default slot, so the
  teleport, anchor positioning, and outside-click/`Escape` dismissal are owned by
  `BaseDropdown` (which already gets the `position-area` value right). This also
  fixes the pickers not opening, since the duplicated popover logic that anchored
  with an invalid `position-area` is gone.
- edb785f: refactor `base-scheduler` to consume the new shared `@mission-platform/scheduler-core` (its `use-scheduler` composable is now a thin Vue-reactive wrapper over the shared recurrence/range/event/layout helpers, and `types` re-exports the shared RFC 5545 model), keeping the public surface and existing specs unchanged
- 429d400: reduce theme composable complexity and add missing doc comments

  Splits the higher-complexity theme helpers into smaller documented functions
  (`createThemeStore`'s initial-theme resolution and `<meta name="color-scheme">`
  sync, plus `useThemeComposer`'s document apply step) and converts the
  non-interpolated init-script template literals to plain string literals. No
  runtime behaviour changes.

- 1c73a0e: improve accessibility and aria semantics across components
- bbc9903: fix `BaseFormBuilder` accessibility violations

  - The field drag handle is no longer `aria-hidden` while being focusable: it
    gets an `aria-label="Drag to reorder"` instead, so `@dnd-kit/vue`'s
    `role="button"` handle is exposed correctly (resolves axe `aria-hidden-focus`).
  - The canvas, wizard-step, and nested field-set dropzones now only carry
    `role="list"` when they actually contain field rows; an empty dropzone (which
    shows a drop-hint placeholder) drops the role, so it no longer violates axe
    `aria-required-children`, and the `role="listitem"` rows always have a
    `role="list"` parent (`aria-required-parent`).

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

- edb785f: match the `BaseMasonry` layout styles to the `@mission-platform/components` original

  `BaseMasonry` now owns its `.base-masonry` rules in the co-located CSS Module —
  the container box (`width` / `min-width`) and, crucially, the per-child
  break-safety (`break-inside: avoid; margin-bottom: var(--mp-masonry-gap)`)
  equivalent to the Vue component's `:slotted(*)` rule — while keeping the dynamic
  multi-column properties inline. Default-slot children are now kept break-safe out
  of the box on both the `./react` and `./vue` subpaths, exactly matching the
  original component instead of relying on consumers to add their own class.

- edb785f: fix the controlled-value round-trip in every story that binds a model value

  The components built by `@mission-platform/vite-plugin-jsx` expose their
  controlled value as an `onUpdate<Name>` callback prop, so the parent listener
  must be the camelised `@update-<name>` form. The stories were using the Vue
  `v-model` colon form (`@update:model-value`), which compiles to the
  `onUpdate:modelValue` vnode key and never reaches the generated callback prop —
  so the value was silently ignored. All controlled-component stories (the entire
  `Forms` category plus `BaseCarousel`, `BaseAlertBanner`, `BasePagination`,
  `BaseSegmentControl`, `BaseTabs`, and `BaseVirtualTabs`) now use the correct
  `@update-model-value` (and `BasePhoneInput`'s `@update-country`,
  `BaseFileInput`'s seeded `ref`) so the value actually round-trips in Storybook.

- edb785f: Consume the `@mission-platform/tokens` design tokens in `BaseMonacoEditor`:
  source the editor's `fontFamily` (mono) and `codeLensFontFamily` (sans) from the
  shared `font` tokens (and re-enable `fontLigatures`/`fontVariations`), reaching
  parity with the `@mission-platform/components` SFC. Adds `@mission-platform/tokens`
  as a runtime dependency.
- edb785f: add a reusable cross-framework SSR DOM parity test helper

  A new `src/test-utils/ssr-parity.ts` helper renders a write-once component on
  both the React and Vue `@mission-platform/jsx` adapters to static SSR markup,
  normalises framework-specific artefacts, and asserts the two outputs are the
  **same DOM** before the per-component assertions run. It is wired into the
  canonical `base-badge.spec.ts` as the pattern for the rest of the suite, and is
  excluded from the published build (test-only). This underpins the cross-framework
  parity verification tracked by the repo's parity matrix tooling.

- edb785f: restructure sample components into per-component folders

  Each sample component now lives in its own folder under `src/components/<name>/`
  with a consistent set of co-located files:
  `<name>.tsx` (the write-once component), `<name>.module.scss` (demo styling),
  `<name>.stories.tsx` (Storybook story), `<name>.spec.ts` (cross-framework SSR
  parity test) and `index.ts` (re-export). The public `./react` and `./vue`
  exports are unchanged; this is an internal source reorganisation. The Storybook
  stories that previously lived in `apps/storybook` now live next to each
  component and are globbed from the package.

- edb785f: scope the drawer and toast enter/leave transition styling (no more `:global`)

  `BaseDrawer` (slide/fade) and `BaseToastContainer` (stack) now drive their
  enter/leave transitions through the neutral `<Transition>`/`<TransitionGroup>`
  explicit class props, passing their styled phase classes from the co-located CSS
  Module (`styles[...]`). The transition rules are no longer declared with
  `:global(.<name>-…)`, so they are hashed on the React build and plain BEM on the
  Vue build exactly like every other class in the package — matching the `scoped`
  `<style>` of the original `@mission-platform/components` SFCs. The animations are
  unchanged on both frameworks.

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

- ca1d98b: reformat sources with updated prettier print width and import ordering
- d39b6fc: add per-workspace reference documentation and refresh llms.txt/README metadata
- 6551abb: reformat source files to match the shared prettier configuration
- 18bd49a: rename the Storybook top-level sections so the catalogue reflects the package split

  The cross-framework catalogue no longer prefixes its sections with `JSX`: the
  `JSX Components/<Category>/<Name>` stories are now `Components/<Category>/<Name>`
  and the `JSX Icons/<Category>/<Name>` stories are now `Icons/<Category>/<Name>`
  (both Vue and React Storybooks). The components extracted into their own packages
  get their own top-level Storybook section instead of nesting under `Components`:
  `@mission-platform/layouts` stories move to `Layouts/<Name>` and
  `@mission-platform/forms` stories move to `Forms/<Name>`.

- 4218ce5: generate one SCSS partial and TS module per token source, with barrels

  - The generated token output is now split per DTCG source: every
    `tokens/<file>.tokens.json` produces `src/generated/scss/_<file>.scss` (a
    self-contained partial with its `$`-variables, `--mp-*` custom properties, and
    `@property` registrations whose `initial-value`s resolve to the matching local
    `$`-variables) and `src/generated/ts/<file>.ts` (a single nested `as const`
    object). The aggregate `src/generated/_tokens.scss` (`@forward` barrel) and
    `src/generated/tokens.ts` (re-export barrel) replace the previous
    `_structural.scss`, `flat.ts`, and `tokens.css` artefacts.
  - **BREAKING:** the TypeScript API is now a flat set of per-source nested objects
    (`palette`, `size`, `font`, `typography`, `borderWidth`, `breakpoint`, `motion`,
    `opacity`, `radius`, `shadow`, `spacing`, `zIndex`, `themeLight`, `themeDark`),
    replacing the previous bespoke exports (`colors`, `spacing`, `fontFamilies`,
    `sizeIcons`, `radii`, `shadows`, …). The standalone `@mission-platform/tokens/css`
    bundle export is removed; consume the SCSS entry points instead.
  - `@mission-platform/components`, `@mission-platform/map`, and
    `@mission-platform/icons` are updated to the new token exports (`font.font.family`,
    `palette.color`, and `size.icon` respectively).

- 7534f50: migrate BaseTypography variants off the SCSS font mixins to design-token CSS custom properties

  Starts the staged retirement of the `@mission-platform/tokens` SCSS `mp-font-*`
  mixin layer: `BaseTypography` now composes each variant directly from the
  generated `--mp-font-*` / `--mp-line-height-*` / `--mp-letter-spacing-*` tokens
  (rendered output is unchanged).

- edb785f: increase the BaseTypography block spacing by two steps

  The per-variant `margin-bottom` in the `BaseTypography` stylesheet is bumped two
  spacing steps (`--mp-spacing-1` → `--mp-spacing-3`, `--mp-spacing-2` →
  `--mp-spacing-4`, `--mp-spacing-3` → `--mp-spacing-5`), giving headings and body
  copy more vertical breathing room. The `label`/`caption`/`code` variants (which
  have no block margin) are left untouched, and no design tokens are changed.

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

- edb785f: add vite plugin that compiles the neutral jsx components to react/vue at build time

  Introduces the `@mission-platform/vite-plugin-jsx` workspace, which compiles the
  framework-neutral `@mission-platform/jsx` components to React or Vue 3 at build
  time instead of wrapping them with the runtime `toReactComponent` /
  `toVueComponent` adapters.

  `@mission-platform/components` produces its `./react` and `./vue` subpaths by
  running one `vite build` per framework through this plugin, rather than the
  runtime adapters.

- Updated dependencies [4218ce5]
- Updated dependencies [eefe5d0]
- Updated dependencies [4218ce5]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [76ebb1f]
- Updated dependencies [13cfc7f]
- Updated dependencies [13cfc7f]
- Updated dependencies [13cfc7f]
- Updated dependencies [13cfc7f]
- Updated dependencies [0a5d7dd]
- Updated dependencies [edb785f]
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
- Updated dependencies [d37e102]
- Updated dependencies [ca1d98b]
- Updated dependencies [d39b6fc]
- Updated dependencies [9cdfef1]
- Updated dependencies [9cdfef1]
- Updated dependencies [4218ce5]
- Updated dependencies [edb785f]
- Updated dependencies [be8ab67]
- Updated dependencies [18bd49a]
- Updated dependencies [4218ce5]
- Updated dependencies [4218ce5]
- Updated dependencies [4218ce5]
- Updated dependencies [4218ce5]
- Updated dependencies [be8ab67]
- Updated dependencies [4218ce5]
- Updated dependencies [4218ce5]
- Updated dependencies [4218ce5]
- Updated dependencies [4218ce5]
- Updated dependencies [be8ab67]
- Updated dependencies [be8ab67]
- Updated dependencies [be8ab67]
- Updated dependencies [be8ab67]
  - @mission-platform/tokens@1.0.0
  - @mission-platform/forms-core@0.2.0
  - @mission-platform/scheduler-core@0.2.0
  - @mission-platform/harper@0.2.0
  - @mission-platform/hunspell@0.4.0
  - @mission-platform/icons@0.2.0
  - @mission-platform/jsx@0.2.0
  - @mission-platform/phone-number@0.3.0

## 1.0.0

### Major Changes

- edb785f: Drop `'tel'` from `BaseInput`'s `InputType` union. Telephone numbers should use
  the dedicated `BasePhoneInput` (`Components/Forms`) instead, which provides a
  country picker, as-you-type formatting, and `google-libphonenumber` validation.
  The `BaseInput` story's `type` control and the `BaseFieldSet` example are
  updated to match (the field-set "Phone" field now composes `BasePhoneInput`).
- edb785f: Give every display, feedback, and typography component the same canonical colour
  set — `neutral`, `primary`, `secondary`, `tertiary`, `success`, `warning`,
  `info`, `error`, and `critical` (plus a transparent `ghost` for the button-like
  components).

  - **Breaking:** the components that already shipped the set (`BaseBadge`,
    `BaseButton`, `BaseTag`, `BaseProgressBar`, `BaseSpinner`) renamed their
    `default` variant to `neutral` and `information` to `info`. `BaseIconButton`'s
    `danger` variant is renamed to `error`.
  - **Buttons:** `BaseButton` and `BaseIconButton` gain a transparent, borderless
    `ghost` variant; `BaseIconButton` now exposes the full canonical set.
  - **Feedback:** `BaseAlertBanner`, `BaseStatusIcon`, and `BaseToast` (and the
    `useToast` store) extend their intent/colour axis to the full canonical set;
    `BaseSkeleton` gains a `variant` colour.
  - **Display:** `BaseCard`, `BaseAccordion`, `BaseCollapse`, `BaseAvatar`,
    `BaseButtonGroup`, `BaseCarousel`, `BaseCodeBlock`, and `BaseTable` gain a
    `variant` colour prop; `BaseList` and `BaseQuote` gain a `tone` colour prop
    (their existing `variant` is the structural style).
  - **Typography:** `BaseTypography`'s `color` prop accepts the canonical semantic
    tones (`neutral`/`success`/`warning`/`info`/`error`/`critical`) alongside the
    existing text tokens.

  For surface components the `neutral` tone keeps the plain/default appearance and
  the coloured tones tint the surface, borders, dividers, or accents via the
  matching `--mp-color-<family>-*` design tokens.

- edb785f: rename the `BaseTypography` `align` prop to `horizontalAlign` and add a `verticalAlign` prop

  `BaseTypography`'s horizontal alignment prop is now `horizontalAlign` (`start`/`center`/`end` → `text-align`), renamed from `align` for symmetry with the new `verticalAlign` prop (`baseline`/`top`/`middle`/`bottom`/`sub`/`super`/`text-top`/`text-bottom` → `vertical-align`). The exported `TypographyAlign` type is correspondingly renamed to `TypographyHorizontalAlign`, and `TypographyVerticalAlign` is exported alongside the other typography types. Storybook stories document both alignment axes.

  BREAKING CHANGE: the `BaseTypography` `align` prop is renamed to `horizontalAlign`, and the `TypographyAlign` type is renamed to `TypographyHorizontalAlign`.

- 18bd49a: extract the form builder and schema form into a new `@mission-platform/forms` package

  Adds the write-once `@mission-platform/forms` package containing
  `BaseFormBuilder` (public `FormBuilder`) and `BaseSchemaForm` (public
  `SchemaForm`), authored once in the neutral `@mission-platform/jsx` dialect and
  compiled to both Vue 3 (`./vue`) and React (`./react`). The package depends on
  **both** `@mission-platform/components` (field widgets + `BaseDrawer`) and
  `@mission-platform/layouts` (`BaseVerticalLayout`), which is why it lives in its
  own package rather than in `@mission-platform/components` — keeping the
  dependency graph acyclic. Co-located `JSX Components/Forms/<Name>` stories and
  cross-framework specs are included.

  **BREAKING (`@mission-platform/components`):** `BaseFormBuilder` / `FormBuilder`
  and `BaseSchemaForm` / `SchemaForm` are no longer exported from
  `@mission-platform/components` — import them from `@mission-platform/forms/vue`
  (or `/react`) instead.

- edb785f: rename the `BaseTypography` `align` prop to `horizontalAlign` and add a `verticalAlign` prop

  The write-once `BaseTypography`'s horizontal alignment prop is now `horizontalAlign` (`start`/`center`/`end` → `text-align`), renamed from `align` to mirror the `@mission-platform/components` `BaseTypography`. The exported `TypographyAlign` type is correspondingly renamed to `TypographyHorizontalAlign`, and the SCSS modifier class moves from `--align-*` to `--halign-*`. A new `verticalAlign` prop (`baseline`/`top`/`middle`/`bottom`/`sub`/`super`/`text-top`/`text-bottom` → `vertical-align`) is added alongside it, with the `TypographyVerticalAlign` type exported and a corresponding `--valign-*` SCSS modifier.

  BREAKING CHANGE: the `BaseTypography` `align` prop is renamed to `horizontalAlign`, and the `TypographyAlign` type is renamed to `TypographyHorizontalAlign`.

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

### Minor Changes

- e1a9272: Make the write-once `BaseSelect` (`Components/Forms`) searchable and use it for
  the `BasePhoneInput` country picker. By default the select trigger is now a text
  field that filters the options as the user types — mirroring `BaseMultiselect` —
  with a search-aware empty state (`No results for "…"`) and keyboard navigation
  over the filtered set; a new `searchable` prop (default `true`) restores the
  plain button trigger when set to `false`. The visually hidden native `<select>`,
  `modelValue`/`onUpdateModelValue`/`onChange` contract, and styling are unchanged.
  `BasePhoneInput` now renders its country dropdown through this searchable
  `BaseSelect` (flag + name + dial code) instead of a raw native `<select>`, so a
  region can be found by searching. Adds `Searchable`/`NonSearchable` stories and
  cross-framework specs for the new behaviour.
- fb5e319: add BaseDeviceMock component for framing preview content in mobile, tablet, desktop, and browser chrome, with correct landscape sizing
- edb785f: Enhance `BaseCalendar` and the date pickers that compose it:

  - Add a `flat` prop to `BaseCalendar` that drops its own border, shadow, and
    background so it sits flush inside an already-bordered container; the date
    pickers (`BaseDateInput`, `BaseDateRangeInput`, `BaseDateTimeRangeInput`) now
    set it to avoid the doubled outline against the `BaseDropdown` panel.
  - Add `rangeStart`/`rangeEnd` props that highlight a selected range (start/end
    caps plus the days in between, matching the original Vue range styling). The
    range pickers pass these to their calendars so the picked range is shown
    across the months.
  - Make the month label clickable to jump to a twelve-month grid, and the year
    clickable to jump to a decade year grid that pages in groups of ten
    (2026 → 2020–2029), for quick navigation to distant dates.
  - Give the date pickers' `BaseDropdown` panel a taller `maxHeight` so the
    calendar fits without an inner scrollbar.
  - Rebuild `BaseDateTimeRangeInput` as a two-step `BaseFormWizard` whose first
    step (**Date**) picks the range's start/end dates and whose second step
    (**Time**) picks the start/end times, with the Finish button closing the
    popover, instead of two side-by-side panes.

- 7534f50: drive `color-scheme` from the theme APIs and adopt modern CSS in components

  - `BaseThemeProvider` / `useTheme` now set the CSS `color-scheme` on
    `document.documentElement`: an explicit `'light'`/`'dark'` preference pins the
    scheme, while `'auto'` applies `color-scheme: light dark` so the root follows
    the OS `prefers-color-scheme` (and the tokens' `light-dark()` values switch
    with it).
  - `BaseThemeComposer` / `useThemeComposer` gain a `colorScheme` config attribute
    (`'light' | 'dark' | 'light dark' | 'normal'`) emitted as a real `color-scheme`
    declaration (scoped style string in local mode, inline property in global mode)
    rather than a `--mp-*` custom property.
  - Began adopting modern CSS where it makes sense: `BaseDialog` animates its native
    `<dialog>` and `::backdrop` in/out with `@starting-style` + `transition-behavior:
allow-discrete` (honouring `prefers-reduced-motion`), and `BaseCard` becomes an
    `inline-size` container and switches its internal padding to `@container` queries.
  - Every component now wraps its SFC `<style>` rules in the `@layer mp.components`
    cascade layer (any leading `@use` stays outside the layer), so unlayered
    application styles win over component styles without specificity battles.

- edb785f: Preview the tentative range while picking a date range:

  - Add a `previewEnd` prop and an `onHoverDate` callback to `BaseCalendar`. The
    grid reports the day under the cursor via `onHoverDate` (and `undefined` on
    leave), and when a `rangeStart` is set but no `rangeEnd` is yet, `previewEnd`
    lightly highlights the range from the start to that day (a softer in-between
    fill and a tentative end cap, distinct from the committed range styling).
  - Wire `BaseDateRangeInput` to track the hovered day and feed it back to both
    calendars as `previewEnd` once a start is selected but the end is still open,
    so the range being chosen is shown as you hover before the second click; the
    hover state is cleared when the popover closes.

- edb785f: show a drop-placement ghost while dragging in the form builder

  `BaseFormBuilder` now renders a placeholder "ghost" row at the exact slot a dragged field will land in — before the hovered canvas row, or appended at the end of the hovered container (a step root or a field set) — driven by a `dropIndicator` insert-target updated on `dragover`. The ghost is `aria-hidden` and acts as its own drop zone at that slot (so a field dropped on it lands precisely there), and it is cleared on drop and on drag-end.

- edb785f: stabilise form-builder drag placement, preview the landing field, and keep the properties panel in sync with the selection

  `BaseFormBuilder` now resolves a hovered row's drop slot from the pointer's position within it (top half drops _before_ the row, bottom half _after_), so the placement no longer jumps around as the inserted ghost reflows the list. The drop-placement ghost renders as a faded, non-interactive clone of the field it will become (the moved field, or the dragged palette entry) rather than a bare placeholder, the canvas drop area is now at least three field-rows tall so dropping is easier, and the dragged source row dims while in flight with smoothed motion (plus a brief ghost entrance animation). The field-properties inspector also resolves the selected field at render time so it correctly tracks the selected field on the Vue build (previously the panel stayed on "Form settings" because the forwarded inspector slot captured the selection once instead of reading it reactively).

- edb785f: Add conditional steps and per-step/final-step validation to the write-once
  `BaseFormWizard` (`Components/Forms`). Each `WizardStep` gains two optional
  fields: `when` (when `false`, the step is dropped from the indicator and
  navigation sequence entirely — a conditional step) and `valid` (when `false`,
  advancing past the step via Next, the final Finish, or a forward indicator jump
  is blocked and the primary button is disabled). Because completion fires from
  the last visible step, that step's `valid` doubles as the final-step validation
  gate. Visibility and validity stay parent-supplied so the component remains
  controlled and framework-neutral. Adds a `WithValidationAndConditionalSteps`
  story demonstrating all three behaviours together.
- edb785f: `BaseSchemaForm` now renders telephone fields (`{ format: 'tel' }`) with the
  dedicated `BasePhoneInput` instead of `BaseInput`, so schema-driven phone fields
  get a country picker, as-you-type formatting, and `google-libphonenumber`
  validation for free. The `'tel'` widget is removed from the form's text-input
  group and routed to a dedicated `BasePhoneInput` control.
- edb785f: add variant-scaled bottom-margin spacing between `BaseTypography` blocks

  `BaseTypography`'s block variants now carry a variant-scaled `margin-bottom` so stacked text blocks breathe instead of butting together: `--mp-spacing-3` for `display`/`h1`, `--mp-spacing-2` for `h2`–`h4`, and `--mp-spacing-1` for `h5`/`h6` and every `body-*` variant (the spacing increases with the type scale, from paragraph up to `h1`). The inline-style `label`, `caption`, and `code` variants stay flush (no margin).

- edb785f: Give **every** component the canonical `2xs … 2xl` size scale via a uniform
  `size` prop (`'2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'`), defaulting to
  `'md'`.

  - **New shared utility:** `src/components/size.module.scss` exposes
    `base-size--<step>` classes that set `font-size` to the matching
    `--mp-size-font-*` design token. Components without bespoke per-size styling now
    apply this class on their root so their text (and any `em`-relative box) scales
    with the requested size.
  - **Widened existing scales:** the components that previously only offered a
    partial scale now cover the full `2xs … 2xl` range — `BaseIconButton`,
    `BaseHero`, `BaseMarkdownInput`, `BaseOtpInput`, `BasePagination`, `BaseQuote`,
    `BaseRangeInput`, `BaseRating`, `BaseSegmentControl`, and `BaseSlider` (each
    was `sm | md | lg`), plus `BaseFileInput` (previously a single `md`), which
    gains a working `size` prop.
  - **New `size` prop** added to every component that previously had none (layout,
    navigation, overlay, feedback, data, media, form, and theme components).
  - **Exceptions:** `BaseTypography`'s `size` is opt-in — left unset by default so
    the chosen `variant` keeps driving its font-size, only overriding it when
    explicitly set — and `BaseModal` keeps its extra non-canonical `'full'` value
    alongside the `2xs … 2xl` range.

  All changes are additive (the new prop defaults to `'md'`) and the widened size
  unions are supersets of the previous ones, so existing usages are unaffected.

- edb785f: support every form input in the form builder palette and inspector

  The builder palette (`DEFAULT_FIELD_TYPES`) now offers every `FormFieldType` the schema-driven form can render — text, text area, markdown, email, password, url, tel, number, number stepper, select, multi-select, radio, checkbox, switch, date, time, date-time, the date/time/date-time ranges, file upload and location — alongside the grouping field set and the multi-step wizard. The inspector gains input-specific editors (multi-line rows, text length/pattern, number step/integer/unsigned, date min/max bounds, show-seconds, file accept/multiple, and the location coordinate format), and `@mission-platform/forms-core` exposes new widget-classifier helpers (`isTextWidget`, `isMultilineWidget`, `isDateWidget`, `isTimeWidget`, `isFileWidget`, `isLocationWidget`).

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

- edb785f: migrate `BaseApplicationLayout` to the write-once jsx-components library

  `@mission-platform/components` gains `BaseApplicationLayout` (public
  `ApplicationLayout`) — the top-level application shell (status banner, header,
  scrollable content, footer) authored once in the neutral JSX dialect and
  compiled straight to both React and Vue by `@mission-platform/vite-plugin-jsx`.
  It is the first migrated component to use the framework-neutral **named-slot**
  primitive (`<Slot name="status" | "navbar" | "content" | "footer" />`), derives
  the status banner's colour/ARIA role from `statusLevel`, and ships its own
  per-component CSS (`@layer mp.components`). Co-located stories
  (`JSX Components/Layout/BaseApplicationLayout`) and cross-framework SSR specs are
  included.

  `@mission-platform/jsx`'s `Slot` marker is now a (never-invoked) function
  component instead of a `unique symbol`, so `<Slot name="…" />` type-checks as a
  JSX element under the classic `h` factory. The runtime adapters still intercept
  it by identity (`type === Slot`) and the build-time compiler still rewrites it
  away, so behaviour is unchanged.

- edb785f: match the write-once `BaseBadge` and `BaseButton` styling to their `@mission-platform/components` sources: both now expose the same nine tone `variant`s and the canonical `2xs … 2xl` `size` scale driven by the shared design tokens. `BaseBadge` renders its label through the composed `BaseTypography` (caption, medium weight, inherited colour), and `BaseButton` gains focus-visible outlines, token-driven transitions, and a built-in accessible `loading` spinner (`loadingLabel` defaulting to `Loading…`), dropping the non-standard `ghost` variant and `badge` prop (the `ghost` button usages move to `tertiary`)
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

- edb785f: restore drag-interaction and drawer transition parity for the write-once components

  `BaseSlider` and `BaseRangeInput` now render the same bespoke `role="slider"` track/thumb(s) as their Vue originals — dragged with a pointer or moved with the keyboard (Arrow/PageUp/PageDown/Home/End) — instead of a native range input. `BaseDrawer` gains drag-to-resize (`draggable` + `onResize`) and the original fade/slide enter/leave via the neutral `<Transition>` primitive, and `BaseVerticalLayout` forwards `startDraggable`/`endDraggable` to resize its inline columns. A shared, SSG-safe `pointer-drag` helper backs all four. The slider and range-input reach full parity (no remaining gaps in the parity matrix).

- edb785f: build straight to both react and vue with no neutral build

  `@mission-platform/components` now compiles the write-once components
  directly to both React and Vue in a single `pnpm build`. The framework-neutral
  build (the `--mode neutral` pass that emitted `dist/index.js`) and the matching
  framework-neutral root export (`@mission-platform/components`) are removed —
  the package exposes only the `./react` and `./vue` subpaths. Consumers that
  previously imported the neutral components from the package root should import
  the matching framework subpath instead.

- edb785f: close the long-tail feedback/editor parity gaps (toast store, typography truncate popup, Monaco spell-check)

  - Add a framework-agnostic observable `toast-store` (the write-once counterpart
    of the Vue `useToast` composable) and a new `BaseToastContainer` component that
    teleports a positioned, store-driven stack of `BaseToast`s; the store's
    `useToast`/`showToast`/`dismissToast`/`clearToasts`/… API is re-exported from
    the generated `./react` and `./vue` entries so consumers drive the same
    per-framework singleton the container uses.
  - Restore the `BaseTypography` truncate popup via a new `truncatePopup` prop,
    positioned with CSS Anchor Positioning (replacing the original `@floating-ui`
    popup) and driven by the neutral `useRef`/`useState` hooks.
  - Wire `BaseMonacoEditor` spell/grammar checking to parity: when `spellCheck` is
    set it lazily imports the shared `attachHunspellMonaco`/`attachHarperMonaco`
    cores (browser-only WASM kept out of the synchronous module graph).
  - Fix `BaseToast` to treat an empty children array as "no default slot" so the
    `message` prop renders when nested (e.g. from `BaseToastContainer`).

- edb785f: bring `BaseSchemaForm` and `BaseFormBuilder` to full behavioral parity with their Vue counterparts: both are now driven by a JSON Schema through the shared `@mission-platform/forms-core` (Ajv validation, conditional `ui.visibleWhen` fields, nested field sets, multi-step wizards), and `BaseFormBuilder` gains the palette/canvas/properties/condition/steps editors with native HTML5 drag-and-drop, a live preview, and JSON-schema export
- edb785f: add the write-once InView component and use plugin-generated entries

  Adds `InView` (the write-once `BaseInView`) — the first stateful sample
  component, driven by the new neutral hooks (`useRef`/`useState`/`useEffect`)
  for its `IntersectionObserver` reveal — shipped to both `./react` and `./vue`.

  The package no longer hand-authors `react.ts` / `vue.ts`: both entries are now
  generated by `@mission-platform/vite-plugin-jsx` from the neutral components
  barrel, and the build uses plain `tsc` (instead of `vue-tsc`). The ambient JSX
  typings now come from `@mission-platform/jsx/jsx-globals` rather than a local
  `jsx.d.ts`.

- edb785f: migrate the default-slot `Components/Layout` primitives to write-once JSX

  Adds `BaseStack`, `BaseGrid`, `BaseSeparator`, and `BaseMasonry` — authored once
  in the neutral JSX dialect and shipped to both the `./react` and `./vue`
  subpaths via the two-stage compiler. The Storybook stories (in this package) are
  re-categorised to mirror the `@mission-platform/components` package:
  `JSX Components/Layout/<Name>` for the layout primitives and `BaseInView`, and
  `JSX Components/Display/<Name>` for `BaseBadge` / `BaseButton`. The complex
  layout components that depend on Vue features the neutral dialect does not model
  (named/scoped slots, Teleport, `v-model`, emits — `BaseApplicationLayout`,
  `BaseNavbar`, `BaseHero`, `BaseDrawer`, `BaseWindowPopout`, and
  `BaseVerticalLayout`) are intentionally not migrated.

- edb785f: match the jsx navbar item to its vue source by rendering the dropdown chevron with the write-once `IconChevron` (direction-driven, size `sm`), and make every component responsive by porting the table's `bp-up('sm')` cell-padding step-up as a 768px media query and capping all floating panels (navbar/menubar dropdowns, popover, and the date/date-range/date-time-range calendars) to the viewport width so they never overflow on mobile
- edb785f: Add the write-once `BasePhoneInput` (`Components/Forms`) — an international
  phone-number field authored once in neutral JSX and compiled straight to both
  React and Vue. A country `<select>` (flag + name + dial code) sits beside a
  `type="tel"` field that is formatted as-you-type and validated with
  **`google-libphonenumber`** through a co-located, framework-agnostic `phone.ts`
  helper (no neutral/JSX imports, so the dependency travels verbatim onto both
  framework builds); the canonical **E.164** form + validity are derived each
  render and a hidden `name` input submits the E.164 value. The national text is
  controlled via `modelValue`/`onUpdateModelValue` and the region via
  `country`/`onUpdateCountry`, with an `onChange` reporting
  `{ national, e164, valid, country }`. Ships the per-folder
  `.tsx`/`phone.ts`/`.module.scss`/`.stories.tsx`/cross-framework
  `.spec.ts`/`index.ts` and a `JSX Components/Forms/BasePhoneInput` story.
- edb785f: bring the recursive and navigation components to behavioral parity with `@mission-platform/components`

  `BaseTreeView` now renders **true nested markup** — each open branch recurses
  into a child `role="group"` sub-list (driven by a single root `openMap`) rather
  than flattening the visible tree, and exposes `aria-selected` while preserving
  the scoped `label` slot and keyboard nav. `BaseMenu` and `BaseMenubar` gain
  **arbitrarily deep** submenus via a single recursive `renderItems` walk keyed by
  a dotted `openPath` (one open per level, ancestor chain stays open), and
  `BaseMenubar` renders its default slot when `items` is omitted (matching the Vue
  `<slot v-else>`). `BaseNavbarItem` renders its childless item through the neutral
  `<Dynamic is={tag}>` primitive (`'a'`/`'button'`). `BaseTabs` now renders a
  `tabpanel` for every tab and keeps inactive panels mounted but `hidden`, so panel
  state survives tab switches (each panel invokes one scoped `panel` slot).

- edb785f: Reach full parity with `@mission-platform/components` by migrating the final 15
  components to write-once neutral JSX, compiling straight to both React and Vue:
  the simple form inputs `BaseColorInput` and `BaseRangeInput` (its dual
  pointer-drag thumbs substituted with two overlaid native `<input type="range">`);
  the date/time pickers `BaseDateInput`, `BaseDateRangeInput`,
  `BaseDateTimeRangeInput`, `BaseTimeInput`, and `BaseTimeRangeInput` (composing the
  migrated `BaseCalendar` / scrollable time lists inside a teleported,
  CSS-anchor-positioned popover — the `BasePopover` recipe replacing
  `@floating-ui` + `useZIndex` — with a shared framework-agnostic `date-time.ts`
  helper); the editors/viewers `BaseCodeBlock` (`highlight.js`) and
  `BaseMarkdownInput` (`marked`), keeping the dep verbatim and injecting the HTML
  via a `useRef` + `useEffect` `innerHTML` escape-hatch instead of `v-html`, plus
  `BaseMonacoEditor`, mounted imperatively with a dynamic `import('monaco-editor')`
  kept out of the synchronous module graph for SSG-safety; and the form
  meta-components `BaseSchemaForm` (a static `switch` over a resolved `fields`
  array composing the migrated inputs, replacing JSON-Schema + Ajv +
  `<component :is>`), `BaseFormWizard`, `BaseFormBuilder` (native HTML5
  drag-and-drop), and `BaseScheduler` (an agenda over a flat `events` array,
  reusing `BaseDialog` for the event details). Each ships its per-folder
  `.tsx`/`.module.scss`/`.stories.tsx`/cross-framework `.spec.ts`/`index.ts`, and
  is re-exported on the `./react`, `./vue`, and Storyblok subpaths. Behaviours the
  neutral dialect deliberately does not model (Ajv validation / JSON-Schema
  generation, RFC 5545 recurrence expansion, scheduler grid collision layout, and
  the harper/hunspell spell-check composables) stay framework-specific and are
  documented per component in `llms.txt`.
- edb785f: bring `BaseScheduler` to full behavioral parity with its Vue counterpart: it is now driven by RFC 5545 `VEvent`s through the shared `@mission-platform/scheduler-core` (recurrence expansion, view ranges, collision layout) with the full five-view set (day / 3-day / week time grids, month grid, year grid), pointer drag-to-move + resize, period navigation, and a `BaseDialog`-based create/edit/delete event dialog; its public surface now mirrors the Vue component (`modelValue` / `defaultView` / `weekStartsOn` + `onUpdateModelValue` / `onEventClick`)
- edb785f: render BaseSelect and BaseMultiselect through the write-once BaseDropdown

  `BaseSelect` and `BaseMultiselect` now render their floating listbox through the
  write-once `BaseDropdown` (a `<Teleport>` panel anchored with CSS Anchor
  Positioning) instead of an in-place, absolutely-positioned list. The combobox is
  passed to the dropdown's `trigger` slot and the `<ul role="listbox">` becomes
  its default slot, with the open state synced via `onUpdateOpen`. Because the
  dropdown panel is mounted only while open, the listbox markup (`role="listbox"`)
  is present only when the control is open; the option labels remain available in
  the always-rendered hidden native `<select>`.

- edb785f: add token-driven `padding`/`margin` spacing props (named `2xs … 2xl` scale) to the layout primitives plus `BaseButton`/`BaseSeparator` (and outer `margin` to `BaseCard`), a responsive `minColumnWidth` auto-fit mode to `BaseGrid`, and a `lineHeight` prop to `BaseTypography`
- edb785f: build the Storyblok output alongside the Vue and React builds

  The package now also projects its neutral components onto Storyblok via
  `@mission-platform/vite-plugin-jsx`'s `generateStoryblokBloks`. Two new build
  modes (`storyblok-vue`, `storyblok-react`) emit the framework blok wrappers into
  `dist/storyblok/{vue,react}/` (exposed as the `./storyblok/react` and
  `./storyblok/vue` subpaths), and the framework-agnostic blok configuration JSON
  (`components.json` plus one `<component>.json` per component) is shipped under
  `./storyblok/components.json`. `@storyblok/react` and `@storyblok/vue` are added
  as optional peer dependencies.

- edb785f: animate `BaseToastContainer` with the neutral `<TransitionGroup name="base-toast">` primitive (matching the Vue SFC's `<TransitionGroup>`), adding the shared `base-toast-*` enter/leave/move transition classes
- edb785f: use the write-once icons-jsx components instead of text glyphs

  Components that previously substituted the `@mission-platform/icons` SFCs with
  text/CSS glyphs now render the write-once `@mission-platform/icons`
  components (compiled to React/Vue alongside each consumer). Replaced: the
  chevrons in `BaseSelect`, `BaseMultiselect`, `BaseAccordion`, `BaseCollapse`,
  `BaseCalendar`, and `BaseScheduler` (`IconChevron`); the close affordances in
  `BaseDialog`, `BaseModal`, `BaseDrawer`, `BaseTabs`, `BaseVirtualTabs`,
  `BaseAlertBanner`, `BaseToast`, and `BaseSearchInput` (`IconClose`); the add
  buttons in `BaseTabs`/`BaseVirtualTabs` (`IconPlus`); the calendar trigger in
  `BaseDateInput`/`BaseDateRangeInput`/`BaseDateTimeRangeInput` (`IconCalendar`,
  plus `IconGlobe` for the timezone toggle); the upload glyph in `BaseFileInput`
  (`IconUpload`); the stepper buttons in `BaseNumberStepper` (`IconMinus`/`IconPlus`);
  and the search glyph in `BaseSearchInput` (`IconSearch`). The CSS chevron-rotation
  classes were removed where the icon's own `direction` prop now handles it.

- edb785f: add a write-once JSX layer that renders on both Vue 3 and React

  Introduces `@mission-platform/jsx`, a tiny dependency-free runtime whose classic
  JSX factory (`h`) builds a framework-neutral element tree, plus `./react` and
  `./vue` adapters (`toReactComponent` / `toVueComponent`) that map that tree onto
  `React.createElement` or Vue's `h` at render time — a hand-rolled alternative to
  build-time compilers like Mitosis.

  Also adds `@mission-platform/components`, a reference consumer that authors
  `BaseBadge` and `BaseButton` once and ships them as both Vue 3 and React
  components via the `./react` and `./vue` subpath exports.

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

- edb785f: migrate the Components/Feedback group to write-once JSX

  Adds the complete `Components/Feedback` group, authored once in the neutral
  `@mission-platform/jsx` dialect and compiled straight to both React and Vue by
  `@mission-platform/vite-plugin-jsx`:

  - `BaseSkeleton` — loading placeholder (line/circle/block shapes, optional
    shimmer, width/height overrides).
  - `BaseSpinner` — indeterminate `role="status"` ring (tone/size + accessible
    label; the i18n default label becomes a plain `'Loading…'`).
  - `BaseStatusIcon` — toned status indicator (icon SVGs substituted with
    `✓`/`⚠`/`✕`/`ℹ`/`–` glyphs; level type exported as `StatusIconLevel`).
  - `BaseProgressBar` — determinate/indeterminate native `<progress>` track with
    an optional label row (composes `BaseTypography`).
  - `BaseAlertBanner` — controlled inline notification banner (`modelValue` +
    `onUpdateModelValue`/`onDismiss` callbacks, `iconContent`/`actions` content
    props, glyph icons, `display: contents` host for visibility toggling).
  - `BaseToast` — presentational toast item (`onDismiss` callback, `iconContent`
    content prop, glyph icon).

  Each ships its per-component folder (`.tsx`/`.module.scss`/`.stories.tsx`/
  `.spec.ts`/`index.ts`), categorised `JSX Components/Feedback/<Name>` stories, and
  cross-framework SSR parity specs. Vue-only features the neutral dialect cannot
  model (`@mission-platform/icons`, i18n, `v-model`/emits, named/`$slots`-presence
  slots) are substituted with the documented equivalents (text glyphs, callback
  props, content props); the `useToast` store / `BaseToastContainer` orchestration
  is out of scope.

- edb785f: Migrate the `Components/Forms` group (plus the `Components/Communication`
  `BaseChatBubble`) to write-once neutral JSX, compiling straight to both React and
  Vue: `BaseCheckbox`, `BaseRadio`, `BaseSwitch`, `BaseInput`, `BaseTextarea`,
  `BaseNumberStepper`, `BaseSlider`, `BaseOtpInput`, `BaseRating`,
  `BaseSearchInput`, `BaseFieldSet`, `BaseFileInput`, and `BaseChatBubble`. Each
  ships its per-folder `.tsx`/`.module.scss`/`.stories.tsx`/cross-framework
  `.spec.ts`/`index.ts` with `JSX Components/<Category>/<Name>` stories. Vue-only
  features the neutral dialect does not model are substituted with documented
  equivalents: the `useId` composable → a shared `nextFieldId` `useRef` helper
  (`field-id.ts`), `v-model`/emits → the controlled `modelValue` +
  `onUpdateModelValue`/`onChange`/… callback props, named slots → `MpChild` content
  props, `@mission-platform/icons` → text glyphs, `useI18n` labels → plain string
  props, `BaseSlider`'s pointer-drag thumb → a native `<input type="range">`, and
  `BaseOtpInput`'s Vue template ref-array → a single container ref +
  `querySelectorAll`.
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

- edb785f: migrate the Components/Media group to write-once cross-framework JSX

  The complete `Components/Media` group is now authored once in the neutral JSX
  dialect (`@mission-platform/jsx`) and compiled straight to both React and Vue by
  `@mission-platform/vite-plugin-jsx`:

  - `BaseResponsiveImage` — an art-directed, responsive `<picture>` (one `<source>`
    per `sources` entry plus a fallback `<img>`) with `srcset`/`sizes`, lazy
    loading, async decoding, a fixed `aspectRatio`, and `object-fit` control.
  - `BaseResponsiveVideo` — a responsive `<video>` with format-specific sources, a
    poster, native controls, and the usual playback flags.
  - `BaseBackgroundVideo` — a decorative full-bleed background `<video>` with
    optional foreground default-slot content and a scrim overlay, honouring
    `prefers-reduced-motion` via a reactive `matchMedia` query driven by the
    neutral hooks.

  Each ships its per-component folder (`.tsx`/`.module.scss`/`.stories.tsx`/
  `.spec.ts`/`index.ts`), categorised `JSX Components/Media/<Name>` stories, and a
  cross-framework SSR parity spec. The native `load`/`error`/`play`/`pause`/`ended`
  emits are exposed as `onLoad`/`onError`/`onPlay`/`onPause`/`onEnded` callback
  props, consistent with the existing migration conventions.

- edb785f: Migrate the `Components/Navigation` group to write-once neutral JSX, compiling
  straight to both React and Vue: `BasePagination`, `BaseSegmentControl`,
  `BaseBreadcrumb`, `BaseMenuItem`, `BaseTabs`, `BaseVirtualTabs`, `BaseMenu`,
  `BaseMenubar`, and `BaseNavbarItem`. Each ships its per-folder
  `.tsx`/`.module.scss`/`.stories.tsx`/cross-framework `.spec.ts`/`index.ts` with
  `JSX Components/Navigation/<Name>` stories. Vue-only features the neutral dialect
  does not model are substituted with documented equivalents: `v-model`/emits →
  controlled `modelValue` + callback props, `vue-router` `RouterLink` → `<a href>`,
  `@mission-platform/icons` → text glyphs, the multi-file tab/menu sub-component
  trees inlined, the `BaseDropdown` overlay → an inline absolutely-positioned
  dropdown, and the menu/menubar/navbar-item open state via `useState` + `useEffect`
  document listeners.
- edb785f: add the modal overlays

  - Migrate the **modal** `Components/Overlays` members `BaseDialog` and `BaseModal` from `@mission-platform/components` to the write-once neutral package. Both render a **native `<dialog>`** driven with `showModal()`/`close()` (top layer, `::backdrop` scrim, focus trap, `Escape`-to-close); `BaseModal` adds a `size` scale (mobile bottom sheet / centred on `sm`+), a body-scroll lock, and a `closeOnEsc` opt-out. The Vue `<Transition>` becomes a CSS `@starting-style` fade, the `header`/`footer` named slots become `MpChild` content props (composing `BaseIconButton`/`BaseTypography`), and `useZIndex`/`useRouterClose` are dropped.
  - Update the `Components/Overlays` stories to compose other components from the package (`Button` triggers, `Stack`/`Typography` bodies, `Button` footer actions) and refresh `llms.txt`.

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

- edb785f: migrate the remaining `Components/Data` components to write-once JSX

  Adds the last two `Components/Data` components, authored once in the neutral
  `@mission-platform/jsx` dialect and compiled straight to both React and Vue by
  `@mission-platform/vite-plugin-jsx`. This completes the `Components/Data` group.

  - `BaseVirtualTable` — a virtual-scrolling, sortable data table that windows the
    body rows beneath a sticky header, with click-to-sort columns (asc → desc →
    unsorted, firing `onSort`), `onRowClick`, an empty state, and a `footer` named
    slot. Like the original it uses ARIA `role="table"` divs (not native
    `<table>`) for cross-browser scroll behaviour; sort/scroll state uses the
    neutral hooks. The per-column scoped `cell-<key>` slots are replaced by each
    column's optional `render` formatter (consistent with the migrated
    `BaseTable`), the icons-package sort glyph becomes `▲`/`▼`/`↕`, and the
    `sort`/`rowClick` emits become `onSort`/`onRowClick` callback props.
  - `BaseTreeView` — a recursive, accessible tree that renders every visible node
    with a built-in expand/collapse label (overridable via the scoped `label`
    slot, scope `{ node, depth }`), keyboard navigation, and `onSelect`/`onToggle`
    callbacks. It flattens the expanded tree into a single list (the neutral
    dialect models no recursive components), substitutes a `▸`/`▾` glyph for the
    icons chevron, and uses callback props for the SFC's `select`/`toggle` emits.

  Each ships its per-component folder (`.tsx`/`.module.scss`/`.stories.tsx`/
  `.spec.ts`/`index.ts`), categorised `JSX Components/Data/<Name>` stories, and
  cross-framework SSR parity specs.

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

- edb785f: migrate the Tier-2 components from `@mission-platform/components` to the write-once neutral JSX package, compiling straight to both React and Vue

  Adds `BaseRadioGroup`, `BaseAccordion`, `BaseTimeline`, `BaseSelect`, `BaseMultiselect`, `BaseChatArea`, and `BaseCarousel`. Compound parent/child SFCs (`BaseAccordion`/`BaseAccordionItem`, `BaseTimeline`/`BaseTimelineItem`) and slot-introspecting components (`BaseCarousel`) are flattened into a single `items`/`slides`-array component (the `BaseTabs` approach), with `provide`/`inject` replaced by internal `useState`. `BaseSelect`/`BaseMultiselect` substitute the Teleport + floating-ui `BaseDropdown` with an in-place absolutely-positioned listbox toggled by `useState` (keeping the hidden native `<select>` for autofill), and `BaseChatArea` reproduces its `ResizeObserver` auto-scroll with a single `useEffect`.

- edb785f: Migrate the self-contained Tier 3 components to write-once neutral JSX,
  compiling straight to both React and Vue: `BaseQrCode` (`Data Display`),
  `BaseLocationInput` and `BaseCalendar` (`Forms`). Each ships its per-folder
  `.tsx`/`.module.scss`/`.stories.tsx`/cross-framework `.spec.ts`/`index.ts` with
  `JSX Components/<Category>/<Name>` stories. The framework-agnostic logic travels
  verbatim onto both builds via co-located helpers — `qr-encode.ts` (the
  dependency-free QR encoder) and `location.ts` (the DD/DM/DMS coordinate
  conversion) — and `BaseCalendar`'s month grid is driven by `luxon` (added as a
  dependency). Vue-only features the neutral dialect does not model are substituted
  with documented equivalents: `computed` → `useMemo`, `ref` → `useState`,
  `watch` → `useEffect`, `useId` → the shared `nextFieldId` `useRef` helper,
  `@mission-platform/icons` chevrons → text glyphs, and `v-model`/emits → the
  controlled `modelValue` + `onUpdateModelValue`/`onChange`/`onError` callback
  props. The remaining Tier 3/4 components stay Vue-only in
  `@mission-platform/components` because they need primitives the neutral dialect
  does not model (Teleport/`@floating-ui` overlays and floating date/time pickers)
  or heavy browser-only toolchains (`BaseMonacoEditor`, `BaseCodeBlock`,
  `BaseMarkdownInput`, `BaseFormBuilder`, `BaseScheduler`, and the form
  meta-components).
- 8d64a2b: improve light/dark theme handling (subtree scoping, pre-paint init, `<meta>` sync, store-backed toggle)

  - `useTheme` / `createThemeStore` gain a `scoped` mode: pass `scoped: true` with
    a `target` element (or assign it later via the new `setTarget(element)`) to
    apply `data-theme`/`color-scheme` to a single subtree element instead of
    `document.documentElement`. Because the tokens' `light-dark()` colours resolve
    against the _used_ `color-scheme`, this re-themes the element and its
    descendants without redefining any custom property — enabling nested providers
    / per-subtree themes. Reassigning or disposing the store cleans up the previous
    element.
  - The store now keeps a `<meta name="color-scheme">` in sync with the resolved
    preference (root mode only; opt out with `syncMeta: false`) so the user-agent
    chrome (scrollbars, form controls, address bar) tracks the active theme, and it
    re-applies on system (`prefers-color-scheme`) changes while in `'auto'`.
  - New `themeInitScript(options?)` export returns a tiny, self-contained snippet
    to inline as a blocking `<script>` in the document `<head>`; it pins
    `data-theme`/`color-scheme` from the persisted preference **before first
    paint**, eliminating the flash of the wrong colour scheme.
  - `BaseThemeProvider` gains a `global` prop (default `true`); set `:global="false"`
    to scope the theme to a rendered (`display: contents`) wrapper element (`as`,
    default `div`) for subtree / nested theming.
  - `BaseThemeToggle` is now backed by the shared `useTheme` store instead of
    hand-rolling its own `data-theme` manipulation, so toggling persists the
    preference, pins `color-scheme` + the `<meta>`, stays in sync with the system
    theme, and drives a `BaseThemeProvider`'s store (global or subtree-scoped) when
    rendered inside one.

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

### Patch Changes

- e1a9272: Drop the third-party `google-libphonenumber` dependency and power `BasePhoneInput`
  with the platform's own `@mission-platform/phone-number` (AssemblyScript/WebAssembly)
  package instead. The co-located `phone.ts` helper now parses, formats
  (national/E.164), validates per region, lists supported regions, provides example
  numbers and formats as-you-type through the synchronous `PhoneNumberUtil` instance,
  so behaviour is unchanged while the external dependency is removed.
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

- c99c4cc: resolve axe colour-contrast violations in the chat bubble and theme composer stories

  The pending chat bubble's `opacity` is raised so its composited text still clears
  WCAG AA (4.5:1), and the outgoing bubble now uses the theme-aware
  `--mp-color-text-on-primary` token. The `BaseThemeComposer` demo stories use
  AA-compliant primary colours.

- 338c7db: use the new motion, opacity and border-width tokens in base-button

  `BaseButton` now composes the new `--mp-duration-*`/`--mp-easing-*`, `--mp-opacity-disabled` and `--mp-border-width-*` design tokens instead of the inline `150ms ease`, `opacity: 0.5` and `1px`/`2px` literals. The rendered output is unchanged (the tokens resolve to the same values); this is the first showcase consumer of the new token groups.

- edb785f: fix drag-and-drop on the Vue build of the form builder and file input

  `BaseFormBuilder` authored its native HTML5 drag-and-drop with React-style camelCase listeners (`onDragOver`/`onDragStart`/`onDrop`), which the Vue build hyphenated into dead events — items could be dragged but never dropped. With the Vue emitter now lowercasing native multi-word DOM events, the form builder's palette/canvas/fieldset drops work on the Vue build. `BaseFileInput`'s hand-lowercased workaround (`onDragover`/`onDragleave`) is restored to the canonical React-style casing so its drop zone works on **both** the React and Vue builds.

- edb785f: fix the form builder rendering only its tab bar in the compiled build

  `BaseFormBuilder` passed its palette and inspector to `BaseVerticalLayout` as the `start`/`end` props and the active panel to `BaseTabs` as the `panel` prop. Those targets render through a neutral `<Slot>`, which the Vue Stage-1 compiler turns into a native `<slot>` (read from `useSlots()`), so content supplied as a **prop** from a compiled neutral parent was dropped — only the tab bar showed. `BaseTabs`/`BaseVirtualTabs` now invoke the `panel` render-prop directly (`properties.panel?.({ tab })`) so it stays a real prop on both frameworks, and `BaseFormBuilder` forwards the palette/inspector through `slot="start"`/`slot="end"` marker children (the supported way to fill a named slot). The palette, inspector, Editor/Steps/Preview/Schema panels, and the wizard are now all visible.

- edb785f: refactor `base-schema-form` and `base-form-builder` to consume the new shared `@mission-platform/forms-core` (their JSON Schema/Ajv/condition/builder logic now re-exports the shared implementation), keeping the public surface and existing specs unchanged
- 23c0463: split component stories into per-framework vue and react variants
- edb785f: Rebuild the date/time pickers (`BaseDateInput`, `BaseTimeInput`,
  `BaseDateRangeInput`, `BaseTimeRangeInput`, `BaseDateTimeRangeInput`) on top of
  the write-once `BaseDropdown` instead of each hand-rolling its own teleported,
  CSS-anchored popover. The trigger is now projected into `BaseDropdown`'s
  `trigger` slot and the calendar/time panel into its default slot, so the
  teleport, anchor positioning, and outside-click/`Escape` dismissal are owned by
  `BaseDropdown` (which already gets the `position-area` value right). This also
  fixes the pickers not opening, since the duplicated popover logic that anchored
  with an invalid `position-area` is gone.
- edb785f: refactor `base-scheduler` to consume the new shared `@mission-platform/scheduler-core` (its `use-scheduler` composable is now a thin Vue-reactive wrapper over the shared recurrence/range/event/layout helpers, and `types` re-exports the shared RFC 5545 model), keeping the public surface and existing specs unchanged
- 429d400: reduce theme composable complexity and add missing doc comments

  Splits the higher-complexity theme helpers into smaller documented functions
  (`createThemeStore`'s initial-theme resolution and `<meta name="color-scheme">`
  sync, plus `useThemeComposer`'s document apply step) and converts the
  non-interpolated init-script template literals to plain string literals. No
  runtime behaviour changes.

- 1c73a0e: improve accessibility and aria semantics across components
- bbc9903: fix `BaseFormBuilder` accessibility violations

  - The field drag handle is no longer `aria-hidden` while being focusable: it
    gets an `aria-label="Drag to reorder"` instead, so `@dnd-kit/vue`'s
    `role="button"` handle is exposed correctly (resolves axe `aria-hidden-focus`).
  - The canvas, wizard-step, and nested field-set dropzones now only carry
    `role="list"` when they actually contain field rows; an empty dropzone (which
    shows a drop-hint placeholder) drops the role, so it no longer violates axe
    `aria-required-children`, and the `role="listitem"` rows always have a
    `role="list"` parent (`aria-required-parent`).

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

- edb785f: match the `BaseMasonry` layout styles to the `@mission-platform/components` original

  `BaseMasonry` now owns its `.base-masonry` rules in the co-located CSS Module —
  the container box (`width` / `min-width`) and, crucially, the per-child
  break-safety (`break-inside: avoid; margin-bottom: var(--mp-masonry-gap)`)
  equivalent to the Vue component's `:slotted(*)` rule — while keeping the dynamic
  multi-column properties inline. Default-slot children are now kept break-safe out
  of the box on both the `./react` and `./vue` subpaths, exactly matching the
  original component instead of relying on consumers to add their own class.

- edb785f: fix the controlled-value round-trip in every story that binds a model value

  The components built by `@mission-platform/vite-plugin-jsx` expose their
  controlled value as an `onUpdate<Name>` callback prop, so the parent listener
  must be the camelised `@update-<name>` form. The stories were using the Vue
  `v-model` colon form (`@update:model-value`), which compiles to the
  `onUpdate:modelValue` vnode key and never reaches the generated callback prop —
  so the value was silently ignored. All controlled-component stories (the entire
  `Forms` category plus `BaseCarousel`, `BaseAlertBanner`, `BasePagination`,
  `BaseSegmentControl`, `BaseTabs`, and `BaseVirtualTabs`) now use the correct
  `@update-model-value` (and `BasePhoneInput`'s `@update-country`,
  `BaseFileInput`'s seeded `ref`) so the value actually round-trips in Storybook.

- edb785f: Consume the `@mission-platform/tokens` design tokens in `BaseMonacoEditor`:
  source the editor's `fontFamily` (mono) and `codeLensFontFamily` (sans) from the
  shared `font` tokens (and re-enable `fontLigatures`/`fontVariations`), reaching
  parity with the `@mission-platform/components` SFC. Adds `@mission-platform/tokens`
  as a runtime dependency.
- edb785f: add a reusable cross-framework SSR DOM parity test helper

  A new `src/test-utils/ssr-parity.ts` helper renders a write-once component on
  both the React and Vue `@mission-platform/jsx` adapters to static SSR markup,
  normalises framework-specific artefacts, and asserts the two outputs are the
  **same DOM** before the per-component assertions run. It is wired into the
  canonical `base-badge.spec.ts` as the pattern for the rest of the suite, and is
  excluded from the published build (test-only). This underpins the cross-framework
  parity verification tracked by the repo's parity matrix tooling.

- edb785f: restructure sample components into per-component folders

  Each sample component now lives in its own folder under `src/components/<name>/`
  with a consistent set of co-located files:
  `<name>.tsx` (the write-once component), `<name>.module.scss` (demo styling),
  `<name>.stories.tsx` (Storybook story), `<name>.spec.ts` (cross-framework SSR
  parity test) and `index.ts` (re-export). The public `./react` and `./vue`
  exports are unchanged; this is an internal source reorganisation. The Storybook
  stories that previously lived in `apps/storybook` now live next to each
  component and are globbed from the package.

- edb785f: scope the drawer and toast enter/leave transition styling (no more `:global`)

  `BaseDrawer` (slide/fade) and `BaseToastContainer` (stack) now drive their
  enter/leave transitions through the neutral `<Transition>`/`<TransitionGroup>`
  explicit class props, passing their styled phase classes from the co-located CSS
  Module (`styles[...]`). The transition rules are no longer declared with
  `:global(.<name>-…)`, so they are hashed on the React build and plain BEM on the
  Vue build exactly like every other class in the package — matching the `scoped`
  `<style>` of the original `@mission-platform/components` SFCs. The animations are
  unchanged on both frameworks.

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

- ca1d98b: reformat sources with updated prettier print width and import ordering
- d39b6fc: add per-workspace reference documentation and refresh llms.txt/README metadata
- 6551abb: reformat source files to match the shared prettier configuration
- 18bd49a: rename the Storybook top-level sections so the catalogue reflects the package split

  The cross-framework catalogue no longer prefixes its sections with `JSX`: the
  `JSX Components/<Category>/<Name>` stories are now `Components/<Category>/<Name>`
  and the `JSX Icons/<Category>/<Name>` stories are now `Icons/<Category>/<Name>`
  (both Vue and React Storybooks). The components extracted into their own packages
  get their own top-level Storybook section instead of nesting under `Components`:
  `@mission-platform/layouts` stories move to `Layouts/<Name>` and
  `@mission-platform/forms` stories move to `Forms/<Name>`.

- 4218ce5: generate one SCSS partial and TS module per token source, with barrels

  - The generated token output is now split per DTCG source: every
    `tokens/<file>.tokens.json` produces `src/generated/scss/_<file>.scss` (a
    self-contained partial with its `$`-variables, `--mp-*` custom properties, and
    `@property` registrations whose `initial-value`s resolve to the matching local
    `$`-variables) and `src/generated/ts/<file>.ts` (a single nested `as const`
    object). The aggregate `src/generated/_tokens.scss` (`@forward` barrel) and
    `src/generated/tokens.ts` (re-export barrel) replace the previous
    `_structural.scss`, `flat.ts`, and `tokens.css` artefacts.
  - **BREAKING:** the TypeScript API is now a flat set of per-source nested objects
    (`palette`, `size`, `font`, `typography`, `borderWidth`, `breakpoint`, `motion`,
    `opacity`, `radius`, `shadow`, `spacing`, `zIndex`, `themeLight`, `themeDark`),
    replacing the previous bespoke exports (`colors`, `spacing`, `fontFamilies`,
    `sizeIcons`, `radii`, `shadows`, …). The standalone `@mission-platform/tokens/css`
    bundle export is removed; consume the SCSS entry points instead.
  - `@mission-platform/components`, `@mission-platform/map`, and
    `@mission-platform/icons` are updated to the new token exports (`font.font.family`,
    `palette.color`, and `size.icon` respectively).

- 7534f50: migrate BaseTypography variants off the SCSS font mixins to design-token CSS custom properties

  Starts the staged retirement of the `@mission-platform/tokens` SCSS `mp-font-*`
  mixin layer: `BaseTypography` now composes each variant directly from the
  generated `--mp-font-*` / `--mp-line-height-*` / `--mp-letter-spacing-*` tokens
  (rendered output is unchanged).

- edb785f: increase the BaseTypography block spacing by two steps

  The per-variant `margin-bottom` in the `BaseTypography` stylesheet is bumped two
  spacing steps (`--mp-spacing-1` → `--mp-spacing-3`, `--mp-spacing-2` →
  `--mp-spacing-4`, `--mp-spacing-3` → `--mp-spacing-5`), giving headings and body
  copy more vertical breathing room. The `label`/`caption`/`code` variants (which
  have no block margin) are left untouched, and no design tokens are changed.

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

- edb785f: add vite plugin that compiles the neutral jsx components to react/vue at build time

  Introduces the `@mission-platform/vite-plugin-jsx` workspace, which compiles the
  framework-neutral `@mission-platform/jsx` components to React or Vue 3 at build
  time instead of wrapping them with the runtime `toReactComponent` /
  `toVueComponent` adapters.

  `@mission-platform/components` produces its `./react` and `./vue` subpaths by
  running one `vite build` per framework through this plugin, rather than the
  runtime adapters.

- Updated dependencies [4218ce5]
- Updated dependencies [eefe5d0]
- Updated dependencies [4218ce5]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [76ebb1f]
- Updated dependencies [13cfc7f]
- Updated dependencies [13cfc7f]
- Updated dependencies [13cfc7f]
- Updated dependencies [13cfc7f]
- Updated dependencies [0a5d7dd]
- Updated dependencies [edb785f]
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
- Updated dependencies [d37e102]
- Updated dependencies [ca1d98b]
- Updated dependencies [d39b6fc]
- Updated dependencies [9cdfef1]
- Updated dependencies [9cdfef1]
- Updated dependencies [4218ce5]
- Updated dependencies [edb785f]
- Updated dependencies [be8ab67]
- Updated dependencies [18bd49a]
- Updated dependencies [4218ce5]
- Updated dependencies [4218ce5]
- Updated dependencies [4218ce5]
- Updated dependencies [4218ce5]
- Updated dependencies [be8ab67]
- Updated dependencies [4218ce5]
- Updated dependencies [4218ce5]
- Updated dependencies [4218ce5]
- Updated dependencies [4218ce5]
- Updated dependencies [be8ab67]
- Updated dependencies [be8ab67]
- Updated dependencies [be8ab67]
- Updated dependencies [be8ab67]
  - @mission-platform/tokens@1.0.0
  - @mission-platform/forms-core@0.2.0
  - @mission-platform/scheduler-core@0.2.0
  - @mission-platform/harper@0.2.0
  - @mission-platform/hunspell@0.4.0
  - @mission-platform/icons@0.2.0
  - @mission-platform/jsx@0.2.0
  - @mission-platform/phone-number@0.3.0

## 1.0.0

### Major Changes

- edb785f: Drop `'tel'` from `BaseInput`'s `InputType` union. Telephone numbers should use
  the dedicated `BasePhoneInput` (`Components/Forms`) instead, which provides a
  country picker, as-you-type formatting, and `google-libphonenumber` validation.
  The `BaseInput` story's `type` control and the `BaseFieldSet` example are
  updated to match (the field-set "Phone" field now composes `BasePhoneInput`).
- edb785f: Give every display, feedback, and typography component the same canonical colour
  set — `neutral`, `primary`, `secondary`, `tertiary`, `success`, `warning`,
  `info`, `error`, and `critical` (plus a transparent `ghost` for the button-like
  components).

  - **Breaking:** the components that already shipped the set (`BaseBadge`,
    `BaseButton`, `BaseTag`, `BaseProgressBar`, `BaseSpinner`) renamed their
    `default` variant to `neutral` and `information` to `info`. `BaseIconButton`'s
    `danger` variant is renamed to `error`.
  - **Buttons:** `BaseButton` and `BaseIconButton` gain a transparent, borderless
    `ghost` variant; `BaseIconButton` now exposes the full canonical set.
  - **Feedback:** `BaseAlertBanner`, `BaseStatusIcon`, and `BaseToast` (and the
    `useToast` store) extend their intent/colour axis to the full canonical set;
    `BaseSkeleton` gains a `variant` colour.
  - **Display:** `BaseCard`, `BaseAccordion`, `BaseCollapse`, `BaseAvatar`,
    `BaseButtonGroup`, `BaseCarousel`, `BaseCodeBlock`, and `BaseTable` gain a
    `variant` colour prop; `BaseList` and `BaseQuote` gain a `tone` colour prop
    (their existing `variant` is the structural style).
  - **Typography:** `BaseTypography`'s `color` prop accepts the canonical semantic
    tones (`neutral`/`success`/`warning`/`info`/`error`/`critical`) alongside the
    existing text tokens.

  For surface components the `neutral` tone keeps the plain/default appearance and
  the coloured tones tint the surface, borders, dividers, or accents via the
  matching `--mp-color-<family>-*` design tokens.

- edb785f: rename the `BaseTypography` `align` prop to `horizontalAlign` and add a `verticalAlign` prop

  `BaseTypography`'s horizontal alignment prop is now `horizontalAlign` (`start`/`center`/`end` → `text-align`), renamed from `align` for symmetry with the new `verticalAlign` prop (`baseline`/`top`/`middle`/`bottom`/`sub`/`super`/`text-top`/`text-bottom` → `vertical-align`). The exported `TypographyAlign` type is correspondingly renamed to `TypographyHorizontalAlign`, and `TypographyVerticalAlign` is exported alongside the other typography types. Storybook stories document both alignment axes.

  BREAKING CHANGE: the `BaseTypography` `align` prop is renamed to `horizontalAlign`, and the `TypographyAlign` type is renamed to `TypographyHorizontalAlign`.

- 18bd49a: extract the form builder and schema form into a new `@mission-platform/forms` package

  Adds the write-once `@mission-platform/forms` package containing
  `BaseFormBuilder` (public `FormBuilder`) and `BaseSchemaForm` (public
  `SchemaForm`), authored once in the neutral `@mission-platform/jsx` dialect and
  compiled to both Vue 3 (`./vue`) and React (`./react`). The package depends on
  **both** `@mission-platform/components` (field widgets + `BaseDrawer`) and
  `@mission-platform/layouts` (`BaseVerticalLayout`), which is why it lives in its
  own package rather than in `@mission-platform/components` — keeping the
  dependency graph acyclic. Co-located `JSX Components/Forms/<Name>` stories and
  cross-framework specs are included.

  **BREAKING (`@mission-platform/components`):** `BaseFormBuilder` / `FormBuilder`
  and `BaseSchemaForm` / `SchemaForm` are no longer exported from
  `@mission-platform/components` — import them from `@mission-platform/forms/vue`
  (or `/react`) instead.

- edb785f: rename the `BaseTypography` `align` prop to `horizontalAlign` and add a `verticalAlign` prop

  The write-once `BaseTypography`'s horizontal alignment prop is now `horizontalAlign` (`start`/`center`/`end` → `text-align`), renamed from `align` to mirror the `@mission-platform/components` `BaseTypography`. The exported `TypographyAlign` type is correspondingly renamed to `TypographyHorizontalAlign`, and the SCSS modifier class moves from `--align-*` to `--halign-*`. A new `verticalAlign` prop (`baseline`/`top`/`middle`/`bottom`/`sub`/`super`/`text-top`/`text-bottom` → `vertical-align`) is added alongside it, with the `TypographyVerticalAlign` type exported and a corresponding `--valign-*` SCSS modifier.

  BREAKING CHANGE: the `BaseTypography` `align` prop is renamed to `horizontalAlign`, and the `TypographyAlign` type is renamed to `TypographyHorizontalAlign`.

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

### Minor Changes

- e1a9272: Make the write-once `BaseSelect` (`Components/Forms`) searchable and use it for
  the `BasePhoneInput` country picker. By default the select trigger is now a text
  field that filters the options as the user types — mirroring `BaseMultiselect` —
  with a search-aware empty state (`No results for "…"`) and keyboard navigation
  over the filtered set; a new `searchable` prop (default `true`) restores the
  plain button trigger when set to `false`. The visually hidden native `<select>`,
  `modelValue`/`onUpdateModelValue`/`onChange` contract, and styling are unchanged.
  `BasePhoneInput` now renders its country dropdown through this searchable
  `BaseSelect` (flag + name + dial code) instead of a raw native `<select>`, so a
  region can be found by searching. Adds `Searchable`/`NonSearchable` stories and
  cross-framework specs for the new behaviour.
- fb5e319: add BaseDeviceMock component for framing preview content in mobile, tablet, desktop, and browser chrome, with correct landscape sizing
- edb785f: Enhance `BaseCalendar` and the date pickers that compose it:

  - Add a `flat` prop to `BaseCalendar` that drops its own border, shadow, and
    background so it sits flush inside an already-bordered container; the date
    pickers (`BaseDateInput`, `BaseDateRangeInput`, `BaseDateTimeRangeInput`) now
    set it to avoid the doubled outline against the `BaseDropdown` panel.
  - Add `rangeStart`/`rangeEnd` props that highlight a selected range (start/end
    caps plus the days in between, matching the original Vue range styling). The
    range pickers pass these to their calendars so the picked range is shown
    across the months.
  - Make the month label clickable to jump to a twelve-month grid, and the year
    clickable to jump to a decade year grid that pages in groups of ten
    (2026 → 2020–2029), for quick navigation to distant dates.
  - Give the date pickers' `BaseDropdown` panel a taller `maxHeight` so the
    calendar fits without an inner scrollbar.
  - Rebuild `BaseDateTimeRangeInput` as a two-step `BaseFormWizard` whose first
    step (**Date**) picks the range's start/end dates and whose second step
    (**Time**) picks the start/end times, with the Finish button closing the
    popover, instead of two side-by-side panes.

- 7534f50: drive `color-scheme` from the theme APIs and adopt modern CSS in components

  - `BaseThemeProvider` / `useTheme` now set the CSS `color-scheme` on
    `document.documentElement`: an explicit `'light'`/`'dark'` preference pins the
    scheme, while `'auto'` applies `color-scheme: light dark` so the root follows
    the OS `prefers-color-scheme` (and the tokens' `light-dark()` values switch
    with it).
  - `BaseThemeComposer` / `useThemeComposer` gain a `colorScheme` config attribute
    (`'light' | 'dark' | 'light dark' | 'normal'`) emitted as a real `color-scheme`
    declaration (scoped style string in local mode, inline property in global mode)
    rather than a `--mp-*` custom property.
  - Began adopting modern CSS where it makes sense: `BaseDialog` animates its native
    `<dialog>` and `::backdrop` in/out with `@starting-style` + `transition-behavior:
allow-discrete` (honouring `prefers-reduced-motion`), and `BaseCard` becomes an
    `inline-size` container and switches its internal padding to `@container` queries.
  - Every component now wraps its SFC `<style>` rules in the `@layer mp.components`
    cascade layer (any leading `@use` stays outside the layer), so unlayered
    application styles win over component styles without specificity battles.

- edb785f: Preview the tentative range while picking a date range:

  - Add a `previewEnd` prop and an `onHoverDate` callback to `BaseCalendar`. The
    grid reports the day under the cursor via `onHoverDate` (and `undefined` on
    leave), and when a `rangeStart` is set but no `rangeEnd` is yet, `previewEnd`
    lightly highlights the range from the start to that day (a softer in-between
    fill and a tentative end cap, distinct from the committed range styling).
  - Wire `BaseDateRangeInput` to track the hovered day and feed it back to both
    calendars as `previewEnd` once a start is selected but the end is still open,
    so the range being chosen is shown as you hover before the second click; the
    hover state is cleared when the popover closes.

- edb785f: show a drop-placement ghost while dragging in the form builder

  `BaseFormBuilder` now renders a placeholder "ghost" row at the exact slot a dragged field will land in — before the hovered canvas row, or appended at the end of the hovered container (a step root or a field set) — driven by a `dropIndicator` insert-target updated on `dragover`. The ghost is `aria-hidden` and acts as its own drop zone at that slot (so a field dropped on it lands precisely there), and it is cleared on drop and on drag-end.

- edb785f: stabilise form-builder drag placement, preview the landing field, and keep the properties panel in sync with the selection

  `BaseFormBuilder` now resolves a hovered row's drop slot from the pointer's position within it (top half drops _before_ the row, bottom half _after_), so the placement no longer jumps around as the inserted ghost reflows the list. The drop-placement ghost renders as a faded, non-interactive clone of the field it will become (the moved field, or the dragged palette entry) rather than a bare placeholder, the canvas drop area is now at least three field-rows tall so dropping is easier, and the dragged source row dims while in flight with smoothed motion (plus a brief ghost entrance animation). The field-properties inspector also resolves the selected field at render time so it correctly tracks the selected field on the Vue build (previously the panel stayed on "Form settings" because the forwarded inspector slot captured the selection once instead of reading it reactively).

- edb785f: Add conditional steps and per-step/final-step validation to the write-once
  `BaseFormWizard` (`Components/Forms`). Each `WizardStep` gains two optional
  fields: `when` (when `false`, the step is dropped from the indicator and
  navigation sequence entirely — a conditional step) and `valid` (when `false`,
  advancing past the step via Next, the final Finish, or a forward indicator jump
  is blocked and the primary button is disabled). Because completion fires from
  the last visible step, that step's `valid` doubles as the final-step validation
  gate. Visibility and validity stay parent-supplied so the component remains
  controlled and framework-neutral. Adds a `WithValidationAndConditionalSteps`
  story demonstrating all three behaviours together.
- edb785f: `BaseSchemaForm` now renders telephone fields (`{ format: 'tel' }`) with the
  dedicated `BasePhoneInput` instead of `BaseInput`, so schema-driven phone fields
  get a country picker, as-you-type formatting, and `google-libphonenumber`
  validation for free. The `'tel'` widget is removed from the form's text-input
  group and routed to a dedicated `BasePhoneInput` control.
- edb785f: add variant-scaled bottom-margin spacing between `BaseTypography` blocks

  `BaseTypography`'s block variants now carry a variant-scaled `margin-bottom` so stacked text blocks breathe instead of butting together: `--mp-spacing-3` for `display`/`h1`, `--mp-spacing-2` for `h2`–`h4`, and `--mp-spacing-1` for `h5`/`h6` and every `body-*` variant (the spacing increases with the type scale, from paragraph up to `h1`). The inline-style `label`, `caption`, and `code` variants stay flush (no margin).

- edb785f: Give **every** component the canonical `2xs … 2xl` size scale via a uniform
  `size` prop (`'2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'`), defaulting to
  `'md'`.

  - **New shared utility:** `src/components/size.module.scss` exposes
    `base-size--<step>` classes that set `font-size` to the matching
    `--mp-size-font-*` design token. Components without bespoke per-size styling now
    apply this class on their root so their text (and any `em`-relative box) scales
    with the requested size.
  - **Widened existing scales:** the components that previously only offered a
    partial scale now cover the full `2xs … 2xl` range — `BaseIconButton`,
    `BaseHero`, `BaseMarkdownInput`, `BaseOtpInput`, `BasePagination`, `BaseQuote`,
    `BaseRangeInput`, `BaseRating`, `BaseSegmentControl`, and `BaseSlider` (each
    was `sm | md | lg`), plus `BaseFileInput` (previously a single `md`), which
    gains a working `size` prop.
  - **New `size` prop** added to every component that previously had none (layout,
    navigation, overlay, feedback, data, media, form, and theme components).
  - **Exceptions:** `BaseTypography`'s `size` is opt-in — left unset by default so
    the chosen `variant` keeps driving its font-size, only overriding it when
    explicitly set — and `BaseModal` keeps its extra non-canonical `'full'` value
    alongside the `2xs … 2xl` range.

  All changes are additive (the new prop defaults to `'md'`) and the widened size
  unions are supersets of the previous ones, so existing usages are unaffected.

- edb785f: support every form input in the form builder palette and inspector

  The builder palette (`DEFAULT_FIELD_TYPES`) now offers every `FormFieldType` the schema-driven form can render — text, text area, markdown, email, password, url, tel, number, number stepper, select, multi-select, radio, checkbox, switch, date, time, date-time, the date/time/date-time ranges, file upload and location — alongside the grouping field set and the multi-step wizard. The inspector gains input-specific editors (multi-line rows, text length/pattern, number step/integer/unsigned, date min/max bounds, show-seconds, file accept/multiple, and the location coordinate format), and `@mission-platform/forms-core` exposes new widget-classifier helpers (`isTextWidget`, `isMultilineWidget`, `isDateWidget`, `isTimeWidget`, `isFileWidget`, `isLocationWidget`).

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

- edb785f: migrate `BaseApplicationLayout` to the write-once jsx-components library

  `@mission-platform/components` gains `BaseApplicationLayout` (public
  `ApplicationLayout`) — the top-level application shell (status banner, header,
  scrollable content, footer) authored once in the neutral JSX dialect and
  compiled straight to both React and Vue by `@mission-platform/vite-plugin-jsx`.
  It is the first migrated component to use the framework-neutral **named-slot**
  primitive (`<Slot name="status" | "navbar" | "content" | "footer" />`), derives
  the status banner's colour/ARIA role from `statusLevel`, and ships its own
  per-component CSS (`@layer mp.components`). Co-located stories
  (`JSX Components/Layout/BaseApplicationLayout`) and cross-framework SSR specs are
  included.

  `@mission-platform/jsx`'s `Slot` marker is now a (never-invoked) function
  component instead of a `unique symbol`, so `<Slot name="…" />` type-checks as a
  JSX element under the classic `h` factory. The runtime adapters still intercept
  it by identity (`type === Slot`) and the build-time compiler still rewrites it
  away, so behaviour is unchanged.

- edb785f: match the write-once `BaseBadge` and `BaseButton` styling to their `@mission-platform/components` sources: both now expose the same nine tone `variant`s and the canonical `2xs … 2xl` `size` scale driven by the shared design tokens. `BaseBadge` renders its label through the composed `BaseTypography` (caption, medium weight, inherited colour), and `BaseButton` gains focus-visible outlines, token-driven transitions, and a built-in accessible `loading` spinner (`loadingLabel` defaulting to `Loading…`), dropping the non-standard `ghost` variant and `badge` prop (the `ghost` button usages move to `tertiary`)
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

- edb785f: restore drag-interaction and drawer transition parity for the write-once components

  `BaseSlider` and `BaseRangeInput` now render the same bespoke `role="slider"` track/thumb(s) as their Vue originals — dragged with a pointer or moved with the keyboard (Arrow/PageUp/PageDown/Home/End) — instead of a native range input. `BaseDrawer` gains drag-to-resize (`draggable` + `onResize`) and the original fade/slide enter/leave via the neutral `<Transition>` primitive, and `BaseVerticalLayout` forwards `startDraggable`/`endDraggable` to resize its inline columns. A shared, SSG-safe `pointer-drag` helper backs all four. The slider and range-input reach full parity (no remaining gaps in the parity matrix).

- edb785f: build straight to both react and vue with no neutral build

  `@mission-platform/components` now compiles the write-once components
  directly to both React and Vue in a single `pnpm build`. The framework-neutral
  build (the `--mode neutral` pass that emitted `dist/index.js`) and the matching
  framework-neutral root export (`@mission-platform/components`) are removed —
  the package exposes only the `./react` and `./vue` subpaths. Consumers that
  previously imported the neutral components from the package root should import
  the matching framework subpath instead.

- edb785f: close the long-tail feedback/editor parity gaps (toast store, typography truncate popup, Monaco spell-check)

  - Add a framework-agnostic observable `toast-store` (the write-once counterpart
    of the Vue `useToast` composable) and a new `BaseToastContainer` component that
    teleports a positioned, store-driven stack of `BaseToast`s; the store's
    `useToast`/`showToast`/`dismissToast`/`clearToasts`/… API is re-exported from
    the generated `./react` and `./vue` entries so consumers drive the same
    per-framework singleton the container uses.
  - Restore the `BaseTypography` truncate popup via a new `truncatePopup` prop,
    positioned with CSS Anchor Positioning (replacing the original `@floating-ui`
    popup) and driven by the neutral `useRef`/`useState` hooks.
  - Wire `BaseMonacoEditor` spell/grammar checking to parity: when `spellCheck` is
    set it lazily imports the shared `attachHunspellMonaco`/`attachHarperMonaco`
    cores (browser-only WASM kept out of the synchronous module graph).
  - Fix `BaseToast` to treat an empty children array as "no default slot" so the
    `message` prop renders when nested (e.g. from `BaseToastContainer`).

- edb785f: bring `BaseSchemaForm` and `BaseFormBuilder` to full behavioral parity with their Vue counterparts: both are now driven by a JSON Schema through the shared `@mission-platform/forms-core` (Ajv validation, conditional `ui.visibleWhen` fields, nested field sets, multi-step wizards), and `BaseFormBuilder` gains the palette/canvas/properties/condition/steps editors with native HTML5 drag-and-drop, a live preview, and JSON-schema export
- edb785f: add the write-once InView component and use plugin-generated entries

  Adds `InView` (the write-once `BaseInView`) — the first stateful sample
  component, driven by the new neutral hooks (`useRef`/`useState`/`useEffect`)
  for its `IntersectionObserver` reveal — shipped to both `./react` and `./vue`.

  The package no longer hand-authors `react.ts` / `vue.ts`: both entries are now
  generated by `@mission-platform/vite-plugin-jsx` from the neutral components
  barrel, and the build uses plain `tsc` (instead of `vue-tsc`). The ambient JSX
  typings now come from `@mission-platform/jsx/jsx-globals` rather than a local
  `jsx.d.ts`.

- edb785f: migrate the default-slot `Components/Layout` primitives to write-once JSX

  Adds `BaseStack`, `BaseGrid`, `BaseSeparator`, and `BaseMasonry` — authored once
  in the neutral JSX dialect and shipped to both the `./react` and `./vue`
  subpaths via the two-stage compiler. The Storybook stories (in this package) are
  re-categorised to mirror the `@mission-platform/components` package:
  `JSX Components/Layout/<Name>` for the layout primitives and `BaseInView`, and
  `JSX Components/Display/<Name>` for `BaseBadge` / `BaseButton`. The complex
  layout components that depend on Vue features the neutral dialect does not model
  (named/scoped slots, Teleport, `v-model`, emits — `BaseApplicationLayout`,
  `BaseNavbar`, `BaseHero`, `BaseDrawer`, `BaseWindowPopout`, and
  `BaseVerticalLayout`) are intentionally not migrated.

- edb785f: match the jsx navbar item to its vue source by rendering the dropdown chevron with the write-once `IconChevron` (direction-driven, size `sm`), and make every component responsive by porting the table's `bp-up('sm')` cell-padding step-up as a 768px media query and capping all floating panels (navbar/menubar dropdowns, popover, and the date/date-range/date-time-range calendars) to the viewport width so they never overflow on mobile
- edb785f: Add the write-once `BasePhoneInput` (`Components/Forms`) — an international
  phone-number field authored once in neutral JSX and compiled straight to both
  React and Vue. A country `<select>` (flag + name + dial code) sits beside a
  `type="tel"` field that is formatted as-you-type and validated with
  **`google-libphonenumber`** through a co-located, framework-agnostic `phone.ts`
  helper (no neutral/JSX imports, so the dependency travels verbatim onto both
  framework builds); the canonical **E.164** form + validity are derived each
  render and a hidden `name` input submits the E.164 value. The national text is
  controlled via `modelValue`/`onUpdateModelValue` and the region via
  `country`/`onUpdateCountry`, with an `onChange` reporting
  `{ national, e164, valid, country }`. Ships the per-folder
  `.tsx`/`phone.ts`/`.module.scss`/`.stories.tsx`/cross-framework
  `.spec.ts`/`index.ts` and a `JSX Components/Forms/BasePhoneInput` story.
- edb785f: bring the recursive and navigation components to behavioral parity with `@mission-platform/components`

  `BaseTreeView` now renders **true nested markup** — each open branch recurses
  into a child `role="group"` sub-list (driven by a single root `openMap`) rather
  than flattening the visible tree, and exposes `aria-selected` while preserving
  the scoped `label` slot and keyboard nav. `BaseMenu` and `BaseMenubar` gain
  **arbitrarily deep** submenus via a single recursive `renderItems` walk keyed by
  a dotted `openPath` (one open per level, ancestor chain stays open), and
  `BaseMenubar` renders its default slot when `items` is omitted (matching the Vue
  `<slot v-else>`). `BaseNavbarItem` renders its childless item through the neutral
  `<Dynamic is={tag}>` primitive (`'a'`/`'button'`). `BaseTabs` now renders a
  `tabpanel` for every tab and keeps inactive panels mounted but `hidden`, so panel
  state survives tab switches (each panel invokes one scoped `panel` slot).

- edb785f: Reach full parity with `@mission-platform/components` by migrating the final 15
  components to write-once neutral JSX, compiling straight to both React and Vue:
  the simple form inputs `BaseColorInput` and `BaseRangeInput` (its dual
  pointer-drag thumbs substituted with two overlaid native `<input type="range">`);
  the date/time pickers `BaseDateInput`, `BaseDateRangeInput`,
  `BaseDateTimeRangeInput`, `BaseTimeInput`, and `BaseTimeRangeInput` (composing the
  migrated `BaseCalendar` / scrollable time lists inside a teleported,
  CSS-anchor-positioned popover — the `BasePopover` recipe replacing
  `@floating-ui` + `useZIndex` — with a shared framework-agnostic `date-time.ts`
  helper); the editors/viewers `BaseCodeBlock` (`highlight.js`) and
  `BaseMarkdownInput` (`marked`), keeping the dep verbatim and injecting the HTML
  via a `useRef` + `useEffect` `innerHTML` escape-hatch instead of `v-html`, plus
  `BaseMonacoEditor`, mounted imperatively with a dynamic `import('monaco-editor')`
  kept out of the synchronous module graph for SSG-safety; and the form
  meta-components `BaseSchemaForm` (a static `switch` over a resolved `fields`
  array composing the migrated inputs, replacing JSON-Schema + Ajv +
  `<component :is>`), `BaseFormWizard`, `BaseFormBuilder` (native HTML5
  drag-and-drop), and `BaseScheduler` (an agenda over a flat `events` array,
  reusing `BaseDialog` for the event details). Each ships its per-folder
  `.tsx`/`.module.scss`/`.stories.tsx`/cross-framework `.spec.ts`/`index.ts`, and
  is re-exported on the `./react`, `./vue`, and Storyblok subpaths. Behaviours the
  neutral dialect deliberately does not model (Ajv validation / JSON-Schema
  generation, RFC 5545 recurrence expansion, scheduler grid collision layout, and
  the harper/hunspell spell-check composables) stay framework-specific and are
  documented per component in `llms.txt`.
- edb785f: bring `BaseScheduler` to full behavioral parity with its Vue counterpart: it is now driven by RFC 5545 `VEvent`s through the shared `@mission-platform/scheduler-core` (recurrence expansion, view ranges, collision layout) with the full five-view set (day / 3-day / week time grids, month grid, year grid), pointer drag-to-move + resize, period navigation, and a `BaseDialog`-based create/edit/delete event dialog; its public surface now mirrors the Vue component (`modelValue` / `defaultView` / `weekStartsOn` + `onUpdateModelValue` / `onEventClick`)
- edb785f: render BaseSelect and BaseMultiselect through the write-once BaseDropdown

  `BaseSelect` and `BaseMultiselect` now render their floating listbox through the
  write-once `BaseDropdown` (a `<Teleport>` panel anchored with CSS Anchor
  Positioning) instead of an in-place, absolutely-positioned list. The combobox is
  passed to the dropdown's `trigger` slot and the `<ul role="listbox">` becomes
  its default slot, with the open state synced via `onUpdateOpen`. Because the
  dropdown panel is mounted only while open, the listbox markup (`role="listbox"`)
  is present only when the control is open; the option labels remain available in
  the always-rendered hidden native `<select>`.

- edb785f: add token-driven `padding`/`margin` spacing props (named `2xs … 2xl` scale) to the layout primitives plus `BaseButton`/`BaseSeparator` (and outer `margin` to `BaseCard`), a responsive `minColumnWidth` auto-fit mode to `BaseGrid`, and a `lineHeight` prop to `BaseTypography`
- edb785f: build the Storyblok output alongside the Vue and React builds

  The package now also projects its neutral components onto Storyblok via
  `@mission-platform/vite-plugin-jsx`'s `generateStoryblokBloks`. Two new build
  modes (`storyblok-vue`, `storyblok-react`) emit the framework blok wrappers into
  `dist/storyblok/{vue,react}/` (exposed as the `./storyblok/react` and
  `./storyblok/vue` subpaths), and the framework-agnostic blok configuration JSON
  (`components.json` plus one `<component>.json` per component) is shipped under
  `./storyblok/components.json`. `@storyblok/react` and `@storyblok/vue` are added
  as optional peer dependencies.

- edb785f: animate `BaseToastContainer` with the neutral `<TransitionGroup name="base-toast">` primitive (matching the Vue SFC's `<TransitionGroup>`), adding the shared `base-toast-*` enter/leave/move transition classes
- edb785f: use the write-once icons-jsx components instead of text glyphs

  Components that previously substituted the `@mission-platform/icons` SFCs with
  text/CSS glyphs now render the write-once `@mission-platform/icons`
  components (compiled to React/Vue alongside each consumer). Replaced: the
  chevrons in `BaseSelect`, `BaseMultiselect`, `BaseAccordion`, `BaseCollapse`,
  `BaseCalendar`, and `BaseScheduler` (`IconChevron`); the close affordances in
  `BaseDialog`, `BaseModal`, `BaseDrawer`, `BaseTabs`, `BaseVirtualTabs`,
  `BaseAlertBanner`, `BaseToast`, and `BaseSearchInput` (`IconClose`); the add
  buttons in `BaseTabs`/`BaseVirtualTabs` (`IconPlus`); the calendar trigger in
  `BaseDateInput`/`BaseDateRangeInput`/`BaseDateTimeRangeInput` (`IconCalendar`,
  plus `IconGlobe` for the timezone toggle); the upload glyph in `BaseFileInput`
  (`IconUpload`); the stepper buttons in `BaseNumberStepper` (`IconMinus`/`IconPlus`);
  and the search glyph in `BaseSearchInput` (`IconSearch`). The CSS chevron-rotation
  classes were removed where the icon's own `direction` prop now handles it.

- edb785f: add a write-once JSX layer that renders on both Vue 3 and React

  Introduces `@mission-platform/jsx`, a tiny dependency-free runtime whose classic
  JSX factory (`h`) builds a framework-neutral element tree, plus `./react` and
  `./vue` adapters (`toReactComponent` / `toVueComponent`) that map that tree onto
  `React.createElement` or Vue's `h` at render time — a hand-rolled alternative to
  build-time compilers like Mitosis.

  Also adds `@mission-platform/components`, a reference consumer that authors
  `BaseBadge` and `BaseButton` once and ships them as both Vue 3 and React
  components via the `./react` and `./vue` subpath exports.

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

- edb785f: migrate the Components/Feedback group to write-once JSX

  Adds the complete `Components/Feedback` group, authored once in the neutral
  `@mission-platform/jsx` dialect and compiled straight to both React and Vue by
  `@mission-platform/vite-plugin-jsx`:

  - `BaseSkeleton` — loading placeholder (line/circle/block shapes, optional
    shimmer, width/height overrides).
  - `BaseSpinner` — indeterminate `role="status"` ring (tone/size + accessible
    label; the i18n default label becomes a plain `'Loading…'`).
  - `BaseStatusIcon` — toned status indicator (icon SVGs substituted with
    `✓`/`⚠`/`✕`/`ℹ`/`–` glyphs; level type exported as `StatusIconLevel`).
  - `BaseProgressBar` — determinate/indeterminate native `<progress>` track with
    an optional label row (composes `BaseTypography`).
  - `BaseAlertBanner` — controlled inline notification banner (`modelValue` +
    `onUpdateModelValue`/`onDismiss` callbacks, `iconContent`/`actions` content
    props, glyph icons, `display: contents` host for visibility toggling).
  - `BaseToast` — presentational toast item (`onDismiss` callback, `iconContent`
    content prop, glyph icon).

  Each ships its per-component folder (`.tsx`/`.module.scss`/`.stories.tsx`/
  `.spec.ts`/`index.ts`), categorised `JSX Components/Feedback/<Name>` stories, and
  cross-framework SSR parity specs. Vue-only features the neutral dialect cannot
  model (`@mission-platform/icons`, i18n, `v-model`/emits, named/`$slots`-presence
  slots) are substituted with the documented equivalents (text glyphs, callback
  props, content props); the `useToast` store / `BaseToastContainer` orchestration
  is out of scope.

- edb785f: Migrate the `Components/Forms` group (plus the `Components/Communication`
  `BaseChatBubble`) to write-once neutral JSX, compiling straight to both React and
  Vue: `BaseCheckbox`, `BaseRadio`, `BaseSwitch`, `BaseInput`, `BaseTextarea`,
  `BaseNumberStepper`, `BaseSlider`, `BaseOtpInput`, `BaseRating`,
  `BaseSearchInput`, `BaseFieldSet`, `BaseFileInput`, and `BaseChatBubble`. Each
  ships its per-folder `.tsx`/`.module.scss`/`.stories.tsx`/cross-framework
  `.spec.ts`/`index.ts` with `JSX Components/<Category>/<Name>` stories. Vue-only
  features the neutral dialect does not model are substituted with documented
  equivalents: the `useId` composable → a shared `nextFieldId` `useRef` helper
  (`field-id.ts`), `v-model`/emits → the controlled `modelValue` +
  `onUpdateModelValue`/`onChange`/… callback props, named slots → `MpChild` content
  props, `@mission-platform/icons` → text glyphs, `useI18n` labels → plain string
  props, `BaseSlider`'s pointer-drag thumb → a native `<input type="range">`, and
  `BaseOtpInput`'s Vue template ref-array → a single container ref +
  `querySelectorAll`.
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

- edb785f: migrate the Components/Media group to write-once cross-framework JSX

  The complete `Components/Media` group is now authored once in the neutral JSX
  dialect (`@mission-platform/jsx`) and compiled straight to both React and Vue by
  `@mission-platform/vite-plugin-jsx`:

  - `BaseResponsiveImage` — an art-directed, responsive `<picture>` (one `<source>`
    per `sources` entry plus a fallback `<img>`) with `srcset`/`sizes`, lazy
    loading, async decoding, a fixed `aspectRatio`, and `object-fit` control.
  - `BaseResponsiveVideo` — a responsive `<video>` with format-specific sources, a
    poster, native controls, and the usual playback flags.
  - `BaseBackgroundVideo` — a decorative full-bleed background `<video>` with
    optional foreground default-slot content and a scrim overlay, honouring
    `prefers-reduced-motion` via a reactive `matchMedia` query driven by the
    neutral hooks.

  Each ships its per-component folder (`.tsx`/`.module.scss`/`.stories.tsx`/
  `.spec.ts`/`index.ts`), categorised `JSX Components/Media/<Name>` stories, and a
  cross-framework SSR parity spec. The native `load`/`error`/`play`/`pause`/`ended`
  emits are exposed as `onLoad`/`onError`/`onPlay`/`onPause`/`onEnded` callback
  props, consistent with the existing migration conventions.

- edb785f: Migrate the `Components/Navigation` group to write-once neutral JSX, compiling
  straight to both React and Vue: `BasePagination`, `BaseSegmentControl`,
  `BaseBreadcrumb`, `BaseMenuItem`, `BaseTabs`, `BaseVirtualTabs`, `BaseMenu`,
  `BaseMenubar`, and `BaseNavbarItem`. Each ships its per-folder
  `.tsx`/`.module.scss`/`.stories.tsx`/cross-framework `.spec.ts`/`index.ts` with
  `JSX Components/Navigation/<Name>` stories. Vue-only features the neutral dialect
  does not model are substituted with documented equivalents: `v-model`/emits →
  controlled `modelValue` + callback props, `vue-router` `RouterLink` → `<a href>`,
  `@mission-platform/icons` → text glyphs, the multi-file tab/menu sub-component
  trees inlined, the `BaseDropdown` overlay → an inline absolutely-positioned
  dropdown, and the menu/menubar/navbar-item open state via `useState` + `useEffect`
  document listeners.
- edb785f: add the modal overlays

  - Migrate the **modal** `Components/Overlays` members `BaseDialog` and `BaseModal` from `@mission-platform/components` to the write-once neutral package. Both render a **native `<dialog>`** driven with `showModal()`/`close()` (top layer, `::backdrop` scrim, focus trap, `Escape`-to-close); `BaseModal` adds a `size` scale (mobile bottom sheet / centred on `sm`+), a body-scroll lock, and a `closeOnEsc` opt-out. The Vue `<Transition>` becomes a CSS `@starting-style` fade, the `header`/`footer` named slots become `MpChild` content props (composing `BaseIconButton`/`BaseTypography`), and `useZIndex`/`useRouterClose` are dropped.
  - Update the `Components/Overlays` stories to compose other components from the package (`Button` triggers, `Stack`/`Typography` bodies, `Button` footer actions) and refresh `llms.txt`.

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

- edb785f: migrate the remaining `Components/Data` components to write-once JSX

  Adds the last two `Components/Data` components, authored once in the neutral
  `@mission-platform/jsx` dialect and compiled straight to both React and Vue by
  `@mission-platform/vite-plugin-jsx`. This completes the `Components/Data` group.

  - `BaseVirtualTable` — a virtual-scrolling, sortable data table that windows the
    body rows beneath a sticky header, with click-to-sort columns (asc → desc →
    unsorted, firing `onSort`), `onRowClick`, an empty state, and a `footer` named
    slot. Like the original it uses ARIA `role="table"` divs (not native
    `<table>`) for cross-browser scroll behaviour; sort/scroll state uses the
    neutral hooks. The per-column scoped `cell-<key>` slots are replaced by each
    column's optional `render` formatter (consistent with the migrated
    `BaseTable`), the icons-package sort glyph becomes `▲`/`▼`/`↕`, and the
    `sort`/`rowClick` emits become `onSort`/`onRowClick` callback props.
  - `BaseTreeView` — a recursive, accessible tree that renders every visible node
    with a built-in expand/collapse label (overridable via the scoped `label`
    slot, scope `{ node, depth }`), keyboard navigation, and `onSelect`/`onToggle`
    callbacks. It flattens the expanded tree into a single list (the neutral
    dialect models no recursive components), substitutes a `▸`/`▾` glyph for the
    icons chevron, and uses callback props for the SFC's `select`/`toggle` emits.

  Each ships its per-component folder (`.tsx`/`.module.scss`/`.stories.tsx`/
  `.spec.ts`/`index.ts`), categorised `JSX Components/Data/<Name>` stories, and
  cross-framework SSR parity specs.

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

- edb785f: migrate the Tier-2 components from `@mission-platform/components` to the write-once neutral JSX package, compiling straight to both React and Vue

  Adds `BaseRadioGroup`, `BaseAccordion`, `BaseTimeline`, `BaseSelect`, `BaseMultiselect`, `BaseChatArea`, and `BaseCarousel`. Compound parent/child SFCs (`BaseAccordion`/`BaseAccordionItem`, `BaseTimeline`/`BaseTimelineItem`) and slot-introspecting components (`BaseCarousel`) are flattened into a single `items`/`slides`-array component (the `BaseTabs` approach), with `provide`/`inject` replaced by internal `useState`. `BaseSelect`/`BaseMultiselect` substitute the Teleport + floating-ui `BaseDropdown` with an in-place absolutely-positioned listbox toggled by `useState` (keeping the hidden native `<select>` for autofill), and `BaseChatArea` reproduces its `ResizeObserver` auto-scroll with a single `useEffect`.

- edb785f: Migrate the self-contained Tier 3 components to write-once neutral JSX,
  compiling straight to both React and Vue: `BaseQrCode` (`Data Display`),
  `BaseLocationInput` and `BaseCalendar` (`Forms`). Each ships its per-folder
  `.tsx`/`.module.scss`/`.stories.tsx`/cross-framework `.spec.ts`/`index.ts` with
  `JSX Components/<Category>/<Name>` stories. The framework-agnostic logic travels
  verbatim onto both builds via co-located helpers — `qr-encode.ts` (the
  dependency-free QR encoder) and `location.ts` (the DD/DM/DMS coordinate
  conversion) — and `BaseCalendar`'s month grid is driven by `luxon` (added as a
  dependency). Vue-only features the neutral dialect does not model are substituted
  with documented equivalents: `computed` → `useMemo`, `ref` → `useState`,
  `watch` → `useEffect`, `useId` → the shared `nextFieldId` `useRef` helper,
  `@mission-platform/icons` chevrons → text glyphs, and `v-model`/emits → the
  controlled `modelValue` + `onUpdateModelValue`/`onChange`/`onError` callback
  props. The remaining Tier 3/4 components stay Vue-only in
  `@mission-platform/components` because they need primitives the neutral dialect
  does not model (Teleport/`@floating-ui` overlays and floating date/time pickers)
  or heavy browser-only toolchains (`BaseMonacoEditor`, `BaseCodeBlock`,
  `BaseMarkdownInput`, `BaseFormBuilder`, `BaseScheduler`, and the form
  meta-components).
- 8d64a2b: improve light/dark theme handling (subtree scoping, pre-paint init, `<meta>` sync, store-backed toggle)

  - `useTheme` / `createThemeStore` gain a `scoped` mode: pass `scoped: true` with
    a `target` element (or assign it later via the new `setTarget(element)`) to
    apply `data-theme`/`color-scheme` to a single subtree element instead of
    `document.documentElement`. Because the tokens' `light-dark()` colours resolve
    against the _used_ `color-scheme`, this re-themes the element and its
    descendants without redefining any custom property — enabling nested providers
    / per-subtree themes. Reassigning or disposing the store cleans up the previous
    element.
  - The store now keeps a `<meta name="color-scheme">` in sync with the resolved
    preference (root mode only; opt out with `syncMeta: false`) so the user-agent
    chrome (scrollbars, form controls, address bar) tracks the active theme, and it
    re-applies on system (`prefers-color-scheme`) changes while in `'auto'`.
  - New `themeInitScript(options?)` export returns a tiny, self-contained snippet
    to inline as a blocking `<script>` in the document `<head>`; it pins
    `data-theme`/`color-scheme` from the persisted preference **before first
    paint**, eliminating the flash of the wrong colour scheme.
  - `BaseThemeProvider` gains a `global` prop (default `true`); set `:global="false"`
    to scope the theme to a rendered (`display: contents`) wrapper element (`as`,
    default `div`) for subtree / nested theming.
  - `BaseThemeToggle` is now backed by the shared `useTheme` store instead of
    hand-rolling its own `data-theme` manipulation, so toggling persists the
    preference, pins `color-scheme` + the `<meta>`, stays in sync with the system
    theme, and drives a `BaseThemeProvider`'s store (global or subtree-scoped) when
    rendered inside one.

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

### Patch Changes

- e1a9272: Drop the third-party `google-libphonenumber` dependency and power `BasePhoneInput`
  with the platform's own `@mission-platform/phone-number` (AssemblyScript/WebAssembly)
  package instead. The co-located `phone.ts` helper now parses, formats
  (national/E.164), validates per region, lists supported regions, provides example
  numbers and formats as-you-type through the synchronous `PhoneNumberUtil` instance,
  so behaviour is unchanged while the external dependency is removed.
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

- c99c4cc: resolve axe colour-contrast violations in the chat bubble and theme composer stories

  The pending chat bubble's `opacity` is raised so its composited text still clears
  WCAG AA (4.5:1), and the outgoing bubble now uses the theme-aware
  `--mp-color-text-on-primary` token. The `BaseThemeComposer` demo stories use
  AA-compliant primary colours.

- 338c7db: use the new motion, opacity and border-width tokens in base-button

  `BaseButton` now composes the new `--mp-duration-*`/`--mp-easing-*`, `--mp-opacity-disabled` and `--mp-border-width-*` design tokens instead of the inline `150ms ease`, `opacity: 0.5` and `1px`/`2px` literals. The rendered output is unchanged (the tokens resolve to the same values); this is the first showcase consumer of the new token groups.

- edb785f: fix drag-and-drop on the Vue build of the form builder and file input

  `BaseFormBuilder` authored its native HTML5 drag-and-drop with React-style camelCase listeners (`onDragOver`/`onDragStart`/`onDrop`), which the Vue build hyphenated into dead events — items could be dragged but never dropped. With the Vue emitter now lowercasing native multi-word DOM events, the form builder's palette/canvas/fieldset drops work on the Vue build. `BaseFileInput`'s hand-lowercased workaround (`onDragover`/`onDragleave`) is restored to the canonical React-style casing so its drop zone works on **both** the React and Vue builds.

- edb785f: fix the form builder rendering only its tab bar in the compiled build

  `BaseFormBuilder` passed its palette and inspector to `BaseVerticalLayout` as the `start`/`end` props and the active panel to `BaseTabs` as the `panel` prop. Those targets render through a neutral `<Slot>`, which the Vue Stage-1 compiler turns into a native `<slot>` (read from `useSlots()`), so content supplied as a **prop** from a compiled neutral parent was dropped — only the tab bar showed. `BaseTabs`/`BaseVirtualTabs` now invoke the `panel` render-prop directly (`properties.panel?.({ tab })`) so it stays a real prop on both frameworks, and `BaseFormBuilder` forwards the palette/inspector through `slot="start"`/`slot="end"` marker children (the supported way to fill a named slot). The palette, inspector, Editor/Steps/Preview/Schema panels, and the wizard are now all visible.

- edb785f: refactor `base-schema-form` and `base-form-builder` to consume the new shared `@mission-platform/forms-core` (their JSON Schema/Ajv/condition/builder logic now re-exports the shared implementation), keeping the public surface and existing specs unchanged
- 23c0463: split component stories into per-framework vue and react variants
- edb785f: Rebuild the date/time pickers (`BaseDateInput`, `BaseTimeInput`,
  `BaseDateRangeInput`, `BaseTimeRangeInput`, `BaseDateTimeRangeInput`) on top of
  the write-once `BaseDropdown` instead of each hand-rolling its own teleported,
  CSS-anchored popover. The trigger is now projected into `BaseDropdown`'s
  `trigger` slot and the calendar/time panel into its default slot, so the
  teleport, anchor positioning, and outside-click/`Escape` dismissal are owned by
  `BaseDropdown` (which already gets the `position-area` value right). This also
  fixes the pickers not opening, since the duplicated popover logic that anchored
  with an invalid `position-area` is gone.
- edb785f: refactor `base-scheduler` to consume the new shared `@mission-platform/scheduler-core` (its `use-scheduler` composable is now a thin Vue-reactive wrapper over the shared recurrence/range/event/layout helpers, and `types` re-exports the shared RFC 5545 model), keeping the public surface and existing specs unchanged
- 429d400: reduce theme composable complexity and add missing doc comments

  Splits the higher-complexity theme helpers into smaller documented functions
  (`createThemeStore`'s initial-theme resolution and `<meta name="color-scheme">`
  sync, plus `useThemeComposer`'s document apply step) and converts the
  non-interpolated init-script template literals to plain string literals. No
  runtime behaviour changes.

- 1c73a0e: improve accessibility and aria semantics across components
- bbc9903: fix `BaseFormBuilder` accessibility violations

  - The field drag handle is no longer `aria-hidden` while being focusable: it
    gets an `aria-label="Drag to reorder"` instead, so `@dnd-kit/vue`'s
    `role="button"` handle is exposed correctly (resolves axe `aria-hidden-focus`).
  - The canvas, wizard-step, and nested field-set dropzones now only carry
    `role="list"` when they actually contain field rows; an empty dropzone (which
    shows a drop-hint placeholder) drops the role, so it no longer violates axe
    `aria-required-children`, and the `role="listitem"` rows always have a
    `role="list"` parent (`aria-required-parent`).

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

- edb785f: match the `BaseMasonry` layout styles to the `@mission-platform/components` original

  `BaseMasonry` now owns its `.base-masonry` rules in the co-located CSS Module —
  the container box (`width` / `min-width`) and, crucially, the per-child
  break-safety (`break-inside: avoid; margin-bottom: var(--mp-masonry-gap)`)
  equivalent to the Vue component's `:slotted(*)` rule — while keeping the dynamic
  multi-column properties inline. Default-slot children are now kept break-safe out
  of the box on both the `./react` and `./vue` subpaths, exactly matching the
  original component instead of relying on consumers to add their own class.

- edb785f: fix the controlled-value round-trip in every story that binds a model value

  The components built by `@mission-platform/vite-plugin-jsx` expose their
  controlled value as an `onUpdate<Name>` callback prop, so the parent listener
  must be the camelised `@update-<name>` form. The stories were using the Vue
  `v-model` colon form (`@update:model-value`), which compiles to the
  `onUpdate:modelValue` vnode key and never reaches the generated callback prop —
  so the value was silently ignored. All controlled-component stories (the entire
  `Forms` category plus `BaseCarousel`, `BaseAlertBanner`, `BasePagination`,
  `BaseSegmentControl`, `BaseTabs`, and `BaseVirtualTabs`) now use the correct
  `@update-model-value` (and `BasePhoneInput`'s `@update-country`,
  `BaseFileInput`'s seeded `ref`) so the value actually round-trips in Storybook.

- edb785f: Consume the `@mission-platform/tokens` design tokens in `BaseMonacoEditor`:
  source the editor's `fontFamily` (mono) and `codeLensFontFamily` (sans) from the
  shared `font` tokens (and re-enable `fontLigatures`/`fontVariations`), reaching
  parity with the `@mission-platform/components` SFC. Adds `@mission-platform/tokens`
  as a runtime dependency.
- edb785f: add a reusable cross-framework SSR DOM parity test helper

  A new `src/test-utils/ssr-parity.ts` helper renders a write-once component on
  both the React and Vue `@mission-platform/jsx` adapters to static SSR markup,
  normalises framework-specific artefacts, and asserts the two outputs are the
  **same DOM** before the per-component assertions run. It is wired into the
  canonical `base-badge.spec.ts` as the pattern for the rest of the suite, and is
  excluded from the published build (test-only). This underpins the cross-framework
  parity verification tracked by the repo's parity matrix tooling.

- edb785f: restructure sample components into per-component folders

  Each sample component now lives in its own folder under `src/components/<name>/`
  with a consistent set of co-located files:
  `<name>.tsx` (the write-once component), `<name>.module.scss` (demo styling),
  `<name>.stories.tsx` (Storybook story), `<name>.spec.ts` (cross-framework SSR
  parity test) and `index.ts` (re-export). The public `./react` and `./vue`
  exports are unchanged; this is an internal source reorganisation. The Storybook
  stories that previously lived in `apps/storybook` now live next to each
  component and are globbed from the package.

- edb785f: scope the drawer and toast enter/leave transition styling (no more `:global`)

  `BaseDrawer` (slide/fade) and `BaseToastContainer` (stack) now drive their
  enter/leave transitions through the neutral `<Transition>`/`<TransitionGroup>`
  explicit class props, passing their styled phase classes from the co-located CSS
  Module (`styles[...]`). The transition rules are no longer declared with
  `:global(.<name>-…)`, so they are hashed on the React build and plain BEM on the
  Vue build exactly like every other class in the package — matching the `scoped`
  `<style>` of the original `@mission-platform/components` SFCs. The animations are
  unchanged on both frameworks.

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

- ca1d98b: reformat sources with updated prettier print width and import ordering
- d39b6fc: add per-workspace reference documentation and refresh llms.txt/README metadata
- 6551abb: reformat source files to match the shared prettier configuration
- 18bd49a: rename the Storybook top-level sections so the catalogue reflects the package split

  The cross-framework catalogue no longer prefixes its sections with `JSX`: the
  `JSX Components/<Category>/<Name>` stories are now `Components/<Category>/<Name>`
  and the `JSX Icons/<Category>/<Name>` stories are now `Icons/<Category>/<Name>`
  (both Vue and React Storybooks). The components extracted into their own packages
  get their own top-level Storybook section instead of nesting under `Components`:
  `@mission-platform/layouts` stories move to `Layouts/<Name>` and
  `@mission-platform/forms` stories move to `Forms/<Name>`.

- 4218ce5: generate one SCSS partial and TS module per token source, with barrels

  - The generated token output is now split per DTCG source: every
    `tokens/<file>.tokens.json` produces `src/generated/scss/_<file>.scss` (a
    self-contained partial with its `$`-variables, `--mp-*` custom properties, and
    `@property` registrations whose `initial-value`s resolve to the matching local
    `$`-variables) and `src/generated/ts/<file>.ts` (a single nested `as const`
    object). The aggregate `src/generated/_tokens.scss` (`@forward` barrel) and
    `src/generated/tokens.ts` (re-export barrel) replace the previous
    `_structural.scss`, `flat.ts`, and `tokens.css` artefacts.
  - **BREAKING:** the TypeScript API is now a flat set of per-source nested objects
    (`palette`, `size`, `font`, `typography`, `borderWidth`, `breakpoint`, `motion`,
    `opacity`, `radius`, `shadow`, `spacing`, `zIndex`, `themeLight`, `themeDark`),
    replacing the previous bespoke exports (`colors`, `spacing`, `fontFamilies`,
    `sizeIcons`, `radii`, `shadows`, …). The standalone `@mission-platform/tokens/css`
    bundle export is removed; consume the SCSS entry points instead.
  - `@mission-platform/components`, `@mission-platform/map`, and
    `@mission-platform/icons` are updated to the new token exports (`font.font.family`,
    `palette.color`, and `size.icon` respectively).

- 7534f50: migrate BaseTypography variants off the SCSS font mixins to design-token CSS custom properties

  Starts the staged retirement of the `@mission-platform/tokens` SCSS `mp-font-*`
  mixin layer: `BaseTypography` now composes each variant directly from the
  generated `--mp-font-*` / `--mp-line-height-*` / `--mp-letter-spacing-*` tokens
  (rendered output is unchanged).

- edb785f: increase the BaseTypography block spacing by two steps

  The per-variant `margin-bottom` in the `BaseTypography` stylesheet is bumped two
  spacing steps (`--mp-spacing-1` → `--mp-spacing-3`, `--mp-spacing-2` →
  `--mp-spacing-4`, `--mp-spacing-3` → `--mp-spacing-5`), giving headings and body
  copy more vertical breathing room. The `label`/`caption`/`code` variants (which
  have no block margin) are left untouched, and no design tokens are changed.

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

- edb785f: add vite plugin that compiles the neutral jsx components to react/vue at build time

  Introduces the `@mission-platform/vite-plugin-jsx` workspace, which compiles the
  framework-neutral `@mission-platform/jsx` components to React or Vue 3 at build
  time instead of wrapping them with the runtime `toReactComponent` /
  `toVueComponent` adapters.

  `@mission-platform/components` produces its `./react` and `./vue` subpaths by
  running one `vite build` per framework through this plugin, rather than the
  runtime adapters.

- Updated dependencies [4218ce5]
- Updated dependencies [eefe5d0]
- Updated dependencies [4218ce5]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [76ebb1f]
- Updated dependencies [13cfc7f]
- Updated dependencies [13cfc7f]
- Updated dependencies [13cfc7f]
- Updated dependencies [13cfc7f]
- Updated dependencies [0a5d7dd]
- Updated dependencies [edb785f]
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
- Updated dependencies [d37e102]
- Updated dependencies [ca1d98b]
- Updated dependencies [d39b6fc]
- Updated dependencies [9cdfef1]
- Updated dependencies [9cdfef1]
- Updated dependencies [4218ce5]
- Updated dependencies [edb785f]
- Updated dependencies [be8ab67]
- Updated dependencies [18bd49a]
- Updated dependencies [4218ce5]
- Updated dependencies [4218ce5]
- Updated dependencies [4218ce5]
- Updated dependencies [4218ce5]
- Updated dependencies [be8ab67]
- Updated dependencies [4218ce5]
- Updated dependencies [4218ce5]
- Updated dependencies [4218ce5]
- Updated dependencies [4218ce5]
- Updated dependencies [be8ab67]
- Updated dependencies [be8ab67]
- Updated dependencies [be8ab67]
- Updated dependencies [be8ab67]
  - @mission-platform/tokens@1.0.0
  - @mission-platform/forms-core@0.2.0
  - @mission-platform/scheduler-core@0.2.0
  - @mission-platform/harper@0.2.0
  - @mission-platform/hunspell@0.4.0
  - @mission-platform/icons@0.2.0
  - @mission-platform/jsx@0.2.0
  - @mission-platform/phone-number@0.3.0
