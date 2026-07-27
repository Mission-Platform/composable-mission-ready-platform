# @mission-platform/breakpoints

`@mission-platform/breakpoints` provides responsive breakpoint utilities, composables, and components to handle viewport-based logic consistently across the Mission Platform.

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

## Composables

### `useBreakpoints()`

Reactive hook/composable that tracks viewport dimensions via `matchMedia` listeners.

```ts
import { useBreakpoints } from '@mission-platform/breakpoints';

const { current, active, isAbove, isBelow, isOnly } = useBreakpoints();

const isDesktop = isAbove('lg');
const isMobile = isBelow('md');
console.log(active.md); // boolean
```

## Components

- `<ShowAt min="md">`: Conditionally renders children/slot content when the viewport is at or above `min` (and/or below `max`).
- `<HideAt min="lg">`: Hides children/slot content when condition is met.
- `<BreakpointDebug />`: Development overlay displaying the current active breakpoint.

```tsx
import { BreakpointDebug, HideAt, ShowAt } from '@mission-platform/breakpoints';
```
