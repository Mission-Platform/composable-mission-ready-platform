---
'@mission-platform/breakpoints': major
---

split breakpoints into a framework-agnostic, write-once package

`@mission-platform/breakpoints` is now authored once in the neutral `@mission-platform/jsx` dialect and compiled to **both Vue 3 and React** by `@mission-platform/vite-plugin-jsx` (mirroring `@mission-platform/icons`), replacing the hand-written Vue SFCs.

- **New subpaths:** import components from `@mission-platform/breakpoints/vue` or `@mission-platform/breakpoints/react`. The framework-agnostic utilities (`breakpointKeys`, `breakpoints`, `getBreakpointValue`, `mediaQuery`, `maxMediaQuery`, `resolveBreakpoint`) and types now live on `@mission-platform/breakpoints/core`. The root `.` entry is the neutral JSX source barrel for write-once components.
- **Breaking — root exports:** the root `.` entry no longer re-exports the core utilities/values; import them from `@mission-platform/breakpoints/core` instead.
- **Breaking — `useBreakpoints` removed:** the Vue-only composable relied on `ref`/`onMounted` and cannot exist as a standalone compiled hook. Build custom reactive viewport logic on the `/core` helpers with your framework's own hooks.
- `ShowAt`, `HideAt`, and `BreakpointDebug` are unchanged in behaviour; `BreakpointDebug` keeps its i18next-localised labels (`mp.breakpoints` namespace) with English defaults.
