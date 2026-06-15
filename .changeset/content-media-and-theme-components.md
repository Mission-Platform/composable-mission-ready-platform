---
'@mission-platform/components': minor
---

feat(components): add content, media, navigation, feedback, and theme components

Add a large batch of new Vue 3 components and composables to the library:

- Content & display: `BaseSeparator` (horizontal/vertical divider with an
  optional label and `decorative` mode), `BaseQuote` (semantic blockquote
  with attribution), `BaseButtonGroup` (joined/`attached` button row),
  `BaseHero` (page banner with eyebrow/title/subtitle, media + actions
  slots, and a scrim overlay).
- Media: `BaseResponsiveImage` (`<picture>` with art-directed sources,
  lazy loading, fixed aspect ratio), `BaseResponsiveVideo` (responsive
  `<video>` with format sources and poster), and `BaseBackgroundVideo`
  (decorative full-bleed background video that honours
  `prefers-reduced-motion`).
- Navigation & input: `BasePagination` (with prev/next/edge controls and
  truncation ellipses), `BaseSegmentControl` (`role="radiogroup"` switcher
  with roving tabindex), `BaseRating` (whole/half-star input and read-only
  display), and `BaseSlider` (range input with drag + keyboard control).
- Feedback: `BaseAlertBanner` (inline, dismissible alert) plus a toast
  system — `BaseToast`, `BaseToastContainer`, and the `useToast` store.
- Theme configuration: `BaseThemeProvider` and the `useTheme` composable,
  which create/share a reactive theme store, apply `data-theme` to
  `<html>`, persist the preference, and track the system color scheme
  (interoperating with the existing `BaseThemeToggle`).

All components ship with Storybook stories, unit tests, design-token-based
styling, and accessible roles/keyboard interactions.
