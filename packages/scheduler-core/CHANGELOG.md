# @mission-platform/scheduler-core

## 0.2.0

### Minor Changes

- edb785f: add the framework-agnostic scheduler core (RFC 5545 event model + RRULE/RDATE/EXDATE recurrence expansion,
  view range/navigation math, event selectors + create/move/resize helpers, duration formatting, and time-grid collision
  layout) shared by the Vue `@mission-platform/components` and the write-once `@mission-platform/components`
  BaseScheduler

### Patch Changes

- eefe5d0: bump nanoid and other shared dependencies to their latest patch releases
- d37e102: add targeted eslint-disable comments for new unicorn rule violations
- ca1d98b: reformat sources with updated prettier print width and import ordering
