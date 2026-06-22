---
'@mission-platform/components': patch
---

refactor `base-scheduler` to consume the new shared `@mission-platform/scheduler-core` (its `use-scheduler` composable is now a thin Vue-reactive wrapper over the shared recurrence/range/event/layout helpers, and `types` re-exports the shared RFC 5545 model), keeping the public surface and existing specs unchanged
