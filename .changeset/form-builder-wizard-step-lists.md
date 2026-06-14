---
'@mission-platform/components': minor
---

show one canvas list per step when `BaseFormBuilder` runs in wizard mode

- in wizard mode the builder canvas now renders a separate, titled list for each wizard step (using the step's title/description, falling back to `"Step {n}"`) instead of a single flat list, so authors see at a glance which fields belong to which step; single-step (non-wizard) forms keep the original single list
- each step list is its own drop target and `@dnd-kit/vue` sortable group: dropping a palette field onto a step adds it to that step, dragging a field onto an existing row inherits that row's step, and reordering / move-up / move-down operate within the step the field belongs to
- empty steps render a per-step drop placeholder so fields can be added to any step directly
- new `canvasStepGroup` / `canvasGroupStep` helpers and a `step` drop-zone kind back the per-step grouping
