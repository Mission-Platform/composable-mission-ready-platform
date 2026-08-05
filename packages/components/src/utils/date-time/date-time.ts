/**
 * Framework-agnostic date/time helpers shared by the date/time picker
 * components (`base-date-input`, `base-date-range-input`,
 * `base-date-time-range-input`, `base-time-input`, `base-time-range-input`).
 *
 * This module imports **no** neutral/JSX primitives, so
 * `@mission-platform/vite-plugin-forge` copies it verbatim into both the React
 * and Vue generated trees (the `location.ts`/`phone.ts` precedent). It holds the
 * parse/format/clamp/range logic the SFCs kept inline, so each picker stays a
 * thin presentational shell over `BaseCalendar` + native scroll lists.
 */

/** A `{ start, end }` ISO-date range (`YYYY-MM-DD`). */
export interface DateRange {
  start: string;
  end: string;
}

/** A `{ start, end }` time range (`HH:MM` or `HH:MM:SS`). */
export interface TimeRange {
  start: string;
  end: string;
}

/** Whether a date-time range is interpreted in the browser zone or UTC. */
export type TimezoneMode = 'browser' | 'utc';

/** A `{ start, end, timezone }` date-time range (`YYYY-MM-DD HH:MM[:SS]`). */
export interface DateTimeRange {
  start: string;
  end: string;
  timezone: TimezoneMode;
}

/** The hour/minute/second components of a parsed time. */
export interface TimeParts {
  h: number;
  m: number;
  s: number;
}

/** Zero-pad a number to two digits. */
export function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Clamp a number into the inclusive `[min, max]` range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** `[0, 1, …, length - 1]`. */
export function range(length: number): number[] {
  return Array.from({ length }, (_, index) => index);
}

/** The selectable hour (0–23), minute (0–59), and second (0–59) lists. */
export const HOURS: readonly number[] = range(24);
export const MINUTES: readonly number[] = range(60);
export const SECONDS: readonly number[] = range(60);

/** Parse an `HH:MM[:SS]` string into its hour/minute/second components. */
export function parseTime(value: string): TimeParts {
  const parts = value ? value.split(':') : [];
  return {
    h: parts[0] ? Number.parseInt(parts[0], 10) || 0 : 0,
    m: parts[1] ? Number.parseInt(parts[1], 10) || 0 : 0,
    s: parts[2] ? Number.parseInt(parts[2], 10) || 0 : 0,
  };
}

/** Format hour/minute(/second) components into `HH:MM` or `HH:MM:SS`. */
export function formatTime(parts: TimeParts, withSeconds: boolean): string {
  return withSeconds ? `${pad(parts.h)}:${pad(parts.m)}:${pad(parts.s)}` : `${pad(parts.h)}:${pad(parts.m)}`;
}

/** Normalise a stored time string to the configured precision (empty stays empty). */
export function displayTime(value: string, withSeconds: boolean): string {
  if (!value) {
    return '';
  }
  return formatTime(parseTime(value), withSeconds);
}

/** Parse a `YYYY-MM-DD` ISO date string into a `Date` (local midnight), or `undefined`. */
export function parseDate(value: string): Date | undefined {
  if (!value) {
    return undefined;
  }
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** Split a `YYYY-MM-DD HH:MM[:SS]` (or ISO `T`/`Z`) string into a date + time parts. */
export function parseDateTime(value: string): { date: string } & TimeParts {
  if (!value) {
    return { date: '', h: 0, m: 0, s: 0 };
  }
  const [datePart, timePart] = value.includes('T') ? value.split('T') : value.split(' ');
  const time = parseTime((timePart ?? '').replace('Z', ''));
  return { date: datePart ?? '', ...time };
}

/** Join a `YYYY-MM-DD` date and time parts into a `YYYY-MM-DD HH:MM[:SS]` string. */
export function formatDateTime(date: string, parts: TimeParts, withSeconds: boolean): string {
  if (!date) {
    return '';
  }
  return `${date} ${formatTime(parts, withSeconds)}`;
}

/** The IANA name of the browser timezone, or `'Local'` when unavailable. */
export function browserTimezoneLabel(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'Local';
  }
}

/** Format an ISO date range into a `start → end` summary (empty parts collapse). */
export function formatDateRange(value: DateRange | undefined): string {
  const start = value?.start ?? '';
  const end = value?.end ?? '';
  if (!start && !end) {
    return '';
  }
  return `${start || '…'} → ${end || '…'}`;
}

/** Format a time range into a `start → end` summary at the configured precision. */
export function formatTimeRange(value: TimeRange | undefined, withSeconds: boolean): string {
  const start = displayTime(value?.start ?? '', withSeconds);
  const end = displayTime(value?.end ?? '', withSeconds);
  if (!start && !end) {
    return '';
  }
  return `${start || '…'} → ${end || '…'}`;
}
