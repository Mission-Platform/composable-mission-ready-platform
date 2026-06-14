---
'@mission-platform/components': minor
---

represent `BaseFormBuilder` wizard fields as a per-step matrix instead of tagging each field with a step

- the builder's working field tree is now shape-driven: in wizard mode `useFormBuilder().fields` is a `BuilderField[][]` (one inner list per step), and in single-step mode it stays a flat `BuilderField[]` — the `step` property has been removed from `BuilderField`, so a field's step is simply which list it lives in
- `schemaToFields` now returns the matching shape (`BuilderField[][]` for a wizard/array definition, `BuilderField[]` for a single-step/object definition), and `fieldsToWizardSchema` accepts the per-step matrix; `createField` no longer takes a `step` option
- `useFormBuilder` exposes `selectedStep` and `moveFieldToStep`, derives `stepCount` from the step lists, and reorders/duplicates/removes within each step's own list; the properties inspector moves a field between steps instead of patching a `step` field
