# @mission-platform/layout

A comprehensive layout system for Mission Platform applications, providing responsive grid systems, spacing utilities, and flexible container components that work seamlessly with the design token system.

## Overview

The `@mission-platform/layout` package provides a set of utility classes and Vue 3 components designed to create consistent, responsive layouts across all Mission Platform applications. It integrates tightly with the design tokens system for theming and responsiveness.

## Features

- **Responsive Grid System**: 12-column fluid grid with breakpoints from `@mission-platform/breakpoints`
- **Spacing Utilities**: Consistent margin and padding utilities based on spacing tokens
- **Container Components**: Pre-styled container components for content layout
- **Flexbox Utilities**: Flexible box layout utilities for modern web design
- **Responsive Design**: Built-in support for all Mission Platform breakpoints
- **Design Token Integration**: Automatic theming with light/dark mode support

## Installation

```bash
npm install @mission-platform/layout
# or
yarn add @mission-platform/layout
# or
pnpm add @mission-platform/layout
```

## Usage

### Basic Grid System

The layout system provides a 12-column grid with responsive classes:

```vue
<template>
  <div class="mp-grid">
    <!-- Full width on mobile, 6 columns on desktop -->
    <div class="mp-col mp-col-12@mobile mp-col-6@desktop">Left Column</div>

    <!-- Full width on mobile, 6 columns on desktop -->
    <div class="mp-col mp-col-12@mobile mp-col-6@desktop">Right Column</div>
  </div>
</template>
```

### Spacing Utilities

Use spacing utilities for consistent margins and padding:

```vue
<template>
  <div class="mp-mt-4 mp-mb-6 mp-p-4">Content with spacing</div>
</template>
```

### Container Components

The package provides Vue components for common layout patterns:

```vue
<script setup lang="ts">
  import { MpContainer, MpRow, MpCol } from '@mission-platform/layout';
</script>

<template>
  <MpContainer>
    <MpRow>
      <MpCol
        cols="12"
        cols-md="6"
      >
        Column Content
      </MpCol>
      <MpCol
        cols="12"
        cols-md="6"
      >
        Column Content
      </MpCol>
    </MpRow>
  </MpContainer>
</template>
```

## API Reference

### Grid Classes

#### Container Classes

- `mp-grid`: Creates a grid container with proper gutters
- `mp-grid-no-gutters`: Grid container without gutters

#### Column Classes

- `mp-col`: Base column class (required)
- `mp-col-{1-12}`: Column width (1-12 columns)
- `mp-col-{1-12}@{breakpoint}`: Responsive column widths

Available breakpoints: `mobile`, `tablet`, `desktop`, `large-desktop`

### Spacing Classes

#### Margin Utilities

- `mp-m-{1-8}`: Margin top, bottom, left, and right
- `mp-mt-{1-8}`: Margin top
- `mp-mb-{1-8}`: Margin bottom
- `mp-ml-{1-8}`: Margin left
- `mp-mr-{1-8}`: Margin right
- `mp-mx-{1-8}`: Margin left and right
- `mp-my-{1-8}`: Margin top and bottom

#### Padding Utilities

- `mp-p-{1-8}`: Padding on all sides
- `mp-pt-{1-8}`: Padding top
- `mp-pb-{1-8}`: Padding bottom
- `mp-pl-{1-8}`: Padding left
- `mp-pr-{1-8}`: Padding right
- `mp-px-{1-8}`: Padding left and right
- `mp-py-{1-8}`: Padding top and bottom

### Vue Components

#### `<MpContainer>`

A responsive container that centers content and provides horizontal padding.

**Props:**

- `fluid`: Boolean to disable max-width constraint (default: `false`)
- `maxWidth`: Custom maximum width (e.g., `'1400px'`)

#### `<MpRow>`

Creates a flex row for grid layout.

**Props:**

- `noGutters`: Boolean to remove gutters (default: `false`)
- `align`: Flex alignment (`'start'`, `'center'`, `'end'`, `'stretch'`)
- `justify`: Flex justification (`'start'`, `'center'`, `'end'`, `'between'`, `'around'`)

#### `<MpCol>`

Creates a responsive grid column.

**Props:**

- `cols`: Base number of columns (1-12)
- `cols-sm`: Columns at small breakpoint
- `cols-md`: Columns at medium breakpoint
- `cols-lg`: Columns at large breakpoint
- `cols-xl`: Columns at extra-large breakpoint
- `offset`: Column offset (0-11)
- `order`: Column ordering

## Responsive Design

The layout system uses the same breakpoints as `@mission-platform/breakpoints`:

```
mobile:    0px - 599px
sm:        600px - 959px
tablet:    600px - 959px (alias for sm)
desktop:   960px - 1279px
lg:        960px - 1279px (alias for desktop)
large-desktop: 1280px+
xlarge:    1280px+ (alias for large-desktop)
```

## Customization

### SCSS Variables

You can customize the grid system by overriding SCSS variables:

```scss
// In your main SCSS file
$mp-grid-max-widths: (
  sm: 600px,
  md: 960px,
  lg: 1280px,
  xl: 1440px,
);

$mp-grid-gutter-width: 1.5rem;
```

### JavaScript API

For programmatic control, you can use the layout utilities:

```ts
import { getBreakpoint } from '@mission-platform/layout';

// Get current breakpoint
const currentBreakpoint = getBreakpoint();

// Check if at specific breakpoint
if (isDesktop()) {
  // Desktop-specific logic
}
```

## Best Practices

1. **Mobile-First Approach**: Always define mobile styles first, then override for larger breakpoints
2. **Consistent Spacing**: Use the spacing utilities instead of hard-coded values
3. **Grid Nesting**: Avoid excessive grid nesting; prefer composition over complexity
4. **Responsive Testing**: Test layouts at all breakpoints to ensure proper responsiveness
5. **Accessibility**: Ensure sufficient color contrast and touch target sizes on mobile devices

## Migration Guide

### From Tailwind CSS

If migrating from Tailwind, the class names are similar but use `mp-` prefix:

```diff
- <div class="container mx-auto px-4">
+ <div class="mp-container mp-px-4">

- <div class="grid grid-cols-12 gap-4">
+ <div class="mp-grid">

- <div class="col-span-6 md:col-span-4">
+ <div class="mp-col mp-col-6@mobile mp-col-4@desktop">
```

### From Bootstrap

Bootstrap migration is straightforward:

```diff
- <div class="container">
+ <div class="mp-container">

- <div class="row">
+ <div class="mp-row">

- <div class="col-md-6">
+ <div class="mp-col mp-col-12@mobile mp-col-6@desktop">
```

## License

MIT
