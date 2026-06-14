---
'@mission-platform/components': minor
---

`BaseFormBuilder`: let dnd-kit determine where a dragged field lands

Dragging a field type from the palette onto the canvas previously relied on a
bespoke placeholder "ghost" whose position was computed by hand, which made it
jump around as the layout shifted. Palette entries are now `@dnd-kit/vue`
sortables in their own group, so dragging one onto the canvas is a *cross-group*
move: dnd-kit's `OptimisticSortingPlugin` opens the placeholder gap and projects
the insertion index itself, and the field is committed at that exact slot on
drop. The result is a stable, library-driven insertion position; the previous
custom ghost row has been removed.
