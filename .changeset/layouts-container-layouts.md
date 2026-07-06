---
'@mission-platform/layouts': minor
---

Add the write-once `BaseContainer` layout primitive (shipped to both Vue and
React as `Container`). It constrains and centres page/section content on the
inline axis through three layout options selected by `variant`: **`fixed`** (a
constant `max-width` from the `sm … 2xl` scale that never changes with the
viewport), **`fluid`** (always 100% of the available width, no `max-width`), and
**`responsive`** (a `max-width` that steps up at each platform breakpoint,
mobile-first). The `fixed`/`fluid` widths plus the `gutter`/`center` controls are
inline styles, while the `responsive` step-ups live in the co-located CSS Module
(the platform breakpoints inlined as range-notation `min-width` media queries).
Adds the matching Storybook stories (`Layouts/BaseContainer`) and a
cross-framework parity spec.
