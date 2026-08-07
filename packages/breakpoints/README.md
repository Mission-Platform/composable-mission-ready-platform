# @mission-platform/breakpoints

`@mission-platform/breakpoints` provides responsive breakpoint utilities and **write-once** viewport components for the
Mission Platform. The components (`ForgeShowAt`, `ForgeHideAt`, `ForgeBreakpointDebug`) are authored once in the neutral
`@mission-platform/forge` dialect and compiled to **both Vue 3 and React** by `@mission-platform/vite-plugin-forge`.

## Exports

- `@mission-platform/breakpoints` — the single entry point. Which build you get is decided by the active
  `mp:<framework>` export condition (`mp:vue`, `mp:react`, `mp:solid`,
  `mp:web-component`); with no condition set it resolves to the neutral JSX source barrel (compiled by
  `@mission-platform/vite-plugin-forge`).
- `@mission-platform/breakpoints/core` — framework-agnostic utilities and types.

Pick the framework **once** — `resolve.conditions` via `defineFrameworkAppConfig` /
`frameworkResolveConditions` from `@mission-platform/vite-config`, and `customConditions` via the
`@mission-platform/typescript-config/framework-<name>` presets — then import everything with the bare
package specifier.

## Breakpoint Scale

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
- `mediaQuery(key)` — a `min-width` media query string, or `'all'` for `2xs`.
- `maxMediaQuery(key)` — a `max-width` upper-bound media query string, or `'not all'` for `2xs`.
- `resolveBreakpoint(width)` — given a pixel width, the active breakpoint key.

```ts
import { mediaQuery, resolveBreakpoint } from '@mission-platform/breakpoints/core';

resolveBreakpoint(1024); // → 'md'
mediaQuery('lg'); // → '(min-width: 1920px)'
```

## Components

- `<ForgeShowAt min="md">`: Conditionally renders children/slot content when the viewport is at or above `min` (and/or
  strictly below `max`).
- `<ForgeHideAt min="lg">`: The inverse of `<ForgeShowAt>` — hides children/slot content when the condition is met.
- `<ForgeBreakpointDebug />`: Development-only overlay displaying the current active breakpoint (labels localised via
  i18next, `mp.breakpoints` namespace).

```tsx
// Identical in React, Vue 3, Solid and Web Components — the active mp:<framework> condition picks the build.
import { ForgeBreakpointDebug, ForgeHideAt, ForgeShowAt } from '@mission-platform/breakpoints';
```

> The Vue-only `useBreakpoints` composable has been removed. Build custom reactive viewport logic on the `/core` helpers
> with your framework's own hooks (see, for example, `apps/service-monitor`'s React `useCompactViewport` built on
> `maxMediaQuery`).
