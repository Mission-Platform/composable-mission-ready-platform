import { describe, expect, it } from 'vitest';

import { dayKey } from './dates';
import { expandRecurrences } from './recurrence';

import type { VEvent } from './types';

/** Build a timed VEvent with a one-hour duration starting at `dtstart`. */
function timed(dtstart: string, dtend: string, extra: Partial<VEvent> = {}): VEvent {
  return { uid: 'e1', dtstamp: '2024-01-01T00:00:00Z', dtstart, dtend, ...extra };
}

const RANGE_START = new Date('2024-01-01T00:00:00');
const RANGE_END = new Date('2024-04-01T00:00:00');

describe('expandRecurrences', () => {
  it('expands a DAILY rule bounded by COUNT', () => {
    const event = timed('2024-01-01T09:00:00', '2024-01-01T10:00:00', { rrule: { freq: 'DAILY', count: 5 } });
    const occ = expandRecurrences(event, RANGE_START, RANGE_END);
    expect(occ).toHaveLength(5);
    expect(occ.map((o) => dayKey(o.dtstart))).toEqual([
      '2024-01-01',
      '2024-01-02',
      '2024-01-03',
      '2024-01-04',
      '2024-01-05',
    ]);
    // Every occurrence references the master.
    expect(occ.every((o) => o.masterUid === 'e1')).toBe(true);
  });

  it('honours INTERVAL on a DAILY rule', () => {
    const event = timed('2024-01-01T09:00:00', '2024-01-01T10:00:00', { rrule: { freq: 'DAILY', interval: 3, count: 3 } });
    expect(expandRecurrences(event, RANGE_START, RANGE_END).map((o) => dayKey(o.dtstart))).toEqual([
      '2024-01-01',
      '2024-01-04',
      '2024-01-07',
    ]);
  });

  it('expands a WEEKLY+BYDAY rule onto the listed weekdays', () => {
    // 2024-01-01 is a Monday.
    const event = timed('2024-01-01T09:00:00', '2024-01-01T10:00:00', {
      rrule: { freq: 'WEEKLY', byday: ['MO', 'WE', 'FR'], count: 6 },
    });
    const keys = expandRecurrences(event, RANGE_START, RANGE_END).map((o) => dayKey(o.dtstart));
    expect(keys).toEqual(['2024-01-01', '2024-01-03', '2024-01-05', '2024-01-08', '2024-01-10', '2024-01-12']);
  });

  it('stops at UNTIL', () => {
    const event = timed('2024-01-01T09:00:00', '2024-01-01T10:00:00', {
      rrule: { freq: 'DAILY', until: '2024-01-03T23:59:59' },
    });
    expect(expandRecurrences(event, RANGE_START, RANGE_END).map((o) => dayKey(o.dtstart))).toEqual([
      '2024-01-01',
      '2024-01-02',
      '2024-01-03',
    ]);
  });

  it('skips EXDATE occurrences', () => {
    const event = timed('2024-01-01T09:00:00', '2024-01-01T10:00:00', {
      rrule: { freq: 'DAILY', count: 4 },
      exdates: ['2024-01-02'],
    });
    expect(expandRecurrences(event, RANGE_START, RANGE_END).map((o) => dayKey(o.dtstart))).toEqual([
      '2024-01-01',
      '2024-01-03',
      '2024-01-04',
    ]);
  });

  it('adds RDATE occurrences (even without an RRULE)', () => {
    const event = timed('2024-01-01T09:00:00', '2024-01-01T10:00:00', { rdates: ['2024-02-14T09:00:00'] });
    const occ = expandRecurrences(event, RANGE_START, RANGE_END);
    expect(occ.map((o) => dayKey(o.dtstart))).toEqual(['2024-02-14']);
  });

  it('expands a MONTHLY rule pinned by BYMONTHDAY, skipping months without that day', () => {
    // Day 31 only exists in Jan / Mar within the range (Feb is skipped).
    const event = timed('2024-01-31T09:00:00', '2024-01-31T10:00:00', {
      rrule: { freq: 'MONTHLY', bymonthday: [31], count: 2 },
    });
    expect(expandRecurrences(event, RANGE_START, RANGE_END).map((o) => dayKey(o.dtstart))).toEqual([
      '2024-01-31',
      '2024-03-31',
    ]);
  });
});
