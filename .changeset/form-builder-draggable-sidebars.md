---
'@mission-platform/components': minor
---

`BaseFormBuilder` now lets consumers configure whether its sidebar layout columns are resizable: new `paletteDraggable` (start) and `inspectorDraggable` (end) props (`SidebarDraggable`, default `false`) are forwarded to the underlying `BaseVerticalLayout`'s `startDraggable`/`endDraggable`, so the Fields palette and Inspector can be dragged to resize.
