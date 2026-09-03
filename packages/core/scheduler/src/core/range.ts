// ─── View range & navigation math ─────────────────────────────────────────────
//
// Pure helpers that compute the visible `[start, end)` window for a given view
// + anchor date, and step the anchor backward/forward by one view unit. Shared
// by the Vue and JSX schedulers so both views/navigation behave identically.

import { addDays, addMonths, addYears, startOfDay, startOfMonth, startOfWeek, startOfYear } from './dates';

import type { DateRange, SchedulerView, WeekStart } from './types';

/**
 * The visible half-open `[start, end)` window for the given `view` anchored at
 * `anchor`, honouring `weekStartsOn` for week-based views.
 */
export function visibleRangeFor(view: SchedulerView, anchor: Date, weekStartsOn: WeekStart = 0): DateRange {
  switch (view) {
    case 'day': {
      const start = startOfDay(anchor);
      return { start, end: addDays(start, 1) };
    }
    case 'three-day': {
      const start = startOfDay(anchor);
      return { start, end: addDays(start, 3) };
    }
    case 'week': {
      const start = startOfWeek(anchor, weekStartsOn);
      return { start, end: addDays(start, 7) };
    }
    case 'month': {
      const start = startOfMonth(anchor);
      return { start, end: addMonths(start, 1) };
    }
    case 'year': {
      const start = startOfYear(anchor);
      return { start, end: addYears(start, 1) };
    }
  }
}

/** The number of days a `day`/`three-day` view spans (used for navigation). */
function dayStep(view: SchedulerView): number {
  if (view === 'day') return 1;
  if (view === 'three-day') return 3;
  return 7;
}

/**
 * Step the `anchor` by `direction` (-1 = previous, +1 = next) view units.
 * Day/three-day/week step in days; month/year step in their period.
 */
export function stepAnchor(view: SchedulerView, anchor: Date, direction: -1 | 1): Date {
  switch (view) {
    case 'month': {
      return addMonths(anchor, direction);
    }
    case 'year': {
      return addYears(anchor, direction);
    }
    default: {
      return addDays(anchor, dayStep(view) * direction);
    }
  }
}
