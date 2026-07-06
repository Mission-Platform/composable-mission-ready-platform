---
'@mission-platform/components': minor
---

stabilise form-builder drag placement, preview the landing field, and keep the properties panel in sync with the selection

`BaseFormBuilder` now resolves a hovered row's drop slot from the pointer's position within it (top half drops _before_ the row, bottom half _after_), so the placement no longer jumps around as the inserted ghost reflows the list. The drop-placement ghost renders as a faded, non-interactive clone of the field it will become (the moved field, or the dragged palette entry) rather than a bare placeholder, the canvas drop area is now at least three field-rows tall so dropping is easier, and the dragged source row dims while in flight with smoothed motion (plus a brief ghost entrance animation). The field-properties inspector also resolves the selected field at render time so it correctly tracks the selected field on the Vue build (previously the panel stayed on "Form settings" because the forwarded inspector slot captured the selection once instead of reading it reactively).
