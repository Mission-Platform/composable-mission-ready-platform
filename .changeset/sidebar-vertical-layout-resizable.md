---
'@mission-platform/components': minor
---

add a resizable `draggable` option to `BaseSidebar` and `BaseVerticalLayout`

`BaseSidebar` gains a `draggable` prop that renders a drag handle on the
sidebar's inner edge and lets the user resize it. It accepts `true` (resizable
up to the full viewport width), a named size (`2xs`–`2xl`, e.g. `lg` for a fixed
maximum width), or a `number` treated as a custom maximum width in `rem`. While
dragging, the new `resize` event reports the current width in `rem`. The named
width scale (`2xs`–`2xl`, default `md`) is also exposed as the
`SIDEBAR_SIZE_REM` map.

`BaseVerticalLayout` forwards the same capability via new `startDraggable` /
`endDraggable` props, keeping each inline column's grid track in lock-step with
the dragged width.
