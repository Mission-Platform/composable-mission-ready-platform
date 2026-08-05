// ─── RFC 5545 (iCalendar) event model ────────────────────────────────────────
// https://www.rfc-editor.org/rfc/rfc5545
//
// This model lives in `@mission-platform/scheduler-core` so the Vue
// `@mission-platform/components` ForgeScheduler and the write-once
// `@mission-platform/components` ForgeScheduler share one definition (parity
// by construction).

/** Recurrence frequency as defined in RFC 5545 § 3.3.10 */
export type RRuleFreq = 'SECONDLY' | 'MINUTELY' | 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

/** Days of the week used in RRULE BYDAY values (RFC 5545 § 3.3.10) */
export type RRuleWeekday = 'SU' | 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA';

/**
 * Subset of RRULE properties (RFC 5545 § 3.8.5.3) used for event recurrence.
 * All properties are optional; absence means the rule is unbounded / uses defaults.
 */
export interface RRule {
  /** Recurrence frequency (required when RRULE is present). */
  freq: RRuleFreq;
  /** Number of occurrences after which the recurrence ends. */
  count?: number;
  /** UTC datetime string (ISO 8601) after which the recurrence ends. */
  until?: string;
  /** Interval between recurrences (default: 1). */
  interval?: number;
  /** Specific day-of-week constraints, e.g. ["MO", "WE", "FR"]. */
  byday?: RRuleWeekday[];
  /** Month day numbers (1-31) for MONTHLY/YEARLY rules. */
  bymonthday?: number[];
  /** Month numbers (1-12) for YEARLY rules. */
  bymonth?: number[];
  /** Set-position filter (RFC 5545 § 3.8.5.3, BYSETPOS). */
  bysetpos?: number[];
}

/**
 * RFC 5545 STATUS property values for a VEVENT.
 * https://www.rfc-editor.org/rfc/rfc5545#section-3.8.1.11
 */
export type VEventStatus = 'TENTATIVE' | 'CONFIRMED' | 'CANCELLED';

/**
 * RFC 5545 CLASS (classification) property values.
 * https://www.rfc-editor.org/rfc/rfc5545#section-3.8.1.3
 */
export type VEventClass = 'PUBLIC' | 'PRIVATE' | 'CONFIDENTIAL';

/**
 * RFC 5545 TRANSP (time transparency) property values.
 * https://www.rfc-editor.org/rfc/rfc5545#section-3.8.2.7
 */
export type VEventTransp = 'OPAQUE' | 'TRANSPARENT';

/**
 * A single attendee as per RFC 5545 ATTENDEE property.
 * https://www.rfc-editor.org/rfc/rfc5545#section-3.8.4.1
 */
export interface VEventAttendee {
  /** CAL-ADDRESS (mailto: URI) of the attendee. */
  calAddress: string;
  /** Display name (CN parameter). */
  cn?: string;
  /** Participation role: CHAIR, REQ-PARTICIPANT, OPT-PARTICIPANT, NON-PARTICIPANT */
  role?: 'CHAIR' | 'REQ-PARTICIPANT' | 'OPT-PARTICIPANT' | 'NON-PARTICIPANT';
  /** Participation status: NEEDS-ACTION, ACCEPTED, DECLINED, TENTATIVE, DELEGATED */
  partstat?: 'NEEDS-ACTION' | 'ACCEPTED' | 'DECLINED' | 'TENTATIVE' | 'DELEGATED';
}

/**
 * VALARM component embedded in a VEVENT (RFC 5545 § 3.6.6).
 * Simplified to the most common trigger-before-event alarm.
 */
export interface VAlarm {
  /** Alarm action: AUDIO, DISPLAY, EMAIL */
  action: 'AUDIO' | 'DISPLAY' | 'EMAIL';
  /** ISO 8601 duration string (e.g. "-PT15M" = 15 min before). */
  trigger: string;
  /** Human-readable description (required for DISPLAY / EMAIL). */
  description?: string;
}

/**
 * Core VEVENT record modelled after RFC 5545 § 3.6.1.
 *
 * All datetime strings are ISO 8601 (extended format).  All-day events use
 * date-only strings (YYYY-MM-DD); timed events use full datetime strings
 * (YYYY-MM-DDTHH:mm:ss[Z|±HH:mm]).
 */
export interface VEvent {
  // ── Required ──────────────────────────────────────────────────────────────────
  /** RFC 5545 UID — unique identifier (e.g. nanoid or UUID). */
  uid: string;
  /** DTSTART — event start datetime/date (ISO 8601). */
  dtstart: string;
  /** DTEND — event end datetime/date (ISO 8601, exclusive). */
  dtend: string;
  /** DTSTAMP — UTC creation/update timestamp (ISO 8601). */
  dtstamp: string;

  // ── Descriptive ───────────────────────────────────────────────────────────────
  /** SUMMARY — short title shown on the event chip. */
  summary?: string;
  /** DESCRIPTION — full rich-text body of the event. */
  description?: string;
  /** LOCATION — physical or virtual meeting location. */
  location?: string;
  /** URL — a resource associated with the event. */
  url?: string;
  /** COLOR — display colour (CSS colour value; not a formal RFC 5545 property but widely used). */
  color?: string;

  // ── Classification ────────────────────────────────────────────────────────────
  /** CLASS — access classification (PUBLIC | PRIVATE | CONFIDENTIAL). */
  classification?: VEventClass;
  /** STATUS — event status (TENTATIVE | CONFIRMED | CANCELLED). */
  status?: VEventStatus;
  /** TRANSP — whether the event blocks time (OPAQUE) or is transparent (TRANSPARENT). */
  transp?: VEventTransp;
  /** PRIORITY — 0 (undefined) through 9; 1 = highest. */
  priority?: number;

  // ── Participation ─────────────────────────────────────────────────────────────
  /** ORGANIZER — CAL-ADDRESS of the event organiser. */
  organizer?: string;
  /** ATTENDEE list. */
  attendees?: VEventAttendee[];

  // ── Recurrence ────────────────────────────────────────────────────────────────
  /** RRULE — recurrence rule. */
  rrule?: RRule;
  /** RDATE — additional recurrence dates (ISO 8601 strings). */
  rdates?: string[];
  /** EXDATE — exception dates excluded from recurrence (ISO 8601 strings). */
  exdates?: string[];
  /** RECURRENCE-ID — ISO 8601 datetime identifying which recurrence instance this overrides. */
  recurrenceId?: string;
  /** UID of the master event this instance belongs to (internal helper). */
  masterUid?: string;

  // ── Alarm ─────────────────────────────────────────────────────────────────────
  /** VALARM components embedded in this event. */
  alarms?: VAlarm[];

  // ── Timestamps ────────────────────────────────────────────────────────────────
  /** CREATED — UTC datetime this event was first created (ISO 8601). */
  created?: string;
  /** LAST-MODIFIED — UTC datetime of last modification (ISO 8601). */
  lastModified?: string;
  /** SEQUENCE — monotonically increasing revision number. */
  sequence?: number;
}

/** Calendar view modes available in ForgeScheduler. */
export type SchedulerView = 'day' | 'three-day' | 'week' | 'month' | 'year';

/** The first day a week-based view starts on (0 = Sunday … 6 = Saturday). */
export type WeekStart = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Minimal internal representation of an event as it appears on the grid.
 * Derived from VEvent; used by view sub-components for rendering.
 */
export interface SchedulerEventSlot {
  /** Source VEvent. */
  event: VEvent;
  /** Column index within the day (for collision layout). */
  column: number;
  /** Total number of overlapping columns for this event group. */
  totalColumns: number;
}

/** A half-open date range `[start, end)`. */
export interface DateRange {
  start: Date;
  end: Date;
}
