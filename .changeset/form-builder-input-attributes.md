---
'@mission-platform/components': minor
---

expose more input attributes in the form builder schema editor

The form builder's field editor now supports the remaining input attributes already honoured by the schema-form pipeline: a "Disabled (read-only in the form)" toggle for any field (serialised to `ui.disabled`), and, for number/stepper fields, **Exclusive minimum**, **Exclusive maximum**, and **Multiple of** validations (serialised to `exclusiveMinimum`, `exclusiveMaximum`, and `multipleOf`). These attributes round-trip through `fieldsToSchema`/`schemaToFields`.
