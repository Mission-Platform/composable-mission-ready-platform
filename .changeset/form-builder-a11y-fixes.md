---
"@mission-platform/components": patch
---

fix `BaseFormBuilder` accessibility violations

- The field drag handle is no longer `aria-hidden` while being focusable: it
  gets an `aria-label="Drag to reorder"` instead, so `@dnd-kit/vue`'s
  `role="button"` handle is exposed correctly (resolves axe `aria-hidden-focus`).
- The canvas, wizard-step, and nested field-set dropzones now only carry
  `role="list"` when they actually contain field rows; an empty dropzone (which
  shows a drop-hint placeholder) drops the role, so it no longer violates axe
  `aria-required-children`, and the `role="listitem"` rows always have a
  `role="list"` parent (`aria-required-parent`).
