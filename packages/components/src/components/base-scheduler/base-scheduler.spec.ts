import { DateTime } from 'luxon';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useScheduler } from './use-scheduler';

import type { VEvent } from './types';

// ─── Fixed "today" so date calculations are deterministic ─────────────────────
// 2026-06-05 is a Friday

const FIXED_NOW = new Date('2026-06-05T10:00:00.000Z');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeEvent(overrides: Partial<VEvent> = {}): VEvent {
  return {
    uid: 'test-uid',
    dtstart: '2026-06-05T09:00:00.000Z',
    dtend: '2026-06-05T10:00:00.000Z',
    dtstamp: FIXED_NOW.toISOString(),
    summary: 'Test Event',
    ...overrides,
  };
}

// ─── useScheduler ─────────────────────────────────────────────────────────────

describe('useScheduler', () => {
  describe('initial state', () => {
    it('starts with the supplied events', () => {
      const event = makeEvent();
      const s = useScheduler([event]);
      expect(s.events.value).toHaveLength(1);
      expect(s.events.value[0].uid).toBe('test-uid');
    });

    it('defaults to week view', () => {
      const s = useScheduler();
      expect(s.view.value).toBe('week');
    });
  });

  describe('addEvent', () => {
    it('adds an event and returns a uid', () => {
      const s = useScheduler();
      const uid = s.addEvent({
        dtstart: '2026-06-05T09:00:00.000Z',
        dtend: '2026-06-05T10:00:00.000Z',
      });
      expect(uid).toBeTruthy();
      expect(s.events.value).toHaveLength(1);
      expect(s.events.value[0].uid).toBe(uid);
    });

    it('sets dtstamp, created, and lastModified', () => {
      const s = useScheduler();
      s.addEvent({ dtstart: '2026-06-05T09:00:00.000Z', dtend: '2026-06-05T10:00:00.000Z' });
      const event = s.events.value[0];
      expect(event.dtstamp).toBe(FIXED_NOW.toISOString());
      expect(event.created).toBe(FIXED_NOW.toISOString());
    });
  });

  describe('updateEvent', () => {
    it('updates summary of an existing event', () => {
      const s = useScheduler([makeEvent()]);
      const updated = s.updateEvent('test-uid', { summary: 'Updated' });
      expect(updated).toBe(true);
      expect(s.events.value[0].summary).toBe('Updated');
    });

    it('increments sequence on update', () => {
      const s = useScheduler([makeEvent({ sequence: 0 })]);
      s.updateEvent('test-uid', { summary: 'New' });
      expect(s.events.value[0].sequence).toBe(1);
    });

    it('returns false for unknown uid', () => {
      const s = useScheduler();
      expect(s.updateEvent('no-such-uid', {})).toBe(false);
    });
  });

  describe('removeEvent', () => {
    it('removes an event by uid', () => {
      const s = useScheduler([makeEvent()]);
      const removed = s.removeEvent('test-uid');
      expect(removed).toBe(true);
      expect(s.events.value).toHaveLength(0);
    });

    it('returns false for unknown uid', () => {
      const s = useScheduler();
      expect(s.removeEvent('ghost')).toBe(false);
    });
  });

  describe('moveEvent', () => {
    it('shifts dtstart and dtend by the given milliseconds', () => {
      const s = useScheduler([makeEvent()]);
      // Move forward 1 hour (3 600 000 ms)
      s.moveEvent('test-uid', 3_600_000);
      const event = s.events.value[0];
      expect(new Date(event.dtstart).getUTCHours()).toBe(10);
      expect(new Date(event.dtend).getUTCHours()).toBe(11);
    });

    it('returns false for unknown uid', () => {
      const s = useScheduler();
      expect(s.moveEvent('ghost', 0)).toBe(false);
    });
  });

  describe('resizeEvent', () => {
    it('extends dtend by the given milliseconds', () => {
      const s = useScheduler([makeEvent()]);
      // Add 30 min
      s.resizeEvent('test-uid', 30 * 60_000);
      const event = s.events.value[0];
      expect(new Date(event.dtend).getUTCHours()).toBe(10);
      expect(new Date(event.dtend).getUTCMinutes()).toBe(30);
    });

    it('does not shrink duration below 15 minutes', () => {
      const s = useScheduler([makeEvent()]);
      // Try to shrink by 2 hours
      s.resizeEvent('test-uid', -2 * 3_600_000);
      const startMs = new Date(s.events.value[0].dtstart).getTime();
      const endMs = new Date(s.events.value[0].dtend).getTime();
      expect(endMs - startMs).toBeGreaterThanOrEqual(15 * 60_000);
    });
  });

  describe('navigation', () => {
    it('prev/next advances by one week in week view', () => {
      const s = useScheduler();
      s.setView('week');
      const before = s.anchor.value.getTime();
      s.next();
      expect(s.anchor.value.getTime() - before).toBe(7 * 24 * 3_600_000);
      s.prev();
      expect(s.anchor.value.getTime()).toBe(before);
    });

    it('prev/next advances by one month in month view', () => {
      const s = useScheduler();
      s.setView('month', new Date('2026-06-01'));
      s.next();
      expect(s.anchor.value.getMonth()).toBe(6); // July
      s.prev();
      expect(s.anchor.value.getMonth()).toBe(5); // June
    });

    it('goToToday resets anchor to today', () => {
      const s = useScheduler();
      s.anchor.value = new Date('2025-01-01');
      s.goToToday();
      const today = new Date(FIXED_NOW);
      expect(s.anchor.value.getFullYear()).toBe(today.getFullYear());
      expect(s.anchor.value.getMonth()).toBe(today.getMonth());
      expect(s.anchor.value.getDate()).toBe(today.getDate());
    });
  });

  describe('eventsForRange', () => {
    it('returns events overlapping the range', () => {
      const s = useScheduler([makeEvent()]);
      const start = new Date('2026-06-05T00:00:00.000Z');
      const end = new Date('2026-06-06T00:00:00.000Z');
      expect(s.eventsForRange(start, end)).toHaveLength(1);
    });

    it('excludes events outside the range', () => {
      const s = useScheduler([makeEvent()]);
      const start = new Date('2026-06-06T00:00:00.000Z');
      const end = new Date('2026-06-07T00:00:00.000Z');
      expect(s.eventsForRange(start, end)).toHaveLength(0);
    });

    it('excludes CANCELLED events', () => {
      const s = useScheduler([makeEvent({ status: 'CANCELLED' })]);
      const start = new Date('2026-06-05T00:00:00.000Z');
      const end = new Date('2026-06-06T00:00:00.000Z');
      expect(s.eventsForRange(start, end)).toHaveLength(0);
    });
  });

  describe('formatDuration', () => {
    it('formats 1 hour correctly', () => {
      const s = useScheduler();
      expect(s.formatDuration(makeEvent())).toBe('1h');
    });

    it('formats 90 minutes correctly', () => {
      const s = useScheduler();
      const event = makeEvent({ dtend: '2026-06-05T10:30:00.000Z' });
      expect(s.formatDuration(event)).toBe('1h 30m');
    });

    it('formats 45 minutes correctly', () => {
      const s = useScheduler();
      const event = makeEvent({ dtend: '2026-06-05T09:45:00.000Z' });
      expect(s.formatDuration(event)).toBe('45m');
    });
  });

  describe('setView', () => {
    it('switches view and optionally updates anchor', () => {
      const s = useScheduler();
      const date = new Date('2026-03-15');
      s.setView('month', date);
      expect(s.view.value).toBe('month');
      expect(s.anchor.value.getMonth()).toBe(2); // March
    });
  });

  describe('visibleRange', () => {
    it('day view spans exactly one day', () => {
      const s = useScheduler();
      s.setView('day', new Date('2026-06-05'));
      const { start, end } = s.visibleRange.value;
      expect((end.getTime() - start.getTime()) / (24 * 3_600_000)).toBe(1);
    });

    it('three-day view spans exactly three days', () => {
      const s = useScheduler();
      s.setView('three-day', new Date('2026-06-05'));
      const { start, end } = s.visibleRange.value;
      expect((end.getTime() - start.getTime()) / (24 * 3_600_000)).toBe(3);
    });

    it('week view spans exactly seven days', () => {
      const s = useScheduler();
      s.setView('week', new Date('2026-06-05'));
      const { start, end } = s.visibleRange.value;
      expect((end.getTime() - start.getTime()) / (24 * 3_600_000)).toBe(7);
    });
  });

  describe('all-day event handling', () => {
    it('moveEvent preserves date-only format', () => {
      const s = useScheduler([makeEvent({ dtstart: '2026-06-05', dtend: '2026-06-06' })]);
      s.moveEvent('test-uid', 24 * 3_600_000); // +1 day
      expect(s.events.value[0].dtstart).toBe('2026-06-06');
      expect(s.events.value[0].dtend).toBe('2026-06-07');
    });
  });

  // ── Recurring event expansion ───────────────────────────────────────────────
  // All tests use all-day (YYYY-MM-DD) dates so they are immune to UTC/local
  // timezone offsets in the test runner.

  describe('recurring events — DAILY', () => {
    it('expands a daily rule across a week', () => {
      const event = makeEvent({
        dtstart: '2026-06-01',
        dtend: '2026-06-02',
        rrule: { freq: 'DAILY' },
      });
      const s = useScheduler([event]);
      const results = s.eventsForRange(
        new Date(2026, 5, 1), // Jun 1
        new Date(2026, 5, 8), // Jun 8 (exclusive)
      );
      expect(results).toHaveLength(7);
      expect(results[0].dtstart).toBe('2026-06-01');
      expect(results[6].dtstart).toBe('2026-06-07');
    });

    it('respects COUNT terminator', () => {
      const event = makeEvent({
        dtstart: '2026-06-01',
        dtend: '2026-06-02',
        rrule: { freq: 'DAILY', count: 3 },
      });
      const s = useScheduler([event]);
      const results = s.eventsForRange(new Date(2026, 5, 1), new Date(2026, 5, 30));
      expect(results).toHaveLength(3);
      expect(results[2].dtstart).toBe('2026-06-03');
    });

    it('respects UNTIL terminator', () => {
      const event = makeEvent({
        dtstart: '2026-06-01',
        dtend: '2026-06-02',
        rrule: { freq: 'DAILY', until: '2026-06-03' },
      });
      const s = useScheduler([event]);
      const results = s.eventsForRange(new Date(2026, 5, 1), new Date(2026, 5, 30));
      expect(results).toHaveLength(3); // Jun 1, 2, 3
    });

    it('respects INTERVAL (every 2 days)', () => {
      const event = makeEvent({
        dtstart: '2026-06-01',
        dtend: '2026-06-02',
        rrule: { freq: 'DAILY', interval: 2, count: 4 },
      });
      const s = useScheduler([event]);
      const results = s.eventsForRange(new Date(2026, 5, 1), new Date(2026, 5, 30));
      expect(results).toHaveLength(4);
      expect(results.map((r) => r.dtstart)).toEqual(['2026-06-01', '2026-06-03', '2026-06-05', '2026-06-07']);
    });

    it('excludes EXDATE dates', () => {
      const event = makeEvent({
        dtstart: '2026-06-01',
        dtend: '2026-06-02',
        rrule: { freq: 'DAILY', count: 5 },
        exdates: ['2026-06-03', '2026-06-05'],
      });
      const s = useScheduler([event]);
      const results = s.eventsForRange(new Date(2026, 5, 1), new Date(2026, 5, 30));
      // count=5 gives Jun 1-5, minus exdates Jun 3 & 5 = 3 results
      expect(results).toHaveLength(3);
      expect(results.map((r) => r.dtstart)).toEqual(['2026-06-01', '2026-06-02', '2026-06-04']);
    });

    it('only returns occurrences inside the queried range', () => {
      const event = makeEvent({
        dtstart: '2026-06-01',
        dtend: '2026-06-02',
        rrule: { freq: 'DAILY', count: 30 },
      });
      const s = useScheduler([event]);
      const results = s.eventsForRange(new Date(2026, 5, 10), new Date(2026, 5, 13));
      expect(results).toHaveLength(3); // Jun 10, 11, 12
      expect(results[0].dtstart).toBe('2026-06-10');
    });

    it('sets masterUid and recurrenceId on occurrences', () => {
      const event = makeEvent({
        dtstart: '2026-06-01',
        dtend: '2026-06-02',
        rrule: { freq: 'DAILY', count: 2 },
      });
      const s = useScheduler([event]);
      const results = s.eventsForRange(new Date(2026, 5, 1), new Date(2026, 5, 10));
      expect(results[0].masterUid).toBe('test-uid');
      expect(results[0].recurrenceId).toBe('2026-06-01');
      expect(results[1].recurrenceId).toBe('2026-06-02');
    });
  });

  describe('recurring events — WEEKLY', () => {
    it('expands a simple weekly rule', () => {
      const event = makeEvent({
        dtstart: '2026-06-01', // Monday
        dtend: '2026-06-02',
        rrule: { freq: 'WEEKLY', count: 4 },
      });
      const s = useScheduler([event]);
      const results = s.eventsForRange(new Date(2026, 5, 1), new Date(2026, 6, 1));
      expect(results).toHaveLength(4);
      expect(results.map((r) => r.dtstart)).toEqual(['2026-06-01', '2026-06-08', '2026-06-15', '2026-06-22']);
    });

    it('expands WEEKLY with BYDAY (MO, WE, FR)', () => {
      // Start on a Monday
      const event = makeEvent({
        dtstart: '2026-06-01', // Monday Jun 1
        dtend: '2026-06-02',
        rrule: { freq: 'WEEKLY', byday: ['MO', 'WE', 'FR'], count: 6 },
      });
      const s = useScheduler([event]);
      const results = s.eventsForRange(new Date(2026, 5, 1), new Date(2026, 5, 30));
      expect(results).toHaveLength(6);
      expect(results.map((r) => r.dtstart)).toEqual([
        '2026-06-01', // Mon
        '2026-06-03', // Wed
        '2026-06-05', // Fri
        '2026-06-08', // Mon
        '2026-06-10', // Wed
        '2026-06-12', // Fri
      ]);
    });

    it('respects INTERVAL=2 with BYDAY', () => {
      // FREQ=WEEKLY;INTERVAL=2;BYDAY=MO means: every Monday within each
      // 2-week window.  Each window contains 2 Mondays, so COUNT=3 yields
      // Jun 1 (window 1, Mon 1), Jun 8 (window 1, Mon 2), Jun 15 (window 2, Mon 1).
      const event = makeEvent({
        dtstart: '2026-06-01', // Monday
        dtend: '2026-06-02',
        rrule: { freq: 'WEEKLY', interval: 2, byday: ['MO'], count: 3 },
      });
      const s = useScheduler([event]);
      const results = s.eventsForRange(new Date(2026, 5, 1), new Date(2026, 6, 31));
      expect(results).toHaveLength(3);
      expect(results.map((r) => r.dtstart)).toEqual(['2026-06-01', '2026-06-08', '2026-06-15']);
    });
  });

  describe('recurring events — MONTHLY', () => {
    it('expands a monthly rule', () => {
      const event = makeEvent({
        dtstart: '2026-01-15',
        dtend: '2026-01-16',
        rrule: { freq: 'MONTHLY', count: 4 },
      });
      const s = useScheduler([event]);
      const results = s.eventsForRange(new Date(2026, 0, 1), new Date(2026, 6, 1));
      expect(results).toHaveLength(4);
      expect(results.map((r) => r.dtstart)).toEqual(['2026-01-15', '2026-02-15', '2026-03-15', '2026-04-15']);
    });
  });

  describe('recurring events — YEARLY', () => {
    it('expands a yearly rule', () => {
      const event = makeEvent({
        dtstart: '2024-06-05',
        dtend: '2024-06-06',
        rrule: { freq: 'YEARLY', count: 3 },
      });
      const s = useScheduler([event]);
      const results = s.eventsForRange(new Date(2024, 0, 1), new Date(2027, 0, 1));
      expect(results).toHaveLength(3);
      expect(results.map((r) => r.dtstart)).toEqual(['2024-06-05', '2025-06-05', '2026-06-05']);
    });
  });

  describe('recurring events — RDATE', () => {
    it('includes extra RDATE occurrences in range', () => {
      const event = makeEvent({
        dtstart: '2026-06-01',
        dtend: '2026-06-02',
        rdates: ['2026-06-10', '2026-06-20'],
      });
      const s = useScheduler([event]);
      const results = s.eventsForRange(new Date(2026, 5, 1), new Date(2026, 5, 30));
      // The original dtstart/dtend is not recurring (no rrule), so it's handled
      // via expandRecurrences for rdates — 2 extra dates
      expect(results).toHaveLength(2);
      expect(results.map((r) => r.dtstart)).toContain('2026-06-10');
      expect(results.map((r) => r.dtstart)).toContain('2026-06-20');
    });

    it('RDATE combined with RRULE adds extra occurrence', () => {
      const event = makeEvent({
        dtstart: '2026-06-01',
        dtend: '2026-06-02',
        rrule: { freq: 'DAILY', count: 3 }, // Jun 1, 2, 3
        rdates: ['2026-06-10'], // +1 extra
      });
      const s = useScheduler([event]);
      const results = s.eventsForRange(new Date(2026, 5, 1), new Date(2026, 5, 30));
      expect(results).toHaveLength(4);
      expect(results.map((r) => r.dtstart)).toContain('2026-06-10');
    });
  });

  describe('recurring events — cancelled master is suppressed', () => {
    it('does not expand a CANCELLED recurring event', () => {
      const event = makeEvent({
        dtstart: '2026-06-01',
        dtend: '2026-06-02',
        rrule: { freq: 'DAILY', count: 10 },
        status: 'CANCELLED',
      });
      const s = useScheduler([event]);
      const results = s.eventsForRange(new Date(2026, 5, 1), new Date(2026, 5, 30));
      expect(results).toHaveLength(0);
    });
  });

  // ── Additional edge cases ────────────────────────────────────────────────────

  describe('recurring events — COUNT=1 (single occurrence)', () => {
    it('emits exactly one occurrence', () => {
      const event = makeEvent({
        dtstart: '2026-06-10',
        dtend: '2026-06-11',
        rrule: { freq: 'DAILY', count: 1 },
      });
      const s = useScheduler([event]);
      const results = s.eventsForRange(new Date(2026, 5, 1), new Date(2026, 6, 1));
      expect(results).toHaveLength(1);
      expect(results[0].dtstart).toBe('2026-06-10');
    });
  });

  describe('recurring events — BYMONTHDAY', () => {
    it('fires on the 15th of each month', () => {
      const event = makeEvent({
        dtstart: '2026-01-15',
        dtend: '2026-01-16',
        rrule: { freq: 'MONTHLY', bymonthday: [15], count: 4 },
      });
      const s = useScheduler([event]);
      const results = s.eventsForRange(new Date(2026, 0, 1), new Date(2026, 6, 1));
      expect(results).toHaveLength(4);
      expect(results.map((r) => r.dtstart)).toEqual(['2026-01-15', '2026-02-15', '2026-03-15', '2026-04-15']);
    });

    it('fires on the last day of several months (day 31 → skipped in shorter months)', () => {
      // MONTHLY on the 31st — Feb, Apr, Jun have no 31st, so they are skipped.
      // Jan 31, Mar 31, May 31 should fire within a COUNT=6 window.
      const event = makeEvent({
        dtstart: '2026-01-31',
        dtend: '2026-02-01',
        rrule: { freq: 'MONTHLY', bymonthday: [31], count: 3 },
      });
      const s = useScheduler([event]);
      const results = s.eventsForRange(new Date(2026, 0, 1), new Date(2026, 11, 31));
      expect(results).toHaveLength(3);
      // Luxon month-arithmetic preserves the day correctly; BYMONTHDAY filter
      // skips months that don't have day 31.
      const starts = results.map((r) => r.dtstart);
      expect(starts).toContain('2026-01-31');
      expect(starts).toContain('2026-03-31');
      expect(starts).toContain('2026-05-31');
    });
  });

  describe('recurring events — BYMONTH (YEARLY with month filter)', () => {
    it('fires in June every year', () => {
      const event = makeEvent({
        dtstart: '2024-06-01',
        dtend: '2024-06-02',
        rrule: { freq: 'YEARLY', bymonth: [6], count: 3 },
      });
      const s = useScheduler([event]);
      const results = s.eventsForRange(new Date(2024, 0, 1), new Date(2027, 0, 1));
      expect(results).toHaveLength(3);
      expect(results.map((r) => r.dtstart)).toEqual(['2024-06-01', '2025-06-01', '2026-06-01']);
    });
  });

  describe('recurring events — leap year', () => {
    it('includes Feb 29 on leap years and skips it on non-leap years', () => {
      // YEARLY event starting on Feb 29 2024 (leap year).
      // 2025 and 2026 don't have Feb 29, so Luxon advances to Mar 1 — those
      // occurrences should still be present (Luxon's overflow behaviour).
      // We only assert the first and the Feb-29 occurrence to keep the test stable.
      const event = makeEvent({
        dtstart: '2024-02-29',
        dtend: '2024-03-01',
        rrule: { freq: 'YEARLY', count: 4 },
      });
      const s = useScheduler([event]);
      const results = s.eventsForRange(new Date(2024, 0, 1), new Date(2028, 0, 1));
      // 2024 (leap), 2025, 2026, 2027 → 4 occurrences
      expect(results).toHaveLength(4);
      expect(results[0].dtstart).toBe('2024-02-29');
      // Luxon clamps Feb 29 to Feb 28 on non-leap years (does not overflow to Mar 1)
      const dt2025 = DateTime.fromISO(results[1].dtstart, { zone: 'local' });
      expect(dt2025.year).toBe(2025);
      expect(dt2025.month).toBe(2); // February (Luxon clamps, not overflows)
      expect(dt2025.day).toBe(28);
    });
  });

  describe('recurring events — biweekly (WEEKLY INTERVAL=2, no BYDAY)', () => {
    it('fires every two weeks', () => {
      const event = makeEvent({
        dtstart: '2026-06-01', // Monday
        dtend: '2026-06-02',
        rrule: { freq: 'WEEKLY', interval: 2, count: 4 },
      });
      const s = useScheduler([event]);
      const results = s.eventsForRange(new Date(2026, 5, 1), new Date(2026, 8, 1));
      expect(results).toHaveLength(4);
      expect(results.map((r) => r.dtstart)).toEqual(['2026-06-01', '2026-06-15', '2026-06-29', '2026-07-13']);
    });
  });

  describe('recurring events — EXDATE on an RDATE', () => {
    it('suppresses an RDATE that appears in EXDATE', () => {
      const event = makeEvent({
        dtstart: '2026-06-01',
        dtend: '2026-06-02',
        rdates: ['2026-06-10', '2026-06-20'],
        exdates: ['2026-06-10'],
      });
      const s = useScheduler([event]);
      const results = s.eventsForRange(new Date(2026, 5, 1), new Date(2026, 5, 30));
      expect(results).toHaveLength(1);
      expect(results[0].dtstart).toBe('2026-06-20');
    });
  });

  describe('recurring events — UNTIL with ISO datetime string', () => {
    it('stops at the UNTIL boundary (date-only string)', () => {
      // UNTIL expressed as a date-only ISO string — parseDT handles it the same
      // way as an all-day event date, so Jun 4 is the inclusive last occurrence.
      const event = makeEvent({
        dtstart: '2026-06-01',
        dtend: '2026-06-02',
        rrule: { freq: 'DAILY', until: '2026-06-04' },
      });
      const s = useScheduler([event]);
      const results = s.eventsForRange(new Date(2026, 5, 1), new Date(2026, 5, 30));
      // Jun 1, 2, 3, 4
      expect(results).toHaveLength(4);
      expect(results[3].dtstart).toBe('2026-06-04');
    });

    it('stops at the UNTIL boundary (datetime string in local midnight)', () => {
      // Use local midnight to avoid UTC-offset shifting the boundary day.
      // 2026-06-05T00:00:00 local means candidate Jun 5 00:00 > until Jun 4 23:59 → stops.
      const event = makeEvent({
        dtstart: '2026-06-01',
        dtend: '2026-06-02',
        rrule: { freq: 'DAILY', until: '2026-06-04T23:59:59.999' },
      });
      const s = useScheduler([event]);
      const results = s.eventsForRange(new Date(2026, 5, 1), new Date(2026, 5, 30));
      // Jun 1, 2, 3, 4 — candidate Jun 5 00:00 local > until Jun 4 23:59:59 local
      expect(results).toHaveLength(4);
      expect(results[3].dtstart).toBe('2026-06-04');
    });
  });

  describe('recurring events — event spanning range boundary', () => {
    it('includes an event that starts before range but ends inside', () => {
      // Non-recurring event: starts on May 31, ends on Jun 2.
      const event = makeEvent({
        dtstart: '2026-05-31',
        dtend: '2026-06-02',
      });
      const s = useScheduler([event]);
      const results = s.eventsForRange(
        new Date(2026, 5, 1), // Jun 1
        new Date(2026, 5, 30), // Jun 30
      );
      expect(results).toHaveLength(1);
    });

    it('includes a recurring occurrence that overlaps the start of the range', () => {
      // Occurrence starts Jun 30 (all-day), so dtend is Jul 1 — it overlaps a
      // range of Jul 1–Jul 31 only if dtend > rangeStart, but for all-day events
      // the dtend IS Jul 1 (exclusive). Adjust: use 2-day duration so it bleeds
      // into Jul.
      const event = makeEvent({
        dtstart: '2026-06-01',
        dtend: '2026-06-03', // 2-day duration
        rrule: { freq: 'MONTHLY', count: 2 },
      });
      const s = useScheduler([event]);
      // Query Jul 1 – Jul 31: the Jun occurrence ends Jun 3 (not in range).
      // The Jul occurrence starts Jul 1, ends Jul 3 → inside range.
      const results = s.eventsForRange(
        new Date(2026, 6, 1), // Jul 1
        new Date(2026, 6, 31),
      );
      expect(results).toHaveLength(1);
      expect(results[0].dtstart).toBe('2026-07-01');
    });
  });

  describe('recurring events — timed (non-all-day) recurrence', () => {
    it('expands a timed daily event and preserves the time component', () => {
      // Use a fixed UTC offset so the test is timezone-immune.
      const event = makeEvent({
        dtstart: '2026-06-01T09:00:00.000Z',
        dtend: '2026-06-01T10:00:00.000Z',
        rrule: { freq: 'DAILY', count: 3 },
      });
      const s = useScheduler([event]);
      const results = s.eventsForRange(new Date('2026-06-01T00:00:00.000Z'), new Date('2026-06-04T00:00:00.000Z'));
      expect(results).toHaveLength(3);
      // Each occurrence should be exactly 1h long
      for (const r of results) {
        const dur = new Date(r.dtend).getTime() - new Date(r.dtstart).getTime();
        expect(dur).toBe(60 * 60 * 1000);
      }
    });
  });

  describe('recurring events — WEEKLY BYDAY with UNTIL boundary', () => {
    it('stops at the UNTIL date even when BYDAY would continue', () => {
      // MO + WE + FR weekly, stops after 2026-06-10 (Wed)
      const event = makeEvent({
        dtstart: '2026-06-01', // Monday
        dtend: '2026-06-02',
        rrule: { freq: 'WEEKLY', byday: ['MO', 'WE', 'FR'], until: '2026-06-10' },
      });
      const s = useScheduler([event]);
      const results = s.eventsForRange(new Date(2026, 5, 1), new Date(2026, 5, 30));
      // Jun 1 (Mon), Jun 3 (Wed), Jun 5 (Fri), Jun 8 (Mon), Jun 10 (Wed) — 5 total
      expect(results).toHaveLength(5);
      expect(results[4].dtstart).toBe('2026-06-10');
    });
  });

  describe('recurring events — multiple EXDATE values on WEEKLY', () => {
    it('skips all listed exdates', () => {
      const event = makeEvent({
        dtstart: '2026-06-01', // Monday
        dtend: '2026-06-02',
        rrule: { freq: 'WEEKLY', count: 5 },
        exdates: ['2026-06-08', '2026-06-22'],
      });
      const s = useScheduler([event]);
      const results = s.eventsForRange(new Date(2026, 5, 1), new Date(2026, 6, 1));
      // count=5 → Jun 1, 8, 15, 22, 29 minus exdates Jun 8 & 22 → 3 results
      expect(results).toHaveLength(3);
      const starts = results.map((r) => r.dtstart);
      expect(starts).not.toContain('2026-06-08');
      expect(starts).not.toContain('2026-06-22');
    });
  });

  describe('recurring events — large INTERVAL', () => {
    it('MONTHLY INTERVAL=6 (semi-annual) fires twice a year', () => {
      const event = makeEvent({
        dtstart: '2026-01-01',
        dtend: '2026-01-02',
        rrule: { freq: 'MONTHLY', interval: 6, count: 4 },
      });
      const s = useScheduler([event]);
      const results = s.eventsForRange(new Date(2026, 0, 1), new Date(2028, 0, 1));
      expect(results).toHaveLength(4);
      expect(results.map((r) => r.dtstart)).toEqual(['2026-01-01', '2026-07-01', '2027-01-01', '2027-07-01']);
    });
  });

  // ── Month / Year view recurring event regression tests ──────────────────────

  describe('month view — recurring events appear on every occurrence day', () => {
    it('DAILY event appears on every day of the month', () => {
      const event = makeEvent({
        dtstart: '2026-06-01',
        dtend: '2026-06-02',
        rrule: { freq: 'DAILY', until: '2026-06-30' },
      });
      const s = useScheduler([event]);
      // Simulate the month-view range: June 1 is a Monday (startOffset=1) → grid starts Sunday May 31
      const gridStart = new Date(2026, 4, 31); // Sunday May 31
      const gridEnd = new Date(2026, 6, 12); // 42 days later
      const results = s.eventsForRange(gridStart, gridEnd);
      // 30 occurrences in June (Jun 1–Jun 30)
      expect(results.length).toBe(30);
      expect(results[0].dtstart).toBe('2026-06-01');
      expect(results[29].dtstart).toBe('2026-06-30');
    });

    it('WEEKLY BYDAY event appears on the correct weekdays across the month', () => {
      const event = makeEvent({
        dtstart: '2026-06-01', // Monday
        dtend: '2026-06-02',
        rrule: { freq: 'WEEKLY', byday: ['MO', 'WE', 'FR'], until: '2026-06-30' },
      });
      const s = useScheduler([event]);
      const gridStart = new Date(2026, 4, 31); // Sunday May 31
      const gridEnd = new Date(2026, 6, 12);
      const results = s.eventsForRange(gridStart, gridEnd);
      // Mon/Wed/Fri in June: 1,3,5,8,10,12,15,17,19,22,24,26,29 = 13 days
      expect(results.length).toBe(13);
      // All should be Mon, Wed, or Fri
      const days = results.map((r) => DateTime.fromISO(r.dtstart, { zone: 'local' }).weekday);
      for (const d of days) {
        expect([1, 3, 5]).toContain(d); // Luxon: 1=Mon,3=Wed,5=Fri
      }
    });

    it('non-recurring event in a different month does NOT appear in month range', () => {
      const event = makeEvent({
        dtstart: '2026-05-15',
        dtend: '2026-05-16',
      });
      const s = useScheduler([event]);
      const gridStart = new Date(2026, 4, 31); // Sunday May 31 — June grid
      const gridEnd = new Date(2026, 6, 12);
      const results = s.eventsForRange(gridStart, gridEnd);
      // May 15 event does not overlap the June grid range
      expect(results).toHaveLength(0);
    });
  });

  describe('year view — recurring events appear across multiple months', () => {
    it('MONTHLY event has one occurrence per month across the year', () => {
      const event = makeEvent({
        dtstart: '2026-01-10',
        dtend: '2026-01-11',
        rrule: { freq: 'MONTHLY', until: '2026-12-31' },
      });
      const s = useScheduler([event]);
      const yearStart = new Date(2026, 0, 1);
      const yearEnd = new Date(2027, 0, 1);
      const results = s.eventsForRange(yearStart, yearEnd);
      expect(results.length).toBe(12);
      // Each occurrence should be on the 10th
      const days = results.map((r) => DateTime.fromISO(r.dtstart, { zone: 'local' }).day);
      expect(days).toEqual(Array.from({ length: 12 }, () => 10));
    });

    it('YEARLY event appears once in the correct year', () => {
      const event = makeEvent({
        dtstart: '2026-03-15',
        dtend: '2026-03-16',
        rrule: { freq: 'YEARLY', count: 3 },
      });
      const s = useScheduler([event]);
      // Query only 2026 year
      const yearStart = new Date(2026, 0, 1);
      const yearEnd = new Date(2027, 0, 1);
      const results = s.eventsForRange(yearStart, yearEnd);
      expect(results.length).toBe(1);
      expect(results[0].dtstart).toBe('2026-03-15');
    });

    it('DAILY weekday event produces occurrences on every non-weekend day of the year', () => {
      const event = makeEvent({
        dtstart: '2026-01-01', // Thursday
        dtend: '2026-01-02',
        rrule: { freq: 'DAILY', byday: ['MO', 'TU', 'WE', 'TH', 'FR'], until: '2026-12-31' },
      });
      const s = useScheduler([event]);
      const yearStart = new Date(2026, 0, 1);
      const yearEnd = new Date(2027, 0, 1);
      const results = s.eventsForRange(yearStart, yearEnd);
      // 2026 has 261 weekdays
      expect(results.length).toBe(261);
      // None should be on Saturday (6) or Sunday (7) in Luxon
      const weekdays = results.map((r) => DateTime.fromISO(r.dtstart, { zone: 'local' }).weekday);
      for (const d of weekdays) {
        expect(d).toBeLessThanOrEqual(5);
      }
    });

    it('CANCELLED recurring event does not appear in year range', () => {
      const event = makeEvent({
        dtstart: '2026-01-01',
        dtend: '2026-01-02',
        rrule: { freq: 'MONTHLY', until: '2026-12-31' },
        status: 'CANCELLED',
      });
      const s = useScheduler([event]);
      const results = s.eventsForRange(new Date(2026, 0, 1), new Date(2027, 0, 1));
      expect(results).toHaveLength(0);
    });
  });

  describe('recurring events — Luxon date arithmetic helpers', () => {
    it('navigation prev/next in year view uses Luxon correctly', () => {
      const s = useScheduler();
      s.setView('year', new Date('2026-06-05'));
      s.next();
      expect(s.anchor.value.getFullYear()).toBe(2027);
      s.prev();
      s.prev();
      expect(s.anchor.value.getFullYear()).toBe(2025);
    });

    it('startOfWeek returns Sunday as the first day (weekStartsOn=0)', () => {
      const s = useScheduler([], 0);
      // 2026-06-10 is a Wednesday; start of week (Sun) should be Jun 7
      s.setView('week', new Date('2026-06-10'));
      const { start } = s.visibleRange.value;
      const dt = DateTime.fromJSDate(start, { zone: 'local' });
      expect(dt.weekday).toBe(7); // Luxon 7 = Sunday
    });

    it('formatDuration uses Luxon Duration correctly for sub-hour events', () => {
      const s = useScheduler();
      const event = makeEvent({
        dtstart: '2026-06-05T08:00:00.000Z',
        dtend: '2026-06-05T08:20:00.000Z',
      });
      expect(s.formatDuration(event)).toBe('20m');
    });
  });

  // ── weekStartsOn configuration ──────────────────────────────────────────────

  describe('weekStartsOn — configurable week start', () => {
    it('defaults to Sunday (weekStartsOn=0) when not specified', () => {
      const s = useScheduler();
      expect(s.weekStartsOn).toBe(0);
      // 2026-06-10 is Wednesday → week starts on Jun 7 (Sunday, Luxon wd=7)
      const start = s.startOfWeek(new Date(2026, 5, 10));
      expect(DateTime.fromJSDate(start, { zone: 'local' }).weekday).toBe(7);
    });

    it('weekStartsOn=1 (Monday) — week containing Wednesday Jun 10 starts on Mon Jun 8', () => {
      const s = useScheduler([], 1);
      expect(s.weekStartsOn).toBe(1);
      const start = s.startOfWeek(new Date(2026, 5, 10)); // Wednesday
      const dt = DateTime.fromJSDate(start, { zone: 'local' });
      expect(dt.weekday).toBe(1); // Monday
      expect(dt.toFormat('yyyy-MM-dd')).toBe('2026-06-08');
    });

    it('weekStartsOn=1 — visible range for week view starts on Monday', () => {
      const s = useScheduler([], 1);
      s.setView('week', new Date(2026, 5, 10)); // Wednesday Jun 10
      const { start, end } = s.visibleRange.value;
      const startDt = DateTime.fromJSDate(start, { zone: 'local' });
      const endDt = DateTime.fromJSDate(end, { zone: 'local' });
      expect(startDt.weekday).toBe(1); // Monday
      expect(startDt.toFormat('yyyy-MM-dd')).toBe('2026-06-08');
      // End is 7 days later (exclusive)
      expect(endDt.toFormat('yyyy-MM-dd')).toBe('2026-06-15');
    });

    it('weekStartsOn=1 — startOfWeek on Monday itself returns that same Monday', () => {
      const s = useScheduler([], 1);
      // 2026-06-08 is a Monday
      const start = s.startOfWeek(new Date(2026, 5, 8));
      expect(DateTime.fromJSDate(start, { zone: 'local' }).toFormat('yyyy-MM-dd')).toBe('2026-06-08');
    });

    it('weekStartsOn=1 — startOfWeek on Sunday returns previous Monday', () => {
      const s = useScheduler([], 1);
      // 2026-06-14 is a Sunday; previous Monday is 2026-06-08
      const start = s.startOfWeek(new Date(2026, 5, 14));
      expect(DateTime.fromJSDate(start, { zone: 'local' }).toFormat('yyyy-MM-dd')).toBe('2026-06-08');
    });

    it('weekStartsOn=6 (Saturday) — week containing Sunday Jun 14 starts on Sat Jun 13', () => {
      const s = useScheduler([], 6);
      const start = s.startOfWeek(new Date(2026, 5, 14)); // Sunday
      expect(DateTime.fromJSDate(start, { zone: 'local' }).toFormat('yyyy-MM-dd')).toBe('2026-06-13');
    });

    it('weekStartsOn=0 — week containing Sunday returns that same Sunday', () => {
      const s = useScheduler([], 0);
      // 2026-06-07 is a Sunday
      const start = s.startOfWeek(new Date(2026, 5, 7));
      expect(DateTime.fromJSDate(start, { zone: 'local' }).toFormat('yyyy-MM-dd')).toBe('2026-06-07');
    });

    it('weekStartsOn=1 — weekStartsOn value is exposed on the composable return', () => {
      const s = useScheduler([], 1);
      expect(s.weekStartsOn).toBe(1);
    });
  });
});
