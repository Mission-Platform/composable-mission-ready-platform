# @mission-platform/components

`@mission-platform/components` is the core write-once component library for the Mission Platform. Every component in
this library is authored once using a framework-neutral JSX dialect (via `@mission-platform/forge`) and then compiled at
build time into native **Vue 3** and **React** components.

## Architecture: "Write Once, Run Anywhere"

This package demonstrates a high-efficiency cross-framework architecture:

- **Neutral Source**: Components are written in `.tsx` files using `@mission-platform/forge`.
- **Two-Stage Compilation**: Using `@mission-platform/vite-plugin-forge`, the neutral source is transformed into
  framework-specific source code (Vue SFCs and React TSX) and then compiled by the respective native toolchains.
- **Zero Runtime Overhead**: There are no runtime adapters; consumers import native components from the `./vue` or
  `./react` subpaths.
- **Storyblok Integration**: The build process also generates Storyblok blok configurations and wrappers, enabling
  CMS-driven layouts using these same components.

## Universal Size Scale

Every component in the library supports a `size` prop that follows a canonical t-shirt scale. This ensures consistent
scaling across all UI elements.

| Value | Label             |
|:------|:------------------|
| `2xs` | Extra-extra-small |
| `xs`  | Extra-small       |
| `sm`  | Small             |
| `md`  | Medium (Default)  |
| `lg`  | Large             |
| `xl`  | Extra-large       |
| `2xl` | Extra-extra-large |

Most components apply a shared sizing utility that adjusts the `font-size` based on design tokens. Some complex
components (like `BaseButton` or `BaseHero`) have bespoke per-size styling for padding, margins, and layout.

## Component Catalogue

### Layout & Structure

Primitives for arranging content on the page.

| Component       | Description                                               | Key Props                                            |
|:----------------|:----------------------------------------------------------|:-----------------------------------------------------|
| `BaseStack`     | Flexbox stack (row/column) with configurable gap.         | `direction`, `gap` (`2xs-2xl`), `justify`, `align`   |
| `BaseGrid`      | CSS Grid layout primitive.                                | `rows`, `cols`, `gap`, `justify`, `align`            |
| `BaseSeparator` | Visual divider (horizontal/vertical) with optional label. | `orientation`, `variant` (`solid`/`dashed`/`dotted`) |
| `BaseMasonry`   | Multi-column masonry layout.                              | `columns`, `minColumnWidth`, `gap`                   |

### Application Shell & Navigation

High-level components for app structure and routing.

| Component                  | Description                                                      | Key Props                                       |
|:---------------------------|:-----------------------------------------------------------------|:------------------------------------------------|
| `BaseApplicationLayout`    | Top-level shell with status banner, navbar, content, and footer. | `statusLevel`, `stickyHeader`                   |
| `BaseNavbar`               | Responsive top navigation bar with brand and hamburger menu.     | `brand`, `sticky`, `mobileTitle`                |
| `BaseDrawer`               | Sliding panel (fixed or inline responsive).                      | `open`, `placement`, `size`, `inlineBreakpoint` |
| `BasePagination`           | Controlled page-navigation control.                              | `modelValue`, `pageCount`/`total`, `pageSize`   |
| `BaseTabs`                 | ARIA tablist with roving tabindex and panels.                    | `tabs`, `modelValue`, `variant` (`line`/`pill`) |
| `BaseMenu` / `BaseMenubar` | Accessible recursive menus/menubar with submenus.                | `items`, `orientation`, `ariaLabel`             |
| `BaseBreadcrumb`           | Hierarchical trail of links.                                     | `items`, `separator`                            |

### Typography & Content

Text-styling and semantic content blocks.

| Component        | Description                                                      | Key Props                                      |
|:-----------------|:-----------------------------------------------------------------|:-----------------------------------------------|
| `BaseTypography` | The primary text primitive for all styles (h1-h6, body, etc.).   | `variant`, `as`, `weight`, `color`, `truncate` |
| `BaseHero`       | Page banner with title, subtitle, media background, and actions. | `title`, `subtitle`, `media`, `actions`        |
| `BaseQuote`      | Semantic blockquote with attribution.                            | `variant`, `tone`, `author`, `source`          |
| `BaseList`       | Generic list (ordered/unordered/description).                    | `items`, `variant`, `tone`, `divided`          |

### Forms & Inputs

Interactive elements for data entry.

| Component                              | Description                                          | Key Props                                    |
|:---------------------------------------|:-----------------------------------------------------|:---------------------------------------------|
| `BaseButton`                           | Foundational button with variants and loading state. | `variant`, `size`, `loading`, `disabled`     |
| `BaseIconButton`                       | Compact icon-only button.                            | `label` (required), `variant`, `size`        |
| `BaseInput` / `BaseTextarea`           | Text fields with label, hint, and error states.      | `modelValue`, `type`, `placeholder`, `label` |
| `BaseCheckbox` / `BaseRadio`           | Boolean or group selection inputs.                   | `modelValue`, `value`, `label`               |
| `BaseSwitch`                           | Toggle switch for boolean settings.                  | `modelValue`, `label`, `size`                |
| `BaseNumberStepper`                    | Number input with increment/decrement buttons.       | `modelValue`, `min`/`max`, `precision`       |
| `BaseSlider` / `BaseRangeInput`        | Single or dual-thumb range selectors.                | `modelValue`, `min`/`max`, `step`            |
| `BaseDateInput` / `BaseDateRangeInput` | Date and date-range pickers with popover calendars.  | `modelValue`, `min`/`max`, `size`            |
| `BaseColorInput`                       | Colour picker with hex text field.                   | `modelValue`, `size`, `label`                |

### Data Display & Virtualization

Components for handling large datasets efficiently.

| Component             | Description                                                 | Key Props                                     |
|:----------------------|:------------------------------------------------------------|:----------------------------------------------|
| `BaseTable`           | Sortable data table with loading and empty states.          | `columns`, `rows`, `onSort`, `loading`        |
| `BaseVirtualList`     | Windowed list for large arrays (renders only visible rows). | `items`, `itemHeight`, `height`               |
| `BaseVirtualTable`    | Virtualized sortable table with sticky header.              | `columns`, `rows`, `rowHeight`, `onSort`      |
| `BaseVirtualTreeView` | Windowed tree view with expand/collapse logic.              | `nodes`, `itemHeight`, `onSelect`, `onToggle` |
| `BaseTreeView`        | Recursive accessible tree (non-virtualized).                | `nodes`, `defaultOpen`, `onSelect`            |
| `BaseTimeline`        | Vertical or horizontal event list.                          | `items`, `orientation`, `align`               |

### Feedback & Overlays

Notification and loading indicators.

| Component         | Description                                         | Key Props                                            |
|:------------------|:----------------------------------------------------|:-----------------------------------------------------|
| `BaseAlertBanner` | Controlled notification banner with intent tones.   | `modelValue`, `variant`, `title`, `dismissible`      |
| `BaseToast`       | Presentational toast item for short-lived messages. | `variant`, `title`, `message`, `onDismiss`           |
| `BaseSpinner`     | Indeterminate loading ring.                         | `size`, `variant`, `label`                           |
| `BaseSkeleton`    | Shimmering placeholder for loading content.         | `shape` (`line`/`circle`/`block`), `width`, `height` |
| `BaseProgressBar` | Determinate or indeterminate progress track.        | `value`, `max`, `variant`, `indeterminate`           |
| `BaseStatusIcon`  | Small toned status indicator glyph.                 | `status`, `size`, `label`                            |

### Media & Theme

Handling images, video and the platform's look-and-feel.

| Component             | Description                                                   | Key Props                                    |
|:----------------------|:--------------------------------------------------------------|:---------------------------------------------|
| `BaseResponsiveImage` | Art-directed `<picture>` with native srcset/sizes.            | `src`, `sources`, `aspectRatio`, `fit`       |
| `BaseResponsiveVideo` | Responsive video player with fixed aspect ratio.              | `src`, `sources`, `poster`, `autoplay`       |
| `BaseBackgroundVideo` | Full-bleed background video with reduced-motion support.      | `src`, `overlay`, `minHeight`                |
| `BaseDeviceMock`      | Device frame (mobile/tablet/desktop/browser) around a screen. | `device`, `orientation`, `url`, `size`       |
| `BaseThemeToggle`     | Button to cycle light/dark/auto themes via shared store.      | `ariaLabel`, `onChange`                      |
| `BaseThemeProvider`   | Configures and exposes the global theme state.                | `defaultTheme`, `persist`, `storageKey`      |
| `BaseThemeComposer`   | Controlled editor for design-token overrides.                 | `modelValue`, `global`, `onUpdateModelValue` |

## Implementation Details

### Slots vs Props

Due to the neutral JSX dialect, some components use **Named Slots** (compiled to React's children/props and Vue's named
slots) while others use **Scoped Render-Props** for high-performance virtualization.

### Theme Integration

Theme-related components (`BaseThemeToggle`, etc.) interact with a singleton theme store that manages `data-theme`
attributes on the document root, ensuring instant updates across the entire application without needing a global state
provider in every app.
