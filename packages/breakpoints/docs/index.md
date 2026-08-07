# @mission-platform/breakpoints

`@mission-platform/breakpoints` provides responsive breakpoint utilities and **write-once** viewport components for the
Mission Platform. The components (`ForgeShowAt`, `ForgeHideAt`, `ForgeBreakpointDebug`) are authored once in the neutral
`@mission-platform/forge` dialect and compiled to **both Vue 3 and React** by `@mission-platform/vite-plugin-forge`.

## Exports

- `@mission-platform/breakpoints` — the single entry point. Which build you get is decided by the active
  `mp:<framework>` export condition (`mp:vue`, `mp:react`, `mp:solid`,
  `mp:web-component`); with no condition set it resolves to the neutral JSX source barrel (for write-once components
  compiled by `@mission-platform/vite-plugin-forge`).
- `@mission-platform/breakpoints/core` — framework-agnostic utilities and types.

Pick the framework **once** — `resolve.conditions` via `defineFrameworkAppConfig` /
`frameworkResolveConditions` from `@mission-platform/vite-config`, and `customConditions` via the
`@mission-platform/typescript-config/framework-<name>` presets — then import everything with the bare package specifier.

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

### `<ForgeShowAt>`

Conditionally renders slot/children content when the viewport meets the specified breakpoint criteria.

#### Usage

```vue
<!-- Vue 3 (mp:vue condition active) -->
<script setup lang="ts">
  import { ForgeShowAt } from '@mission-platform/breakpoints';
</script>

<template>
  <ForgeShowAt min="md"><p>Visible on medium screens and above</p></ForgeShowAt>
  <ForgeShowAt
    min="sm"
    max="lg"
  >
    <p>Visible only on small and medium screens</p>
  </ForgeShowAt>
</template>
```

```tsx
// React (mp:react condition active) — note the identical bare specifier.
import { ForgeShowAt } from '@mission-platform/breakpoints';

<ForgeShowAt min="md">
  <p>Visible on medium screens and above</p>
</ForgeShowAt>;
```

#### Props

- `min?: BreakpointKey`: Show content when viewport is at or above this breakpoint.
- `max?: BreakpointKey`: Show content when viewport is strictly below this breakpoint.

### `<ForgeHideAt>`

The inverse of `<ForgeShowAt>`: conditionally hides slot/children content when the viewport meets the specified
breakpoint criteria.

```vue
<script setup lang="ts">
  import { ForgeHideAt } from '@mission-platform/breakpoints';
</script>

<template>
  <ForgeHideAt min="lg"><p>Hidden on large screens and above</p></ForgeHideAt>
</template>
```

#### Props

Same as `<ForgeShowAt>`.

### `<ForgeBreakpointDebug>`

A development-only overlay pinned to the bottom-right corner that displays the current active breakpoint and which
breakpoints are active. Its labels are localised through i18next (`mp.breakpoints` namespace) with English defaults.

```tsx
// React
import { ForgeBreakpointDebug } from '@mission-platform/breakpoints';

<ForgeBreakpointDebug />;
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
