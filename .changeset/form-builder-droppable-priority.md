---
'@mission-platform/components': patch
---

prioritise nested form-builder drop zones so dragging into them is easier

- the form builder's drop zones now set an explicit `@dnd-kit/vue` collision priority that grows with nesting depth (canvas < wizard step < field set), so the innermost drop target wins instead of the larger outer canvas stealing the drop
- each wizard step is its own prioritised droppable, so dropping a field onto a step reliably adds it to that step
