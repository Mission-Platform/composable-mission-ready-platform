---
'@mission-platform/components': minor
---

add conditional wizard steps to the schema form and form builder

- support a step-level `visibleWhen` rule on each wizard step schema (`FormJsonSchema`), so a whole step — its indicator entry and its fields — is shown or skipped as a unit based on the shared form values
- `useSchemaForm` now exposes `visibleStepIndices` and skips hidden steps during `next`/`previous`/`goTo` navigation and `validate`, so a required field on a hidden step never blocks finishing; the active step snaps to the nearest visible one when its condition stops holding
- `BaseFormBuilder` can configure step conditionals: selecting a field in wizard mode exposes a "Step N visibility" editor, round-tripped through the step schema's `visibleWhen`
- add a reusable `BaseFormBuilderConditionEditor` (used for both field and step rules) and the `schemaStepConditions` helper
