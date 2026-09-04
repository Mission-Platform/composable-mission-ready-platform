# @mission-platform/components

`@mission-platform/components` is the residual write-once component library for the Mission Platform. Every component in
this library is authored once using a framework-neutral JSX dialect (via `@mission-platform/forge-jsx`) and then compiled at
build time into native **Vue 3**, **React**, **Svelte**, **Solid**, and **Web Component** outputs.

`ForgeTypography` is owned by the dedicated `@mission-platform/typography` package. Import it from that package rather
than from `@mission-platform/components`.

## Architecture: "Write Once, Run Anywhere"

This package demonstrates a high-efficiency cross-framework architecture:

- **Neutral Source**: Components are written in `.tsx` files using `@mission-platform/forge-jsx`.
- **Two-Stage Compilation**: Using `@mission-platform/vite-plugin-forge`, the neutral source is transformed into
  framework-specific source code (Vue SFCs and React TSX) and then compiled by the respective native toolchains.
- **Zero Runtime Overhead**: There are no runtime adapters. Consumers import native components with the bare
  `@mission-platform/components` specifier; the framework is chosen **once** through the `mp:<framework>` export
  condition — `resolve.conditions` (see `defineFrameworkAppConfig` / `frameworkResolveConditions` from
  `@mission-platform/vite-config`) and `customConditions` (via the
  `@mission-platform/typescript-config/framework-<name>` presets).
- **Storyblok Integration**: The build process also generates Storyblok blok configurations and wrappers, enabling
  CMS-driven layouts using these same components.

## Universal Size Scale

Every component in the library supports a `size` prop that follows a canonical t-shirt scale. This ensures consistent
scaling across all UI elements.

| Value | Label             |
| :---- | :---------------- |
| `2xs` | Extra-extra-small |
| `xs`  | Extra-small       |
| `sm`  | Small             |
| `md`  | Medium (Default)  |
| `lg`  | Large             |
| `xl`  | Extra-large       |
| `2xl` | Extra-extra-large |

Most components apply a shared sizing utility that adjusts the `font-size` based on design tokens. Some complex
components (like `ForgeButton` or `ForgeHero`) have bespoke per-size styling for padding, margins, and layout.

## Component Catalogue

### Layout & Structure

Primitives for arranging content on the page.

| Component        | Description                                               | Key Props                                            |
| :--------------- | :-------------------------------------------------------- | :--------------------------------------------------- |
| `ForgeStack`     | Flexbox stack (row/column) with configurable gap.         | `direction`, `gap` (`2xs-2xl`), `justify`, `align`   |
| `ForgeGrid`      | CSS Grid layout primitive.                                | `rows`, `cols`, `gap`, `justify`, `align`            |
| `ForgeSeparator` | Visual divider (horizontal/vertical) with optional label. | `orientation`, `variant` (`solid`/`dashed`/`dotted`) |
| `ForgeMasonry`   | Multi-column masonry layout.                              | `columns`, `minColumnWidth`, `gap`                   |

### Application Shell & Navigation

High-level components for app structure and routing.

| Component                    | Description                                                  | Key Props                                       |
| :--------------------------- | :----------------------------------------------------------- | :---------------------------------------------- |
| `ForgeNavbar`                | Responsive top navigation bar with brand and hamburger menu. | `brand`, `sticky`, `mobileTitle`                |
| `ForgeDrawer`                | Sliding panel (fixed or inline responsive).                  | `open`, `placement`, `size`, `inlineBreakpoint` |
| `ForgePagination`            | Controlled page-navigation control.                          | `modelValue`, `pageCount`/`total`, `pageSize`   |
| `ForgeTabs`                  | ARIA tablist with roving tabindex and panels.                | `tabs`, `modelValue`, `variant` (`line`/`pill`) |
| `ForgeMenu` / `ForgeMenubar` | Accessible recursive menus/menubar with submenus.            | `items`, `orientation`, `ariaLabel`             |
| `ForgeBreadcrumb`            | Hierarchical trail of links.                                 | `items`, `separator`                            |

### Typography & Content

Text-styling and semantic content blocks.

| Component    | Description                                                      | Key Props                               |
| :----------- | :--------------------------------------------------------------- | :-------------------------------------- |
| `ForgeHero`  | Page banner with title, subtitle, media background, and actions. | `title`, `subtitle`, `media`, `actions` |
| `ForgeQuote` | Semantic blockquote with attribution.                            | `variant`, `tone`, `author`, `source`   |
| `ForgeList`  | Generic list (ordered/unordered/description).                    | `items`, `variant`, `tone`, `divided`   |

### Forms & Inputs

Interactive elements for data entry.

| Component                                | Description                                          | Key Props                                    |
| :--------------------------------------- | :--------------------------------------------------- | :------------------------------------------- |
| `ForgeButton`                            | Foundational button with variants and loading state. | `variant`, `size`, `loading`, `disabled`     |
| `ForgeIconButton`                        | Compact icon-only button.                            | `label` (required), `variant`, `size`        |
| `ForgeInput` / `ForgeTextarea`           | Text fields with label, hint, and error states.      | `modelValue`, `type`, `placeholder`, `label` |
| `ForgeCheckbox` / `ForgeRadio`           | Boolean or group selection inputs.                   | `modelValue`, `value`, `label`               |
| `ForgeSwitch`                            | Toggle switch for boolean settings.                  | `modelValue`, `label`, `size`                |
| `ForgeNumberStepper`                     | Number input with increment/decrement buttons.       | `modelValue`, `min`/`max`, `precision`       |
| `ForgeSlider` / `ForgeRangeInput`        | Single or dual-thumb range selectors.                | `modelValue`, `min`/`max`, `step`            |
| `ForgeDateInput` / `ForgeDateRangeInput` | Date and date-range pickers with popover calendars.  | `modelValue`, `min`/`max`, `size`            |
| `ForgeColorInput`                        | Colour picker with hex text field.                   | `modelValue`, `size`, `label`                |

### Data Display & Virtualization

Components for handling large datasets efficiently.

| Component              | Description                                                 | Key Props                                     |
| :--------------------- | :---------------------------------------------------------- | :-------------------------------------------- |
| `ForgeTable`           | Sortable data table with loading and empty states.          | `columns`, `rows`, `onSort`, `loading`        |
| `ForgeVirtualList`     | Windowed list for large arrays (renders only visible rows). | `items`, `itemHeight`, `height`               |
| `ForgeVirtualTable`    | Virtualized sortable table with sticky header.              | `columns`, `rows`, `rowHeight`, `onSort`      |
| `ForgeVirtualTreeView` | Windowed tree view with expand/collapse logic.              | `nodes`, `itemHeight`, `onSelect`, `onToggle` |
| `ForgeTreeView`        | Recursive accessible tree (non-virtualized).                | `nodes`, `defaultOpen`, `onSelect`            |
| `ForgeTimeline`        | Vertical or horizontal event list.                          | `items`, `orientation`, `align`               |

### Feedback & Overlays

Notification and loading indicators.

| Component          | Description                                  | Key Props                                            |
| :----------------- | :------------------------------------------- | :--------------------------------------------------- |
| `ForgeSpinner`     | Indeterminate loading ring.                  | `size`, `variant`, `label`                           |
| `ForgeSkeleton`    | Shimmering placeholder for loading content.  | `shape` (`line`/`circle`/`block`), `width`, `height` |
| `ForgeProgressBar` | Determinate or indeterminate progress track. | `value`, `max`, `variant`, `indeterminate`           |
| `ForgeStatusIcon`  | Small toned status indicator glyph.          | `status`, `size`, `label`                            |

### Media

Handling images, video and the platform's look-and-feel.

| Component              | Description                                                   | Key Props                              |
| :--------------------- | :------------------------------------------------------------ | :------------------------------------- |
| `ForgeResponsiveImage` | Art-directed `<picture>` with native srcset/sizes.            | `src`, `sources`, `aspectRatio`, `fit` |
| `ForgeResponsiveVideo` | Responsive video player with fixed aspect ratio.              | `src`, `sources`, `poster`, `autoplay` |
| `ForgeBackgroundVideo` | Full-bleed background video with reduced-motion support.      | `src`, `overlay`, `minHeight`          |
| `ForgeDeviceMock`      | Device frame (mobile/tablet/desktop/browser) around a screen. | `device`, `orientation`, `url`, `size` |

## Implementation Details

### Slots vs Props

Due to the neutral JSX dialect, some components use **Named Slots** (compiled to React's children/props and Vue's named
slots) while others use **Scoped Render-Props** for high-performance virtualization.

### Theme Integration

Theme-related components are owned by `@mission-platform/theme`. Import `ForgeThemeToggle`, `ForgeThemeProvider`,
and `ForgeThemeComposer` from that package; its singleton stores manage `data-theme` attributes on the document root
and design-token CSS variables without requiring a global state provider in every app.

The complete residual inventory and the dependency-aware future package split are documented in
[the decomposition map](decomposition-map.md). `ForgeDrawer` and `ForgeWindowPopout` remain in this package pending
the separate overlay/window boundary decision described there.
