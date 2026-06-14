---
'@mission-platform/components': minor
---

`BaseFormBuilder`: show a drag ghost of the real control across the sortable lists

Following dnd-kit's [multiple sortable lists](https://dndkit.com/react/guides/multiple-sortable-lists/)
pattern, the builder now renders a shared `DragOverlay` ghost that tracks the
pointer as a field travels from the palette to the canvas (or row to row).
For a palette entry the ghost previews the **actual control** the field type
represents — a live, disabled `BaseSchemaFormField` — rather than the palette
chip; for an existing canvas row it shows a compact summary. The palette entry
itself stays put and visibly dims while dragging, resetting once the drag ends,
and the drop is still materialised as the real field on the canvas.

A new `BaseFormBuilderDragPreview` component (the ghost) is exported from the
package.
