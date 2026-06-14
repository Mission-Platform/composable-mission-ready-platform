---
'@mission-platform/components': minor
---

add an inline, fixed-open variant to `BaseSidebar`

- new `variant` prop (`overlay` | `inline`) plus `inlineBreakpoint` (defaults to `md`): an `inline` sidebar renders in normal document flow as a static, always-open column at and above the breakpoint, and falls back to the toggleable overlay drawer below it (responsive sidebar)
- in inline mode the sidebar drops the backdrop/teleport/slide transition, ignores `open`, never auto-closes on route change, and hides its header close button (new `hideClose` prop on `BaseSidebarHeader`)
- export the new `SidebarVariant` type; this lets layout primitives (e.g. a three-column form builder) reuse `BaseSidebar` for their start/end panels
