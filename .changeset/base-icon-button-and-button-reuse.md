---
'@mission-platform/components': minor
---

add BaseIconButton and reuse BaseButton/BaseIconButton across components

Introduce a new `BaseIconButton` component (ghost/primary/secondary/danger variants, sm/md/lg sizes, required `label` for an accessible name) and adopt the shared button components instead of hand-rolled markup: dialog/modal/sidebar header close controls now use `BaseIconButton`; the default schema-form actions and form-wizard footer now use `BaseButton`; and the log viewer row, form-builder palette item, and scheduler event tile are now real `<button>` elements instead of `role="button"` divs, improving keyboard and screen-reader behaviour.
