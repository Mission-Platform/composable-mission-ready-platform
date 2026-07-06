---
'@mission-platform/components': minor
---

bring `BaseSchemaForm` and `BaseFormBuilder` to full behavioral parity with their Vue counterparts: both are now driven by a JSON Schema through the shared `@mission-platform/forms-core` (Ajv validation, conditional `ui.visibleWhen` fields, nested field sets, multi-step wizards), and `BaseFormBuilder` gains the palette/canvas/properties/condition/steps editors with native HTML5 drag-and-drop, a live preview, and JSON-schema export
