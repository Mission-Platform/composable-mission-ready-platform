# @mission-platform/breakpoints

`@mission-platform/breakpoints` provides responsive breakpoint utilities, composables, and Vue components to handle viewport-based logic in a consistent way across the Mission Platform.

## Breakpoint Scale

The platform uses a seven-step responsive scale based on viewport width thresholds:

| Key   | Label             | Threshold     | Common Device / Use Case        |
| :---- | :---------------- | :------------ | :------------------------------ |
| `2xs` | Extra-extra-small | $\ge 0$ px    | All devices                     |
| `xs`  | Extra-small       | $\ge 480$ px  | Large phones                    |
| `sm`  | Small             | $\ge 768$ px  | Tablet portrait                 |
| `md`  | Medium            | $\ge 1024$ px | Tablet landscape / small laptop |
| `lg`  | Large             | $\ge 1920$ px | Full HD / 1080p                 |
| `xl`  | Extra-large       | $\ge 2560$ px | QHD                             |
| `2xl` | Extra-extra-large | $\ge 3840$ px | 4K UHD                          |

## Composables

### `useBreakpoints()`

A reactive composable that tracks the current viewport breakpoint using native `matchMedia` listeners.

#### Usage

```ts
import { useBreakpoints } from '@mission-platform/breakpoints';

const { current, active, isAbove, isBelow, isOnly } = useBreakpoints();

// Examples:
const isDesktop = computed(() => isAbove('lg'));
const isMobileOnly = computed(() => isOnly('sm'));
console.log(active.value.md); // true when viewport ≥ 1024px
```

#### API Reference

- `current`: A reactive value containing the currently active breakpoint key (e.g., `'md'`).
- `active`: A reactive map `{ [key]: boolean }` where each key is a breakpoint and its value indicates if that threshold is met.
- `isAbove(breakpoint)`: Returns `true` when the viewport is at or above the specified breakpoint.
- `isBelow(breakpoint)`: Returns `true` when the viewport is strictly below the specified breakpoint.
- `isOnly(breakpoint)`: Returns `true` only when the viewport falls exactly within the band of the specified breakpoint.

## Components

### `<ShowAt>`

Conditionally renders slot content when the viewport meets specified breakpoint criteria.

#### Usage

```vue
<template>
  <!-- Visible on medium screens and above -->
  <ShowAt min="md">
    <p>This is visible on medium screens and above</p>
  </ShowAt>

  <!-- Visible only on small and medium screens -->
  <ShowAt
    min="sm"
    max="lg"
  >
    <p>This is visible only on small and medium screens</p>
  </ShowAt>
</template>

<script setup lang="ts">
  import ShowAt from '@mission-platform/breakpoints/components/show-at.vue';
</script>
```

#### Props

- `min?: BreakpointKey`: Show content when viewport is at or above this breakpoint.
- `max?: BreakpointKey`: Show content when viewport is strictly below this breakpoint.

### `<HideAt>`

Conditionally hides slot content when the viewport meets specified breakpoint criteria.

#### Usage

```vue
<template>
  <!-- Hidden on large screens and above -->
  <HideAt min="lg">
    <p>This is hidden on large screens and above</p>
  </HideAt>
</template>

<script setup lang="ts">
  import HideAt from '@mission-platform/breakpoints/components/hide-at.vue';
</script>
```

#### Props

Same as `<ShowAt>`.

### `<BreakpointDebug>`

A development utility component that displays the current active breakpoint in a small overlay in the corner of the screen. Useful for testing responsive layouts during development.

#### Usage

```vue
<template>
  <BreakpointDebug />
</template>

<script setup lang="ts">
  import BreakpointDebug from '@mission-platform/breakpoints/components/breakpoint-debug.vue';
</script>
```

## SCSS Utilities

The breakpoint SCSS layer has been moved to `@mission-platform/tokens` for better centralization of design tokens.

### Mixins

To use the `$breakpoints` map and responsive mixins (without emitting CSS):

```scss
@use '@mission-platform/tokens/scss/breakpoints-mixins' as bp;

.container {
  @include bp.bp-up('md') {
    max-width: 1024px;
  }
}
```

### Visibility Utility Classes

To use the pre-generated visibility classes (`.bp-show-*`, `.bp-hide-*`, `.bp-only-*`):

```scss
@use '@mission-platform/tokens/scss/breakpoints-utilities';
```
