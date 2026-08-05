# @mission-platform/layouts

## 0.2.0

### Minor Changes

- 18bd49a: Add the write-once `BaseContainer` layout primitive (shipped to both Vue and React as `Container`). It
  constrains and centres page/section content on the inline axis through three layout options selected by `variant`: **
  `fixed`** (a constant `max-width` from the `sm … 2xl` scale that never changes with the viewport), **`fluid`** (always
  100% of the available width, no `max-width`), and **`responsive`** (a `max-width` that steps up at each platform
  breakpoint, mobile-first). The `fixed`/`fluid` widths plus the `gutter`/`center` controls are inline styles, while the
  `responsive` step-ups live in the co-located CSS Module (the platform breakpoints inlined as range-notation
  `min-width` media queries). Adds the matching Storybook stories (`Layouts/BaseContainer`) and a cross-framework parity
  spec.
- 18bd49a: extract the common layouts into a new `@mission-platform/layouts` package

  Adds the write-once `@mission-platform/layouts` package containing the common layout primitives —
  `BaseApplicationLayout` (public `ApplicationLayout`) and
  `BaseVerticalLayout` (public `VerticalLayout`) — authored once in the neutral
  `@mission-platform/forge` dialect and compiled straight to both Vue 3 (`./vue`)
  and React (`./react`) by the two-stage `@mission-platform/vite-plugin-forge`
  compiler, with co-located `JSX Components/Layout/<Name>` stories and cross-framework SSR specs.

  **BREAKING (`@mission-platform/components`):** `BaseApplicationLayout` /
  `ApplicationLayout` and `BaseVerticalLayout` / `VerticalLayout` are no longer exported from
  `@mission-platform/components` — import them from
  `@mission-platform/layouts/vue` (or `/react`) instead. `@mission-platform/components`
  gains a neutral `.` root export and a neutral `./base-drawer` subpath so the write-once layouts can reuse `BaseDrawer`
  across packages.

  `@mission-platform/vite-plugin-forge`'s two-stage compiler now remaps neutral imports of the framework-split component
  libraries (`@mission-platform/components`
  and `@mission-platform/layouts`, in addition to `@mission-platform/icons`) — from their root or a neutral subpath — to
  the matching built `./react` / `./vue`
  entry, so write-once components can compose components published by another package.

### Patch Changes

- e1a9272: Drop the third-party `google-libphonenumber` dependency and power `BasePhoneInput`
  with the platform's own `@mission-platform/phone-number` (AssemblyScript/WebAssembly)
  package instead. The co-located `phone.ts` helper now parses, formats (national/E.164), validates per region, lists
  supported regions, provides example numbers and formats as-you-type through the synchronous `PhoneNumberUtil`
  instance, so behaviour is unchanged while the external dependency is removed.
- 10b9e2a: reformat base-container spec SSR render calls onto single lines
- 18bd49a: Add a `src/examples/` Storybook catalogue of layout composition examples (`Layouts/Examples/<Category>`) that
  wire the `Container`, `ApplicationLayout`
  and `VerticalLayout` primitives into realistic page shells for common domains:
  forms, dashboards, configurations, admin, websites, mapping, and routing. The examples are Storybook-only and
  presentational (design-token inline styles, no real widgets), and the package `llms.txt` documents the new catalogue.
- ca1d98b: reformat sources with updated prettier print width and import ordering
- d39b6fc: add per-workspace reference documentation and refresh llms.txt/README metadata
- f681d82: rename storybook stories to the .vue.stories suffix for framework clarity
- 18bd49a: rename the Storybook top-level sections so the catalogue reflects the package split

  The cross-framework catalogue no longer prefixes its sections with `JSX`: the
  `JSX Components/<Category>/<Name>` stories are now `Components/<Category>/<Name>`
  and the `JSX Icons/<Category>/<Name>` stories are now `Icons/<Category>/<Name>`
  (both Vue and React Storybooks). The components extracted into their own packages get their own top-level Storybook
  section instead of nesting under `Components`:
  `@mission-platform/layouts` stories move to `Layouts/<Name>` and
  `@mission-platform/forms` stories move to `Forms/<Name>`.

- Updated dependencies [e1a9272]
- Updated dependencies [e1a9272]
- Updated dependencies [4218ce5]
- Updated dependencies [eefe5d0]
- Updated dependencies [c99c4cc]
- Updated dependencies [338c7db]
- Updated dependencies [fb5e319]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [7534f50]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [23c0463]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [429d400]
- Updated dependencies [1c73a0e]
- Updated dependencies [4218ce5]
- Updated dependencies [bbc9903]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [18bd49a]
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
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [94f9acf]
- Updated dependencies [edb785f]
- Updated dependencies [94f9acf]
- Updated dependencies [94f9acf]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [94f9acf]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [94f9acf]
- Updated dependencies [94f9acf]
- Updated dependencies [edb785f]
- Updated dependencies [18bd49a]
- Updated dependencies [d37e102]
- Updated dependencies [ca1d98b]
- Updated dependencies [d39b6fc]
- Updated dependencies [9cdfef1]
- Updated dependencies [9cdfef1]
- Updated dependencies [6551abb]
- Updated dependencies [4218ce5]
- Updated dependencies [edb785f]
- Updated dependencies [be8ab67]
- Updated dependencies [18bd49a]
- Updated dependencies [8d64a2b]
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
- Updated dependencies [7534f50]
- Updated dependencies [edb785f]
- Updated dependencies [be8ab67]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
  - @mission-platform/components@1.0.0
  - @mission-platform/tokens@1.0.0
  - @mission-platform/forms-core@0.2.0
  - @mission-platform/scheduler-core@0.2.0
  - @mission-platform/harper@0.2.0
  - @mission-platform/hunspell@0.4.0
  - @mission-platform/icons@0.2.0
  - @mission-platform/forge@0.2.0
  - @mission-platform/phone-number@0.3.0

## 0.2.0

### Minor Changes

- 18bd49a: Add the write-once `BaseContainer` layout primitive (shipped to both Vue and React as `Container`). It
  constrains and centres page/section content on the inline axis through three layout options selected by `variant`: **
  `fixed`** (a constant `max-width` from the `sm … 2xl` scale that never changes with the viewport), **`fluid`** (always
  100% of the available width, no `max-width`), and **`responsive`** (a `max-width` that steps up at each platform
  breakpoint, mobile-first). The `fixed`/`fluid` widths plus the `gutter`/`center` controls are inline styles, while the
  `responsive` step-ups live in the co-located CSS Module (the platform breakpoints inlined as range-notation
  `min-width` media queries). Adds the matching Storybook stories (`Layouts/BaseContainer`) and a cross-framework parity
  spec.
- 18bd49a: extract the common layouts into a new `@mission-platform/layouts` package

  Adds the write-once `@mission-platform/layouts` package containing the common layout primitives —
  `BaseApplicationLayout` (public `ApplicationLayout`) and
  `BaseVerticalLayout` (public `VerticalLayout`) — authored once in the neutral
  `@mission-platform/forge` dialect and compiled straight to both Vue 3 (`./vue`)
  and React (`./react`) by the two-stage `@mission-platform/vite-plugin-forge`
  compiler, with co-located `JSX Components/Layout/<Name>` stories and cross-framework SSR specs.

  **BREAKING (`@mission-platform/components`):** `BaseApplicationLayout` /
  `ApplicationLayout` and `BaseVerticalLayout` / `VerticalLayout` are no longer exported from
  `@mission-platform/components` — import them from
  `@mission-platform/layouts/vue` (or `/react`) instead. `@mission-platform/components`
  gains a neutral `.` root export and a neutral `./base-drawer` subpath so the write-once layouts can reuse `BaseDrawer`
  across packages.

  `@mission-platform/vite-plugin-forge`'s two-stage compiler now remaps neutral imports of the framework-split component
  libraries (`@mission-platform/components`
  and `@mission-platform/layouts`, in addition to `@mission-platform/icons`) — from their root or a neutral subpath — to
  the matching built `./react` / `./vue`
  entry, so write-once components can compose components published by another package.

### Patch Changes

- e1a9272: Drop the third-party `google-libphonenumber` dependency and power `BasePhoneInput`
  with the platform's own `@mission-platform/phone-number` (AssemblyScript/WebAssembly)
  package instead. The co-located `phone.ts` helper now parses, formats (national/E.164), validates per region, lists
  supported regions, provides example numbers and formats as-you-type through the synchronous `PhoneNumberUtil`
  instance, so behaviour is unchanged while the external dependency is removed.
- 10b9e2a: reformat base-container spec SSR render calls onto single lines
- 18bd49a: Add a `src/examples/` Storybook catalogue of layout composition examples (`Layouts/Examples/<Category>`) that
  wire the `Container`, `ApplicationLayout`
  and `VerticalLayout` primitives into realistic page shells for common domains:
  forms, dashboards, configurations, admin, websites, mapping, and routing. The examples are Storybook-only and
  presentational (design-token inline styles, no real widgets), and the package `llms.txt` documents the new catalogue.
- ca1d98b: reformat sources with updated prettier print width and import ordering
- d39b6fc: add per-workspace reference documentation and refresh llms.txt/README metadata
- f681d82: rename storybook stories to the .vue.stories suffix for framework clarity
- 18bd49a: rename the Storybook top-level sections so the catalogue reflects the package split

  The cross-framework catalogue no longer prefixes its sections with `JSX`: the
  `JSX Components/<Category>/<Name>` stories are now `Components/<Category>/<Name>`
  and the `JSX Icons/<Category>/<Name>` stories are now `Icons/<Category>/<Name>`
  (both Vue and React Storybooks). The components extracted into their own packages get their own top-level Storybook
  section instead of nesting under `Components`:
  `@mission-platform/layouts` stories move to `Layouts/<Name>` and
  `@mission-platform/forms` stories move to `Forms/<Name>`.

- Updated dependencies [e1a9272]
- Updated dependencies [e1a9272]
- Updated dependencies [4218ce5]
- Updated dependencies [eefe5d0]
- Updated dependencies [c99c4cc]
- Updated dependencies [338c7db]
- Updated dependencies [fb5e319]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [7534f50]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [23c0463]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [429d400]
- Updated dependencies [1c73a0e]
- Updated dependencies [4218ce5]
- Updated dependencies [bbc9903]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [18bd49a]
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
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [94f9acf]
- Updated dependencies [edb785f]
- Updated dependencies [94f9acf]
- Updated dependencies [94f9acf]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [94f9acf]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [94f9acf]
- Updated dependencies [94f9acf]
- Updated dependencies [edb785f]
- Updated dependencies [18bd49a]
- Updated dependencies [d37e102]
- Updated dependencies [ca1d98b]
- Updated dependencies [d39b6fc]
- Updated dependencies [9cdfef1]
- Updated dependencies [9cdfef1]
- Updated dependencies [6551abb]
- Updated dependencies [4218ce5]
- Updated dependencies [edb785f]
- Updated dependencies [be8ab67]
- Updated dependencies [18bd49a]
- Updated dependencies [8d64a2b]
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
- Updated dependencies [7534f50]
- Updated dependencies [edb785f]
- Updated dependencies [be8ab67]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
  - @mission-platform/components@1.0.0
  - @mission-platform/tokens@1.0.0
  - @mission-platform/forms-core@0.2.0
  - @mission-platform/scheduler-core@0.2.0
  - @mission-platform/harper@0.2.0
  - @mission-platform/hunspell@0.4.0
  - @mission-platform/icons@0.2.0
  - @mission-platform/forge@0.2.0
  - @mission-platform/phone-number@0.3.0

## 0.2.0

### Minor Changes

- 18bd49a: Add the write-once `BaseContainer` layout primitive (shipped to both Vue and React as `Container`). It
  constrains and centres page/section content on the inline axis through three layout options selected by `variant`: **
  `fixed`** (a constant `max-width` from the `sm … 2xl` scale that never changes with the viewport), **`fluid`** (always
  100% of the available width, no `max-width`), and **`responsive`** (a `max-width` that steps up at each platform
  breakpoint, mobile-first). The `fixed`/`fluid` widths plus the `gutter`/`center` controls are inline styles, while the
  `responsive` step-ups live in the co-located CSS Module (the platform breakpoints inlined as range-notation
  `min-width` media queries). Adds the matching Storybook stories (`Layouts/BaseContainer`) and a cross-framework parity
  spec.
- 18bd49a: extract the common layouts into a new `@mission-platform/layouts` package

  Adds the write-once `@mission-platform/layouts` package containing the common layout primitives —
  `BaseApplicationLayout` (public `ApplicationLayout`) and
  `BaseVerticalLayout` (public `VerticalLayout`) — authored once in the neutral
  `@mission-platform/forge` dialect and compiled straight to both Vue 3 (`./vue`)
  and React (`./react`) by the two-stage `@mission-platform/vite-plugin-forge`
  compiler, with co-located `JSX Components/Layout/<Name>` stories and cross-framework SSR specs.

  **BREAKING (`@mission-platform/components`):** `BaseApplicationLayout` /
  `ApplicationLayout` and `BaseVerticalLayout` / `VerticalLayout` are no longer exported from
  `@mission-platform/components` — import them from
  `@mission-platform/layouts/vue` (or `/react`) instead. `@mission-platform/components`
  gains a neutral `.` root export and a neutral `./base-drawer` subpath so the write-once layouts can reuse `BaseDrawer`
  across packages.

  `@mission-platform/vite-plugin-forge`'s two-stage compiler now remaps neutral imports of the framework-split component
  libraries (`@mission-platform/components`
  and `@mission-platform/layouts`, in addition to `@mission-platform/icons`) — from their root or a neutral subpath — to
  the matching built `./react` / `./vue`
  entry, so write-once components can compose components published by another package.

### Patch Changes

- e1a9272: Drop the third-party `google-libphonenumber` dependency and power `BasePhoneInput`
  with the platform's own `@mission-platform/phone-number` (AssemblyScript/WebAssembly)
  package instead. The co-located `phone.ts` helper now parses, formats (national/E.164), validates per region, lists
  supported regions, provides example numbers and formats as-you-type through the synchronous `PhoneNumberUtil`
  instance, so behaviour is unchanged while the external dependency is removed.
- 10b9e2a: reformat base-container spec SSR render calls onto single lines
- 18bd49a: Add a `src/examples/` Storybook catalogue of layout composition examples (`Layouts/Examples/<Category>`) that
  wire the `Container`, `ApplicationLayout`
  and `VerticalLayout` primitives into realistic page shells for common domains:
  forms, dashboards, configurations, admin, websites, mapping, and routing. The examples are Storybook-only and
  presentational (design-token inline styles, no real widgets), and the package `llms.txt` documents the new catalogue.
- ca1d98b: reformat sources with updated prettier print width and import ordering
- d39b6fc: add per-workspace reference documentation and refresh llms.txt/README metadata
- f681d82: rename storybook stories to the .vue.stories suffix for framework clarity
- 18bd49a: rename the Storybook top-level sections so the catalogue reflects the package split

  The cross-framework catalogue no longer prefixes its sections with `JSX`: the
  `JSX Components/<Category>/<Name>` stories are now `Components/<Category>/<Name>`
  and the `JSX Icons/<Category>/<Name>` stories are now `Icons/<Category>/<Name>`
  (both Vue and React Storybooks). The components extracted into their own packages get their own top-level Storybook
  section instead of nesting under `Components`:
  `@mission-platform/layouts` stories move to `Layouts/<Name>` and
  `@mission-platform/forms` stories move to `Forms/<Name>`.

- Updated dependencies [e1a9272]
- Updated dependencies [e1a9272]
- Updated dependencies [4218ce5]
- Updated dependencies [eefe5d0]
- Updated dependencies [c99c4cc]
- Updated dependencies [338c7db]
- Updated dependencies [fb5e319]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [7534f50]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [23c0463]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [429d400]
- Updated dependencies [1c73a0e]
- Updated dependencies [4218ce5]
- Updated dependencies [bbc9903]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [18bd49a]
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
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [94f9acf]
- Updated dependencies [edb785f]
- Updated dependencies [94f9acf]
- Updated dependencies [94f9acf]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [94f9acf]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [94f9acf]
- Updated dependencies [94f9acf]
- Updated dependencies [edb785f]
- Updated dependencies [18bd49a]
- Updated dependencies [d37e102]
- Updated dependencies [ca1d98b]
- Updated dependencies [d39b6fc]
- Updated dependencies [9cdfef1]
- Updated dependencies [9cdfef1]
- Updated dependencies [6551abb]
- Updated dependencies [4218ce5]
- Updated dependencies [edb785f]
- Updated dependencies [be8ab67]
- Updated dependencies [18bd49a]
- Updated dependencies [8d64a2b]
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
- Updated dependencies [7534f50]
- Updated dependencies [edb785f]
- Updated dependencies [be8ab67]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
  - @mission-platform/components@1.0.0
  - @mission-platform/tokens@1.0.0
  - @mission-platform/forms-core@0.2.0
  - @mission-platform/scheduler-core@0.2.0
  - @mission-platform/harper@0.2.0
  - @mission-platform/hunspell@0.4.0
  - @mission-platform/icons@0.2.0
  - @mission-platform/forge@0.2.0
  - @mission-platform/phone-number@0.3.0

## 0.2.0

### Minor Changes

- 18bd49a: Add the write-once `BaseContainer` layout primitive (shipped to both Vue and React as `Container`). It
  constrains and centres page/section content on the inline axis through three layout options selected by `variant`: **
  `fixed`** (a constant `max-width` from the `sm … 2xl` scale that never changes with the viewport), **`fluid`** (always
  100% of the available width, no `max-width`), and **`responsive`** (a `max-width` that steps up at each platform
  breakpoint, mobile-first). The `fixed`/`fluid` widths plus the `gutter`/`center` controls are inline styles, while the
  `responsive` step-ups live in the co-located CSS Module (the platform breakpoints inlined as range-notation
  `min-width` media queries). Adds the matching Storybook stories (`Layouts/BaseContainer`) and a cross-framework parity
  spec.
- 18bd49a: extract the common layouts into a new `@mission-platform/layouts` package

  Adds the write-once `@mission-platform/layouts` package containing the common layout primitives —
  `BaseApplicationLayout` (public `ApplicationLayout`) and
  `BaseVerticalLayout` (public `VerticalLayout`) — authored once in the neutral
  `@mission-platform/forge` dialect and compiled straight to both Vue 3 (`./vue`)
  and React (`./react`) by the two-stage `@mission-platform/vite-plugin-forge`
  compiler, with co-located `JSX Components/Layout/<Name>` stories and cross-framework SSR specs.

  **BREAKING (`@mission-platform/components`):** `BaseApplicationLayout` /
  `ApplicationLayout` and `BaseVerticalLayout` / `VerticalLayout` are no longer exported from
  `@mission-platform/components` — import them from
  `@mission-platform/layouts/vue` (or `/react`) instead. `@mission-platform/components`
  gains a neutral `.` root export and a neutral `./base-drawer` subpath so the write-once layouts can reuse `BaseDrawer`
  across packages.

  `@mission-platform/vite-plugin-forge`'s two-stage compiler now remaps neutral imports of the framework-split component
  libraries (`@mission-platform/components`
  and `@mission-platform/layouts`, in addition to `@mission-platform/icons`) — from their root or a neutral subpath — to
  the matching built `./react` / `./vue`
  entry, so write-once components can compose components published by another package.

### Patch Changes

- e1a9272: Drop the third-party `google-libphonenumber` dependency and power `BasePhoneInput`
  with the platform's own `@mission-platform/phone-number` (AssemblyScript/WebAssembly)
  package instead. The co-located `phone.ts` helper now parses, formats (national/E.164), validates per region, lists
  supported regions, provides example numbers and formats as-you-type through the synchronous `PhoneNumberUtil`
  instance, so behaviour is unchanged while the external dependency is removed.
- 10b9e2a: reformat base-container spec SSR render calls onto single lines
- 18bd49a: Add a `src/examples/` Storybook catalogue of layout composition examples (`Layouts/Examples/<Category>`) that
  wire the `Container`, `ApplicationLayout`
  and `VerticalLayout` primitives into realistic page shells for common domains:
  forms, dashboards, configurations, admin, websites, mapping, and routing. The examples are Storybook-only and
  presentational (design-token inline styles, no real widgets), and the package `llms.txt` documents the new catalogue.
- ca1d98b: reformat sources with updated prettier print width and import ordering
- d39b6fc: add per-workspace reference documentation and refresh llms.txt/README metadata
- f681d82: rename storybook stories to the .vue.stories suffix for framework clarity
- 18bd49a: rename the Storybook top-level sections so the catalogue reflects the package split

  The cross-framework catalogue no longer prefixes its sections with `JSX`: the
  `JSX Components/<Category>/<Name>` stories are now `Components/<Category>/<Name>`
  and the `JSX Icons/<Category>/<Name>` stories are now `Icons/<Category>/<Name>`
  (both Vue and React Storybooks). The components extracted into their own packages get their own top-level Storybook
  section instead of nesting under `Components`:
  `@mission-platform/layouts` stories move to `Layouts/<Name>` and
  `@mission-platform/forms` stories move to `Forms/<Name>`.

- Updated dependencies [e1a9272]
- Updated dependencies [e1a9272]
- Updated dependencies [4218ce5]
- Updated dependencies [eefe5d0]
- Updated dependencies [c99c4cc]
- Updated dependencies [338c7db]
- Updated dependencies [fb5e319]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [7534f50]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [23c0463]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [429d400]
- Updated dependencies [1c73a0e]
- Updated dependencies [4218ce5]
- Updated dependencies [bbc9903]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [18bd49a]
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
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [94f9acf]
- Updated dependencies [edb785f]
- Updated dependencies [94f9acf]
- Updated dependencies [94f9acf]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [94f9acf]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [94f9acf]
- Updated dependencies [94f9acf]
- Updated dependencies [edb785f]
- Updated dependencies [18bd49a]
- Updated dependencies [d37e102]
- Updated dependencies [ca1d98b]
- Updated dependencies [d39b6fc]
- Updated dependencies [9cdfef1]
- Updated dependencies [9cdfef1]
- Updated dependencies [6551abb]
- Updated dependencies [4218ce5]
- Updated dependencies [edb785f]
- Updated dependencies [be8ab67]
- Updated dependencies [18bd49a]
- Updated dependencies [8d64a2b]
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
- Updated dependencies [7534f50]
- Updated dependencies [edb785f]
- Updated dependencies [be8ab67]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
- Updated dependencies [edb785f]
  - @mission-platform/components@1.0.0
  - @mission-platform/tokens@1.0.0
  - @mission-platform/forms-core@0.2.0
  - @mission-platform/scheduler-core@0.2.0
  - @mission-platform/harper@0.2.0
  - @mission-platform/hunspell@0.4.0
  - @mission-platform/icons@0.2.0
  - @mission-platform/forge@0.2.0
  - @mission-platform/phone-number@0.3.0
