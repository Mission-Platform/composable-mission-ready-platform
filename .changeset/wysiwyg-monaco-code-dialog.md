---
'@mission-platform/forms-core': minor
'@mission-platform/forms': minor
'@mission-platform/wysiwyg': minor
'@mission-platform/vite-plugin-forge': minor
---

Insert WYSIWYG code blocks through a Monaco dialog built from a schema form.

- `@mission-platform/forms-core`: add an optional `ui.language` hint (surfaced on the resolved `FormFieldSchema.language`) so a `code` field can carry a syntax language.
- `@mission-platform/forms`: `BaseSchemaForm` now renders the `code` widget as a `BaseMonacoEditor` code field, and a new **`BaseSchemaFormDialog`** component hosts any schema form inside a `BaseModal` with Cancel / Submit actions wired to the form's own validation.
- `@mission-platform/wysiwyg`: the toolbar's code-block control now opens the new `BaseSchemaFormDialog` (a language selector + Monaco code editor) instead of a `window.prompt`, preserving the caret position so the inserted block lands where you were editing.
- `@mission-platform/vite-plugin-forge`: add `@mission-platform/forms` to the framework-split module allowlist so write-once packages can consume its compiled Vue/React builds.
