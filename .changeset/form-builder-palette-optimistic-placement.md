---
'@mission-platform/components': minor
---

preview where a dragged palette field will land in the `BaseFormBuilder` canvas

- the palette entries are now `@dnd-kit/vue` **sortables** (in their own `PALETTE_GROUP`) instead of plain draggables, so dragging one over the canvas is a cross-group sortable move
- dnd-kit's built-in `OptimisticSortingPlugin` projects the dragged entry into the canvas (and field-set / wizard-step) lists as you drag, opening a placeholder gap that previews exactly where the new field will be inserted
- the drop now commits the new field at that projected position (falling back to the hovered drop target when no projection is reported), and the palette stays intact — drops never consume an entry or create duplicates
