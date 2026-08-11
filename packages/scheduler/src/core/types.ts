import type { VEvent } from '@mission-platform/vcard';

export type {
  RRule,
  RRuleFreq,
  RRuleWeekday,
  VAlarm,
  VEvent,
  VEventAttendee,
  VEventClass,
  VEventStatus,
  VEventTransp,
} from '@mission-platform/vcard';

/** Calendar view modes available in ForgeScheduler. */
export type SchedulerView = 'day' | 'three-day' | 'week' | 'month' | 'year';

/** The first day a week-based view starts on (0 = Sunday … 6 = Saturday). */
export type WeekStart = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** A half-open date range `[start, end)`. */
export interface DateRange {
  start: Date;
  end: Date;
}

/** An event positioned in the scheduler's time-grid collision layout. */
export interface SchedulerEventSlot {
  event: VEvent;
  column: number;
  totalColumns: number;
}
