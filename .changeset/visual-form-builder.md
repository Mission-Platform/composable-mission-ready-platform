---
'@mission-platform/components': minor
---

add BaseFormBuilder for visual drag-and-drop JSON-Schema form building

`BaseFormBuilder` is a visual authoring surface for JSON-Schema forms — the
counterpart to `BaseSchemaForm`. Drag field types from a palette (or click them)
onto a canvas, reorder fields by dragging, and edit each field's label, key,
type, validation, and options in the inspector. The component emits a
`FormJsonSchema` document via `v-model` that can be fed straight back into
`BaseSchemaForm`, and the inspector offers a live preview and the raw generated
schema. Also exports the `useFormBuilder` composable and the pure
field-to-schema conversion helpers (`fieldsToSchema`, `schemaToFields`,
`createField`, …).
