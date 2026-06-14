---
'@mission-platform/components': major
---

rename BaseFormBuilder to BaseSchemaForm and support multi-step form wizards

The JSON-Schema-driven form builder is now `BaseSchemaForm` / `useSchemaForm`.
Passing the `schema` prop a single object renders a one-step form as before;
passing a top-level **array** of object schemas renders a multi-step **form
wizard** — one step per entry, with each step's `title`/`description` labelling
the step indicator and forward navigation gated on the current step validating.
Step schemas share a single values bag, and `validate()` checks every step.

BREAKING CHANGE: `BaseFormBuilder` → `BaseSchemaForm`, `BaseFormBuilderField` →
`BaseSchemaFormField`, `BaseFormBuilderActions` → `BaseSchemaFormActions`,
`useFormSchema` → `useSchemaForm`, and `FormBuilderTranslate` →
`SchemaFormTranslate`. The `schema` prop now accepts `SchemaFormDefinition`
(`FormJsonSchema | FormJsonSchema[]`); update imports and usages accordingly.
