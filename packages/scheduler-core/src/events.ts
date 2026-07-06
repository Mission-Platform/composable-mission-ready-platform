// ─── Event selectors, mutations, duration & layout ────────────────────────────
//
// Pure, framework-agnostic helpers operating on plain {@link VEvent} lists: the
// range/day selectors (expanding recurrences), the create/move/resize math, a
// human-readable duration, and the time-grid column-collision layout. Shared by
// the Vue `useScheduler` and the JSX scheduler so both behave identically.

import { DateTime, Duration } from 'luxon';
import { nanoid } from 'nanoid';

import { fmtLike, isAllDay, parseDate, parseDT, startOfDay, addDays as addDaysHelper } from './dates';
import { expandRecurrences } from './recurrence';

import type { SchedulerEventSlot, VEvent } from './types';

/**
 * Returns events (including recurring occurrences) that overlap with the given
 * date range [start, end).  Events with `status === 'CANCELLED'` are excluded.
 * Recurring events are expanded via their RRULE / RDATE; EXDATE exclusions are
 * honoured.
 */
export function eventsForRange(events: VEvent[], start: Date, end: Date): VEvent[] {
  const result: VEvent[] = [];

  for (const event of events) {
    if (event.status === 'CANCELLED') continue;

    if (event.rrule || (event.rdates && event.rdates.length > 0)) {
      // Recurring — expand all occurrences within the range
      result.push(...expandRecurrences(event, start, end));
    } else {
      // Non-recurring — simple overlap check
      const s = parseDate(event.dtstart);
      const en = parseDate(event.dtend);
      if (s < end && en > start) result.push(event);
    }
  }

  return result;
}

/** Returns events that fall on the given calendar day. */
export function eventsForDay(events: VEvent[], day: Date): VEvent[] {
  const s = startOfDay(day);
  const end = addDaysHelper(s, 1);
  return eventsForRange(events, s, end);
}

/**
 * Build a brand-new {@link VEvent} from a partial (without `uid`/`dtstamp`),
 * generating a UID and the creation/modification timestamps.
 */
export function createEvent(partial: Omit<VEvent, 'uid' | 'dtstamp'>): VEvent {
  const uid = nanoid();
  const now = new Date().toISOString();
  return { ...partial, uid, dtstamp: now, created: now, lastModified: now };
}

/**
 * Apply a patch to an event, bumping `lastModified` and `sequence` (the standard
 * RFC 5545 revision semantics). `uid` is preserved.
 */
export function applyEventPatch(event: VEvent, patch: Partial<Omit<VEvent, 'uid'>>): VEvent {
  return {
    ...event,
    ...patch,
    uid: event.uid,
    lastModified: new Date().toISOString(),
    sequence: (event.sequence ?? 0) + 1,
  };
}

/**
 * The `{ dtstart, dtend }` patch that moves an event by `deltaMs` milliseconds,
 * preserving its all-day / timed ISO representation.
 */
export function moveEventPatch(event: VEvent, deltaMs: number): Pick<VEvent, 'dtstart' | 'dtend'> {
  const newStart = parseDT(event.dtstart).plus({ milliseconds: deltaMs });
  const newEnd = parseDT(event.dtend).plus({ milliseconds: deltaMs });
  return {
    dtstart: fmtLike(event.dtstart, newStart),
    dtend: fmtLike(event.dtend, newEnd),
  };
}

/**
 * The `{ dtend }` patch that resizes an event's end by `deltaMs`, clamped so the
 * event stays at least 15 minutes (or one day, for all-day events) long.
 */
export function resizeEventPatch(event: VEvent, deltaMs: number): Pick<VEvent, 'dtend'> {
  const allDay = isAllDay(event.dtend);
  const startMillis = parseDT(event.dtstart).toMillis();
  const minDuration = allDay ? Duration.fromObject({ days: 1 }).toMillis() : 15 * 60 * 1000;
  const newEndMillis = Math.max(parseDT(event.dtend).toMillis() + deltaMs, startMillis + minDuration);
  const newEnd = DateTime.fromMillis(newEndMillis, { zone: 'local' });
  return { dtend: fmtLike(event.dtend, newEnd) };
}

/** Returns a human-readable duration string for an event, e.g. "1h 30m". */
export function formatDuration(event: VEvent): string {
  const ms = parseDT(event.dtend).toMillis() - parseDT(event.dtstart).toMillis();
  if (ms <= 0) return '0m';
  const dur = Duration.fromMillis(ms).shiftTo('hours', 'minutes');
  const hours = Math.floor(dur.hours);
  const minutes = Math.round(dur.minutes);
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/**
 * Lay out events for a single day using a simple column-based collision
 * algorithm: each event is placed in the leftmost column it doesn't overlap,
 * and each occupies `column` of `totalColumns` parallel tracks.
 */
export function layoutDay(events: VEvent[]): SchedulerEventSlot[] {
  // eslint-disable-next-line unicorn/no-array-sort
  const sorted = [...events].sort((a, b) => new Date(a.dtstart).getTime() - new Date(b.dtstart).getTime());

  const columns: VEvent[][] = [];

  for (const event of sorted) {
    const eventStart = new Date(event.dtstart).getTime();

    let placed = false;
    for (const col of columns) {
      const last = col.at(-1)!;
      if (new Date(last.dtend).getTime() <= eventStart) {
        col.push(event);
        placed = true;
        break;
      }
    }
    if (!placed) columns.push([event]);
  }

  // Second pass: determine totalColumns for each event's time window
  return sorted.map((event) => {
    const eventStart = new Date(event.dtstart).getTime();
    const eventEnd = new Date(event.dtend).getTime();

    const eventColumns = columns.filter((col) =>
      col.some((other) => {
        const s = new Date(other.dtstart).getTime();
        const en = new Date(other.dtend).getTime();
        return s < eventEnd && en > eventStart;
      }),
    );

    const colIndex = columns.findIndex((col) => col.includes(event));

    return {
      event,
      column: colIndex,
      totalColumns: eventColumns.length,
    };
  });
}
