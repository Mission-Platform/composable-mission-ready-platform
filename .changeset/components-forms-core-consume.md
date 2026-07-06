---
'@mission-platform/components': patch
---

refactor `base-schema-form` and `base-form-builder` to consume the new shared `@mission-platform/forms-core` (their JSON Schema/Ajv/condition/builder logic now re-exports the shared implementation), keeping the public surface and existing specs unchanged
