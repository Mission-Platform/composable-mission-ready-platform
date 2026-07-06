---
'@mission-platform/components': minor
---

show a drop-placement ghost while dragging in the form builder

`BaseFormBuilder` now renders a placeholder "ghost" row at the exact slot a dragged field will land in — before the hovered canvas row, or appended at the end of the hovered container (a step root or a field set) — driven by a `dropIndicator` insert-target updated on `dragover`. The ghost is `aria-hidden` and acts as its own drop zone at that slot (so a field dropped on it lands precisely there), and it is cleared on drop and on drag-end.
