---
'@mission-platform/components': minor
---

add per-step and final wizard validation modes to schema form with errored-step highlighting

`BaseSchemaForm` gains a `validationMode` prop (`'per-step'` | `'final'`): `'per-step'` (default) keeps gating forward navigation on the current step validating, while `'final'` lets the user move freely between steps and defers validation until submit. In both modes any step whose fields currently hold errors is highlighted in the wizard step indicator. `WizardStep` gains an optional `error` flag and `useSchemaForm` exposes a reactive `stepHasErrors` array.
