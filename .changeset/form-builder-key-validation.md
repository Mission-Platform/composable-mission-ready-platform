---
'@mission-platform/components': minor
---

`BaseFormBuilder`: validate field keys to prevent silent property collisions

A field's key becomes its JSON Schema property name, so two sibling fields
sharing a key — or an empty key — silently collided in the generated schema (the
later property overwrote the earlier one, dropping a field). The field editor's
**Key** input now surfaces an inline error when the key is empty or duplicates a
sibling in the same container (root canvas or field set), so authors can fix it
before that data loss happens. A new pure `fieldKeyError` helper performs the
check and `useFormBuilder` exposes `siblingKeys(id)` to feed it.
