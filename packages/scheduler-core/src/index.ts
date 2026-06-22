// ─── @mission-platform/scheduler-core ─────────────────────────────────────────
//
// Framework-agnostic scheduler core shared by the Vue `@mission-platform/components`
// BaseScheduler (via `useScheduler`) and the write-once
// `@mission-platform/components` BaseScheduler. Both frameworks expand
// recurrences, compute view ranges, select/mutate events, and lay out the time
// grid through this single implementation, so they stay in parity by construction.

// RFC 5545 event model + view types.
export type {
  DateRange,
  RRule,
  RRuleFreq,
  RRuleWeekday,
  SchedulerEventSlot,
  SchedulerView,
  VAlarm,
  VEvent,
  VEventAttendee,
  VEventClass,
  VEventStatus,
  VEventTransp,
  WeekStart,
} from './types';

// Date helpers.
export {
  addDays,
  addMonths,
  addYears,
  dayKey,
  fmtLike,
  isAllDay,
  parseDate,
  parseDT,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  WEEKDAY_LUXON,
} from './dates';

// RFC 5545 recurrence expansion.
export { expandRecurrences } from './recurrence';

// View range + navigation math.
export { stepAnchor, visibleRangeFor } from './range';

// Event selectors, mutations, duration & collision layout.
export {
  applyEventPatch,
  createEvent,
  eventsForDay,
  eventsForRange,
  formatDuration,
  layoutDay,
  moveEventPatch,
  resizeEventPatch,
} from './events';
