/**
 * Framework-agnostic date/time helpers shared by the date/time picker
 * components (`forge-date-input`, `forge-date-range-input`,
 * `forge-date-time-range-input`, `forge-time-input`, `forge-time-range-input`).
 *
 * This module imports **no** neutral/JSX primitives, so
 * `@mission-platform/vite-plugin-forge` copies it verbatim into both the React
 * and Vue generated trees (the `location.ts`/`phone.ts` precedent). It holds the
 * parse/format/clamp/range logic the SFCs kept inline, so each picker stays a
 * thin presentational shell over `ForgeCalendar` + native scroll lists.
 */

export {
  browserTimezoneLabel,
  clamp,
  displayTime,
  formatDateRange,
  formatDateTime,
  formatTime,
  formatTimeRange,
  HOURS,
  MINUTES,
  pad,
  parseDate,
  parseDateTime,
  parseTime,
  range,
  SECONDS,
  type DateRange,
  type DateTimeRange,
  type TimeParts,
  type TimeRange,
  type TimezoneMode,
} from '@mission-platform/components';
