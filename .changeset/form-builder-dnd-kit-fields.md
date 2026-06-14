---
'@mission-platform/components': minor
---

`BaseFormBuilder`: dnd-kit drag-and-drop, a wizard mode, and three new field types

The visual form builder now uses [`@dnd-kit/vue`](https://dndkit.com/vue)
(`useDraggable` / `useSortable` / `useDroppable`) for palette-to-canvas
insertion and canvas reordering, replacing the previous native HTML5
drag-and-drop while keeping the click/keyboard fallbacks.

A new `wizard` prop groups fields into steps (each `BuilderField` carries a
`step`) and emits a top-level array `SchemaFormDefinition`, which
`BaseSchemaForm` renders as a multi-step form wizard. New `fieldsToWizardSchema`,
`fieldsToDefinition`, and `schemaStepTitles` helpers are exported, and
`schemaToFields` now accepts a wizard array.

Three field types are added across both `BaseFormBuilder` and `BaseSchemaForm`:
`multiselect` (array of options), `datetime` (paired date + time picker), and
`file` (file upload, with `accept` / `multiple` `ui` hints).
