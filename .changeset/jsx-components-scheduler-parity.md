---
'@mission-platform/components': minor
---

bring `BaseScheduler` to full behavioral parity with its Vue counterpart: it is now driven by RFC 5545 `VEvent`s through the shared `@mission-platform/scheduler-core` (recurrence expansion, view ranges, collision layout) with the full five-view set (day / 3-day / week time grids, month grid, year grid), pointer drag-to-move + resize, period navigation, and a `BaseDialog`-based create/edit/delete event dialog; its public surface now mirrors the Vue component (`modelValue` / `defaultView` / `weekStartsOn` + `onUpdateModelValue` / `onEventClick`)
