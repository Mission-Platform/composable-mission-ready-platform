---
'@mission-platform/components': major
---

drive BaseFormBuilder from JSON Schema with Ajv-generated validation

`BaseFormBuilder` / `useFormSchema` now take a single JSON Schema definition
(`FormJsonSchema`) as their source of truth. Both the rendered fields and the
validation rules are derived from it, with validation performed by
[Ajv](https://ajv.js.org/) directly against the JSON Schema. Zod is no longer a
dependency and validation schemas are no longer accepted as input.

BREAKING CHANGE: the `schema` prop is now a JSON Schema document
(`{ type: 'object', properties, required }` with an optional `ui` extension and
`errorMessage` overrides) instead of `{ fields, zodSchema }`. The per-field
`schema` / form-level `zodSchema` Zod inputs and the `FormSchema` type have been
removed; use JSON Schema keywords (`minLength`, `format`, `minimum`, `enum`/
`oneOf`, `required`, …) instead.
