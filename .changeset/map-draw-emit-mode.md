---
"@mission-platform/map": patch
---

emit `update:mode` from `MapDraw` when the internal drawing mode resets so `:mode` / `v-model:mode` stays in sync and drawing can restart after a shape is committed
