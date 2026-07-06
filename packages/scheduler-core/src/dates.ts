// ─── Date helpers ─────────────────────────────────────────────────────────────
//
// Luxon-backed, framework-agnostic date utilities shared by the recurrence
// expansion, the view range/navigation math, and the event selectors. Kept in
// one isolated module so the same parsing/formatting rules (all-day vs timed,
// local-zone handling) are used everywhere.

import { DateTime } from 'luxon';

import type { RRuleWeekday } from './types';

/** Luxon weekday numbers: Mon=1 … Sun=7. */
export const WEEKDAY_LUXON: Record<RRuleWeekday, number> = {
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
  SU: 7,
};

/** Returns true when the ISO string is a date-only value (YYYY-MM-DD). */
export function isAllDay(iso: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso);
}

/** Parse an ISO datetime/date string to a Luxon DateTime (local zone). */
export function parseDT(iso: string): DateTime {
  return DateTime.fromISO(iso, { zone: 'local' });
}

/** Parse an ISO datetime/date string to a JS Date (for public API compatibility). */
export function parseDate(iso: string): Date {
  return parseDT(iso).toJSDate();
}

/** Format a Luxon DateTime back to the same ISO representation as the source string. */
export function fmtLike(source: string, dt: DateTime): string {
  if (isAllDay(source)) {
    return dt.toFormat('yyyy-MM-dd');
  }
  return dt.toISO() ?? dt.toJSDate().toISOString();
}

/**
 * Returns the day-key for an ISO string — YYYY-MM-DD in local time.
 * Used for EXDATE / RDATE matching regardless of time component.
 */
export function dayKey(iso: string): string {
  return parseDT(iso).toFormat('yyyy-MM-dd');
}

/** Start of the day for a JS Date (local zone). */
export function startOfDay(date: Date): Date {
  return DateTime.fromJSDate(date, { zone: 'local' }).startOf('day').toJSDate();
}

/** Add `days` to a JS Date (local zone). */
export function addDays(date: Date, days: number): Date {
  return DateTime.fromJSDate(date, { zone: 'local' }).plus({ days }).toJSDate();
}

/** Add `months` to a JS Date (local zone). */
export function addMonths(date: Date, months: number): Date {
  return DateTime.fromJSDate(date, { zone: 'local' }).plus({ months }).toJSDate();
}

/** Add `years` to a JS Date (local zone). */
export function addYears(date: Date, years: number): Date {
  return DateTime.fromJSDate(date, { zone: 'local' }).plus({ years }).toJSDate();
}

/**
 * Start of the week containing `date`, honouring `weekStartsOn`
 * (0 = Sunday … 6 = Saturday, matching `Date.getDay()`).
 */
export function startOfWeek(date: Date, weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 0): Date {
  const dt = DateTime.fromJSDate(date, { zone: 'local' });
  // Luxon weekday: Mon=1…Sun=7. Convert weekStartsOn (0=Sun) to Luxon scale.
  const luxonStart = weekStartsOn === 0 ? 7 : weekStartsOn; // 0→7, 1→1, …6→6
  const luxonDow = dt.weekday; // 1–7
  const offset = (luxonDow - luxonStart + 7) % 7;
  return dt.minus({ days: offset }).startOf('day').toJSDate();
}

/** Start of the month containing `date` (local zone). */
export function startOfMonth(date: Date): Date {
  return DateTime.fromJSDate(date, { zone: 'local' }).startOf('month').toJSDate();
}

/** Start of the year containing `date` (local zone). */
export function startOfYear(date: Date): Date {
  return DateTime.fromJSDate(date, { zone: 'local' }).startOf('year').toJSDate();
}
