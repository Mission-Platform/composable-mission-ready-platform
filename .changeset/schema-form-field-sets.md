---
'@mission-platform/components': minor
---

render and validate field sets in BaseSchemaForm, and fix palette drag duplicates

`BaseSchemaForm` now renders **field sets**: an `object`-typed property (with or
without `ui.widget: 'fieldset'`) becomes a labelled `BaseFieldSet` group whose
nested `properties` render as child fields and whose value is a nested object
(e.g. `address: { street, city }`). Field sets nest to any depth; defaults,
Ajv validation, and value updates all recurse, and nested validation errors are
keyed by their dotted path (`address.street`) and shown on the individual
nested controls (including wizard step error highlighting).

Palette entries in `BaseFormBuilder` are now plain draggables instead of
sortables, so a palette item is no longer "dragged over" into the canvas while
dragging. This fixes spurious **duplicate fields** appearing after the first
field was placed: each palette drop now adds exactly one new field, resolved
from the drop target (the canvas, a row, or a field set).
