---
'@mission-platform/components': major
---

rebuild BaseFormBuilder from scratch with a simpler, clearer architecture

The form builder is recreated around a three-column `BaseVerticalLayout`: a draggable field palette in the start sidebar, a tabbed Editor/Preview view in the centre, and an inspector in the end sidebar that shows the selected field's properties or the form/wizard settings. Drag-and-drop (powered by `@dnd-kit/vue`) supports dragging from the palette onto the canvas, reordering, moving fields between wizard steps, and nesting fields into field sets to any depth. The emitted JSON Schema definition remains compatible with `BaseSchemaForm`.

BREAKING CHANGE: The public surface is now minimal. The granular sub-component exports (`BaseFormBuilderPalette`, `BaseFormBuilderPaletteItem`, `BaseFormBuilderCanvasItem`, `BaseFormBuilderFieldSet`, `BaseFormBuilderDropzone`, `BaseFormBuilderFieldEditor`, `BaseFormBuilderConditionEditor`, `BaseFormBuilderStepsEditor`) are no longer exported — only `BaseFormBuilder`, `useFormBuilder`, the schema helpers, and the public types remain. The builder's `paletteDraggable` / `inspectorDraggable` props are replaced by `startDraggable` / `endDraggable`.
