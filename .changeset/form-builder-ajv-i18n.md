---
'@mission-platform/components': minor
---

localise BaseFormBuilder validation messages and reuse Ajv's schema types

Generated validation messages from `BaseFormBuilder` / `useFormSchema` /
`createFormValidator` are now localised through vue-i18n. `BaseFormBuilder`
translates them via its local i18n scope (new `errors.*` keys), and
`useFormSchema` / `createFormValidator` accept an optional `translate` function
(mirroring vue-i18n's `t(key, named)`). When no translate function is supplied,
built-in English messages are used, and author-supplied `errorMessage`
overrides always win verbatim.

The form schema types now reuse Ajv's own published types: `JsonSchemaType` is
derived from Ajv's `JSONType`, and the compiled `FormValidator.jsonSchema` is
typed as Ajv's `SchemaObject`. A new `FormBuilderTranslate` type and a
re-exported `SchemaObject` type are available from the package.
