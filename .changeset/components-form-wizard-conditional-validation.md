---
'@mission-platform/components': minor
---

Add conditional steps and per-step/final-step validation to the write-once
`BaseFormWizard` (`Components/Forms`). Each `WizardStep` gains two optional
fields: `when` (when `false`, the step is dropped from the indicator and
navigation sequence entirely — a conditional step) and `valid` (when `false`,
advancing past the step via Next, the final Finish, or a forward indicator jump
is blocked and the primary button is disabled). Because completion fires from
the last visible step, that step's `valid` doubles as the final-step validation
gate. Visibility and validity stay parent-supplied so the component remains
controlled and framework-neutral. Adds a `WithValidationAndConditionalSteps`
story demonstrating all three behaviours together.
