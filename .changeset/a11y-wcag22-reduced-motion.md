---
'@mission-platform/components': minor
---

improve accessibility / WCAG 2.2 compliance

- Ship a global reduced-motion safety net in `@mission-platform/components/styles`: a `@media (prefers-reduced-motion: reduce)` reset that collapses animation/transition durations and disables smooth scrolling across every component and the host app (WCAG 2.2 SC 2.3.3 / 2.2.2), so plain-CSS motion honours the user's preference without each component opting in.
- Add a reusable, SSR-safe `useReducedMotion()` composable (and a one-off `prefersReducedMotion()` helper) for gating JS-driven motion; refactor `BaseBackgroundVideo` to use it.
- `BaseCarousel`: never auto-rotate when reduced motion is preferred, expose an always-available, accessible pause/play control while autoplaying (WCAG 2.2.2 Pause, Stop, Hide), and enlarge each indicator dot to a ≥24×24px tap target with a visible focus ring (WCAG 2.5.8 / 2.4.7).
