---
'@mission-platform/components': patch
---

fix the `BaseFormBuilder` palette so a dropped entry resets back to the palette instead of being duplicated in the canvas

- `BaseFormBuilderPaletteItem` now owns its `<li>` list item as its root element, and that `<li>` is the registered `@dnd-kit/vue` sortable element (the palette `<ul>` renders the item directly rather than wrapping it in its own `<li>`)
- while dragging, dnd-kit physically relocates the sortable element to preview the drop gap and does not move it back on a (non-cancelled) drop; because the relocated node is now the item's keyed component root that Vue owns in the palette `<ul>`, Vue reconciles it back into the palette on the re-render the drop triggers
- the dropped entry therefore returns to the palette and the canvas only shows the newly added field — no leftover/duplicate palette node
- the sortable `handle` is set to the list item so a drag still starts when the press lands on the inner `<button>` (dnd-kit's pointer sensor otherwise suppresses drags begun on an interactive descendant), while clicking the button keeps adding a field
