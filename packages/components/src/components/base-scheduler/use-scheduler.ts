import { DateTime, Duration } from 'luxon';
import { nanoid } from 'nanoid';
import { computed, ref } from 'vue';

import type { RRule, RRuleWeekday, SchedulerView, VEvent } from './types';

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Returns true when the ISO string is a date-only value (YYYY-MM-DD). */
function isAllDay(iso: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso);
}

/** Parse an ISO datetime/date string to a Luxon DateTime (local zone). */
function parseDT(iso: string): DateTime {
  if (isAllDay(iso)) {
    return DateTime.fromISO(iso, { zone: 'local' });
  }
  return DateTime.fromISO(iso, { zone: 'local' });
}

/** Parse an ISO datetime/date string to a JS Date (for public API compatibility). */
function parseDate(iso: string): Date {
  return parseDT(iso).toJSDate();
}

// ─── RFC 5545 RRule expansion ─────────────────────────────────────────────────

/** Luxon weekday numbers: Mon=1 … Sun=7 */
const WEEKDAY_LUXON: Record<RRuleWeekday, number> = {
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
  SU: 7,
};

/** Format a Luxon DateTime back to the same ISO representation as the source string. */
function fmtLike(source: string, dt: DateTime): string {
  if (isAllDay(source)) {
    return dt.toFormat('yyyy-MM-dd');
  }
  return dt.toISO() ?? dt.toJSDate().toISOString();
}

/**
 * Returns the day-key for an ISO string — YYYY-MM-DD in local time.
 * Used for EXDATE / RDATE matching regardless of time component.
 */
function dayKey(iso: string): string {
  return parseDT(iso).toFormat('yyyy-MM-dd');
}

/**
 * Advance a candidate DateTime by one recurrence step according to `rrule`.
 *
 * For WEEKLY rules with a BYDAY list we advance day-by-day; the BYDAY filter
 * in the expansion loop then selects valid days.  For WEEKLY without BYDAY we
 * jump by 7 × interval.  All other frequencies advance by interval units of
 * their respective period.
 */
function advanceByFreq(dt: DateTime, rrule: RRule, byDayStep: boolean = false): DateTime {
  const interval = rrule.interval ?? 1;
  switch (rrule.freq) {
    case 'DAILY': {
      return dt.plus({ days: interval });
    }
    case 'WEEKLY': {
      return byDayStep ? dt.plus({ days: 1 }) : dt.plus({ weeks: interval });
    }
    case 'MONTHLY': {
      return dt.plus({ months: interval });
    }
    case 'YEARLY': {
      return dt.plus({ years: interval });
    }
    default: {
      // SECONDLY / MINUTELY / HOURLY — advance by 1 day as a safety fallback
      return dt.plus({ days: 1 });
    }
  }
}

/**
 * Expand a single VEvent with an RRULE into all occurrences that overlap
 * with [rangeStart, rangeEnd).  Returns virtual VEvent clones — one per
 * occurrence — with adjusted dtstart / dtend.
 *
 * Also handles RDATE (extra dates) and EXDATE (excluded dates).
 *
 * Safety cap: stops after 3 650 occurrences (~10 years of daily events) to
 * prevent infinite loops on unbounded rules.
 */
function expandRecurrences(event: VEvent, rangeStart: Date, rangeEnd: Date): VEvent[] {
  const rrule = event.rrule;

  const startDT = parseDT(event.dtstart);
  const endDT = parseDT(event.dtend);
  const durationMs = endDT.toMillis() - startDT.toMillis();

  const rangeLuxonStart = DateTime.fromJSDate(rangeStart, { zone: 'local' });
  const rangeLuxonEnd = DateTime.fromJSDate(rangeEnd, { zone: 'local' });

  // Build excluded day-key set from EXDATE list
  const excludedKeys = new Set<string>((event.exdates ?? []).map((d) => dayKey(d)));

  // Build extra occurrence DateTimes from RDATE list
  const rdateDTs: DateTime[] = (event.rdates ?? []).filter((r) => !excludedKeys.has(dayKey(r))).map((r) => parseDT(r));

  const results: VEvent[] = [];

  // ── RDATE extra occurrences (may exist even without RRULE) ──────────────────
  for (const rd of rdateDTs) {
    const occEnd = rd.plus({ milliseconds: durationMs });
    if (rd < rangeLuxonEnd && occEnd > rangeLuxonStart) {
      results.push({
        ...event,
        dtstart: fmtLike(event.dtstart, rd),
        dtend: fmtLike(event.dtend, occEnd),
        recurrenceId: fmtLike(event.dtstart, rd),
        masterUid: event.uid,
      });
    }
  }

  if (!rrule) return results;

  const until = rrule.until ? parseDT(rrule.until) : undefined;
  const maxCount = rrule.count ?? 3650;
  const MAX_SAFETY = 3650;

  /**
   * Whether we are iterating day-by-day through a WEEKLY+BYDAY rule.
   * In this mode the advance step is always 1 day; the BYDAY check selects
   * valid days.  When we fall off the end of the current week-interval window
   * we jump to the start of the next interval window.
   */
  const weeklyByday = rrule.freq === 'WEEKLY' && rrule.byday && rrule.byday.length > 0;

  /**
   * Whether this is a DAILY rule with a BYDAY filter (e.g. weekdays only).
   * RFC 5545 §3.3.10: BYDAY on a DAILY rule limits which days of the week
   * the rule fires on.  We advance day-by-day and skip non-matching weekdays.
   */
  const dailyByday = rrule.freq === 'DAILY' && rrule.byday && rrule.byday.length > 0;

  let occurrenceIndex = 0;
  let candidate: DateTime = parseDT(event.dtstart);

  // Track the start of the current week-interval window for WEEKLY+BYDAY rules
  let weekWindowStart: DateTime | undefined = weeklyByday ? parseDT(event.dtstart) : undefined;

  while (occurrenceIndex < maxCount && occurrenceIndex < MAX_SAFETY) {
    // Terminate if past UNTIL
    if (until && candidate > until) break;

    // For WEEKLY+BYDAY: check if candidate has drifted past the current week window
    if (weeklyByday && weekWindowStart !== undefined) {
      const weekInterval = rrule.interval ?? 1;
      const windowEnd = weekWindowStart.plus({ weeks: weekInterval });
      if (candidate >= windowEnd) {
        // Jump to start of next week-interval window
        weekWindowStart = windowEnd;
        candidate = windowEnd;
        continue;
      }

      // Check BYDAY filter (Luxon weekday: Mon=1…Sun=7)
      const candidateDow = candidate.weekday;
      if (!rrule.byday!.some((wd) => WEEKDAY_LUXON[wd] === candidateDow)) {
        candidate = advanceByFreq(candidate, rrule, true);
        continue;
      }
    }

    // For DAILY+BYDAY: skip days whose weekday is not listed in BYDAY
    if (dailyByday) {
      const candidateDow = candidate.weekday;
      if (!rrule.byday!.some((wd) => WEEKDAY_LUXON[wd] === candidateDow)) {
        candidate = advanceByFreq(candidate, rrule);
        continue;
      }
    }

    // Check BYMONTHDAY filter (used with MONTHLY / YEARLY)
    if (rrule.bymonthday && rrule.bymonthday.length > 0 && !rrule.bymonthday.includes(candidate.day)) {
      // The candidate may have landed here via Luxon's month-overflow (e.g.
      // Jan 31 + 1 month = Mar 3 in Luxon when Feb has no day 31).  Jump to
      // the first day of the candidate's month, advance one period, and try
      // pinning to the target day.  If the result overflows again (i.e. the
      // new month also lacks that day) this loop will run again until we find
      // a month that actually has the target day, or until COUNT/UNTIL fires.
      const targetDay = rrule.bymonthday[0];
      const periodsToAdvance = rrule.freq === 'YEARLY' ? (rrule.interval ?? 1) * 12 : (rrule.interval ?? 1);
      const nextMonthStart = candidate.startOf('month').plus({ months: periodsToAdvance });
      const attempt = nextMonthStart.set({ day: targetDay });
      // If Luxon overflowed (e.g. Feb 31 → Mar 3), the day won't match.
      // In that case try the very same month as nextMonthStart directly.
      candidate = attempt.day === targetDay ? attempt : nextMonthStart.plus({ months: 1 }).set({ day: targetDay });
      continue;
    }

    // Check BYMONTH filter (used with YEARLY)
    if (rrule.bymonth && rrule.bymonth.length > 0 && !rrule.bymonth.includes(candidate.month)) {
      // Find the next month in the bymonth list that is after the candidate month,
      // within the current year, or roll over to the first in the following year.
      const sorted = [...rrule.bymonth].toSorted((a, b) => a - b);
      const nextMonth = sorted.find((m) => m > candidate.month);
      if (nextMonth === undefined) {
        const yearInterval = rrule.interval ?? 1;
        candidate = candidate.plus({ years: yearInterval }).set({ month: sorted[0], day: parseDT(event.dtstart).day });
      } else {
        candidate = candidate.set({ month: nextMonth, day: parseDT(event.dtstart).day });
      }
      continue;
    }

    const occKey = isAllDay(event.dtstart)
      ? fmtLike(event.dtstart, candidate)
      : dayKey(fmtLike(event.dtstart, candidate));

    occurrenceIndex += 1;

    // Skip EXDATEs (don't count as occurrence — consistent with most iCal implementations)
    if (!excludedKeys.has(occKey)) {
      const occEnd = candidate.plus({ milliseconds: durationMs });

      // Only include if overlaps with requested range
      if (candidate < rangeLuxonEnd && occEnd > rangeLuxonStart) {
        results.push({
          ...event,
          dtstart: fmtLike(event.dtstart, candidate),
          dtend: fmtLike(event.dtend, occEnd),
          recurrenceId: fmtLike(event.dtstart, candidate),
          masterUid: event.uid,
        });
      }

      // Early exit once we've gone past the query range
      if (candidate >= rangeLuxonEnd) break;
    }

    // Advance to next candidate
    candidate = weeklyByday || dailyByday ? advanceByFreq(candidate, rrule, true) : advanceByFreq(candidate, rrule);
  }

  return results;
}

// ─── Composable ───────────────────────────────────────────────────────────────

/**
 * `useScheduler` — reactive store + helpers for the BaseScheduler component.
 *
 * Provides:
 *  - `events`  — reactive array of {@link VEvent} records
 *  - `view`    — current calendar view mode
 *  - `anchor`  — the "focus" date for the current view (start of the visible range)
 *  - CRUD helpers: `addEvent`, `updateEvent`, `removeEvent`
 *  - Navigation helpers: `prev`, `next`, `goToToday`, `goToDate`
 *  - Computed selectors: `eventsForRange`, `eventsForDay`
 */
export function useScheduler(initialEvents: VEvent[] = [], weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 0) {
  // ── State ──────────────────────────────────────────────────────────────────

  const events = ref<VEvent[]>(initialEvents);
  const view = ref<SchedulerView>('week');

  /** Anchor date — the first day of the currently visible window. */
  const anchor = ref<Date>(startOfDay(new Date()));

  // ── Date utilities (Luxon-backed) ──────────────────────────────────────────

  function startOfDay(d: Date): Date {
    return DateTime.fromJSDate(d, { zone: 'local' }).startOf('day').toJSDate();
  }

  function addDays(d: Date, days: number): Date {
    return DateTime.fromJSDate(d, { zone: 'local' }).plus({ days }).toJSDate();
  }

  function addMonths(d: Date, months: number): Date {
    return DateTime.fromJSDate(d, { zone: 'local' }).plus({ months }).toJSDate();
  }

  function addYears(d: Date, years: number): Date {
    return DateTime.fromJSDate(d, { zone: 'local' }).plus({ years }).toJSDate();
  }

  function startOfWeek(d: Date): Date {
    // Convert to Luxon weekday (Mon=1…Sun=7) then compute offset from the
    // configured week-start day (0=Sun…6=Sat, matching JS Date.getDay()).
    const dt = DateTime.fromJSDate(d, { zone: 'local' });
    // Luxon weekday: Mon=1…Sun=7. Convert weekStartsOn (0=Sun) to Luxon scale.
    const luxonStart = weekStartsOn === 0 ? 7 : weekStartsOn; // 0→7, 1→1, …6→6
    const luxonDow = dt.weekday; // 1–7
    const offset = (luxonDow - luxonStart + 7) % 7;
    return dt.minus({ days: offset }).startOf('day').toJSDate();
  }

  function startOfMonth(d: Date): Date {
    return DateTime.fromJSDate(d, { zone: 'local' }).startOf('month').toJSDate();
  }

  function startOfYear(d: Date): Date {
    return DateTime.fromJSDate(d, { zone: 'local' }).startOf('year').toJSDate();
  }

  // ── Computed visible range ─────────────────────────────────────────────────

  const visibleRange = computed((): { start: Date; end: Date } => {
    const a = anchor.value;
    switch (view.value) {
      case 'day': {
        return { start: startOfDay(a), end: addDays(startOfDay(a), 1) };
      }
      case 'three-day': {
        return { start: startOfDay(a), end: addDays(startOfDay(a), 3) };
      }
      case 'week': {
        const s = startOfWeek(a);
        return { start: s, end: addDays(s, 7) };
      }
      case 'month': {
        const s = startOfMonth(a);
        return { start: s, end: addMonths(s, 1) };
      }
      case 'year': {
        const s = startOfYear(a);
        return { start: s, end: addYears(s, 1) };
      }
    }
  });

  // ── Event selectors ────────────────────────────────────────────────────────

  /**
   * Returns events (including recurring occurrences) that overlap with the
   * given date range [start, end).  Events with `status === 'CANCELLED'` are
   * excluded.  Recurring events are expanded via their RRULE / RDATE; EXDATE
   * exclusions are honoured.
   */
  function eventsForRange(start: Date, end: Date): VEvent[] {
    const result: VEvent[] = [];

    for (const event of events.value) {
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

  /**
   * Returns events that fall on the given calendar day.
   */
  function eventsForDay(day: Date): VEvent[] {
    const s = startOfDay(day);
    const end = addDays(s, 1);
    return eventsForRange(s, end);
  }

  /** Events visible in the current view window. */
  const visibleEvents = computed(() => eventsForRange(visibleRange.value.start, visibleRange.value.end));

  // ── CRUD ───────────────────────────────────────────────────────────────────

  /** Creates a new event and appends it to the store. Returns the generated UID. */
  function addEvent(partial: Omit<VEvent, 'uid' | 'dtstamp'>): string {
    const uid = nanoid();
    const now = new Date().toISOString();
    events.value.push({ ...partial, uid, dtstamp: now, created: now, lastModified: now });
    return uid;
  }

  /** Replaces an existing event (matched by UID). Returns true if found. */
  function updateEvent(uid: string, patch: Partial<Omit<VEvent, 'uid'>>): boolean {
    const index = events.value.findIndex((event) => event.uid === uid);
    if (index === -1) return false;
    events.value[index] = {
      ...events.value[index],
      ...patch,
      uid,
      lastModified: new Date().toISOString(),
      sequence: (events.value[index].sequence ?? 0) + 1,
    };
    return true;
  }

  /** Removes an event by UID. Returns true if found and removed. */
  function removeEvent(uid: string): boolean {
    const before = events.value.length;
    events.value = events.value.filter((event) => event.uid !== uid);
    return events.value.length < before;
  }

  /**
   * Moves an event by adjusting dtstart/dtend by a delta in milliseconds.
   * Preserves all-day / timed format.
   */
  function moveEvent(uid: string, deltaMs: number): boolean {
    const event = events.value.find((event_) => event_.uid === uid);
    if (!event) return false;

    const newStart = parseDT(event.dtstart).plus({ milliseconds: deltaMs });
    const newEnd = parseDT(event.dtend).plus({ milliseconds: deltaMs });

    return updateEvent(uid, {
      dtstart: fmtLike(event.dtstart, newStart),
      dtend: fmtLike(event.dtend, newEnd),
    });
  }

  /**
   * Resizes an event's end time by adjusting dtend by a delta in milliseconds.
   * Ensures dtend stays at least 15 minutes after dtstart.
   */
  function resizeEvent(uid: string, deltaMs: number): boolean {
    const event = events.value.find((event_) => event_.uid === uid);
    if (!event) return false;

    const allDay = isAllDay(event.dtend);
    const startMillis = parseDT(event.dtstart).toMillis();
    const minDuration = allDay ? Duration.fromObject({ days: 1 }).toMillis() : 15 * 60 * 1000;
    const newEndMillis = Math.max(parseDT(event.dtend).toMillis() + deltaMs, startMillis + minDuration);
    const newEnd = DateTime.fromMillis(newEndMillis, { zone: 'local' });

    return updateEvent(uid, { dtend: fmtLike(event.dtend, newEnd) });
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  /** Move the anchor backward by one view unit. */
  function previous(): void {
    switch (view.value) {
      case 'day': {
        anchor.value = addDays(anchor.value, -1);
        break;
      }
      case 'three-day': {
        anchor.value = addDays(anchor.value, -3);
        break;
      }
      case 'week': {
        anchor.value = addDays(anchor.value, -7);
        break;
      }
      case 'month': {
        anchor.value = addMonths(anchor.value, -1);
        break;
      }
      case 'year': {
        anchor.value = addYears(anchor.value, -1);
        break;
      }
    }
  }

  /** Move the anchor forward by one view unit. */
  function next(): void {
    switch (view.value) {
      case 'day': {
        anchor.value = addDays(anchor.value, 1);
        break;
      }
      case 'three-day': {
        anchor.value = addDays(anchor.value, 3);
        break;
      }
      case 'week': {
        anchor.value = addDays(anchor.value, 7);
        break;
      }
      case 'month': {
        anchor.value = addMonths(anchor.value, 1);
        break;
      }
      case 'year': {
        anchor.value = addYears(anchor.value, 1);
        break;
      }
    }
  }

  /** Set the anchor to today's date (normalised to start of day). */
  function goToToday(): void {
    anchor.value = startOfDay(new Date());
  }

  /** Set the anchor to a specific date. */
  function goToDate(date: Date): void {
    anchor.value = startOfDay(date);
  }

  /** Switch to a different view and optionally set a new anchor. */
  function setView(newView: SchedulerView, date?: Date): void {
    view.value = newView;
    if (date) anchor.value = startOfDay(date);
  }

  // ── Duration helper ────────────────────────────────────────────────────────

  /**
   * Returns a human-readable duration string for an event, e.g. "1h 30m".
   */
  function formatDuration(event: VEvent): string {
    const ms = parseDT(event.dtend).toMillis() - parseDT(event.dtstart).toMillis();
    if (ms <= 0) return '0m';
    const dur = Duration.fromMillis(ms).shiftTo('hours', 'minutes');
    const hours = Math.floor(dur.hours);
    const minutes = Math.round(dur.minutes);
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  return {
    // State
    events,
    view,
    anchor,
    // Computed
    visibleRange,
    visibleEvents,
    // Selectors
    eventsForRange,
    eventsForDay,
    // CRUD
    addEvent,
    updateEvent,
    removeEvent,
    moveEvent,
    resizeEvent,
    // Navigation
    prev: previous,
    next,
    goToToday,
    goToDate,
    setView,
    // Helpers
    formatDuration,
    // Utilities (exposed for sub-components)
    startOfDay,
    addDays,
    startOfWeek,
    startOfMonth,
    parseDate,
    // Configuration
    weekStartsOn,
  };
}

export type SchedulerInstance = ReturnType<typeof useScheduler>;
