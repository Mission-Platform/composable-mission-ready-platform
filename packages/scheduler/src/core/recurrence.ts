// ─── RFC 5545 RRULE expansion ─────────────────────────────────────────────────
//
// Framework-agnostic expansion of a recurring {@link VEvent} into the concrete
// occurrences that overlap a query range, honouring RRULE (FREQ/INTERVAL/COUNT/
// UNTIL/BYDAY/BYMONTHDAY/BYMONTH), RDATE (extra dates), and EXDATE (exclusions).
// Pure and Luxon-backed so it can be unit-tested in isolation and reused by both
// the Vue and the JSX scheduler.

import { DateTime } from 'luxon';

import { dayKey, fmtLike, isAllDay, parseDT, WEEKDAY_LUXON } from './dates';

import type { RRule, VEvent } from './types';

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
export function expandRecurrences(event: VEvent, rangeStart: Date, rangeEnd: Date): VEvent[] {
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
