---
'@mission-platform/components': minor
---

add nested field sets to BaseFormBuilder and a reusable BaseFieldSet

`BaseFormBuilder` now supports building **nested groups** of fields. A new
`fieldset` palette type creates a group that owns its own children; dragging a
widget from the palette onto a field set (or clicking its "Add field to group"
button) nests the new field inside it, and field sets can be nested to any
depth. A field set serialises to a nested `object` JSON-Schema property
(`properties` + nested `required`) and round-trips back through
`schemaToFields`.

Dragging a field type from the palette onto the canvas now always **creates a
new field** (a duplicate of the chosen type) and never consumes the palette
entry, and existing canvas items can never be dragged back into the palette —
drops are only ever applied within the canvas (root list or a field set).

A new presentation-only `BaseFieldSet` component is exported for reuse: a
semantic `<fieldset>` with an optional `<legend>`, description, `flush` and
native `disabled` support. `BaseFormBuilderFieldSet` (also exported) composes it
with the builder's drag-and-drop behaviour. The shared schema-form types gain a
`fieldset` `FormFieldType`, an `object` `JsonSchemaType`, and nested
`properties`/`required` on `JsonSchemaProperty`.
