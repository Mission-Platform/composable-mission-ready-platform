---
'@mission-platform/components': minor
---

add `BaseVerticalLayout` and adopt it in `BaseFormBuilder`

- new `BaseVerticalLayout` three-column layout primitive (start / content / end): the start and end columns reuse `BaseSidebar`'s `inline` variant so they render as static, fixed-open columns at and above a configurable `breakpoint` and collapse into toggleable overlay drawers below it
- exposes `startOpen` / `endOpen` models for the mobile drawers plus a scoped default slot (`{ isInline, toggleStart, toggleEnd }`) for rendering drawer-toggle controls
- `BaseFormBuilder` now uses `BaseVerticalLayout` for its palette / canvas / inspector columns, making the builder mobile-responsive (palette and inspector become toggleable sidebars on small screens) instead of a hard-coded CSS grid
