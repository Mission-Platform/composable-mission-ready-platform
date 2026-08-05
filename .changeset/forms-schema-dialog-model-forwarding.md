---
'@mission-platform/forms': patch
---

Fix `ForgeSchemaFormDialog` silently dropping every value update on the Vue build.
`modelValue` is a `@model` prop, so the host's `onUpdate:modelValue` listener is
consumed by Vue's model system and is not exposed as
`properties.onUpdateModelValue`; forwarding that reference to the inner
`ForgeSchemaForm` emitted `undefined`, so field edits never reached the host. The
dialog now re-emits its model through a wrapper that calls the callback (which
compiles to the model setter). This is why a hosted code-block dialog's language
picker appeared inert — the picked language never propagated out of the dialog.
