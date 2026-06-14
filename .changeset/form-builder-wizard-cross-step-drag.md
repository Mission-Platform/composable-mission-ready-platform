---
'@mission-platform/components': minor
---

update a field's wizard step when it is dragged between step lists in `BaseFormBuilder`

- in wizard mode, dragging a top-level field row from one step's list and dropping it onto another step (its drop zone, or a row that belongs to it) now reassigns the field to that step instead of leaving its step number unchanged
- the moved field is slotted into the target step — just before the hovered row, or appended to the end when dropped onto the step's empty drop zone
- dropping a row back onto its own step keeps its step, and field-set children (which carry no step) are unaffected
