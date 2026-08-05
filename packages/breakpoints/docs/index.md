# @mission-platform/breakpoints

`@mission-platform/breakpoints` provides responsive breakpoint utilities and **write-once** viewport components for the
Mission Platform. The components (`ShowAt`, `HideAt`, `BreakpointDebug`) are authored once in the neutral
`@mission-platform/forge` dialect and compiled to **both Vue 3 and React** by `@mission-platform/vite-plugin-forge`.

## Subpath Exports

- `@mission-platform/breakpoints/vue` — compiled native Vue 3 components.
- `@mission-platform/breakpoints/react` — compiled native React components.
- `@mission-platform/breakpoints/core` — framework-agnostic utilities and types.
- `@mission-platform/breakpoints` — the neutral JSX source barrel (for write-once components compiled by
  `@mission-platform/vite-plugin-forge`).

## Breakpoint Scale

The platform uses a seven-step responsive scale based on viewport width thresholds:

| Key   | Label             | Threshold     | Common Device / Use Case        |
|:------|:------------------|:--------------|:--------------------------------|
| `2xs` | Extra-extra-small | $\ge 0$ px    | All devices                     |
| `xs`  | Extra-small       | $\ge 480$ px  | Large phones                    |
| `sm`  | Small             | $\ge 768$ px  | Tablet portrait                 |
| `md`  | Medium            | $\ge 1024$ px | Tablet landscape / small laptop |
| `lg`  | Large             | $\ge 1920$ px | Full HD / 1080p                 |
| `xl`  | Extra-large       | $\ge 2560$ px | QHD                             |
| `2xl` | Extra-extra-large | $\ge 3840$ px | 4K UHD                          |

## Core Utilities (`/core`)

Framework-agnostic helpers, safe to use from any framework (or none):

- `breakpointKeys` — the ordered array of breakpoint keys.
- `breakpoints` — a map of keys to their min-width pixel thresholds.
- `getBreakpointValue(key)` — the pixel threshold for a breakpoint.
- `mediaQuery(key)` — a `min-width` media query string (`'(min-width: 1920px)'`), or `'all'` for `2xs`.
- `maxMediaQuery(key)` — a `max-width` upper-bound media query string, or `'not all'` for `2xs`.
- `resolveBreakpoint(width)` — given a pixel width, the active breakpoint key.

```ts
import { mediaQuery, resolveBreakpoint } from '@mission-platform/breakpoints/core';

resolveBreakpoint(1024); // → 'md'
mediaQuery('lg'); // → '(min-width: 1920px)'
```

The Vue-only `useBreakpoints` composable has been removed. For custom reactive viewport logic, build on these `/core`
helpers with your framework's own hooks (see, for example, `apps/service-monitor`'s React `useCompactViewport` hook
built on `maxMediaQuery`).

## Components

### `<ShowAt>`

Conditionally renders slot/children content when the viewport meets the specified breakpoint criteria.

#### Usage

```vue
<!-- Vue 3 -->
<script setup lang="ts">
  import { ShowAt } from '@mission-platform/breakpoints/vue';
</script>

<template>
  <ShowAt min="md"><p>Visible on medium screens and above</p></ShowAt>
  <ShowAt
    min="sm"
    max="lg"
  >
    <p>Visible only on small and medium screens</p>
  </ShowAt>
</template>
```

```tsx
// React
import { ShowAt } from '@mission-platform/breakpoints/react';

<ShowAt min="md">
  <p>Visible on medium screens and above</p>
</ShowAt>;
```

#### Props

- `min?: BreakpointKey`: Show content when viewport is at or above this breakpoint.
- `max?: BreakpointKey`: Show content when viewport is strictly below this breakpoint.

### `<HideAt>`

The inverse of `<ShowAt>`: conditionally hides slot/children content when the viewport meets the specified breakpoint
criteria.

```vue
<script setup lang="ts">
  import { HideAt } from '@mission-platform/breakpoints/vue';
</script>

<template>
  <HideAt min="lg"><p>Hidden on large screens and above</p></HideAt>
</template>
```

#### Props

Same as `<ShowAt>`.

### `<BreakpointDebug>`

A development-only overlay pinned to the bottom-right corner that displays the current active breakpoint and which
breakpoints are active. Its labels are localised through i18next (`mp.breakpoints` namespace) with English defaults.

```tsx
// React
import { BreakpointDebug } from '@mission-platform/breakpoints/react';

<BreakpointDebug />;
```

## SCSS Utilities

The breakpoint SCSS layer lives in `@mission-platform/tokens`.

### Mixins

```scss
@use '@mission-platform/tokens/scss/breakpoints-mixins' as bp;

.container {
  @include bp.bp-up('md') {
    max-width: 1024px;
  }
}
```

### Visibility Utility Classes

```scss
@use '@mission-platform/tokens/scss/breakpoints-utilities';
```
