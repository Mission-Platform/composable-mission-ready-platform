---
'@mission-platform/components': minor
---

restore drag-interaction and drawer transition parity for the write-once components

`BaseSlider` and `BaseRangeInput` now render the same bespoke `role="slider"` track/thumb(s) as their Vue originals — dragged with a pointer or moved with the keyboard (Arrow/PageUp/PageDown/Home/End) — instead of a native range input. `BaseDrawer` gains drag-to-resize (`draggable` + `onResize`) and the original fade/slide enter/leave via the neutral `<Transition>` primitive, and `BaseVerticalLayout` forwards `startDraggable`/`endDraggable` to resize its inline columns. A shared, SSG-safe `pointer-drag` helper backs all four. The slider and range-input reach full parity (no remaining gaps in the parity matrix).
