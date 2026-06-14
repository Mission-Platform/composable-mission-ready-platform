---
'@mission-platform/components': minor
---

add a dedicated wizard "Steps" inspector tab to `BaseFormBuilder` and make `BaseCodeBlock` body scrollable with a sticky header

- `BaseFormBuilder` now configures wizard steps in their own **Steps** inspector tab (wizard mode only) that lists every step at once, independently of the selected field — add/remove steps and edit each step's title, description, and conditional visibility in one place
- the per-step `visibleWhen` editor moved out of the field editor (which keeps only the per-field "Wizard step" assignment), decoupling step configuration from individual fields
- new `BaseFormBuilderStepsEditor` component and `useFormBuilder` step operations (`addStep`, `removeStep`, `setStepTitle`, `setStepDescription`) plus an explicit `stepCount` and `stepDescriptions`; wizard schemas now emit contiguous steps so empty steps are preserved
- added `schemaStepDescriptions` and a `stepDescriptions` / `stepCount` option to `fieldsToWizardSchema`
- `BaseCodeBlock` gains a `maxHeight` prop: the code body scrolls vertically within the cap while the header (filename/language + copy button) stays pinned; the form builder's schema preview adopts it
