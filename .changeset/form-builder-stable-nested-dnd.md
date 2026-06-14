---
'@mission-platform/components': patch
---

stop form-builder field rows from jumping around while dragging, especially when nesting

- the canvas field rows now drop `@dnd-kit/vue`'s default sortable plugins (chiefly the optimistic-sorting plugin), which live-reordered and re-parented the DOM on every `dragover`; with the builder's deeply nested, per-container sortable groups that made rows visibly jump around mid-drag and fought Vue, which only mutates the field tree once on drop
- each field row's sortable now scopes its *droppable* shape to the row header (via dnd-kit's `target`) instead of the whole card; a field set's card wraps its nested drop area, so the full-card droppable used to cover and shadow the nested (lower-priority) dropzone — dragging a field into a group resolved to the group row itself, so the field landed *beside* the group instead of *inside* it, and the overlapping targets made the drop marker flip-flop ("bounce"). With the header-only drop shape, nesting into a group now resolves correctly and the jitter is gone
- rows now stay put during a drag, with the pointer-following drag overlay and a steady accent-line drop-target marker on the row showing where a field will land
- keyboard reordering is unaffected — it is provided by the explicit move-up / move-down buttons on every row (the drag handle was never keyboard-focusable)
